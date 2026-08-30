import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { V65_GENERAL_TITLE_EVIDENCE } from './lib/v65-general-title-evidence.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(`V65 将军名号构建失败：${message}`); };
const generatedAt = '2026-08-30T00:00:00+08:00';
const accessedAt = V65_GENERAL_TITLE_EVIDENCE.accessedAt;
const stableId = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
const polityLabels = Object.freeze({ wei: '魏', shu: '季汉', wu: '吴', jin: '西晋' });
const periods = Object.freeze({ wei: '220—265', shu: '221—263', wu: '222—280', jin: '266—316' });

function loadGeneralTitles(){
  const context = { window: {} };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(read('data/general-titles.js'), context, { filename: 'data/general-titles.js' });
  return JSON.parse(JSON.stringify(context.window.SGZ_GENERAL_TITLES));
}

const model = loadGeneralTitles();
const pending = model.groups.flatMap(group => group.titles
  .filter(record => record.evidence === '待考')
  .map(record => ({ ...record, polity: group.polity, polityLabel: polityLabels[group.polity] })));
const evidenceByKey = new Map(V65_GENERAL_TITLE_EVIDENCE.records.map(record => [`${record.polity}|${record.title}`, record]));

const CLASSIFICATION = Object.freeze({
  wei: Object.freeze({
    确定: ['辅国将军','龙骧将军','轻车将军','安远将军','建武将军','振威将军','振武将军','奋威将军','奋武将军','扬武将军','广威将军','广武将军','宁朔将军','积弩将军','积射将军','强弩将军','讨寇将军','复土将军','偏将军','虎牙将军','度辽将军','裨将军'],
    推定: ['都护将军','平狄将军','平难将军','扬威将军','讨逆将军','破虏将军','建忠将军','立义将军','横野将军'],
    存疑: ['牙门将军'],
    明确无候选: ['安众将军','安夷将军','殄吴将军','怀集将军','楼船将军','翼卫将军','讨夷将军','怀远将军','横海将军','忠义将军','建节将军','绥边将军','威寇将军','明威将军']
  }),
  shu: Object.freeze({
    确定: ['右骠骑将军','右车骑将军','征南将军','镇东将军','镇西将军','镇北将军','安南将军','平北将军','执慎将军','抚戎将军','绥武将军','翊武将军','辅军将军','绥军将军','征西将军','前将军','后将军','左将军','右将军','军师将军','翊军将军'],
    推定: ['征北将军','平西将军','镇远将军','兴业将军','副军将军','牙门将军'],
    存疑: [],
    明确无候选: ['征东将军','镇南将军','安东将军','安西将军','安北将军','平东将军','平南将军'],
    排除: ['中郎将系统']
  }),
  wu: Object.freeze({
    确定: ['征西将军','征北将军','镇南将军','镇西将军','镇北将军','镇东将军','安东将军','平北将军','威南将军','威北将军','前将军','后将军','左将军','右将军','奋武将军','威远将军','虎牙将军','绥远将军','昭武将军','荡魏将军','平魏将军','辅吴将军','辅义将军','绥南将军','安国将军','抚夷将军','抚越将军','威烈将军','灭寇将军'],
    推定: ['讨逆将军','折冲将军','扶义将军','横江将军','抚边将军'],
    存疑: [],
    争议: ['安南将军','平南将军','辅国将军'],
    明确无候选: ['征东将军','征南将军','安西将军','安北将军','平东将军','平西将军','威东将军','威西将军','威武将军','厉武将军','牙门将军'],
    排除: ['中郎将系统','校尉系统','都尉系统']
  }),
  jin: Object.freeze({
    确定: ['安东将军','安西将军','安南将军','安北将军','平东将军','平西将军','平南将军','平北将军','积弩将军','积射将军','强弩将军','冠军将军','征虏将军','折冲将军','虎威将军','荡寇将军','牙门将军'],
    存疑: [],
    争议: [],
    明确无候选: ['讨逆将军','偏将军','裨将军'],
    排除: ['中郎将系统','都尉系统']
  })
});

