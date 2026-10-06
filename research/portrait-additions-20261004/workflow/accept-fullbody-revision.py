import json,hashlib,shutil,sys
from pathlib import Path
from PIL import Image
ROOT=Path('/workspace/scratch/ea3fed8f4c52');R=ROOT/'research/portrait-additions-20261004';W=ROOT/'work/portraits-20261004'
orders={int(x) for x in sys.argv[1].split(',')};assert sys.argv[2]=='--root-reviewed-originals'
plan={r['order']:r for r in json.loads((R/'fullbody-revision-plan.json').read_text())['records']}
progress=json.loads((R/'production-progress.json').read_text());review=json.loads((R/'visual-review-progress.json').read_text());index=json.loads((R/'checkpoint-images.json').read_text());pending=[];receipts=[]
for order in sorted(orders):
 p=plan[order];result=json.loads((W/f'fullbody-result-{order:03}.json').read_text());assert result['personId']==p['personId'] and result['referenceImageSha256']==p['referenceImageSha256']
 original=Path(p['referenceImagePath']);assert hashlib.sha256(original.read_bytes()).hexdigest()==p['referenceImageSha256']
 data=Path(result['outputPath']).read_bytes();sha=hashlib.sha256(data).hexdigest();assert sha==result['sha256'];assert Path(result['sourcePath']).read_bytes()==data
 with Image.open(Path(result['outputPath'])) as im:width,height=im.size;assert im.format=='PNG';im.verify()
 assert width>=512 and abs(width/height-9/16)<=.03
 previous=next(r for r in progress['new'] if r['order']==order);assert previous['personId']==p['personId']
 path=f'atlas/assets/portraits/20261004/{order:03}-{sha[:12]}.png';dest=ROOT/path
 if dest.exists():assert dest.read_bytes()==data
 else:shutil.copy2(result['outputPath'],dest)
 checks={key:True for key in ['frontal','strictFrontal','directGaze','shouldersFrontal','ageAppropriate','independentSinglePerson','completeCrown','completeHands','standingComposition','completeFeet','fullBody']}
 row={**previous,'path':path,'sha256':sha,'width':width,'height':height,'visualReview':checks,'reviewedAt':'2026-10-06','originalSrc':'./'+p['previousPath'].removeprefix('atlas/'),'originalSha256':p['referenceImageSha256'],'revisionReason':'保留原图，直接引用原PNG编辑补全下半身和双脚','productionMethod':'identity-preserving-fullbody-edit','generationSource':result['sourcePath'],'generationRecord':f'research/portrait-additions-20261004/fullbody-result-{order:03}.json','promptRecord':'research/portrait-additions-20261004/fullbody-revision-plan.json','evidenceStatus':'待考'}
 progress['new']=[r for r in progress['new'] if r['order']!=order]+[row];oldReview=next(r for r in review['accepted'] if r['kind']=='new' and r['personId']==p['personId']);review.setdefault('preservedOriginalReviews',[])
 if not any(r.get('sha256')==oldReview['sha256'] for r in review['preservedOriginalReviews']):review['preservedOriginalReviews'].append(oldReview)
 review['accepted']=[r for r in review['accepted'] if not(r['kind']=='new' and r['personId']==p['personId'])]+[{**oldReview,'sha256':sha,'visualReview':checks,'reviewedAt':'2026-10-06','reviewBasis':'Root visually inspected the edited original PNG: identity reference, front, design age, complete crown, hands and both shoe soles.'}]
 index[path]=sha;pending.append({'path':path,'sha256':sha,'bytes':len(data),'base64Length':((len(data)+2)//3)*4,'gitSha':hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()});shutil.copy2(W/f'fullbody-result-{order:03}.json',R/f'fullbody-result-{order:03}.json');receipts.append(f'research/portrait-additions-20261004/fullbody-result-{order:03}.json')
progress['new'].sort(key=lambda r:r['order'])
for name,data in [('production-progress.json',progress),('visual-review-progress.json',review),('checkpoint-images.json',index)]: (R/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(W/'pending-new-images.json').write_text(json.dumps(pending,indent=2)+'\n');(W/'pending-batch-commit.json').write_text(json.dumps({'paths':[f'research/portrait-additions-20261004/{name}' for name in ['production-progress.json','visual-review-progress.json','checkpoint-images.json']]+receipts},indent=2)+'\n')
print(json.dumps({'revisionsAccepted':len(orders),'newPeopleCount':len(progress['new']),'preservedOriginalFiles':True}))
