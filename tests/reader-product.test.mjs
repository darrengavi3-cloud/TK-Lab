import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { MODULE_KEYS, validRouteHash, acceptedRouteMessage } from '../atlas/assets/app/route-contract.js';
import { parseRouteHash, serializeRouteHash, createReadingTrail } from '../atlas/assets/app/shell.js';
import { createReaderBootMonitor } from '../app/reader-boot.ts';
import { assertReaderPeople, expectedReaderPersonIds, assertReaderPortraits, expectedPortraitResolutions } from './helpers/reviewed-boundaries.mjs';

const root=fileURLToPath(new URL('../atlas/',import.meta.url));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scope={window:{},URLSearchParams};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/app/shiyuan.js'),'utf8'),scope);
const source=scope.window.SGZ_UI_MODULES.shiyuan;

test('all visible modules share host routes and reading return',()=>{
  const nav=html.slice(html.indexOf('    const v56ModuleItems = ['),html.indexOf('    const primaryModuleItems'));
  assert.deepEqual([...nav.matchAll(/key:'([^']+)'/g)].map(m=>m[1]).sort(),[...MODULE_KEYS].sort());
  for(const routeKey of MODULE_KEYS){
    const hash=serializeRouteHash(routeKey,{q:'王凌',volume:'三国志#28'});
    assert.ok(validRouteHash(hash));assert.equal(parseRouteHash(hash).module,routeKey);
    const frame={};assert.ok(acceptedRouteMessage({source:frame,origin:'https://reader.test',data:{type:'guanshitai:route',hash,mode:'push'}},frame,'https://reader.test'));
    const trail=createReadingTrail();trail.remember(hash,'卷次',220);assert.equal(trail.take().hash,hash);
  }
  for(const hash of ['#shiyuan/unknown','#shiyuan\n','#shiyuan?'+ 'x'.repeat(4096),'https://reader.test/#shiyuan'])assert.equal(validRouteHash(hash),false);
});

test('source filters narrow details and preserve citations',()=>{
  const index=source.buildSourceVolumes([{kind:'appointment',id:'a',title:'王凌',citations:['《三国志》卷二十八']},{kind:'battle',id:'b',title:'战事',citations:['《三国志》卷二十八']},{kind:'epigraphy',id:'e',title:'碑文',citations:['《全晋文》卷二']}]);
  const original=JSON.stringify(index),rows=source.selectSourceVolumes(index.volumes,{kind:'appointment'});
  assert.equal(rows.length,1);assert.equal(rows[0].entryCount,1);assert.equal(rows[0].entries[0].id,'a');assert.equal(rows[0].kinds.battle,undefined);
  assert.equal(source.selectSourceVolumes(index.volumes,{query:'王凌'})[0].entryCount,1);
  assert.equal(source.selectSourceVolumes(index.volumes,{work:'三国志',kind:'epigraphy'}).length,0);
  assert.equal(JSON.stringify(index),original);
});

test('pagination handles empty, invalid and out-of-range pages',()=>{
  const rows=Array.from({length:29},(_,id)=>({id}));
  for(const page of [NaN,Infinity,-1])assert.equal(source.paginateSourceVolumes(rows,page).page,1);
  assert.equal(source.paginateSourceVolumes(rows,999).rows.length,5);
  assert.equal(source.paginateSourceVolumes(rows,999).page,3);
  assert.equal(source.paginateSourceVolumes([],999).page,1);
});

test('source links use reviewed identities and encode detail IDs',()=>{
  assert.equal(source.sourceEntryRoute({kind:'appointment',id:'a'},[]),'');
  assert.equal(parseRouteHash(source.sourceEntryRoute({kind:'appointment',id:'a'},[{appointmentId:'a',personId:'person:p1'}])).params.get('person'),'person:p1');
  for(const [kind,routeKey] of [['battle','battle'],['epigraphy','jinshi'],['shihuo','shihuo']]){
    const state=parseRouteHash(source.sourceEntryRoute({kind,id:'a?&/#'}));assert.equal(state.module,routeKey);assert.equal(state.params.get('id'),'a?&/#');
    if(kind==='shihuo'){assert.equal(state.params.get('scope'),'all');assert.equal(state.params.get('discussion'),'1');}
  }
  assert.equal(source.sourceEntryRoute({kind:'unknown',id:'a'}),'');
});

test('actual route fields restore source filters, selection and page',()=>{
  const fields=html.slice(html.indexOf('    function routeExtraFields('),html.indexOf('    function notifyHostRoute('));
  const ctx={URLSearchParams};for(const key of ['shiyuanQuery','shiyuanWork','shiyuanKind','shiyuanVolumeId','shiyuanPage'])ctx[key]={value:''};
  vm.runInNewContext(fields+';this.restore=applyRouteExtras;',ctx);
  ctx.restore('shiyuan',new URLSearchParams('q=王&work=三国志&kind=appointment&volume=三国志%2328&page=2'));
  assert.equal(ctx.shiyuanVolumeId.value,'三国志#28');assert.equal(ctx.shiyuanPage.value,2);assert.equal(ctx.shiyuanQuery.value,'王');
  ctx.restore('shiyuan',new URLSearchParams());assert.equal(ctx.shiyuanVolumeId.value,'');assert.equal(ctx.shiyuanWork.value,'all');
});

test('boot timeout accepts late readiness and ignores disposed timers',()=>{
  const states=[],timers=[],schedule=(fn,delay)=>{assert.equal(delay,20000);timers.push(fn);return timers.length;};
  const monitor=createReaderBootMonitor(state=>states.push(state),schedule,()=>{});
  timers[0]();assert.deepEqual(states,['error']);monitor.ready();monitor.fail();timers[0]();assert.deepEqual(states,['error','ready']);
  monitor.dispose();monitor.ready();assert.equal(states.length,2);
  const abandoned=createReaderBootMonitor(state=>states.push(state),schedule,()=>{});abandoned.dispose();timers[1]();assert.equal(states.length,2);
});

test('host rejects foreign readiness and prevents handshake loops',()=>{
  const page=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  const listener=page.slice(page.indexOf('    const receiveRoute ='),page.indexOf('    window.addEventListener("message"'));
  const inner={},origin='https://reader.test';let ready=0,sent=0;
  const ctx={frame:{current:{contentWindow:inner}},location:{origin},boot:{ready(){ready++;}},acceptedRouteMessage};
  ctx.sendRoute=()=>{sent++;ctx.receive({source:inner,origin,data:{type:'guanshitai:ready'}});};
  vm.runInNewContext('let frameReady=false;'+listener.replace('(event: MessageEvent)','(event)')+';this.receive=receiveRoute;',ctx);
  ctx.receive({source:{},origin,data:{type:'guanshitai:ready'}});ctx.receive({source:inner,origin:'https://other.test',data:{type:'guanshitai:ready'}});
  assert.equal(ready,0);ctx.receive({source:inner,origin,data:{type:'guanshitai:ready'}});assert.equal(sent,1);assert.equal(ready,2);
});

test('retry restores selected detail without reporting stale failure',async()=>{
  const retry=html.slice(html.indexOf('    function retryActiveModule()'),html.indexOf('    const epigraphicPolities'));
  let restored=0,prepared=0,rejectRequest;const errors=[];
  const ctx={activeModule:{value:'shiyuan'},parseUrlState:()=>({module:'shiyuan'}),applyUrlState:()=>{restored++;return new Promise((_,reject)=>{rejectRequest=reject;});},prepareSectionRuntimeData:async()=>{prepared++;},ElementPlus:{ElMessage:{error:message=>errors.push(message)}}};
  vm.runInNewContext(retry+';this.retry=retryActiveModule;',ctx);ctx.retry();assert.equal(restored,1);
  ctx.activeModule.value='people';rejectRequest(new Error('old'));await Promise.resolve();assert.equal(errors.length,0);
  ctx.retry();await Promise.resolve();assert.equal(prepared,1);
  ctx.activeModule.value='shiyuan';ctx.retry();rejectRequest(new Error('current'));await Promise.resolve();assert.equal(errors.length,1);
});

test('single HTML resolves shared imports once and retains navigation',()=>{
  const builder=fs.readFileSync(path.join(root,'scripts/build-portable-export.mjs'),'utf8');
  const ctx={root,fs,path};vm.runInNewContext(builder.slice(builder.indexOf('function classicUiModule('),builder.indexOf('function buildReaderLightHtml('))+';this.convert=classicUiModule;',ctx);
  const reader={window:{},URLSearchParams};vm.runInNewContext(ctx.convert('shell',fs.readFileSync(path.join(root,'assets/app/shell.js'),'utf8')),reader);
  const shell=reader.window.SGZ_UI_MODULES.shell;assert.deepEqual(Array.from(shell.MODULE_KEYS),Array.from(MODULE_KEYS));assert.ok(shell.validRouteHash('#shiyuan?volume=三国志%2328'));
  const trail=shell.createReadingTrail();trail.remember('#shiyuan','史源',30);assert.equal(trail.take().hash,'#shiyuan');assert.equal(typeof shell.createPersonNavigator,'function');
});

test('identity and portrait gates reject same-count replacements',()=>{
  const people=expectedReaderPersonIds.map(personId=>({personId}));assertReaderPeople(people);people[0]={personId:'person:unreviewed'};assert.throws(()=>assertReaderPeople(people));
  const portraits=expectedPortraitResolutions.map(row=>({...row}));assertReaderPortraits(portraits);portraits[0].portraitId='portrait:unreviewed';assert.throws(()=>assertReaderPortraits(portraits));
});


test('global search prepares lazy domains, opens stable records and keeps pending records visible by default',()=>{
  const palette=html.slice(html.indexOf('    const commandPaletteSections='),html.indexOf('    watch(showSearch,visible=>'));
  assert.match(palette,/all:\['people','fangzhen','battle','shihuo','jinshi'\]/);
  assert.match(palette,/Promise\.allSettled\(sections\.map\(section=>prepareSectionRuntimeData\(section\)\)\)/);
  assert.match(palette,/prepareCommandPaletteData\(searchState\.scope\)/);
  const actions=html.slice(html.indexOf("      if(scope==='all'||scope==='office')"),html.indexOf("      if(scope==='all'||scope==='hydronym')"));
  assert.match(actions,/selectFangzhenWorkbenchRecord\(r,\{historyMode:'push'\}\)/);
  assert.match(actions,/openEpigraphicDetail\(r\)/);
  assert.match(actions,/openShihuoRecord\(r\)/);
  const route=html.slice(html.indexOf('    function routeExtraFields('),html.indexOf('    function applyRouteExtras('));
  assert.match(route,/verified:\[fangzhenOnlyVerified,false\]/);
  const filters=html.slice(html.indexOf('    function readingFilterDefinitions()'),html.indexOf('    const readingFilterTags='));
  assert.match(filters,/field\('verified','范围',fangzhenOnlyVerified,false/);
});
