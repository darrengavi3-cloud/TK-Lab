import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from recovery_support import recovery, SOURCE

class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.files = [self.root / '原注.png', self.root / 'page2.png']
        for i, path in enumerate(self.files):
            path.write_bytes(str(i).encode())
        self.items = [{'path': str(path)} for path in self.files]
        self.calls = []

    def session(self, recipe=None, **kw):
        result = recovery.RecoverySession(self.root / 'journal', 'image', self.items,
                                          recipe or {'engine':'test', 'parser':'none'}, **kw)
        self.addCleanup(lambda: result.close('stopped'))
        return result

    def recognize(self, result=None):
        self.calls.append(1)
        return result or {'code':100, 'data':[{'text':'正文𠮷 原注', 'score':0.8}]}

    def test_resume_replays_completed_and_retries_failed_in_order(self):
        first = self.session()
        first.execute(0, lambda: self.recognize())
        first.execute(1, lambda: self.recognize({'code':500, 'data':'error'}))
        first.close('completed')
        second = self.session()
        result0 = second.execute(0, lambda: self.fail('completed item was run'))
        result1 = second.execute(1, lambda: self.recognize())
        self.assertTrue(result0['recovery']['reused'])
        self.assertEqual(result1['recovery'], {'reused':False, 'attempts':2})
        self.assertEqual(len(self.calls), 3)

    def test_changed_bytes_invalidate_even_same_size_and_mtime(self):
        first = self.session()
        first.execute(0, lambda: self.recognize())
        first.close('completed')
        stat = self.files[0].stat()
        self.files[0].write_bytes(b'x')
        os.utime(self.files[0], ns=(stat.st_atime_ns, stat.st_mtime_ns))
        second = self.session()
        self.assertFalse(second.execute(0, lambda: self.recognize())['recovery']['reused'])

    def test_recipe_and_input_order_separate_jobs(self):
        first = self.session()
        second = self.session({'engine':'new'})
        self.assertNotEqual(first.job_id, second.job_id)
        self.items.reverse()
        third = self.session()
        self.assertNotEqual(first.job_id, third.job_id)

    def test_partial_success_and_exception_remain_retryable(self):
        first = self.session()
        first.execute(0, lambda: self.recognize({'code':100, 'data':[], 'error':'image failed'}))
        def fail():
            raise RuntimeError('engine stopped')
        self.assertEqual(first.execute(1, fail)['code'], 902)
        first.close('completed')
        with sqlite3.connect(str(first.path)) as db:
            self.assertEqual(db.execute('SELECT state FROM job').fetchone()[0], 'incomplete')
        second = self.session()
        for i in range(2):
            self.assertFalse(second.execute(i, lambda: self.recognize())['recovery']['reused'])

    def test_blank_success_is_reused(self):
        first = self.session()
        first.execute(0, lambda: {'code':101, 'data':''})
        first.close('stopped')
        second = self.session()
        self.assertTrue(second.execute(0, lambda: self.fail('blank rerun'))['recovery']['reused'])

    def test_concurrent_open_rejected_and_lock_released(self):
        first = self.session()
        with self.assertRaisesRegex(RuntimeError, 'already running'):
            self.session()
        first.close('stopped')
        self.session()

    def test_corrupted_payload_is_recomputed(self):
        first = self.session()
        first.execute(0, lambda: self.recognize())
        first.close('stopped')
        with sqlite3.connect(str(first.path)) as db:
            db.execute("UPDATE items SET result='corrupt' WHERE position=0")
        second = self.session()
        self.assertFalse(second.execute(0, lambda: self.recognize())['recovery']['reused'])

    def test_changed_during_recognition_is_not_saved(self):
        first = self.session()
        def change():
            self.files[0].write_bytes(b'changed')
            return self.recognize()
        with self.assertRaisesRegex(RuntimeError, 'changed during recognition'):
            first.execute(0, change)
        with sqlite3.connect(str(first.path)) as db:
            self.assertIsNone(db.execute('SELECT result FROM items WHERE position=0').fetchone()[0])

    def test_model_tree_fingerprint_changes_with_weights(self):
        plugin = self.root / 'plugin'
        plugin.mkdir()
        (plugin / 'model.onnx').write_bytes(b'weightsA')
        before = recovery.tree_digest(plugin)
        (plugin / 'model.onnx').write_bytes(b'weightsB')
        self.assertNotEqual(before, recovery.tree_digest(plugin))

    def test_process_exit_releases_lock_and_keeps_completed_result(self):
        script = '''
import importlib.util, os, sys
spec=importlib.util.spec_from_file_location('recovery', sys.argv[1])
r=importlib.util.module_from_spec(spec); spec.loader.exec_module(r)
s=r.RecoverySession(sys.argv[2], 'image', [{'path':sys.argv[3]}, {'path':sys.argv[4]}], {'engine':'test','parser':'none'})
s.execute(0, lambda: {'code':100,'data':'persisted'})
def crash(): os._exit(17)
s.execute(1, crash)
'''
        proc = subprocess.run([sys.executable, '-c', script, str(SOURCE / 'mission/recovery.py'),
                               str(self.root / 'journal'), str(self.files[0]), str(self.files[1])], timeout=10)
        self.assertEqual(proc.returncode, 17)
        session = self.session()
        self.assertTrue(session.execute(0, lambda: self.fail('lost completed result'))['recovery']['reused'])
        self.assertEqual(session.execute(1, lambda: self.recognize())['recovery']['attempts'], 2)

if __name__ == '__main__':
    unittest.main()
