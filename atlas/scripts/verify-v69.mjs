import { reviewedReaderScope } from './person-identity-publication.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const expectedReaderCount = reviewedReaderScope(...['v62-reader-scope.json', 'v71-person-identity-review.json'].map(name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8')))).length;
const readJson=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};

const html=read('index.html');
const modulesCss=read('assets/ui/modules.css');
const design=read('DESIGN.md');
const ux=read('UX-CONTRACT.md');
const readerPeople=readJson('data/v63-reader-people.json');
const registry=readJson('data/v63-person-registry.json');
const profiles=readJson('data/v69-person-profiles.json');
const candidates=readJson('data/v69-portrait-candidates.json');
const production=readJson('data/v69-portrait-production.json');
const portraits=readJson('data/portrait-manifest.json');
const battleLinks=readJson('data/v69-battle-person-links.json');
const fangzhen=readJson('data/v69-fangzhen-reader.json');
const epigraphy=readJson('data/v69-epigraphic-records.json');
const epigraphyAudit=readJson('data/v69-epigraphy-audit.json');
const epigraphySearch=readJson('data/v69-epigraphy-search-cache.json');
const removals=readJson('data/v69-epigraphy-removals.json');
const readerResidencesSource=read('exports/观史台-读者版/data/office-residences.js');
const readerScope=readJson('data/v62-reader-scope.json');

const people=readerPeople.people||[];
const peopleIds=new Set(people.map(person=>person.personId));
const dingId='person:peerage:96a323e97ca0c2fa';
assert(people.length===expectedReaderCount&&peopleIds.size===expectedReaderCount,'人物读者注册表未覆盖唯一审定 personId');
assert(readerScope.summary?.people===2096&&readerScope.people?.length===2096,'V62 回退阅读范围未冻结为 2096 人');
assert(people.find(person=>person.personId===dingId)?.name==='丁冲','丁冲稳定 ID 的规范姓名未修正');
assert(!people.some(person=>person.name==='丁中'||(person.aliases||[]).includes('丁中')),'旧错误值丁中仍进入读者人物检索');
for(const excludedName of ['安西','安东大','喬安北','安南']) assert(!people.some(person=>person.name===excludedName||((person.aliases||[]).includes(excludedName))),`非人物词条${excludedName}仍进入读者人物注册表`);
assert(['安西','安东大','喬安北','安南'].every(name=>(registry.excludedPeople||[]).some(row=>row.name===name&&row.publicationStatus==='suppressed')),'非人物排除台账不完整');
assert((registry.people||[]).find(person=>person.personId===dingId)?.name==='丁冲','审校注册表中的丁冲规范姓名异常');

const profileRows=profiles.profiles||[];
assert(profileRows.length===expectedReaderCount&&new Set(profileRows.map(row=>row.personId)).size===expectedReaderCount,'V69 人物档案未覆盖全部人物');
assert(profileRows.every(row=>!row.templeName||row.isRuler===true),'非君主人物出现庙号');
assert((profiles.summary?.lifeEvents||0)===(profileRows.flatMap(row=>row.lifeEvents||[]).length),'人物经历汇总与明细不闭合');

const candidateRows=candidates.candidates||[];
const portraitPersonIds=new Set(Object.keys(portraits.byPersonId||{}));
const portraitLegacyIds=new Set(Object.keys(portraits.legacyPersonIdAliases||{}));
const v69PortraitPersonIds=new Set(Object.values(portraits.assetsById||{})
  .filter(asset=>asset.portraitKind==='ui-illustration-v69'&&asset.designStatus==='figma-design'&&asset.interfaceOnly===true)
  .map(asset=>asset.personId)
  .filter(Boolean));
const nameCounts=new Map();
for(const person of people)nameCounts.set(person.name,(nameCounts.get(person.name)||0)+1);
assert(candidateRows.length===100,'新立绘候选不为恰好 100 人');
assert(new Set(candidateRows.map(row=>row.personId)).size===100&&new Set(candidateRows.map(row=>row.name)).size===100,'新立绘候选存在重复 ID 或姓名');
assert(candidateRows.every(row=>peopleIds.has(row.personId)&&nameCounts.get(row.name)===1),'立绘候选存在未注册或同名冲突人物');
const productionRows=production.records||[];
const productionByPersonId=new Map(productionRows.map(row=>[row.personId,row]));
assert(production.fileKey==='gvWRC5GHHSgd8QX9b2VJgo'&&production.seat==='Full','Figma 生产台账未记录 Full 席位');
assert(productionRows.length===Number(candidates.figma?.completed||0),'Figma 生产台账与候选完成数不一致');
assert(production.status==='complete'
  ? candidateRows.every(row=>v69PortraitPersonIds.has(row.personId))
  : candidateRows.every(row=>!portraitPersonIds.has(row.personId)&&!portraitLegacyIds.has(row.personId)),
  production.status==='complete'?'V69 正式立绘未覆盖全部候选':'立绘候选已存在正式立绘');