const CONTEXT_NOTES = Object.freeze({
  'wei|都护将军': '《三国志》命中夏侯渊在汉末曹操政权“行都护将军”，可证曹氏军府前身使用，尚不能单凭此句证明220年以后常置。',
  'wei|虎牙将军': '卷8正文“文帝践阼，拜辅虎牙将军”为曹魏人例；卷7刘勋仅作汉末比较。',
  'wei|度辽将军': '卷8正文“文帝践阼……柔度辽将军”及卷28母丘俭人例可闭合；范明友仅作汉代比较。',
  'wei|安夷将军': '《通典》命中文字为“安夷护军”，不能据词干扩写为“安夷将军”。',
  'wei|积射将军': '《三国志》命中裴注所载西晋樊震，不能作曹魏人例；本条之确定仅限《通典》魏官品段列“积射”等将军的制度证据。',
  'wei|裨将军': '卷18“文帝即王位，加裨将军”是220年曹魏政权人例；早期人例仅作前身比较。',
  'shu|征东将军': '命中马腾在后汉初平年间的征东将军，不是季汉任官。',
  'shu|征西将军': '卷44正文明记姜维“后迁中监军、征西将军”，是221年后人例。',
  'shu|镇东将军': '首个命中为曹操表刘备；《三国志》卷36赵云传另明记建兴元年后迁镇东将军，季汉任官可确定。',
  'shu|镇南将军': '命中裴注《蜀记》追述晋永兴中镇南将军刘弘，不是季汉任官。',
  'shu|安东将军': '命中罗宪向西晋安东将军陈骞告急，不是季汉任官。',
  'shu|安西将军': '命中《魏略》所载曹魏夏侯楙，不是季汉任官。',
  'shu|左将军': '卷40所载诸葛亮《公文上尚书》明列“左将军……吴壹”，为季汉人例。',
  'shu|右将军': '卷40所载诸葛亮《公文上尚书》明列“督前部右将军……高翔”，夏侯霸仅作曹魏比较。',
  'wu|征南将军': '命中孙香为袁术驱驰时受加征南将军，早于孙吴建国且非孙吴授任。',
  'wu|镇东将军': '卷56正文明记朱绩建兴元年迁镇东将军，毌丘俭仅作敌国比较。',
  'wu|安东将军': '卷55徐盛、卷60贺齐均有孙吴安东将军人例，陈瑀仅作汉末比较。',
  'wu|安南将军': '郭马叛乱时自号安南将军；只保留为自称事件，不升级为孙吴正式官制。',
  'wu|平东将军': '命中吕布上表中自列使持节、平东将军，属后汉及袁术之乱语境，不是孙吴任官。',
  'wu|平南将军': '廖式叛乱时自称平南将军；只保留为自称事件。',
  'wu|平西将军': '命中裴注所载西晋周处追赠平西将军，不是孙吴任官。',
  'wu|前将军': '卷48正文明记太平元年前将军唐咨，是222年后孙吴人例。',
  'wu|左将军': '卷48明记左将军留赞、张布，另有丁奉传人例，均属222年后。',
  'wu|征西将军': '卷48正文于永安七年记征西将军留平；相邻上一年《吴历》注已闭合，不可误归此命中。',
  'wu|横江将军': '鲁肃人例在建安十九年，未换得222年后人例。',
  'wu|折冲将军': '甘宁人例发生于孙吴建国前，暂作政权前身使用的推定。',
  'wu|抚边将军': '陆逊于建安二十四年拜抚边将军，只证建国前阶段。',
  'wu|扶义将军': '朱治于建安七年行扶义将军，只证建国前阶段。',
  'wu|绥远将军': '孙瑜、张昭是建国前人例；卷61陆凯于五凤以后累迁荡魏、绥远将军，闭合222年后人例。',
  'wu|绥南将军': '卷60明记黄武元年全琮迁绥南将军，是建国后人例。',
  'wu|讨逆将军': '孙策的讨逆将军由汉廷表授，属于孙氏政权前身阶段；不等同于222年后孙吴常置。',
  'wu|辅国将军': '太元元年印绶授予“神人”王表；可证名号文字被使用，但不能据此建立普通历史人物任官或常置官制。',
  'jin|安东将军': '卷5建兴二年正文明记安东将军索綝讨赵染，是316年前西晋人例。',
  'jin|安西将军': '卷37明记泰始九年诏司马晃为安西将军，属西晋正式授任。',
  'jin|平西将军': '卷57、120均明记惠帝期罗尚为平西将军；周权自号只作比较。',
  'jin|积射将军': '人物命中为十六国冉闵，超出项目时段；本条确定仅限《通典》晋官品段列“积射”等将军的制度证据。',
  'jin|偏将军': '命中太康年间来降的吴偏将军王嗣，官称属于孙吴身份，不是西晋授任。'
});

