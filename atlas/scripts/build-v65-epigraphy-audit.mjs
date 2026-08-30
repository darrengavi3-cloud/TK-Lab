import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const text = value => String(value == null ? '' : value).trim();
const accessedAt = '2026-08-30';

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
]) {
  vm.runInContext(read(relative), context, { filename: relative, timeout: 20_000 });
}

const baseRecords = [
  ...(context.SGZ_EPIGRAPHIC_RECORDS?.records || []),
  ...(context.SGZ_EPIGRAPHIC_V46_JIN?.records || []),
];
const v60ById = new Map((context.SGZ_V60_RESEARCH_LEDGER?.epigraphy || []).map(row => [row.id, row]));
const v61ById = new Map((context.SGZ_V61_EPIGRAPHY_RESEARCH?.epigraphy || []).map(row => [row.id, row]));
const v62ById = new Map((context.SGZ_V62_JINSHI_DISPLAY?.records || []).map(row => [row.id, row]));
const individualSearchPath=path.join(root,'data/v65-epigraphy-individual-search.json');
const individualSearchPayload=fs.existsSync(individualSearchPath)?JSON.parse(fs.readFileSync(individualSearchPath,'utf8')):{records:[]};
const individualSearchById=new Map((individualSearchPayload.records||[]).map(row=>[row.recordId,row]));
const normalizedRecords = baseRecords.map(raw => context.SGZ_JINSHI_SCHEMA.normalize({
  ...raw,
  ...(v60ById.get(raw.id) || {}),
  ...(v61ById.get(raw.id) || {}),
  ...(v62ById.get(raw.id) || {}),
}));
const blankRecords = normalizedRecords.filter(row => !text(row.inscription));

