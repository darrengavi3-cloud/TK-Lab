import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const fullPath = relative => path.join(root, relative);
const read = relative => fs.readFileSync(fullPath(relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const sha256 = relative => crypto.createHash('sha256').update(fs.readFileSync(fullPath(relative))).digest('hex');
const text = value => String(value == null ? '' : value).trim();

for (const relative of [
  'data/v65-epigraphy-audit.json',
  'data/v65-epigraphy-audit.js',
  'data/v65-epigraphy-reader-overlays.json',
  'data/v65-epigraphy-reader-overlays.js',
  'data/v65-epigraphy-individual-search.json',
  'scripts/build-v65-epigraphy-audit.mjs',
  'docs/V65金石释文收口.md',
]) {
  assert(fs.existsSync(fullPath(relative)), `缺少 V65 金石文件：${relative}`);
}

const beforeJson = sha256('data/v65-epigraphy-audit.json');
const beforeJs = sha256('data/v65-epigraphy-audit.js');
const beforeReaderJson = sha256('data/v65-epigraphy-reader-overlays.json');
const beforeReaderJs = sha256('data/v65-epigraphy-reader-overlays.js');
const rebuild = spawnSync(process.execPath, [fullPath('scripts/build-v65-epigraphy-audit.mjs')], {
  cwd: root,
  encoding: 'utf8',
});
assert(rebuild.status === 0, `V65 金石重建失败：${text(rebuild.stderr) || text(rebuild.stdout)}`);
assert(beforeJson === sha256('data/v65-epigraphy-audit.json'), 'V65 金石 JSON 重建结果不确定');
assert(beforeJs === sha256('data/v65-epigraphy-audit.js'), 'V65 金石 JS 重建结果不确定');
assert(beforeReaderJson === sha256('data/v65-epigraphy-reader-overlays.json'), 'V65 金石读者 JSON 重建结果不确定');
assert(beforeReaderJs === sha256('data/v65-epigraphy-reader-overlays.js'), 'V65 金石读者 JS 重建结果不确定');

const audit = json('data/v65-epigraphy-audit.json');
const readerOverlays = json('data/v65-epigraphy-reader-overlays.json');
const individualSearch = json('data/v65-epigraphy-individual-search.json');
const context = { console };
context.window = context;
context.globalThis = context;
vm.createContext(context);
for (const relative of [
  'data/jinshi-schema.js',
  'data/epigraphic-records.js',
  'data/epigraphic-v46-jin.js',
  'data/v60-research-ledger.js',
  'data/v61-epigraphy-research.js',
  'data/v62-jinshi-display.js',
  'data/v65-epigraphy-audit.js',
  'data/v65-epigraphy-reader-overlays.js',
]) {
  try {
    vm.runInContext(read(relative), context, { filename: relative, timeout: 20_000 });
  } catch (error) {
    failures.push(`${relative} 无法载入：${error.message}`);
  }
}

const baseRecords = [
  ...(context.SGZ_EPIGRAPHIC_RECORDS?.records || []),
  ...(context.SGZ_EPIGRAPHIC_V46_JIN?.records || []),
];
const baseIds = baseRecords.map(row => row.id);
const baseIdSet = new Set(baseIds);
const baseIdHash = crypto.createHash('sha256').update(baseIds.join('\n')).digest('hex');
assert(baseRecords.length === 188 && baseIdSet.size === 188, '当前金石规范源不是 188 个唯一稳定 ID');
assert(audit.baseline?.recordCount === 188 && audit.baseline?.stableIdCount === 188, 'V65 审校基线未登记 188 个稳定 ID');
assert(JSON.stringify(audit.baseline?.recordIds) === JSON.stringify(baseIds), 'V65 审校基线 ID 或顺序与当前规范源不一致');
assert(audit.baseline?.recordIdSha256 === baseIdHash, 'V65 审校基线 ID 哈希与当前规范源不一致');

const v60ById = new Map((context.SGZ_V60_RESEARCH_LEDGER?.epigraphy || []).map(row => [row.id, row]));
const v61ById = new Map((context.SGZ_V61_EPIGRAPHY_RESEARCH?.epigraphy || []).map(row => [row.id, row]));
const v62ById = new Map((context.SGZ_V62_JINSHI_DISPLAY?.records || []).map(row => [row.id, row]));
const normalized = baseRecords.map(raw => context.SGZ_JINSHI_SCHEMA.normalize({
  ...raw,
  ...(v60ById.get(raw.id) || {}),
  ...(v61ById.get(raw.id) || {}),
  ...(v62ById.get(raw.id) || {}),
}));
const readerBase = baseRecords.map(raw => context.SGZ_JINSHI_SCHEMA.normalize({
  ...raw,
  ...(v62ById.get(raw.id) || {}),
}));
const baselineBlank = normalized.filter(row => !text(row.inscription));
const baselineWith = normalized.length - baselineBlank.length;
assert(baselineWith === 50 && baselineBlank.length === 138, `V65 实施前基线不再是 50／138，实际 ${baselineWith}／${baselineBlank.length}`);
assert(audit.baseline?.withInscription === 50 && audit.baseline?.withoutInscription === 138, 'V65 文件登记的 50／138 基线不一致');

const blankIds = new Set(baselineBlank.map(row => row.id));
const auditIds = new Set((audit.records || []).map(row => row.recordId));
assert(audit.records?.length === 138 && auditIds.size === 138, 'V65 138 条空释文没有逐条唯一处置');
assert([...auditIds].every(id => blankIds.has(id)) && [...blankIds].every(id => auditIds.has(id)), 'V65 处置范围与当前 138 条空释文不完全一致');
assert((audit.records || []).every(row => row.auditId === `v65-epigraphy:${row.recordId}`), 'V65 审校记录缺少确定性 auditId');
assert((audit.records || []).every(row => row.searchState && row.searchMethod && row.transcriptionDisposition && row.historicalDisposition && row.sourceVerification && row.publicationStatus && typeof row.individualSearchCompleted === 'boolean'), '存在缺少检索方法、释文处置、历史处置或发布状态的记录');
assert((audit.records || []).every(row => ['确定', '存疑', '争议', '明确无候选', '排除'].includes(row.transcriptionDisposition)), '存在未闭环的释文处置值');
assert((audit.records || []).every(row => ['确定', '存疑', '争议', '明确无候选', '排除'].includes(row.historicalDisposition)), '存在未闭环的历史处置值');
assert((audit.records || []).every(row => ['reader-visible', 'review-only'].includes(row.publicationStatus)), '存在无效 publicationStatus');
assert((audit.records || []).every(row => Array.isArray(row.searchSources) && row.searchSources.length > 0), '存在没有检索来源的空释文记录');
assert((audit.records || []).flatMap(row => row.searchSources).every(source => /^https:\/\//.test(source.url || '') && source.locator && source.accessedAt === '2026-08-30'), '检索来源缺 URL、locator 或统一访问日期');

const adopted = (audit.records || []).filter(row => row.publicationStatus === 'reader-visible');
const reviewOnly = (audit.records || []).filter(row => row.publicationStatus === 'review-only');
assert(adopted.length === 2 && reviewOnly.length === 136, `V65 实际采用／保持空值不是 2／136，而是 ${adopted.length}／${reviewOnly.length}`);
assert(JSON.stringify(audit.adoptedIds) === JSON.stringify(['wei-kongxian-stele', 'wu-liangxiu-stele'].sort((a, b) => baseIds.indexOf(a) - baseIds.indexOf(b))), 'V65 采用 ID 不符合已核两条记录或基线顺序');
assert(reviewOnly.every(row => row.transcriptionDisposition === '存疑' && row.historicalDisposition === '存疑' && row.sourceVerification?.level === 'individual-discovery'), '非采用记录没有以存疑／individual-discovery 保持录文边界');
assert(reviewOnly.every(row => row.searchMethod === 'individual-single-name-api' && row.individualSearchCompleted === true), '136 条空释文未全部完成逐碑单名检索');
assert(reviewOnly.every(row => /逐碑独立检索完成/.test(row.searchState)), '逐碑独立检索状态未如实登记完成');
for(const row of reviewOnly){
  assert(row.searchSources?.length===2,`${row.recordId} 没有两个独立检索入口`);
  for(const source of row.searchSources||[]){
    assert(source.role==='individual-discovery'&&source.searchMethod==='individual-single-name-api'&&source.query===row.name&&source.status==='completed'&&source.httpStatus===200,`${row.recordId} 独立检索日志缺方法、查询词或实际 HTTP 成功状态`);
    try{
      const url=new URL(source.url);
      assert(url.searchParams.get('srsearch')===`"${row.name}"`&&!/\sOR\s/i.test(url.searchParams.get('srsearch')||''),`${row.recordId} 检索 URL 不是当前单一碑名`);
    }catch{assert(false,`${row.recordId} 检索 URL 无法解析`);}
  }
}
assert(reviewOnly.every(row => row.canonicalOverlay?.inscription === '' && row.canonicalOverlay?.inscriptionStatus === '源文未见' && row.canonicalOverlay?.inscriptionVariants?.length === 0), 'review-only 记录被写入或生成释文');

const allowedVariantTypes = new Set(['original', 'supplied', 'reading', 'laterAddition']);
for (const row of adopted) {
  const overlay = row.canonicalOverlay || {};
  const sources = row.sourceVerification?.sources || [];
  assert(row.transcriptionDisposition === '确定' && row.candidateDisposition === '采用' && row.individualSearchCompleted === true && row.searchMethod === 'individual-primary-verification', `${row.recordId} 的录文采用结论或逐条核验状态不完整`);
  assert(text(overlay.inscription) && overlay.inscriptionStatus === '残缺', `${row.recordId} 缺少残缺释文正文或状态`);
  assert(row.sourceVerification?.level === '金石目录录文' && row.sourceVerification?.status === '已核金石目录录文', `${row.recordId} 没有明确标成金石目录录文层级`);
  assert(row.sourceVerification?.sources?.every(source => /金石目录录文/.test(source.role || '') && /非原拓核验/.test(source.role || '')), `${row.recordId} 的来源角色仍可能暗示已经核对原拓`);
  assert(sources.length > 0 && sources.every(source => /^https:\/\/zh\.wikisource\.org\//.test(source.url || '') && source.locator && source.revisionId && source.accessedAt === '2026-08-30' && source.accessState === 'accessible'), `${row.recordId} 缺少已访问的固定版本正式来源`);
  assert(!sources.some(source => /wikipedia\.org/.test(source.url || '')), `${row.recordId} 错把 Wikipedia 作为正式释文来源`);
  assert(Array.isArray(overlay.inscriptionVariants) && overlay.inscriptionVariants.some(variant => variant.type === 'original' && variant.text === overlay.inscription), `${row.recordId} 缺少与规范正文一致的 original 层`);
  assert(overlay.inscriptionVariants.every(variant => allowedVariantTypes.has(variant.type) && text(variant.text) && variant.source), `${row.recordId} 存在无效、无文本或无来源的释文层`);
  assert(/[□〈][^\n]*[〉]?/.test(overlay.inscription), `${row.recordId} 的残缺符号未保留`);
}
const kongxian = adopted.find(row => row.recordId === 'wei-kongxian-stele');
const liangxiu = adopted.find(row => row.recordId === 'wu-liangxiu-stele');
assert(kongxian?.transcriptionDisposition === '确定' && kongxian?.historicalDisposition === '确定', '孔羡碑录文与历史处置未按金石目录录文边界登记');
assert(liangxiu?.transcriptionDisposition === '确定' && liangxiu?.historicalDisposition === '争议', '梁休碑未拆分“录文确定／历史解释争议”');
assert(kongxian?.canonicalOverlay?.inscription.includes('維黄初元年大魏受命') && kongxian.canonicalOverlay.inscription.includes('如山之基'), '孔羡碑正式录文首尾不完整');
assert(kongxian?.canonicalOverlay?.inscriptionVariants?.some(variant => variant.type === 'supplied' && variant.text.includes('之末') && variant.text.includes('時三公')), '孔羡碑《魏志》补读未与原文分栏');
assert(!kongxian?.canonicalOverlay?.inscription.includes('魏志作之末') && !kongxian?.canonicalOverlay?.inscription.includes('魏志作時三公'), '孔羡碑把目录注释混入规范正文');
assert(liangxiu?.canonicalOverlay?.inscription.includes('休字元堅') && liangxiu.canonicalOverlay.inscription.includes('歿不朽傳兆□'), '梁休碑正式录文首尾不完整');

const overlayById = context.SGZ_V65_EPIGRAPHY_AUDIT?.overlayById || {};
assert(Object.keys(overlayById).length === 138, 'V65 JS 镜像没有为 138 条记录建立覆盖索引');
assert(JSON.stringify(context.SGZ_V65_EPIGRAPHY_AUDIT?.records) === JSON.stringify(audit.records), 'V65 JS 镜像与 JSON 不一致');
const postV65 = normalized.map(row => context.SGZ_JINSHI_SCHEMA.normalize({ ...row, ...(overlayById[row.id] || {}) }));
const postWith = postV65.filter(row => text(row.inscription)).length;
assert(postWith === 52 && postV65.length - postWith === 136, `V65 覆盖后释文状态不是 52／136，实际 ${postWith}／${postV65.length - postWith}`);
assert(audit.summary?.auditedBlankRecords === 138 && audit.summary?.adoptedTranscriptions === 2 && audit.summary?.reviewOnlyRecords === 136, 'V65 summary 处置数量不闭合');
assert(audit.summary?.postV65WithInscription === 52 && audit.summary?.postV65WithoutInscription === 136, 'V65 summary 覆盖后数量不闭合');
assert(audit.summary?.sourceLevels?.['金石目录录文'] === 2 && audit.summary?.sourceLevels?.['individual-discovery'] === 136, 'V65 来源层级统计不闭合');
assert(audit.summary?.pendingIndividualSearch === 0 && audit.summary?.completedIndividualSearch === 136, '逐碑独立检索完成／待检数量未闭合');
assert(individualSearch.schemaVersion==='V65'&&individualSearch.modelId==='sgz-v65-epigraphy-individual-search'&&individualSearch.targetCount===136&&individualSearch.completedRecords===136&&individualSearch.completedSearches===272&&individualSearch.failedSearches===0,'独立联网检索缓存未达到 136 条／272 次／0 失败');

const forbiddenReaderKeys = new Set([
  'auditId',
  'searchState',
  'searchMethod',
  'individualSearchCompleted',
  'transcriptionDisposition',
  'historicalDisposition',
  'sourceVerification',
  'searchSources',
  'publicationStatus',
  'candidateDisposition',
  'finalConclusion',
  'canonicalOverlay',
  'sourceLocator',
  'source',
  'note',
]);
function collectKeys(value, keys = []) {
  if (Array.isArray(value)) value.forEach(item => collectKeys(item, keys));
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}
const leakedReaderKeys = [...new Set(collectKeys(readerOverlays).filter(key => forbiddenReaderKeys.has(key)))];
assert(readerOverlays.schemaVersion === 'V65' && readerOverlays.modelId === 'sgz-v65-epigraphy-reader-overlays', 'V65 金石读者覆盖文件标识异常');
const cumulativeReaderIds=[...(context.SGZ_V61_EPIGRAPHY_RESEARCH?.adoptedIds||[]),...audit.adoptedIds]
  .sort((a,b)=>baseIds.indexOf(a)-baseIds.indexOf(b));
assert(readerOverlays.records?.length === 6 && new Set(readerOverlays.records.map(row => row.recordId)).size === 6, 'V65 金石累计读者覆盖不是 V61 四条加 V65 两条');
assert(JSON.stringify(readerOverlays.records.map(row => row.recordId)) === JSON.stringify(cumulativeReaderIds), '读者累计覆盖 ID 与 V61/V65 采用集合不一致');
assert(readerOverlays.records.every(row => Object.keys(row).sort().join('|') === ['inscription', 'inscriptionStatus', 'inscriptionVariants', 'recordId'].sort().join('|')), '读者覆盖记录含非必要顶层字段');
assert(readerOverlays.records.every(row => text(row.inscription) && ['已录入','残缺'].includes(row.inscriptionStatus) && row.inscriptionVariants?.some(variant => variant.type === 'original')), '读者覆盖缺释文、合法状态或 original 层');
assert(readerOverlays.records.flatMap(row => row.inscriptionVariants).every(variant => Object.keys(variant).sort().join('|') === ['label', 'text', 'type'].sort().join('|')), '读者释文层含审校或来源字段');
assert(leakedReaderKeys.length === 0, `读者覆盖泄露审校字段：${leakedReaderKeys.join('、')}`);
assert(JSON.stringify(context.SGZ_V65_EPIGRAPHY_READER_OVERLAYS?.records) === JSON.stringify(readerOverlays.records), 'V65 金石读者 JS 与 JSON 不一致');
assert(Object.keys(context.SGZ_V65_EPIGRAPHY_READER_OVERLAYS?.byId || {}).length === 6, 'V65 金石读者 JS 缺少六条累计 byId 索引');
const readerOverlayById=context.SGZ_V65_EPIGRAPHY_READER_OVERLAYS?.byId||{};
const readerPost=readerBase.map(row=>context.SGZ_JINSHI_SCHEMA.normalize({...row,...(readerOverlayById[row.id]||{})}));
const readerBaseWith=readerBase.filter(row=>text(row.inscription)).length;
const readerPostWith=readerPost.filter(row=>text(row.inscription)).length;
assert(readerBaseWith===46&&readerBase.length-readerBaseWith===142,`真实读者基线不是 46／142，实际 ${readerBaseWith}／${readerBase.length-readerBaseWith}`);
assert(readerPostWith===52&&readerPost.length-readerPostWith===136,`真实读者 base+累计overlay 不是 52／136，实际 ${readerPostWith}／${readerPost.length-readerPostWith}`);

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    baseline: { records: 188, withInscription: 50, withoutInscription: 138 },
    v65: {
      audited: 138,
      adopted: 2,
      adoptedIds: audit.adoptedIds,
      remainingBlank: 136,
      sourceLevels: audit.summary.sourceLevels,
    },
    deterministic: true,
  }, null, 2));
}
