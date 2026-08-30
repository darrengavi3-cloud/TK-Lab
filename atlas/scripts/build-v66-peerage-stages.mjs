import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const sourcePath = path.join(root, 'data', 'v61-person-supplements.json');
const jsonPath = path.join(root, 'data', 'v66-peerage-stages.json');
const jsPath = path.join(root, 'data', 'v66-peerage-stages.js');

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const sourceEvents = (source.peerageEvents || []).filter(event => event.readerVisible === true);
const compact = value => String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
const unique = values => [...new Set(values.filter(Boolean))];

const RANK_NODES = Object.freeze([
  { nodeId: 'peerage:wei:rank:wang', label: '王', rankLevel: '王', order: 10, parentId: null },
  { nodeId: 'peerage:wei:rank:gong', label: '公', rankLevel: '公', order: 20, parentId: null },
  { nodeId: 'peerage:wei:rank:hou', label: '侯', rankLevel: '侯', order: 30, parentId: null },
  { nodeId: 'peerage:wei:rank:bo', label: '伯', rankLevel: '伯', order: 40, parentId: null },
  { nodeId: 'peerage:wei:rank:zi', label: '子', rankLevel: '子', order: 50, parentId: null },
  { nodeId: 'peerage:wei:rank:nan', label: '男', rankLevel: '男', order: 60, parentId: null },
]);

const MARQUIS_NODES = Object.freeze([
  { nodeId: 'peerage:wei:rank:hou:xian', label: '县侯', rankLevel: '侯', marquisType: '县侯', order: 10, parentId: 'peerage:wei:rank:hou' },
  { nodeId: 'peerage:wei:rank:hou:xiang', label: '乡侯', rankLevel: '侯', marquisType: '乡侯', order: 20, parentId: 'peerage:wei:rank:hou' },
  { nodeId: 'peerage:wei:rank:hou:ting', label: '亭侯', rankLevel: '侯', marquisType: '亭侯', order: 30, parentId: 'peerage:wei:rank:hou' },
  { nodeId: 'peerage:wei:rank:hou:guannei', label: '关内侯', rankLevel: '侯', marquisType: '关内侯', order: 40, parentId: 'peerage:wei:rank:hou' },
  { nodeId: 'peerage:wei:rank:hou:guanzhong', label: '关中侯', rankLevel: '侯', marquisType: '关中侯', order: 50, parentId: 'peerage:wei:rank:hou' },
  { nodeId: 'peerage:wei:rank:hou:minghao', label: '名号侯', rankLevel: '侯', marquisType: '名号侯', order: 60, parentId: 'peerage:wei:rank:hou' },
  { nodeId: 'peerage:wei:rank:hou:unspecified', label: '列侯未详', rankLevel: '侯', marquisType: '列侯未详', order: 70, parentId: 'peerage:wei:rank:hou' },
]);

const rankNodeByLevel = new Map(RANK_NODES.map(node => [node.rankLevel, node.nodeId]));
const marquisNodeByType = new Map(MARQUIS_NODES.map(node => [node.marquisType, node.nodeId]));

function stagePhase(year, rawRank = '', category = '') {
  if (year == null) return 'missing-year-review';
  if (year < 220) return 'han-predecessor';
  if (year >= 265) return 'post-wei-review';
  if (year === 264 && (/咸熙五等爵/.test(category) || /五等[公侯伯子男]/.test(rawRank) || /县公/.test(rawRank))) {
    return 'wei-xianxi-five-rank';
  }
  return 'wei-inherited-han';
}

function explicitMarquisTypeFromTitle(rawTitle) {
  const title = compact(rawTitle).replace(/[（(][^）)]*[）)]/g, '').trim();
  if (!title) return '';
  if (/关内侯$/.test(title)) return '关内侯';
  if (/关中侯$/.test(title)) return '关中侯';
  if (/县侯$/.test(title)) return '县侯';
  if (/乡侯$/.test(title)) return '乡侯';
  if (/亭侯$/.test(title)) return '亭侯';
  if (/名号侯$/.test(title)) return '名号侯';
  return '';
}

