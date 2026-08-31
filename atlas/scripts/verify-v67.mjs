import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  buildJurisdictionIndex,
  paginateFangzhenRecords,
  relatedFangzhenRecords,
  verifiedSeatPeriods,
} from '../assets/app/fangzhen.js';
import {
  highlightTextFragments,
  normalizeEpigraphicMediaAssets,
  paginateEpigraphicRecords,
} from '../assets/app/jinshi.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const json=relative=>JSON.parse(read(relative));

function loadRuntime(files){
  const context={console};
  context.window=context;
  context.globalThis=context;
  vm.createContext(context);
  files.forEach(relative=>vm.runInContext(read(relative),context,{filename:relative,timeout:20_000}));
  return context;
}

const html=read('index.html');
const modulesCss=read('assets/ui/modules.css');
const design=read('DESIGN.md');
const ux=read('UX-CONTRACT.md');
const fangzhen=json('data/v66-fangzhen-reader.json');
const fangzhenRows=fangzhen.records||[];
const states=['司隶','司州','冀州','兖州','豫州','青州','徐州','扬州','荆州','益州','凉州','雍州','幽州','并州','交州','广州','宁州','平州','秦州','梁州'];

assert(fangzhen.schemaVersion==='V66-reader','州镇读者投影版本异常');
assert(fangzhenRows.length===45&&new Set(fangzhenRows.map(row=>row.id)).size===45,`州镇读者记录不是 45 条唯一 ID：${fangzhenRows.length}`);
assert(fangzhenRows.filter(row=>row.seat).length===27&&fangzhenRows.filter(row=>!row.seat).length===18,'州镇治所发布状态不是 27 已核／18 省略');
assert(!JSON.stringify(fangzhenRows).includes('治所未详'),'州镇读者数据仍包含治所占位');
const jurisdictionIndex=buildJurisdictionIndex(fangzhenRows,states);
assert(jurisdictionIndex.length>0&&jurisdictionIndex.reduce((total,row)=>total+row.count,0)===45,'辖区动态索引未闭合 45 条读者记录');
const fangzhenPage=paginateFangzhenRecords(fangzhenRows,1,12);
assert(fangzhenPage.rows.length===12&&fangzhenPage.pageCount===4&&fangzhenPage.total===45,'州镇分页不是每页 12 条／共 4 页');
const selected=fangzhenRows.find(row=>row.seatPeriodId)||fangzhenRows[0];
const related=relatedFangzhenRecords(fangzhenRows,selected);
assert(related.length>0&&related.every(row=>row.jurisdiction===selected.jurisdiction||row.administrativeUnitId===selected.administrativeUnitId),'州镇相关长官跨辖区串联');
assert(verifiedSeatPeriods(fangzhenRows).length===17,'读者任职实际关联的已核治所分期去重后不是 17 项');
const canonicalSeatPeriods=json('data/v66-administrative-seat-periods.json');
assert((canonicalSeatPeriods.periods||canonicalSeatPeriods.records||[]).length===19,'规范治所分期不是 19 项');

const runtime=loadRuntime([
  'data/jinshi-schema.js',
  'data/epigraphic-records.js',
  'data/epigraphic-v46-jin.js',
  'data/v62-jinshi-display.js',
  'data/v65-epigraphy-reader-overlays.js',
]);
const base=[...(runtime.SGZ_EPIGRAPHIC_RECORDS?.records||[]),...(runtime.SGZ_EPIGRAPHIC_V46_JIN?.records||[])];
const displayById=new Map((runtime.SGZ_V62_JINSHI_DISPLAY?.records||[]).map(row=>[row.id,row]));
const overlayById=runtime.SGZ_V65_EPIGRAPHY_READER_OVERLAYS?.byId||{};
const epigraphy=base.map(raw=>runtime.SGZ_JINSHI_SCHEMA.normalize({...raw,...(displayById.get(raw.id)||{}),...(overlayById[raw.id]||{})}));
const withInscription=epigraphy.filter(row=>String(row.inscription||'').trim()).length;
assert(epigraphy.length===188&&new Set(epigraphy.map(row=>row.id)).size===188,'金石读者记录不是 188 个稳定 ID');
assert(withInscription===52&&epigraphy.length-withInscription===136,`金石释文状态不是 52／136：${withInscription}/${epigraphy.length-withInscription}`);
const epigraphicPage=paginateEpigraphicRecords(epigraphy,1,12);
assert(epigraphicPage.rows.length===12&&epigraphicPage.pageCount===16&&epigraphicPage.total===188,'金石目录不是每页 12 条／共 16 页');

