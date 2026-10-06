import csv, json, hashlib
from pathlib import Path
from PIL import Image
root=Path('/workspace/scratch/ea3fed8f4c52')
research=root/'research/portrait-additions-20261004'
progress=json.loads((research/'production-progress.json').read_text())
reviews={(x['kind'],x['order']):x for x in json.loads((research/'visual-review-progress.json').read_text())['accepted']}
provenance={}
for pattern in ['generation-results-*.json','redraw-results-*.json','fullbody-result-*.json']:
    for file in research.glob(pattern):
        result=json.loads(file.read_text())
        records=result if isinstance(result,list) else [result]
        for record in records:
            sha=record.get('sha256',record.get('SHA256'))
            if sha:
                provenance[(record.get('personId'),sha)]=(str(file.relative_to(root)),record.get('sourcePath',''))
reports={}
for file in research.glob('portrait-*-batch-*.json'):
    report=json.loads(file.read_text())
    for check in report.get('checks',[]):
        if check.get('passed'):
            surface=check.get('testSurface','reader-export')
            reports.setdefault((check['personId'],check['src'],surface),set()).add(check['viewport']['width'])
fields=['kind','order','name','personId','portraitId','file','sha256','hashVerified','width','height','designAge','ageBasis','front','ageAppropriate','fullBody','completeHands','completeFeet','costumeEvidence','desktopVerified','mobileVerified','promptRecord','generationMethod','generationRecord','generationSource','sourceEvidenceNote','legacyPortraitId','desktopBuiltVerified','mobileBuiltVerified']
rows=[]
for kind, records in [('new',progress['new']),('independent-redraw',progress['existing'])]:
    for row in records:
        file=root/row['path']; sha=hashlib.sha256(file.read_bytes()).hexdigest()
        assert sha==row['sha256'],file
        with Image.open(file) as im:
            width,height=im.size; im.verify()
        assert (width,height)==(row['width'],row['height']),file
        review=row.get('visualReview',{})
        bound=reviews[('new' if kind=='new' else 'existing',row['order'])]
        assert bound['personId']==row['personId'] and bound['sha256']==sha,(kind,row['order'],'visual review binding mismatch')
        for flag,value in bound['visualReview'].items():
            assert review.get(flag)==value,(kind,row['order'],'visual review flags mismatch',flag)
        source_record,source_path=provenance.get((row['personId'],sha),('',''))
        source_note='Exact generated source record matched by person ID and SHA-256.' if source_record else ''
        if not source_record:
            assert (kind=='new' and row['order']<=81) or (kind=='independent-redraw' and row['order']<=40),'Missing source evidence for newly generated asset'
            source_record='research/portrait-additions-20261004/git-verification-081-040.json'
            source_note='Existing accepted bytes verified against Git commit 0d1692fa37862aced43bdf54f6bbe26667d06955; original generation call log unavailable. Identity retained from accepted ID record.'
        src='./'+row['path'].removeprefix('atlas/')
        checks=reports.get((row['personId'],src,'reader-export'),set())
        built_checks=reports.get((row['personId'],src,'deployment-build'),set())
        rows.append(dict(kind=kind,order=row['order'],name=row['name'],personId=row['personId'],portraitId=(f"portrait:additional:20261004:{row['order']:03d}" if kind=='new' else row['portraitId']),file=row['path'],sha256=sha,hashVerified=True,width=width,height=height,designAge=row.get('designAge',''),ageBasis=row.get('ageBasis',''),front=review.get('strictFrontal',review.get('frontal','')),ageAppropriate=review.get('ageAppropriate',''),fullBody=review.get('fullBody',''),completeHands=review.get('completeHands',''),completeFeet=review.get('completeFeet',''),costumeEvidence='待考',desktopVerified=1440 in checks,mobileVerified=390 in checks,promptRecord=row.get('promptRecord',''),generationMethod=row.get('productionMethod',''),generationRecord=source_record,generationSource=source_path,sourceEvidenceNote=source_note,legacyPortraitId=(row.get('portraitId','') if kind=='new' else ''),desktopBuiltVerified=1440 in built_checks,mobileBuiltVerified=390 in built_checks))
with (research/'portrait-acceptance-record.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(rows)
print(json.dumps({'records':len(rows),'hashFailures':0,'desktopVerified':sum(r['desktopVerified'] for r in rows),'mobileVerified':sum(r['mobileVerified'] for r in rows),'fullBodyVerified':sum(r['fullBody'] is True for r in rows)}))
