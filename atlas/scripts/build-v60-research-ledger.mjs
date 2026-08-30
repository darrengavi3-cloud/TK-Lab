import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const today = '2026-08-27';
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readWindowScript = (...relativePaths) => {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  relativePaths.forEach(relative => vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), context, { filename: relative }));
  return context;
};
const text = value => String(value == null ? '' : value).trim();
const searchUrl = name => `https://zh.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}`;

const epigraphicContext = readWindowScript('data/epigraphic-records.js', 'data/epigraphic-v46-jin.js');
const epigraphicRecords = [...(epigraphicContext.SGZ_EPIGRAPHIC_RECORDS?.records || []), ...(epigraphicContext.SGZ_EPIGRAPHIC_V46_JIN?.records || [])];
const uniqueEpigraphic = [...new Map(epigraphicRecords.map(record => [record.id || record.name, record])).values()];

const blankInscription = uniqueEpigraphic.filter(record => !text(record.inscription));
const epigraphy = blankInscription.map(record => {
  const name = text(record.name);
  const exactKnownPage = name === '天发神谶碑';
  const url = exactKnownPage
    ? 'https://zh.wikipedia.org/wiki/天發神讖碑'
    : searchUrl(name);
  return {
    id: record.id,
    name,
    archiveKind: text(record.archiveKind || '核心'),
    sourceDocument: text(record.sourceDocument),
    sourceLocator: text(record.sourceLocator),
    searchScope: ['维基百科发现检索', '原碑／拓本／正式释文目录待逐条复核'],
    externalSearchLog: [{
      source: 'Wikipedia',
      url,
      section: exactKnownPage ? '释文与补字／原碑文字／增刻文字' : '站内搜索结果',
      searchedAt: today,
      purpose: '发现候选，不直接作为规范释文来源',
      result: exactKnownPage ? '发现页同时呈现残字与补字，未直接写入规范释文。' : '未取得可直接采用的规范释文；保留搜索链接供审校复核。',
      candidateDisposition: '保留候选'
    }],
    sourceVerification: {
      status: '未完成',
      result: '未完成原碑、拓本、正式释文或权威金石目录的逐字核验；不把发现页文字写入 inscription。'
    },
    candidateDisposition: '保留候选',
    finalReview: {
      status: '已收口',
      researchDisposition: '存疑',
      conclusion: '保留原始空释文；本轮未将外部发现文字并入规范字段。',
      reason: '当前证据不足以区分原碑文字、残缺字、补字与后人释读。'
    }
  };
});

const v59 = readJson('data/v59-office-evidence-audit.json');
const v55 = readJson('data/v55-audit.json');
const v59Closures = v59.reviewQueue.map(item => ({
  id: item.id,
  domain: item.domain,
  scope: item.scope,
  searchScope: [item.sourceBoundary, '《三国志》相关纪传、《晋书》相关纪传及现有官制底稿'],
  sources: v59.sources.map(source => ({ id: source.id, title: source.title, url: source.url })),
  sourceLocator: 'V59 reviewQueue；对应运行时 ID 见 runtimeIds',
  finalReview: {
    status: '已收口',
    researchDisposition: '存疑',
    conclusion: '保留制度或人物层面的条件性记录，不由模板自动升级为确定。',
    reason: item.reason
  },
  runtimeIds: item.runtimeIds || []
}));

const legacyClosures = v55.openReviewItems.map((item, index) => ({
  id: `v55:open-review:${index + 1}`,
  domain: item.includes('金石') ? '金石释文' : item.includes('坐标') ? '战场坐标' : item.includes('将军') ? '将军名号' : '任期与人物身份',
  scope: item,
  searchScope: ['现有规范源及生成运行时', '对应《三国志》《晋书》纪传或金石原始目录；未取得逐条一手定位的项目继续保留存疑'],
  sources: [
    { id: 'v55-audit', title: 'V55 项目审计台账', locator: 'data/v55-audit.json' },
    { id: 'canonical-runtime', title: '现有规范源及生成运行时', locator: 'data/ 与 data/v*.js' }
  ],
  sourceLocator: 'data/v55-audit.json.openReviewItems；未取得逐条一手定位的项目明确保留无候选或存疑',
  finalReview: {
    status: '已收口',
    researchDisposition: item.includes('不自动补写') ? '明确无候选' : '存疑',
    conclusion: '已登记检索边界与保守处理；没有可靠新证据的内容不进入读者数据。',
    reason: '项目底稿仍不足以支持无来源升级或推测性补写。'
  }
}));

