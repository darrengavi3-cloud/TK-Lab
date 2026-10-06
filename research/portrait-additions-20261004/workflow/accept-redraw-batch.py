import json,sys,hashlib,shutil
from pathlib import Path
from PIL import Image
root=Path('/workspace/scratch/ea3fed8f4c52');work=root/'work/portraits-20261004';research=root/'research/portrait-additions-20261004'
batch=sys.argv[1];orders={int(x) for x in sys.argv[2].split(',')}
prompts=json.loads((work/f'redraw-prompts-{batch}.json').read_text())
progress=json.loads((research/'production-progress.json').read_text());review=json.loads((research/'visual-review-progress.json').read_text());index=json.loads((research/'checkpoint-images.json').read_text())
flags={key:True for key in ['frontal','strictFrontal','directGaze','shouldersFrontal','ageAppropriate','independentSinglePerson','completeCrown','completeHands','standingComposition','completeFeet','fullBody']}
pending=[]
for r in prompts:
 if r['order'] not in orders:continue
 src=work/'redraw-images'/(r['outputStem']+'.png');data=src.read_bytes();sha=hashlib.sha256(data).hexdigest()
 with Image.open(src) as im:
  width,height=im.size;assert im.format=='PNG';im.verify()
 assert width>=512 and abs(width/height-9/16)<=.03
 path='atlas/assets/portraits/20261004/frontal/'+r['outputStem']+'.png';dest=root/path;dest.parent.mkdir(parents=True,exist_ok=True)
 if dest.exists():assert dest.read_bytes()==data,'Refusing to overwrite accepted redraw'
 else:shutil.copy2(src,dest)
 row={k:r[k] for k in ['order','portraitId','personId','name','originalSrc','originalSha256','designAge','ageBasis']}
 row.update(path=path,status='complete',sha256=sha,width=width,height=height,productionMethod='independent-redraw',visualReview=flags,reviewedAt='2026-10-06',evidenceStatus='待考',promptRecord=f'research/portrait-additions-20261004/redraw-prompts-{batch}.json')
 progress['existing']=[x for x in progress['existing'] if x['portraitId']!=r['portraitId']]+[row]
 review['accepted']=[x for x in review['accepted'] if not (x.get('kind')=='existing' and x.get('portraitId')==r['portraitId'])]+[dict(kind='existing',order=r['order'],portraitId=r['portraitId'],personId=r['personId'],sha256=sha,visualReview=flags,reviewedAt='2026-10-06',reviewBasis='Root inspected original generated PNG face, gaze, shoulders, body, age, crown, hands and feet.')]
 index[path]=sha;pending.append(dict(path=path,sha256=sha,bytes=len(data),base64Length=((len(data)+2)//3)*4,gitSha=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()))
progress['existing'].sort(key=lambda r:r['order'])
status=json.loads((research/'production-status.json').read_text());count=sum(r.get('productionMethod')=='independent-redraw' and r['status']=='complete' for r in progress['existing']);status.update(existingIndependentRedrawProduced=count,existingAccepted=count)
assert len({(r['kind'],r.get('portraitId') if r['kind']=='existing' else r['personId']) for r in review['accepted']})==len(review['accepted'])
for filename,obj in [('production-progress.json',progress),('production-status.json',status),('visual-review-progress.json',review),('checkpoint-images.json',index)]:
 (research/filename).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
(work/'pending-new-images.json').write_text(json.dumps(pending,indent=2)+'\n')
print(json.dumps({'status':status,'pending':pending},ensure_ascii=False))
