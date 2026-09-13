from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import zipfile

from PIL import Image
from recovery_support import ROOT
from recoverytest.ocr.review.candidates import append_candidate, load_candidates, compare_candidates
from recoverytest.ocr.review.region_session import RegionSession
import test_sumi_accuracy as accuracy_tests
block = accuracy_tests.block
from sumi_rapidocr import bundle, package

spec=importlib.util.spec_from_file_location('acceptance',ROOT/'dev-tools/acceptance_benchmark.py')
acceptance=importlib.util.module_from_spec(spec);spec.loader.exec_module(acceptance)


def candidate(text,score=.1,identifier='a'):
    return {'id':identifier,'context':{'page':1},'result':{'code':100,'data':[block(text,0,0)],
             'engineInfo':{'lineage':{'family':'PaddleOCR'},'model_sha256':{'rec':'same'}}}}


class CandidateTests(unittest.TestCase):
    def test_disagreement_preserves_literal_variants_and_no_winner(self):
        values=[candidate('原註祕𠮷'),candidate('原注秘吉',.99,'b')];before=deepcopy(values)
        result=compare_candidates(values)
        self.assertEqual(result['state'],'disagreement');self.assertEqual(values,before)
        self.assertTrue(result['pairs'][0]['same_recognition_weights'])
        self.assertTrue(result['pairs'][0]['same_model_family'])
        self.assertFalse(result['agreement_is_independent_evidence'])
        self.assertNotIn('winner',result)

    def test_agreement_failure_and_mismatched_region_are_distinct(self):
        a=candidate('原註');b=candidate('原\n 註',identifier='b')
        self.assertEqual(compare_candidates([a,b])['state'],'agreement_unverified')
        b['result']={'code':902,'data':'timeout'}
        self.assertEqual(compare_candidates([a,b])['state'],'partial_failure')
        b['context']['page']=2
        with self.assertRaises(ValueError):compare_candidates([a,b])

    def test_history_is_append_only_scoped_and_reports_tampering(self):
        with tempfile.TemporaryDirectory() as temp:
            _,p1=append_candidate(temp,{'page':1},candidate('先')['result'],{'scale':1})
            content=Path(p1).read_bytes()
            append_candidate(temp,{'page':1},candidate('後')['result'],{'scale':2})
            append_candidate(temp,{'page':2},candidate('別頁')['result'],{'scale':1})
            self.assertEqual(Path(p1).read_bytes(),content)
            history=load_candidates(temp,{'page':1})
            self.assertEqual(history['total_matching'],2)
            self.assertEqual(history['comparison']['state'],'disagreement')
            Path(p1).write_text('{}')
            self.assertEqual(len(load_candidates(temp,{'page':1})['corrupt_files']),1)

    def test_changed_source_or_preview_prevents_saving_candidate(self):
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp)/'input.png';Image.new('RGB',(200,100),'white').save(p)
            session=RegionSession(p,Path(temp)/'out')
            p.write_bytes(b'changed')
            class NeverCalled:
                def runRegion(self,*args):raise AssertionError('Inference must not run')
            with self.assertRaisesRegex(ValueError,'变化'):session.recognize(NeverCalled(),[0,0,100,50])
            self.assertFalse(list(session.directory.glob('candidate-*')))

    def test_rotated_pdf_region_maps_back_to_page_points(self):
        import fitz
        with tempfile.TemporaryDirectory() as temp:
            source=Path(temp)/'rotated.pdf'
            with fitz.open() as doc:
                page=doc.new_page(width=200,height=100);page.set_rotation(90);doc.save(source)
            session=RegionSession(source,Path(temp)/'out')
            self.assertEqual(session.source['render_size'],[200,400])
            class FixedApi:
                def runRegion(self,*args):return {'code':100,'data':[block('註',20,40,60,20)]}
            history=session.recognize(FixedApi(),[10,20,100,200],2)
            c=history['candidates'][0]
            self.assertEqual(c['context']['region_page'],[5,10,50,100])
            self.assertEqual(c['result']['data'][0]['box'],[[10,20],[40,20],[40,30],[10,30]])
            self.assertEqual(c['result']['render_result']['data'][0]['box'][0],[20,40])
            self.assertEqual(c['result']['coordinate_system'],'pdf_rotated_page_points')


