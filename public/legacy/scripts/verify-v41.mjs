import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(value,message)=>{if(!value) throw new Error(message);};
const run=(context,relative)=>new vm.Script(read(relative),{filename:relative}).runInContext(context);
const idsUnique=(rows,label)=>{
  const ids=rows.map(row=>row.id);
  assert(ids.every(Boolean),`${label}存在空 ID`);
  assert(new Set(ids).size===ids.length,`${label}存在重复 ID`);
};

const registry=JSON.parse(read('data/map-period-registry.json'));
const historyEvidence=JSON.parse(read('data/history-evidence.json'));
const correctionAudit=JSON.parse(read('data/v41-correction-audit.json'));
assert(registry.periods.length===16,'地图时期应为 16 期');
assert(registry.periods.every(period=>String(period.snapshotMoment||'').trim()),'地图时期缺少 snapshotMoment');
assert(historyEvidence.periods.length===16,'历史证据未覆盖 16 期');
assert(historyEvidence.periods.reduce((count,period)=>count+(period.claims||[]).length,0)===33,'行政断言应为 33 条');
idsUnique(registry.periods,'地图时期');
assert(correctionAudit.release==='V41' && correctionAudit.modules.length===7,'V41 纠错审计应覆盖七版块');
assert(new Set(correctionAudit.modules.map(module=>module.id)).size===7,'V41 纠错审计版块 ID 重复');
assert(correctionAudit.primaryTextChecks.length>=4,'V41 原典定位记录不足');

const dataContext={window:{}};
dataContext.window.window=dataContext.window;
vm.createContext(dataContext);
['data/research-model.js','data/epigraphic-records.js','data/person-biographies.js','data/person-portraits.js','data/battle-records.js'].forEach(file=>run(dataContext,file));
const model=dataContext.window.SGZResearchModel;
const epigraphic=dataContext.window.SGZ_EPIGRAPHIC_RECORDS.records;
const biographies=dataContext.window.SGZ_PERSON_BIOGRAPHIES;
const portraits=dataContext.window.SGZ_PERSON_PORTRAITS;
const battles=dataContext.window.SGZ_BATTLE_RECORDS;

assert(epigraphic.length===60,'金石录应保留 60 条');
assert(Object.keys(biographies).length===79,'人物记应保留 79 人');
assert(Object.keys(portraits).length===44,'人物立绘应保留 44 张索引');
assert(new Set(epigraphic.map(row=>row.polity)).size===4 && epigraphic.every(row=>['汉','魏','吴','晋'].includes(row.polity)),'金石录国名未统一');
idsUnique(epigraphic,'金石录');
assert(battles.events.length===43 && battles.battles.length===22 && battles.battlefields.length===12,'战事纪应为 43 条编年、22 场战役、12 个战场');
['events','battles','battlefields'].forEach(key=>idsUnique(battles[key],`战事纪 ${key}`));
const battleIds=new Set(battles.battles.map(row=>row.id));
assert(battles.events.filter(row=>row.battleId).every(row=>battleIds.has(row.battleId)),'编年 battleId 指向不存在的战役');