assert(candidateRows.every(row=>row.interfaceOnly===true),'立绘候选缺少 interfaceOnly 边界');
assert(candidateRows.every(row=>{
  const mapped=productionByPersonId.get(row.personId);
  if (!mapped) return row.designStatus==='pending-editor-seat'&&row.designRef?.nodeId===null&&row.designRef?.componentId===null&&row.productionStatus==='candidate-frozen';
  return row.designStatus==='figma-design'&&row.productionStatus==='ready'&&row.designRef?.nodeId===mapped.nodeId&&row.designRef?.componentId===mapped.componentId&&row.assetPath===mapped.assetPath;
}),'立绘候选与实际 Figma 生产映射不一致');
assert(productionRows.every(row=>row.status==='ready'&&/^\d+:\d+$/.test(String(row.nodeId||''))&&/^\d+:\d+$/.test(String(row.componentId||''))),'Figma 生产台账存在无效节点或未完成记录');
assert(candidates.figma?.seat==='Full'&&candidates.figma?.status===production.status,'候选摘要未同步当前 Figma 生产状态');
const v70PortraitCount=Object.values(portraits.assetsById||{}).filter(asset=>asset.portraitKind==='ui-illustration-v70').length;
const expectedPublishedPortraits=(production.status==='complete' ? 375 : 275)+v70PortraitCount;
assert(portraits.summary?.assetRecords===expectedPublishedPortraits&&candidates.summary?.expectedAfterProduction===375,'读者立绘数量与当前生产阶段不一致');

const dispositions=battleLinks.dispositions||[];
const publicLinks=battleLinks.links||[];
assert(dispositions.length===62&&new Set(dispositions.map(row=>row.recordId)).size===62,'战事人物处置未覆盖 62 条记录');
assert(dispositions.every(row=>['已关联','无明确人物','歧义保留'].includes(row.disposition)),'战事人物处置出现非法状态');
assert(publicLinks.every(link=>peopleIds.has(link.personId)),'战事人物链接存在无法解析的 personId');
assert(html.includes('battlePersonLinksFor')&&html.includes('openBattlePerson')&&html.includes('涉及人物'),'战事纪未接入人物双向跳转界面');

const fangzhenRows=fangzhen.records||[];
const dynastyCounts=Object.fromEntries(['后汉','季汉','魏','吴','西晋','东晋'].map(name=>[name,fangzhenRows.filter(row=>row.dynastyLabel===name).length]));
assert(fangzhenRows.length===523&&new Set(fangzhenRows.map(row=>row.id)).size===523,'州镇主表不为 523 条唯一记录');
assert(fangzhenRows.filter(row=>row.readerDisplayStatus==='verified').length===45,'州镇已核记录不为 45 条');
assert(fangzhenRows.filter(row=>row.readerDisplayStatus==='candidate').length===478,'州镇待审记录不为 478 条');
assert(JSON.stringify(dynastyCounts)===JSON.stringify({后汉:6,季汉:99,魏:173,吴:213,西晋:31,东晋:1}),'州镇六朝数量不符合 V69 契约');
assert(fangzhenRows.filter(row=>row.readerDisplayStatus==='candidate').every(row=>row.seat===undefined&&row.seatName===undefined),'待审州镇记录泄漏未经核实治所');
assert(fangzhenRows.every(row=>['州','郡','方镇'].includes(row.jurisdictionKind))&&fangzhenRows.some(row=>row.jurisdictionKind==='郡'),'州、郡、方镇未按独立辖区类型投影');
assert(!html.includes('相关历任长官')&&!html.includes("{id:'han-court-local',label:'地方行政'}"),'州镇重复长官区或朝堂地方行政卡片仍存在');
assert(html.includes("{key:'eastjin',label:'东晋'")&&html.includes('fangzhenHasResidence')&&html.includes('openFangzhenResidence'),'东晋标签或州郡府署入口未完成');
assert(html.includes("{{scope.row.readerDisplayStatus==='verified'?'已核':'待审'}}"),'州镇主表未显示已核／待审状态');
assert(html.includes("const requestedLevel=p.get('level')||'all'")&&html.includes("['all','州','郡','方镇'].includes(requestedLevel)"),'州镇无 level 参数时未稳定恢复全部辖区');
assert(html.includes("item.id==='residence:local:province'")&&html.includes("item.id==='residence:local:commandery'"),'州郡府署按钮未以真实定义为显示门槛');
assert(html.includes("switchModule('offices',{url:false})")&&html.includes("openCourtResidence(owner);"),'州郡府署入口未进入可见的职官府署视图');
assert(html.includes('courtResidenceIsLocal?courtResidencePopulatedRoles:courtResidence.roles')&&html.includes('v69-local-residence-definition'),'州郡府署仍会生成无实任人物的空席卡片');
assert(readerResidencesSource.includes('residence:local:province')&&readerResidencesSource.includes('residence:local:commandery'),'读者构建遗漏已建立的州府／郡府定义');