const canonicalAdoptions = {
  'wu-liangxiu-stele': {
    inscriptionStatus: '残缺',
    inscription: '〈上闕二〉休字元堅葢〈闕二〉之苗裔也〈下闕〉載踵勳業文武相濟君曽號稱三〈下闕〉郎中早終君纂考鴻軌體履□懿敬〈下闕〉為主動以禮讓為先每在同儕推人抑己〈下闕〉而後流馨香播越名實先登仕郡厯五官〈下闕〉淑瑋遂察孝㢘除郎中光禄主 昭徳塞違〈下闕〉韜光翳燿隠身殉道隘窮不悶匪 令始實〈下闕〉通四海之閔除禁防既釋辟司徒府府秉忠蹈㛃〈下闕〉勞滿奏上拜新都令謙為自劾寢疾於家季六〈下闕〉有二月戊寅卜𦵏太守安平趙府君嘉厥高□〈下闕〉□父之美宋敘三命之伐𡥂有五名歿宜見旌〈下闕〉守節曰貞博聞曰文請諡休為貞文子爾乃祏〈下闕〉詞曰〈上闕二〉文允□棘勤典素精孔墨高難隠深不測〈下闕〉紫極遐罻□□潛伏靈闥張 鼎弍掌既盈命〈下闕〉𤣥石勒立堂祠跱神徳歿不朽傳兆□',
    sourceLocator: '《隸續》卷一／司徒掾梁休碑（revision 786320）',
    sourceVerification: {
      status: '已核金石目录录文',
      level: '金石目录录文',
      result: '采用洪适《隸續》卷一所录文字；这证明录文层可用，不等同于已核原拓。著录说明与推论不并入正文，原录阙文、空格和方框原样保留。',
      sources: [{
        sourceId: 'wikisource-lixu-01-786320',
        title: '《隸續》卷一',
        url: 'https://zh.wikisource.org/w/index.php?title=%E9%9A%B8%E7%BA%8C_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B701&oldid=786320',
        revisionId: 786320,
        locator: '司徒掾梁休碑正文',
        role: '金石目录录文（非原拓核验）',
        accessedAt,
        accessState: 'accessible',
      }],
    },
    inscriptionVariants: [{
      type: 'original',
      label: '碑本残文',
      textRef: 'canonical',
      source: '《隸續》卷一／司徒掾梁休碑',
      note: '〈上闕〉、〈下闕〉、〈闕二〉及□均保留原著录层标记。',
    }],
  },
  'wei-kongxian-stele': {
    inscriptionStatus: '残缺',
    inscription: [
      '維黄初元年大魏受命𦙍軒轅之高蹤紹虞氏之遐統應歴數以改物揚仁風以作教於是捐五瑞班宗彝鈞衡石同度量秩羣祀於無文順天時以布化乃緝熙聖緒昭顯上世追存二代三恪之禮兼紹宣尼裦成之後以魯縣百户命孔子廿一世孫議郎孔羨為宗聖侯以奉孔子之祀',
      '制詔三公曰昔仲尼姿大聖之才懷帝王之器當衰周〈闕二字〉而無受命之運〈闕〉生乎魯衛之朝教化乎汶泗之上棲棲焉皇皇焉欲屈已以存道貶身以救世當〈闕三字〉終莫能用乃追考五代之禮修素王之事因魯史而制春秋就大師而正雅頌俾千載之後莫不采其文以述作卭其聖以成謀咨可謂命世大聖億載之師表者已遭天下大亂百祀墮壞舊居之廟毁而不修裦成之後絶而莫繼闕里不聞講誦之聲四時不覩烝嘗之位斯豈所謂崇化報功盛徳百世必祀者哉嗟乎朕甚閔焉其以議郎孔羨為宗聖侯邑百户奉孔子之祀令魯郡修起舊廟置百石吏卒以守衛之又於其外廣為屋宇以居學者於是魯之父老諸生㳺士覩廟堂之始復觀爼豆之初設嘉聖靈於髣髴想禎祥之來集乃慨然而嘆曰大道衰廢禮樂滅絶丗餘年',
      '皇上懷仁聖之懿徳兼二儀之化育廣大苞於無方〈闕〉恩淪於不測故自受命以來天人咸和神氣烟煴嘉瑞踵武休徴屢臻殊俗解編髮而慕義遐夷越險阻而來賔雖大皓游龍以君世虞氏儀鳳以臨民伯禹命玄宫而為夏后西伯由岐社而為周文尚何足稱於大魏哉若乃紹繼微絶興修廢官疇咨稽古崇配乾坤允神明之所福祚宇内之所歡欣也豈徒魯邦而已哉爾乃感殷人路寢之義嘉先民泮宫之事以為高宗僖公葢嗣世之王諸侯之國耳猶著徳於名頌騰聲乎千載況今聖皇肇造區夏創業垂統受命之日曾未下輿而裦崇大聖隆化如此能無頌乎乃作頌曰',
      '煌煌大魏受命溥將並體黄虞含夏苞商降釐下土上清三光羣祀咸秩靡事不綱嘉彼玄聖有邈其靈遭世霧亂莫顯其榮褒成既絶寢廟斯傾闕里蕭條靡歆靡馨我皇悼之尋其世武乃建宗聖以紹厥後修復舊堂豐其甍宇莘莘學徒爰居爰處三教既備羣小遄沮魯道以興永作憲矩洪聲登假神祇來和休徴雜遝瑞我邦家内光區域外被荒遐殊方重譯搏拊揚歌於赫四聖運世應期仲尼既没文亦在兹彬彬我后越而五之並於億載如山之基',
    ].join('\n\n'),
    sourceLocator: '《六藝之一録》卷五十五／魏修孔子廟碑（revision 736289）',
    sourceVerification: {
      status: '已核金石目录录文',
      level: '金石目录录文',
      result: '采用《六藝之一録》卷五十五所辑《隸釋》录文；这证明金石目录录文层可用，不等同于已核原拓。《魏志》所供阙字只登记为补读，不混入规范正文。',
      sources: [{
        sourceId: 'wikisource-liuyi-055-736289',
        title: '《六藝之一録》卷五十五',
        url: 'https://zh.wikisource.org/w/index.php?title=%E5%85%AD%E8%97%9D%E4%B9%8B%E4%B8%80%E9%8C%B2_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B7055&oldid=736289',
        revisionId: 736289,
        locator: '魏修孔子廟碑正文及「右魯孔子廟之碑」著录',
        role: '金石目录录文（《隸釋》辑录，非原拓核验）',
        accessedAt,
        accessState: 'accessible',
      }],
    },
    inscriptionVariants: [
      {
        type: 'original',
        label: '碑本残文',
        textRef: 'canonical',
        source: '《六藝之一録》卷五十五／魏修孔子廟碑',
        note: '〈闕〉标记按金石目录录文保留。',
      },
      {
        type: 'supplied',
        label: '《魏志》所见补读',
        text: '之末；時三公',
        source: '《六藝之一録》卷五十五所注《魏志》异文',
        note: '分别对应「衰周〈闕二字〉」及「當〈闕三字〉終」；仅供审校，不并入正文。',
      },
    ],
  },
};