const mediaFixture=[
  {assetId:'ok',localPath:'assets/epigraphy/ok.webp',altText:'碑拓局部',publicationStatus:'verified'},
  {assetId:'review',localPath:'assets/epigraphy/review.webp',altText:'审校图',publicationStatus:'review-only'},
  {assetId:'remote',localPath:'https://example.com/a.jpg',altText:'远程图',publicationStatus:'verified'},
  {assetId:'no-alt',localPath:'assets/epigraphy/no-alt.webp',publicationStatus:'verified'},
];
const normalizedMedia=normalizeEpigraphicMediaAssets(runtime.SGZ_JINSHI_SCHEMA.normalizeMediaAssets(mediaFixture));
assert(normalizedMedia.length===1&&normalizedMedia[0].assetId==='ok','金石媒体发布门禁未隔离审校、远程或无替代文字资产');
const malicious='<img src=x onerror=alert(1)>曹全碑';
const fragments=highlightTextFragments(malicious,'曹全');
assert(fragments.map(row=>row.text).join('')===malicious&&fragments.some(row=>row.hit&&row.text==='曹全'),'金石高亮没有保持恶意字符串为纯文本片段');

assert((html.match(/class="v67-module-masthead"/g)||[]).length===2,'州镇表与金石录未各自使用一个墨色题签');
assert(html.includes("period:'all',polity:'all'")&&html.includes("fangzhen.js?v=67")&&html.includes("jinshi.js?v=67"),'综合州镇范围或 V67 模块缓存键未更新');
assert(html.includes('class="v67-fangzhen-workbench"')&&html.includes('class="v56-jinshi-workbench-grid"'),'双卷工作台主布局缺失');
assert(html.includes('const fangzhenPageSize = 12')&&html.includes('const epigraphicPageSize = 12'),'双卷分页没有固定为每页 12 条');
assert(html.includes('const rows=fangzhenVisibleRecords.value;')&&html.includes('const rows=fangzhenArchiveRows.value;'),'州镇异步模块计算未先登记响应式数据依赖');
assert(html.includes('v-if="jinshiMediaAssets.length"')&&html.includes('normalizeEpigraphicMediaAssets'),'金石媒体区未按已核资产条件渲染');
assert(!html.includes('v-html')&&!html.includes('.innerHTML'),'页面重新引入了可执行 HTML 渲染');
const fangzhenStart=html.indexOf('<main v-if="activeModule===\'fangzhen\'"');
const jinshiStart=html.indexOf('<main v-if="activeModule===\'jinshi\'"');
const shihuoStart=html.indexOf('<main v-if="activeModule===\'shihuo\'"');
const fangzhenMarkup=html.slice(fangzhenStart,jinshiStart);
const jinshiMarkup=html.slice(jinshiStart,shihuoStart);
assert(!fangzhenMarkup.includes('治所未详'),'州镇读者模板仍显示“治所未详”');
assert(!/placeholder="[^\"]*(?:搜索|检索)/.test(fangzhenMarkup+jinshiMarkup),'双卷内容区新增了第二套文本搜索框');
assert(jinshiMarkup.includes("workspaceMode==='review'&&jinshiPrimaryDetail.note"),'金石内部备注未限制在审校态');
assert(html.includes("params.set('archive',fangzhenArchiveKey.value)")&&html.includes("params.set('id',fangzhenPrimaryDetail.value.id)")&&html.includes("params.set('era',epigraphicEra.value)")&&html.includes("params.set('id',epigraphicId)"),'双卷 URL 状态没有覆盖筛选、页码或稳定 ID');
assert(modulesCss.includes('.v67-fangzhen-drawer.el-drawer')&&modulesCss.includes('.jinshi-detail-drawer.el-drawer')&&modulesCss.includes('width: 100vw !important'),'移动详情未使用全屏抽屉');
assert(design.includes('## V67 州镇表与金石录双卷工作台')&&ux.includes('## V67 州镇表与金石录交互契约'),'V67 设计与交互契约未同步');

if(failures.length){
  console.error(JSON.stringify({ok:false,failures},null,2));
  process.exitCode=1;
}else{
  console.log(JSON.stringify({ok:true,fangzhen:{records:45,verifiedSeats:27,hiddenSeats:18,linkedSeatPeriods:17,canonicalSeatPeriods:19},epigraphy:{records:188,withInscription:52,withoutInscription:136,pageSize:12},safeHighlight:true},null,2));
}