function mapRank(rawRank) {
  const raw = compact(rawRank);
  if (!raw) return { rawRank: raw, mappingStatus: 'review-only', mappingReason: '爵级为空' };
  if (/[／/]/.test(raw)) return { rawRank: raw, mappingStatus: 'review-only', mappingReason: '爵级使用斜线并列，不能判断唯一阶段' };

  const normalized = raw
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/^五等/, '')
    .replace(/^晋/, '')
    .trim();

  let rankLevel = '';
  let marquisType = '';
  if (normalized === '王') rankLevel = '王';
  else if (normalized === '公' || normalized === '县公') rankLevel = '公';
  else if (normalized === '伯') rankLevel = '伯';
  else if (normalized === '子') rankLevel = '子';
  else if (normalized === '男') rankLevel = '男';
  else if (/县侯$/.test(normalized)) { rankLevel = '侯'; marquisType = '县侯'; }
  else if (/乡侯$/.test(normalized)) { rankLevel = '侯'; marquisType = '乡侯'; }
  else if (/亭侯$/.test(normalized)) { rankLevel = '侯'; marquisType = '亭侯'; }
  else if (/关内侯$/.test(normalized)) { rankLevel = '侯'; marquisType = '关内侯'; }
  else if (/关中侯$/.test(normalized)) { rankLevel = '侯'; marquisType = '关中侯'; }
  else if (/名号侯$/.test(normalized)) { rankLevel = '侯'; marquisType = '名号侯'; }
  else if (normalized === '侯' || normalized === '列侯') { rankLevel = '侯'; marquisType = '列侯未详'; }
  else return { rawRank: raw, normalizedRank: normalized, mappingStatus: 'review-only', mappingReason: '爵级不能映射到王、公、侯、伯、子、男的唯一节点' };

  const rankLevelNodeId = rankNodeByLevel.get(rankLevel) || null;
  const candidatePeerageNodeId = rankLevel === '侯'
    ? marquisNodeByType.get(marquisType) || marquisNodeByType.get('列侯未详')
    : rankLevelNodeId;
  return {
    rawRank: raw,
    normalizedRank: normalized,
    rankLevel,
    marquisType: marquisType || null,
    rankLevelNodeId,
    candidatePeerageNodeId,
    mappingStatus: 'mapped',
    mappingReason: '',
  };
}

function refineRankMappingWithTitle(part, rawTitle, phase) {
  if (part.mappingStatus !== 'mapped' || part.rankLevel !== '侯') return part;
  if (phase === 'wei-xianxi-five-rank') {
    return {
      ...part,
      marquisType: null,
      candidatePeerageNodeId: part.rankLevelNodeId,
      classificationBasis: 'xianxi-five-rank',
    };
  }
  const explicitType = explicitMarquisTypeFromTitle(rawTitle);
  if (!explicitType) return { ...part, classificationBasis: 'rank' };
  return {
    ...part,
    marquisType: explicitType,
    candidatePeerageNodeId: marquisNodeByType.get(explicitType),
    classificationBasis: 'title-explicit',
  };
}

