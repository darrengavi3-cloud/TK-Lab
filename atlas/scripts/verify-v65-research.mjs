import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { V65_GENERAL_TITLE_EVIDENCE } from './lib/v65-general-title-evidence.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(`V65 史料验证失败：${message}`); };
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function loadWindowScript(relative, globalName){
  const context = { window: {} };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(read(relative), context, { filename: relative, timeout: 20_000 });
  return JSON.parse(JSON.stringify(context.window[globalName]));
}

const titleAudit = json('data/v65-general-title-research.json');
const volumeAudit = json('data/v65-volume-review.json');
const titleJs = loadWindowScript('data/v65-general-title-research.js', 'SGZ_V65_GENERAL_TITLE_RESEARCH');
const volumeJs = loadWindowScript('data/v65-volume-review.js', 'SGZ_V65_VOLUME_REVIEW');
const generalTitles = loadWindowScript('data/general-titles.js', 'SGZ_GENERAL_TITLES');
const sourceIndex = json('data/person-source-index.json');
const legacyLedger = json('data/v60-research-ledger.json');

assert(JSON.stringify(titleJs) === JSON.stringify(titleAudit), '将军名号 JSON/JS 不一致');
assert(JSON.stringify(volumeJs) === JSON.stringify(volumeAudit), '卷次台账 JSON/JS 不一致');

const legacyPending = generalTitles.groups.flatMap(group => group.titles
  .filter(record => record.evidence === '待考')
  .map(record => ({ polity: group.polity, title: record.title, sortOrder: record.sortOrder })));
assert(legacyPending.length === 154, `规范源待考名号不再是154条，实际${legacyPending.length}`);
assert(titleAudit.records.length === legacyPending.length, '逐条审校记录没有与154条旧记录闭合');
assert(V65_GENERAL_TITLE_EVIDENCE.records.length === legacyPending.length, '通卷检索快照不是154条');

const expectedPolityCounts = { wei: 46, shu: 35, wu: 51, jin: 22 };
const actualPolityCounts = titleAudit.records.reduce((out, record) => {
  out[record.polity] = (out[record.polity] || 0) + 1;
  return out;
}, {});
assert(JSON.stringify(actualPolityCounts) === JSON.stringify(expectedPolityCounts), `政权数量不闭合：${JSON.stringify(actualPolityCounts)}`);

