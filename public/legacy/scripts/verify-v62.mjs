import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const fullPath = relative => path.join(root, relative);
const exists = relative => fs.existsSync(fullPath(relative));
const read = relative => exists(relative) ? fs.readFileSync(fullPath(relative), 'utf8') : '';
const sha256 = relative => exists(relative)
  ? crypto.createHash('sha256').update(fs.readFileSync(fullPath(relative))).digest('hex')
  : '';

function loadJson(relative) {
  if (!exists(relative)) {
    failures.push(`缺少 V62 验收文件：${relative}`);
    return null;
  }
  try {
    return JSON.parse(read(relative));
  } catch (error) {
    failures.push(`${relative} 不是有效 JSON：${error.message}`);
    return null;
  }
}

function createScriptContext() {
  const context = { console };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  return context;
}

function loadScripts(relativeFiles) {
  const context = createScriptContext();
  for (const relative of relativeFiles) {
    if (!exists(relative)) {
      failures.push(`缺少 V62 运行时文件：${relative}`);
      continue;
    }
    try {
      vm.runInContext(read(relative), context, { filename: relative, timeout: 20_000 });
    } catch (error) {
      failures.push(`${relative} 无法载入：${error.message}`);
    }
  }
  return context;
}

function sameArray(left, right) {
  return JSON.stringify(Array.from(left || [])) === JSON.stringify(Array.from(right || []));
}

function objectRows(value, keyName) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).map(([key, row]) => typeof row === 'string'
    ? { [keyName]: key, nodeId: row }
    : { [keyName]: key, ...(row || {}) });
}

function figmaNodeId(value) {
  const nodeId = String(value || '').trim();
  return /^\d+[:-]\d+$/.test(nodeId) && !['0:0', '0-0'].includes(nodeId);
}

