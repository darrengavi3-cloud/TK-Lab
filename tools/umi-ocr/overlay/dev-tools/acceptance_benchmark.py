#!/usr/bin/env python3
"""Real-document acceptance: literal CER, region omissions/order, latency and RSS."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import platform
import time

spec=importlib.util.spec_from_file_location('accuracy',Path(__file__).with_name('accuracy_benchmark.py'))
accuracy=importlib.util.module_from_spec(spec);spec.loader.exec_module(accuracy)


def bounds(poly):
    xs,ys=zip(*poly)
    return [min(xs),min(ys),max(xs),max(ys)]


def coverage(box,region):
    x0,y0,x1,y1=box;a,b,c,d=region
    area=(x1-x0)*(y1-y0)
    return max(0,min(x1,c)-max(x0,a))*max(0,min(y1,d)-max(y0,b))/area if area>0 else 0


def metrics(case,result):
    regions=case['regions'];assigned=[[] for _ in regions];sequence=[];extra=[];ignored=0
    blocks=result.get('data',[]) if result.get('code')==100 else []
    for block in blocks:
        box=bounds(block['box'])
        overlaps=[coverage(box,r['box']) for r in regions]
        if overlaps and max(overlaps)>=0.5:
            match=max(range(len(overlaps)),key=overlaps.__getitem__)
            assigned[match].append(block['text']);sequence.append(match)
        elif any(coverage(box,r)>=0.5 for r in case.get('ignore_regions',[])):
            ignored+=1
        else:
            extra.append(block['text'])
    counts={'errors':0,'substitutions':0,'deletions':0,'insertions':0}
    region_scores=[];characters=0
    normalize=accuracy.without_layout_space
    for region,hyp in zip(regions,assigned):
        ref=normalize(region['text']);text=normalize(''.join(hyp));characters+=len(ref)
        edit=accuracy.edit_counts(ref,text)
        for k,v in edit.items():counts[k]+=v
        region_scores.append({'id':region['id'],'reference_characters':len(ref),
                              'detected':bool(hyp),**edit})
    inserted=len(normalize(''.join(extra)))
    counts['errors']+=inserted;counts['insertions']+=inserted
    pairs=sum(a!=b for i,a in enumerate(sequence) for b in sequence[i+1:])
    inversions=sum(a>b for i,a in enumerate(sequence) for b in sequence[i+1:])
    runs=[v for i,v in enumerate(sequence) if i==0 or sequence[i-1]!=v]
    interleaved=len(runs)-len(set(runs))
    raw=normalize(''.join(b['text'] for b in blocks))
    reference=normalize(''.join(r['text'] for r in regions))
    return {**counts,'reference_characters':characters,'cer':counts['errors']/characters if characters else None,
            'missing_regions':sum(not x for x in assigned),'regions':len(regions),
            'reading_order_inversions':inversions,'reading_order_pairs':pairs,
            'reading_order_error_rate':inversions/pairs if pairs else None,
            'reading_order_coverage':sum(bool(x) for x in assigned)/len(regions),
            'interleaved_region_runs':interleaved,'unmatched_text_characters':inserted,
            'ignored_prediction_blocks':ignored,'raw_sequence_edits':accuracy.edit_counts(reference,raw),
            'per_region':region_scores,'failed':result.get('code') not in (100,101)}


def evaluate(suite_path,python,bundle,detail=False):
    raw=Path(suite_path).read_bytes();suite=json.loads(raw)
    if suite.get('schema_version')!=2 or not suite.get('cases'):
        raise ValueError('Expected a frozen version 2 acceptance suite')
    root=Path(suite_path).resolve().parent
    for case in suite['cases']:
        image=(root/case['image']).resolve();image.relative_to(root)
        if hashlib.sha256(image.read_bytes()).hexdigest()!=case['image_sha256']:
            raise ValueError('Acceptance image checksum mismatch: '+case['id'])
    report={'schema_version':1,'suite_sha256':hashlib.sha256(raw).hexdigest(),
            'kind':suite['kind'],'platform':platform.platform(),'detail':detail,'cases':[],
            'method':'Unicode codepoint CER per fixed reference region; whitespace only excluded. '
                     'Original OCR order; no layout oracle supplied to inference. '
                     'Fresh CPU worker per case; memory is worker lifetime peak RSS including startup. '
                     'Reading order is measured between detected reference regions; within-region order remains part of CER.'}
    for case in suite['cases']:
        api=accuracy.Api({'python_executable':str(python),'bundle_manifest':str(bundle),'kernel_offline':True})
        start=time.perf_counter();startup=0
        try:
            message=api.start({'detail':detail})
            startup=time.perf_counter()-start
            if message.startswith('[Error]'):
                result={'code':902,'data':message};elapsed=0
            else:
                start=time.perf_counter();result=api.runPath(str(root/case['image']))
                elapsed=time.perf_counter()-start
            item={'id':case['id'],'category':case['category'],'startup_seconds':startup,
                  'recognition_seconds':elapsed,'peak_rss_bytes':result.get('performance',{}).get('worker_lifetime_peak_rss_bytes'),
                  'metrics':metrics(case,result),'engine':api.engineInfo}
            # Predictions are saved for local research review, not substituted for GT.
            item['result']=result
            report['cases'].append(item)
            print(json.dumps({k:v for k,v in item.items() if k not in ('engine','result')},ensure_ascii=False),flush=True)
        finally:
            api.stop()
    total={key:sum(x['metrics'][key] for x in report['cases']) for key in
           ('errors','substitutions','deletions','insertions','reference_characters','missing_regions','regions','reading_order_inversions','reading_order_pairs')}
    total['cer']=total['errors']/total['reference_characters']
    total['failed_cases']=sum(x['metrics']['failed'] for x in report['cases'])
    total['reading_order_error_rate']=total['reading_order_inversions']/total['reading_order_pairs'] if total['reading_order_pairs'] else None
    report['total']=total
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for key in ('suite','python','bundle','output'):parser.add_argument('--'+key,required=True)
    parser.add_argument('--detail',action='store_true');args=parser.parse_args()
    report=evaluate(args.suite,args.python,args.bundle,args.detail)
    with Path(args.output).open('x',encoding='utf-8') as stream:json.dump(report,stream,ensure_ascii=False,indent=2)
