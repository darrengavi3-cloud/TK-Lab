import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

const temp = await fs.mkdtemp(path.join(os.tmpdir(),'catalogue-core-'));
const output = path.join(temp,'core.mjs');
await build({
  stdin:{contents:'export * from "./domain/catalogue"; export * from "./domain/revisions"; export * from "./domain/publication";',resolveDir:process.cwd(),loader:'ts'},
  bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',
});
const c = await import(pathToFileURL(output));
test.after(()=>fs.rm(temp,{recursive:true,force:true}));
const common = id => ({id,assessment:'pending',workflow:'draft',visibility:'reader',disposition:'none',reason:'',evidence:[]});
const person = (id='person:test:a',name='同名') => ({...common(id),kind:'person',name,aliases:['同名'],aliasPublication:'private',legacyIds:[]});
const source = (text='原文\n  原注　異體𬱟') => ({...common('source:test:a'),kind:'source',title:'底本',edition:'某本',locator:'卷一',text,textScope:'excerpt',url:'https://example.org/source'});
const appointment = () => ({...common('appointment:test:a'),kind:'appointment',personId:'person:test:a',officeId:null,officeName:'太守',nature:'授而未拜',polity:'魏',jurisdiction:'',date:{original:'年未詳',startYear:null,endYear:null,precision:'unknown',certainty:'unknown',basis:''},duplicateOf:null});
const context = commit => ({commit,actor:'owner',at:'2026-09-17T00:00:00Z',reason:'核對底本'});
const revision = async(data,baseRevision=0,previous=null,commit=1) => c.prepareRevision(previous,{baseRevision,data,reviewedContentDigest:await c.sha256(c.canonicalJson(data))},context(commit));

