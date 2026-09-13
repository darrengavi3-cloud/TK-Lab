"""Immutable local candidates. Agreement never proves correctness/independence."""
from copy import deepcopy
from datetime import datetime, timezone
import difflib
import hashlib
import json
import math
from pathlib import Path
import uuid

from . import checksum


def text_of(result):
    if result.get('code') != 100:
        return ''
    return '\n'.join(block['text'] for block in result['data'])


def compare_candidates(candidates):
    valid = [c for c in candidates if c['result'].get('code') in (100,101)]
    contexts = {checksum(c['context']) for c in candidates}
    if len(contexts) > 1:
        raise ValueError('Candidates refer to different pages or regions')
    normalize = lambda text: ''.join(c for c in text if not c.isspace())
    texts = [normalize(text_of(c['result'])) for c in valid]
    disagrees = len(set(texts)) > 1
    failed = len(candidates)-len(valid)
    state = ('disagreement' if disagrees else 'partial_failure' if failed else
             'agreement_unverified' if len(valid)>1 else 'single_candidate' if valid else 'no_result')
    pairs = []
    if valid:
        baseline = valid[0]
        for other in valid[1:]:
            a, b = texts[0], normalize(text_of(other['result']))
            first = baseline['result'].get('engineInfo',{})
            second = other['result'].get('engineInfo',{})
            family_a = first.get('lineage',{}).get('family')
            family_b = second.get('lineage',{}).get('family')
            model_a = first.get('model_sha256',{}).get('rec')
            model_b = second.get('model_sha256',{}).get('rec')
            changes = [{'kind':op,'first':a[i:j],'other':b[k:l]}
                       for op,i,j,k,l in difflib.SequenceMatcher(None,a,b,autojunk=False).get_opcodes()
                       if op!='equal']
            pairs.append({'first_id':baseline['id'],'other_id':other['id'],
                          'same_recognition_weights':bool(model_a and model_a==model_b),
                          'same_model_family':bool(family_a and family_a==family_b),
                          'independence':'not_established','differences':changes})
    return {'state':state,'valid_candidates':len(valid),'failed_candidates':failed,
            'agreement_is_independent_evidence':False,'pairs':pairs}


def checked_region(region, width, height):
    if (not isinstance(region,(list,tuple)) or len(region)!=4 or
            any(isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) for x in region)):
        raise ValueError('请选择有效矩形区域。')
    x0,y0,x1,y1 = region
    if not 0<=x0<x1<=width or not 0<=y0<y1<=height:
        raise ValueError('选区必须位于原图范围内。')
    return [math.floor(x0),math.floor(y0),math.ceil(x1),math.ceil(y1)]


def map_result(result, factors, origin=(0,0)):
    mapped = deepcopy(result)
    if mapped.get('code') == 100:
        for block in mapped['data']:
            block['box'] = [[p[0]*factors[0]+origin[0],p[1]*factors[1]+origin[1]] for p in block['box']]
    return mapped


def append_candidate(directory, context, result, settings):
    directory = Path(directory)
    directory.mkdir(parents=True,exist_ok=True)
    candidate = {'schema_version':1,'id':uuid.uuid4().hex,
                 'created_at':datetime.now(timezone.utc).isoformat(), 'status':'unreviewed',
                 'context':deepcopy(context),'settings':deepcopy(settings),'result':deepcopy(result)}
    envelope = {'candidate':candidate,'sha256':checksum(candidate)}
    path = directory/('candidate-'+candidate['id']+'.json')
    with path.open('x',encoding='utf-8') as stream:
        json.dump(envelope,stream,ensure_ascii=False,indent=2,allow_nan=False)
        stream.write('\n')
    return candidate, str(path)


def load_candidates(directory, context, limit=50):
    files = sorted(Path(directory).glob('candidate-*.json'),key=lambda p:p.stat().st_mtime_ns,reverse=True)
    selected, corrupt, matched = [], [], 0
    for path in files:
        try:
            envelope = json.loads(path.read_text(encoding='utf-8'))
            candidate = envelope['candidate']
            if envelope['sha256'] != checksum(candidate):
                raise ValueError('摘要不符')
            if candidate['context'] == context:
                matched += 1
                if len(selected) < limit:
                    selected.append(candidate)
        except (OSError,ValueError,KeyError,TypeError) as exc:
            corrupt.append({'file':path.name,'error':str(exc)})
    selected.reverse()
    return {'candidates':selected,'total_matching':matched,'corrupt_files':corrupt,
            'comparison':compare_candidates(selected)}