class CompleteBundleTests(unittest.TestCase):
    save = accuracy_tests.BundleTests.save
    def setUp(self):
        accuracy_tests.BundleTests.setUp(self)
        chars='["原","註"]\n'.encode()
        self.dictionary={'file':'dictionary.json','sha256':hashlib.sha256(chars).hexdigest(),'entries':2,'source':'fixture'}
        (self.root/'dictionary.json').write_bytes(chars)
        c=json.loads((self.root/'catalog.json').read_text());c['profiles']['fixture']['dictionary']=self.dictionary
        (self.root/'catalog.json').write_text(json.dumps(c))
        self.manifest.update(schema_version=2,dictionary_spec=self.dictionary,
              runtime={'backend':'rapidocr-onnxruntime-cpu','rapidocr':'3.9.2','onnxruntime':'1.23.2'})
        self.save();self.patcher=patch.object(package,'__file__',str(self.root/'package.py'))
        self.patcher.start();self.addCleanup(self.patcher.stop)

    def archive(self,extra=None):
        path=self.root/'package.sumimodel'
        with zipfile.ZipFile(path,'w') as z:
            for filename in ['bundle.json','dictionary.json','det.onnx','rec.onnx','cls.onnx']:
                z.write(self.root/filename,filename)
            z.writestr('MODEL-LICENSE.txt','Apache-2.0');z.writestr('MODEL-NOTICE.txt','Test')
            if extra:z.writestr(*extra)
        return path

    def test_complete_import_is_unique_and_tampered_dictionary_is_rejected(self):
        archive=self.archive();dest=self.root/'installed'
        one=package.import_bundle(archive,dest);two=package.import_bundle(archive,dest)
        self.assertNotEqual(one,two);bundle.read_bundle(one)
        (self.root/'dictionary.json').write_text('[]')
        with self.assertRaisesRegex(ValueError,'dictionary'):package.import_bundle(self.archive(),dest)
        self.assertEqual(len(list(dest.iterdir())),2)

    def test_archive_traversal_and_duplicate_entries_are_rejected(self):
        for extra in [('../outside','bad'),('dictionary.json','bad')]:
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                package.import_bundle(self.archive(extra),self.root/'installed')
        self.assertFalse((self.root/'outside').exists())

    def test_dictionary_and_backend_are_bound_to_catalog(self):
        self.manifest['runtime']['backend']='other';self.save()
        with self.assertRaisesRegex(ValueError,'backend'):bundle.read_bundle(self.path)


class AcceptanceTests(unittest.TestCase):
    def test_geometry_separates_order_errors_from_text_errors(self):
        case={'regions':[{'id':'r','box':[100,0,200,80],'text':'原註'},
                         {'id':'l','box':[0,0,80,80],'text':'正文'}]}
        result={'code':100,'data':[block('正文',0,0),block('原註',110,0)]}
        score=acceptance.metrics(case,result)
        self.assertEqual(score['errors'],0);self.assertEqual(score['reading_order_error_rate'],1)
        result['data'].pop()
        score=acceptance.metrics(case,result)
        self.assertEqual(score['deletions'],2);self.assertEqual(score['missing_regions'],1)
        self.assertIsNone(score['reading_order_error_rate'])

    def test_failed_pages_count_as_deletions_not_dropped_samples(self):
        case={'regions':[{'id':'a','box':[0,0,80,80],'text':'原註𠮷'}]}
        score=acceptance.metrics(case,{'code':902,'data':'failed'})
        self.assertEqual(score['deletions'],3);self.assertEqual(score['missing_regions'],1)
        self.assertTrue(score['failed'])
