"""Run without Qt or an OCR model: python -m unittest discover -s tests."""
import csv
import importlib.util
from pathlib import Path
import sys
import tempfile
import types
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'UmiOCR-data' / 'py_src'
# Load real exporter/base/helpers; replace only the desktop OS integration.
for name, path in [('csvtest', SOURCE), ('csvtest.ocr', SOURCE / 'ocr'),
                   ('csvtest.ocr.output', SOURCE / 'ocr' / 'output')]:
    package = types.ModuleType(name)
    package.__path__ = [str(path)]
    sys.modules[name] = package
platform = types.ModuleType('csvtest.platform')
platform.Platform = types.SimpleNamespace(startfile=lambda path: None)
sys.modules[platform.__name__] = platform
spec = importlib.util.spec_from_file_location(
    'csvtest.ocr.output.output_csv', SOURCE / 'ocr/output/output_csv.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CsvExportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.output = module.OutputCsv(dict(outputDir=self.tmp.name,
            outputFileName='result', ignoreBlank=True))
        self.path = Path(self.output.outputPath)

    def rows(self):
        with self.path.open(encoding='utf-8-sig', newline='') as file:
            return list(csv.reader(file))

    def result(self, code=100, text='正文', name='𠮷_日本語.png'):
        return dict(code=code, fileName=name, path='/图像/' + name,
                    data=[dict(text=text, end='\n')] if code == 100 else 'failure')

    def test_unicode_metadata_and_csv_roundtrip_before_end(self):
        text = '繁體𠮷,日本語 "原注"\n第二行'
        self.output.print(self.result(text=text))
        self.assertEqual(self.rows()[1], ['𠮷_日本語.png', text, '/图像/𠮷_日本語.png'])

    def test_blank_skipped_but_error_retained(self):
        self.output.print(self.result(code=101))
        self.output.print(self.result(code=500))
        self.assertEqual(len(self.rows()), 2)
        self.assertIn('Code: 500', self.rows()[1][1])

    def test_blank_can_be_exported(self):
        self.output.ignoreBlank = False
        self.output.print(self.result(code=101))
        self.assertEqual(self.rows()[1][1], '')

    def test_completed_rows_survive_without_end_callback(self):
        for index in range(100):
            self.output.print(self.result(text=str(index)))
        self.assertEqual(len(self.rows()), 101)
        before = self.path.read_bytes()
        self.output.onEnd()
        self.output.onEnd()
        self.assertEqual(before, self.path.read_bytes())
        self.assertEqual(before.count(b'\xef\xbb\xbf'), 1)

    def test_initialization_creates_header(self):
        self.assertEqual(self.rows(), [['Name', 'OCR', 'Path']])

    def test_write_failure_is_reported(self):
        self.path.unlink()
        self.path.mkdir()
        with self.assertRaisesRegex(Exception, 'Failed to write csv'):
            self.output.print(self.result())

if __name__ == '__main__':
    unittest.main()