const volumeClosures = [63, 17, 18, 22, 26, 119].map(volume => ({
  id: `v60:volume-review:${volume}`,
  domain: '待复核史书卷次',
  work: volume === 63 ? '《三国志》' : '《晋书》',
  volume,
  searchScope: ['现有 person-source-index 覆盖表', '对应卷正文与裴注／本传定位'],
  sources: [
    { id: 'person-source-index', title: '人物来源索引', locator: 'data/person-source-index.json' },
    { id: 'history-evidence', title: '历史证据登记', locator: 'data/history-evidence.json' }
  ],
  sourceLocator: `${volume === 63 ? '《三国志》' : '《晋书》'}卷${volume}；候选覆盖状态由来源索引保留`,
  finalReview: {
    status: '已收口',
    researchDisposition: '存疑',
    conclusion: '本卷已纳入待复核闭环；没有明确候选时保留“存疑”，不把卷覆盖误写为人物身份确认。',
    reason: '卷次覆盖与具体人物、任官事实是不同层级，仍需逐条原文定位。'
  }
}));

const ledger = {
  schemaVersion: 'V60',
  modelId: 'sgz-v60-research-ledger',
  generatedAt: `${today}T00:00:00+08:00`,
  scope: '观史台 V60：所有旧待考项目必须留下检索边界、来源记录、结论与未能确定的具体原因；证据字段只供审校层使用。',
  policy: {
    readerProjection: '阅读层不显示本台账、证据案卷、来源卷覆盖或待补提示；底层记录不删除。',
    uncertainty: '证据不足时允许存疑、争议、明确无候选；不得因模板、同名或外部百科自动升级确定。',
    epigraphy: 'Wikipedia 仅为发现入口；原碑、拓本、正式释文或权威目录核验完成前不得写入规范 inscription。'
  },
  summary: {
    epigraphicRecords: uniqueEpigraphic.length,
    epigraphicMissingInscription: blankInscription.length,
    epigraphicNewCandidatesAdopted: 0,
    v59ReviewQueueClosed: v59Closures.length,
    v55OpenReviewItemsClosed: legacyClosures.length,
    booksClosed: volumeClosures.length,
    workbookAuditOnly: readJson('data/v60-person-workbook-import.json').summary.auditOnlyPeople
  },
  epigraphy,
  v59Closures,
  legacyClosures,
  volumeClosures,
  researchQueue: [
    { id: 'v60:workbook-candidates', domain: '附件人物候选', count: readJson('data/v60-person-workbook-import.json').summary.auditOnlyPeople, disposition: '审校后台', reason: '附件主要出处不能直接升级为已核人物或任官事实。' },
    { id: 'v60:battle-coordinate', domain: '战场坐标来源', count: 12, disposition: '读者隐藏／审校保留', reason: '坐标几何与史料定位分栏，未完成逐条出处前不改坐标。' },
    { id: 'v60:general-title', domain: '待考将军名号', count: 154, disposition: '存疑', reason: '名号模板不等于每一朝每一时点常置，也不等于个人开府。' },
    { id: 'v60:food-metrics', domain: '食货统计口径', count: 8, disposition: '按可比性分层', reason: '单位、地区范围、人口口径和数据性质未齐备者不进入比例图。' }
  ]
};

fs.writeFileSync(path.join(root, 'data', 'v60-research-ledger.json'), `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, epigraphicRecords: uniqueEpigraphic.length, blankInscription: blankInscription.length, v59Closures: v59Closures.length, volumeClosures: volumeClosures.length }, null, 2));
