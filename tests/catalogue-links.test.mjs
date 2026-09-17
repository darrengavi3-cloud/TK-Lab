import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {fangzhenValidAtYear,projectFangzhenRecords} from '../atlas/assets/app/fangzhen.js';
import {verifyBackup} from '../scripts/restore-catalogue.mjs';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'catalogue-links-'));
await build({stdin:{contents:'export * from "./server/catalogue-service";export * from "./server/publication-service";export * from "./server/reader-links";export * from "./server/backup-service";export * from "./domain/create-record";export * from "./domain/revisions";',resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'service.mjs'),logLevel:'silent'});
const service=await import(pathToFileURL(path.join(temp,'service.mjs')));
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-09-01',d1Databases:['DB'],r2Buckets:['BUCKET']}));
const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('BUCKET'),env={DB:db,BUCKET:bucket};
const migrations=fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort();
async function migrate(file){for(const sql of fs.readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(sql).run();}
for(const file of migrations.slice(0,2))await migrate(file);
// Populate the already-deployed schema before applying the additive migration.
await db.prepare("INSERT INTO catalogue_settings(key,value) VALUES('owner-id','existing-owner')").run();
for(const file of migrations.slice(2))await migrate(file);
test.after(async()=>{await mf.dispose();fs.rmSync(temp,{recursive:true,force:true});});
let sequence=0;
async function save(data){const old=await service.getRevision(db,data.id);return service.saveRecord(db,'test-owner',{requestId:'linked-test:'+ ++sequence,baseRevision:old?.number||0,data,reason:'隔離驗收',reviewedContentDigest:await service.sha256(service.canonicalJson(data))});}
const p={...service.createRecord('person','person:shu:jiang-wei'),name:'姜维',assessment:'verified',visibility:'reader',reason:'隔離驗收'};
const source={...service.createRecord('source','source:linked-test'),title:'驗收原文',text:'維為大將軍。\n  原注保持。',visibility:'reader'};
const office=service.officeReferences.find(o=>o.factionKey==='shu'&&o.name==='大将军');
const target=service.readerLinkOptions().fangzhen.find(r=>r.id==='fz_shu_jiangwei_256');
let appointment={...service.createRecord('appointment','appointment:linked-test'),personId:p.id,officeName:'大将军',polity:'季汉',nature:'實授',jurisdiction:'汉军',assessment:'verified',visibility:'reader',reason:'明載',date:{original:'延熙十九年',startYear:256,endYear:256,precision:'year',certainty:'certain',basis:''},evidence:[{sourceId:source.id,sourceRevision:1,role:'support',note:'對照'}],readerLinks:{offices:[office.id],fangzhen:{recordId:target.id,polityKey:'shu',recordType:'other',administrativeUnitId:null}}};
const payload=async(candidate,name)=>(await bucket.get('releases/'+candidate.id+'/data/'+name+'.json')).json();
test('additive migration preserves owner and one saved fact feeds person, office, state and pinned quotations',async()=>{
  assert.equal((await db.prepare("SELECT value FROM catalogue_settings WHERE key='owner-id'").first()).value,'existing-owner');
  await save(p);await save(source);await save(appointment);
  await bucket.put('baseline/reader.json',JSON.stringify({people:{people:[],summary:{}},relations:{appointments:[],peerageEvents:[]}}));
  const c=await service.makePublication(env,'test-owner');
  const relation=(await payload(c,'v63-reader-person-relations')).appointments[0];
  const officeRow=(await payload(c,'reviewed-office-succession')).offices.find(o=>o.id===office.id).appointments[0];
  const states=(await payload(c,'v69-fangzhen-reader')).records;
  const state=states.find(r=>r.id===target.id);
  assert.equal(states.length,523,'takeover must not append a duplicate');
  assert.deepEqual([relation.appointmentId,officeRow.appointmentId,state.appointmentId],[appointment.id,appointment.id,appointment.id]);
  for(const r of [relation,officeRow,state]){assert.equal(r.startYear,256);assert.equal(r.endYear,256);assert.deepEqual(r.citations,relation.citations);assert.equal(r.citations[0].quote,source.text);}
  assert.equal(fangzhenValidAtYear(state,256),true);
  const profile=(await payload(c,'v69-person-profiles')).profiles.find(r=>r.personId===p.id);
  assert.equal(profile.lifeEvents.filter(e=>e.relatedRecordId===appointment.id).length,1);
  assert.equal(profile.lifeEvents.some(e=>e.eventType==='fangzhen'&&e.relatedRecordId===target.id),false);
  await save({...source,text:'後續校訂'});
  assert.equal((await payload(c,'v63-reader-person-relations')).appointments[0].citations[0].quote,source.text);
});
test('unknown and non-held tenures stay out of snapshots; withdrawing removes every managed view',async()=>{
  appointment={...appointment,polity:'季漢',nature:'未拜',date:{...appointment.date,certainty:'unknown'}};
  await save(appointment);await save({...p,name:'姜維（驗收修訂）'});
  const unknown=await service.makePublication(env,'test-owner');
  const state=(await payload(unknown,'v69-fangzhen-reader')).records.find(r=>r.id===target.id);
  assert.equal(state.commander,'姜維（驗收修訂）');assert.equal(state.startYear,null);assert.equal(fangzhenValidAtYear(state,256),false);
  const displayed=projectFangzhenRecords([{...state,id:'appointment:new-id'}])[0];
  assert.equal(displayed.dynastyLabel,'季汉','explicit archive survives unknown years and a new stable ID');
  assert.equal(state.polity,'汉','reader groups retain canonical labels while original traditional text is preserved');
  assert.equal((await payload(unknown,'reviewed-office-succession')).offices.find(o=>o.id===office.id).appointments[0].startYear,null);
  appointment={...appointment,assessment:'excluded',disposition:'not-held',reason:'未受命，不作實任'};await save(appointment);
  const c=await service.makePublication(env,'test-owner');
  assert.equal((await payload(c,'v63-reader-person-relations')).appointments.length,0);
  assert.equal((await payload(c,'v69-fangzhen-reader')).records.some(r=>r.id===target.id),false);
  const projection=await payload(c,'reviewed-office-succession');
  const context={window:{SGZ_OFFICE_SUCCESSION:projection}};
  vm.runInNewContext(fs.readFileSync('atlas/assets/app/office-succession.js','utf8'),context);
  const node={kind:'office',key:office.nodeKey,name:office.name,figures:['姜维（256—263）',{id:appointment.id,personId:p.id,name:p.name,catalogueManaged:true}]};
  context.window.SGZ_APPLY_OFFICE_SUCCESSION(node,'shu');
  assert.deepEqual(Array.from(node.figures),[],'withdrawn facts cannot resurrect cached legacy figures');
});
test('cross-polity, wrong-person, conflicting state claims and invalid unit links fail without partial facts',async()=>{
  const base={...appointment,id:'appointment:competing-a',assessment:'pending',disposition:'none',reason:'待核',readerLinks:{...appointment.readerLinks,fangzhen:{...appointment.readerLinks.fangzhen,recordId:'fz_shu_jiangwei_258'}}};
  const badPolity={...base,polity:'魏'};
  await assert.rejects(()=>save(badPolity),/政權不相符/);
  await assert.rejects(()=>save({...base,readerLinks:{...base.readerLinks,fangzhen:{...base.readerLinks.fangzhen,recordId:'fz_han_taoqian'}}}),/同一人物/);
  await assert.rejects(()=>save({...base,readerLinks:{...base.readerLinks,fangzhen:{...base.readerLinks.fangzhen,administrativeUnitId:'missing-unit'}}}),/行政單元/);
  const outcome=await Promise.allSettled([save(base),save({...base,id:'appointment:competing-b'})]);
  assert.equal(outcome.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await db.prepare("SELECT count(*) AS n FROM catalogue_reader_links WHERE fangzhen_id='fz_shu_jiangwei_258'").first()).n,1);
  assert.equal((await db.prepare("SELECT count(*) AS n FROM catalogue_records WHERE id IN ('appointment:competing-a','appointment:competing-b')").first()).n,1);
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
});
test('backup v3 includes ownership links and the restore verifier still admits exact v2 backups',async()=>{
  const text=await new Response(await service.backup(env)).text();
  const current=verifyBackup(gzipSync(text));
  assert.equal(current.manifest.format,'guanshitai-backup-3');assert.equal(current.data.catalogue_reader_links.length,2);
  const lines=text.trimEnd().split('\n').map(JSON.parse),oldRows={...current.data};delete oldRows.catalogue_reader_links;
  const older=lines.filter(line=>line.table!=='catalogue_reader_links');
  older[0].format='guanshitai-backup-2';older[0].tables=Object.keys(oldRows);
  const last=older.at(-1);last.rows-=current.data.catalogue_reader_links.length;last.rowsDigest=createHash('sha256').update(JSON.stringify(oldRows)).digest('hex');
  const restored=verifyBackup(gzipSync(older.map(r=>JSON.stringify(r)).join('\n')+'\n'));
  assert.deepEqual(restored.data.catalogue_reader_links,[]);
});
