import test from 'node:test';
import assert from 'node:assert/strict';
import {loadResearchModules} from './helpers/research-ui-loader.mjs';

// Incremental UI/route tests, not a rerun of the inherited research engine suite.
// Existing owner and mutationGuard run unchanged; unrelated services, research
// service responses, D1/R2 and the original admin HTML are explicit test doubles.
const unavailable = names => names.map(n=>`export function ${n}(){throw Error('Unexpected unrelated service');}`).join('\n');
const overrides={
 'server/backup-service.ts':unavailable(['backup']),
 'server/bootstrap-service.ts':unavailable(['bootstrap']),
 'server/import-service.ts':unavailable(['upload','inspectFile','createImport','importDetail','stageImport','commitImport']),
 'server/publication-service.ts':unavailable(['makePublication','publishData']),
 'server/reader-links.ts':unavailable(['readerLinkOptions']),
 'admin/index.html?raw':'export default "<html><nav></nav></html>";',
 'server/generated/reader.html?raw':'export default "<html><head></head></html>";',
 'server/research-preview.ts':`
 import {ResearchError} from '../domain/prosopography/time';
 export const parseResearchWatermark=raw=>raw===null?undefined:Number(raw);
 export async function previewPersonResearch(repo,personId,requested){const watermark=requested??await repo.watermark();return {readOnly:true,personId,watermark};}
 export async function inspectPersonResearch(repo,input){if(!input?.graph)throw new ResearchError('graph','缺少研究圖');return {readOnly:true,persisted:false,watermark:input.watermark};}
 `,
 'server/catalogue-service.ts':`
 import {DomainError} from '../domain/catalogue';import {HttpError} from './storage';
 export const watermark=db=>db.watermark();export const snapshot=(db,n)=>db.snapshot(n);export const getRevision=(db,id,n)=>db.revision(id,n);
 export const domainErrorStatus=e=>e instanceof DomainError?422:e instanceof HttpError?e.status:503;
 ${unavailable(['listRecords','history','saveRecord'])}
 `,
};
const loaded=await loadResearchModules(['server/admin-router.ts'],overrides);
const [api]=loaded.modules;
test.after(loaded.cleanup);
let reads=0;
const db={watermark:async()=>{reads++;return 3;},snapshot:async()=>[],revision:async()=>null,prepare:()=>{throw Error('Unexpected SQL mutation');}};
const env={ADMIN_OWNER_ID:'owner',DB:db,BUCKET:{put:()=>{throw Error('Unexpected object write');}}};
const auth={'oai-authenticated-user-id':'owner'};
const headers={...auth,origin:'https://fixture.test','sec-fetch-site':'same-origin','x-catalogue-request':'1','content-type':'application/json'};
const call=(path,options={})=>api.catalogueRouter(new Request('https://fixture.test'+path,options),env);
for(const path of ['/admin/research','/api/admin/research/people/person%3Afixture','/api/admin/research/inspect'])test('owner guard precedes '+path,async()=>{const before=reads;const response=await call(path);assert.equal(response.status,401);assert.equal(reads,before);assert.equal(response.headers.get('cache-control'),'no-store');});
test('non-owner cannot open the research page',async()=>assert.equal((await call('/admin/research',{headers:{'oai-authenticated-user-id':'other'}})).status,403));
test('owner opens the actual HTML and finds its link in existing navigation',async()=>{const page=await call('/admin/research',{headers:auth});assert.equal(page.status,200);assert.equal(page.headers.get('x-content-type-options'),'nosniff');assert.match(await page.text(),/保存研究修訂/);assert.match(await (await call('/admin',{headers:auth})).text(),/href="\/admin\/research"/);});
test('page HEAD is bodyless and uncached',async()=>{const response=await call('/admin/research',{headers:auth,method:'HEAD'});assert.equal(response.status,200);assert.equal(await response.text(),'');assert.equal(response.headers.get('cache-control'),'no-store');});
test('page does not accept POST',async()=>assert.equal((await call('/admin/research',{method:'POST',headers,body:'{}'})).status,405));
test('existing core preview route remains intact',async()=>{const response=await call('/api/admin/research/people/person%3Afixture?watermark=2',{headers:auth});assert.deepEqual(await response.json(),{readOnly:true,personId:'person:fixture',watermark:2});});
for(const bad of [{origin:'https://other.test'},{'sec-fetch-site':'cross-site'},{'x-catalogue-request':'0'}])test('inspect preserves guard '+JSON.stringify(bad),async()=>assert.equal((await call('/api/admin/research/inspect',{method:'POST',headers:{...headers,...bad},body:'{}'})).status,403));
test('existing inspect keeps readOnly and persisted:false',async()=>{const response=await call('/api/admin/research/inspect',{method:'POST',headers,body:'{"graph":{},"watermark":3}'});assert.equal(response.status,200);assert.deepEqual(await response.json(),{readOnly:true,persisted:false,watermark:3});});
test('malformed JSON remains 400',async()=>assert.equal((await call('/api/admin/research/inspect',{method:'POST',headers,body:'{'})).status,400));
test('existing ResearchError remains 422',async()=>assert.equal((await call('/api/admin/research/inspect',{method:'POST',headers,body:'{"graph":null}'})).status,422));
test('inherited 1 MiB body limit remains active',async()=>assert.equal((await call('/api/admin/research/inspect',{method:'POST',headers,body:' '.repeat(1024*1024+1)})).status,413));
test('action headers remain rejected before the new page',async()=>assert.equal((await call('/admin/research',{headers:{...auth,'next-action':'test'}})).status,405));
test('unrelated public route remains delegated',async()=>assert.equal(await call('/public/research'),null));
