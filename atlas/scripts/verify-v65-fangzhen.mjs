import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const json=relative=>JSON.parse(read(relative));
const failures=[];
const assert=(condition,message)=>{if(!condition) failures.push(message);};

function loadRawRecordIds(){
  const html=read('index.html');
  const start=html.indexOf('const FACTIONS = [');
  const end=html.indexOf('/* =========================================================================\n   Vue App',start);
  if(start<0||end<=start){failures.push('无法从 index.html 提取州镇规范段');return [];}
  const context={console,window:{HISTORY_MAP_REGISTRY:json('data/map-period-registry.json')},document:{getElementById:()=>({innerHTML:''})}};
  context.window.window=context.window;
  vm.createContext(context);
  for(const relative of [
    'data/research-model.js','data/person-name-normalization.js','data/wu-fangzhen-records.js',
    'data/shu-fangzhen-records.js','data/fangzhen-term-supplement.js','data/v62-jin-fangzhen.js',
  ]) vm.runInContext(read(relative),context,{filename:relative,timeout:20_000});
  vm.runInContext(`${html.slice(start,end)}\nglobalThis.__ids=FANGZHEN_PRESETS.map(row=>String(row.id||''));`,context,{filename:'index.html#fangzhen',timeout:20_000});
  return Array.from(context.__ids||[]);
}

const audit=json('data/v65-fangzhen-audit.json');
const rawIds=loadRawRecordIds();
const rows=Array.isArray(audit.records)?audit.records:[];
const rowById=new Map(rows.map(row=>[row.recordId,row]));

assert(audit.schemaVersion==='V65','schemaVersion 不是 V65');
assert(audit.modelId==='sgz-v65-fangzhen-audit','modelId 不正确');
assert(audit.generatedAt==='2026-08-30','generatedAt 不是 2026-08-30');
assert(rows.length===533,`审校记录不是 533 条：${rows.length}`);
assert(rawIds.length===533,`当前州镇原始记录不是 533 条：${rawIds.length}`);
assert(new Set(rawIds).size===533,'原始州镇 recordId 不唯一');
assert(rowById.size===533,'V65 州镇审校 recordId 不唯一');
assert(rawIds.every(id=>rowById.has(id)),'V65 州镇审校未覆盖全部原始 recordId');
assert(rows.every(row=>rawIds.includes(row.recordId)),'V65 州镇审校混入非原始 recordId');

const wikipedia=rows.filter(row=>row.wikipediaDiscovery);
const originalMissing=rows.filter(row=>row.originalSource?.missingLocator||row.originalSource?.missingExcerpt);
const primaryVerified=rows.filter(row=>row.sourceVerification==='primary-verified');
const readerRows=rows.filter(row=>row.readerVisible);
const quotedPrimary=rows.filter(row=>row.sourceVerification==='quoted-primary-in-research-document');
assert(wikipedia.length===182,`Wikipedia 发现候选不是 182 条：${wikipedia.length}`);
assert(wikipedia.filter(row=>row.sourceVerification==='primary-verified').length===1,'Wikipedia 候选的原典已核数应为 1');
assert(wikipedia.filter(row=>row.sourceVerification==='discovery-only').length===181,'Wikipedia discovery-only 数应为 181');
assert(originalMissing.length===200,`原缺 sourceLocator/sourceExcerpt 不是 200 条：${originalMissing.length}`);
assert(originalMissing.filter(row=>row.sourceVerification==='primary-verified').length===19,'200 条原缺记录中应有 19 条原典收口');

