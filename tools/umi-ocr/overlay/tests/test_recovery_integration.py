import csv
from pathlib import Path
import sqlite3
import sys
import tempfile
import threading
import types
import unittest
from unittest.mock import patch

import fitz
from PIL import Image
from io import BytesIO
from recovery_support import (mission, recovery, ocr, doc, batch_ocr, batch_doc,
                              Controller, FakeApi, options)

class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.output = self.root / 'out'
        self.output.mkdir()
        self.engine = ocr.__dict__['__MissionOcrClass']()
        self.engine._startMsns = lambda: None
        self.api = FakeApi()
        self.engine._api = self.api
        self.engine._apiKey = 'test_installed_engine'
        self.engine._apiGeneration = 'generation1'
        self.plugin = self.root / 'plugin'
        self.plugin.mkdir()
        (self.plugin / '__init__.py').write_text('# engine fixture\n')
        (self.plugin / 'model.onnx').write_bytes(b'weightsA')
        self.patch_module = patch.dict(sys.modules, {'test_installed_engine':
            types.SimpleNamespace(__file__=str(self.plugin / '__init__.py'))})
        self.patch_module.start()
        self.addCleanup(self.patch_module.stop)
        self.patches = [patch.object(batch_ocr, 'MissionOCR', self.engine),
                        patch.object(doc, 'MissionOCR', self.engine)]
        self.docs = doc._MissionDocClass()
        self.docs._startMsns = lambda: None
        self.docs._minInterval = 0
        self.patches.append(patch.object(batch_doc, 'MissionDOC', self.docs))
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)
        self.controller = Controller()
        self.page = batch_ocr.BatchOCR('image', self.controller)
        self.files = [self.root / (name + '.png') for name in ['正文', '𠮷注', '末页']]
        for path in self.files:
            path.write_bytes(b'fake-image')

    def run_images(self, opts=None, page=None):
        page = page or self.page
        result = page.msnPaths([str(p) for p in self.files], opts or options(self.output))
        self.assertFalse(result.startswith('[Error]'), result)
        self.engine._taskRun()
        return result

    def rows(self):
        with (self.output / 'result.csv').open(encoding='utf-8-sig', newline='') as f:
            return list(csv.reader(f))

    def test_cancel_then_new_controller_replays_in_order_without_duplicate_csv_rows(self):
        original = self.controller.callQml
        def cancel_after_first(key, fn, *args):
            original(key, fn, *args)
            if fn == 'onOcrGet':
                self.page.msnStop()
        self.controller.callQml = cancel_after_first
        self.run_images()
        self.assertEqual(len(self.api.calls), 1)
        self.assertEqual(len(self.rows()), 2)
        new_controller = Controller()
        new_page = batch_ocr.BatchOCR('new', new_controller)
        self.run_images(page=new_page)
        self.assertEqual(len(self.api.calls), 3)
        self.assertEqual([r[1] for r in self.rows()[1:]], ['正文', '𠮷注', '末页'])
        results = [args[1] for name, args in new_controller.events if name == 'onOcrGet']
        self.assertEqual([r['recovery']['reused'] for r in results], [True, False, False])

    def test_retry_only_failed_items(self):
        self.api.fail.add('𠮷注.png')
        self.run_images()
        self.assertTrue(self.controller.events[-1][1][0].startswith('[Warning]'))
        self.api.fail.clear()
        self.run_images()
        self.assertEqual([Path(p).name for p in self.api.calls],
                         ['正文.png', '𠮷注.png', '末页.png', '𠮷注.png'])
        self.assertEqual(len(self.rows()), 4)
        self.assertTrue(self.controller.events[-1][1][0].startswith('[Success]'))

    def test_changed_model_and_parser_invalidate_cached_results(self):
        self.run_images()
        (self.plugin / 'model.onnx').write_bytes(b'weightsB')
        self.run_images()
        self.assertEqual(len(self.api.calls), 6)
        opts = options(self.output)
        opts['tbpu.parser'] = 'single_line'
        self.run_images(opts)
        self.assertEqual(len(self.api.calls), 9)

    def test_recovery_off_always_runs_without_creating_journal(self):
        opts = options(self.output)
        opts['mission.resume'] = False
        self.run_images(opts)
        self.run_images(opts)
        self.assertEqual(len(self.api.calls), 6)
        self.assertFalse((self.output / '.umi-recovery').exists())

    def test_review_capture_invalidates_cache_and_replays_raw_evidence(self):
        import json
        for path in self.files:
            with Image.new('RGB', (200,100), 'white') as image:
                image.save(path)
        self.run_images()
        opts = options(self.output)
        opts['mission.filesType.review'] = True
        self.run_images(opts)
        self.assertEqual(len(self.api.calls), 6)
        self.run_images(opts)
        self.assertEqual(len(self.api.calls), 6)
        bundles = list(self.output.glob('result.review-*'))
        self.assertEqual(len(bundles), 2)
        for bundle in bundles:
            manifest = json.loads((bundle/'manifest.json').read_text())
            self.assertTrue(manifest['export_complete'])
            self.assertEqual(len(manifest['pages']), 3)
            evidence = json.loads((bundle/'p000002/page.json').read_text())
            self.assertEqual(evidence['raw']['data'][0]['text'], '𠮷注')

    def test_document_review_capture_precedes_ignore_area_and_replays(self):
        import json
        path = self.make_pdf()
        opts = options(self.output)
        opts.update({'doc.extractionMode':'textOnly', 'mission.filesType.review':True,
                     'tbpu.ignoreArea':[[[0,0],[1000,0],[1000,1000],[0,1000]]]})
        for repeat in range(2):
            ctrl = Controller()
            page = batch_doc.BatchDOC('doc', ctrl)
            page.msnDocs([dict(path=str(path), range_start=1, range_end=3, page_count=3, password='')], opts)
            self.docs._taskRun()
            self.assertTrue(ctrl.events[-1][1][1].startswith('[Success]'), ctrl.events)
        bundles = list(self.output.glob('result.review-*'))
        self.assertEqual(len(bundles), 2)
        for bundle in bundles:
            manifest = json.loads((bundle/'manifest.json').read_text())
            self.assertTrue(manifest['export_complete'])
            evidence = json.loads((bundle/'p000001/page.json').read_text())
            self.assertEqual(evidence['raw']['data'][0]['text'], 'Page 1')
            self.assertEqual(evidence['raw']['data'][0]['from'], 'text')
            self.assertEqual(evidence['processed']['code'], 101)
            self.assertIn('postprocessing_changed_block_count', evidence['quality']['flags'])

    def test_cancel_during_inference_preserves_result_for_next_run(self):
        original = self.api.runPath
        def run_and_cancel(path):
            result = original(path)
            self.page.msnStop()
            return result
        self.api.runPath = run_and_cancel
        self.run_images()
        self.assertEqual(len(self.rows()), 1)  # callback was cancelled
        self.api.runPath = original
        self.run_images()
        self.assertEqual(len(self.api.calls), 3)  # first result recovered
        self.assertEqual(len(self.rows()), 4)

    def test_export_error_is_visible_and_successful_ocr_can_be_replayed(self):
        original = self.page._initOutputList
        def broken(argd):
            original(argd)
            self.page.outputList[0].print = lambda res: (_ for _ in ()).throw(OSError('disk full'))
        self.page._initOutputList = broken
        with self.assertLogs('recoverytest', level='ERROR'):
            self.run_images()
        self.assertTrue(self.controller.events[-1][1][0].startswith('[Error]'))
        self.page._initOutputList = original
        self.run_images()
        self.assertEqual(len(self.api.calls), 3)
        self.assertEqual(len(self.rows()), 4)

    def test_concurrent_job_rejection_does_not_truncate_previous_output(self):
        self.run_images()
        before = (self.output / 'result.csv').read_bytes()
        journal = next((self.output / '.umi-recovery').glob('*.sqlite3'))
        lock = recovery.JobLock(str(journal) + '.lock')
        try:
            self.run_images()
        finally:
            lock.close()
        self.assertEqual(before, (self.output / 'result.csv').read_bytes())
        self.assertTrue(self.controller.events[-1][1][0].startswith('[Error]'))
        self.assertEqual(len(self.api.calls), 3)

    def test_pause_during_inference_replays_once_after_resume(self):
        original = self.api.runPath
        def run_and_pause(path):
            result = original(path)
            self.page.msnPause()
            return result
        self.api.runPath = run_and_pause
        self.run_images()
        self.assertEqual(len(self.api.calls), 1)
        self.assertEqual(len(self.rows()), 1)
        self.api.runPath = original
        self.page.msnResume()
        self.engine._taskRun()
        self.assertEqual(len(self.api.calls), 3)
        self.assertEqual(len(self.rows()), 4)

    def make_pdf(self, images=False):
        path = self.root / 'original.pdf'
        with fitz.open() as pdf:
            for i in range(3):
                page = pdf.new_page()
                page.insert_text((72, 72), 'Page ' + str(i + 1))
                if images:
                    buffer = BytesIO()
                    Image.new('RGB', (40,40), 'white').save(buffer, 'PNG')
                    page.insert_image(fitz.Rect(72,100,112,140), stream=buffer.getvalue())
            pdf.save(str(path))
        return path

    def submit_pdf(self, path, controller, mode='textOnly', layered=False):
        page = batch_doc.BatchDOC('doc', controller)
        opts = options(self.output)
        opts['doc.extractionMode'] = mode
        opts['mission.filesType.pdfLayered'] = layered
        page.msnDocs([dict(path=str(path), range_start=1, range_end=3, page_count=3, password='')], opts)
        return page

    def test_real_pdf_resume_rebuilds_three_pages_once(self):
        path = self.make_pdf()
        first_controller = Controller()
        page = self.submit_pdf(path, first_controller, layered=True)
        original = first_controller.callQml
        def cancel_after_first(key, fn, *args):
            original(key, fn, *args)
            if fn == 'onDocGet':
                page.msnStop()
        first_controller.callQml = cancel_after_first
        self.docs._taskRun()
        self.assertTrue((self.output / 'result.layered.pdf').exists(), first_controller.events)
        with fitz.open(str(self.output / 'result.layered.pdf')) as output:
            self.assertEqual(output.page_count, 1)
        second_controller = Controller()
        self.submit_pdf(path, second_controller, layered=True)
        with patch.object(self.docs, 'msnTask', wraps=self.docs.msnTask) as recognition:
            self.docs._taskRun()
            self.assertEqual(recognition.call_count, 2)
        with fitz.open(str(self.output / 'result.layered.pdf')) as output:
            self.assertEqual(output.page_count, 3)
            self.assertEqual([p.get_text().strip() for p in output], ['Page 1','Page 2','Page 3'])
        self.assertEqual(len(self.rows()), 4)
        self.assertTrue(second_controller.events[-1][1][1].startswith('[Success]'))

    def test_partial_pdf_pages_keep_text_but_are_retried(self):
        path = self.make_pdf(images=True)
        def failure(argd, imgs):
            return [dict(item, result={'code':500, 'data':'image failure'}) for item in imgs]
        with patch.object(self.engine, 'addMissionWait', side_effect=failure):
            ctrl = Controller()
            self.submit_pdf(path, ctrl, mode='mixed')
            self.docs._taskRun()
            page_results = [args[2] for name, args in ctrl.events if name == 'onDocGet']
            self.assertTrue(all(r['code'] == 100 and r['error'] for r in page_results))
            self.assertTrue(ctrl.events[-1][1][1].startswith('[Warning]'), ctrl.events)
        with patch.object(self.engine, 'addMissionWait',
                          side_effect=lambda argd, imgs: [dict(i, result={'code':101, 'data':''}) for i in imgs]):
            ctrl = Controller()
            self.submit_pdf(path, ctrl, mode='mixed')
            with patch.object(self.docs, 'msnTask', wraps=self.docs.msnTask) as recognition:
                self.docs._taskRun()
                self.assertEqual(recognition.call_count, 3)
            self.assertTrue(ctrl.events[-1][1][1].startswith('[Success]'))

    def test_engine_change_after_submission_aborts_before_export_overwrite(self):
        self.run_images()
        before = (self.output / 'result.csv').read_bytes()
        self.page.msnPaths([str(p) for p in self.files], options(self.output))
        self.engine._apiGeneration = 'changed'
        self.engine._taskRun()
        self.assertEqual((self.output / 'result.csv').read_bytes(), before)
        self.assertTrue(self.controller.events[-1][1][0].startswith('[Error]'))

    def test_engine_change_during_inference_does_not_cache_success(self):
        original = self.api.runPath
        def change_engine(path):
            result = original(path)
            self.engine._apiGeneration = 'changed'
            return result
        self.api.runPath = change_engine
        self.run_images()
        journal = next((self.output / '.umi-recovery').glob('*.sqlite3'))
        with sqlite3.connect(str(journal)) as db:
            self.assertEqual(db.execute('SELECT state FROM items WHERE position=0').fetchone()[0], 'failed')
        self.assertIn('OCR engine changed', self.controller.events[-1][1][0])

    def test_wait_does_not_miss_immediate_completion(self):
        worker = mission.Mission()
        worker.msnTask = lambda info, item: {'code':100,'data':'fast'}
        worker._startMsns = worker._taskRun
        result = []
        thread = threading.Thread(target=lambda: result.extend(worker.addMissionWait({}, [{}])), daemon=True)
        thread.start()
        thread.join(timeout=2)
        self.assertFalse(thread.is_alive(), 'lost completion notification')
        self.assertEqual(result[0]['result']['data'], 'fast')

if __name__ == '__main__':
    unittest.main()
