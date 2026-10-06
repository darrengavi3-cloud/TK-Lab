import json,hashlib,sys
from pathlib import Path
root=Path('/workspace/scratch/ea3fed8f4c52');site=root/'site-recovery';work=root/'work/portraits-20261004'
plan={r['portraitId']:r for r in json.loads((work/'independent-redraw-plan.json').read_text())['records']}
progress=json.loads((root/'research/portrait-additions-20261004/production-progress.json').read_text())
orders={int(x) for x in sys.argv[1].split(',')}
target=site/'atlas/data/accepted-independent-redraws-20261004.json';ledger=json.loads(target.read_text())
for row in progress['existing']:
 if row['order'] not in orders:continue
 assert row['productionMethod']=='independent-redraw' and row['status']=='complete'
 originalSrc=plan[row['portraitId']]['originalSrc'];original=site/'atlas'/originalSrc.removeprefix('./')
 assert hashlib.sha256(original.read_bytes()).hexdigest()==row['originalSha256']
 data=(root/row['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==row['sha256']
 dest=site/row['path'];dest.parent.mkdir(parents=True,exist_ok=True)
 if dest.exists():assert dest.read_bytes()==data,'Refusing to overwrite accepted redraw'
 else:dest.write_bytes(data)
 old=next((r for r in ledger['records'] if r['portraitId']==row['portraitId']),None)
 assert old is None or old['sha256']==row['sha256']
 entry={**row,'originalSrc':originalSrc,'assetPath':'./'+row['path'].removeprefix('atlas/'),'evidenceStatus':'待考'}
 ledger['records']=[r for r in ledger['records'] if r['portraitId']!=row['portraitId']]+[entry]
ledger['records'].sort(key=lambda r:r['order']);target.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'integratedRedraw':len(ledger['records']),'orders':sorted(orders)}))