function pngSize(relative) {
  const normalized = String(relative || '').replace(/^\.\//, '');
  const file = fullPath(normalized);
  if (!fs.existsSync(file)) return null;
  const bytes = fs.readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const html = read('index.html');
const dynastyOrder = ['后汉', '魏', '季汉', '吴', '西晋'];
const dynastySet = new Set(dynastyOrder);
const people = loadJson('data/v62-people-offices.json');
const jinFangzhen = loadJson('data/v62-jin-fangzhen.json');
const jinshiDisplay = loadJson('data/v62-jinshi-display.json');
const portraitCatalog = loadJson('data/v62-portrait-catalog.json');
const figmaMapping = loadJson('data/v62-figma-mapping.json');
const v61Supplement = loadJson('data/v61-person-supplements.json');

/* 五朝人物标签、表字来源和标题净化。 */
assert(people?.schemaVersion === 'V62', '五朝人物覆盖层 schemaVersion 不是 V62');
assert(sameArray(people?.dynastyOrder, dynastyOrder), '人物主标签顺序不是后汉、魏、季汉、吴、西晋');
assert(Array.isArray(people?.people) && people.people.length === people?.summary?.people, '五朝人物覆盖层数量与 summary 不一致');
const peopleById = new Map((people?.people || []).map(row => [row.personId, row]));
assert(peopleById.size === (people?.people || []).length, '五朝人物覆盖层存在重复 personId');
for (const person of people?.people || []) {
  const tags = person.dynastyTags || [];
  const sortedTags = [...new Set(tags)].sort((a, b) => dynastyOrder.indexOf(a) - dynastyOrder.indexOf(b));
  assert(Array.isArray(person.dynastyTags), `${person.personId} 缺少 dynastyTags 数组`);
  assert(tags.every(tag => dynastySet.has(tag)), `${person.personId} 混入五朝之外的主标签：${tags.join('、')}`);
  assert(sameArray(tags, sortedTags), `${person.personId} 的主标签未按王朝顺序排列或存在重复`);
  assert(Array.isArray(person.historicalAffiliations), `${person.personId} 缺少 historicalAffiliations 数组`);
  if (person.affiliationStatus === 'resolved') assert(tags.length > 0, `${person.personId} 已标记归属完成但没有五朝主标签`);
  if (person.readerZi) {
    assert(person.readerZiSource?.sourceTitle && person.readerZiSource?.sourceLocator, `${person.personId} 的表字缺少可定位来源`);
    assert(person.readerZiSource?.confidence === '确定', `${person.personId} 的读者表字不是确定状态`);
  }
}
assert((people?.officeDisplayOverrides || []).every(row => row.rawTitle && row.displayTitle && row.rawTitle !== row.displayTitle), '官职净化覆盖缺少 rawTitle 或 displayTitle');
assert((people?.officeDisplayOverrides || []).every(row => !/[（）()]|^【/.test(row.displayTitle)), '官职 displayTitle 仍含说明性括号或前置标记');
assert(html.includes("if(workspaceMode.value!=='review')e.zi=readerPersonZi(e.zi)"), '阅读态未过滤待考、存疑或未详表字占位');
assert(/function readerPersonZi\(value\)[\s\S]{0,260}?待考\|待校\|存疑\|未详\|不详\|未载\|缺载/.test(html), '人物表字读者过滤规则不完整');

const modelContext = loadScripts(['data/research-model.js']);
const researchModel = modelContext.SGZResearchModel;
assert(researchModel?.titleParts && researchModel?.normalizeAppointment && researchModel?.normalizeNode, '研究模型未公开 V62 标题净化接口');
if (researchModel?.titleParts) {
  const officeTitle = researchModel.titleParts('五官中郎将（丞相副）');
  assert(officeTitle.rawTitle === '五官中郎将（丞相副）' && officeTitle.displayTitle === '五官中郎将' && officeTitle.titleAnnotations.includes('丞相副'), '五官中郎将标题未按 raw/display/annotation 分层');
  const appointment = researchModel.normalizeAppointment({ id: 'verify-v62-title', personId: 'person:verify', officeName: '大将军（或录尚书事）' });
  assert(appointment.rawTitle === '大将军（或录尚书事）' && appointment.officeName === '大将军' && appointment.titleAnnotations.includes('或录尚书事'), '大将军标题净化或原始字段保留失败');
  const node = researchModel.normalizeNode({ key: 'verify-v62-node', name: '【额】晋张君碑' }, 'verify', 'noble');
  assert(node.rawTitle === '【额】晋张君碑' && node.name === '晋张君碑' && node.titleAnnotations.includes('额'), '前置方括号标题净化或原始字段保留失败');
  const generatedTitles = Array.from(html.matchAll(/\b[ON]\(\s*'[^']+'\s*,\s*[^,]+\s*,\s*'([^']+)'/g), match => match[1]);
  assert(generatedTitles.length > 50, '未能提取足够的职官谱生成标题进行净化验收');
  assert(generatedTitles.every(rawTitle => {
    const parts = researchModel.titleParts(rawTitle);
    return parts.rawTitle === rawTitle && !/[（）()]|^【/.test(parts.displayTitle);
  }), '存在无法由 rawTitle 无损分层为纯净 displayTitle 的职官谱生成标题');
  assert(html.includes('SGZResearchModel.migrate({schemaVersion:7,trees:buildPresets()'), '职官谱树未通过统一研究模型净化后进入读者态');
}

/* 曹魏爵制：六个读者主层，侯下七类，封爵事件不缩水。 */
const weiStart = html.indexOf('/* ---------------- 曹魏 ---------------- */');
const weiEnd = html.indexOf('/* ---------------- 汉 ---------------- */', weiStart + 1);
const weiSection = weiStart >= 0 && weiEnd > weiStart ? html.slice(weiStart, weiEnd) : '';
assert(Boolean(weiSection), '无法定位曹魏职官谱源码段');
const topPeerageNames = Array.from(weiSection.matchAll(/const\s+\w+\s*=\s*N\('wei_n',\s*nroot\.key,\s*'([^']+)'/g), match => match[1]);
const visibleTopPeerageNames = topPeerageNames.filter(name => name !== '五等爵');
assert(sameArray(visibleTopPeerageNames, ['王', '公', '侯', '伯', '子', '男']), `曹魏爵制读者主层不是王、公、侯、伯、子、男：${visibleTopPeerageNames.join('、')}`);
assert(/N\('wei_n',\s*nroot\.key,\s*'五等爵'[\s\S]{0,220}?hidden:true[\s\S]{0,80}?archived:true/.test(weiSection), '旧“五等爵”兼容节点未隐藏归档');
const marquisTypes = Array.from(weiSection.matchAll(/N\('wei_n',\s*hou\.key,\s*'([^']+)'[^\n]*marquisType:'([^']+)'/g), match => match[2]);
assert(sameArray(marquisTypes, ['县侯', '乡侯', '亭侯', '关内侯', '关中侯', '名号侯', '列侯未详']), `侯下类型不完整或顺序错误：${marquisTypes.join('、')}`);
assert(weiSection.includes("peeragePhase:'魏初承汉／咸熙五等'") && html.includes("return '列侯未详'"), '曹魏爵制阶段或列侯未详规则未接入');
assert(v61Supplement?.peerageEvents?.length === 590, '曹魏封爵总记录不再是 590 条');
assert(v61Supplement?.peerageEvents?.filter(row => row.readerVisible).length === 525, '曹魏读者封爵事件不再是 525 条');

/* 西晋州镇：发现来源只能建候选，采用记录必须回到可定位原典。 */
const dispositions = ['采用', '重复', '审校保留', '排除', '明确无候选'];
assert(jinFangzhen?.schemaVersion === 'V62', '西晋州镇数据 schemaVersion 不是 V62');
assert(jinFangzhen?.scope?.startYear === 266 && jinFangzhen?.scope?.endYear === 316, '西晋州镇范围不是 266—316');
assert(Array.isArray(jinFangzhen?.candidateAudit) && jinFangzhen.candidateAudit.length > 0, '西晋州镇缺少候选审校台账');
assert(Array.isArray(jinFangzhen?.records) && jinFangzhen.records.length > 0, '西晋州镇没有采用记录');
const fangzhenRecordIds = new Set((jinFangzhen?.records || []).map(row => row.id));
const fangzhenCandidateIds = new Set((jinFangzhen?.candidateAudit || []).map(row => row.candidateId));
assert(fangzhenRecordIds.size === (jinFangzhen?.records || []).length, '西晋州镇采用记录 ID 重复');
assert(fangzhenCandidateIds.size === (jinFangzhen?.candidateAudit || []).length, '西晋州镇候选 ID 重复');
const dispositionCounts = Object.fromEntries(dispositions.map(value => [value, 0]));
for (const candidate of jinFangzhen?.candidateAudit || []) {
  assert(dispositions.includes(candidate.disposition), `西晋州镇候选 ${candidate.candidateId} 处置无效：${candidate.disposition}`);
  if (dispositions.includes(candidate.disposition)) dispositionCounts[candidate.disposition] += 1;
  assert(candidate.discoverySourceId, `西晋州镇候选 ${candidate.candidateId} 缺发现来源`);
  if (candidate.disposition === '采用') {
    assert(fangzhenRecordIds.has(candidate.recordId), `采用候选 ${candidate.candidateId} 未关联有效记录`);
    assert((candidate.primarySourceIds || []).length > 0, `采用候选 ${candidate.candidateId} 缺少原典来源`);
  } else {
    assert(candidate.reason, `非采用候选 ${candidate.candidateId} 缺少处置理由`);
  }
}
assert((jinFangzhen?.summary?.candidateRows || 0) === (jinFangzhen?.candidateAudit || []).length, '西晋州镇候选 summary 未闭合');
assert((jinFangzhen?.summary?.readerRecords || 0) === (jinFangzhen?.records || []).length, '西晋州镇采用记录 summary 未闭合');
for (const disposition of dispositions) {
  assert(jinFangzhen?.summary?.dispositionCounts?.[disposition] === dispositionCounts[disposition], `西晋州镇 ${disposition} 数量未闭合`);
}
for (const source of jinFangzhen?.discoverySources || []) {
  assert(/^https:\/\//.test(source.url || '') && source.versionDate && source.retrievedAt, `发现来源 ${source.sourceId} 缺固定版本日期或检索日期`);
}
for (const record of jinFangzhen?.records || []) {
  assert(record.readerVisible === true && record.reviewDisposition === '采用' && record.researchStatus === '确定', `西晋州镇采用记录 ${record.id} 未完成读者结论`);
  assert(/^person:(?!unresolved:)/.test(record.personId || ''), `西晋州镇采用记录 ${record.id} 缺稳定 personId`);
  assert(record.sourceLevel === '一手史料' && /zh\.wikisource\.org/.test(record.sourceUrl || ''), `西晋州镇采用记录 ${record.id} 未回到可定位原典`);
  assert(!/wikipedia\.org/.test(record.sourceUrl || ''), `西晋州镇采用记录 ${record.id} 错把 Wikipedia 当读者来源`);
  assert(record.sourceLocator && record.sourceExcerpt, `西晋州镇采用记录 ${record.id} 缺卷次定位或原文摘录`);
  for (const value of [record.startYear, record.endYear].filter(value => value !== null && value !== undefined)) {
    assert(Number.isInteger(value) && value >= 266 && value <= 316, `西晋州镇采用记录 ${record.id} 年份越界或不是整数`);
  }
}
assert(html.includes('./data/v62-jin-fangzhen.js'), '西晋州镇 V62 运行时数据未挂入页面');
const fangzhenContext = loadScripts(['data/v62-jin-fangzhen.js']);
assert((fangzhenContext.SGZ_V62_JIN_FANGZHEN?.records || []).length === (jinFangzhen?.records || []).length, '西晋州镇 JS 镜像与规范 JSON 不一致');

/* 金石：188 个稳定 ID、50/138 状态与分节无损回组。 */
const jinshiContext = loadScripts([
  'data/jinshi-schema.js',
  'data/epigraphic-records.js',
  'data/epigraphic-v46-jin.js',
  'data/v60-research-ledger.js',
  'data/v61-epigraphy-research.js',
  'data/v62-jinshi-display.js',
]);
const baseJinshi = [
  ...(jinshiContext.SGZ_EPIGRAPHIC_RECORDS?.records || []),
  ...(jinshiContext.SGZ_EPIGRAPHIC_V46_JIN?.records || []),
];
const baseJinshiIds = new Set(baseJinshi.map(row => row.id));
assert(baseJinshi.length === 188 && baseJinshiIds.size === 188, '金石规范源不再是 188 个稳定 ID');
const v60JinshiById = new Map((jinshiContext.SGZ_V60_RESEARCH_LEDGER?.epigraphy || []).map(row => [row.id, row]));
const v61JinshiById = new Map((jinshiContext.SGZ_V61_EPIGRAPHY_RESEARCH?.epigraphy || []).map(row => [row.id, row]));
const v62JinshiById = new Map((jinshiContext.SGZ_V62_JINSHI_DISPLAY?.records || []).map(row => [row.id, row]));
const normalizedJinshi = baseJinshi.map(raw => jinshiContext.SGZ_JINSHI_SCHEMA?.normalize({
  ...raw,
  ...(v60JinshiById.get(raw.id) || {}),
  ...(v61JinshiById.get(raw.id) || {}),
  ...(v62JinshiById.get(raw.id) || {}),
}));
const withInscription = normalizedJinshi.filter(row => String(row.inscription || '').trim()).length;
assert(withInscription === 50 && normalizedJinshi.length - withInscription === 138, `金石释文状态不再是 50／138，实际 ${withInscription}／${normalizedJinshi.length - withInscription}`);
assert(jinshiDisplay?.baseline?.recordCount === 188 && jinshiDisplay?.baseline?.stableIdCount === 188, 'V62 金石显示覆盖的 188 ID 基线不完整');
assert(jinshiDisplay?.baseline?.withInscription === 50 && jinshiDisplay?.baseline?.withoutInscription === 138, 'V62 金石显示覆盖的 50／138 基线不一致');
assert((jinshiDisplay?.records || []).every(row => baseJinshiIds.has(row.id)), 'V62 金石显示覆盖包含新增或未知 ID');
assert((jinshiDisplay?.records || []).every(row => row.sourceName && row.displayTitle && !/^【[^】]+】/.test(row.displayTitle)), '金石 displayTitle 仍含前置【额】等说明标记或缺原题名');
for (const record of normalizedJinshi) {
  const reconstructed = jinshiContext.SGZ_JINSHI_SCHEMA?.reconstructTranscriptionSections(record.transcriptionSections || []);
  assert(reconstructed === String(record.inscription || ''), `金石 ${record.id} 分节后无法无损回组释文`);
}
const zhangJun = normalizedJinshi.find(row => row.name === '【额】晋张君碑');
assert(zhangJun?.displayTitle === '晋张君碑' && zhangJun.name === '【额】晋张君碑', '晋张君碑读者题名净化或原始题名保留失败');

/* 金石高亮必须以文本片段渲染，不能把释文作为原始 HTML 注入。 */
assert(!/v-html\s*=\s*["']epigraphicHighlight/.test(html), '金石释文仍通过 v-html 注入高亮结果');
const highlightStart = html.indexOf('function epigraphicHighlight');
const highlightEnd = html.indexOf('function epigraphicArchiveClass', highlightStart + 1);
const highlightSource = highlightStart >= 0 && highlightEnd > highlightStart ? html.slice(highlightStart, highlightEnd) : '';
assert(highlightSource.includes('fragments') && !/innerHTML|<mark|replace\([^\n]*<span/.test(highlightSource), '金石高亮函数未返回安全文本片段');
assert(html.includes('v-for="(fragment,index) in epigraphicHighlight(section.text)"') && html.includes('{{fragment.text}}'), '金石释文模板未使用转义文本片段渲染');

/* 立绘：保住既有 175 项，新 100 项五朝各 20，并与真实 Figma 映射一致。 */
const portraitContext = loadScripts(['data/portrait-manifest.js']);
const portraitManifest = portraitContext.SGZ_PERSON_PORTRAIT_MANIFEST;
const portraitAssets = Object.values(portraitManifest?.assetsById || {});
const legacyPortraitAssets = portraitAssets.filter(row => row.portraitKind !== 'ui-illustration-v62');
const v62PortraitAssets = portraitAssets.filter(row => row.portraitKind === 'ui-illustration-v62');
assert(portraitManifest?.schemaVersion === 3, '立绘 manifest 尚未升级到 schemaVersion 3');
assert(legacyPortraitAssets.length === 175, `既有 175 个立绘发生丢失或重复，实际 ${legacyPortraitAssets.length}`);
assert(v62PortraitAssets.length === 100 && portraitAssets.length === 275, `最终立绘清单不是 175＋100，实际 ${legacyPortraitAssets.length}＋${v62PortraitAssets.length}`);
assert(portraitManifest?.defaultPersonIds?.length === 123, '默认精选人物不再是 123 人');
assert(portraitCatalog?.plannedTotal === 100 && portraitCatalog?.reservedSlots?.length === 100, 'V62 立绘资源槽不是 100 个');
assert(portraitCatalog?.assignedTotal === 100 && portraitCatalog?.readyTotal === 100, `V62 立绘未完成 100 项，assigned=${portraitCatalog?.assignedTotal || 0}，ready=${portraitCatalog?.readyTotal || 0}`);
assert(sameArray(portraitCatalog?.dynastyOrder, dynastyOrder), 'V62 立绘目录五朝顺序错误');
const slotPersonIds = new Set();
const slotPortraitIds = new Set();
const slotFigmaNodeIds = new Set();
const slotAssetHashes = new Set();
const slotProblems = [];
for (const dynasty of dynastyOrder) {
  assert((portraitCatalog?.reservedSlots || []).filter(row => row.dynasty === dynasty).length === 20, `${dynasty} 新增立绘不是 20 个`);
}
for (const slot of portraitCatalog?.reservedSlots || []) {
  if (!slot.personId || !/^person:(?!unresolved:)/.test(slot.personId)) slotProblems.push(`${slot.portraitId}:personId`);
  if (!slot.name || slot.status !== 'ready' || slot.assetStatus !== 'ready') slotProblems.push(`${slot.portraitId}:ready`);
  if (slot.interfaceOnly !== true) slotProblems.push(`${slot.portraitId}:interfaceOnly`);
  if (slot.personId && slotPersonIds.has(slot.personId)) slotProblems.push(`${slot.portraitId}:重复personId`);
  if (slotPortraitIds.has(slot.portraitId)) slotProblems.push(`${slot.portraitId}:重复portraitId`);
  if (slot.personId) slotPersonIds.add(slot.personId);
  slotPortraitIds.add(slot.portraitId);
  const size = pngSize(slot.assetPath);
  if (size?.width !== 512 || size?.height !== 512) slotProblems.push(`${slot.portraitId}:512x512`);
  const assetHash = sha256(String(slot.assetPath || '').replace(/^\.\//, ''));
  if (!assetHash || slotAssetHashes.has(assetHash)) slotProblems.push(`${slot.portraitId}:重复或缺失图片`);
  if (assetHash) slotAssetHashes.add(assetHash);
  if (slot.designStatus !== 'figma-design') slotProblems.push(`${slot.portraitId}:designStatus`);
  if (slot.designRef?.fileKey !== 'gvWRC5GHHSgd8QX9b2VJgo' || slot.designRef?.version !== 'V62' || slot.designRef?.pageName !== 'V62 / Portraits') slotProblems.push(`${slot.portraitId}:designRef`);
  if (!figmaNodeId(slot.designRef?.nodeId)) slotProblems.push(`${slot.portraitId}:nodeId`);
  if (figmaNodeId(slot.designRef?.nodeId)) {
    if (slotFigmaNodeIds.has(slot.designRef.nodeId)) slotProblems.push(`${slot.portraitId}:重复nodeId`);
    slotFigmaNodeIds.add(slot.designRef.nodeId);
  }
  const manifestAsset = portraitManifest?.assetsById?.[slot.portraitId];
  if (manifestAsset?.personId !== slot.personId || manifestAsset?.assetPath !== slot.assetPath) slotProblems.push(`${slot.portraitId}:manifest`);
  if (manifestAsset?.designRef?.nodeId !== slot.designRef?.nodeId) slotProblems.push(`${slot.portraitId}:manifestNodeId`);
}
assert(slotProblems.length === 0, `V62 100 个立绘资源槽有 ${slotProblems.length} 项未闭合：${slotProblems.slice(0, 12).join('，')}${slotProblems.length > 12 ? '…' : ''}`);

/* Figma 唯一映射清单：页面、组件、275 个立绘均须是真实节点。 */
const requiredFigmaPages = [
  'V58 / Foundations',
  'V58 / Shell',
  'V58 / Modules',
  'V58 / Portraits',
  'V60 / Reader Clean State',
  'V60 / Research Workflow',
  'V61 / People & Epigraphy',
  'V62 / Updated Modules',
  'V62 / Portraits',
];
const pageRows = objectRows(figmaMapping?.pages, 'pageName');
const pageByName = new Map(pageRows.map(row => [row.pageName || row.name, row]));
const componentRows = objectRows(figmaMapping?.components, 'componentKey');
const mappedPortraitRows = objectRows(figmaMapping?.portraits, 'portraitId');
const mappedPortraitById = new Map(mappedPortraitRows.map(row => [row.portraitId, row]));
if (figmaMapping) {
  const figmaProblems = [];
  if (figmaMapping.schemaVersion !== 'V62') figmaProblems.push('schemaVersion');
  if (figmaMapping.fileKey !== 'gvWRC5GHHSgd8QX9b2VJgo') figmaProblems.push('fileKey');
  if (figmaMapping.status !== 'complete') figmaProblems.push(`status:${figmaMapping.status || 'missing'}`);
  if (!Number.isFinite(Date.parse(figmaMapping.validatedAt || ''))) figmaProblems.push('validatedAt');
  for (const pageName of requiredFigmaPages) {
    const row = pageByName.get(pageName);
    if (!row || !figmaNodeId(row.nodeId)) figmaProblems.push(`页面:${pageName}`);
  }
  if (!componentRows.length) figmaProblems.push('组件:空');
  for (const component of componentRows) {
    const variantIds = Array.isArray(component.variantIds) ? component.variantIds : Object.values(component.variantIds || {});
    if (!figmaNodeId(component.componentSetId)) figmaProblems.push(`组件:${component.componentKey || component.name}:componentSetId`);
    if (!figmaNodeId(component.documentationFrameId)) figmaProblems.push(`组件:${component.componentKey || component.name}:documentationFrameId`);
    if (!variantIds.length || !variantIds.every(figmaNodeId)) figmaProblems.push(`组件:${component.componentKey || component.name}:variantIds`);
  }
  if (mappedPortraitRows.length !== 275 || mappedPortraitById.size !== 275) figmaProblems.push(`立绘数量:${mappedPortraitById.size}/275`);
  for (const asset of portraitAssets) {
    const mapping = mappedPortraitById.get(asset.portraitId);
    if (mapping?.personId !== asset.personId) figmaProblems.push(`立绘:${asset.portraitId}:personId`);
    if (!figmaNodeId(mapping?.nodeId)) figmaProblems.push(`立绘:${asset.portraitId}:nodeId`);
    if (mapping?.pageName !== (asset.portraitKind === 'ui-illustration-v62' ? 'V62 / Portraits' : 'V58 / Portraits')) figmaProblems.push(`立绘:${asset.portraitId}:pageName`);
    if (asset.designRef?.fileKey !== 'gvWRC5GHHSgd8QX9b2VJgo') figmaProblems.push(`立绘:${asset.portraitId}:manifestFileKey`);
    if (asset.designRef?.nodeId !== mapping?.nodeId) figmaProblems.push(`立绘:${asset.portraitId}:manifestNodeId`);
  }
  assert(figmaProblems.length === 0, `Figma 唯一映射清单有 ${figmaProblems.length} 项未闭合：${figmaProblems.slice(0, 12).join('，')}${figmaProblems.length > 12 ? '…' : ''}`);
}

/* 形势图冻结边界。 */
assert(sha256('data/map-period-registry.json') === 'fe3894be8f88512a77431d3e2dc9b7242ca488b580e0341c306d97b8c04147a8', '地图时期注册表发生变化');
assert(sha256('assets/map/data/All_Provinces.json') === 'd146462ff2143a5351acb9bf6171950b874e8cac66a0d455a5aaf7579b13af3e', '地图几何发生变化');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, version: 'V62', failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    version: 'V62',
    people: people.people.length,
    dynastyTagCounts: people.summary.tagCounts,
    peerage: { total: 590, readerVisible: 525 },
    jinFangzhen: jinFangzhen.summary,
    epigraphy: { records: normalizedJinshi.length, withInscription, withoutInscription: normalizedJinshi.length - withInscription },
    portraits: { existing: legacyPortraitAssets.length, added: v62PortraitAssets.length, figmaMapped: mappedPortraitById.size },
    figma: { pages: requiredFigmaPages.length, components: componentRows.length, status: figmaMapping.status },
    mapFrozen: true,
  }, null, 2));
}
