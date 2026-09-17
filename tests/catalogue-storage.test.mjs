import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readLegacyBaseline} from '../importers/legacy-atlas/index.mjs';
import {gzipSync} from 'node:zlib';
import {verifyBackup,restoreSql} from '../scripts/restore-catalogue.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'catalogue-storage-'));
await build({stdin:{contents:'export * from "./server/catalogue-service";export * from "./server/import-service";export * from "./server/publication-service";export * from "./server/backup-service";export * from "./server/bootstrap-service";export * from "./server/authorization";export * from "./domain/revisions";export * from "./domain/create-record";',resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'service.mjs'),logLevel:'silent'});
const service=await import(pathToFileURL(path.join(temp,'service.mjs')));
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-09-01',d1Databases:['DB'],r2Buckets:['BUCKET']}));
const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('BUCKET');
const env={DB:db,BUCKET:bucket,ADMIN_OWNER_ID:'owner-test'};
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(sql).run();
test.after(async()=>{await mf.dispose();fs.rmSync(temp,{recursive:true,force:true});});
const person=service.createRecord('person','person:test');person.name='測試人物';
let current;
test('actual D1 persists immutable revisions and rolls back a stale CAS',async()=>{
  current=await service.saveRecord(db,'owner-test',{requestId:'test:create-person',baseRevision:0,data:person,reason:'新增人物'});
  assert.equal(current.number,1);
  const next={...person,name:'更新姓名'};
  const inputs=[{requestId:'test:save-a',baseRevision:1,data:next,reason:'分頁 A'},{requestId:'test:save-b',baseRevision:1,data:{...next,name:'衝突修改'},reason:'分頁 B'}];
  const results=await Promise.allSettled(inputs.map(i=>service.saveRecord(db,'owner-test',i)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  current=await service.getRevision(db,person.id);
  assert.equal(current.number,2);
  assert.equal((await service.history(db,person.id)).length,2);
  assert.equal((await service.getRevision(db,person.id,1)).data.name,'測試人物');
});
test('idempotent save retry does not append another revision and rejects another payload',async()=>{
  const input={requestId:'test:retry-save',baseRevision:current.number,data:{...current.data,name:'冪等保存'},reason:'重試'};
  const a=await service.saveRecord(db,'owner-test',input),b=await service.saveRecord(db,'owner-test',input);
  assert.equal(a.number,b.number);
  await assert.rejects(()=>service.saveRecord(db,'owner-test',{...input,data:{...input.data,name:'不同內容'}}),e=>e.status===409);
});
test('owner and mutation guards reject unsigned, non-owner, cross-origin and action requests',async()=>{
  await assert.rejects(()=>service.owner(new Request('https://test/admin'),env),e=>e.status===401);
  await assert.rejects(()=>service.owner(new Request('https://test/admin',{headers:{'oai-authenticated-user-id':'other'}}),env),e=>e.status===403);
  assert.equal(await service.owner(new Request('https://test/admin',{headers:{'oai-authenticated-user-id':'owner-test'}}),env),'owner-test');
  assert.throws(()=>service.mutationGuard(new Request('https://test/api/admin/records',{method:'POST',headers:{origin:'https://evil.test','x-catalogue-request':'1'}})),e=>e.status===403);
  assert.throws(()=>service.mutationGuard(new Request('https://test/api/admin/records',{method:'POST',headers:{origin:'https://test','x-catalogue-request':'1','next-action':'x'}})),e=>e.status===405);
});
test('original file is retained and staged imports stay invisible until one complete commit',async()=>{
  const bytes=new TextEncoder().encode('姓名,備註\n甲,原注\n乙,異文\n');
  const object=await service.upload(env,bytes,'people.csv','text/csv');
  assert.equal(await (await bucket.get('originals/'+object.hash)).text(),new TextDecoder().decode(bytes));
  const mapping={kind:'person',columns:{name:'姓名'},allowUnmapped:false};
  await assert.rejects(()=>service.createImport(env,object.hash,mapping),/未對應/);
  mapping.allowUnmapped=true;
  const job=await service.createImport(env,object.hash,mapping);
  const same=await service.createImport(env,object.hash,mapping);assert.equal(job.id,same.id);
  assert.equal((await service.listRecords(db,'person','甲',1)).total,0);
  await service.stageImport(env,job.id);
  assert.equal((await service.listRecords(db,'person','甲',1)).total,0);
  await service.commitStaged(db,job.id,'owner-test','确认整批');
  const seq=await service.commitStaged(db,job.id,'owner-test','重試');
  assert.ok(seq);
  assert.equal((await service.listRecords(db,'person','甲',1)).total,1);
});
test('fixed publication uses cited source revision, switches atomically, and rollback retains drafts',async()=>{
  const p={...person,id:'person:publish',name:'發布人物',assessment:'verified',visibility:'reader',reason:'核對'};
  await service.saveRecord(db,'owner-test',{requestId:'test:publish-person',baseRevision:0,data:p,reason:'核定人物',reviewedContentDigest:await service.sha256(service.canonicalJson(p))});
  const s={...service.createRecord('source','source:publish'),title:'原典',text:'原文\\n  異體',visibility:'reader'};
  await service.saveRecord(db,'owner-test',{requestId:'test:create-source',baseRevision:0,data:s,reason:'錄入原文'});
  const a={...service.createRecord('appointment','appointment:publish'),personId:p.id,officeName:'太守',assessment:'verified',visibility:'reader',reason:'原文明載',evidence:[{sourceId:s.id,sourceRevision:1,role:'support',note:''}]};
  await service.saveRecord(db,'owner-test',{requestId:'test:create-appointment',baseRevision:0,data:a,reason:'核定任官',reviewedContentDigest:await service.sha256(service.canonicalJson(a))});
  await bucket.put('baseline/reader.json',JSON.stringify({people:{people:[],summary:{}},relations:{appointments:[],peerageEvents:[]}}));
  await db.prepare("INSERT INTO catalogue_settings(key,value) VALUES('baseline-ready','test-fixture')").run();
  const first=await service.makePublication(env,'owner-test');
  const original=await (await bucket.get('releases/'+first.id+'/data/v63-reader-person-relations.json')).json();
  assert.equal(original.appointments[0].citations[0].quote,s.text);
  await service.saveRecord(db,'owner-test',{requestId:'test:revise-source',baseRevision:1,data:{...s,text:'原文第二版'},reason:'校訂原文'});
  assert.equal((await (await bucket.get('releases/'+first.id+'/data/v63-reader-person-relations.json')).json()).appointments[0].citations[0].quote,s.text);
  await assert.rejects(()=>service.publishData(env,'owner-test',{id:first.id,digest:'wrong',requestId:'test:wrong-publish',previousId:null}),e=>e.status===409);
  const receipt=await service.publishData(env,'owner-test',{id:first.id,digest:first.digest,requestId:'test:publish-data',previousId:null});
  assert.equal(receipt.kind,'data-publication');
  const second=await service.makePublication(env,'owner-test');
  await service.publishData(env,'owner-test',{id:second.id,digest:second.digest,requestId:'test:publish-second',previousId:first.id});
  await service.publishData(env,'owner-test',{id:first.id,digest:first.digest,requestId:'test:rollback-data',previousId:second.id});
  assert.equal((await service.getRevision(db,s.id)).number,2);
});
test('real baseline records pass domain and relational import validation',async()=>{
  const baseline=readLegacyBaseline();
  // Validate all historical links without publishing or mutating the running Site.
  await service.validateBatch(db,baseline.records.map(data=>({data,baseVersion:0})));
  assert.equal(baseline.records.length,4336);
});
test('backup restores D1 history, originals and published snapshots into an empty database',async()=>{
  const raw=await new Response(await service.backup(env)).text(),archive=gzipSync(raw);
  const restored=verifyBackup(archive);
  assert.throws(()=>verifyBackup(gzipSync(raw.slice(0,raw.lastIndexOf('{"type":"complete"')))),/完整/);
  const second=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-09-01',d1Databases:['DB'],r2Buckets:['BUCKET']}));
  try{
    const target=await second.getD1Database('DB'),targetBucket=await second.getR2Bucket('BUCKET');
    for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await target.prepare(sql).run();
    await target.batch(restoreSql(restored).map(sql=>target.prepare(sql)));
    for(const [key,object] of restored.objects)await targetBucket.put(key,object.content);
    assert.deepEqual((await target.prepare('PRAGMA foreign_key_check').all()).results,[]);
    assert.deepEqual(await service.history(target,person.id),await service.history(db,person.id));
    const original=await service.makePublication(env,'owner-test'),recovered=await service.makePublication({DB:target,BUCKET:targetBucket},'owner-test');
    assert.equal(original.digest,recovered.digest);
    const active=(await target.prepare("SELECT value FROM catalogue_settings WHERE key='active-release'").first()).value;
    await service.verifyRelease({DB:target,BUCKET:targetBucket},active);
  }finally{await second.dispose();}
});


test('complete baseline bootstrap commits 4336 records once and reproduces all reader facts',async()=>{
  const local=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-09-01',d1Databases:['DB'],r2Buckets:['BUCKET']}));
  try{
    const localDb=await local.getD1Database('DB'),localBucket=await local.getR2Bucket('BUCKET'),localEnv={DB:localDb,BUCKET:localBucket};
    for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await localDb.prepare(sql).run();
    const job=await service.bootstrap(localEnv);
    let staged;do{staged=await service.stageImport(localEnv,job.id);}while(staged.state==='staging');
    assert.equal((await localDb.prepare('SELECT count(*) AS n FROM catalogue_records').first()).n,0);
    await service.commitImport(localEnv,job.id,'owner-fixture','完整遷移');
    assert.equal((await localDb.prepare('SELECT count(*) AS n FROM catalogue_records').first()).n,4336);
    assert.deepEqual((await localDb.prepare('PRAGMA foreign_key_check').all()).results,[]);
    assert.equal((await service.bootstrap(localEnv)).id,job.id);
    const candidate=await service.makePublication(localEnv,'owner-fixture'),baseline=readLegacyBaseline();
    assert.deepEqual(await (await localBucket.get('releases/'+candidate.id+'/data/v63-reader-people.json')).json(),baseline.readerBaseline.people);
    assert.deepEqual(await (await localBucket.get('releases/'+candidate.id+'/data/v63-reader-person-relations.json')).json(),baseline.readerBaseline.relations);
    const complete=verifyBackup(gzipSync(await new Response(await service.backup(localEnv)).text()));
    assert.equal(complete.data.catalogue_records.length,4336);
    assert.equal(complete.data.catalogue_revisions.length,4336);
  }finally{await local.dispose();}
});
