import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(`V65 州镇构建失败：${message}`); };

function loadRawRecords(){
  const html=read('index.html');
  const start=html.indexOf('const FACTIONS = [');
  const end=html.indexOf('/* =========================================================================\n   Vue App',start);
  assert(start>=0&&end>start,'无法从 index.html 提取州镇规范源');
  const context={console,window:{HISTORY_MAP_REGISTRY:json('data/map-period-registry.json')},document:{getElementById:()=>({innerHTML:''})}};
  context.window.window=context.window;
  vm.createContext(context);
  for(const relative of [
    'data/research-model.js',
    'data/person-name-normalization.js',
    'data/wu-fangzhen-records.js',
    'data/shu-fangzhen-records.js',
    'data/fangzhen-term-supplement.js',
    'data/v62-jin-fangzhen.js',
  ]) vm.runInContext(read(relative),context,{filename:relative,timeout:20_000});
  vm.runInContext(`${html.slice(start,end)}\nglobalThis.__v65RawFangzhen=JSON.parse(JSON.stringify(FANGZHEN_PRESETS));`,context,{filename:'index.html#fangzhen',timeout:20_000});
  return {records:context.__v65RawFangzhen,toSimplified:context.window.SGZ_PERSON_NAME_NORMALIZATION.toSimplified};
}

const {records:rawRecords,toSimplified}=loadRawRecords();
const sourceIndex=json('data/person-source-index.json');
const clean=value=>toSimplified(String(value??'')).normalize('NFKC').replace(/[\s·・，、／/（）()《》：:；;—－？?\.]/g,'');
const primaryAppointments=sourceIndex.appointments.filter(row=>row.sourceUrl&&row.sourceLocator&&row.sourceExcerpt);
const appointmentsByName=new Map();
for(const appointment of primaryAppointments){
  const key=clean(appointment.name);
  if(!appointmentsByName.has(key)) appointmentsByName.set(key,[]);
  appointmentsByName.get(key).push(appointment);
}

