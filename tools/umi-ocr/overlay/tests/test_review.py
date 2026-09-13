from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

import fitz
from PIL import Image, ImageChops
from recovery_support import recovery, ocr, FakeApi, ROOT
from recoverytest.ocr.review import apply_proposals, checksum, quality
from recoverytest.ocr.output.output_review import OutputReview

spec = importlib.util.spec_from_file_location('review_cli', ROOT / 'dev-tools/review_cli.py')
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)


def block(text='原注', score=0.5):
    return {'text': text, 'score': score, 'box': [[20,20],[100,20],[100,50],[20,50]], 'end':'\n'}


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / '原图.png'
        with Image.new('RGB', (200,100), 'white') as image:
            image.paste('black', (20,20,100,50))
            image.save(self.source)

    def result(self, data=None, code=100, **extra):
        data = [block()] if data is None else data
        return dict(path=str(self.source), code=code, data=deepcopy(data),
                    rawResult={'code':code,'data':deepcopy(data)},
                    sourceFingerprint=recovery.file_digest(self.source), **extra)

    def exporter(self, count=1):
        return OutputReview(dict(outputDir=str(self.root), outputFileName='result',
                                 expectedItems=count, ignoreBlank=True))

    def evidence(self):
        output = self.exporter()
        output.print(self.result())
        output.onEnd()
        page, entry = cli.load_page(output.root, 'p000001')
        proposal = {'page_digest':entry['digest'], 'suggestions':[
            dict(id='s1',block_id='b000001',original='原注',replacement='原註',reason='字形可见言旁')],
            'unresolved':['右侧夹注尚待核对']}
        return output, page, proposal

    def test_quality_marks_unknown_without_deleting_or_claiming_reviewed(self):
        blocks = [block(score=None), block(score=0.99), block(score=1)]
        blocks[2]['from'] = 'text'
        before = deepcopy(blocks)
        report = quality({'code':100, 'data':blocks}, blocks)
        self.assertEqual(report['findings'], [{'block_id':'b000001','reasons':['unknown_confidence']}])
        self.assertEqual(blocks, before)
        self.assertEqual(quality({'code':100,'data':[block(score=1)]}, [block(score=1)])['status'], 'unreviewed')

    def test_raw_snapshot_survives_destructive_postprocessing_and_missing_score(self):
        engine = ocr.__dict__['__MissionOcrClass']()
        engine._api = FakeApi()
        def inference(path):
            data = block()
            del data['score']
            return {'code':100,'data':[data]}
        engine._api.runPath = inference
        class Delete:
            def run(self, data):
                data[0]['text'] = 'mutated'
                return []
        result = engine.msnTask({'argd':{'review.capture':True},'tbpu':[Delete()]}, {'path':str(self.source)})
        self.assertEqual(result['code'], 101)
        self.assertEqual(result['rawResult']['data'][0]['text'], '原注')
        self.assertNotIn('score', result['rawResult']['data'][0])
        self.assertEqual(result['score'], -1)
        self.assertFalse(result['scoreKnown'])

    def test_image_crop_matches_source_and_checksums(self):
        output, page, proposal = self.evidence()
        self.assertEqual(page['crops'][0]['pixel_bbox'], [8,8,112,62])
        with Image.open(self.source) as image, Image.open(output.root/'p000001/crops/b000001.png') as crop:
            self.assertIsNone(ImageChops.difference(image.crop((8,8,112,62)), crop).getbbox())
        self.assertEqual(proposal['page_digest'], checksum(page))
        self.assertTrue(json.loads((output.root/'manifest.json').read_text())['export_complete'])

    def test_code_parser_keeps_text_with_unknown_confidence(self):
        from recoverytest.ocr.tbpu import getParser
        data = block(score=None)
        result = getParser('single_code').run([data])
        self.assertIn('原注', result[0]['text'])
        self.assertIsNone(result[0]['score'])

    def test_blank_and_failed_pages_survive_ignore_blank_and_partial_is_incomplete(self):
        output = self.exporter(3)
        output.print(self.result('', 101))
        output.print(self.result('engine failed', 500))
        output.onEnd()
        manifest = json.loads((output.root/'manifest.json').read_text())
        self.assertEqual(len(manifest['pages']), 2)
        self.assertFalse(manifest['export_complete'])
        page, _ = cli.load_page(output.root, 'p000002')
        self.assertIn('incomplete_recognition', page['quality']['flags'])

    def test_explicit_edits_create_unique_editions_and_keep_all_evidence(self):
        output, page, proposal = self.evidence()
        before = {str(p):p.read_bytes() for p in output.root.rglob('*') if p.is_file()}
        proposal_path = self.root/'proposal.json'
        proposal_path.write_text(json.dumps(proposal), encoding='utf-8')
        first = cli.apply(output.root, 'p000001', proposal_path, ['s1'])
        second = cli.apply(output.root, 'p000001', proposal_path, ['s1'])
        self.assertNotEqual(first, second)
        edition = json.loads((first/'edition.json').read_text())
        self.assertEqual(edition['data'][0]['text'], '原註')
        self.assertEqual(edition['unresolved'], proposal['unresolved'])
        self.assertEqual(edition['status'], 'partially_reviewed')
        self.assertEqual(page['raw']['data'][0]['text'], '原注')
        for path, content in before.items():
            self.assertEqual(Path(path).read_bytes(), content)

    def test_reject_stale_wrong_original_unknown_duplicate_and_implicit_edits(self):
        _, page, proposal = self.evidence()
        for ids in ([], ['unknown'], ['s1','s1']):
            with self.subTest(ids=ids), self.assertRaises(ValueError):
                apply_proposals(page, proposal, ids)
        for key, value in [('page_digest','stale'), ('original','wrong'), ('block_id','b999999')]:
            candidate = deepcopy(proposal)
            (candidate if key == 'page_digest' else candidate['suggestions'][0])[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                apply_proposals(page, candidate, ['s1'])
        candidate = deepcopy(proposal)
        candidate['suggestions'].append(deepcopy(candidate['suggestions'][0]))
        with self.assertRaises(ValueError):
            apply_proposals(page, candidate, ['s1'])

    def test_modified_page_image_crop_and_path_escape_rejected(self):
        for name in ('page.json','page.png','crops/b000001.png'):
            output, page, proposal = self.evidence()
            with (output.root/'p000001'/name).open('ab') as stream:
                stream.write(b'changed')
            with self.subTest(file=name), self.assertRaises(ValueError):
                cli.load_page(output.root, 'p000001')
        with self.assertRaises(ValueError):
            cli.contained(self.root, '../outside')

    def test_source_changed_since_recognition_rejected(self):
        result = self.result()
        self.source.write_bytes(b'changed')
        output = self.exporter()
        with self.assertRaisesRegex(ValueError, 'Source changed'):
            output.print(result)
        self.assertEqual(output.manifest['pages'], [])

    def test_exif_orientation_disables_unreliable_crops(self):
        self.source = self.root/'rotated.jpg'
        exif = Image.Exif()
        exif[274] = 6
        with Image.new('RGB', (200,100), 'white') as image:
            image.save(self.source, exif=exif)
        output = self.exporter()
        output.print(self.result())
        page, _ = cli.load_page(output.root, 'p000001')
        self.assertEqual(page['crops'], [])
        self.assertIn('exif_orientation_requires_review', page['quality']['flags'])

    def test_rotated_pdf_render_and_crop_use_rotated_page_points(self):
        self.source = self.root/'rotated.pdf'
        with fitz.open() as pdf:
            page = pdf.new_page(width=200, height=100)
            page.draw_rect(fitz.Rect(20,20,100,50), color=(0,0,0), fill=(0,0,0))
            page.set_rotation(90)
            pdf.save(self.source)
        data = block()
        data['box'] = [[50,20],[80,20],[80,100],[50,100]]
        output = self.exporter()
        output.print(self.result([data], page=1))
        page, _ = cli.load_page(output.root, 'p000001')
        self.assertEqual(page['source']['coordinate_size'], [100,200])
        self.assertEqual(page['render']['size'], [200,400])
        self.assertEqual(page['crops'][0]['pixel_bbox'], [88,28,172,212])
        with Image.open(output.root/'p000001/page.png') as image:
            self.assertEqual(image.getpixel((130,120)), (0,0,0))


if __name__ == '__main__':
    unittest.main()