const ADDITIONAL_SOURCES = Object.freeze({});

const INSTITUTIONAL_LIST_TITLES = Object.freeze({
  wei: new Set(['辅国将军','龙骧将军','轻车将军','建武将军','振威将军','振武将军','奋威将军','奋武将军','扬武将军','广威将军','广武将军','宁朔将军','积弩将军','积射将军','强弩将军']),
  jin: new Set(['积弩将军','积射将军','强弩将军','折冲将军','虎威将军'])
});

function institutionalListSource(polity, title){
  if (!INSTITUTIONAL_LIST_TITLES[polity]?.has(title)) return [];
  const isWei = polity === 'wei';
  const isJinFifthRank = !isWei && new Set(['积弩将军','积射将军','强弩将军']).has(title);
  return [{
    sourceTitle: `《通典》卷${isWei ? 36 : 37}`,
    sourceUrl: `https://zh.wikisource.org/wiki/通典/卷0${isWei ? 36 : 37}`,
    sourceRevision: isWei ? 7911233 : 7911232,
    sourceTimestamp: isWei ? '2026-08-01T00:15:50Z' : '2026-07-31T23:09:22Z',
    sourceLocator: `${isWei ? '魏' : '晋'}官品段的省称将军列举`,
    sourceExcerpt: isWei
      ? '中坚、中垒、骁骑、游骑、前军、左军、右军、后军、宁朔、建威、建武、振威、振武、奋威、奋武、扬武、广威、广武、左右积弩、积射、强弩等将军。'
      : isJinFifthRank
        ? '前军、左军、右军、后军、宁朔、建威、振威、奋威、广威、建武、振武、扬武、广武、五营校尉、左右积弩、积射、强弩、奋武等将军。'
        : '礼见诸将军鹰扬、折冲、轻车、武牙、威远、宁远、虎威、材官、伏波、凌江等将军。',
    evidenceLayer: '制度正文', evidenceLayerType: '正文', citedWork: '', corpusRelation: '制度比较',
    sourceRole: '制度官品列举；原文省称在“等将军”之前统一补足词尾', normalizedListEvidence: true, accessedAt
  }];
}

const classificationIndex = new Map();
for (const [polity, groups] of Object.entries(CLASSIFICATION)) {
  for (const [disposition, titles] of Object.entries(groups)) {
    for (const title of titles) {
      const key = `${polity}|${title}`;
      assert(!classificationIndex.has(key), `重复分类 ${key}`);
      classificationIndex.set(key, disposition);
    }
  }
}

function sourceFromHit(hit, role){
  return {
    exactHitId: hit.id,
    sourceTitle: `${hit.work}卷${hit.volume}`,
    sourceUrl: hit.sourceUrl,
    sourceRevision: hit.sourceRevision,
    sourceTimestamp: hit.sourceTimestamp,
    sourceLocator: `${hit.section ? `${hit.section}；` : ''}精确命中“${hit.exactMatch}”（偏移${hit.offset}）`,
    sourceExcerpt: hit.sourceExcerpt || '',
    evidenceLayer: hit.evidenceLayer,
    evidenceLayerType: hit.evidenceLayerType,
    citedWork: hit.citedWork || '',
    corpusRelation: hit.corpusRelation,
    sourceRole: role,
    accessedAt
  };
}

function noHitSources(polity){
  const sources = [{
    sourceTitle: '《三国志》65卷检索范围', sourceUrl: 'https://zh.wikisource.org/wiki/三國志',
    sourceLocator: `按“${polityLabels[polity]}”目标时段复核精确名号命中`, evidenceLayer: '检索范围', evidenceLayerType: '审校元数据', sourceRole: '无候选检索范围', accessedAt
  }, {
    sourceTitle: '《晋书》130卷检索范围', sourceUrl: 'https://zh.wikisource.org/wiki/晉書',
    sourceLocator: `按“${polityLabels[polity]}”目标时段复核精确名号命中`, evidenceLayer: '检索范围', evidenceLayerType: '审校元数据', sourceRole: '无候选及跨期比较范围', accessedAt
  }];
  if (polity === 'wei' || polity === 'jin') sources.push({
    sourceTitle: `《通典》卷${polity === 'wei' ? 36 : 37}`, sourceUrl: `https://zh.wikisource.org/wiki/通典/卷0${polity === 'wei' ? 36 : 37}`,
    sourceLocator: `${polityLabels[polity]}官品段`, evidenceLayer: '检索范围', evidenceLayerType: '审校元数据', sourceRole: '制度名号复核范围', accessedAt
  });
  return sources;
}

