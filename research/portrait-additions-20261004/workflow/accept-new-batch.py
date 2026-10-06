import hashlib, json, shutil, sys
from pathlib import Path
from PIL import Image

root=Path('/workspace/scratch/ea3fed8f4c52')
work=root/'work/portraits-20261004'
research=root/'research/portrait-additions-20261004'
batch=sys.argv[1]
requested={int(x) for x in sys.argv[2].split(',')}
prompts=json.loads((work/('new-prompts-'+batch+'.json')).read_text())
progress=json.loads((research/'production-progress.json').read_text())
review=json.loads((research/'visual-review-progress.json').read_text())
index=json.loads((research/'checkpoint-images.json').read_text())
checks={key:True for key in ['frontal','strictFrontal','directGaze','shouldersFrontal','ageAppropriate','independentSinglePerson','completeCrown','completeHands','standingComposition','completeFeet','fullBody']}
pending=[]
for r in prompts:
    if r['order'] not in requested:
        continue
    src=work/'new-images'/(r['outputStem']+'.png')
    data=src.read_bytes()
    sha=hashlib.sha256(data).hexdigest()
    with Image.open(src) as im:
        width,height=im.size
        assert im.format=='PNG'
        im.verify()
    assert width>=512 and abs(width/height-9/16)<=.03
    path='atlas/assets/portraits/20261004/'+r['outputStem']+'.png'
    dest=root/path
    dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():
        assert dest.read_bytes()==data, 'Refusing to overwrite accepted asset'
    else:
        shutil.copy2(src,dest)
    previous=next((x for x in progress['new'] if x['personId']==r['personId']),None)
    assert previous is None or previous['order']==r['order']
    row={'order':r['order'],'personId':r['personId'],'name':r['name'],'polity':r['polity'],'path':path,'status':'complete','sha256':sha,'width':width,'height':height,'designAge':r['designAge'],'ageBasis':r['ageBasis'],'productionMethod':'independent-generation','visualReview':checks,'reviewedAt':'2026-10-06','promptRecord':'research/portrait-additions-20261004/generation-prompts-'+batch+'.json','evidenceStatus':'待考'}
    progress['new']=[x for x in progress['new'] if x['personId']!=r['personId']]+[row]
    review['accepted']=[x for x in review['accepted'] if not (x['kind']=='new' and x['personId']==r['personId'])]+[{'kind':'new','order':r['order'],'personId':r['personId'],'sha256':sha,'visualReview':checks,'reviewedAt':'2026-10-06','reviewBasis':'Root visually inspected the original generated PNG, including face, eyes, shoulders, age, headwear, hands and standing composition.'}]
    index[path]=sha
    pending.append({'path':path,'sha256':sha,'bytes':len(data),'base64Length':((len(data)+2)//3)*4,'gitSha':hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()})
progress['new'].sort(key=lambda x:x['order'])
assert len({(x['kind'],x.get('portraitId') if x['kind']=='existing' else x['personId']) for x in review['accepted']})==len(review['accepted'])
status=json.loads((research/'production-status.json').read_text())
status.update({'newProduced':len(progress['new']),'newAccepted':sum(x['kind']=='new' for x in review['accepted'])})
for filename,data in [('production-progress.json',progress),('visual-review-progress.json',review),('checkpoint-images.json',index),('production-status.json',status)]:
    (research/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(work/'pending-new-images.json').write_text(json.dumps(pending,indent=2)+'\n')
print(json.dumps({'status':status,'pending':pending},ensure_ascii=False))
