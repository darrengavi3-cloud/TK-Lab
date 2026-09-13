"""Image/PDF page snapshots and original-page coordinate mapping, independent of Qt."""
import hashlib
import json
from pathlib import Path
from io import BytesIO

from . import checksum
from .candidates import checked_region, map_result, append_candidate, load_candidates


def file_sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):
            digest.update(chunk)
    return digest.hexdigest()


class RegionSession:
    def __init__(self, source_path, output_parent, page=1, password=''):
        from PIL import Image
        self.source_path = Path(source_path).resolve()
        before = file_sha(self.source_path)
        is_document = self.source_path.suffix.lower() in ('.pdf','.xps','.epub','.mobi','.fb2','.cbz')
        if is_document:
            import fitz
            with fitz.open(self.source_path) as document:
                if document.is_encrypted and not document.authenticate(password):
                    raise ValueError('请填写正确的文档密码。')
                if isinstance(page,bool) or not isinstance(page,int) or not 1<=page<=document.page_count:
                    raise ValueError('页码超出文档范围。')
                current = document[page-1]
                if current.rect.width*current.rect.height*4 > 40_000_000:
                    raise ValueError('页面渲染超过四千万像素，请先裁切文档。')
                pix = current.get_pixmap(matrix=fitz.Matrix(2,2),colorspace=fitz.csRGB,alpha=False)
                png = pix.tobytes('png')
                dimensions = [pix.width,pix.height]
                self.factors = [current.rect.width/pix.width,current.rect.height/pix.height]
                self.origin = [current.rect.x0,current.rect.y0]
                coordinates = 'pdf_rotated_page_points'
                page_count = document.page_count
                rotation = current.rotation
        else:
            if page != 1:
                raise ValueError('图片仅支持第 1 页。')
            with Image.open(self.source_path) as image:
                if image.width*image.height > 40_000_000:
                    raise ValueError('图片超过四千万像素，请先裁切。')
                dimensions = list(image.size)
                with image.convert('RGB') as rgb, BytesIO() as stream:
                    rgb.save(stream,format='PNG')
                    png = stream.getvalue()
            self.factors, self.origin = [1,1],[0,0]
            coordinates, page_count, rotation = 'image_stored_pixels',1,0
        if file_sha(self.source_path) != before:
            raise ValueError('文件在读取期间发生变化，请重新打开。')
        self.source = {'source_sha256':before,'filename':self.source_path.name,'page':page,
                       'page_count':page_count,'coordinates':coordinates,'render_size':dimensions,
                       'render_to_page':self.factors,'page_origin':self.origin,'rotation':rotation,
                       'preview_sha256':hashlib.sha256(png).hexdigest()}
        self.directory = Path(output_parent).resolve()/('sumi-page-'+checksum(self.source)[:24])
        self.directory.mkdir(parents=True,exist_ok=True)
        self.preview_path = self.directory/'page.png'
        manifest = self.directory/'source.json'
        if self.preview_path.exists():
            if file_sha(self.preview_path) != self.source['preview_sha256']:
                raise ValueError('已有页图发生变化，请改用新的保存目录。')
        else:
            with self.preview_path.open('xb') as stream:
                stream.write(png)
        if manifest.exists():
            if json.loads(manifest.read_text(encoding='utf-8')) != self.source:
                raise ValueError('已有页面记录不符，请改用新的保存目录。')
        else:
            with manifest.open('x',encoding='utf-8') as stream:
                json.dump(self.source,stream,ensure_ascii=False,indent=2)

    def info(self):
        return dict(self.source,preview_url=self.preview_path.as_uri(),directory=str(self.directory))

    def context(self, region):
        region = checked_region(region,*self.source['render_size'])
        return dict(self.source,region_render_pixels=region,
                    region_page=[region[0]*self.factors[0]+self.origin[0],region[1]*self.factors[1]+self.origin[1],
                                 region[2]*self.factors[0]+self.origin[0],region[3]*self.factors[1]+self.origin[1]])

    def validate_source(self):
        if (file_sha(self.source_path)!=self.source['source_sha256'] or
                file_sha(self.preview_path)!=self.source['preview_sha256']):
            raise ValueError('源文件或预览图已变化，请重新打开并框选。')

    def recognize(self, api, region, scale=2, detail=False):
        context = self.context(region)
        self.validate_source()
        result = api.runRegion(self.preview_path,context['region_render_pixels'],scale)
        self.validate_source()
        # Preserve the engine's render-pixel result as well as page coordinates.
        mapped = map_result(result,self.factors,self.origin)
        mapped['coordinate_system'] = self.source['coordinates']
        mapped['render_result'] = result
        _, path = append_candidate(self.directory,context,mapped,{'scale':scale,'detail':bool(detail)})
        history = self.history(region)
        history['saved_path'] = path
        return history

    def history(self, region):
        return load_candidates(self.directory,self.context(region))