function conclusionFor(record, evidence, disposition){
  const key = `${record.polity}|${record.title}`;
  const note = CONTEXT_NOTES[key] || '';
  if (disposition === '排除') return {
    conclusion: `“${record.title}”是现代汇总节点，不是史料官名。`,
    unresolvedReason: '系统汇总标签不得作为单一官职进入历史模型。'
  };
  if (disposition === '明确无候选') return {
    conclusion: `在已完成的《三国志》65卷、《晋书》130卷及适用《通典》官品段复核中，未取得“${record.title}”属于${polityLabels[record.polity]}${periods[record.polity]}正式名号的可靠候选。`,
    unresolvedReason: note || (evidence.hits.length ? '同词虽有命中，但人工复核语境后不属于目标政权或目标时段。' : '限定检索范围内无目标政权同名号人例或制度条文；这不是对范围外文献中绝对不存在的断言。')
  };
  if (disposition === '争议') return {
    conclusion: `“${record.title}”存在同词材料，但其性质不足以升级为${polityLabels[record.polity]}正式授任或常置官制。`,
    unresolvedReason: note || '现有命中涉及自称、异常授予对象或相互冲突语境。'
  };
  if (disposition === '存疑') return {
    conclusion: `“${record.title}”已有相关命中，但目标政权／时段归属仍未由当前证据闭合。`,
    unresolvedReason: note || '精确词形命中不能独立解决授任主体、年代或制度层级。'
  };
  if (disposition === '推定') return {
    conclusion: `现有原文支持“${record.title}”在${polityLabels[record.polity]}政权前身或相邻阶段被使用；暂不扩大为${periods[record.polity]}全期常置。`,
    unresolvedReason: note || '任官人例早于正式建国或仅见单一记载，制度连续性尚缺直接条文。'
  };
  return {
    conclusion: `“${record.title}”已取得${polityLabels[record.polity]}同政权人例或可定位制度名号证据。`,
    unresolvedReason: note && /仅限/.test(note) ? note : ''
  };
}

const CRITICAL_CONFIRMERS = Object.freeze({
  'wei|虎牙将军': [{ work: '《三国志》', volume: 8, terms: ['文帝踐阼', '拜輔虎牙將軍'] }],
  'wei|度辽将军': [{ work: '《三国志》', volume: 8, terms: ['文帝踐阼', '柔度遼將軍'] }],
  'wei|裨将军': [{ work: '《三国志》', volume: 18, terms: ['文帝即王位', '加裨将军'] }],
  'shu|征西将军': [{ work: '《三国志》', volume: 44, terms: ['姜維', '后迁中监军'] }],
  'shu|前将军': [{ work: '《三国志》', volume: 39, terms: ['姓胡，名濟', '中監軍前將軍'] }],
  'shu|后将军': [{ work: '《三国志》', volume: 40, terms: ['吳班', '督后部后将军'] }],
  'shu|左将军': [{ work: '《三国志》', volume: 40, terms: ['吳壹', '左将军領荊州'] }],
  'shu|右将军': [{ work: '《三国志》', volume: 40, terms: ['高翔', '督前部右将军'] }],
  'shu|军师将军': [{ work: '《三国志》', volume: 35, terms: ['諸葛瞻', '加軍師將軍'] }],
  'shu|翊军将军': [{ work: '《三国志》', volume: 41, terms: ['霍弋', '翊軍將軍'] }],
  'wu|前将军': [{ work: '《三国志》', volume: 48, terms: ['唐咨', '前將軍唐咨'] }],
  'wu|左将军': [{ work: '《三国志》', volume: 48, terms: ['留贊', '張布'] }],
  'wu|征西将军': [{ work: '《三国志》', volume: 48, terms: ['留平', '七年春正月'] }],
  'wu|镇东将军': [{ work: '《三国志》', volume: 56, terms: ['朱績', '建興元年'] }],
  'wu|安东将军': [{ work: '《三国志》', volume: 55, terms: ['徐盛', '安東將軍'] }, { work: '《三国志》', volume: 60, terms: ['賀齊', '安東將軍'] }],
  'wu|绥远将军': [{ work: '《三国志》', volume: 61, terms: ['陸凱', '累遷蕩魏'] }],
  'wu|绥南将军': [{ work: '《三国志》', volume: 60, terms: ['全琮', '黃武元年'] }],
  'jin|安东将军': [{ work: '《晋书》', volume: 5, terms: ['索綝', '建興二年'] }],
  'jin|安西将军': [{ work: '《晋书》', volume: 37, terms: ['下邳王晃', '泰始九年'] }],
  'jin|平西将军': [{ work: '《晋书》', volume: 120, terms: ['羅尚', '惠帝'] }]
});

