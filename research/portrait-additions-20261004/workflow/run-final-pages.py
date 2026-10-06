import concurrent.futures, datetime, hashlib, json, pathlib, shutil, subprocess
ROOT=pathlib.Path('/workspace/scratch/ea3fed8f4c52');SITE=ROOT/'site-recovery';R=ROOT/'research/portrait-additions-20261004'
core=json.loads((R/'integration-final-core-passed-before-report-key-fix.json').read_text())
assert core['sourceTests']==58 and core['builtSuiteTests']==247
assert all(next(s for s in core['steps'] if s['phase']==phase)['exitCode']==0 for phase in ['source','release'])
paths=['atlas/sources.lock.json','release-metadata/canonical-sources.lock.json','release-metadata/reader-bundle.json','atlas/data/accepted-portrait-additions-20261004.json','atlas/data/accepted-independent-redraws-20261004.json','dist/client/legacy/data/portrait-manifest.json']
fingerprint=lambda:{p:hashlib.sha256((SITE/p).read_bytes()).hexdigest() for p in paths}
initial=fingerprint()
state={'status':'running','newIntegrated':100,'independentRedrawIntegrated':150,'sourceTests':58,'builtSuiteTests':247,'steps':[s for s in core['steps'] if s['phase'] in ['source','release']],'coreEvidence':'integration-final-core-passed-before-report-key-fix.json','coreReusedBecause':'Only QA report filename keys changed; source, assets and build inputs stayed frozen.','inputFingerprint':initial,'costumeEvidenceStatus':'待考','startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
proof=R/'integration-final-100-150.json'
def save():proof.write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
def run(label,cmd):
 with (R/('final-'+label+'.log')).open('w') as out:result=subprocess.run(cmd,cwd=SITE,stdout=out,stderr=subprocess.STDOUT)
 step={'phase':label,'command':cmd,'exitCode':result.returncode,'log':'final-'+label+'.log'}
 print(json.dumps({'phase':label,'exitCode':result.returncode}),flush=True);return step
save();jobs=[]
for kind,count in [('new',100),('redraw',150)]:
 for built in [False,True]:
  orders=','.join(map(str,range(1,count+1)));label=kind+('-built-pages' if built else '-source-pages');report=f'portrait-{kind}-batch-1-{count}-all'+('-built' if built else '')+'.json'
  cmd=['node','work/verify-portrait-batch.mjs',orders]+(['redraw'] if kind=='redraw' else [])+(['--built'] if built else [])
  jobs.append((label,cmd,report))
checks=0;reports=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 futures={pool.submit(run,label,cmd):report for label,cmd,report in jobs}
 for future in concurrent.futures.as_completed(futures):
  step=future.result();state['steps'].append(step)
  if not step['exitCode']:
   name=futures[future];report=json.loads((SITE/'work/validation'/name).read_text());assert report['status']=='passed' and all(r['passed'] for r in report['checks']);checks+=len(report['checks']);reports.append(name);shutil.copy2(SITE/'work/validation'/name,R/name)
  save()
assert fingerprint()==initial,'Frozen source or build changed during page QA'
step=run('diff',['git','diff','--check']);state['steps'].append(step)
passed=all(step['exitCode']==0 for step in state['steps']) and checks==1000
state.update(status='passed' if passed else 'failed',portraitViewportChecks=checks,reports=reports,failures=sum(step['exitCode']!=0 for step in state['steps']),inputFingerprintUnchanged=True,completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat());save();shutil.copy2(proof,SITE/'research/portrait-additions-20261004'/proof.name)
print(json.dumps({'status':state['status'],'checks':checks,'failures':state['failures']}),flush=True)
raise SystemExit(0 if passed else 1)