// The 19 inline records had only a source title when V65 started.  These
// overrides are deliberately record-specific: they close the exact office
// fact with a locatable primary passage, without treating the passage as proof
// of every inferred start/end year.  Lu Fan is intentionally absent because
// the existing Wikipedia row has not yet been tied to a matching primary text.
const MANUAL_PRIMARY_OVERRIDES=Object.freeze({
  fz_han_liuyan:{
    sourceRecordId:'v65-primary:fz_han_liuyan',sourceTitle:'《后汉书》卷75',sourceUrl:'https://zh.wikisource.org/zh-hans/後漢書/卷75',
    sourceLocator:'刘焉传；建议改置牧伯后出任段',sourceExcerpt:'出焉为监军使者，领益州牧。',evidenceLayer:'正文',matchScope:'刘焉领益州牧的任职事实',recordDisposition:'推定'
  },
  fz_han_liuzhang:{
    sourceRecordId:'v65-primary:fz_han_liuzhang',sourceTitle:'《后汉书》卷75',sourceUrl:'https://zh.wikisource.org/zh-hans/後漢書/卷75',
    sourceLocator:'刘焉传附子璋；州大吏立璋段',sourceExcerpt:'诏书因以璋为监军使者，领益州牧。',evidenceLayer:'正文',matchScope:'刘璋领益州牧的任职事实',recordDisposition:'推定'
  },
  fz_han_taoqian:{
    sourceRecordId:'v65-primary:fz_han_taoqian',sourceTitle:'《后汉书》卷73',sourceUrl:'https://zh.wikisource.org/zh-hans/後漢書/卷73',
    sourceLocator:'陶谦传；奉贡西京后迁官段',sourceExcerpt:'诏迁为徐州牧，加安东将军，封溧阳侯。',evidenceLayer:'正文',matchScope:'陶谦迁徐州牧的任职事实',recordDisposition:'推定'
  },
  fz_han_liubei_xu:{
    sourceRecordId:'v65-primary:fz_han_liubei_xu',sourceTitle:'《三国志》卷32',sourceUrl:'https://zh.wikisource.org/zh-hans/三國志/卷32',
    sourceLocator:'先主传；陶谦卒后徐州人迎先主段',sourceExcerpt:'今日之事，百姓与能，天与不取，悔不可追。先主遂领徐州。',evidenceLayer:'正文',matchScope:'刘备领徐州的事实；原文未在此句明称“徐州牧”',recordDisposition:'存疑',publicationStatus:'review-only',publicationReason:'原典可证“领徐州”，但当前标题的“徐州牧”字样与起止年仍需另行核对。'
  },
  fz_han_lvbu_yan:{
    sourceRecordId:'v65-primary:fz_han_lvbu_yan',sourceTitle:'《后汉书》卷75',sourceUrl:'https://zh.wikisource.org/zh-hans/後漢書/卷75',
    sourceLocator:'吕布传；兴平元年张邈迎布段',sourceExcerpt:'遂与弟超及宫等迎布为兖州牧，据濮阳，郡县皆应之。',evidenceLayer:'正文',matchScope:'吕布为兖州牧的任职事实',recordDisposition:'推定'
  },
  fz_han_caocao_yan:{
    sourceRecordId:'v65-primary:fz_han_caocao_yan',sourceTitle:'《三国志》卷01',sourceUrl:'https://zh.wikisource.org/zh-hans/三國志/卷01',
    sourceLocator:'武帝纪；初平三年鲍信等迎太祖段',sourceExcerpt:'信乃与州吏万潜等至东郡迎太祖领兖州牧。',evidenceLayer:'裴注引《世语》',matchScope:'曹操领兖州牧的任职事实',recordDisposition:'推定'
  },
  fz_shu_lihui:{
    sourceRecordId:'v65-primary:fz_shu_lihui',sourceTitle:'《三国志》卷43',sourceUrl:'https://zh.wikisource.org/zh-hans/三國志/卷43',
    sourceLocator:'李恢传；章武元年邓方卒后选代段',sourceExcerpt:'遂以恢为庲降都督，使持节领交州刺史，住平夷县。',evidenceLayer:'正文',matchScope:'李恢为庲降都督的任职事实及起始时点',recordDisposition:'推定'
  },
  fz_shu_mazhong:{
    sourceRecordId:'v65-primary:fz_shu_mazhong',sourceTitle:'《三国志》卷43',sourceUrl:'https://zh.wikisource.org/zh-hans/三國志/卷43',
    sourceLocator:'马忠传；延熙中征张冀还段',sourceExcerpt:'征庲降都督张冀还，以忠代冀。',evidenceLayer:'正文',matchScope:'马忠代张冀为庲降都督的任职事实',recordDisposition:'推定'
  },
  fz_shu_jiangwei_254:{
    sourceRecordId:'v65-primary:fz_shu_jiangwei_254',sourceTitle:'《三国志》卷44',sourceUrl:'https://zh.wikisource.org/zh-hans/三國志/卷44',
    sourceLocator:'姜维传；延熙十六年后次年加官段',sourceExcerpt:'明年，加督中外军事。',evidenceLayer:'正文',matchScope:'姜维加督中外军事的任职事实及起始时点',recordDisposition:'推定'
  },
  fz_shu_jiangwei_256:{
    sourceRecordId:'v65-primary:fz_shu_jiangwei_256',sourceTitle:'《三国志》卷44',sourceUrl:'https://zh.wikisource.org/zh-hans/三國志/卷44',
    sourceLocator:'姜维传；延熙十九年迁官段',sourceExcerpt:'十九年春，就迁维为大将军。',evidenceLayer:'正文',matchScope:'姜维迁大将军的任职事实及起始时点',recordDisposition:'确定'
  },
  fz_shu_jiangwei_257:{
    sourceRecordId:'v65-primary:fz_shu_jiangwei_257',sourceTitle:'《三国志》卷44',sourceUrl:'https://zh.wikisource.org/zh-hans/三國志/卷44',
    sourceLocator:'姜维传；段谷败后请自贬削段',sourceExcerpt:'维谢过引负，求自贬削。为后将军，行大将军事。',evidenceLayer:'正文',matchScope:'姜维为后将军、行大将军事的任职事实',recordDisposition:'确定'
  },
  fz_shu_jiangwei_258:{
    sourceRecordId:'v65-primary:fz_shu_jiangwei_258',sourceTitle:'《三国志》卷44',sourceUrl:'https://zh.wikisource.org/zh-hans/三國志/卷44',
    sourceLocator:'姜维传；景耀元年诸葛诞败后段',sourceExcerpt:'景耀元年，维闻诞破败，乃还成都。复拜大将军。',evidenceLayer:'正文',matchScope:'姜维复拜大将军的任职事实及起始时点',recordDisposition:'确定'
  },
  fz_wu_luxun:{
    sourceRecordId:'v65-primary:fz_wu_luxun',sourceTitle:'《三国志》卷58',sourceUrl:'https://zh.wikisource.org/zh-hans/三國志/卷58',
    sourceLocator:'陆逊传；夷陵之战后加拜段',sourceExcerpt:'加拜逊辅国将军，领荆州牧，即改封江陵侯。',evidenceLayer:'正文',matchScope:'陆逊领荆州牧的任职事实',recordDisposition:'推定'
  },
  fz_jin_yanghu:{
    sourceRecordId:'v65-primary:fz_jin_yanghu',sourceTitle:'《晋书》卷34',sourceUrl:'https://zh.wikisource.org/zh-hans/晉書/卷034',
    sourceLocator:'羊祜传；晋武帝将有灭吴之志段',sourceExcerpt:'帝将有灭吴之志，以祜为都督荆州诸军事、假节。',evidenceLayer:'正文',matchScope:'羊祜都督荆州诸军事的任职事实',recordDisposition:'推定'
  },
  fz_jin_duyu:{
    sourceRecordId:'v65-primary:fz_jin_duyu',sourceTitle:'《晋书》卷34',sourceUrl:'https://zh.wikisource.org/zh-hans/晉書/卷034',
    sourceLocator:'杜预传；羊祜卒后拜官段',sourceExcerpt:'及祜卒，拜镇南大将军、都督荆州诸军事。',evidenceLayer:'正文',matchScope:'杜预为镇南大将军、都督荆州诸军事的任职事实',recordDisposition:'推定'
  },
  fz_jin_liukun:{
    sourceRecordId:'v65-primary:fz_jin_liukun',sourceTitle:'《晋书》卷62',sourceUrl:'https://zh.wikisource.org/zh-hans/晉書/卷062',
    sourceLocator:'刘琨传；永嘉元年迁并州段',sourceExcerpt:'永嘉元年，为并州刺史，加振威将军，领匈奴中郎将。',evidenceLayer:'正文',matchScope:'刘琨为并州刺史、领匈奴中郎将的任职事实；原表306年与永嘉元年不合',recordDisposition:'存疑',publicationStatus:'review-only',publicationReason:'《晋书》明记永嘉元年（307），与原记录起年306冲突。'
  },
  fz_jin_zuti:{
    sourceRecordId:'v65-primary:fz_jin_zuti',sourceTitle:'《晋书》卷62',sourceUrl:'https://zh.wikisource.org/zh-hans/晉書/卷062',
    sourceLocator:'祖逖传；上言北伐后受任段',sourceExcerpt:'帝乃以逖为奋威将军、豫州刺史。',evidenceLayer:'正文',matchScope:'祖逖为奋威将军、豫州刺史的任职事实；此段未直书原表起年317',recordDisposition:'存疑',publicationStatus:'review-only',publicationReason:'原典可证官职，但当前317年起始年未由这一段原文确证。'
  },
  fz_jin_taokan:{
    sourceRecordId:'v65-primary:fz_jin_taokan',sourceTitle:'《晋书》卷66',sourceUrl:'https://zh.wikisource.org/zh-hans/晉書/卷066',
    sourceLocator:'陶侃传；王敦平后迁官段',sourceExcerpt:'及王敦平，迁都督荆、雍、益、梁州诸军事，领护南蛮校尉、征西大将军、荆州刺史。',evidenceLayer:'正文',matchScope:'陶侃都督荆雍益梁州诸军事、为荆州刺史的任职事实',recordDisposition:'推定'
  }
});

