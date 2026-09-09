import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(`V65 卷次构建失败：${message}`); };
const stableId = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
const generatedAt = '2026-08-30T00:00:00+08:00';
const accessedAt = '2026-08-30';

const sourceIndex = readJson('data/person-source-index.json');
const legacyLedger = readJson('data/v60-research-ledger.json');

const candidate = (personName, officeName, sourceLocator, sourceExcerpt, options = {}) => ({
  personName,
  officeName,
  relationshipType: options.relationshipType || '任官',
  evidenceLayer: options.evidenceLayer || '正文',
  sourceLocator,
  sourceExcerpt,
  historicalDisposition: options.historicalDisposition || '确定',
  candidateDisposition: options.candidateDisposition || '采用候选',
  uncertaintyReason: options.uncertaintyReason || '',
  boundaryNote: options.boundaryNote || ''
});

const definitions = [
  {
    coverageId: 'coverage:sgz:63', legacyReviewId: 'v60:volume-review:63', work: '《三国志》', volume: 63,
    sourceUrl: 'https://zh.wikisource.org/wiki/三國志/卷63', sourceRevision: 2188657,
    sourceHash: '09476ea05c8009bbbcf1f0bab016a7fec3b22878ab03752df55992912f97344b',
    volumeTitle: '吴书·吴范刘惇赵达传', historicalDisposition: '确定', conclusion: '有候选',
    reason: '人工通读正文及裴注后发现九项可定位身份或任官候选；旧自动扫描零候选属于句式漏取。',
    candidates: [
      candidate('吴范', '骑都尉', '吴范传；孙权任用段', '权以范为骑都尉，领太史令。'),
      candidate('吴范', '太史令', '吴范传；孙权任用段', '权以范为骑都尉，领太史令。', { relationshipType: '领官' }),
      candidate('刘惇', '军师', '刘惇传；事孙辅段', '辅异焉，以为军师。'),
      candidate('魏滕', '历阳县令', '吴范传裴注引《会稽典录》；历任县令段', '历历山、潘阳、山阴三县令，鄱阳太守。', {
        evidenceLayer: '裴注引《会稽典录》', historicalDisposition: '争议',
        uncertaintyReason: '维基文库校记作“历山／历阳”，县名异文未决。', boundaryNote: '规范题名暂按校记候选“历阳”，原文异文必须保留。'
      }),
      candidate('魏滕', '鄱阳县令', '吴范传裴注引《会稽典录》；历任县令段', '历历山、潘阳、山阴三县令，鄱阳太守。', {
        evidenceLayer: '裴注引《会稽典录》', historicalDisposition: '争议',
        uncertaintyReason: '维基文库校记作“潘阳／鄱阳”，县名异文未决。', boundaryNote: '规范题名暂按校记候选“鄱阳”，原文异文必须保留。'
      }),
      candidate('魏滕', '山阴县令', '吴范传裴注引《会稽典录》；历任县令段', '历历山、潘阳、山阴三县令，鄱阳太守。', { evidenceLayer: '裴注引《会稽典录》' }),
      candidate('魏滕', '鄱阳太守', '吴范传裴注引《会稽典录》；历任县令段', '历历山、潘阳、山阴三县令，鄱阳太守。', { evidenceLayer: '裴注引《会稽典录》' }),
      candidate('公孙滕', '太史丞', '赵达传；从学赵达段', '太史丞公孙滕少师事达。'),
      candidate('单甫', '侍中', '赵达传；少从单甫受学段', '少从汉侍中单甫受学。', { boundaryNote: '原文明确为汉侍中，不能误标为孙吴任官。' })
    ],
    exclusions: [
      { subject: '吴范', claim: '都亭侯', reason: '原文记“削除其名”，封侯诏未实际颁出，不建立封爵事件。', sourceLocator: '吴范传；论功行封段' }
    ]
  },
  {
    coverageId: 'coverage:jinshu:017', legacyReviewId: 'v60:volume-review:17', work: '《晋书》', volume: 17,
    sourceUrl: 'https://zh.wikisource.org/wiki/晉書/卷017', sourceRevision: 2666835,
    sourceHash: '900b448f672936b2aa168a799ab26b81981a1fcd29edb12caafea064759c419a',
    volumeTitle: '律历志中', historicalDisposition: '确定', conclusion: '有候选',
    reason: '人工通读历法沿革叙述，发现八项带姓名的明确官称。',
    candidates: [
      candidate('刘洪', '会稽东部尉', '律历志中；汉灵帝时刘洪考历段', '汉灵帝时，会稽东部尉刘洪。'),
      candidate('高堂隆', '太史令', '律历志中；魏文帝黄初历议段', '太史令高堂隆复详议历数。'),
      candidate('韩翊', '太史丞', '律历志中；黄初历议段', '太史丞韩翊以为《乾象》减斗分太过。'),
      candidate('陈群', '尚书令', '律历志中；三公议历段', '其后尚书令陈群奏。'),
      candidate('许芝', '太史令', '律历志中；刘洪月行术议段', '太史令许芝云。'),
      candidate('杨伟', '尚书郎', '律历志中；景初历议段', '尚书郎杨伟表。'),
      candidate('阚泽', '中书令', '律历志中；孙吴乾象历沿革段', '吴中书令阚泽受刘洪《乾象法》。'),
      candidate('王蕃', '中常侍', '律历志中；孙吴乾象历沿革段', '中常待王蕃以洪术精妙。', {
        historicalDisposition: '推定', uncertaintyReason: '当前维基文库底本文字作“中常待”，据官名规范读作“中常侍”，仍保留原字形。'
      })
    ]
  },
  {
    coverageId: 'coverage:jinshu:018', legacyReviewId: 'v60:volume-review:18', work: '《晋书》', volume: 18,
    sourceUrl: 'https://zh.wikisource.org/wiki/晉書/卷018', sourceRevision: 2667268,
    sourceHash: 'c27c7d41f0bd3b57e88b6851d02ad5bbc24041522b351707dc4b86ed2c3cd82f',
    volumeTitle: '律历志下', historicalDisposition: '确定', conclusion: '有候选',
    reason: '人工通读发现两项明确身份；均可能与其他卷既有记录重复，须以稳定人物ID合并而非另造人物。',
    candidates: [
      candidate('杨伟', '尚书郎', '律历志下；杨伟表开篇', '魏尚书郎杨伟表曰。', { boundaryNote: '与卷17杨伟候选为同一任官的互证候选。' }),
      candidate('杜预', '当阳侯', '律历志下；《春秋长历》引介段', '当阳侯杜预著《春秋长历》。', { relationshipType: '爵位', boundaryNote: '仅登记身份互证，不据此新建一次受封事件。' })
    ]
  },
  {
    coverageId: 'coverage:jinshu:022', legacyReviewId: 'v60:volume-review:22', work: '《晋书》', volume: 22,
    sourceUrl: 'https://zh.wikisource.org/wiki/晉書/卷022', sourceRevision: 2703898,
    sourceHash: '9f2720e74de3d02dc4a49df67cc2d54ed8e696ad14c09ccf340ee4414f3ad60b',
    volumeTitle: '乐志上', historicalDisposition: '确定', conclusion: '有候选',
    reason: '人工区分沿革叙述与乐章标题后，发现九项带姓名的官称；祭祀歌题不作为人物任官。',
    candidates: [
      candidate('杜夔', '雅乐郎', '乐志上；魏武平荆州后定雅乐段', '获汉雅乐郎河南杜夔。', { boundaryNote: '原文明确为汉雅乐郎。' }),
      candidate('杜夔', '军谋祭酒', '乐志上；魏武平荆州后定雅乐段', '以为军谋祭酒，使创定雅乐。'),
      candidate('邓静', '散骑侍郎', '乐志上；杜夔总领雅乐段', '时又有散骑侍郎邓静、尹商善训雅乐。'),
      candidate('尹商', '散骑侍郎', '乐志上；杜夔总领雅乐段', '时又有散骑侍郎邓静、尹商善训雅乐。'),
      candidate('荀勖', '光禄大夫', '乐志上；泰始九年作古尺段', '光禄大夫荀勖始作古尺。'),
      candidate('傅玄', '太仆', '乐志上；泰始五年造乐歌段', '使太仆傅玄、中书监荀勖、黄门侍郎张华各造乐歌。'),
      candidate('荀勖', '中书监', '乐志上；泰始五年造乐歌段', '使太仆傅玄、中书监荀勖、黄门侍郎张华各造乐歌。'),
      candidate('张华', '黄门侍郎', '乐志上；泰始五年造乐歌段', '使太仆傅玄、中书监荀勖、黄门侍郎张华各造乐歌。'),
      candidate('陈颀', '司律中郎将', '乐志上；荀勖问魏氏歌诗段', '以问司律中郎将陈颀。')
    ],
    exclusions: [
      { subject: '征西将军', claim: '人物任官', reason: '“祠征西将军登歌”为祭祀乐章题名，不是任官句。', sourceLocator: '乐志上；祠征西将军登歌' }
    ]
  },
  {
    coverageId: 'coverage:jinshu:026', legacyReviewId: 'v60:volume-review:26', work: '《晋书》', volume: 26,
    sourceUrl: 'https://zh.wikisource.org/wiki/晉書/卷026', sourceRevision: 2687290,
    sourceHash: 'b976123dd74fdfbd095b3eabc69956ad9bce2f98e538ea2174ccb2004f5dd0d6',
    volumeTitle: '食货志', historicalDisposition: '确定', conclusion: '有候选',
    reason: '人工通读汉末、魏及西晋食货叙述，发现十二项项目时段内的明确或可谨慎展开身份候选；太兴二年（319）邓攸及其他东晋、早期东汉事例另行排除。',
    candidates: [
      candidate('崔烈', '司徒', '食货志；汉灵帝卖官段', '廷尉崔烈入钱五百万以买司徒。'),
      candidate('孙徽', '符节令', '食货志；献帝东归曹阳段', '董承使符节令孙徽以刃胁夺之。'),
      candidate('刘馥', '扬州刺史', '食货志；曹魏屯田水利段', '以沛国刘馥为扬州刺史，镇合肥。'),
      candidate('贾逵', '豫州刺史', '食货志；贾侯渠段', '贾逵之为豫州，南与吴接。', { historicalDisposition: '推定', uncertaintyReason: '本卷以“为豫州”省称，官名展开为豫州刺史须与本传互证。' }),
      candidate('颜斐', '京兆太守', '食货志；黄初中劝课段', '时济北颜斐为京兆太守。'),
      candidate('郑浑', '沛郡太守', '食货志；郑陂段', '郑浑为沛郡太守。'),
      candidate('徐邈', '凉州刺史', '食货志；魏明帝世凉州水利段', '魏明帝世徐邈为凉州。', { historicalDisposition: '推定', uncertaintyReason: '本卷以“为凉州”省称，官名展开为凉州刺史须与本传互证。' }),
      candidate('皇甫隆', '敦煌太守', '食货志；敦煌耧犁灌溉段', '其后皇甫隆为敦煌太守。'),
      candidate('石鉴', '司隶校尉', '食货志；泰始中汲郡劝农诏段', '司隶校尉石鉴所上汲郡太守王宏。'),
      candidate('王宏', '汲郡太守', '食货志；泰始中汲郡劝农诏段', '司隶校尉石鉴所上汲郡太守王宏。'),
      candidate('石苞', '司徒', '食货志；泰始八年劝农奏段', '八年，司徒石苞奏。'),
      candidate('夏侯和', '光禄勋', '食货志；泰始十年修渠段', '十年，光禄勋夏侯和上修三渠。')
    ],
    exclusions: [
      { subject: '张林、朱晖', claim: '汉代食货身份', reason: '事在项目起点168年以前，仅作制度背景。', sourceLocator: '食货志；东汉初均田劝农段' },
      { subject: '邓攸', claim: '吴郡太守', reason: '“二年，三吴大饥”承上文为太兴二年（319），晚于项目截止316年，不得作西晋范围候选。', sourceLocator: '食货志；元帝太兴二年三吴大饥段' },
      { subject: '虞某、桓彝、应詹、褚裒、荀羡', claim: '东晋任官', reason: '元帝以后或317年后的东晋材料，超出168—316项目时段。', sourceLocator: '食货志；元帝以后段' }
    ]
  },
  {
    coverageId: 'coverage:jinshu:119', legacyReviewId: 'v60:volume-review:119', work: '《晋书》', volume: 119,
    sourceUrl: 'https://zh.wikisource.org/wiki/晉書/卷119', sourceRevision: 2180618,
    sourceHash: 'c6fdac103c872c8846cdf5d32e8ba07bffebc61483c1ddf155f3d1175bfde6e1',
    volumeTitle: '载记·姚泓', historicalDisposition: '排除', conclusion: '明确无范围内候选',
    reason: '本卷叙事始于义熙十二年（416），晚于项目截止316年；零候选是时段排除，不是抽取失败。',
    candidates: [],
    exclusions: [
      { subject: '全卷人物与任官', claim: '168—316范围候选', reason: '卷内核心叙事为416—417年后秦末事，整体超出项目时段。', sourceLocator: '载记·姚泓；义熙十二年至义熙十三年叙事' }
    ]
  }
];

