import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadResearchModules} from './helpers/research-ui-loader.mjs';
import {sqliteDatabase} from './helpers/research-sqlite.mjs';
import {verifyBackup,restoreSql} from '../scripts/restore-catalogue.mjs';

const overrides={
  'server/catalogue-service.ts':`export const watermark=db=>db.repo.watermark(),snapshot=(db,seq)=>db.repo.snapshot(seq),getRevision=(db,id,n)=>db.repo.getRevision(id,n);export const domainErrorStatus=e=>e.status??422;export const listRecords=()=>{throw Error('unused')},history=listRecords,saveRecord=listRecords;`,
  'server/bootstrap-service.ts':'export const bootstrap=()=>{throw Error("unused")};',
  'server/import-service.ts':'const unused=()=>{throw Error("unused")};export const upload=unused,inspectFile=unused,createImport=unused,importDetail=unused,stageImport=unused,commitImport=unused;',
  'server/publication-service.ts':'const unused=()=>{throw Error("Unexpected publication")};export const makePublication=unused,publishData=unused;',
  'server/reader-links.ts':'export const readerLinkOptions=()=>[];',
  'admin/index.html?raw':'export default "<nav></nav>";',
  'admin/research.html?raw':'export default "research";',
  'server/generated/reader.html?raw':'export default "reader";',
};
const loaded = await loadResearchModules(['server/research-journal.ts','server/research-preview.ts','server/backup-service.ts','domain/revisions.ts','server/admin-router.ts'],overrides);
after(loaded.cleanup);
const [journal,preview,{backup},{canonicalJson}] = loaded.modules;
const {catalogueRouter}=loaded.modules[4];
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const bucket={async get(){throw new Error('Unexpected R2 object');}};
const header={assessment:'pending',workflow:'draft',visibility:'private',disposition:'none',reason:'',evidence:[]};
async function fixture(options) {
  const db=sqliteDatabase(options);
  const data=[
    {...header,kind:'person',id:'person:test',name:'測試人物',aliases:[],aliasPublication:'private',legacyIds:[]},
    {...header,kind:'source',id:'source:test',title:'合成測試材料',edition:'測試本',locator:'一',text:'  拜測試官。\n',textScope:'excerpt',url:''},
    {...header,kind:'appointment',id:'appointment:test',personId:'person:test',officeId:null,officeName:'測試官',nature:'實授',polity:'測試政權',jurisdiction:'',duplicateOf:null,date:{original:'某年',startYear:null,endYear:null,precision:'unknown',certainty:'unknown',basis:''},evidence:[{sourceId:'source:test',sourceRevision:1,role:'support',note:''}]},
  ];
  const rows=data.map((data,i)=>({id:data.id,number:1,commit:i+1,data,digest:hash(data),actor:'owner',reason:'測試',at:'2026-09-19T00:00:00Z'}));
  for(const row of rows) {
    db.sql.prepare('INSERT INTO catalogue_commits(seq,request_id,request_hash,actor,reason,at,guard) VALUES(?,?,?,?,?,?,1)').run(row.commit,'seed-'+row.commit,row.digest,row.actor,row.reason,row.at);
    db.sql.prepare('INSERT INTO catalogue_records(id,kind,version,commit_seq,name,assessment,visibility) VALUES(?,?,?,?,?,?,?)').run(row.id,row.data.kind,1,row.commit,row.data.name??row.data.title??row.data.officeName,'pending','private');
    db.sql.prepare('INSERT INTO catalogue_revisions(id,version,commit_seq,payload,digest) VALUES(?,?,?,?,?)').run(row.id,1,row.commit,canonicalJson(row.data),row.digest);
    if(row.data.kind==='person')db.sql.prepare('INSERT INTO catalogue_people(id,aliases,alias_publication) VALUES(?,?,?)').run(row.id,'[]','private');
    if(row.data.kind==='source')db.sql.prepare('INSERT INTO catalogue_sources(id,edition,locator,scope) VALUES(?,?,?,?)').run(row.id,'測試本','一','excerpt');
    if(row.data.kind==='appointment')db.sql.prepare('INSERT INTO catalogue_appointments(id,person_id,office_id,office_name,nature,start_year,end_year,date_text,duplicate_of) VALUES(?,?,NULL,?,?,NULL,NULL,?,NULL)').run(row.id,'person:test','測試官','實授','某年');
  }
  db.sql.prepare('INSERT INTO catalogue_settings(key,value) VALUES(?,?)').run('owner-id','owner');
  const repo={async watermark(){return 3;},async snapshot(){return structuredClone(rows);},async getRevision(id,number){return structuredClone(rows.find(r=>r.id===id&&r.number===number)??null);}};
  const original=await preview.previewPersonResearch(repo,'person:test',3);
  const input={requestId:'request:fixture:1',baseRevision:0,watermark:3,graph:original.graph,inspectedGraphDigest:original.manifest.graphDigest,reason:'保存研究草稿'};
  return {db,repo,input,rows};
}
const count=(db,table)=>db.sql.prepare('SELECT count(*) n FROM '+table).get().n;
async function withFixture(t,options){const f=await fixture(options);t.after(()=>f.db.close());return f;}

