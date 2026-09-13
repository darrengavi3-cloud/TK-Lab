#!/usr/bin/env python3
"""Run the real subprocess OCR adapter against checksum-pinned images/references."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'UmiOCR-data/plugins'))
from sumi_rapidocr.client import Api

spec=importlib.util.spec_from_file_location("sumi_review",ROOT/"UmiOCR-data/py_src/ocr/review/__init__.py")
review=importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


def edit_counts(reference, hypothesis):
    # Minimum Levenshtein edits, deterministic tie order: substitution, deletion, insertion.
    row=[(j,0,0,j) for j in range(len(hypothesis)+1)]
    for i,a in enumerate(reference,1):
        new=[(i,0,i,0)]
        for j,b in enumerate(hypothesis,1):
            if a==b:
                new.append(row[j-1])
                continue
            cost,s,d,k=row[j-1]; substitution=(cost+1,s+1,d,k)
            cost,s,d,k=row[j]; deletion=(cost+1,s,d+1,k)
            cost,s,d,k=new[-1]; insertion=(cost+1,s,d,k+1)
            new.append(min((substitution,deletion,insertion),key=lambda v:v[0]))
        row=new
    return dict(zip(('errors','substitutions','deletions','insertions'),row[-1]))


def without_layout_space(text):
    # No Unicode normalization, punctuation removal, simplification or variant folding.
    return ''.join(c for c in text if not c.isspace())


def evaluate(suite_path, python, bundle, detail=False, reading_order="raw"):
    raw=suite_path.read_bytes()
    suite=json.loads(raw)
    if suite.get('schema_version')!=1 or not isinstance(suite.get('cases'),list) or not suite['cases']:
        raise ValueError('Expected a nonempty version 1 suite')
    ids=set()
    for case in suite['cases']:
        if case['id'] in ids or not isinstance(case['reference'],str):
            raise ValueError('Duplicate case ID or invalid reference')
        ids.add(case['id'])
        image=(suite_path.parent/case['image']).resolve()
        image.relative_to(suite_path.parent.resolve())
        if hashlib.sha256(image.read_bytes()).hexdigest()!=case['image_sha256']:
            raise ValueError('Input image checksum differs: '+case['id'])
    api=Api({'python_executable':python,'bundle_manifest':str(bundle)})
    report={'schema_version':1,'suite_sha256':hashlib.sha256(raw).hexdigest(),
            'dataset_kind':suite.get('kind','unspecified'),'metric':'Unicode codepoint CER; whitespace excluded; punctuation and variants preserved',
            'cases':[],'engine':None,'reading_order':reading_order}
    try:
        start=time.perf_counter()
        message=api.start({'detail':detail})
        report['startup_seconds']=time.perf_counter()-start
        if message.startswith('[Error]'):
            raise RuntimeError(message)
        report['engine']=api.engineInfo
        for case in suite['cases']:
            start=time.perf_counter()
            res=api.runPath(str((suite_path.parent/case['image']).resolve()))
            duration=time.perf_counter()-start
            blocks=res['data'] if res['code']==100 else []
            raw_text=''.join(b['text']+b.get('end','\n') for b in blocks)
            if reading_order=='right_columns':
                blocks=review.right_columns(blocks)
            text=''.join(b['text']+b.get('end','\n') for b in blocks)
            ref=without_layout_space(case['reference'])
            hyp=without_layout_space(text)
            metrics=edit_counts(ref,hyp)
            metrics.update(reference_characters=len(ref),cer=metrics['errors']/len(ref) if ref else None)
            report['cases'].append({'id':case['id'],'reference':case['reference'],'hypothesis':text,
                'image_sha256':case['image_sha256'],'code':res['code'],'seconds':duration,
                'raw_hypothesis':raw_text, 'raw_blocks':res['data'] if res['code']==100 else [],
                'error':res['data'] if res['code'] not in (100,101) else None,**metrics})
    finally:
        api.stop()
    total={key:sum(c[key] for c in report['cases']) for key in ('reference_characters','errors','substitutions','deletions','insertions')}
    total.update(cer=total['errors']/total['reference_characters'] if total['reference_characters'] else None,
                 failed_cases=sum(c['code'] not in (100,101) for c in report['cases']),
                 exact_cases=sum(c['errors']==0 and c['code'] in (100,101) for c in report['cases']),
                 total_cases=len(report['cases']))
    report['total']=total
    return report


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--suite',type=Path,required=True)
    p.add_argument('--python',required=True)
    p.add_argument('--bundle',type=Path,required=True)
    p.add_argument('--detail',action='store_true')
    p.add_argument('--reading-order',choices=['raw','right_columns'],default='raw')
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    try:
        if args.output.exists():
            raise ValueError('Report already exists; use a new output filename')
        report=evaluate(args.suite,args.python,args.bundle,args.detail,args.reading_order)
        with args.output.open('x',encoding='utf-8') as stream:
            json.dump(report,stream,ensure_ascii=False,indent=2,allow_nan=False)
            stream.write('\n')
        print(json.dumps(report['total'],ensure_ascii=False))
        return 1 if report['total']['failed_cases'] else 0
    except Exception as exc:
        print('Benchmark failed: '+str(exc),file=sys.stderr)
        return 1


if __name__=='__main__':
    sys.exit(main())