function discoverySources(record) {
  const logs = Array.isArray(record.externalSearchLog) ? record.externalSearchLog : [];
  const sources = logs.map((log, index) => ({
    sourceId: `discovery:${record.id}:${String(index + 1).padStart(2, '0')}`,
    title: text(log.source) || '公开检索入口',
    url: text(log.url),
    locator: text(log.section) || '站内标题与全文检索',
    role: 'batch-discovery/not-individual',
    searchMethod: 'inherited-batch-log',
    accessedAt,
    searchResult: text(log.result),
    resultTitles: Array.isArray(log.resultTitles) ? log.resultTitles.map(text).filter(Boolean) : [],
  })).filter(source => /^https:\/\//.test(source.url));
  if (sources.length) return sources;
  return (record.sourceVerification?.sources || []).map((source, index) => ({
    sourceId: `discovery:${record.id}:fallback:${String(index + 1).padStart(2, '0')}`,
    title: text(source.title) || '公开检索入口',
    url: text(source.url),
    locator: text(source.locator) || '站内标题与全文检索',
    role: 'batch-discovery/not-individual',
    searchMethod: 'inherited-batch-log',
    accessedAt,
    searchResult: '继承 V61 批量发现日志；尚未对当前碑名完成独立查询与结果核验。',
    resultTitles: [],
  })).filter(source => /^https:\/\//.test(source.url));
}

function searchHasCandidate(record) {
  return (record.externalSearchLog || []).some(log => Number(log.totalHits || 0) > 0 || (log.resultTitles || []).length > 0);
}

function completedIndividualSearch(record){
  const row=individualSearchById.get(record.id);
  const searches=row?.searches||[];
  if(row?.name!==record.name||searches.length!==2) return null;
  for(const search of searches){
    if(search.status!=='completed'||search.httpStatus!==200||search.method!=='individual-single-name-api'||search.query!==record.name) return null;
    try{
      const url=new URL(search.url);
      if(url.searchParams.get('srsearch')!==`"${record.name}"`||/\sOR\s/i.test(url.searchParams.get('srsearch')||'')) return null;
    }catch{return null;}
  }
  return searches;
}

function individualSources(record,searches){
  return searches.map(search=>({
    sourceId:`individual:${record.id}:${search.endpoint}`,
    title:search.source,
    url:search.url,
    locator:`MediaWiki 单碑名查询：${record.name}`,
    role:'individual-discovery',
    searchMethod:'individual-single-name-api',
    query:search.query,
    status:search.status,
    httpStatus:search.httpStatus,
    accessedAt:search.searchedAt,
    searchResult:Number(search.totalHits||0)>0?`返回 ${Number(search.totalHits)} 个候选；仍须核对碑刻身份与录文层级。`:'当前入口未返回同名候选；不等于其他馆藏或目录明确无候选。',
    resultTitles:Array.isArray(search.resultTitles)?search.resultTitles.map(text).filter(Boolean):[],
  }));
}

const records = blankRecords.map(record => {
  const adoption = canonicalAdoptions[record.id];
  const adoptionSources = adoption?.sourceVerification?.sources || [];
  if (adoption) {
    const variants = adoption.inscriptionVariants.map(variant => ({
      ...variant,
      text: variant.textRef === 'canonical' ? adoption.inscription : text(variant.text),
    })).map(({ textRef, ...variant }) => variant);
    return {
      auditId: `v65-epigraphy:${record.id}`,
      recordId: record.id,
      name: record.name,
      searchState: '已逐条核对金石目录录文',
      searchMethod: 'individual-primary-verification',
      individualSearchCompleted: true,
      transcriptionDisposition: '确定',
      historicalDisposition: record.id === 'wu-liangxiu-stele' ? '争议' : '确定',
      sourceVerification: adoption.sourceVerification,
      searchSources: adoptionSources,
      publicationStatus: 'reader-visible',
      candidateDisposition: '采用',
      finalConclusion: record.id === 'wu-liangxiu-stele'
        ? '梁休碑录文已由金石目录逐条核对，释文层确定；碑刻纪年等历史解释仍有争议，二者分开记录。'
        : '已取得与具体碑刻身份相符的金石目录录文，残缺与补读分层保存；不据此声称已核原拓。',
      canonicalOverlay: {
        inscription: adoption.inscription,
        inscriptionStatus: adoption.inscriptionStatus,
        inscriptionVariants: variants,
        sourceLocator: adoption.sourceLocator,
        sourceVerification: adoption.sourceVerification,
        candidateDisposition: '采用',
      },
    };
  }
  const completedSearches=completedIndividualSearch(record);
  const individuallyCompleted=Boolean(completedSearches);
  const sources=individuallyCompleted?individualSources(record,completedSearches):discoverySources(record);
  const hasCandidate=individuallyCompleted
    ?completedSearches.some(search=>Number(search.totalHits||0)>0)
    :searchHasCandidate(record);
  return {
    auditId: `v65-epigraphy:${record.id}`,
    recordId: record.id,
    name: record.name,
    searchState: individuallyCompleted
      ?(hasCandidate?'逐碑独立检索完成；发现候选待核':'逐碑独立检索完成；两站未见同名候选')
      :(hasCandidate ? '批量发现候选；尚未逐条检索' : '尚未逐条检索；仅继承批量发现日志'),
    searchMethod: individuallyCompleted?'individual-single-name-api':'batch-discovery',
    individualSearchCompleted: individuallyCompleted,
    transcriptionDisposition: '存疑',
    historicalDisposition: '存疑',
    sourceVerification: {
      status: individuallyCompleted?'逐碑独立发现检索完成':'批量发现已登记；未逐条检索',
      level: individuallyCompleted?'individual-discovery':'batch-discovery',
      result: individuallyCompleted
        ?(hasCandidate?'Wikipedia／维基文库单碑名查询发现候选；尚未核对碑刻身份、原文层级和释读边界，规范字段保持空值。':'Wikipedia／维基文库单碑名查询未返回同名候选；检索范围不等于全部馆藏、拓本与金石目录，规范字段保持空值。')
        :(hasCandidate?'旧批量日志存在同名或相关候选，但当前碑名尚未独立查询，也未核对碑刻身份、原文层级和释读边界；规范字段保持空值。':'仅继承旧批量发现日志，不能据此声称当前碑名已完成检索；不依据题名、目录摘要或相近材料生成正文。'),
      sources,
    },
    searchSources: sources,
    publicationStatus: 'review-only',
    candidateDisposition: hasCandidate?(individuallyCompleted?'保留独立检索候选':'保留批量候选'):(individuallyCompleted?'两站未见同名候选':'待逐条检索'),
    finalConclusion: individuallyCompleted?'已完成两个公开入口的逐碑单名检索；尚无可直接采用录文，释文继续留空且不进入读者发布层。':'尚未完成逐碑独立检索；释文继续留空且不进入读者发布层。',
    canonicalOverlay: {
      inscription: '',
      inscriptionStatus: '源文未见',
      inscriptionVariants: [],
    },
  };
});

const adopted = records.filter(row => row.publicationStatus === 'reader-visible');
const reviewOnly = records.filter(row => row.publicationStatus === 'review-only');
const sourceLevels = records.reduce((counts, row) => {
  const level = row.sourceVerification.level;
  counts[level] = (counts[level] || 0) + 1;
  return counts;
}, {});
const recordIds = baseRecords.map(row => row.id);
const baselineIdSha256 = crypto.createHash('sha256').update(recordIds.join('\n')).digest('hex');
const payload = {
  schemaVersion: 'V65',
  modelId: 'sgz-v65-epigraphy-audit',
  generatedAt: '2026-08-30T00:00:00+08:00',
  scope: '以 V62 合并投影的 188 条金石、50 条有释文／138 条空释文为基线；两条金石目录录文已逐条核对，另外 136 条均完成 Wikipedia 与维基文库单碑名独立发现检索。',
  policy: {
    discoveryBoundary: 'Wikipedia 与搜索结果仅作发现入口，不能单独使释文进入读者态。',
    adoptionRule: '仅原碑、拓本、正式释文或权威金石目录且能核对具体碑刻身份者可采用；采用金石目录录文时不得宣称已核原拓。',
    transcriptionLayers: ['original', 'supplied', 'reading', 'laterAddition'],
    uncertainty: '逐碑发现检索不等于取得可靠录文；未核对碑刻身份与录文层级者保持空值并标记 review-only，绝不生成或猜写。',
  },
  baseline: {
    recordCount: baseRecords.length,
    stableIdCount: new Set(recordIds).size,
    recordIds,
    recordIdSha256: baselineIdSha256,
    withInscription: normalizedRecords.length - blankRecords.length,
    withoutInscription: blankRecords.length,
  },
  summary: {
    auditedBlankRecords: records.length,
    adoptedTranscriptions: adopted.length,
    reviewOnlyRecords: reviewOnly.length,
    postV65WithInscription: normalizedRecords.length - blankRecords.length + adopted.length,
    postV65WithoutInscription: blankRecords.length - adopted.length,
    pendingIndividualSearch: records.filter(row => !row.individualSearchCompleted).length,
    completedIndividualSearch: reviewOnly.filter(row => row.individualSearchCompleted).length,
    sourceLevels,
  },
  adoptedIds: adopted.map(row => row.recordId),
  records,
};

if (baseRecords.length !== 188 || new Set(recordIds).size !== 188) throw new Error('金石 188 个稳定 ID 基线异常');
if (normalizedRecords.length - blankRecords.length !== 50 || blankRecords.length !== 138) throw new Error('金石 50／138 基线异常');
if (records.length !== 138 || new Set(records.map(row => row.recordId)).size !== 138) throw new Error('138 条空释文处置未闭合');
if (adopted.length !== 2 || reviewOnly.length !== 136) throw new Error('V65 释文采用／保持空值数量异常');
if (records.some(row => !row.searchState || !row.searchMethod || !row.transcriptionDisposition || !row.historicalDisposition || !row.sourceVerification || !row.publicationStatus || typeof row.individualSearchCompleted !== 'boolean')) throw new Error('存在缺少 V65 必需审校字段的记录');
if (records.some(row => !Array.isArray(row.searchSources) || row.searchSources.length === 0)) throw new Error('存在没有检索来源的 V65 金石记录');

const jsonText = `${JSON.stringify(payload, null, 2)}\n`;
const jsText = `(function(global){\n  'use strict';\n  const payload=${JSON.stringify(payload)};\n  const overlayById=Object.freeze(Object.fromEntries(payload.records.map(row=>[row.recordId,Object.freeze(row.canonicalOverlay)])));\n  global.SGZ_V65_EPIGRAPHY_AUDIT=Object.freeze({...payload,overlayById});\n})(window);\n`;
const readerPayload = {
  schemaVersion: 'V65',
  modelId: 'sgz-v65-epigraphy-reader-overlays',
  records: [
    ...(context.SGZ_V61_EPIGRAPHY_RESEARCH?.adoptedIds || []).map(recordId => {
      const row=normalizedRecords.find(record => record.id===recordId);
      if(!row || !text(row.inscription)) throw new Error(`V61 累计读者释文缺失：${recordId}`);
      return {
        recordId,
        inscription: row.inscription,
        inscriptionStatus: row.inscriptionStatus,
        inscriptionVariants: (row.inscriptionVariants || []).map(variant => ({
          type: variant.type,
          label: variant.label,
          text: variant.text,
        })),
      };
    }),
    ...adopted.map(row => ({
      recordId: row.recordId,
      inscription: row.canonicalOverlay.inscription,
      inscriptionStatus: row.canonicalOverlay.inscriptionStatus,
      inscriptionVariants: row.canonicalOverlay.inscriptionVariants.map(variant => ({
      type: variant.type,
      label: variant.label,
      text: variant.text,
      })),
    })),
  ].sort((a,b)=>recordIds.indexOf(a.recordId)-recordIds.indexOf(b.recordId)),
};
const readerJsonText = `${JSON.stringify(readerPayload, null, 2)}\n`;
const readerJsText = `(function(global){\n  'use strict';\n  const payload=${JSON.stringify(readerPayload)};\n  const byId=Object.freeze(Object.fromEntries(payload.records.map(row=>[row.recordId,Object.freeze(row)])));\n  global.SGZ_V65_EPIGRAPHY_READER_OVERLAYS=Object.freeze({...payload,byId});\n})(window);\n`;
fs.writeFileSync(path.join(root, 'data/v65-epigraphy-audit.json'), jsonText);
fs.writeFileSync(path.join(root, 'data/v65-epigraphy-audit.js'), jsText);
fs.writeFileSync(path.join(root, 'data/v65-epigraphy-reader-overlays.json'), readerJsonText);
fs.writeFileSync(path.join(root, 'data/v65-epigraphy-reader-overlays.js'), readerJsText);
console.log(JSON.stringify(payload.summary, null, 2));
