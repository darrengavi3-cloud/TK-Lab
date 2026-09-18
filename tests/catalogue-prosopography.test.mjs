import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';

// Compile the real domain and its real v1 dependencies, not a second implementation.
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'prosopography-test-'));
test.after(() => fs.rm(temp, {recursive: true, force: true}));
const roots = ['time','graph','preview','loader'].map(n => path.resolve('domain/prosopography/' + n + '.ts'));
const program = ts.createProgram(roots, {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, strict: true, skipLibCheck: true, types: [], rootDir: process.cwd(), outDir: temp});
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCurrentDirectory: () => process.cwd(), getCanonicalFileName: f => f, getNewLine: () => '\n'}));
assert.equal(program.emit().emitSkipped, false);
await fs.writeFile(path.join(temp, 'package.json'), '{"type":"commonjs"}');
const require = createRequire(import.meta.url);
const m = Object.assign({}, ...['time','graph','preview','loader'].map(n => require(path.join(temp, 'domain/prosopography/' + n + '.js'))));
const v1 = require(path.join(temp, 'domain/catalogue.js'));
const rev = require(path.join(temp, 'domain/revisions.js'));
const copy = x => structuredClone(x);
const time = (a, b=a, certainty='explicit') => ({...m.unknownTime('原始紀年'), earliestYear:a, latestYear:b, precision:a===b?'year':'range', certainty, basis:certainty==='inferred'?'測試推定依據':''});
const pin = {id:'source:fixture',revision:1,digest:'a'.repeat(64)};
function graph() {
  const g = {model:1,personId:'person:fixture',tenures:[{id:'tenure:1',personId:'person:fixture',officeId:null,officeNameOriginal:'測試官',polityOriginal:'測試政權',natureOriginal:'原授官文字',jurisdictionOriginal:'',assessment:'verified',workflow:'ready',visibility:'private',disposition:'none',reason:'測試採擇',legacyOrigin:null,selected:{holding:'claim:holding',start:'claim:start',end:'claim:end',continuity:'claim:continuity',attestations:[],rationale:'測試選定解釋'}}],events:[],claims:[],evidence:[],factualConflicts:[],textualVariants:[]};
  for (const [type,value] of [['holding','held'],['start',time(200)],['end',time(205)],['continuity','continuous']]) addClaim(g,'claim:'+type,type,value);
  return g;
}
function addClaim(g,id,type,value,subject={kind:'tenure',id:'tenure:1'}) {
  const c={id,subject,content:{type,value},derivation:'direct',assessment:'verified',rationale:'合成測試依據',origin:null};
  g.claims.push(c);g.evidence.push({id:'evidence:'+id,claimId:id,source:{...pin},role:'support',note:''});return c;
}
const claim = (g,type) => g.claims.find(c=>c.content.type===type);
const presence = (g,y=202) => m.officePresence(g,'tenure:1',y);
const event = (id,afterEventIds=[]) => ({id,personId:'person:fixture',type:'appointment',original:'合成事件文字',tenureIds:['tenure:1'],dateClaimId:null,afterEventIds});
const common = id => ({id,assessment:'pending',workflow:'draft',visibility:'private',disposition:'none',reason:'',evidence:[]});
const person = (id='person:fixture') => ({...common(id),kind:'person',name:'合成同名',aliases:[],aliasPublication:'private',legacyIds:[]});
const source = (id='source:fixture',text='原文\n　原注  𬱟') => ({...common(id),kind:'source',title:'合成測試底本',edition:'版本甲',locator:'測試位置',text,textScope:'excerpt',url:''});
const appointment = (id='appointment:fixture') => ({...common(id),kind:'appointment',personId:'person:fixture',officeId:null,officeName:'測試官',nature:'實任',polity:'測試政權',jurisdiction:'',date:{original:'某年間',startYear:200,endYear:205,precision:'range',certainty:'certain',basis:''},duplicateOf:null,evidence:[{sourceId:'source:fixture',sourceRevision:1,role:'support',note:''}]});
async function revision(data,number=1,commit=1){return {id:data.id,number,commit,data:copy(data),digest:await rev.sha256(rev.canonicalJson(data)),actor:'test-owner',at:'2026-09-19T00:00:00Z',reason:'合成測試'};}
async function fixture() {const p=await revision(person()),s=await revision(source(),1,2),a=await revision(appointment(),1,3);return {p,s,a,rows:[p,s,a],sources:new Map([[m.pinKey(m.revisionPin(s)),s]])};}
async function preview(f,year=202){return m.legacyResearchPreview(f.rows,f.sources,'person:fixture',10,year);}

