import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const text = value => String(value == null ? '' : value).trim();
const joinParagraphs = value => Array.isArray(value) ? value.map(text).filter(Boolean).join('\n\n') : text(value);

const context = { console };
context.window = context;
vm.createContext(context);
for (const relative of ['data/epigraphic-records.js', 'data/epigraphic-v46-jin.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), context, { filename: relative });
}

const allRecords = [...new Map([
  ...(context.SGZ_EPIGRAPHIC_RECORDS?.records || []),
  ...(context.SGZ_EPIGRAPHIC_V46_JIN?.records || []),
].map(record => [record.id, record])).values()];
const blankRecords = allRecords.filter(record => !text(record.inscription));
const blankIds = new Set(blankRecords.map(record => record.id));
const cache = readJson('data/v61-epigraphy-search-cache.json');
const v60 = readJson('data/v60-research-ledger.json');
const curatedSource = readJson('data/v61-epigraphy-transcriptions.json');
const cacheById = new Map((cache.records || []).map(record => [record.id, record]));
const v60ById = new Map((v60.epigraphy || []).map(record => [record.id, record]));
const curatedById = new Map((curatedSource.records || []).map(record => [record.id, record]));

const normalizeVariant = (variant, canonical) => {
  const row = { ...variant };
  row.text = row.textRef === 'canonical' ? canonical : joinParagraphs(row.textParagraphs || row.text);
  delete row.textRef;
  delete row.textParagraphs;
  return row;
};

const searchLogFor = search => ({
  source: search.source,
  url: search.url,
  section: 'MediaWiki 标题与全文检索结果',
  searchedAt: cache.searchedAt || '2026-08-28',
  purpose: '逐条发现候选页面；结果必须另经碑刻身份和释文来源复核',
  status: search.status,
  result: search.status === 'completed'
    ? `检索完成，共 ${Number(search.totalHits || 0)} 个结果${search.results?.length ? `；前列：${search.results.map(item => item.title).join('、')}` : ''}。`
    : `请求失败：${text(search.error) || '未知网络错误'}。`,
  totalHits: Number(search.totalHits || 0),
  resultTitles: (search.results || []).map(item => text(item.title)).filter(Boolean),
});

const epigraphy = blankRecords.map(record => {
  const previous = v60ById.get(record.id) || {};
  const searched = cacheById.get(record.id) || { searches: [] };
  const searchLogs = (searched.searches || []).map(searchLogFor);
  const curated = curatedById.get(record.id);
  const completedSearches = searchLogs.filter(item => item.status === 'completed').length;
  const totalHits = searchLogs.reduce((sum, item) => sum + item.totalHits, 0);
  const common = {
    ...previous,
    id: record.id,
    name: record.name,
    searchScope: ['中文 Wikipedia 名称异体与发现检索', '维基文库原典与金石目录全文检索', '可定位碑本、拓本、馆藏目录或正式释文时再写入规范字段'],
    externalSearchLog: [...(previous.externalSearchLog || []), ...searchLogs],
  };
  if (curated) {
    const inscription = joinParagraphs(curated.inscriptionParagraphs);
    return {
      ...common,
      inscription,
      inscriptionStatus: curated.inscriptionStatus,
      sourceLocator: curated.sourceLocator,
      inscriptionVariants: (curated.inscriptionVariants || []).map(variant => normalizeVariant(variant, inscription)),
      sourceVerification: curated.sourceVerification,
      candidateDisposition: '采用',
      finalReview: {
        status: '已收口',
        researchDisposition: '确定',
        conclusion: `已接入可追溯释文；${curated.inscriptionStatus === '残缺' ? '阙字继续以方框保留。' : '未混入无出处补写。'}`,
        reason: curated.sourceVerification?.result || '已由碑本或权威馆藏目录完成复核。',
      },
    };
  }
  const fullySearched = completedSearches === 2;
  return {
    ...common,
    inscription: '',
    inscriptionStatus: '源文未见',
    inscriptionVariants: [],
    sourceVerification: {
      status: fullySearched ? '检索完成' : '检索受限',
      result: fullySearched
        ? `Wikipedia 与维基文库已逐名检索${totalHits ? `，发现 ${totalHits} 个候选结果` : '，未发现同名候选'}；未取得能与具体碑刻身份相符且可核验的正式释文，规范字段继续留空。`
        : '发现检索已登记，但仍有网络请求失败；未取得可采用释文，规范字段继续留空。',
      sources: searchLogs.map(item => ({ title: item.source, url: item.url, locator: item.section, role: '发现检索' })),
    },
    candidateDisposition: totalHits ? '保留候选' : '待复核',
    finalReview: {
      status: '已收口',
      researchDisposition: '存疑',
      conclusion: '本轮未取得可与该条记录身份相符的可靠释文，继续保留空值；阅读态不显示待补占位。',
      reason: totalHits
        ? '发现检索存在同名或相关候选，但尚不能区分原碑、后出摹本、补字和现代释读。'
        : '两类公开入口未返回可核验释文；不根据题名或目录摘要反推正文。',
    },
  };
});

const adopted = epigraphy.filter(record => text(record.inscription));
const allSearches = (cache.records || []).flatMap(record => record.searches || []);
const payload = {
  schemaVersion: 'V61',
  modelId: 'sgz-v61-epigraphy-research',
  generatedAt: '2026-08-28T00:00:00+08:00',
  scope: '现有 188 条金石 ID 与目录不变；对 V60 的 142 条空释文逐条形成网络检索结论，仅将可追溯碑本释文接入规范字段。',
  policy: curatedSource.policy,
  summary: {
    totalRecords: allRecords.length,
    missingBeforeResearch: blankRecords.length,
    searchedRecords: epigraphy.length,
    searchRequests: allSearches.length,
    completedSearches: allSearches.filter(item => item.status === 'completed').length,
    failedSearches: allSearches.filter(item => item.status === 'failed').length,
    adoptedTranscriptions: adopted.length,
    missingAfterResearch: blankRecords.length - adopted.length,
  },
  adoptedIds: adopted.map(record => record.id),
  epigraphy,
};

if (allRecords.length !== 188) throw new Error(`金石总数异常：${allRecords.length}`);
if (blankRecords.length !== 142 || epigraphy.length !== 142) throw new Error(`空释文闭环异常：${blankRecords.length}/${epigraphy.length}`);
if (curatedSource.records.some(record => !blankIds.has(record.id))) throw new Error('存在不属于 V60 空释文范围的 V61 释文记录');
if (!adopted.length) throw new Error('V61 未采用任何可追溯释文');

fs.writeFileSync(path.join(root, 'data', 'v61-epigraphy-research.json'), `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'data', 'v61-epigraphy-research.js'), `(function(global){\n  'use strict';\n  global.SGZ_V61_EPIGRAPHY_RESEARCH=Object.freeze(${JSON.stringify(payload)});\n})(window);\n`);
console.log(JSON.stringify(payload.summary, null, 2));