const epigraphicRows=epigraphy.records||[];
const inscriptionCount=epigraphicRows.filter(row=>String(row.inscription||'').trim()).length;
const epigraphicDynasties=Object.fromEntries(['后汉','季汉','魏','吴','西晋','东晋'].map(name=>[name,epigraphicRows.filter(row=>row.dynasty===name).length]));
assert(epigraphicRows.length===166&&new Set(epigraphicRows.map(row=>row.id)).size===166,'金石活动目录不为 166 条唯一记录');
assert(inscriptionCount===56&&epigraphicRows.length-inscriptionCount===110,'金石释文数量不为 56／110');
assert(JSON.stringify(epigraphicDynasties)===JSON.stringify({后汉:6,季汉:8,魏:20,吴:15,西晋:56,东晋:61}),'金石六朝数量不符合 V69 契约');
const removedIds=new Set(removals.removedIds||removals.removedRecordIds||removals.ids||[]);
assert(removedIds.size===22,'砖铭删除清单不为 22 个稳定 ID');
assert(epigraphicRows.every(row=>!removedIds.has(row.id)),'已删除砖铭仍在活动金石目录');
assert((epigraphyAudit.records||[]).every(row=>!removedIds.has(row.recordId||row.id)),'已删除砖铭仍在活动审校台账');
const searchRows=epigraphySearch.records||epigraphySearch.rows||epigraphySearch;
assert((Array.isArray(searchRows)?searchRows:[]).every(row=>!removedIds.has(row.recordId||row.id)),'已删除砖铭仍在活动检索缓存');
assert(html.includes("const epigraphicPolities = ['后汉','季汉','魏','吴','西晋','东晋']"),'金石政权筛选未拆为六朝');
assert((html.match(/!\['正文','释文'\]\.includes\(section\.label\)/g)||[]).length===2,'杜君碑同名释文章节去重未同时覆盖桌面和抽屉');

assert(html.includes("const moduleLoadState = reactive({offices:'ready',people:'idle'")&&html.includes('const moduleRuntimePromises = new Map()'),'模块加载状态或共享 Promise 缓存缺失');
assert(html.includes('scheduleV69ModulePrefetch')&&html.includes('@mouseenter="prefetchModule(item.key)"')&&html.includes('@touchstart.passive="prefetchModule(item.key)"'),'空闲／意图预取未接入导航');
assert(html.includes('moduleVisited.people')&&html.includes('v69-module-loading'),'模块保持挂载或首帧骨架未接入');
assert(modulesCss.includes('.v69-person-life-timeline')&&modulesCss.includes('.v69-review-status')&&modulesCss.includes('.v69-module-loading'),'V69 模块样式未进入稳定 modules.css 层');
assert(design.includes('## V69 人物档案、战事联动与资料清理')&&ux.includes('## V69 人物、战事、州镇与金石交互契约'),'V69 设计与交互契约未同步');

if(failures.length){
  console.error(JSON.stringify({ok:false,failures},null,2));
  process.exitCode=1;
}else{
  console.log(JSON.stringify({ok:true,people:expectedReaderCount,lifeEvents:profiles.summary.lifeEvents,portraitCandidates:100,portraitCompleted:productionRows.length,portraitAdditionsV70:v70PortraitCount,battleLinks:publicLinks.length,fangzhen:{records:523,verified:45,candidate:478,dynasties:dynastyCounts},epigraphy:{records:166,withInscription:56,withoutInscription:110,dynasties:epigraphicDynasties},figma:production.status},null,2));
}