for(const row of rows){
  assert(/^v65-fangzhen:/.test(row.auditId||''),`${row.recordId} 缺稳定 auditId`);
  assert(row.accessedAt==='2026-08-30',`${row.recordId} 访问日期不是 2026-08-30`);
  assert(['确定','推定','存疑','明确无候选','争议','排除'].includes(row.historicalDisposition),`${row.recordId} historicalDisposition 非法`);
  assert(['reader-visible','review-only'].includes(row.publicationStatus),`${row.recordId} publicationStatus 非法`);
  assert(Boolean(row.searchState),`${row.recordId} 缺 searchState`);
  assert(row.readerVisible===(row.publicationStatus==='reader-visible'),`${row.recordId} readerVisible 与 publicationStatus 不一致`);
  if(row.sourceVerification==='primary-verified'){
    assert(/^https:\/\//.test(row.primarySource?.sourceUrl||''),`${row.recordId} 原典已核但缺 URL`);
    assert(Boolean(row.primarySource?.sourceLocator),`${row.recordId} 原典已核但缺 locator`);
    assert(Boolean(row.primarySource?.sourceExcerpt),`${row.recordId} 原典已核但缺原文摘录`);
    assert(row.fieldMatchVerification?.status==='verified'&&row.fieldMatchVerification?.method&&row.fieldMatchVerification?.scope,`${row.recordId} 原典已核但未登记字段匹配方法与范围`);
  }
  if(row.wikipediaDiscovery&&row.sourceVerification!=='primary-verified'){
    assert(row.sourceVerification==='discovery-only',`${row.recordId} Wikipedia 未核原典却不是 discovery-only`);
    assert(row.publicationStatus==='review-only'&&!row.readerVisible,`${row.recordId} Wikipedia 单一线索错误进入读者态`);
    assert(['存疑','明确无候选'].includes(row.historicalDisposition),`${row.recordId} Wikipedia discovery-only 未保留不确定结论`);
  }
  if(row.originalSource?.missingLocator||row.originalSource?.missingExcerpt){
    const closedByPrimary=row.sourceVerification==='primary-verified'&&row.primarySource?.sourceLocator&&row.primarySource?.sourceExcerpt;
    const closedByReview=row.publicationStatus==='review-only'&&['存疑','明确无候选'].includes(row.historicalDisposition);
    assert(Boolean(closedByPrimary||closedByReview),`${row.recordId} 原缺条目未以原典或后台存疑收口`);
  }
}

assert(primaryVerified.length===48,`原典已核总数不是 48：${primaryVerified.length}`);
assert(quotedPrimary.length===172,'研究文档保留原典引句数不是 172');
assert(quotedPrimary.every(row=>row.publicationStatus==='review-only'&&!row.readerVisible),'仅凭研究文档引句的记录仍有进入读者态');
assert(rows.filter(row=>row.sourceVerification==='research-document-only').length===132,'仅研究文档数不是 132');
const expectedReaderRows=primaryVerified.filter(row=>
  row.fieldMatchVerification?.status==='verified'&&
  /^https:\/\//.test(row.primarySource?.sourceUrl||'')&&
  Boolean(row.primarySource?.sourceLocator)&&Boolean(row.primarySource?.sourceExcerpt)&&
  !['存疑','争议'].includes(row.historicalDisposition)
);
assert(readerRows.every(row=>row.sourceVerification==='primary-verified'),'读者态仍含非 primary-verified 州镇记录');
assert(readerRows.length===expectedReaderRows.length&&expectedReaderRows.every(row=>row.readerVisible),`读者可见记录未严格等于可发布原典集合：实际 ${readerRows.length}，应为 ${expectedReaderRows.length}`);

for(const id of ['fz_han_liuyan','fz_han_liuzhang','fz_han_taoqian','fz_han_lvbu_yan','fz_han_caocao_yan','fz_shu_lihui','fz_shu_mazhong','fz_shu_jiangwei_254','fz_shu_jiangwei_256','fz_shu_jiangwei_257','fz_shu_jiangwei_258','fz_wu_luxun','fz_jin_yanghu','fz_jin_duyu','fz_jin_taokan']){
  assert(rowById.get(id)?.sourceVerification==='primary-verified',`${id} 手工原典定位丢失`);
}
for(const id of ['fz_han_liubei_xu','fz_jin_liukun','fz_jin_zuti']){
  const row=rowById.get(id);
  assert(row?.sourceVerification==='primary-verified'&&row.historicalDisposition==='存疑'&&row.publicationStatus==='review-only',`${id} 官职可证但题名/年份冲突未保留后台`);
}
assert(rowById.get('fz_wu_lufan')?.sourceVerification==='discovery-only'&&rowById.get('fz_wu_lufan')?.publicationStatus==='review-only','吕范扬州牧仍是 Wikipedia 单一线索，不应进入读者态');
assert(/[凉涼]州/.test(rowById.get('fz_wei_cishi_5_0')?.primarySource?.sourceExcerpt||''),'Wikipedia 候选中唯一原典已核的邹岐凉州刺史定位不完整');
assert(rowById.get('fz_wei_cishi_9_1')?.sourceVerification==='discovery-only','邹岐徐州刺史不得误用凉州原文升级');
for(const id of ['fz_wu_doc_007','fz_wu_doc_008','fz_wu_doc_016']){
  const row=rowById.get(id);
  assert(row?.publicationStatus==='review-only'&&!row?.readerVisible,`${id} 问题记录不得公开`);
}

for(const [key,value] of Object.entries({
  totalRecords:533,uniqueRecordIds:533,wikipediaCandidates:182,wikipediaPrimaryVerified:1,wikipediaDiscoveryOnly:181,
  originalMissingLocatorOrExcerpt:200,missingRowsPrimaryMatched:19,
})) assert(audit.summary?.[key]===value,`summary.${key} 不闭合`);
assert(audit.summary?.readerVisible===readerRows.length&&audit.summary?.reviewOnly===rows.length-readerRows.length,'summary 发布数量未按当前门禁动态闭合');

const jsContext={};
jsContext.window=jsContext;
vm.createContext(jsContext);
vm.runInContext(read('data/v65-fangzhen-audit.js'),jsContext,{filename:'data/v65-fangzhen-audit.js',timeout:20_000});
const runtime=jsContext.SGZ_V65_FANGZHEN_AUDIT;
assert(runtime?.records?.length===533,'V65 州镇 JS 镜像不是 533 条');
assert(runtime?.readerRecordIds?.length===readerRows.length,'V65 州镇 JS 读者 ID 与当前发布集合不一致');
assert(Object.keys(runtime?.publicationByRecordId||{}).length===533,'V65 州镇 JS 发布覆盖不是 533 条');
assert(rows.every(row=>runtime?.publicationByRecordId?.[row.recordId]?.publicationStatus===row.publicationStatus),'V65 州镇 JS/JSON 发布状态不一致');

if(failures.length){
  console.error(`V65 州镇验证失败（${failures.length}）：`);
  failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}

console.log('V65 州镇验证通过');
console.log('州镇 533 条；Wikipedia 候选 182（原典已核 1，discovery-only 181）');
console.log(`原缺定位 200 条；原典收口 19；reader-visible ${readerRows.length}；review-only ${rows.length-readerRows.length}`);