test('candidate visibility, workflow and factual verification remain independent',()=>{
  const row=appointment();
  assert.equal(c.isReaderCandidate(row),true);
  assert.equal(c.isVerifiedFact(row),false);
  row.workflow='ready';
  assert.equal(c.isVerifiedFact(row),false);
  row.assessment='excluded';row.disposition='not-held';row.reason='未拜';
  assert.equal(c.isReaderCandidate(row),false);
});
test('unknown endpoints and inferred years never make certain tenure claims',()=>{
  const row=appointment();
  row.assessment='verified';row.reason='逐項核對';row.evidence=[{sourceId:'source:test:a',sourceRevision:1,role:'support',note:''}];
  assert.equal(c.holdsOfficeInYear(row,200),false);
  row.date={...row.date,startYear:199,endYear:201,precision:'range',certainty:'inferred',basis:'待考'};
  assert.equal(c.holdsOfficeInYear(row,200),false);
  row.date.certainty='certain';
  assert.equal(c.holdsOfficeInYear(row,200),false,'授而未拜 is not actual tenure');
  row.nature='實任';
  assert.equal(c.holdsOfficeInYear(row,200),true);
  assert.equal(c.holdsOfficeInYear(row,202),false);
  row.date.endYear=198;
  assert.throws(()=>c.validateRecord(row),/起年/);
});
test('same-name people remain distinct; identity cycles and alias collisions fail',()=>{
  const a=person(),b=person('person:test:b');
  assert.equal(c.resolvePersonId(a.id,new Map()),a.id);
  assert.equal(c.resolvePersonId(b.id,new Map()),b.id);
  assert.throws(()=>c.resolvePersonId(a.id,new Map([[a.id,b.id],[b.id,a.id]])),/循環/);
  a.legacyIds=[b.id];
  assert.throws(()=>c.validateLinks([a,b],new Set()),/另一活動記錄/);
});
test('evidence binds an immutable source version and rejects a dangling or duplicate link',()=>{
  const row=appointment();row.evidence=[{sourceId:'source:test:a',sourceRevision:1,role:'support',note:''}];
  c.validateLinks([person(),row,source()],new Set(['source:test:a@1']));
  assert.throws(()=>c.validateLinks([person(),row,source()],new Set(['source:test:a@2'])),/修訂不存在/);
  row.evidence.push({...row.evidence[0]});
  assert.throws(()=>c.validateRecord(row),/重複引用/);
});
test('duplicate corroboration retains evidence but is neither false nor counted twice',()=>{
  const primary=appointment(),duplicate={...appointment(),id:'appointment:test:b',assessment:'excluded',disposition:'duplicate',reason:'同一事實互證',duplicateOf:primary.id,evidence:[{sourceId:'source:test:a',sourceRevision:1,role:'support',note:''}]};
  c.validateLinks([person(),source(),primary,duplicate],new Set(['source:test:a@1']));
  assert.equal(c.isReaderCandidate(duplicate),false);
  duplicate.personId='person:test:b';
  assert.throws(()=>c.validateLinks([person(),person('person:test:b'),source(),primary,duplicate],new Set(['source:test:a@1'])),/同一人物/);
});
test('revision conflict preserves original history and caller input is detached',async()=>{
  const data=person(),first=await revision(data);
  data.name='後改';
  assert.equal(first.data.name,'同名');
  await assert.rejects(()=>c.prepareRevision(first,{baseRevision:0,data:first.data},context(2)),e=>e.code==='conflict');
  const second=await revision({...first.data,name:'新名'},1,first,2);
  assert.equal(first.data.name,'同名');assert.equal(second.number,2);
  assert.equal(c.fixedSnapshot([second,first],1)[0].data.name,'同名');
  assert.equal(c.fixedSnapshot([first,second],2)[0].data.name,'新名');
});
test('editing a verified assertion requires review of the exact new bytes',async()=>{
  const data={...person(),assessment:'verified',reason:'核定身份'};
  await assert.rejects(()=>c.prepareRevision(null,{baseRevision:0,data},context(1)),e=>e.code==='review-required');
  const first=await revision(data);
  await assert.rejects(()=>c.prepareRevision(first,{baseRevision:1,data:{...data,name:'另一人'},reviewedContentDigest:first.digest},context(2)),e=>e.code==='review-required');
});
test('import identity is stable across mapping key order but changes with file, mapping or importer',async()=>{
  const hash='a'.repeat(64);
  const a=await c.importIdentity(hash,'csv-1',{name:'姓名',id:'ID'});
  assert.equal(a,await c.importIdentity(hash,'csv-1',{id:'ID',name:'姓名'}));
  assert.notEqual(a,await c.importIdentity(hash,'csv-2',{id:'ID',name:'姓名'}));
  assert.notEqual(a,await c.importIdentity(hash,'csv-1',{id:'id',name:'姓名'}));
  assert.notEqual(a,await c.importIdentity('b'.repeat(64),'csv-1',{id:'ID',name:'姓名'}));
});
test('reader whitelist excludes working notes; source quotes retain exact whitespace',()=>{
  const raw={...person(),reason:'private reason',externalSearchLog:'PRIVATE',workbookRow:5};
  const row=appointment();row.evidence=[{sourceId:'source:test:a',sourceRevision:1,role:'support',note:'讀者注'}];
  const original=source();
  const projected=c.projectReader([raw,row,original],new Map([[original.id+'@1',original]]),{includeCandidates:true});
  assert.equal(projected.appointments[0].citations[0].quote,original.text);
  assert.equal(JSON.stringify(projected).includes('PRIVATE'),false);
  assert.equal(JSON.stringify(projected).includes('private reason'),false);
  assert.equal(c.projectReader([raw,row,original],new Map([[original.id+'@1',original]]),{includeCandidates:false}).appointments.length,0);
  original.visibility='private';
  assert.throws(()=>c.projectReader([raw,row,original],new Map([[original.id+'@1',original]]),{includeCandidates:true}),/未允許讀者/);
});
test('a fixed candidate ignores later edits; changed artifacts invalidate approval; success needs matching receipt',async()=>{
  const first=await revision(person()),second=await revision({...person(),name:'新名'},1,first,2);
  const candidate=await c.makeCandidate([first,second],1,'1'.repeat(40),'2'.repeat(64),{people:['同名']});
  const same=await c.makeCandidate([first],1,'1'.repeat(40),'2'.repeat(64),{people:['同名']});
  assert.equal(candidate.digest,same.digest);
  const changed=await c.makeCandidate([first,second],2,'1'.repeat(40),'2'.repeat(64),{people:['新名']});
  assert.notEqual(candidate.digest,changed.digest);
  const approval=c.approve(candidate,candidate.digest,'owner','2026-09-17T01:00:00Z');
  assert.throws(()=>c.approve(changed,candidate.digest,'owner','2026-09-17T01:00:00Z'),/精確發布候選/);
  const receipt={state:'succeeded',candidateId:candidate.id,candidateDigest:candidate.digest,codeCommit:candidate.codeCommit,archiveDigest:'3'.repeat(64),versionId:'fixture-version',versionNumber:1,deploymentId:'fixture-deployment',completedAt:'2026-09-17T01:01:00Z'};
  assert.equal(c.acceptReceipt(candidate,approval,receipt).deploymentId,'fixture-deployment');
  assert.throws(()=>c.acceptReceipt(candidate,approval,{...receipt,state:'building'}),/成功部署回執/);
  assert.throws(()=>c.acceptReceipt(changed,approval,receipt),/成功部署回執/);
  await assert.rejects(()=>c.makeCandidate([{...first,data:{...first.data,name:'篡改'}}],1,'1'.repeat(40),'2'.repeat(64),{}),/摘要不符/);
});
test('canonical hashing rejects lossy or non-JSON values',()=>{
  for(const value of [undefined,NaN,Infinity,new Date(),[undefined],new Array(2)]) assert.throws(()=>c.canonicalJson(value));
  assert.equal(c.canonicalJson({b:1,a:'原文'}),c.canonicalJson({a:'原文',b:1}));
});

