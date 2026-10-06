import json, hashlib, shutil, sys
from pathlib import Path
root=Path('/workspace/scratch/ea3fed8f4c52')
site=root/'site-recovery'
orders={int(x) for x in sys.argv[1].split(',')}
progress=json.loads((root/'research/portrait-additions-20261004/production-progress.json').read_text())
target=site/'atlas/data/accepted-portrait-additions-20261004.json'
ledger=json.loads(target.read_text())
for row in progress['new']:
    if row['order'] not in orders: continue
    accepted=json.loads((root/'research/portrait-additions-20261004/visual-review-progress.json').read_text())['accepted']
    assert any(v['kind']=='new' and v['personId']==row['personId'] and v['sha256']==row['sha256'] for v in accepted) and row.get('visualReview'), 'Explicit SHA-bound acceptance required'
    src=root/row['path']; dest=site/row['path']
    data=src.read_bytes(); assert hashlib.sha256(data).hexdigest()==row['sha256']
    dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists(): assert dest.read_bytes()==data, 'Refusing to replace an accepted PNG'
    else: shutil.copy2(src,dest)
    entry={**row,'assetPath':'./'+row['path'].removeprefix('atlas/'),'evidenceStatus':'待考','polity':row.get('polity',next(r['polity'] for r in json.loads((root/'work/portraits-20261004/candidates.json').read_text())['records'] if r['order']==row['order']))}
    old=next((r for r in ledger['records'] if r['personId']==row['personId']),None)
    assert old is None or old['sha256']==entry['sha256']
    ledger['records']=[r for r in ledger['records'] if r['personId']!=row['personId']]+[entry]
ledger['records'].sort(key=lambda r:r['order'])
target.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'integratedNew':len(ledger['records']),'orders':sorted(orders)}))