test('saves a complete private revision and fixed relational indexes, not reader facts',async t=>{
  const f=await withFixture(t),result=await journal.saveResearch(f.db,f.repo,'owner',f.input);
  assert.equal(result.persisted,true);assert.equal(result.published,false);assert.equal(result.revision.number,1);
  assert.equal(count(f.db,'catalogue_research_members'),3);assert.equal(count(f.db,'catalogue_research_pins'),3);
  assert.equal(count(f.db,'catalogue_commits'),3);assert.equal(count(f.db,'catalogue_publication_events'),0);
  assert.equal(f.db.sql.prepare("SELECT value FROM catalogue_settings WHERE key='owner-id'").get().value,'owner');
  assert.deepEqual((await journal.getResearchRevision(f.db,'person:test',1)).graph,f.input.graph);
});
test('idempotent retries return original version even after a later save',async t=>{
  const f=await withFixture(t);await journal.saveResearch(f.db,f.repo,'owner',f.input);
  await journal.saveResearch(f.db,f.repo,'owner',{...f.input,requestId:'request:fixture:2',baseRevision:1,reason:'第二次修訂'});
  const retry=await journal.saveResearch(f.db,f.repo,'owner',f.input);
  assert.equal(retry.replayed,true);assert.equal(retry.revision.number,1);assert.equal(count(f.db,'catalogue_research_revisions'),2);
});
for(const change of [{reason:'另一內容'},{actor:'other'}])test('request ID cannot be reused '+JSON.stringify(change),async t=>{
  const f=await withFixture(t);await journal.saveResearch(f.db,f.repo,'owner',f.input);
  await assert.rejects(journal.saveResearch(f.db,f.repo,change.actor??'owner',{...f.input,...(change.reason?{reason:change.reason}:{})}),e=>e.status===409);
});
test('transaction CAS rejects a concurrent stale save without partial indexes',async t=>{
  const f=await withFixture(t);
  f.db.beforeBatch=()=>journal.saveResearch(f.db,f.repo,'owner',{...f.input,requestId:'request:concurrent:2'});
  await assert.rejects(journal.saveResearch(f.db,f.repo,'owner',f.input),e=>e.status===409);
  assert.equal(count(f.db,'catalogue_research_revisions'),1);assert.equal(count(f.db,'catalogue_research_members'),3);
});
test('a failure in the last INSERT rolls back the revision and every member',async t=>{
  const f=await withFixture(t);
  f.db.sql.exec("CREATE TRIGGER fail_pin BEFORE INSERT ON catalogue_research_pins BEGIN SELECT RAISE(ABORT,'injected failure'); END;");
  await assert.rejects(journal.saveResearch(f.db,f.repo,'owner',f.input),/injected failure/);
  for(const table of journal.JOURNAL_TABLES)assert.equal(count(f.db,table),0);
});
test('pins are rechecked inside the transaction, not only in the preflight',async t=>{
  const f=await withFixture(t);f.db.beforeBatch=()=>f.db.sql.prepare("UPDATE catalogue_revisions SET digest=? WHERE id='source:test'").run('f'.repeat(64));
  await assert.rejects(journal.saveResearch(f.db,f.repo,'owner',f.input),e=>e.status===409);
  for(const table of journal.JOURNAL_TABLES)assert.equal(count(f.db,table),0);
});
test('journal tables reject UPDATE and DELETE at the database boundary',async t=>{
  const f=await withFixture(t);await journal.saveResearch(f.db,f.repo,'owner',f.input);
  for(const table of journal.JOURNAL_TABLES){assert.throws(()=>f.db.sql.exec('UPDATE '+table+' SET version=2'),/immutable/);assert.throws(()=>f.db.sql.exec('DELETE FROM '+table),/immutable/);}
});
for(const edit of ['date','pin','raw'])test('rejects rewritten legacy '+edit,async t=>{
  const f=await withFixture(t);
  if(edit==='date')f.input.graph.claims[0].content.value.date.original='改寫原紀年';
  if(edit==='pin')f.input.graph.tenures[0].legacyOrigin=null;
  if(edit==='raw')f.input.graph.tenures[0].officeNameOriginal='改寫原官名';
  f.input.inspectedGraphDigest=hash(f.input.graph);
  await assert.rejects(journal.saveResearch(f.db,f.repo,'owner',f.input),/原|舊/);
  assert.equal(count(f.db,'catalogue_research_revisions'),0);
});
test('a changed inspected graph needs a new exact digest',async t=>{
  const f=await withFixture(t);f.input.graph.tenures[0].reason='新理由';
  await assert.rejects(journal.saveResearch(f.db,f.repo,'owner',f.input),e=>e.status===409);
});
test('adopting a verified claim requires explicit exact-content acknowledgement',async t=>{
  const f=await withFixture(t);
  f.input.graph.claims.push({id:'claim:new',subject:{kind:'tenure',id:'appointment:test'},content:{type:'holding',value:'held'},derivation:'direct',assessment:'verified',rationale:'合成測試依據'});
  f.input.graph.evidence.push({...f.input.graph.evidence[0],id:'evidence:new',claimId:'claim:new'});
  f.input.inspectedGraphDigest=hash(f.input.graph);
  await assert.rejects(journal.saveResearch(f.db,f.repo,'owner',f.input),/核定/);
  const result=await journal.saveResearch(f.db,f.repo,'owner',{...f.input,reviewedContentDigest:f.input.inspectedGraphDigest});
  assert.equal(result.persisted,true);assert.equal(result.published,false);
});
test('caller mutation during asynchronous validation cannot change stored bytes',async t=>{
  const f=await withFixture(t),expected=structuredClone(f.input.graph);
  const task=journal.saveResearch(f.db,f.repo,'owner',f.input);f.input.graph.tenures[0].officeNameOriginal='異步竄改';
  const result=await task;assert.deepEqual(result.revision.graph,expected);
});
test('missing migration fails explicitly without auto-creating tables',async t=>{
  const f=await withFixture(t,{migrateResearch:false});
  await assert.rejects(journal.saveResearch(f.db,f.repo,'owner',f.input),e=>e.status===503);
  assert.equal(await journal.researchStorageReady(f.db),false);
});
test('history pagination returns all revisions without duplicates',async t=>{
  const f=await withFixture(t);
  for(let i=0;i<42;i++)await journal.saveResearch(f.db,f.repo,'owner',{...f.input,requestId:'request:page:'+i,baseRevision:i});
  const first=await journal.researchHistory(f.db,'person:test'),last=await journal.researchHistory(f.db,'person:test',first.nextBefore);
  assert.equal(first.rows.length,40);assert.equal(last.rows.length,2);assert.equal(new Set([...first.rows,...last.rows].map(r=>r.version)).size,42);
});
test('backup v4 restores exact research, indexes, original text and history into an empty SQL database',async t=>{
  const f=await withFixture(t);await journal.saveResearch(f.db,f.repo,'owner',f.input);
  const text=await new Response(await backup({DB:f.db,BUCKET:bucket})).text();
  const checked=verifyBackup(gzipSync(text));assert.equal(checked.manifest.format,'guanshitai-backup-4');
  const restored=sqliteDatabase();t.after(()=>restored.close());restored.sql.exec(restoreSql(checked).join('\n'));
  assert.deepEqual(await journal.getResearchRevision(restored,'person:test',1),await journal.getResearchRevision(f.db,'person:test',1));
  assert.equal(restored.sql.prepare("SELECT count(*) n FROM catalogue_settings WHERE key='owner-id'").get().n,0);
  assert.deepEqual(restored.sql.prepare('PRAGMA foreign_key_check').all(),[]);
});
test('v3 remains readable before the research migration and v2 remains restorable',async t=>{
  const f=await withFixture(t,{migrateResearch:false});
  const text=await new Response(await backup({DB:f.db,BUCKET:bucket})).text();
  const v3=verifyBackup(gzipSync(text));assert.equal(v3.manifest.format,'guanshitai-backup-3');
  const lines=text.trim().split('\n').map(JSON.parse);lines[0].format='guanshitai-backup-2';lines[0].tables=lines[0].tables.filter(t=>t!=='catalogue_reader_links');
  const data=Object.fromEntries(lines[0].tables.map(t=>[t,[]]));for(const l of lines)if(l.type==='row')data[l.table].push(l.row);
  lines.at(-1).rowsDigest=createHash('sha256').update(JSON.stringify(data)).digest('hex');
  assert.equal(verifyBackup(gzipSync(lines.map(JSON.stringify).join('\n'))).manifest.format,'guanshitai-backup-2');
});
test('backup detects index omission even when transport digest was recalculated',async t=>{
  const f=await withFixture(t);await journal.saveResearch(f.db,f.repo,'owner',f.input);
  const text=await new Response(await backup({DB:f.db,BUCKET:bucket})).text();
  const lines=text.trim().split('\n').map(JSON.parse);lines.splice(lines.findIndex(l=>l.type==='row'&&l.table==='catalogue_research_pins'),1);
  const data=Object.fromEntries(lines[0].tables.map(t=>[t,[]]));for(const l of lines)if(l.type==='row')data[l.table].push(l.row);
  lines.at(-1).rows--;lines.at(-1).rowsDigest=createHash('sha256').update(JSON.stringify(data)).digest('hex');
  assert.throws(()=>verifyBackup(gzipSync(lines.map(JSON.stringify).join('\n'))),/索引/);
});
test('partial migrations cannot silently omit research from backups',async t=>{
  const f=await withFixture(t,{migrateResearch:false});f.db.sql.exec('CREATE TABLE catalogue_research_revisions(dummy TEXT)');
  await assert.rejects(backup({DB:f.db,BUCKET:bucket}),/不完整/);
});