for(const y of [-5000,-1,1,260,5000])test('historical year accepted: '+y,()=>m.validateTime(time(y)));
for(const y of [0,0.5,NaN,Infinity,5001,-5001,'260'])test('historical year rejected: '+String(y),()=>assert.throws(()=>m.validateTime(time(y)),/年份/));
test('unknown endpoints remain null',()=>{const d=m.unknownTime();m.validateTime(d);assert.equal(d.earliestYear,null);});
test('one-sided uncertainty is expressible without inventing other endpoint',()=>m.validateTime({...time(200,202),latestYear:null}));
test('reversed date range is invalid',()=>assert.throws(()=>m.validateTime(time(205,200)),/下限/));
test('inferred date requires its basis',()=>assert.throws(()=>m.validateTime({...time(200,201,'inferred'),basis:''}),/依據/));
test('unknown precision cannot contain a number',()=>assert.throws(()=>m.validateTime({...time(200),precision:'unknown'}),/未知年代/));
test('year precision requires identical endpoints',()=>assert.throws(()=>m.validateTime({...time(200,205),precision:'year'}),/單年/));
test('new graph validates independently of workflow and reader visibility',()=>{const g=graph();g.tenures[0].workflow='draft';g.tenures[0].visibility='reader';m.validateGraph(g);assert.equal(presence(g).definite,true);});
test('same-named but different person identity cannot enter the graph',()=>{const g=graph();g.tenures[0].personId='person:other';assert.throws(()=>m.validateGraph(g),/人物/);});
test('all relationship records require unique IDs',()=>{const g=graph();g.events.push(event('claim:start'));assert.throws(()=>m.validateGraph(g),/不重複/);});
test('claim subject foreign key is enforced',()=>{const g=graph();g.claims[0].subject.id='missing';assert.throws(()=>m.validateGraph(g),/不存在/);});
test('verified claims require supporting rather than counter evidence',()=>{const g=graph();g.evidence[0].role='counter';assert.throws(()=>m.validateGraph(g),/支持史料/);});
test('duplicate evidence is not another independent support',()=>{const g=graph();g.evidence.push({...g.evidence[0],id:'extra'});assert.throws(()=>m.validateGraph(g),/重複計入/);});
test('one source revision cannot have two different digests',()=>{const g=graph();g.evidence[1].source.digest='b'.repeat(64);assert.throws(()=>m.validateGraph(g),/兩個摘要/);});
test('selection cannot refer to an excluded or wrong-predicate claim',()=>{const g=graph();g.tenures[0].selected.start='claim:end';assert.throws(()=>m.validateGraph(g),/採用說法/);});
test('research selection requires an explicit rationale',()=>{const g=graph();g.tenures[0].selected.rationale='';assert.throws(()=>m.validateGraph(g),/研究者理由/);});
test('one event may alter multiple distinct tenures',()=>{const g=graph();g.tenures.push({...copy(g.tenures[0]),id:'tenure:2',selected:{holding:null,start:null,end:null,continuity:null,attestations:[],rationale:''}});g.events.push({...event('event:one'),tenureIds:['tenure:1','tenure:2']});m.validateGraph(g);assert.equal(g.tenures.length,2);});
test('relative chronology does not require numerical years',()=>{const g=graph();g.events.push(event('event:1'),event('event:2',['event:1']));m.validateGraph(g);});
test('relative chronology cycles are rejected',()=>{const g=graph();g.events.push(event('event:1',['event:2']),event('event:2',['event:1']));assert.throws(()=>m.validateGraph(g),/循環/);});
test('factual conflicts compare the same subject and predicate',()=>{const g=graph();g.factualConflicts.push({id:'conflict:1',claimIds:['claim:start','claim:end'],note:''});assert.throws(()=>m.validateGraph(g),/同一問題/);});
test('text variants need different readings and distinct witnesses',()=>{const g=graph();g.textualVariants.push({id:'variant:1',locus:'行一',note:'',readings:[{source:{...pin},text:'甲'},{source:{...pin},text:'乙'}]});assert.throws(()=>m.validateGraph(g),/區分見證/);});