const html=read('index.html');
const templateStart=html.indexOf('template: `');
const templateEnd=html.indexOf('\n  `\n});',templateStart);
assert(templateStart>=0 && templateEnd>templateStart,'无法提取 V41 阅读界面模板');
const readingTemplate=html.slice(templateStart,templateEnd);
const forbiddenReadingLabels=[
  '史料校验','史实可信度','来源层级','置信度','研究状态','研究结论','史料状态','查看史料',
  '边界可信度','史料证据卡','文档考据','核心材料','资料来源','史料摘录','录入边界','史料出处',
  '数据审计','史料卡','待补','待核','已执行'
];
assert(forbiddenReadingLabels.every(label=>!readingTemplate.includes(label)),`阅读界面仍含禁用研究文案：${forbiddenReadingLabels.filter(label=>readingTemplate.includes(label)).join('、')}`);
assert(html.includes('battleRecords:cloneJSON(battleRecords)') && html.includes('shihuoEvents:cloneJSON(shihuoEventRecords.value)') && html.includes('mapPeriods:cloneJSON(historyMapPeriods)'),'完整 JSON 或本地缓存未保存 V41 补充数据');
assert(html.includes('restoreSupplementalPayload(migrated)') && html.includes('restoreSupplementalPayload(parsed)'),'完整 JSON 或缓存回导未恢复 V41 补充数据');
const dataStart=html.indexOf('const FACTIONS = [');
const dataEnd=html.indexOf('/* =========================================================================\n   Vue App',dataStart);
assert(dataStart>=0 && dataEnd>dataStart,'无法提取规范历史数据');
const appContext={console,window:{HISTORY_MAP_REGISTRY:registry},document:{getElementById:()=>({innerHTML:''})}};
appContext.window.window=appContext.window;
vm.createContext(appContext);
['data/research-model.js','data/wu-fangzhen-records.js','data/shu-fangzhen-records.js','data/fangzhen-term-supplement.js','data/han-bai-guan-zhi.js','data/fangzhen-seat-supplement.js'].forEach(file=>run(appContext,file));
new vm.Script(`${html.slice(dataStart,dataEnd)}
globalThis.__v41={trees:normalizeAndValidateTrees(buildPresets()),fangzhen:normalizeFangzhenRecords(FANGZHEN_PRESETS),food:SHIHUO_RECORDS,foodEvents:SHIHUO_EVENTS,household:SHIHUO_HOUSEHOLD};`,{filename:'v41-inline-data.js'}).runInContext(appContext);
const canonical=appContext.__v41;
const officeCount=Object.values(canonical.trees).reduce((count,group)=>count+group.office.length,0);
assert(officeCount===1406,`官职节点应为 1,406 个，当前 ${officeCount}`);
assert(canonical.fangzhen.length===504,'州镇职任应为 504 条');
assert(canonical.fangzhen.filter(row=>!String(row.seat||'').trim()).length===389,'缺治所职任应为 389 条');
assert(canonical.fangzhen.filter(row=>/未详|待考|未知|[?？]|约/.test(String(row.tenureText||row.sourceTenureText||''))).length===197,'含不确定任期限定的职任应为 197 条');
assert(canonical.fangzhen.every(row=>['汉','魏','吴','晋'].includes(row.polity)),'州镇表国名未统一');
idsUnique(canonical.fangzhen,'州镇表');
const officeFigures=Object.values(canonical.trees).flatMap(group=>group.office).flatMap(node=>node.figures||[]);
assert(officeFigures.every(figure=>!/[（(]|\d{3}/.test(String(figure.name||''))),'任期或注记仍被拼入人物姓名');

assert(canonical.food.length===71,'食货志校正后应为 71 条制度记录');
assert(canonical.foodEvents.length===19,'食货编年校正后应为 19 条');
assert(canonical.household.length===8,'食货户口数据应为 8 组');
idsUnique(canonical.food,'食货志');
idsUnique(canonical.foodEvents,'食货编年');
idsUnique(canonical.household,'食货户口');
const foodIds=new Set(canonical.food.map(row=>row.id));
assert(canonical.household.every(row=>foodIds.has(row.recordId)),'户口数据存在失效 recordId');
assert(!['sh_226_wubi','sh_221_zhizhi','sh_264_chu','sh_240_jin_tuntian','sh_234_dengai_tuntian','sh_203_hudi','sh_195_caocao'].some(id=>foodIds.has(id)),'食货志仍含已删除的重复或错误记录');
assert(canonical.food.find(row=>row.id==='sh_mingdi_wubi')?.year===null,'明帝复五铢不应伪定为 227 年');
assert(canonical.food.find(row=>row.id==='sh_243_dengai_tuntian')?.year===243,'邓艾淮上屯田年份未校正为 243');
assert(canonical.food.find(row=>row.id==='sh_204_hu_diao')?.year===204,'建安九年田租户调未校正为 204 年');
assert(canonical.food.find(row=>row.id==='sh_268_changping')?.year===268,'泰始四年常平仓未校正为 268 年');
assert(canonical.food.find(row=>row.id==='sh_xuzhou_caocao')?.year===null && canonical.food.find(row=>row.id==='sh_xuzhou_caocao')?.yearText.includes('193—194'),'徐州人口损失仍被误系为 195 年');
assert(canonical.foodEvents.filter(row=>row.recordId).every(row=>foodIds.has(row.recordId)),'食货编年存在失效 recordId');
assert(canonical.foodEvents.find(row=>row.id==='se_204_tax')?.recordId==='sh_204_hu_diao','田租户调编年未回指制度记录');
assert(canonical.foodEvents.find(row=>row.id==='se_268')?.recordId==='sh_268_changping','常平仓编年未回指制度记录');

const evidenceSample={id:'sample',name:'材料',note:'释读',disputeNote:'另一释读',sourceTitle:'《原典》',confidence:'存疑',researchStatus:'待核',evidence:{title:'《原典》'}};
const reading=model.projectForReading(evidenceSample);
assert(reading.name==='材料' && reading.note==='释读；异说：另一释读','阅读投影未保留自然异说说明');
assert(!model.readingMetaFields.some(field=>Object.hasOwn(reading,field)) && !Object.hasOwn(reading,'disputeNote'),'阅读投影仍含研究元数据');
assert(evidenceSample.sourceTitle==='《原典》' && evidenceSample.evidence.title==='《原典》','阅读投影修改了规范对象');
const projectedCorpus=model.projectForReading({
  trees:canonical.trees,fangzhen:canonical.fangzhen,food:canonical.food,foodEvents:canonical.foodEvents,
  household:canonical.household,epigraphic,biographies,battles,mapPeriods:registry.periods
});
const projectedText=JSON.stringify(projectedCorpus);
const forbiddenProjectedTerms=[...forbiddenReadingLabels,'本项目','履历归纳'];
assert(forbiddenProjectedTerms.every(term=>!projectedText.includes(term)),`动态阅读数据仍含禁用文案：${forbiddenProjectedTerms.filter(term=>projectedText.includes(term)).join('、')}`);
assert(!/"(?:evidence|sourceTitle|sourceDocument|sourceUrl|sourceLevel|sourceLocator|sourceExcerpt|confidence|researchStatus|auditStatus|sourceTenureText)"\s*:/.test(projectedText),'动态阅读数据仍含研究元数据键');
assert(JSON.stringify(canonical).includes('"sourceTitle"') && JSON.stringify(canonical).includes('"confidence"'),'规范数据未保留来源与判断字段');

const roundTripSource={schemaVersion:7,trees:{wei:{office:[{key:'root',kind:'root',name:'魏官制',sources:'《三国志》',confidence:'确定'}],noble:[]}},fangzhenRecords:[{id:'a',polity:'西晋',commander:'甲',title:'刺史',jurisdiction:'州',sourceTitle:'《晋书》',sourceExcerpt:'原文'}],battleRecords:{events:[{id:'event',battleId:'battle',sourceTitle:'《三国志》'}]},shihuoRecords:[{id:'food',sourceTitle:'《晋书》',confidence:'存疑'}],mapPeriods:[{id:'period',snapshotMoment:'年末态势',sourceIds:['source']} ]};
const first=model.migrate(roundTripSource);
const second=model.migrate(JSON.parse(JSON.stringify(first)));
assert(second.trees.wei.office[0].evidence.title==='《三国志》','JSON 往返丢失官职证据');
assert(second.fangzhenRecords[0].evidence.title==='《晋书》' && second.fangzhenRecords[0].evidence.excerpt==='原文','JSON 往返丢失州镇证据');
assert(second.fangzhenRecords[0].polity==='晋','旧国名迁移未归一为晋');
assert(second.battleRecords.events[0].sourceTitle==='《三国志》' && second.shihuoRecords[0].confidence==='存疑','JSON 往返丢失补充版块证据');
assert(second.mapPeriods[0].snapshotMoment==='年末态势' && second.mapPeriods[0].sourceIds[0]==='source','JSON 往返丢失地图快照元数据');

console.log('V41 数据与兼容性断言通过');
console.log(`官职 ${officeCount}；州镇 ${canonical.fangzhen.length}；人物 ${Object.keys(biographies).length}；头像 ${Object.keys(portraits).length}`);
console.log(`战事 ${battles.events.length}/${battles.battles.length}/${battles.battlefields.length}；金石 ${epigraphic.length}；食货 ${canonical.food.length}/${canonical.foodEvents.length}/${canonical.household.length}；地图 ${registry.periods.length} 期`);
