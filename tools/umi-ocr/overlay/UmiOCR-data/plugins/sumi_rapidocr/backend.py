"""Offline RapidOCR inference with strict model identity and original coordinates."""
import base64
from contextlib import redirect_stdout
import hashlib
from importlib.metadata import version
from io import BytesIO
import json
import math
from pathlib import Path
import sys

from bundle import read_bundle


def deny_download(*args, **kwargs):
    raise RuntimeError('Offline engine: network/model downloads are disabled; prepare a complete bundle first')


class Backend:
    def __init__(self, bundle_path, detail=False):
        manifest, profile, files = read_bundle(bundle_path)
        for package in ('rapidocr', 'onnxruntime'):
            required = manifest[package+'_version']
            if version(package) != required:
                raise ValueError(package + ' version must be ' + required)
        import socket
        socket.socket.connect = deny_download
        socket.socket.connect_ex = deny_download
        socket.create_connection = deny_download
        from rapidocr import RapidOCR, OCRVersion, ModelType
        from rapidocr.utils.download_file import DownloadFile
        DownloadFile.run = deny_download
        params = {'Global.log_level':'error', 'Global.text_score':0.0,
                  'Global.max_side_len':4096 if detail else 2000,
                  'Det.limit_side_len':1536 if detail else 960,
                  'EngineConfig.onnxruntime.intra_op_num_threads':2,
                  'EngineConfig.onnxruntime.inter_op_num_threads':1}
        for stage, path in files.items():
            label = stage.title()
            params[label+'.model_path'] = path
            params[label+'.ocr_version'] = OCRVersion('PP-OCRv4' if stage=='cls' else profile['model_version'])
            params[label+'.model_type'] = ModelType('mobile' if stage=='cls' else profile['model_type'])
        # The bundled recognition ONNX embeds the matching character dictionary.
        # Missing metadata cannot trigger an implicit fallback download.
        with redirect_stdout(sys.stderr):
            self.engine = RapidOCR(params=params)
        if not self.engine.text_rec.session.have_key():
            raise ValueError('The recognition model must embed its character dictionary')
        model_identity = {k: v['sha256'] for k,v in profile['models'].items()}
        self.info = {'backend':'rapidocr-onnxruntime', 'rapidocr':version('rapidocr'),
                     'onnxruntime':version('onnxruntime'), 'profile':manifest['profile'],
                     'model_sha256':model_identity, 'detail':bool(detail), 'network':'disabled',
                     'text_score_filter':0.0, 'dictionary':'embedded',
                     'dependencies':{name:version(name) for name in
                         ('Pillow','numpy','opencv-python','pyclipper','shapely')},
                     'parameters':{key:(value.value if hasattr(value,'value') else value)
                         for key,value in params.items() if not key.endswith('.model_path')}}
        self.info['fingerprint'] = hashlib.sha256(json.dumps(self.info, sort_keys=True).encode()).hexdigest()

    def run(self, request):
        from PIL import Image
        if 'path' in request:
            source = Path(request['path'])
            if not source.is_file():
                raise ValueError('Input must be an existing local image file')
            stream = source
        elif 'base64' in request:
            stream = BytesIO(base64.b64decode(request['base64'], validate=True))
        else:
            raise ValueError('Expected a local path or base64 image')
        with Image.open(stream) as source:
            original_size = source.size
            image = source.convert('RGB')
        region = request.get('region', [0,0,*original_size])
        if (not isinstance(region, list) or len(region)!=4
                or any(isinstance(x,bool) or not isinstance(x,int) for x in region)
                or not (0<=region[0]<region[2]<=original_size[0] and 0<=region[1]<region[3]<=original_size[1])):
            image.close()
            raise ValueError('Region must be an integer rectangle within the original image')
        scale = request.get('scale',1)
        if isinstance(scale,bool) or scale not in (1,2):
            image.close()
            raise ValueError('Scale must be 1 or 2')
        with image:
            crop = image.crop(region)
        with crop:
            if scale == 2:
                if crop.width*crop.height*4 > 40_000_000:
                    raise ValueError('Enlarged region exceeds 40 million pixels')
                enlarged = crop.resize((crop.width*2,crop.height*2), Image.Resampling.LANCZOS)
            else:
                enlarged = crop.copy()
        with enlarged, redirect_stdout(sys.stderr):
            result = self.engine(enlarged)
        blocks = []
        if result.boxes is not None and result.txts is not None:
            if len(result.boxes)!=len(result.txts) or len(result.scores)!=len(result.txts):
                raise ValueError('Engine returned inconsistent text/box/score lengths')
            for box,text,score in zip(result.boxes,result.txts,result.scores):
                points = [[float(p[0])/scale+region[0],float(p[1])/scale+region[1]] for p in box]
                if len(points)!=4 or any(not math.isfinite(v) for p in points for v in p):
                    raise ValueError('Engine returned invalid coordinates')
                confidence = float(score)
                if not math.isfinite(confidence) or not 0<=confidence<=1:
                    confidence = None
                blocks.append({'text':text,'box':points,'score':confidence,'end':'\n'})
        return {'code':100 if blocks else 101, 'data':blocks if blocks else '',
                'engineInfo':dict(self.info, region=region, scale=scale)}
