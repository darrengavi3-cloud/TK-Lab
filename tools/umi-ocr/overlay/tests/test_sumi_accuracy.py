from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from PIL import Image
from recovery_support import ROOT, ocr, FakeApi
from recoverytest.ocr.review import right_columns
from recoverytest.ocr.tbpu import getParser

PLUGIN = ROOT/'UmiOCR-data/plugins/sumi_rapidocr'
sys.path.insert(0, str(PLUGIN.parent))
sys.path.insert(0, str(PLUGIN))
from sumi_rapidocr import client
from sumi_rapidocr import process
from sumi_rapidocr import bundle
from backend import Backend

spec = importlib.util.spec_from_file_location('accuracy_benchmark', ROOT/'dev-tools/accuracy_benchmark.py')
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)


def block(text, left, top, width=60, height=20):
    return {'text':text, 'score':0.1, 'box':[
        [left,top], [left+width,top], [left+width,top+height], [left,top+height]]}


class AccuracyTests(unittest.TestCase):
    def test_metrics_count_unicode_variants_deletions_and_insertions(self):
        for ref, hyp, expected in [('𠮷祕', '吉秘', (2,2,0,0)),
                                    ('原註須存', '原存', (2,0,2,0)),
                                    ('', '幻覺', (2,0,0,2)), ('正文', '', (2,0,2,0))]:
            with self.subTest(reference=ref):
                self.assertEqual(tuple(benchmark.edit_counts(ref,hyp).values()), expected)
        self.assertEqual(benchmark.without_layout_space('祕\n 註。\t'), '祕註。')

    def test_fixed_columns_preserve_low_confidence_text_and_input(self):
        source = [block('左下',20,70), block('右下',220,70),
                  block('左上',20,20), block('右上',220,20)]
        original = deepcopy(source)
        result = getParser('right_columns').run(source)
        self.assertEqual([b['text'] for b in result], ['右上','右下','左上','左下'])
        self.assertEqual(source, original)
        self.assertTrue(all(b['score']==0.1 for b in result))
        result[0]['box'][0][0] = 999
        self.assertEqual(source, original)

    def test_invalid_geometry_keeps_every_block_in_original_order(self):
        source = [block('先',20,70), block('後',220,70)]
        source[0]['box'][0][0] = float('inf')
        self.assertEqual(right_columns(source), source)
        self.assertEqual(right_columns([]), [])

    def test_worker_identity_invalidates_recovery_and_survives_raw_capture(self):
        engine = ocr.__dict__['__MissionOcrClass']()
        engine._api = FakeApi()
        engine._api.engineInfo = {'fingerprint':'model-a'}
        first = engine.getRecoveryRecipe({})
        engine._api.engineInfo = {'fingerprint':'model-b'}
        second = engine.getRecoveryRecipe({})
        self.assertNotEqual(first['backendIdentity'], second['backendIdentity'])
        info = {'fingerprint':'model-b', 'model_sha256':{'rec':'hash'}}
        engine._api.runBytes = lambda data: {'code':100,'data':[block('祕',0,0)],'engineInfo':info}
        result = engine.msnTask({'argd':{'review.capture':True},'tbpu':[]}, {'bytes':b'fake'})
        info['model_sha256']['rec'] = 'changed'
        self.assertEqual(result['rawResult']['engineInfo']['model_sha256']['rec'], 'hash')

    def test_benchmark_counts_failed_pages_and_blank_false_positives(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'input.png').write_bytes(b'fixture')
            cases = [dict(id=str(i), image='input.png', reference=ref,
                     image_sha256=hashlib.sha256(b'fixture').hexdigest())
                     for i,ref in enumerate(['正文須存',''])]
            suite = root/'suite.json'
            suite.write_text(json.dumps({'schema_version':1,'cases':cases}),encoding='utf-8')
            fake = SimpleNamespace(start=lambda opts:'[Success]', engineInfo={'test':True}, stop=lambda:None)
            replies = iter([{'code':902,'data':'failed'}, {'code':100,'data':[block('幻覺',0,0)]}])
            fake.runPath = lambda path: next(replies)
            with patch.object(benchmark,'Api',return_value=fake):
                total = benchmark.evaluate(suite,'python','bundle')['total']
            self.assertEqual(total['deletions'],4)
            self.assertEqual(total['insertions'],2)
            self.assertEqual(total['failed_cases'],1)
            self.assertEqual(total['cer'],1.5)
            (root/'input.png').write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                benchmark.evaluate(suite,'python','bundle')


class BundleTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        models = {}
        for stage in ('det','rec','cls'):
            content = stage.encode()
            (self.root/(stage+'.onnx')).write_bytes(content)
            models[stage] = {'file':stage+'.onnx','sha256':hashlib.sha256(content).hexdigest()}
        self.manifest = {'schema_version':1, 'profile':'fixture', 'models':models,
                         'rapidocr_version':'3.9.2','onnxruntime_version':'1.23.2'}
        catalog = {key:self.manifest[key] for key in ('rapidocr_version','onnxruntime_version')}
        catalog['profiles'] = {'fixture':{'models':models}}
        (self.root/'catalog.json').write_text(json.dumps(catalog),encoding='utf-8')
        self.path = self.root/'bundle.json'
        self.save()
        patcher = patch.object(bundle,'__file__',str(self.root/'bundle.py'))
        patcher.start()
        self.addCleanup(patcher.stop)

    def save(self):
        self.path.write_text(json.dumps(self.manifest),encoding='utf-8')

    def test_verified_bundle_rejects_tampered_and_missing_models(self):
        self.assertEqual(set(bundle.read_bundle(self.path)[2]), {'det','rec','cls'})
        (self.root/'rec.onnx').write_bytes(b'corrupt')
        with self.assertRaisesRegex(ValueError,'changed model'):
            bundle.read_bundle(self.path)
        (self.root/'rec.onnx').unlink()
        with self.assertRaisesRegex(ValueError,'Missing'):
            bundle.read_bundle(self.path)

    def test_catalog_runtime_and_dictionary_identity_cannot_be_replaced(self):
        self.manifest['onnxruntime_version'] = 'other'
        self.save()
        with self.assertRaisesRegex(ValueError,'Runtime identity'):
            bundle.read_bundle(self.path)
        self.manifest['onnxruntime_version'] = '1.23.2'
        self.manifest['models']['rec']['sha256'] = 'other-dictionary'
        self.save()
        with self.assertRaisesRegex(ValueError,'pinned model catalog'):
            bundle.read_bundle(self.path)

    def test_preparation_does_not_remove_an_existing_partial_download(self):
        catalog = json.loads((PLUGIN/'catalog.json').read_text())
        model = next(iter(catalog['profiles']['v6-small']['models'].values()))
        partial = (self.root/model['file']).with_suffix('.partial')
        partial.write_bytes(b'another-download')
        result = subprocess.run([sys.executable,str(ROOT/'dev-tools/prepare_models.py'),
            '--profile','v6-small','--output',str(self.root)],capture_output=True)
        self.assertEqual(result.returncode,1)
        self.assertEqual(partial.read_bytes(),b'another-download')


class CoordinatesTests(unittest.TestCase):
    def test_enlarged_region_maps_results_to_original_pixels_without_filtering(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'image.png'
            with Image.new('RGB',(200,100),'white') as image:
                image.save(path)
            sizes = []
            backend = Backend.__new__(Backend)
            def infer(image):
                sizes.append(image.size)
                return SimpleNamespace(boxes=[[[0,0],[80,0],[80,40],[0,40]]],txts=['祕'],scores=[0.01])
            backend.engine = infer
            backend.info = {'profile':'test'}
            result = backend.run({'path':str(path),'region':[20,30,100,70],'scale':2})
            self.assertEqual(sizes,[(160,80)])
            self.assertEqual(result['data'][0]['box'], [[20,30],[60,30],[60,50],[20,50]])
            self.assertEqual(result['data'][0]['score'],0.01)
            self.assertEqual(result['data'][0]['text'],'祕')
            for region in ([0,0,201,100], [1,1,0,0], [True,0,20,20]):
                with self.subTest(region=region), self.assertRaises(ValueError):
                    backend.run({'path':str(path),'region':region})


class WorkerLifecycleTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        (self.root/'bundle.json').write_text('{}')
        (self.root/'worker.py').write_text('''import json, sys, time
print(json.dumps({'event':'ready','engineInfo':{'fake':True}}),flush=True)
for line in sys.stdin:
    request=json.loads(line)
    if request.get('path')=='crash': sys.exit(1)
    if request.get('path')=='delay': time.sleep(10)
    if request.get('path')=='invalid':
        print('invalid json',flush=True)
        continue
    print(json.dumps({'code':100,'data':request}),flush=True)
''',encoding='utf-8')
        patcher = patch.object(process,'__file__',str(self.root/'process.py'))
        patcher.start()
        self.addCleanup(patcher.stop)
        self.api = client.Api({'python_executable':sys.executable,'bundle_manifest':str(self.root/'bundle.json')})
        self.addCleanup(self.api.stop)
        self.assertEqual(self.api.start({}),'[Success]')

    def test_start_reuses_worker_but_setting_change_restarts_it(self):
        old = self.api.process
        self.assertEqual(self.api.start({}),'[Success]')
        self.assertIs(self.api.process,old)
        self.assertEqual(self.api.start({'detail':True}),'[Success]')
        self.assertIsNot(self.api.process,old)
        self.assertIsNotNone(old.poll())
        self.assertEqual(self.api.runBytes(b'PNG')['data']['base64'],'UE5H')

    def test_timeout_discards_late_response_and_allows_clean_restart(self):
        old = self.api.process
        self.api.timeout = 0.1
        self.assertEqual(self.api.runPath('delay')['code'],902)
        self.assertIsNone(self.api.process)
        self.assertIsNotNone(old.poll())
        self.api.timeout = 5
        self.assertEqual(self.api.start({}),'[Success]')
        self.assertEqual(self.api.runPath('fresh')['data']['path'],'fresh')

    def test_worker_exit_and_invalid_json_report_errors_and_release_process(self):
        for path in ('crash','invalid'):
            with self.subTest(path=path):
                self.assertEqual(self.api.start({}),'[Success]')
                old = self.api.process
                self.assertEqual(self.api.runPath(path)['code'],902)
                self.assertIsNone(self.api.process)
                self.assertIsNotNone(old.poll())


if __name__ == '__main__':
    unittest.main()
