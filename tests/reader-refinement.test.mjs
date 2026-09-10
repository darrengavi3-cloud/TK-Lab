import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { projectShihuo } from '../atlas/scripts/shihuo-publication.mjs';
import { selectShihuoRecords, paginateShihuo } from '../atlas/assets/app/shihuo.js';
import { createReadingTrail } from '../atlas/assets/app/shell.js';

const root=new URL('../atlas/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const context={window:{}};
vm.runInNewContext(read('data/shihuo-records.js'),context);
const source=JSON.parse(JSON.stringify(context.window.SGZ_SHIHUO_DATA));
const review=JSON.parse(read('data/v83-shihuo-display-review.json'));

test('food withdrawal is closed across records, events and metrics while source is preserved',()=>{
  const before=JSON.stringify(source);
  const result=projectShihuo(source,review);
  assert.equal(result.records.length,70);
  assert.equal(result.household.length,7);
  for(const row of [...result.records,...result.events,...result.household]){
    assert.notEqual(row.id,'sh_263_hukou_wu');
    assert.notEqual(row.recordId,'sh_263_hukou_wu');
  }
  assert.equal(JSON.stringify(source),before);
  assert.equal(source.records.length,71);
  assert.equal(source.household.length,8);
  const altered=structuredClone(source);altered.records[0].detail+='改';
  assert.throws(()=>projectShihuo(altered,review),/重新核对/);
});

test('food facts retain independent source and uncertain dates without silently upgrading estimates',()=>{
  const result=projectShihuo(source,review);
  const c=result.records.find(r=>r.id==='sh_227_cangci');
  assert.equal(c.year,null);
  assert.match(c.yearText,/年份未详/);
  assert.ok(c.sourceTitle&&c.citations[0].url&&c.citations[0].quote);
  assert.doesNotMatch(c.detail,/地主阶级|227/);
  const wu=result.records.find(r=>r.id==='sh_253_wu_bing');
  assert.doesNotMatch(wu.detail,/三十万|负担极重/);
  assert.match(wu.discussion,/三十万/);
  assert.ok(result.records.every(r=>r.sourceTitle));
  assert.ok(result.household.every(r=>r.sourceTitle&&r.citations.length));
  const ordinary=selectShihuoRecords(result.records);
  assert.ok(!ordinary.some(r=>r.id==='sh_231_shibing'||r.id==='sh_263_hukou_wei'));
  const discussion=selectShihuoRecords(result.records,{discussion:true});
  assert.ok(discussion.some(r=>r.id==='sh_231_shibing'));
  assert.equal(selectShihuoRecords(result.records,{query:'不可能命中的测试'}).length,0);
  assert.equal(paginateShihuo(ordinary,999).page,Math.ceil(ordinary.length/12));
});

test('cross-module reading trail restores exact filtered context and rejects external destinations',()=>{
  const trail=createReadingTrail(2);
  trail.remember('#people?q=王&content=biography&page=3&person=p1','人物记',520);
  trail.remember('#fangzhen?verified=0&archive=wei&page=2&id=f1','州镇表',240);
  trail.remember('https://other.example/','外部',0);
  assert.equal(trail.take().hash,'#fangzhen?verified=0&archive=wei&page=2&id=f1');
  assert.deepEqual(trail.take(),{hash:'#people?q=王&content=biography&page=3&person=p1',label:'人物记',scrollY:520});
  assert.equal(trail.take(),null);
});

test('food pagination reacts when its lazy module and records finish loading',()=>{
  const vueContext={};
  vm.runInNewContext(read('assets/vendor/vue/vue.global.min.js'),vueContext);
  const {ref,computed}=vueContext.Vue;
  const context={computed,filteredShihuoRecords:ref([]),shihuoPage:ref(1),window:{SGZ_UI_MODULES:{}}};
  const html=read('index.html');
  const code=html.slice(html.indexOf('    const shihuoPagination ='),html.indexOf('    const shihuoPrimaryDetail ='));
  vm.runInNewContext(code+';this.pagination=shihuoPagination;',context);
  assert.equal(context.pagination.value.total,0);
  context.window.SGZ_UI_MODULES.shihuo={paginateShihuo};
  context.filteredShihuoRecords.value=Array.from({length:14},(_,index)=>({id:index}));
  assert.equal(context.pagination.value.total,14);
  assert.equal(context.pagination.value.rows.length,12);
  context.shihuoPage.value=2;
  assert.equal(context.pagination.value.rows.length,2);
});

test('actual reading-return handler uses browser history even when editor history exists', async()=>{
  const html=read('index.html');
  const code=html.slice(html.indexOf('    async function returnToReading(){'),html.indexOf('    async function openOfficeHolders('));
  const trail=createReadingTrail();
  trail.remember('#people?content=biography&page=2&person=p1','人物记',420);
  const calls=[];
  const context={readingScrollElement:()=>null,readingTrail:trail,readingReturn:{value:null},history:{stack:[],index:-1},window:{history:{replaceState:(_state,_title,hash)=>calls.push(['route',hash])},scrollTo:value=>calls.push(['scroll',value.top])},applyUrlState:async()=>calls.push(['restore']),nextTick:async()=>{}};
  vm.runInNewContext(code+';this.run=returnToReading;',context);
  await context.run();
  assert.deepEqual(calls,[['route','#people?content=biography&page=2&person=p1'],['restore'],['scroll',420]]);
  assert.equal(context.history.index,-1);
});

test('office-holder handler ignores a late load after navigation changes', async()=>{
  const html=read('index.html');
  const code=html.slice(html.indexOf("    async function openOfficeHolders(tab='current')"),html.indexOf('    watch(showGeneralTitles,'));
  let finish;
  const ready=new Promise(resolve=>{finish=resolve;});
  const context={officialsTab:{value:'current'},activeModule:{value:'offices'},urlApplyGeneration:1,showOfficials:{value:false},switchModule:()=>{},prepareSectionRuntimeData:()=>ready,scheduleUrlState:()=>{throw new Error('late route update');},ElementPlus:{ElMessage:{error:error=>{throw new Error(error);}}}};
  vm.runInNewContext(code+';this.run=openOfficeHolders;',context);
  const pending=context.run('archive');
  context.activeModule.value='people';context.urlApplyGeneration++;
  finish();await pending;
  assert.equal(context.showOfficials.value,false);
});

test('food all-period scope and explicit candidate inclusion survive actual URL handlers',()=>{
  const html=read('index.html');
  const serialize=html.slice(html.indexOf('    function currentUrlState(){'),html.indexOf("    let pendingUrlMode='replace'"));
  const restore=html.slice(html.indexOf('    function applyRouteExtras(module,params){'),html.indexOf('    function notifyHostRoute('));
  const candidate={value:true};
  const context={viewportWidth:{value:1200},showPeopleDetail:{value:false},showFangzhenDetail:{value:false},showEpigraphicDetail:{value:false},showShihuoDetail:{value:false},URLSearchParams,activeModule:{value:'shihuo'},shihuoView:{value:'institution'},shihuoPolity:{value:'all'},shihuoScope:{value:'all'},routeExtraFields:module=>module==='fangzhen'?{verified:[candidate,true]}:{},window:{}};
  vm.runInNewContext(serialize+restore+';this.serialize=currentUrlState;this.restore=applyRouteExtras;',context);
  assert.equal(context.serialize(),'#shihuo?scope=all');
  context.viewportWidth.value=390;assert.equal(context.serialize(),'#shihuo?scope=all&list=1');
  context.showShihuoDetail.value=true;assert.equal(context.serialize(),'#shihuo?scope=all');
  context.restore('fangzhen',new URLSearchParams('verified=0'));
  assert.equal(candidate.value,false);
  context.restore('fangzhen',new URLSearchParams());
  assert.equal(candidate.value,true);
});

test('shared filters count, name and clear only active conditions across reader modules',()=>{
  const html=read('index.html');
  const code=html.slice(html.indexOf('    function readingFilterDefinitions(){'),html.indexOf('    function closeReadingDetail('));
  const ctx={activeModule:{value:'people'},workspaceMode:{value:'reader'},OFFICE_GROUP_DEFS:[{key:'central',label:'中央'}],computed:fn=>({get value(){return fn();}}),canvasFilters:{rank:'',special:'',hideNonCore:false,showArchived:false,showHidden:false},fangzhenArchiveDef:{value:{label:'魏'}},selectFangzhenArchive:key=>{ctx.fangzhenArchiveKey.value=key;}};
  for(const key of ['peoplePolity','peopleKind','peopleContent','peopleEra','peopleServiceDomain','peopleInstitutionType','peopleSource','peopleEvidence','fangzhenArchiveKey','fangzhenLevel','fangzhenState','fangzhenRecordType','epigraphicEra','epigraphicPolity','epigraphicType','epigraphicInscriptionStatus','epigraphicArchive','officeGroup','officeSub','officeSub2'])ctx[key]={value:'all'};
  ctx.peopleOnlyPortrait={value:false};ctx.peopleYear={value:null};ctx.fangzhenOnlyVerified={value:true};ctx.timelineEnabled={value:false};ctx.timelineYear={value:220};
  vm.runInNewContext(code+';this.tags=readingFilterTags;this.clear=clearReadingFilters;',ctx);
  assert.equal(ctx.tags.value.length,0);
  ctx.peopleContent.value='biography';ctx.peopleYear.value=260;
  assert.deepEqual(Array.from(ctx.tags.value,t=>t.label),['内容：有小传','年份：260']);
  ctx.tags.value[0].clear();assert.equal(ctx.peopleYear.value,260);
  ctx.clear();assert.equal(ctx.peopleYear.value,null);
  ctx.activeModule.value='fangzhen';ctx.fangzhenOnlyVerified.value=false;
  assert.equal(ctx.tags.value[0].label,'范围：含待审资料');
  ctx.clear();assert.equal(ctx.fangzhenOnlyVerified.value,true);
  ctx.activeModule.value='jinshi';ctx.epigraphicEra.value='三国';
  assert.equal(ctx.tags.value[0].label,'时代：三国');
  ctx.activeModule.value='offices';ctx.officeGroup.value='central';ctx.officeSub.value='列卿';
  ctx.tags.value[0].clear();assert.equal(ctx.officeSub.value,'all');
});