function dispositionForStage({ phase, rankPart, titleAlignmentStatus }) {
  if (phase === 'han-predecessor') return {
    disposition: 'han-predecessor',
    linkDisposition: '已关联',
    historicalDisposition: '确定',
    scopeDisposition: '后汉沿革',
    publicationStatus: 'review-only',
    reason: '220 年前授爵仅作为后汉沿革保留，不计入曹魏本朝爵制统计',
  };
  if (phase === 'missing-year-review') return {
    disposition: 'missing-year',
    linkDisposition: '审校待定',
    historicalDisposition: '存疑',
    scopeDisposition: '年代待定',
    publicationStatus: 'review-only',
    reason: '受封年份未明确，不能判断曹魏本朝阶段',
  };
  if (phase === 'post-wei-review') return {
    disposition: 'post-wei-review',
    linkDisposition: '审校待定',
    historicalDisposition: '存疑',
    scopeDisposition: '朝代待定',
    publicationStatus: 'review-only',
    reason: '265 年及以后记录不属于可直接计入曹魏本朝爵制的时间范围',
  };
  if (rankPart.mappingStatus !== 'mapped') return {
    disposition: 'rank-ambiguous',
    linkDisposition: '审校待定',
    historicalDisposition: '存疑',
    scopeDisposition: '爵级待定',
    publicationStatus: 'review-only',
    reason: '爵级阶段含斜线或不能唯一映射，不强行关联爵制节点',
  };
  if (titleAlignmentStatus !== 'aligned') return {
    disposition: 'stage-misaligned',
    linkDisposition: '审校待定',
    historicalDisposition: '存疑',
    scopeDisposition: '阶段待定',
    publicationStatus: 'review-only',
    reason: '爵级与爵号阶段数量不一致，不能建立唯一的逐段关联',
  };
  return {
    disposition: 'linked',
    linkDisposition: '已关联',
    historicalDisposition: '确定',
    scopeDisposition: '曹魏本朝',
    publicationStatus: 'verified',
    reason: '',
  };
}

const EXPLICIT_STAGE_OVERRIDES = Object.freeze({
  'peerage:239': Object.freeze([
    {
      year: null,
      rawRank: '列侯',
      title: '武德侯',
      forceReviewReason: '《三国志·明帝纪》仅记年十五封武德侯，本记录不据生年反推公历受封年',
    },
    {
      year: 221,
      rawRank: '公',
      title: '齐公',
      stageSourceCitation: '《三国志·魏书·明帝纪》',
      stageSourceLocator: '卷三·明帝纪开篇',
      stageSourceExcerpt: '黄初二年为齐公',
    },
    {
      year: 222,
      rawRank: '王',
      title: '平原王',
      stageSourceCitation: '《三国志·魏书·明帝纪》',
      stageSourceLocator: '卷三·明帝纪开篇',
      stageSourceExcerpt: '三年为平原王',
    },
  ]),
});

function buildRankStages(event, rawRankStages, rawTitleStages) {
  const explicitStages = EXPLICIT_STAGE_OVERRIDES[event.eventId];
  const stagesAligned = explicitStages ? true : rawRankStages.length === rawTitleStages.length;
  const stageInputs = explicitStages || rawRankStages.map((rawRank, index) => ({
    year: rawRankStages.length === 1 ? event.year : null,
    rawRank,
    title: stagesAligned ? rawTitleStages[index] || '' : '',
  }));

  return stageInputs.map((input, index) => {
    const phase = stagePhase(input.year, input.rawRank, event.category || '');
    const titleAlignmentStatus = stagesAligned ? 'aligned' : 'review-only';
    const mappedRank = refineRankMappingWithTitle(mapRank(input.rawRank), input.title, phase);
    const disposition = input.forceReviewReason
      ? {
          disposition: 'missing-year',
          linkDisposition: '审校待定',
          historicalDisposition: '存疑',
          scopeDisposition: '年代待定',
          publicationStatus: 'review-only',
          reason: input.forceReviewReason,
        }
      : dispositionForStage({ phase, rankPart: mappedRank, titleAlignmentStatus });
    const linked = disposition.disposition === 'linked' && mappedRank.mappingStatus === 'mapped';
    return {
      stageIndex: index + 1,
      year: input.year,
      ...mappedRank,
      title: input.title,
      titleAlignmentStatus,
      peeragePhase: phase,
      ...disposition,
      peerageNodeId: linked ? mappedRank.candidatePeerageNodeId : null,
      stageSourceCitation: input.stageSourceCitation || '',
      stageSourceLocator: input.stageSourceLocator || '',
      stageSourceExcerpt: input.stageSourceExcerpt || '',
    };
  });
}