function regionTokens(row){
  const source=toSimplified(String(row.jurisdiction||row.region||''));
  return [...new Set((source.match(/[司冀幽并雍凉荆扬豫徐青兖平益梁秦交广湘江][州隶]?/g)||[]).map(clean).filter(token=>token.length>=1))];
}
function roleTokens(row){
  const title=toSimplified(String(row.title||row.commission||''));
  const out=[];
  if(/司隶校尉/.test(title)) out.push('司隶校尉');
  if(/刺史/.test(title)||row.recordType==='cishi') out.push('刺史');
  if(/州牧|牧/.test(title)||row.recordType==='cishi') out.push('州牧','牧');
  if(/都督/.test(title)||row.recordType==='dudu') out.push('都督','诸军事');
  for(const token of ['大将军','后将军','庲降都督','领州刺史','郡太守','太守']) if(title.includes(token)) out.push(token);
  return [...new Set(out.map(clean).filter(Boolean))];
}
function scorePrimary(row,appointment){
  const office=clean(appointment.officeName);
  const excerpt=clean(appointment.sourceExcerpt);
  const title=clean(row.title||row.commission);
  const commission=clean(row.commission||row.title);
  const regions=regionTokens(row);
  const roles=roleTokens(row);
  let score=0;
  if(office&&title&&(office===title||title.includes(office)||office.includes(title))) score+=8;
  if(office&&commission&&(office===commission||commission.includes(office)||office.includes(commission))) score+=7;
  if(title.length>=4&&excerpt.includes(title)) score+=7;
  const regionHits=regions.filter(token=>office.includes(token)||excerpt.includes(token)).length;
  const roleHits=roles.filter(token=>office.includes(token)||excerpt.includes(token)).length;
  score+=Math.min(regionHits,2)*2+Math.min(roleHits,2)*2;
  if(row.recordType==='dudu'&&office.includes('都督')) score+=3;
  if(row.recordType==='cishi'&&(office.includes('刺史')||office.includes('牧')||office.includes('司隶校尉'))) score+=3;
  return score;
}
function primaryMatch(row){
  const candidates=appointmentsByName.get(clean(row.commander||row.name))||[];
  const title=toSimplified(String(row.title||row.commission||''));
  const regions=regionTokens(row);
  const ranked=candidates.filter(appointment=>{
    const haystack=clean(`${appointment.officeName||''} ${appointment.sourceExcerpt||''}`);
    if(row.recordType==='cishi'&&regions.length&&!regions.some(token=>haystack.includes(token))) return false;
    if(title.includes('后将军')&&!haystack.includes(clean('后将军'))) return false;
    if(/\u590d拜|\u590d授/.test(`${title} ${row.appointmentStatus||''}`)&&!/(\u590d拜|\u590d授)/.test(toSimplified(String(appointment.sourceExcerpt||'')))) return false;
    return true;
  }).map(appointment=>({appointment,score:scorePrimary(row,appointment),manual:false})).sort((a,b)=>b.score-a.score||String(a.appointment.id).localeCompare(String(b.appointment.id)));
  if(!ranked.length||ranked[0].score<9) return null;
  if(ranked[1]&&ranked[1].score===ranked[0].score&&ranked[1].appointment.officeName!==ranked[0].appointment.officeName) return null;
  return ranked[0];
}