function hitMatchesRule(hit, rule){
  if (hit.work !== rule.work || hit.volume !== rule.volume) return false;
  const context = `${hit.section}\n${hit.sourceExcerpt}`;
  return rule.terms.some(term => context.includes(term));
}

function phaseReview(polity, disposition){
  if (polity !== 'shu' && polity !== 'wu') return { rule: '按目标政权或制度条文判读', result: '不适用前身分层' };
  if (disposition === '确定') return { rule: `${polity === 'shu' ? '221' : '222'}年后人例才可作目标政权确定证据`, result: '目标政权时段已闭合' };
  if (disposition === '推定') return { rule: `${polity === 'shu' ? '221' : '222'}年前人例只证政权前身阶段`, result: '仅政权前身人例' };
  return { rule: '同词命中必须区分建国前后、敌国与自号', result: '未取得目标政权确定人例' };
}

const records = pending.map(record => {
  const key = `${record.polity}|${record.title}`;
  const evidence = evidenceByKey.get(key);
  const historicalDisposition = classificationIndex.get(key);
  assert(evidence, `缺少逐条检索快照 ${key}`);
  assert(historicalDisposition, `缺少人工语境分类 ${key}`);
  const sources = evidence.hits.map(hit => sourceFromHit(hit, hit.corpusRelation === '目标书组'
    ? '目标卷组精确命中；须结合人工语境判读'
    : hit.work === '《通典》' ? '制度段精确命中' : '跨政权／跨时段比较命中'));
  sources.push(...institutionalListSource(record.polity, record.title), ...(ADDITIONAL_SOURCES[key] || []));
  if (!sources.length) sources.push(...noHitSources(record.polity));
  const final = conclusionFor(record, evidence, historicalDisposition);
  const locators = sources.filter(source => source.sourceLocator).map(source => `${source.sourceTitle}：${source.sourceLocator}`);
  const criticalRules = CRITICAL_CONFIRMERS[key] || [];
  const confirmingHits = criticalRules.length
    ? evidence.hits.filter(hit => criticalRules.some(rule => hitMatchesRule(hit, rule)))
    : evidence.hits.filter(hit => hit.corpusRelation === '目标书组');
  const layerCounts = evidence.hits.reduce((out, hit) => {
    out[hit.evidenceLayer] = (out[hit.evidenceLayer] || 0) + 1;
    return out;
  }, {});
  return {
    id: `v65:general-title:${record.polity}:${stableId(`${record.polity}|${record.title}`)}`,
    legacyQueueId: 'v60:general-title',
    sourceRecordKey: evidence.key,
    sourceRecordIdentity: { polity: record.polity, title: record.title, sortOrder: record.sortOrder },
    polity: record.polity,
    polityLabel: polityLabels[record.polity],
    period: periods[record.polity],
    title: record.title,
    traditionalQuery: evidence.traditionalQuery,
    grade: record.grade,
    kind: record.kind,
    originalEvidence: record.evidence,
    searchState: 'completed',
    searchScope: [
      `《三国志》65卷精确检索“${record.title}／${evidence.traditionalQuery}”，保留全部命中并按正文／裴注分层`,
      `《晋书》130卷精确检索“${record.title}／${evidence.traditionalQuery}”，保留全部命中并排除超期人例`,
      ...(record.polity === 'wei' || record.polity === 'jin' ? [`《通典》卷${record.polity === 'wei' ? 36 : 37}${polityLabels[record.polity]}官品段制度复核`] : []),
      '同词命中不自动等于同政权官制；自称、追述、敌国官称、注层跨期材料分别判读'
    ],
    exactHitCount: evidence.hits.length,
    exactHitIds: evidence.hits.map(hit => hit.id),
    exactHits: evidence.hits,
    hitCountsByWork: evidence.hitCountsByWork,
    hitCountsByLayer: layerCounts,
    confirmingHitIds: confirmingHits.map(hit => hit.id),
    sources,
    comparativeHits: evidence.hits.filter(hit => hit.corpusRelation !== '目标书组').map(hit => ({
      exactHitId: hit.id, sourceTitle: `${hit.work}卷${hit.volume}`, sourceUrl: hit.sourceUrl, sourceRevision: hit.sourceRevision,
      evidenceLayer: hit.evidenceLayer, evidenceLayerType: hit.evidenceLayerType,
      sourceRole: '跨政权／跨时段比较命中，不自动作为本条确定依据', accessedAt
    })),
    sourceLocator: locators.join('；') || '限定通卷检索无精确候选；检索范围见sources',
    historicalDisposition,
    conclusion: final.conclusion,
    unresolvedReason: final.unresolvedReason,
    contextReview: CONTEXT_NOTES[key] || '已按原卷语境、政权与168—316时段边界判读。',
    phaseReview: phaseReview(record.polity, historicalDisposition),
    publicationStatus: historicalDisposition === '确定' ? 'verified' : 'review-only',
    publicationReason: historicalDisposition === '确定'
      ? '只发布名号存在性；不得由本结论自动推导品级、常置、开府或具体人物任期。'
      : '未达到读者态确定事实门槛；保留于审校台账。',
    researchBoundary: '结论只处理名号存在性及政权／时段归属；不自动证明官品、常置、开府资格或每一位持有者。'
  };
});