function rollupDisposition(rankStages) {
  const linked = rankStages.filter(stage => stage.disposition === 'linked');
  if (linked.length) {
    const partial = linked.length !== rankStages.length;
    return {
      disposition: 'linked',
      linkDisposition: partial ? '部分已关联' : '已关联',
      historicalDisposition: '确定',
      scopeDisposition: '曹魏本朝',
      publicationStatus: 'verified',
      reason: partial ? '仅公开具有明确年代、爵级和爵号对应关系的阶段；其余阶段保留审校' : '',
    };
  }
  const preferred = ['stage-misaligned', 'rank-ambiguous', 'post-wei-review', 'missing-year', 'han-predecessor']
    .map(key => rankStages.find(stage => stage.disposition === key))
    .find(Boolean) || rankStages[0];
  return {
    disposition: preferred?.disposition || 'rank-ambiguous',
    linkDisposition: preferred?.linkDisposition || '审校待定',
    historicalDisposition: preferred?.historicalDisposition || '存疑',
    scopeDisposition: preferred?.scopeDisposition || '阶段待定',
    publicationStatus: 'review-only',
    reason: preferred?.reason || '未形成可公开的爵制阶段',
  };
}

const events = sourceEvents.map(event => {
  const rawRankStages = compact(event.rank).split('→').map(compact).filter(Boolean);
  const rawTitleStages = compact(event.title).split('→').map(compact).filter(Boolean);
  const explicitStages = EXPLICIT_STAGE_OVERRIDES[event.eventId];
  const rankStages = buildRankStages(event, rawRankStages, rawTitleStages);
  const disposition = rollupDisposition(rankStages);
  const stagesAligned = explicitStages ? true : rawRankStages.length === rawTitleStages.length;
  const titleStages = explicitStages
    ? explicitStages.map((stage, index) => ({ stageIndex: index + 1, year: stage.year, title: stage.title }))
    : rawTitleStages.map((title, index) => ({ stageIndex: index + 1, title }));
  const peerageNodeIds = unique(rankStages.map(stage => stage.peerageNodeId));
  const rankLevelNodeIds = unique(rankStages.filter(stage => stage.peerageNodeId).map(stage => stage.rankLevelNodeId));
  return {
    eventId: event.eventId,
    sourceRecordId: event.sourceRecordId,
    recipientPersonIds: [...(event.recipientPersonIds || [])],
    rawRecipient: event.rawRecipient,
    year: event.year,
    grantDate: event.grantDate,
    rank: event.rank,
    title: event.title,
    category: event.category,
    sourceCitation: event.sourceCitation,
    searchState: 'complete',
    peeragePhase: unique(rankStages.map(stage => stage.peeragePhase)).length === 1 ? rankStages[0]?.peeragePhase : 'mixed-stages',
    ...disposition,
    stageAlignment: stagesAligned ? 'aligned' : 'review-only',
    stageAlignmentReason: stagesAligned ? '' : `爵级 ${rawRankStages.length} 段与爵号 ${rawTitleStages.length} 段数量不一致，不推定逐段对应`,
    rankStages,
    titleStages,
    rankLevelNodeIds,
    peerageNodeIds,
    peerageNodeId: peerageNodeIds.length === 1 ? peerageNodeIds[0] : null,
  };
});

function nodeStats(node) {
  const linkedEvents = events.filter(event => event.disposition === 'linked');
  const direct = linkedEvents.filter(event => event.peerageNodeIds.includes(node.nodeId));
  const aggregate = node.parentId
    ? direct
    : linkedEvents.filter(event => event.rankLevelNodeIds.includes(node.nodeId));
  const directEventIds = direct.map(event => event.eventId);
  const directRecipientPersonIds = unique(direct.flatMap(event => event.recipientPersonIds)).sort();
  const aggregateEventIds = aggregate.map(event => event.eventId);
  const aggregateRecipientPersonIds = unique(aggregate.flatMap(event => event.recipientPersonIds)).sort();
  return {
    ...node,
    directEventIds,
    directRecipientPersonIds,
    directEventCount: directEventIds.length,
    directRecipientCount: directRecipientPersonIds.length,
    aggregateEventIds,
    aggregateRecipientPersonIds,
    eventCount: aggregateEventIds.length,
    recipientCount: aggregateRecipientPersonIds.length,
  };
}