function datasetOf(row){
  if(String(row.id).startsWith('fz_wei_')) return 'wei-wikipedia';
  if(row.importBatch==='sunwu-docx-20260801') return 'wu-research-document';
  if(row.importBatch==='shu-commandery-prefects-screenshot-20260802') return 'shu-screenshot';
  if(String(row.id).startsWith('fz-v62-jin-')) return 'v62-jin-primary';
  return 'manual-core';
}
function hasQuotedPrimary(row){
  const excerpt=String(row.sourceExcerpt||'');
  return /《[^》]+》/.test(excerpt)&&/[：“”「」]/.test(excerpt)&&excerpt.length>=24;
}
function isUncertain(row){
  return /待考|存疑|未上任|任职未详|遥领|约授/.test([row.confidence,row.researchStatus,row.appointmentStatus,row.tenureText,row.sourceTenureText].join(' '));
}

const FORCE_REVIEW_ONLY_IDS=new Set(['fz_wu_doc_007','fz_wu_doc_008','fz_wu_doc_016']);

const auditRecords=rawRecords.map(row=>{
  const recordId=String(row.id||'');
  const dataset=datasetOf(row);
  const wikipediaDiscovery=/维基百科|wikipedia\.org/i.test([row.sourceTitle,row.sourceUrl].join(' '));
  const originallyMissingLocator=!String(row.sourceLocator||'').trim();
  const originallyMissingExcerpt=!String(row.sourceExcerpt||'').trim();
  const manualOverride=MANUAL_PRIMARY_OVERRIDES[recordId]||null;
  const matched=manualOverride?{appointment:manualOverride,score:null,manual:true}:((originallyMissingLocator||originallyMissingExcerpt)?primaryMatch(row):null);
  const primary=matched?.appointment||null;
  let sourceVerification='research-document-only';
  let searchState='已登记既有研究资料';
  let historicalDisposition=isUncertain(row)?'存疑':'推定';
  let publicationStatus='review-only';
  let publicationReason='研究资料尚不能替代可定位原典。';
  let fieldMatchVerification=null;

  if(primary){
    sourceVerification='primary-verified';
    searchState=matched.manual?'已逐条核原典':'已核规范原典索引';
    historicalDisposition=primary.recordDisposition||(isUncertain(row)?'推定':'确定');
    fieldMatchVerification={
      status:'verified',
      method:matched.manual?'record-specific-curated':'name-office-region-match',
      scope:primary.matchScope||'任职事实；原表起止年另按本条可信状态解释',
    };
    const sourceReady=/^https:\/\//.test(String(primary.sourceUrl||''))&&Boolean(String(primary.sourceLocator||'').trim())&&Boolean(String(primary.sourceExcerpt||'').trim());
    publicationStatus=sourceReady
      ?(primary.publicationStatus||(['存疑','争议'].includes(historicalDisposition)?'review-only':'reader-visible'))
      :'review-only';
    publicationReason=primary.publicationReason||'任职事实已由可定位原典支持；原表任期仍按本条的审校结论解释。';
    if(!sourceReady) publicationReason='原典字段不完整，不能进入读者态。';
  }else if(dataset==='v62-jin-primary'&&row.sourceUrl&&row.sourceLocator&&row.sourceExcerpt){
    sourceVerification='primary-verified';
    searchState='已核原典';
    historicalDisposition=row.researchStatus==='确定'?'确定':'推定';
    fieldMatchVerification={status:'verified',method:'record-specific-canonical',scope:'原典 URL、定位与摘录均绑定当前人物、官职和州镇记录。'};
    publicationStatus=row.readerVisible===false?'review-only':'reader-visible';
    publicationReason='V62 西晋记录已有《晋书》等原典 URL、定位和摘录。';
  }else if(dataset==='wu-research-document'&&hasQuotedPrimary(row)){
    sourceVerification='quoted-primary-in-research-document';
    searchState='已登记研究文档引句；尚未逐条回核原典';
    historicalDisposition=isUncertain(row)?'存疑':'推定';
    publicationStatus='review-only';
    publicationReason='研究文档中的引句尚未逐条回到真实原典 URL、定位和上下文核验，不能进入读者态。';
  }else if(wikipediaDiscovery){
    sourceVerification='discovery-only';
    searchState='Wikipedia发现候选；原典未核';
    historicalDisposition='存疑';
    publicationStatus='review-only';
    publicationReason='Wikipedia 只能发现候选，当前未取得与本条相匹配的可定位原典。';
  }else if(dataset==='shu-screenshot'){
    sourceVerification='research-document-only';
    searchState='截图表已登记；原典未核';
    historicalDisposition='存疑';
    publicationStatus='review-only';
    publicationReason='截图表只有表格行定位，不是可复核的原典定位。';
  }else if(row.sourceLocator&&row.sourceExcerpt){
    sourceVerification='research-document-only';
    searchState='既有来源定位已登记；原典层级待复核';
    historicalDisposition=isUncertain(row)?'存疑':'推定';
    publicationStatus='review-only';
    publicationReason='既有定位未达到原典核验门槛。';
  }else{
    sourceVerification='source-title-only';
    searchState='已排查规范原典索引；无匹配候选';
    historicalDisposition='明确无候选';
    publicationStatus='review-only';
    publicationReason='仅有书名或卷名，未找到可证明本条任职的原文定位。';
  }

  if(FORCE_REVIEW_ONLY_IDS.has(recordId)){
    publicationStatus='review-only';
    publicationReason='该记录存在人物、官职或任期对应问题，明确留在审校后台。';
  }

  return {
    auditId:`v65-fangzhen:${recordId}`,
    recordId,
    dataset,
    polity:row.polity||'',
    commander:row.commander||row.name||'',
    title:row.title||row.office||'',
    jurisdiction:row.jurisdiction||row.region||'',
    startYear:row.startYear??null,
    endYear:row.endYear??null,
    appointmentStatus:row.appointmentStatus||'',
    wikipediaDiscovery,
    discoverySource:wikipediaDiscovery?{title:row.sourceTitle||'',url:row.sourceUrl||'',use:'candidate-discovery-only'}:null,
    originalSource:{
      title:row.sourceTitle||'',url:row.sourceUrl||'',locator:row.sourceLocator||'',excerpt:row.sourceExcerpt||'',
      missingLocator:originallyMissingLocator,missingExcerpt:originallyMissingExcerpt,
    },
    primarySource:primary?{
      sourceRecordId:primary.sourceRecordId||primary.id,sourceTitle:primary.sourceTitle||`${primary.sourceWork}卷${Number(primary.sourceVolume)}`,
      sourceUrl:primary.sourceUrl,sourceLocator:primary.sourceLocator,sourceExcerpt:primary.sourceExcerpt,
      evidenceLayer:primary.evidenceLayer||'',matchScope:primary.matchScope||'任职事实；原表起止年另按本条可信状态解释',matchScore:matched.score,
    }:(sourceVerification==='primary-verified'?{
      sourceRecordId:recordId,sourceTitle:row.sourceTitle||'',sourceUrl:row.sourceUrl||'',sourceLocator:row.sourceLocator||'',sourceExcerpt:row.sourceExcerpt||'',
      evidenceLayer:row.sourceLevel||'',matchScope:'任职事实及原记录明确给出的范围',matchScore:null,
    }:null),
    sourceVerification,
    fieldMatchVerification,
    accessedAt:'2026-08-30',
    searchState,
    historicalDisposition,
    publicationStatus,
    readerVisible:publicationStatus==='reader-visible',
    publicationReason,
  };
});

