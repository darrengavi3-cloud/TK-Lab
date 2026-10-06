import csv, json, hashlib
from pathlib import Path
from PIL import Image
root=Path('/workspace/scratch/ea3fed8f4c52')
research=root/'research/portrait-additions-20261004'
progress=json.loads((research/'production-progress.json').read_text())
reports={}
for file in research.glob('portrait-*-batch-*.json'):
    report=json.loads(file.read_text())
    for check in report.get('checks',[]):
        if check.get('passed'):
            reports.setdefault((check['personId'],check['src']),set()).add(check['viewport']['width'])
fields=['kind','order','name','personId','portraitId','file','sha256','hashVerified','width','height','designAge','ageBasis','front','ageAppropriate','fullBody','completeHands','completeFeet','costumeEvidence','desktopVerified','mobileVerified','promptRecord']
rows=[]
for kind, records in [('new',progress['new']),('independent-redraw',progress['existing'])]:
    for row in records:
        file=root/row['path']; sha=hashlib.sha256(file.read_bytes()).hexdigest()
        assert sha==row['sha256'],file
        with Image.open(file) as im:
            width,height=im.size; im.verify()
        assert (width,height)==(row['width'],row['height']),file
        review=row.get('visualReview',{})
        src='./'+row['path'].removeprefix('atlas/')
        checks=reports.get((row['personId'],src),set())
        rows.append(dict(kind=kind,order=row['order'],name=row['name'],personId=row['personId'],portraitId=row.get('portraitId',f"portrait:additional:20261004:{row['order']:03d}"),file=row['path'],sha256=sha,hashVerified=True,width=width,height=height,designAge=row.get('designAge',''),ageBasis=row.get('ageBasis',''),front=review.get('strictFrontal',review.get('frontal','')),ageAppropriate=review.get('ageAppropriate',''),fullBody=review.get('fullBody',''),completeHands=review.get('completeHands',''),completeFeet=review.get('completeFeet',''),costumeEvidence='待考',desktopVerified=1440 in checks,mobileVerified=390 in checks,promptRecord=row.get('promptRecord','')))
with (research/'portrait-acceptance-record.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(rows)
print(json.dumps({'records':len(rows),'hashFailures':0,'desktopVerified':sum(r['desktopVerified'] for r in rows),'mobileVerified':sum(r['mobileVerified'] for r in rows),'fullBodyVerified':sum(r['fullBody'] is True for r in rows)}))