const http=(f,path,method='GET',value,headers={})=>{f.db.repo=f.repo;return catalogueRouter(new Request('https://site.test'+path,{method,headers:{'oai-authenticated-user-id':'owner',...(method==='POST'?{'origin':'https://site.test','x-catalogue-request':'1','content-type':'application/json'}:{}),...headers},...(value===undefined?{}:{body:JSON.stringify(value)})}),{DB:f.db,BUCKET:bucket,ADMIN_OWNER_ID:'owner'});};
for(const headers of [{'oai-authenticated-user-id':''},{'oai-authenticated-user-id':'other'},{origin:'https://other.test'},{'sec-fetch-site':'cross-site'},{'x-catalogue-request':'0'}])test('HTTP journal rejects unauthorized or cross-origin writes '+JSON.stringify(headers),async t=>{
  const f=await withFixture(t),response=await http(f,'/api/admin/research/dossiers','POST',f.input,headers);
  assert.ok([401,403].includes(response.status));assert.equal(count(f.db,'catalogue_research_revisions'),0);
});
test('actual owner HTTP save/read/history keep publication separate and HEAD bodyless',async t=>{
  const f=await withFixture(t),path='/api/admin/research/dossiers/person%3Atest';
  const saved=await http(f,'/api/admin/research/dossiers','POST',f.input);assert.equal(saved.status,200);assert.equal((await saved.json()).published,false);
  const read=await http(f,path);assert.equal((await read.json()).data.number,1);assert.equal(read.headers.get('cache-control'),'no-store');
  const history=await http(f,path+'/history');assert.equal((await history.json()).data.rows.length,1);
  const head=await http(f,path,'HEAD');assert.equal(await head.text(),'');assert.equal(head.status,200);
  assert.equal((await http(f,path,'POST',f.input)).status,405);
});
test('HTTP stale edit and malformed payload cannot create partial versions',async t=>{
  const f=await withFixture(t);await http(f,'/api/admin/research/dossiers','POST',f.input);
  assert.equal((await http(f,'/api/admin/research/dossiers','POST',{...f.input,requestId:'request:stale:2'})).status,409);
  assert.equal((await http(f,'/api/admin/research/dossiers','POST',null)).status,422);
  assert.equal(count(f.db,'catalogue_research_revisions'),1);
});