test('explicit continuous tenure is distinguished from mere possible range',()=>assert.equal(presence(graph()).status,'continuous'));
test('absence of continuity evidence means possible not certain',()=>{const g=graph();g.tenures[0].selected.continuity=null;assert.equal(presence(g).status,'possible');assert.equal(presence(g).definite,false);});
test('uncertain endpoints use their inner range for certain continuous presence',()=>{const g=graph();claim(g,'start').content.value=time(200,202);claim(g,'end').content.value=time(205,207);assert.equal(presence(g,201).status,'possible');assert.equal(presence(g,203).status,'continuous');assert.equal(presence(g,206).status,'possible');});
test('pending tenure cannot inherit certainty from verified claims',()=>{const g=graph();g.tenures[0].assessment='pending';assert.equal(presence(g).definite,false);});
test('inferred endpoint is not a direct tenure attestation',()=>{const g=graph();claim(g,'start').content.value=time(200,201,'inferred');assert.equal(presence(g).status,'possible');});
test('adopted factual conflict blocks definite tenure',()=>{const g=graph();addClaim(g,'claim:alternative','start',time(201));g.factualConflicts.push({id:'conflict:1',claimIds:['claim:start','claim:alternative'],note:'年代異說'});assert.equal(presence(g).definite,false);});
test('unresolved counterevidence blocks definite tenure',()=>{const g=graph();g.evidence.push({...copy(g.evidence[0]),id:'evidence:counter',role:'counter'});assert.equal(presence(g).definite,false);});
test('single-year attestation does not fill surrounding years',()=>{const g=graph();Object.assign(g.tenures[0].selected,{start:null,end:null,continuity:null,attestations:['claim:seen']});addClaim(g,'claim:seen','attestation',time(202));assert.equal(presence(g,202).status,'attested');assert.equal(presence(g,203).status,'unknown');});
test('unknown end is not extended to death or next appointment',()=>{const g=graph();g.tenures[0].selected.end=null;g.events.push({...event('event:death'),type:'death'});assert.equal(presence(g,203).status,'unknown');});
test('event-date range cannot masquerade as tenure',()=>{const g=graph();g.events.push(event('event:appoint'));addClaim(g,'claim:event','event-date',time(200,205),{kind:'event',id:'event:appoint'});g.tenures[0].selected.start='claim:event';assert.throws(()=>m.validateGraph(g),/採用說法/);});
for(const holding of ['not-held','posthumous'])test(holding+' never counts as actual office',()=>{const g=graph();claim(g,'holding').content.value=holding;assert.equal(presence(g).status,'not-held');});
for(const type of ['capture','surrender'])test(type+' event is not death or an automatic end of tenure',()=>{const g=graph();g.events.push({...event('event:'+type),type});assert.equal(presence(g).status,'continuous');});
test('inconsistent selected dates are retained with warning, not certainty',()=>{const g=graph();claim(g,'start').content.value=time(210);assert.equal(presence(g).status,'unknown');assert.ok(m.graphWarnings(g).some(w=>w.code==='inconsistent-tenure'));});
test('known wrong and duplicate records do not count as office holders',()=>{const g=graph();g.tenures[0].assessment='excluded';g.tenures[0].disposition='incorrect';assert.equal(presence(g).status,'excluded');});
test('explicit dates bound outside queries without filling unknown data',()=>{assert.equal(presence(graph(),199).status,'outside');assert.equal(presence(graph(),206).status,'outside');});