assert(rawRecords.length===533,`原始州镇记录应为 533 条，当前 ${rawRecords.length}`);
assert(new Set(auditRecords.map(row=>row.recordId)).size===533,'recordId 不是 533 条唯一值');
assert(auditRecords.filter(row=>row.wikipediaDiscovery).length===182,'Wikipedia 发现候选应为 182 条');
assert(auditRecords.filter(row=>row.originalSource.missingLocator||row.originalSource.missingExcerpt).length===200,'缺 sourceLocator／原文记录应为 200 条');

const countBy=(rows,key)=>Object.fromEntries([...new Set(rows.map(row=>row[key]))].sort().map(value=>[value,rows.filter(row=>row[key]===value).length]));
const payload={
  schemaVersion:'V65',
  modelId:'sgz-v65-fangzhen-audit',
  generatedAt:'2026-08-30',
  scope:'现有 533 条州镇原始记录逐条审校与发布覆盖；不修改地图几何。',
  policy:{
    wikipedia:'Wikipedia 只作候选发现；没有可定位原典的记录一律 review-only。',
    missingEvidence:'缺 sourceLocator 或 sourceExcerpt 的记录先与规范原典索引逐条匹配；无匹配者保留存疑或明确无候选。',
    publication:'reader-visible 必须有与当前人物、官职及州镇字段匹配的真实原典 URL、定位和摘录；研究文档引句一律先留在审校后台。',
    tenure:'原典只证明任职事实时，不据此自动确认 Wikipedia 表中的完整起止年。',
    map:'地图文件、坐标与几何全部冻结。'
  },
  summary:{
    totalRecords:auditRecords.length,
    uniqueRecordIds:new Set(auditRecords.map(row=>row.recordId)).size,
    wikipediaCandidates:auditRecords.filter(row=>row.wikipediaDiscovery).length,
    wikipediaPrimaryVerified:auditRecords.filter(row=>row.wikipediaDiscovery&&row.sourceVerification==='primary-verified').length,
    wikipediaDiscoveryOnly:auditRecords.filter(row=>row.wikipediaDiscovery&&row.sourceVerification==='discovery-only').length,
    originalMissingLocatorOrExcerpt:auditRecords.filter(row=>row.originalSource.missingLocator||row.originalSource.missingExcerpt).length,
    missingRowsPrimaryMatched:auditRecords.filter(row=>(row.originalSource.missingLocator||row.originalSource.missingExcerpt)&&row.sourceVerification==='primary-verified').length,
    readerVisible:auditRecords.filter(row=>row.readerVisible).length,
    reviewOnly:auditRecords.filter(row=>!row.readerVisible).length,
    byDataset:countBy(auditRecords,'dataset'),
    byVerification:countBy(auditRecords,'sourceVerification'),
    byDisposition:countBy(auditRecords,'historicalDisposition'),
    byPublication:countBy(auditRecords,'publicationStatus'),
  },
  records:auditRecords,
};

const jsonText=`${JSON.stringify(payload,null,2)}\n`;
const jsText=`/* Generated by scripts/build-v65-fangzhen-audit.mjs. */\n(function(global){\n  'use strict';\n  const payload=${JSON.stringify(payload)};\n  payload.records=Object.freeze(payload.records.map(Object.freeze));\n  payload.publicationByRecordId=Object.freeze(Object.fromEntries(payload.records.map(row=>[row.recordId,Object.freeze({publicationStatus:row.publicationStatus,readerVisible:row.readerVisible,sourceVerification:row.sourceVerification,historicalDisposition:row.historicalDisposition,primarySource:row.primarySource,searchState:row.searchState})])));\n  payload.readerRecordIds=Object.freeze(payload.records.filter(row=>row.readerVisible).map(row=>row.recordId));\n  global.SGZ_V65_FANGZHEN_AUDIT=Object.freeze(payload);\n})(window);\n`;
fs.writeFileSync(path.join(root,'data/v65-fangzhen-audit.json'),jsonText);
fs.writeFileSync(path.join(root,'data/v65-fangzhen-audit.js'),jsText);
console.log(JSON.stringify(payload.summary,null,2));