const coverageById = new Map(sourceIndex.coverage.map(record => [record.id, record]));
const legacyById = new Map(legacyLedger.volumeClosures.map(record => [record.id, record]));

const records = definitions.map(definition => {
  const prior = coverageById.get(definition.coverageId);
  const legacy = legacyById.get(definition.legacyReviewId);
  assert(prior, `缺少旧覆盖ID ${definition.coverageId}`);
  assert(legacy, `缺少旧审校ID ${definition.legacyReviewId}`);
  assert(prior.processedStatus === '待复核', `${definition.coverageId} 旧状态不是待复核`);
  assert(prior.sourceHash === definition.sourceHash, `${definition.coverageId} 源哈希与人工复核快照不一致`);
  assert(prior.sourceRevision === definition.sourceRevision, `${definition.coverageId} 源版本号不一致`);

  const sourceLocator = `${definition.work}卷${definition.volume}·${definition.volumeTitle}`;
  const candidates = definition.candidates.map((item, index) => ({
    id: `v65:volume-candidate:${stableId(`${definition.coverageId}|${item.personName}|${item.officeName}|${index}`)}`,
    ...item,
    sourceUrl: definition.sourceUrl,
    sourceRevision: definition.sourceRevision
  }));
  const exclusions = (definition.exclusions || []).map((item, index) => ({
    id: `v65:volume-exclusion:${stableId(`${definition.coverageId}|${item.subject}|${item.claim}|${index}`)}`,
    ...item,
    historicalDisposition: '排除'
  }));
  return {
    id: `v65:volume-review:${definition.coverageId.replace(/^coverage:/, '').replaceAll(':', '-')}`,
    legacyCoverageId: definition.coverageId,
    legacyReviewId: definition.legacyReviewId,
    work: definition.work,
    volume: definition.volume,
    volumeTitle: definition.volumeTitle,
    projectScope: '168—316年；卷次通读用于发现人物身份、任官与爵位候选，不自动合并人物。',
    searchState: 'completed',
    searchScope: [
      `维基文库 ${sourceLocator} 当前源文本人工通读`,
      '按姓名＋官称、授任句式、裴注／志书沿革叙述复核旧零候选结果',
      '排除纯标题、祭祀对象、未实际授予及项目时段外材料'
    ],
    sources: [{
      sourceTitle: sourceLocator,
      sourceUrl: definition.sourceUrl,
      sourceRevision: definition.sourceRevision,
      sourceHash: definition.sourceHash,
      accessedAt,
      sourceRole: '人工复核底本'
    }],
    sourceLocator,
    previousState: {
      processedStatus: prior.processedStatus,
      candidateCount: prior.candidateCount,
      reason: prior.exclusionReasons?.[0] || '',
      legacyConclusion: legacy.finalReview?.conclusion || ''
    },
    historicalDisposition: definition.historicalDisposition,
    conclusion: definition.conclusion,
    unresolvedReason: definition.historicalDisposition === '确定' ? '' : definition.reason,
    reason: definition.reason,
    candidateCount: candidates.length,
    adoptedCandidateCount: candidates.filter(item => item.candidateDisposition === '采用候选').length,
    exclusionCount: exclusions.length,
    candidates,
    exclusions,
    integrationBoundary: '本台账关闭卷次复核任务；候选进入人物／任官规范源前仍须以稳定personId去重，并保留异文与来源层。'
  };
});