test('shadow preview preserves raw v1 dates but never reinterprets their interval',async()=>{const f=await fixture();const before=rev.canonicalJson(f.rows);const p=await preview(f);assert.deepEqual(p.graph.claims[0].content.value.date,f.a.data.date);assert.equal(p.presence[0].status,'unknown');assert.equal(rev.canonicalJson(f.rows),before);assert.equal(p.access,'owner-only');assert.equal(p.persistence,'none');assert.equal(p.graph.events.length,0);});
test('source original whitespace, rare characters and excerpt scope are unchanged',async()=>{const f=await fixture();const p=await preview(f);assert.equal(p.sources[0].data.text,f.s.data.text);assert.equal(p.sources[0].data.textScope,'excerpt');p.sources[0].data.text='changed';assert.notEqual(f.s.data.text,'changed');});
test('previously verified legacy record does not auto-review its new atomic claims',async()=>{const f=await fixture();f.a=await revision({...f.a.data,assessment:'verified',reason:'舊核定'},1,3);f.rows=[f.p,f.s,f.a];const p=await preview(f);assert.equal(p.graph.tenures[0].assessment,'verified');assert.equal(p.graph.claims[0].assessment,'pending');assert.equal(p.presence[0].definite,false);});
test('reviewed duplicate keeps its claim but does not add another tenure',async()=>{const f=await fixture();f.rows.push(await revision({...appointment('appointment:duplicate'),assessment:'excluded',disposition:'duplicate',reason:'既有互證',duplicateOf:f.a.id},1,4));const p=await preview(f);assert.equal(p.graph.tenures.length,1);assert.equal(p.graph.claims.length,2);assert.equal(p.sources.length,1);});
test('duplicate missing its exact reviewed target fails instead of name merging',async()=>{const f=await fixture();f.rows.push(await revision({...appointment('appointment:duplicate'),assessment:'excluded',disposition:'duplicate',reason:'既有互證',duplicateOf:'appointment:missing'},1,4));await assert.rejects(()=>preview(f),/互證目標/);});
test('same-name different-ID people remain separate',async()=>{const f=await fixture();f.rows.push(await revision(person('person:other'),1,4));await assert.rejects(()=>m.legacyResearchPreview(f.rows,f.sources,'person:missing',10),/沒有該人物/);assert.equal((await preview(f)).origins.filter(r=>r.data.kind==='person').length,1);});
test('newer source does not change an older pinned quote or preview digest',async()=>{const f=await fixture();const first=await preview(f);const newer=await revision({...f.s.data,text:'第二修訂'},2,5);f.sources.set(m.pinKey(m.revisionPin(newer)),newer);f.rows=[f.p,newer,f.a];const second=await preview(f);assert.equal(second.digest,first.digest);assert.equal(second.sourceRevisions[0].revision,1);});
test('missing old source does not fall back to latest',async()=>{const f=await fixture();f.sources.clear();const s2=await revision(f.s.data,2,5);f.sources.set(m.pinKey(m.revisionPin(s2)),s2);await assert.rejects(()=>preview(f),/固定史料修訂/);});
test('tampered source bytes are rejected despite a stored hash',async()=>{const f=await fixture();f.s.data.text='篡改';await assert.rejects(()=>preview(f),/摘要不符/);});
test('future source revision is rejected at an older watermark',async()=>{const f=await fixture();f.s.commit=11;await assert.rejects(()=>preview(f),/晚於快照/);});
test('person-only evidence is included in the pinned manifest',async()=>{const f=await fixture();f.p=await revision({...f.p.data,evidence:[...f.a.data.evidence]});f.rows=[f.p,f.s];const p=await preview(f);assert.equal(p.sources.length,1);assert.equal(p.graph.claims.length,0);});
test('legacy variant remains unclassified, not invented textual apparatus',async()=>{const f=await fixture();f.a=await revision({...f.a.data,evidence:[{...f.a.data.evidence[0],role:'variant'}]},1,3);f.rows=[f.p,f.s,f.a];const p=await preview(f);assert.equal(p.graph.textualVariants.length,0);assert.ok(p.warnings.some(w=>w.code==='variant-unclassified'));});
test('legacy zero value is preserved but never normalized into a new year',async()=>{const f=await fixture();f.a=await revision({...f.a.data,date:{...f.a.data.date,startYear:0}},1,3);f.rows=[f.p,f.s,f.a];assert.equal((await preview(f)).graph.claims[0].content.value.date.startYear,0);});
test('invalid query year fails even with no tenures',async()=>{const f=await fixture();f.rows=[f.p];await assert.rejects(()=>preview(f,0),/年份/);});
test('multiple revisions of the same ID are not accepted as a fixed snapshot',async()=>{const f=await fixture();f.rows.push(f.a);await assert.rejects(()=>preview(f),/固定快照/);});
test('textual variant must be actually present in its exact source bytes',async()=>{const f=await fixture();const s2=await revision(source('source:other','異讀乙'),1,2);const g=graph();for(const e of g.evidence)e.source=m.revisionPin(f.s);g.textualVariants=[{id:'variant:1',locus:'同一校勘位置',note:'',readings:[{source:m.revisionPin(f.s),text:'原文'},{source:m.revisionPin(s2),text:'異讀乙'}]}];f.sources.set(m.pinKey(m.revisionPin(s2)),s2);assert.equal((await m.pinSources(g,f.sources,10)).length,2);g.textualVariants[0].readings[1].text='未見的正規化文字';await assert.rejects(()=>m.pinSources(g,f.sources,10),/未見於指定/);});