test('a pending alias never inherits the verified name decision',()=>{
  const row={...person(),assessment:'verified'};
  assert.deepEqual(c.projectReader([row],new Map(),{includeCandidates:false}).people[0].aliases,[]);
  row.aliasPublication='verified';
  assert.deepEqual(c.projectReader([row],new Map(),{includeCandidates:false}).people[0].aliases,['同名']);
});
test('reader projection merges duplicate evidence without adding a second appointment',()=>{
  const main=appointment(),src=source();
  const duplicate={...appointment(),id:'appointment:test:b',assessment:'excluded',disposition:'duplicate',duplicateOf:main.id,reason:'互證',evidence:[{sourceId:src.id,sourceRevision:1,role:'support',note:''}]};
  const projection=c.projectReader([person(),main,duplicate,src],new Map([[src.id+'@1',src]]),{includeCandidates:true});
  assert.equal(projection.appointments.length,1);
  assert.equal(projection.appointments[0].citations[0].quote,src.text);
});
test('candidate manifest includes the older source revision actually cited',async()=>{
  const p=await revision(person(),0,null,1);
  const s1=await revision(source('原文第一版'),0,null,2);
  const s2=await revision(source('修訂第二版'),1,s1,3);
  const row=appointment();row.evidence=[{sourceId:s1.id,sourceRevision:1,role:'support',note:''}];
  const a=await revision(row,0,null,4);
  const candidate=await c.makeCandidate([p,s1,s2,a],4,'1'.repeat(40),'2'.repeat(64),{});
  assert.deepEqual(candidate.evidenceRevisions,[{id:s1.id,revision:1,digest:s1.digest}]);
  await assert.rejects(()=>c.makeCandidate([p,s2,a],4,'1'.repeat(40),'2'.repeat(64),{}),/固定史料修訂/);
});
