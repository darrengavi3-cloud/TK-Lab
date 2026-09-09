/* 史实一致性门禁。
 *
 * 只做一件事：拿本库自己的东西互相对质。不引入任何外部史源，也不产生新的
 * 史学判断——凡本门禁报出的，都是库内两处说法互相矛盾，或一处说法与它自己
 * 引的那条文字不合。因此每一条都可以在库内覆核，不需要重新审定。
 *
 * 覆盖五类：
 *   一、年号与西元互证（爵制事件、州镇任期、战事纪）
 *   二、任期文字与起讫年字段互证
 *   三、籍贯／表字与本库引文中的自证句互证
 *   四、金石纪年四处互证（年号文字、西元年、碑名括注、释文）与释文越界
 *   五、职名字面自我重复、辖区类别与辖区名不合
 *   六、同一来源列生成多个人物实体（带 :N 重复标记者）
 *
 *   node scripts/verify-historical-consistency.mjs        列出全部发现
 *   node scripts/verify-historical-consistency.mjs --strict  有发现即失败
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const loadGlobal = relative => {
  const scope = {};
  new Function('global', 'window', read(relative))(scope, scope);
  return scope[Object.keys(scope)[0]];
};

const findings = [];
const report = (kind, detail) => findings.push({ kind, detail });

/* ---------- 年号表 ---------- */
/* 同名年号列出各朝起点；只有当所有读法都对不上时才判为不符。 */
const ERAS = {
  中平: [184], 初平: [190], 兴平: [194], 建安: [196], 延康: [220],
  黄初: [220], 太和: [227, 366], 青龙: [233], 景初: [237], 正始: [240],
  嘉平: [249], 正元: [254], 甘露: [256, 265], 景元: [260], 咸熙: [264],
  章武: [221], 建兴: [223, 252, 313], 延熙: [238], 景耀: [258], 炎兴: [263],
  黄武: [222], 黄龙: [229], 嘉禾: [232], 赤乌: [238], 太元: [251, 376],
  神凤: [252], 五凤: [254], 太平: [256], 永安: [258, 304], 元兴: [264, 402],
  宝鼎: [266], 建衡: [269], 凤凰: [272], 天册: [275], 天玺: [276], 天纪: [277],
  泰始: [265], 咸宁: [275], 太康: [280], 太熙: [290], 永熙: [290], 永平: [291],
  元康: [291], 永康: [300], 永宁: [301], 太安: [302], 建武: [304, 317],
  永兴: [304], 光熙: [306], 永嘉: [307],
  太宁: [323], 咸和: [326], 咸康: [335], 建元: [343], 永和: [345], 升平: [357],
  隆和: [362], 兴宁: [363], 宁康: [373], 隆安: [397], 义熙: [405]
};
const CN_DIGITS = { 元: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function chineseYear(text) {
  if (text === '元') return 1;
  if (/^\d+$/.test(text)) return Number(text);
  let total = 0;
  let section = 0;
  let seen = false;
  for (const character of text) {
    if (character === '十') { section = (section || 1) * 10; total += section; section = 0; seen = true; continue; }
    if (character === '百') { section = (section || 1) * 100; total += section; section = 0; seen = true; continue; }
    if (CN_DIGITS[character] === undefined) return null;
    section = CN_DIGITS[character];
    seen = true;
  }
  return seen ? total + section : null;
}
/* 年号前可能冠「约」「疑」等限定词，须先剥掉再查表，否则整条失配。
   年号后可接月份，其后才是括注西元；夏历十一月、十二月落在儒略／格里历的
   次年，故这两个月份允许 +1，否则会把正确的跨年换算误报为错。 */
const ERA_PAIR = /(?:约|約|疑|传|傳)?([一-鿿]{2})((?:元|[一二三四五六七八九十]+))年\s*((?:[一二三四五六七八九十]{1,3}月)?)[^（(]{0,6}[（(]?(\d{3,4})?年?/g;
function eraConflicts(text) {
  const conflicts = [];
  const pairs = [];
  let match;
  ERA_PAIR.lastIndex = 0;
  while ((match = ERA_PAIR.exec(String(text || '')))) {
    const [, era, numeral, month, stated] = match;
    const starts = ERAS[era];
    const ordinal = chineseYear(numeral);
    if (!starts || ordinal === null) continue;
    const crossesYear = /^(十一|十二)月$/.test(month || '');
    const candidates = starts.flatMap(start => (crossesYear
      ? [start + ordinal - 1, start + ordinal]
      : [start + ordinal - 1]));
    pairs.push({ era, ordinal, stated: stated ? Number(stated) : null, candidates, literal: match[0] });
    if (stated && !candidates.includes(Number(stated))) {
      conflicts.push(`${match[0].trim()} → ${era}${numeral}年${month || ''}应为 ${[...new Set(candidates)].join(' 或 ')}`);
    }
  }
  return { conflicts, pairs };
}

/* ---------- 一、爵制事件 ---------- */
const relations = loadGlobal('data/v63-reader-person-relations.js');
for (const event of relations.peerageEvents || []) {
  const { conflicts, pairs } = eraConflicts(event.grantDate);
  for (const conflict of conflicts) report('年号与西元不符（爵制）', `${event.title}｜${conflict}`);
  const stated = pairs.find(pair => pair.stated !== null);
  if (stated && event.year != null && event.year !== '' && Number(event.year) !== stated.stated) {
    report('爵制事件 year 与纪年文字不符', `${event.title}｜文「${event.grantDate}」 year=${event.year}`);
  }
}

/* ---------- 二、州镇任期 ---------- */
const fangzhen = loadGlobal('data/v69-fangzhen-reader.js').records || [];
for (const record of fangzhen) {
  const label = `${record.commander}·${record.title}`;
  const { conflicts, pairs } = eraConflicts(record.tenureText);
  for (const conflict of conflicts) report('年号与西元不符（州镇）', `${label}｜${conflict}`);
  const dated = pairs.filter(pair => pair.stated !== null);
  if (dated.length && record.startYear != null && dated[0].stated !== Number(record.startYear)) {
    report('任期文字起年与 startYear 不符', `${label}｜文「${record.tenureText}」 startYear=${record.startYear}`);
  }
  if (dated.length > 1 && record.endYear != null && dated[dated.length - 1].stated !== Number(record.endYear)) {
    report('任期文字讫年与 endYear 不符', `${label}｜文「${record.tenureText}」 endYear=${record.endYear}`);
  }
  if (record.startYear != null && record.endYear != null && Number(record.startYear) > Number(record.endYear)) {
    report('起年晚于讫年', `${label}｜${record.startYear}—${record.endYear}`);
  }
  /* 任期文字未给出确切讫年，字段却给出一个——即断言了原文没有的东西。 */
  if (record.endYear != null && !dated.length && /未详|未詳|中$|初$|年间|年間/.test(String(record.tenureText || ''))) {
    report('任期文字无确切讫年而 endYear 有值', `${label}｜文「${record.tenureText}」 endYear=${record.endYear}`);
  }
  const title = String(record.title || '');
  const doubled = /(太守|刺史|都督|校尉|将军|將軍)\1/.exec(title);
  if (doubled) report('职名字面自我重复', `${label}｜「${title}」`);
  const jurisdiction = String(record.jurisdiction || '');
  if (record.jurisdictionKind === '郡' && jurisdiction && !/郡|国|國|不详|不詳/.test(jurisdiction)) {
    report('辖区类别为郡但辖区名不是郡国', `${label}｜辖区「${jurisdiction}」`);
  }
}

/* ---------- 三、战事纪 ---------- */
const battleData = loadGlobal('data/battle-records.js');
for (const battle of battleData.battles || []) {
  const { conflicts } = eraConflicts(battle.yearText);
  for (const conflict of conflicts) report('年号与西元不符（战事）', `${battle.name || battle.id}｜${conflict}`);
}

/* ---------- 三之二、金石录 ---------- */
/* 金石条目自带年号文字、西元年、碑名括注纪年与释文四处纪年，彼此可以互证。
   已由 v72 审定表改正者不再报出——那是已完成的审校，不是待办。 */
const epigraphySources = [
  ['data/epigraphic-records.js', '正典'],
  ['data/epigraphic-v46-jin.js', '两晋金石录解析档'],
  ['data/v69-epigraphic-records.js', '读者投影']
];
let yearReviewed = new Map();
let removedEpigraphy = new Set();
if (fs.existsSync(path.join(root, 'data/v72-epigraphy-year-review.json'))) {
  const review = JSON.parse(read('data/v72-epigraphy-year-review.json'));
  yearReviewed = new Map((review.records || []).map(row => [row.recordId, row.year]));
}
/* 已从读者投影删除的砖铭不必再核纪年：它们不出货。 */
{
  const builder = read('scripts/build-v69-data.mjs');
  const listing = /const removedEpigraphicIds\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/.exec(builder);
  if (listing) removedEpigraphy = new Set([...listing[1].matchAll(/'([^']+)'/g)].map(match => match[1]));
}
/* 释文栏若混入著录语，多半是解析时越过了条目边界，把后面几个碑目一并吞进来。 */
const CATALOGUE_SIGNALS = [/【[^】]{2,12}[録录目記记]】/, /石高[^。]{0,12}[寬宽]/, /行[^。]{0,6}字不等/, /現藏|现藏/, /所記：|所记：/, /拓末行/];

/* 同一条碑在正典、解析档与读者投影里各有一份；同 id 只报一次，报最先见到的那份。 */
const seenEpigraphy = new Set();
for (const [relative, label] of epigraphySources) {
  if (!fs.existsSync(path.join(root, relative))) continue;
  const records = loadGlobal(relative).records || [];
  for (const record of records) {
    if (removedEpigraphy.has(record.id) || seenEpigraphy.has(record.id)) continue;
    seenEpigraphy.add(record.id);
    const name = String(record.name || record.id);
    /* 年号文字 ↔ year */
    const { conflicts } = eraConflicts(`${record.yearText || ''}（${record.year != null ? record.year : ''}年）`);
    if (conflicts.length && !yearReviewed.has(record.id)) {
      report('金石年号与 year 不符', `${label}·${name}｜${conflicts[0]}`);
    }
    /* 碑名括注纪年 ↔ yearText */
    const braced = /[（(]([^）)]{2,24})[）)]\s*$/.exec(String(record.rawTitle || ''));
    if (braced && /(?:元|[一二三四五六七八九十]{1,3})年|年间|年間|初年/.test(braced[1])) {
      const yearText = String(record.yearText || '');
      if (/未详|未詳|待考/.test(yearText)) {
        report('碑名已写明纪年而 yearText 作未详', `${label}·${name}｜题作「${braced[1]}」`);
      } else if (!braced[1].includes(yearText) && !yearText.includes(braced[1])) {
        report('碑名括注纪年与 yearText 不符', `${label}·${name}｜题作「${braced[1]}」 yearText=「${yearText}」`);
      }
    }
    /* 释文越界 */
    const inscription = String(record.inscription || '');
    if (inscription.length >= 50) {
      const hits = CATALOGUE_SIGNALS.filter(signal => signal.test(inscription));
      if (hits.length >= 2) report('释文栏疑越界吞并他碑', `${label}·${name}｜${inscription.length} 字，命中 ${hits.length} 项著录语`);
    }
  }
}
/* 同名碑目而朝代相左 */
{
  const reader = loadGlobal('data/v69-epigraphic-records.js').records || [];
  const byName = new Map();
  for (const record of reader) {
    if (!byName.has(record.name)) byName.set(record.name, []);
    byName.get(record.name).push(record);
  }
  for (const [name, group] of byName) {
    if (group.length < 2) continue;
    const dynasties = new Set(group.map(row => row.dynasty).filter(Boolean));
    report(dynasties.size > 1 ? '同名碑目且朝代相左' : '同名碑目',
      `${name} ×${group.length}｜${group.map(row => `${row.id}/${row.dynasty}/${row.sourceLocator}`).join('  ')}`);
  }
}

/* ---------- 四、籍贯／表字 与本库引文自证句 ---------- */
/* 语料取本库已提交的引文与原文摘录；不联网。 */
const corpusFiles = ['data/v75-chancellery-evidence.json', 'data/v63-reader-person-relations.js', 'data/v69-person-profiles.js'];
let corpus = '';
for (const relative of corpusFiles) {
  if (fs.existsSync(path.join(root, relative))) corpus += `\n${read(relative)}`;
}
const biographies = loadGlobal('data/person-biographies.js');
const bioMap = biographies.people || biographies;
/* 自证句：「某某字某某，某地人也」。繁简两体各查一次，不做通用转换。 */
const SELF = /([一-鿿]{2,4})字([一-鿿]{2})[，,]?\s*([一-鿿]{2,10}?)人也/g;
const attested = new Map();
let selfMatch;
while ((selfMatch = SELF.exec(corpus))) {
  const [, name, zi, place] = selfMatch;
  if (!attested.has(name)) attested.set(name, []);
  attested.get(name).push({ zi, place });
}
for (const [name, record] of Object.entries(bioMap)) {
  const claims = attested.get(name);
  if (!record || !claims) continue;
  for (const claim of claims) {
    if (record.zi && record.zi !== claim.zi) {
      report('表字与本库引文不合', `${name}：库作「${record.zi}」，引文作「${claim.zi}」`);
    }
    if (record.birthplace && !record.birthplace.includes(claim.place) && !claim.place.includes(record.birthplace)) {
      report('籍贯与本库引文不合', `${name}：库作「${record.birthplace}」，引文作「${claim.place}人」`);
    }
  }
}

/* ---------- 五、同一来源列生成多个人物实体 ---------- */
if (fs.existsSync(path.join(root, 'data/v63-person-registry.js'))) {
  const registry = loadGlobal('data/v63-person-registry.js');
  const owner = new Map();
  for (const person of registry.people || []) {
    for (const sourceId of person.sourceRecordIds || []) owner.set(sourceId, person);
  }
  for (const person of registry.people || []) {
    for (const sourceId of person.sourceRecordIds || []) {
      const marked = /^(.+):(\d+)$/.exec(sourceId);
      if (!marked) continue;
      const base = owner.get(marked[1]);
      if (base && base.personId !== person.personId) {
        report('同一来源列生成多个人物实体', `${base.name}：${base.personId} 与 ${person.personId}（来源列 ${marked[1]}）`);
      }
    }
  }
}

/* ---------- 汇总 ---------- */
const grouped = new Map();
for (const item of findings) {
  if (!grouped.has(item.kind)) grouped.set(item.kind, []);
  grouped.get(item.kind).push(item.detail);
}
const ordered = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [kind, details] of ordered) {
  console.log(`【${kind}】${details.length} 条`);
  for (const detail of details.slice(0, 20)) console.log(`    ${detail}`);
  if (details.length > 20) console.log(`    …另 ${details.length - 20} 条`);
}
if (!findings.length) console.log('史实一致性验证通过：库内各处说法互不冲突。');
else console.log(`\n共 ${findings.length} 条待覆核。每条都是库内两处说法相左，可在库内查证，无须重新审定。`);
if (strict && findings.length) process.exit(1);