for(const query of ['year=0','year=260x','year=1e2','year=','year=260&year=261','watermark=11','watermark=-1','watermark=1.5','watermark=9007199254740993','when=260'])test('strict preview query rejects '+query,()=>assert.throws(()=>m.previewOptions(new URLSearchParams(query),10)));
test('preview query accepts signed BCE and an explicit older snapshot',()=>assert.deepEqual(m.previewOptions(new URLSearchParams('year=-1&watermark=3'),10),{year:-1,watermark:3}));
test('read loader pins one watermark and deduplicates all source fetches',async()=>{const f=await fixture();f.rows.push(await revision(appointment('appointment:second'),1,4));const calls=[];const store={watermark:async()=>{calls.push('watermark');return 10;},snapshot:async seq=>{calls.push(['snapshot',seq]);return f.rows;},sourceRevision:async(id,n)=>{calls.push(['source',id,n]);return f.sources.get(m.pinKey({id,revision:n}))||null;}};const p=await m.loadResearchPreview(store,'person:fixture',new URLSearchParams('watermark=4&year=202'));assert.equal(p.watermark,4);assert.equal(calls.filter(c=>Array.isArray(c)&&c[0]==='source').length,1);assert.deepEqual(calls[1],['snapshot',4]);assert.equal(p.presence.length,2);});
test('loader rejects too many source versions rather than silently dropping citations',async()=>{const f=await fixture();f.a.data.evidence=Array.from({length:257},(_,i)=>({sourceId:'source:'+i,sourceRevision:1,role:'support',note:''}));let sourceCalls=0;await assert.rejects(()=>m.loadResearchPreview({watermark:async()=>10,snapshot:async()=>f.rows,sourceRevision:async()=>{sourceCalls++;return null;}},f.p.id,new URLSearchParams()),/256/);assert.equal(sourceCalls,0);});
test('source pin map cannot substitute another identity',async()=>{const f=await fixture();const wrong=await revision(source('source:wrong'));f.sources.set(m.pinKey(m.revisionPin(f.s)),wrong);await assert.rejects(()=>preview(f),/固定史料修訂/);});
test('v1 in-year behavior is unchanged by the shadow bridge',()=>{const a={...appointment(),assessment:'verified',reason:'舊核定'};assert.equal(v1.holdsOfficeInYear(a,202),true);});