assert(records.length === 6, '必须恰有六卷');
assert(records.filter(record => record.candidateCount > 0).length === 5, '应有五卷发现候选');
const recordByCoverageId = new Map(records.map(record => [record.legacyCoverageId, record]));
assert(recordByCoverageId.get('coverage:jinshu:119')?.historicalDisposition === '排除', '《晋书》卷119必须按超期排除');

const payload = {
  schemaVersion: 1,
  modelId: 'v65-volume-review',
  generatedAt,
  accessedAt,
  scope: '对V60/V61来源索引中六个“自动扫描零候选、待复核”卷次做人工通读收口。',
  policy: [
    '有候选表示原文出现可定位的身份或任官事实，不代表已完成稳定personId合并。',
    '明确无范围内候选必须记录检索时段和排除原因，不能用形式化“已检索”替代史实结论。',
    '异文、省称、裴注与正文分别保存；证据不足允许推定、争议或排除。'
  ],
  summary: {
    reviewedVolumeCount: records.length,
    volumesWithCandidates: records.filter(record => record.candidateCount > 0).length,
    volumesWithoutInScopeCandidates: records.filter(record => record.candidateCount === 0).length,
    candidateCount: records.reduce((sum, record) => sum + record.candidateCount, 0),
    exclusionCount: records.reduce((sum, record) => sum + record.exclusionCount, 0),
    dispositionCounts: records.reduce((out, record) => {
      out[record.historicalDisposition] = (out[record.historicalDisposition] || 0) + 1;
      return out;
    }, {})
  },
  records
};

const jsonText = `${JSON.stringify(payload, null, 2)}\n`;
fs.writeFileSync(path.join(root, 'data/v65-volume-review.json'), jsonText);
/* 与将军名号台账同理：卷次台账也是纯审校产物，界面从不载入，.js 只服务于一条
   与 JSON 的相等断言。停产该形态，改由校验器断言其不存在。 */
const legacyVolumeReviewJs = path.join(root, 'data/v65-volume-review.js');
if (fs.existsSync(legacyVolumeReviewJs)) fs.rmSync(legacyVolumeReviewJs);
console.log(JSON.stringify(payload.summary, null, 2));