assert(records.length === 154, `逐条记录应为154，实际${records.length}`);
assert(classificationIndex.size === records.length, `人工分类应覆盖154条，实际${classificationIndex.size}`);
assert(new Set(records.map(record => record.id)).size === records.length, '稳定ID重复');
assert(records.every(record => record.searchState === 'completed' && record.sources.length && record.sourceLocator && record.conclusion && Object.hasOwn(record, 'unresolvedReason')), '逐条闭环字段不完整');
assert(records.reduce((sum, record) => sum + record.exactHitCount, 0) === V65_GENERAL_TITLE_EVIDENCE.summary.exactHitCount, '未保留全部精确命中');
assert(records.every(record => record.exactHitCount === record.exactHits.length && record.exactHitCount === record.exactHitIds.length), '逐条精确命中数量不守恒');
assert(records.every(record => record.sources.every(source => source.evidenceLayer && !/按原卷保留|不能由字符串/.test(source.evidenceLayer))), '仍有占位 evidenceLayer');

const counts = (items, field) => items.reduce((out, item) => {
  out[item[field]] = (out[item[field]] || 0) + 1;
  return out;
}, {});
const payload = {
  schemaVersion: 2,
  modelId: 'v65-general-title-research',
  generatedAt,
  accessedAt,
  scope: '对data/general-titles.js中154条evidence=待考记录逐项完成通卷检索、语境判读与最终处置。',
  method: V65_GENERAL_TITLE_EVIDENCE.method,
  sourceBoundary: V65_GENERAL_TITLE_EVIDENCE.sourceBoundary,
  works: V65_GENERAL_TITLE_EVIDENCE.works,
  policy: [
    'searchState=completed仅表示规定范围已检索，不等于historicalDisposition=确定。',
    '精确字符串命中必须复核政权、年代、授任主体、正文／注层和自称／追赠性质。',
    '“明确无候选”仅指本次限定原典快照内无可靠目标候选，不声称所有范围外文献绝对不存在。',
    '系统汇总标签排除；非确定项保持review-only，不在读者态当作确定官制。'
  ],
  summary: {
    total: records.length,
    byPolity: counts(records, 'polity'),
    byDisposition: counts(records, 'historicalDisposition'),
    verifiedCount: records.filter(record => record.publicationStatus === 'verified').length,
    reviewOnlyCount: records.filter(record => record.publicationStatus === 'review-only').length,
    openSearchCount: records.filter(record => record.searchState !== 'completed').length,
    exactHitCount: records.reduce((sum, record) => sum + record.exactHitCount, 0),
    recordsWithExactHits: records.filter(record => record.exactHitCount > 0).length,
    recordsWithoutExactHits: records.filter(record => record.exactHitCount === 0).length,
    noExactHitKeys: records.filter(record => record.exactHitCount === 0).map(record => record.sourceRecordKey)
  },
  records
};

fs.writeFileSync(path.join(root, 'data/v65-general-title-research.json'), `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'data/v65-general-title-research.js'), `(function(global){\n  'use strict';\n  global.SGZ_V65_GENERAL_TITLE_RESEARCH = Object.freeze(${JSON.stringify(payload)});\n})(window);\n`);
console.log(JSON.stringify(payload.summary, null, 2));