// Run the actual router, authorization, storage, and new service code against
// a read-only fake data port. This is an HTTP unit test, not a deployed Worker.
const {runInNewContext} = await import('node:vm');
async function loadTsModule(filename, dependencies) {
  const output = ts.transpileModule(await fs.readFile(filename,'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  runInNewContext(output,{module,exports:module.exports,require:id=>{assert.ok(Object.hasOwn(dependencies,id),'Unexpected module: '+id);return dependencies[id];},URL,Request,Response,TextDecoder,Uint8Array,CompressionStream,Error,console});
  return module.exports;
}
const storageModule = await loadTsModule('server/storage.ts',{});
const authModule = await loadTsModule('server/authorization.ts',{'./storage':storageModule});
async function httpFixture(){
  const f=await fixture();let reads=0;
  const servicePort={
    getRevision:async(_db,id,version)=>{reads++;assert.ok(Number.isInteger(version));return f.sources.get(m.pinKey({id,revision:version}))||null;},
    snapshot:async(_db,seq)=>{reads++;assert.equal(seq,10);return f.rows;},
    watermark:async()=>{reads++;return 10;},
    domainErrorStatus:e=>e instanceof v1.DomainError?422:e instanceof storageModule.HttpError?e.status:503,
  };
  const newService = await loadTsModule('server/prosopography-service.ts',{'../domain/prosopography/loader':m,'./catalogue-service':servicePort});
  const router = await loadTsModule('server/admin-router.ts',{
    './authorization':authModule,'./storage':storageModule,'./catalogue-service':servicePort,'./prosopography-service':newService,
    '../domain/catalogue':v1,'../domain/revisions':rev,'./backup-service':{},'./bootstrap-service':{},'./import-service':{},'./publication-service':{},'./reader-links':{},'../admin/index.html?raw':'<html>Admin</html>','./generated/reader.html?raw':'<html>Reader</html>',
  });
  const db={prepare:()=>{throw new Error('Unexpected database operation');}};
  return {f,reads:()=>reads,router:router.catalogueRouter,env:{DB:db,BUCKET:{},ADMIN_OWNER_ID:'owner-test'}};
}
function request(suffix='',headers={'oai-authenticated-user-id':'owner-test'},method='GET'){
  return new Request('https://example.test/api/admin/prosopography/person:fixture'+suffix,{headers,method});
}
test('HTTP: anonymous requests fail before any data reads',async()=>{const h=await httpFixture();const r=await h.router(request('',{}),h.env);assert.equal(r.status,401);assert.equal(h.reads(),0);});
test('HTTP: a non-owner cannot retrieve private research data',async()=>{const h=await httpFixture();const r=await h.router(request('',{'oai-authenticated-user-id':'other-user'}),h.env);assert.equal(r.status,403);assert.equal(h.reads(),0);assert.equal((await r.text()).includes('原文'),false);});
test('HTTP: owner receives a no-store read-only research preview',async()=>{const h=await httpFixture();const r=await h.router(request('?year=202'),h.env);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');const body=await r.json();assert.equal(body.access,'owner-only');assert.equal(body.persistence,'none');assert.equal(body.presence[0].status,'unknown');assert.equal(h.reads(),3);});
test('HTTP: HEAD has no research payload',async()=>{const h=await httpFixture();const r=await h.router(request('',undefined,'HEAD'),h.env);assert.equal(r.status,200);assert.equal(await r.text(),'');});
test('HTTP: explicit valid-origin POST is still read-only and rejected',async()=>{const h=await httpFixture();const r=await h.router(request('',{'oai-authenticated-user-id':'owner-test',origin:'https://example.test','x-catalogue-request':'1','sec-fetch-site':'same-origin'},'POST'),h.env);assert.equal(r.status,405);assert.equal(h.reads(),0);});
test('HTTP: cross-origin mutations remain blocked by the existing guard',async()=>{const h=await httpFixture();const r=await h.router(request('',{'oai-authenticated-user-id':'owner-test',origin:'https://elsewhere.test','x-catalogue-request':'1'},'POST'),h.env);assert.equal(r.status,403);assert.equal(h.reads(),0);});
test('HTTP: RSC action headers cannot bypass the read-only handler',async()=>{const h=await httpFixture();const r=await h.router(request('',{'oai-authenticated-user-id':'owner-test','next-action':'anything'}),h.env);assert.equal(r.status,405);assert.equal(h.reads(),0);});
test('HTTP: malformed or zero-year query returns a validation error',async()=>{const h=await httpFixture();const r=await h.router(request('?year=0'),h.env);assert.equal(r.status,422);assert.equal(h.reads(),1);});
test('HTTP: research payload is not added to the reader namespace',async()=>{const h=await httpFixture();const r=await h.router(new Request('https://example.test/reader/prosopography/person:fixture'),h.env);assert.equal(r.status,404);assert.equal(h.reads(),0);});
test('HTTP: URLs outside the admin and reader routing scope remain untouched',async()=>{const h=await httpFixture();assert.equal(await h.router(new Request('https://example.test/prosopography'),h.env),null);assert.equal(h.reads(),0);});
test('batch presence matches individual queries without repeated graph validation',()=>{const g=graph();assert.deepEqual(m.officePresenceInYear(g,202),[presence(g,202)]);});
test('point attestation contradicting the selected boundaries is not made certain',()=>{const g=graph();addClaim(g,'claim:outside-seen','attestation',time(199));g.tenures[0].selected.attestations=['claim:outside-seen'];assert.equal(presence(g,199).status,'unknown');});