const nodes = [...RANK_NODES, ...MARQUIS_NODES].map(nodeStats);
const countBy = (items, field) => Object.fromEntries([...items.reduce((map, item) => map.set(item[field], (map.get(item[field]) || 0) + 1), new Map())].sort(([a], [b]) => String(a).localeCompare(String(b))));
const summary = {
  sourceReaderVisibleEvents: sourceEvents.length,
  sourceReaderVisibleRelations: sourceEvents.reduce((total, event) => total + (event.recipientPersonIds || []).length, 0),
  sourceReaderVisiblePeople: unique(sourceEvents.flatMap(event => event.recipientPersonIds || [])).length,
  closedEvents: events.length,
  linkedEvents: events.filter(event => event.disposition === 'linked').length,
  hanPredecessorEvents: events.filter(event => event.disposition === 'han-predecessor').length,
  rankAmbiguousEvents: events.filter(event => event.disposition === 'rank-ambiguous').length,
  dynastyReviewEvents: events.filter(event => event.disposition === 'post-wei-review').length,
  postWeiReviewEvents: events.filter(event => event.disposition === 'post-wei-review').length,
  missingYearEvents: events.filter(event => event.disposition === 'missing-year').length,
  stageMisalignedEvents: events.filter(event => event.disposition === 'stage-misaligned').length,
  partiallyLinkedEvents: events.filter(event => event.linkDisposition === '部分已关联').length,
  rankStages: events.reduce((total, event) => total + event.rankStages.length, 0),
  titleStages: events.reduce((total, event) => total + event.titleStages.length, 0),
  multiRankEvents: events.filter(event => event.rankStages.length > 1).length,
  stageAlignmentReviewEvents: events.filter(event => event.stageAlignment === 'review-only').length,
  linkedRelations: events.filter(event => event.disposition === 'linked').reduce((total, event) => total + event.recipientPersonIds.length, 0),
  linkedPeople: unique(events.filter(event => event.disposition === 'linked').flatMap(event => event.recipientPersonIds)).length,
  dispositionCounts: countBy(events, 'disposition'),
  phaseCounts: countBy(events, 'peeragePhase'),
  stageDispositionCounts: countBy(events.flatMap(event => event.rankStages), 'disposition'),
  titleClassifiedMarquisStages: events.flatMap(event => event.rankStages).filter(stage => stage.classificationBasis === 'title-explicit').length,
  xianxiFiveRankMarquisStages: events.flatMap(event => event.rankStages).filter(stage => stage.peeragePhase === 'wei-xianxi-five-rank' && stage.rankLevel === '侯').length,
};

