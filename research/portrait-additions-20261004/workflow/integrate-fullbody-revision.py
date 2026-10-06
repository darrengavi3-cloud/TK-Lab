import json,hashlib,shutil,sys
from pathlib import Path
ROOT=Path('/workspace/scratch/ea3fed8f4c52');SITE=ROOT/'site-recovery';R=ROOT/'research/portrait-additions-20261004';orders={int(x) for x in sys.argv[1].split(',')}
p=SITE/'atlas/data/accepted-portrait-additions-20261004.json';ledger=json.loads(p.read_text());progress=json.loads((R/'production-progress.json').read_text());plan={r['order']:r for r in json.loads((R/'fullbody-revision-plan.json').read_text())['records']}
for row in progress['new']:
 if row['order'] not in orders:continue
 spec=plan[row['order']];assert row['originalSha256']==spec['referenceImageSha256'];previous=next(r for r in ledger['records'] if r['order']==row['order']);assert previous['personId']==row['personId'] and previous['sha256'] in [row['sha256'],spec['referenceImageSha256']]
 original=SITE/spec['previousPath'];assert hashlib.sha256(original.read_bytes()).hexdigest()==spec['referenceImageSha256'];data=(ROOT/row['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==row['sha256'];dest=SITE/row['path']
 if dest.exists():assert dest.read_bytes()==data
 else:shutil.copy2(ROOT/row['path'],dest)
 ledger['records']=[r for r in ledger['records'] if r['order']!=row['order']]+[{**row,'assetPath':'./'+row['path'].removeprefix('atlas/')}]
ledger['records'].sort(key=lambda r:r['order']);p.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'integratedRevisions':sorted(orders),'count':len(ledger['records'])}))
