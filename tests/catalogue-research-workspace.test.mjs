import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWorkspaceFixture} from './helpers/research-workspace-fixture.mjs';
const core=await loadWorkspaceFixture();test.after(core.cleanup);
async function fresh(t){const f=await core.fixture();t.after(f.close);return f;}
const call=(f,path,method='GET',body)=>core.router.catalogueRouter(new Request('https://fixture.test/api/admin'+path,{method,headers:{'oai-authenticated-user-id':'owner','origin':'https://fixture.test','x-catalogue-request':'1',...(method==='POST'?{'content-type':'application/json'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),f.env);
async function materialRows(f){return Promise.all(f.pack.sources.map(async(source,i)=>({id:source.id,number:1,commit:4+i,data:core.workspace.normalizeMaterialSource(source),digest:await core.revisions.sha256(core.revisions.canonicalJson(core.workspace.normalizeMaterialSource(source)))})));}
test('material dates remain independent pending claims without implied tenure or adoption',async t=>{
 const f=await fresh(t),before=structuredClone(f.raw.graph),rows=await materialRows(f),graph=core.workspace.appendMaterials(before,f.pack,rows);
 assert.equal(graph.events.length,1);assert.equal(graph.factualConflicts.length,1);assert.equal(graph.events[0].dateClaimId,null);assert.deepEqual(graph.events[0].tenureIds,[]);assert.deepEqual(graph.tenures,before.tenures);
 const claims=graph.claims.filter(c=>c.content.type==='event-date');assert.deepEqual(claims.map(c=>c.content.value.earliestYear),[270,272]);assert.ok(claims.every(c=>c.assessment==='pending'));assert.deepEqual(before,f.raw.graph);
 assert.throws(()=>core.workspace.appendMaterials(graph,f.pack,rows),/已包含/);
 rows[0].data.text='他人已修訂';assert.throws(()=>core.workspace.appendMaterials(before,f.pack,rows),/不能覆蓋/);
});
test('pack validation rejects cross-file source identities and dangling evidence',async t=>{
 const f=await fresh(t);f.pack.events[0].dates[0].sourceIds=['source:unrelated'];assert.throws(()=>core.workspace.validateMaterialPack(f.pack),/引用/);
 f.pack.sources[0].id='source:unrelated';assert.throws(()=>core.workspace.validateMaterialPack(f.pack),/識別碼/);
});
test('real import, inspection, save and reload preserve every source pin and original text',async t=>{
 const f=await fresh(t),records=f.pack.sources.map(core.workspace.normalizeMaterialSource);
 const uploaded=await core.router.catalogueRouter(new Request('https://fixture.test/api/admin/objects',{method:'POST',headers:{'oai-authenticated-user-id':'owner',origin:'https://fixture.test','x-catalogue-request':'1','x-filename':'fixture.json'},body:JSON.stringify({records})}),f.env);
 assert.equal(uploaded.status,200);const {hash}=await uploaded.json();
 const job=await (await call(f,'/imports','POST',{hash,mapping:{kind:'source',columns:{},allowUnmapped:false}})).json();
 assert.equal(job.state,'staging');assert.equal((await (await call(f,'/imports/'+encodeURIComponent(job.id)+'/preview')).json()).rows.length,2);
 assert.equal((await (await call(f,'/imports/'+encodeURIComponent(job.id)+'/stage','POST',{})).json()).state,'ready');
 assert.equal((await call(f,'/imports/'+encodeURIComponent(job.id)+'/commit','POST',{reason:'合成材料'})).status,200);
 const rows=await Promise.all(records.map(s=>core.catalogue.getRevision(f.db,s.id)));
 const graph=core.workspace.appendMaterials(f.raw.graph,f.pack,rows),watermark=await core.catalogue.watermark(f.db);
 const checked=await (await call(f,'/research/inspect','POST',{graph,watermark})).json();
 assert.equal(checked.sourceRevisions.length,3);for(const s of f.pack.sources)assert.equal(checked.sourceRevisions.find(r=>r.pin.id===s.id).data.text,s.text);
 const result=await (await call(f,'/research/dossiers','POST',{requestId:'workspace:test:save',baseRevision:0,graph,watermark,inspectedGraphDigest:checked.graphDigest,reason:'保存合成案卷'})).json();
 assert.equal(result.persisted,true);assert.equal(result.published,false);
 const saved=await (await call(f,'/research/dossiers/'+encodeURIComponent(f.person.id))).json();assert.deepEqual(saved.data.graph,graph);assert.equal(saved.data.number,1);
 const history=await (await call(f,'/research/dossiers/'+encodeURIComponent(f.person.id)+'/history')).json();assert.equal(history.data.rows[0].version,1);
 assert.equal(f.db.sql.prepare('SELECT count(*) n FROM catalogue_publication_events').get().n,0);
});
test('exports escape executable markup and formulas, retain exact text in HTML and separate draft status',async t=>{
 const f=await fresh(t),graph=core.workspace.appendMaterials(f.raw.graph,f.pack,await materialRows(f));graph.events[0].original='=HYPERLINK("https://invalid")';
 const sources=[{pin:{id:f.source.id,revision:1,digest:'c'.repeat(64)},data:f.source},...(await materialRows(f)).map(r=>({pin:{id:r.id,revision:r.number,digest:r.digest},data:r.data}))];
 const html=core.workspace.researchDocument('合成案卷',graph,sources,0,5,true);assert.match(html,/未保存草稿/);assert.ok(html.includes('&lt;script&gt;不得執行&lt;/script&gt;'));assert.ok(html.includes(f.pack.sources[0].text));assert.doesNotMatch(html,/<script>/);
 const csv=core.workspace.researchCsv(graph,sources);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=HYPERLINK'));assert.ok(csv.includes('六年'));assert.ok(csv.includes('八年'));
});