if (sourceEvents.length !== 525 || events.length !== sourceEvents.length) throw new Error('V66 曹魏爵制事件闭环数量不为 525');
if (summary.sourceReaderVisibleRelations !== 542 || summary.sourceReaderVisiblePeople !== 374) throw new Error('V66 原读者封爵关系或人物数量不守恒');
if (summary.linkedEvents !== 194) throw new Error(`V66 已关联事件应为 194，当前为 ${summary.linkedEvents}`);
if (summary.hanPredecessorEvents !== 79) throw new Error(`V66 后汉沿革事件应为 79，当前为 ${summary.hanPredecessorEvents}`);
if (summary.rankAmbiguousEvents !== 22) throw new Error(`V66 爵级歧义事件应为 22，当前为 ${summary.rankAmbiguousEvents}`);
if (summary.dynastyReviewEvents !== 2) throw new Error(`V66 265 年审校事件应为 2，当前为 ${summary.dynastyReviewEvents}`);
if (summary.missingYearEvents !== 227) throw new Error(`V66 无年审校事件应为 227，当前为 ${summary.missingYearEvents}`);
if (summary.stageMisalignedEvents !== 1) throw new Error(`V66 因阶段错位整条待审事件应为 1，当前为 ${summary.stageMisalignedEvents}`);
if (summary.partiallyLinkedEvents !== 1) throw new Error(`V66 部分阶段已关联事件应为 1，当前为 ${summary.partiallyLinkedEvents}`);
if (summary.rankStages !== 603 || summary.titleStages !== 641) throw new Error('V66 爵级或爵号阶段数量不守恒');
if (summary.stageAlignmentReviewEvents !== 29) throw new Error(`V66 阶段错位事件应为 29，当前为 ${summary.stageAlignmentReviewEvents}`);
if (nodes.length !== 13 || new Set(nodes.map(node => node.nodeId)).size !== 13) throw new Error('V66 稳定爵制节点不完整或重复');
if (events.some(event => event.disposition !== 'linked' && event.peerageNodeIds.length)) throw new Error('审校事件不得带入读者爵制节点');
if (events.some(event => event.rankStages.some(stage => (stage.publicationStatus === 'verified') !== Boolean(stage.peerageNodeId)))) throw new Error('爵级阶段发布状态与语义节点关联不一致');
const peerage431 = events.find(event => event.eventId === 'peerage:431');
if (peerage431?.stageAlignment !== 'review-only' || peerage431?.disposition === 'linked' || peerage431?.peerageNodeIds.length) throw new Error('peerage:431 阶段错位仍被错误关联');
const peerage239 = events.find(event => event.eventId === 'peerage:239');
if (peerage239?.rankStages.filter(stage => stage.publicationStatus === 'verified').map(stage => `${stage.year}:${stage.title}:${stage.rankLevel}`).join('|') !== '221:齐公:公|222:平原王:王') throw new Error('peerage:239 曹叡齐公、平原王分年阶段未正确建立');
if (events.some(event => event.rankStages.some(stage => stage.peeragePhase === 'wei-xianxi-five-rank' && stage.rankLevel === '侯' && stage.peerageNodeId && stage.peerageNodeId !== 'peerage:wei:rank:hou'))) throw new Error('咸熙五等侯不得挂入列侯未详或其他侯爵子类型');

const payload = {
  schemaVersion: 'V66',
  modelId: 'sgz-v66-wei-peerage-stages',
  source: {
    modelId: source.modelId,
    file: 'data/v61-person-supplements.json',
    readerVisibleEvents: sourceEvents.length,
  },
  policy: {
    beforeWei: '220 年前授爵仅作为后汉沿革保留，不计入曹魏本朝统计',
    inheritedPhase: '220—263 年明确爵级按曹魏承汉阶段关联',
    xianxiPhase: '264 年只有原记录明确标示咸熙五等或五等爵级时才归入五等阶段，其余明确旧爵级仍归承汉阶段',
    afterWei: '265 年及以后记录不计入曹魏本朝爵制，留审校待定',
    missingYear: '无明确年份的事件不得进入曹魏本朝节点统计',
    stagePolicy: '发布与节点关联逐爵级阶段判定；事件年份只用于唯一原始爵级阶段，不外推到未定年沿革',
    titleClassification: '爵号明确写出县侯、乡侯、亭侯、关内侯、关中侯或名号侯时用于类型分类；咸熙五等侯只关联侯主节点',
    ambiguity: '斜线并列、无法映射和爵级／爵号阶段错位均不推定；错位事件仅保存两组独立阶段',
  },
  summary,
  nodes,
  events,
};

fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(jsPath, `(function(global){\n  'use strict';\n  global.SGZ_V66_PEERAGE_STAGES=Object.freeze(${JSON.stringify(payload)});\n})(window);\n`);
console.log(JSON.stringify(summary, null, 2));