const expectedLegacyKeys = new Set(V65_GENERAL_TITLE_EVIDENCE.records.map(record => record.key));
const evidenceByKey = new Map(V65_GENERAL_TITLE_EVIDENCE.records.map(record => [record.key, record]));
const seenIds = new Set();
const seenKeys = new Set();
const seenExactHitIds = new Set();
const allowedDispositions = new Set(['确定','推定','存疑','争议','明确无候选','排除']);
for (const record of titleAudit.records) {
  assert(/^v65:general-title:(wei|shu|wu|jin):[0-9a-f]{16}$/.test(record.id), `不稳定或非法ID ${record.id}`);
  assert(!seenIds.has(record.id), `重复ID ${record.id}`);
  seenIds.add(record.id);
  assert(expectedLegacyKeys.has(record.sourceRecordKey), `原记录键丢失 ${record.sourceRecordKey}`);
  assert(!seenKeys.has(record.sourceRecordKey), `原记录重复映射 ${record.sourceRecordKey}`);
  seenKeys.add(record.sourceRecordKey);
  assert(record.searchState === 'completed', `${record.sourceRecordKey} searchState未完成`);
  assert(allowedDispositions.has(record.historicalDisposition), `${record.sourceRecordKey} 处置非法`);
  assert(record.searchScope?.length >= 3, `${record.sourceRecordKey} 缺少检索范围`);
  assert(record.sources?.length > 0, `${record.sourceRecordKey} 缺少来源`);
  assert(record.sources.every(source => /^https:\/\//.test(source.sourceUrl) && source.accessedAt === '2026-08-30'), `${record.sourceRecordKey} 来源URL或访问日期缺失`);
  assert(record.sources.every(source => source.evidenceLayer && !/按原卷保留|不能由字符串|正文／注层/.test(source.evidenceLayer)), `${record.sourceRecordKey} 仍有占位 evidenceLayer`);
  assert(record.sourceLocator && record.conclusion && Object.hasOwn(record, 'unresolvedReason'), `${record.sourceRecordKey} 闭环字段不全`);
  assert(record.historicalDisposition === '确定' || record.unresolvedReason, `${record.sourceRecordKey} 非确定项没有具体原因`);
  assert(record.publicationStatus === (record.historicalDisposition === '确定' ? 'verified' : 'review-only'), `${record.sourceRecordKey} 发布门禁不一致`);
  assert(!/待考/.test(`${record.searchState}${record.historicalDisposition}`), `${record.sourceRecordKey} 仍以待考作为最终状态`);
  const snapshot = evidenceByKey.get(record.sourceRecordKey);
  assert(snapshot, `${record.sourceRecordKey} 缺检索快照`);
  assert(record.exactHitCount === snapshot.hits.length && record.exactHits.length === snapshot.hits.length && record.exactHitIds.length === snapshot.hits.length, `${record.sourceRecordKey} 未全量保留精确命中`);
  assert(JSON.stringify(record.exactHits) === JSON.stringify(snapshot.hits), `${record.sourceRecordKey} 命中次序或内容与快照不同`);
  for (const hit of record.exactHits) {
    assert(!seenExactHitIds.has(hit.id), `精确命中ID重复 ${hit.id}`);
    seenExactHitIds.add(hit.id);
    assert(hit.sourceUrl && hit.sourceRevision && Number.isInteger(hit.offset), `${hit.id} 缺来源定位`);
    assert(hit.evidenceLayer && hit.evidenceLayerType && !/占位|按原卷保留|不能由字符串/.test(hit.evidenceLayer), `${hit.id} evidenceLayer未结构化`);
  }
}
assert(seenKeys.size === expectedLegacyKeys.size, '旧154条未全部保留原记录键');
assert(seenExactHitIds.size === V65_GENERAL_TITLE_EVIDENCE.summary.exactHitCount, `应保留${V65_GENERAL_TITLE_EVIDENCE.summary.exactHitCount}个精确命中，实际${seenExactHitIds.size}`);

const titleByPolityAndName = new Map(titleAudit.records.map(record => [`${record.polity}|${record.title}`, record]));
const recordOf = (polity, title) => titleByPolityAndName.get(`${polity}|${title}`);
const requireSemanticEvidence = (polity, title, disposition, checks) => {
  const record = recordOf(polity, title);
  assert(record?.historicalDisposition === disposition, `${polity}|${title} 应为${disposition}`);
  assert(record.publicationStatus === (disposition === '确定' ? 'verified' : 'review-only'), `${polity}|${title} 发布门禁错误`);
  for (const check of checks) {
    const matches = record.exactHits.filter(hit => hit.work === check.work && hit.volume === check.volume && check.terms.some(term => `${hit.section}\n${hit.sourceExcerpt}`.includes(term)));
    assert(matches.length > 0, `${polity}|${title} 缺${check.work}卷${check.volume}语义证据：${check.terms.join('/')}`);
    assert(matches.every(hit => hit.evidenceLayer && hit.evidenceLayer !== '占位'), `${polity}|${title} 语义证据层未分解`);
  }
};

requireSemanticEvidence('wei', '虎牙将军', '确定', [{ work: '《三国志》', volume: 8, terms: ['文帝踐阼'] }]);
requireSemanticEvidence('wei', '度辽将军', '确定', [{ work: '《三国志》', volume: 8, terms: ['柔度遼將軍'] }]);
requireSemanticEvidence('wei', '裨将军', '确定', [{ work: '《三国志》', volume: 18, terms: ['文帝即王位'] }]);
requireSemanticEvidence('shu', '征西将军', '确定', [{ work: '《三国志》', volume: 44, terms: ['姜維'] }]);
requireSemanticEvidence('shu', '前将军', '确定', [{ work: '《三国志》', volume: 39, terms: ['姓胡，名濟'] }]);
requireSemanticEvidence('shu', '后将军', '确定', [{ work: '《三国志》', volume: 40, terms: ['吳班'] }]);
requireSemanticEvidence('shu', '左将军', '确定', [{ work: '《三国志》', volume: 40, terms: ['吳壹'] }]);
requireSemanticEvidence('shu', '右将军', '确定', [{ work: '《三国志》', volume: 40, terms: ['高翔'] }]);
requireSemanticEvidence('shu', '翊军将军', '确定', [{ work: '《三国志》', volume: 41, terms: ['霍弋'] }]);
requireSemanticEvidence('wu', '前将军', '确定', [{ work: '《三国志》', volume: 48, terms: ['唐咨'] }]);
requireSemanticEvidence('wu', '左将军', '确定', [{ work: '《三国志》', volume: 48, terms: ['留贊', '張布'] }]);
requireSemanticEvidence('jin', '安东将军', '确定', [{ work: '《晋书》', volume: 5, terms: ['索綝'] }]);
requireSemanticEvidence('jin', '安西将军', '确定', [{ work: '《晋书》', volume: 37, terms: ['下邳王晃'] }]);
requireSemanticEvidence('jin', '平西将军', '确定', [{ work: '《晋书》', volume: 120, terms: ['羅尚'] }]);
for (const title of ['横江将军','折冲将军','抚边将军','扶义将军']) assert(recordOf('wu', title)?.historicalDisposition === '推定', `吴${title}仅有建国前人例，应保持推定`);
assert(recordOf('wu', '绥远将军')?.historicalDisposition === '确定' && recordOf('wu', '绥远将军').exactHits.some(hit => hit.volume === 61 && `${hit.section}\n${hit.sourceExcerpt}`.includes('陸凱')) && recordOf('wu', '绥远将军').confirmingHitIds.length > 0, '吴绥远将军未用陆凯建国后人例闭合');
assert(recordOf('wu', '安南将军')?.historicalDisposition === '争议', '吴安南将军的郭马自号必须保持争议');
assert(recordOf('wu', '平南将军')?.historicalDisposition === '争议', '吴平南将军的廖式自号必须保持争议');
assert(recordOf('wei', '安夷将军')?.historicalDisposition === '明确无候选', '魏安夷将军不得把安夷护军扩写为将军');
const weiTaokou = recordOf('wei', '讨寇将军');
assert(weiTaokou.exactHits.some(hit => hit.evidenceLayer === '裴注引《魏略》'), '魏讨寇将军未标识裴注引《魏略》');
const weiJishe = recordOf('wei', '积射将军');
assert(weiJishe.exactHits.some(hit => hit.evidenceLayer === '裴注引《世語》') && weiJishe.sources.some(source => source.evidenceLayer === '制度正文'), '魏积射将军未分开《世语》跨期人例与《通典》制度证据');
const wuZhengxi = recordOf('wu', '征西将军');
assert(wuZhengxi.exactHits.some(hit => hit.work === '《三国志》' && hit.volume === 48 && hit.evidenceLayer === '正文' && hit.sourceExcerpt.includes('留平')), '吴征西将军应归卷48正文留平，不得误归相邻《吴历》注');
assert(titleAudit.summary.openSearchCount === 0, '仍有未完成检索');
assert(titleAudit.summary.verifiedCount + titleAudit.summary.reviewOnlyCount === 154, '发布状态数量不守恒');
assert(titleAudit.records.filter(record => record.title.endsWith('系统')).length === 6, '系统汇总标签应恰有6项');
assert(titleAudit.records.filter(record => record.title.endsWith('系统')).every(record => record.historicalDisposition === '排除'), '系统汇总标签未全部排除');

const requiredCoverageIds = ['coverage:sgz:63','coverage:jinshu:017','coverage:jinshu:018','coverage:jinshu:022','coverage:jinshu:026','coverage:jinshu:119'];
const requiredLegacyIds = ['v60:volume-review:63','v60:volume-review:17','v60:volume-review:18','v60:volume-review:22','v60:volume-review:26','v60:volume-review:119'];
assert(volumeAudit.records.length === 6, '卷次审校必须恰有六卷');
assert(JSON.stringify(volumeAudit.records.map(record => record.legacyCoverageId)) === JSON.stringify(requiredCoverageIds), '六卷旧coverage ID未按原顺序保留');
assert(JSON.stringify(volumeAudit.records.map(record => record.legacyReviewId)) === JSON.stringify(requiredLegacyIds), '六卷V60审校ID未保留');

const coverageById = new Map(sourceIndex.coverage.map(record => [record.id, record]));
const legacyById = new Map(legacyLedger.volumeClosures.map(record => [record.id, record]));
const volumeCandidateCounts = { 'coverage:sgz:63': 9, 'coverage:jinshu:017': 8, 'coverage:jinshu:018': 2, 'coverage:jinshu:022': 9, 'coverage:jinshu:026': 12, 'coverage:jinshu:119': 0 };
const volumeCandidateIds = new Set();
for (const record of volumeAudit.records) {
  const prior = coverageById.get(record.legacyCoverageId);
  const legacy = legacyById.get(record.legacyReviewId);
  assert(prior && legacy, `${record.id} 旧台账断链`);
  assert(prior.processedStatus === '待复核' && prior.candidateCount === 0, `${record.id} 旧零候选状态不符`);
  assert(record.sources.length === 1 && record.sources[0].sourceHash === prior.sourceHash && record.sources[0].sourceRevision === prior.sourceRevision, `${record.id} 源版本／哈希不一致`);
  assert(record.searchState === 'completed' && record.searchScope.length >= 3, `${record.id} 检索未闭环`);
  assert(record.candidateCount === volumeCandidateCounts[record.legacyCoverageId], `${record.id} 候选数量不符`);
  assert(record.candidateCount === record.candidates.length && record.exclusionCount === record.exclusions.length, `${record.id} 子项数量不守恒`);
  assert(record.sourceLocator && record.conclusion && Object.hasOwn(record, 'unresolvedReason'), `${record.id} 缺最终结论字段`);
  for (const candidate of record.candidates) {
    assert(/^v65:volume-candidate:[0-9a-f]{16}$/.test(candidate.id) && !volumeCandidateIds.has(candidate.id), `卷次候选ID非法或重复 ${candidate.id}`);
    volumeCandidateIds.add(candidate.id);
    assert(candidate.personName && candidate.officeName && candidate.sourceLocator && candidate.sourceExcerpt && candidate.sourceUrl, `${candidate.id} 缺来源定位`);
    assert(allowedDispositions.has(candidate.historicalDisposition), `${candidate.id} 处置非法`);
  }
}
assert(volumeAudit.summary.candidateCount === 40, `六卷候选总数应为40，实际${volumeAudit.summary.candidateCount}`);
assert(volumeAudit.summary.volumesWithCandidates === 5 && volumeAudit.summary.volumesWithoutInScopeCandidates === 1, '六卷有候选／无范围内候选数量不符');
const volumeByCoverageId = new Map(volumeAudit.records.map(record => [record.legacyCoverageId, record]));
const volume119 = volumeByCoverageId.get('coverage:jinshu:119');
assert(volume119.historicalDisposition === '排除' && volume119.conclusion === '明确无范围内候选' && volume119.candidateCount === 0, '《晋书》卷119未按416—417超期闭环');
assert(/416/.test(volume119.reason) && /316/.test(volume119.reason), '《晋书》卷119未写明时间边界');
const volume26 = volumeByCoverageId.get('coverage:jinshu:026');
assert(!volume26.candidates.some(candidate => candidate.personName === '邓攸' && candidate.officeName === '吴郡太守'), '《晋书》卷26仍把319年邓攸当作范围内候选');
assert(volume26.exclusions.some(exclusion => exclusion.subject === '邓攸' && /319/.test(exclusion.reason) && /316/.test(exclusion.reason)), '《晋书》卷26未以319年超期理由排除邓攸');

const result = {
  status: 'passed',
  generalTitles: titleAudit.summary,
  volumes: volumeAudit.summary,
  hashes: {
    generalTitleJson: sha256(read('data/v65-general-title-research.json')),
    volumeReviewJson: sha256(read('data/v65-volume-review.json'))
  }
};
console.log(JSON.stringify(result, null, 2));
