import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');

function loadGlobal(file, name) {
  const context = { window: {}, console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dataDir, file), 'utf8'), context, { filename: file });
  return context.window[name];
}

const source = loadGlobal('person-source-index.js', 'SGZ_PERSON_SOURCE_INDEX');
const identities = loadGlobal('person-identities.js', 'SGZ_PERSON_IDENTITIES');
const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(dataDir, 'person-source-index.js'))).digest('hex');

const explicitExclusions = new Map([
  ['都护', '官职或职务词，不是人物姓名'],
  ['扶波', '疑似官号或 OCR 残片，未形成可核验人物姓名'],
  ['扶风', '地名，不是人物姓名'],
  ['桂林', '郡名或地名，不是人物姓名'],
  ['贵阳', '郡名或地名，不是人物姓名'],
  ['江阳', '郡名或地名，不是人物姓名'],
  ['海鹽', '县名／地名残片，不是人物姓名'],
  ['海盐', '县名／地名残片，不是人物姓名'],
  ['懷義', '当前出处只显示为断句残片，未能确认人物实体'],
  ['怀义', '当前出处只显示为断句残片，未能确认人物实体'],
  ['东部', '军府或部曲方位词，不是人物姓名'],
  ['西部', '军府或部曲方位词，不是人物姓名'],
  ['南部', '军府或部曲方位词，不是人物姓名'],
  ['北部', '军府或部曲方位词，不是人物姓名'],
  ['别部', '军府编制词，不是人物姓名'],
  ['别驾', '州府官职，不是人物姓名'],
  ['常侍大', '“中常侍大长秋”中的官职残片，不是人物姓名'],
  ['牧辽东', '州牧与郡名连写的官职/辖区残片，不是人物姓名'],
  ['车骑', '将军号残片，不是人物姓名'],
  ['左车骑', '将军号残片，不是人物姓名'],
  ['右车骑', '将军号残片，不是人物姓名'],
  ['车骑大', '“车骑大将军”中的官号残片，不是人物姓名'],
  ['伏波', '将军号残片，不是人物姓名'],
  ['平北', '将军号残片，不是人物姓名'],
  ['平狄', '将军号残片，不是人物姓名'],
  ['安东', '将军号残片，不是人物姓名'],
  ['安北', '将军号残片，不是人物姓名'],
  ['平东', '将军号残片，不是人物姓名'],
  ['越骑', '校尉官号残片，不是人物姓名'],
  ['曹爽请', '语句残片，句末“请”不是姓名组成部分'],
  ['曹爽引', '语句残片，句末“引”不是姓名组成部分'],
  ['康立', '来源表中未形成可核验人物实体，沿用 V45 待排除项'],
  ['贲九江', '《三国志》卷51“策遣贲、景……除贲九江太守”中的孙贲姓名与任职辖区残片'],
  ['郎中令', '官职名，不是人物姓名'],
  ['池令', '官职／地名残片，不是人物姓名'],
  ['费祎命', '语句残片，末字“命”不是姓名组成部分'],
  ['王导引', '语句残片，末字“引”不是姓名组成部分'],
  ['越引', '语句残片，末字“引”不是姓名组成部分'],
  ['罗引', '语句残片，末字“引”不是姓名组成部分'],
  ['白衣', '身份称谓，不是人物姓名'],
  ['蒙逊', '超出本项目 168—316 年默认人物范围'],
  // V52：从任官句中误切出的地名、族名、官名与句段残片。
  ...['安定','安豐','安南','安平','安遠','巴东','巴西','东大','东莞','东羌','东属国','东阳','和世','扶風','乐安','平寇','平南','平虜','平魏','平原','平子雖','曲梁','平戎','时擢','史大夫','通振威','文观','文学','聞弟','烏丸','武都','武平','相大','吴曆','谢服','宣信','严裨','燕平難','阳安','阳平','有军功','章陵','章西安','左大','左度辽'].map(name => [name, 'V52实体审校：地名、少数民族名、官名或句段/OCR误切，不是人物姓名']),
  ['曹鼎', '东汉关系人物，超出本项目 168—316 年默认人物范围'],
  ['刘和', '现有记录不属于默认范围；保留规范实体但不进入默认人物记'],
]);

const correctionRules = [
  { raw: '賁九江', canonical: '孙贲', reason: '《三国志》卷51正文“策遣賁、景……除賁九江太守”中，“賁”为孙贲，九江为任职辖区', test: /策遣賁、景|策遣贲、景|賁九江太守/ },
  { raw: '公女曼', canonical: '曹曼', reason: '《三国志》卷2裴注“公女曼为长乐郡公主”，按魏宗室姓名规范为曹曼', test: /公女曼为长乐郡公主|公女曼爲長樂郡公主/ },
  { raw: '康代', canonical: '韦康', reason: '《三国志》卷25正文“其子康代为刺史”是“韦康代替其父任刺史”的句法，人物为韦康', test: /其子康代为刺史|其子康代爲刺史/ },
  { raw: '豐雖宿', canonical: '李丰', reason: '《三国志》卷9正文上下文为“中书令李豐雖宿为……”，姓名为李丰', test: /李豐雖宿|李丰/ },
  { raw: '胡业亦', canonical: '胡业', reason: '《三国志》卷15裴注上下文为“南阳胡业亦为刺史、郡守”，末字为句法连接词', test: /胡业亦为|胡业亦爲/ },
  { raw: '黄琬代', canonical: '黄琬', reason: '《三国志》卷49正文上下文为“黄琬代为司徒”，末字“代”为句法词', test: /黄琬代为|黃琬代爲/ },
  { raw: '公表权', canonical: '孙权', reason: '《三国志》卷47正文上下文为“曹公表权为骠骑将军”，姓名与显式身份表合并为孙权', test: /曹公表权为|曹公表權爲/ },
  { raw: '国硃寓', canonical: '朱寓', reason: '《三国志》卷54裴注上下文为“沛国硃寓为从事”，前置“沛国”为籍贯，姓名为朱寓', test: /沛国硃寓为|沛國硃寓爲/ },
  { raw: '王敦表', canonical: '王敦', reason: '《晋书》卷68正文上下文为“王敦表兼为太常”，末字“表”为句法词', test: /王敦表兼为|王敦表兼爲/ },
  { raw: '李驤亦', canonical: '李襄', reason: '《晋书》卷90正文上下文为“涪人李驤亦为尚书郎”，末字“亦”为句法词，异体驤规范为襄', test: /李驤亦为|李驤亦爲/ },
  { raw: '伯父鼎', canonical: '曹鼎', reason: '关系表述“伯父鼎”指曹鼎；曹鼎为东汉人物，不纳入本项目 168—316 默认范围', test: /伯父鼎|曹鼎/ },
  { raw: '匡师友', canonical: '士匡', reason: '“匡师友从事”中“师友”是从事职掌语，人物为士匡', test: /匡师友从事|匡師友從事|士匡/ },
  { raw: '鲁镇南', canonical: '张鲁', reason: '“鲁镇南将军”是张鲁任镇南将军的误切，人物为张鲁', test: /鲁镇南|魯鎮南|张鲁/ },
  { raw: '时孚', canonical: '司马孚', reason: '“时孚”是司马孚姓名截断，按稳定身份合并', test: /时孚|時孚|司马孚/ },
  { raw: '时蒋济', canonical: '蒋济', reason: '“时蒋济”中“时”为句法时间词，人物为蒋济', test: /时蒋济|時蔣濟|蒋济/ },
  { raw: '虞子和', canonical: '刘和', reason: '“虞子和”是刘虞之子刘和的关系式误切，规范为刘和；现有记录不纳入默认范围', test: /虞子和|虞子和为|劉和/ },
  { raw: '卓弟旻', canonical: '董旻', reason: '“卓弟旻”是董卓之弟董旻的关系式误切', test: /卓弟旻|卓弟旻为|董旻/ },
  { raw: '南匈奴呼厨泉', canonical: '呼厨泉', reason: '“南匈奴”为族属说明，不属于姓名；人物名规范为呼厨泉', test: /南匈奴呼厨泉|呼廚泉|呼厨泉/ },
];

const placeNames = new Set([
  '司隶', '司隷', '冀州', '兖州', '豫州', '青州', '徐州', '扬州', '荆州', '益州', '梁州', '凉州', '雍州', '幽州', '并州', '交州', '广州', '宁州', '平州',
  '魏郡', '巴郡', '吴郡', '晋陵', '东郡', '武陵', '汝南', '颍川', '河内', '河东', '南阳', '涿郡', '辽东', '襄阳', '江夏', '庐江', '丹阳', '会稽', '建安', '广汉', '廣汉', '广陵', '廣陵', '广阳', '廣陽', '广宗', '廣宗', '广都', '廣都', '广德', '廣德', '广威', '廣威', '广武', '廣武', '广平', '廣平', '犍为', '蜀郡', '汉中', '天水', '陇西', '金城', '武威', '张掖', '酒泉', '敦煌', '池阳', '黾池', '渑池', '长沙', '建康', '海盐', '海鹽'
]);

function clean(value) {
  return String(value || '').replace(/[（(].*?[)）]/g, '').trim();
}

function sourcePersonId(name, oldRecord) {
  const resolved = identities?.resolve?.(name, oldRecord || {});
  if (resolved?.personId) return resolved.personId;
  const existing = (source.people || []).find(item => item.name === name || (item.aliases || []).includes(name));
  if (existing?.personId) return String(existing.personId);
  if (oldRecord?.personId && name === oldRecord.name) return String(oldRecord.personId);
  return `person:source:${crypto.createHash('sha256').update(name).digest('hex').slice(0, 12)}`;
}

function correctionFor(rawName, record) {
  const rule = correctionRules.find(item => item.raw === rawName || item.canonical === rawName);
  if (!rule) return null;
  const excerpt = String(record?.sourceExcerpt || '');
  return !excerpt || rule.test.test(excerpt) ? rule : null;
}

function classify(rawName, record) {
  const name = clean(rawName);
  if (explicitExclusions.has(name)) return { entityType: 'nonPerson', visibilityStatus: 'excluded', reason: explicitExclusions.get(name) };
  if (placeNames.has(name)) return { entityType: 'place', visibilityStatus: 'excluded', reason: '地名或行政区名，不进入人物记' };
  if (/^(?:广|廣)/.test(name) && !identities?.resolve?.(name, record || {})) return { entityType: 'unknown', visibilityStatus: 'review', reason: '以“广／廣”开头的未规范候选，需回查原文' };
  if (name.length < 2 || name.length > 4) return { entityType: 'unknown', visibilityStatus: 'review', reason: '姓名长度异常，需回查原文' };
  if (/(?:虽宿|引|请|請)$/.test(name)) return { entityType: 'unknown', visibilityStatus: 'review', reason: '疑似句法残片，需回查原文' };
  return { entityType: 'person', visibilityStatus: 'visible', reason: '保留为人物候选，仍以来源出处为准' };
}

const normalizationAudit = [];
const exclusionAudit = [];
const oldToCanonical = new Map();

const appointments = (source.appointments || []).map(original => {
  const rawName = clean(original.rawName || original.name);
  const currentName = clean(original.name);
  const correction = correctionFor(rawName, original);
  const canonicalName = correction?.canonical || currentName;
  const auditRawName = correction && rawName === correction.canonical ? correction.raw : rawName;
  const classification = classify(canonicalName, original);
  const next = { ...original, rawName: auditRawName, name: canonicalName, entityType: classification.entityType, visibilityStatus: classification.visibilityStatus };
  if (correction) {
    next.personId = sourcePersonId(canonicalName, original);
    next.homonymGroupId = next.personId;
    next.aliases = Array.from(new Set(original.aliases || []));
    next.normalizationStatus = '已按出处规范化';
    next.normalizationReason = correction.reason;
    normalizationAudit.push({ rawName: auditRawName, canonicalName, personId: next.personId, sourceLocator: original.sourceLocator || '', sourceExcerpt: original.sourceExcerpt || '', reason: correction.reason, status: '已规范化' });
  } else {
    next.normalizationStatus = classification.visibilityStatus === 'visible' ? '原始候选' : classification.visibilityStatus === 'excluded' ? '已排除' : '待审';
  }
  if (classification.visibilityStatus !== 'visible') {
    next.includeInDefault = false;
    exclusionAudit.push({ rawName, canonicalName, entityType: classification.entityType, visibilityStatus: classification.visibilityStatus, reason: classification.reason, sourceLocator: original.sourceLocator || '', sourceExcerpt: original.sourceExcerpt || '' });
  }
  oldToCanonical.set(`${original.personId}|${auditRawName}`, { personId: next.personId, name: next.name, entityType: next.entityType, visibilityStatus: next.visibilityStatus });
  return next;
});

const peopleById = new Map();
function addPerson(base) {
  if (!base?.personId) return null;
  if (!peopleById.has(base.personId)) {
    peopleById.set(base.personId, {
      ...base,
      aliases: Array.from(new Set(base.aliases || [])),
      sourceIds: Array.from(new Set(base.sourceIds || [])),
      entityType: base.entityType || 'person',
      visibilityStatus: base.visibilityStatus || 'visible',
      normalizationStatus: base.normalizationStatus || '原始候选',
    });
  }
  return peopleById.get(base.personId);
}

for (const original of source.people || []) {
  const rawName = clean(original.name);
  const linked = appointments.filter(item => item.personId === original.personId || (item.rawName === rawName && item.personId === original.personId));
  const linkedCanonical = linked.find(item => item.visibilityStatus === 'visible' || item.normalizationStatus === '已按出处规范化') || linked[0];
  const correction = correctionFor(rawName, linkedCanonical || original);
  const canonicalName = linkedCanonical?.name || correction?.canonical || rawName;
  const classification = classify(canonicalName, linkedCanonical || original);
  const personId = linkedCanonical?.personId || (correction ? sourcePersonId(canonicalName, original) : original.personId);
  const person = addPerson({
    ...original,
    personId,
    name: canonicalName,
    aliases: Array.from(new Set(original.aliases || [])),
    entityType: classification.entityType,
    visibilityStatus: classification.visibilityStatus,
    includeInDefault: original.includeInDefault === true && classification.visibilityStatus === 'visible',
    normalizationStatus: correction ? '已按出处规范化' : classification.visibilityStatus === 'visible' ? '原始候选' : classification.visibilityStatus === 'excluded' ? '已排除' : '待审',
  });
  if (person && correction) {
    person.normalizationReason = correction.reason;
    normalizationAudit.push({ rawName, canonicalName, personId, sourceLocator: linkedCanonical?.sourceLocator || '', sourceExcerpt: linkedCanonical?.sourceExcerpt || '', reason: correction.reason, status: '已规范化' });
  }
}

for (const appointment of appointments) {
  const person = addPerson({
    personId: appointment.personId,
    name: appointment.name,
    aliases: appointment.normalizationStatus === '已按出处规范化' ? [appointment.name] : [appointment.rawName, appointment.name],
    includeInDefault: appointment.includeInDefault === true && appointment.visibilityStatus === 'visible',
    entityType: appointment.entityType,
    visibilityStatus: appointment.visibilityStatus,
    normalizationStatus: appointment.normalizationStatus,
    sourceWork: appointment.sourceWork,
    sourceVolume: appointment.sourceVolume,
    evidenceLayer: appointment.evidenceLayer,
    researchStatus: appointment.researchStatus,
    homonymGroupId: appointment.homonymGroupId,
    homonymStatus: appointment.homonymStatus,
  });
  if (!person) continue;
  person.aliases = Array.from(new Set([...(person.aliases || []), appointment.name, ...(appointment.normalizationStatus === '已按出处规范化' ? [] : [appointment.rawName])].filter(Boolean)));
  person.sourceIds = Array.from(new Set([...(person.sourceIds || []), appointment.id].filter(Boolean)));
  if (appointment.includeInDefault === true && appointment.visibilityStatus === 'visible') person.includeInDefault = true;
  if (appointment.visibilityStatus !== 'visible') person.visibilityStatus = appointment.visibilityStatus;
}

// 规范化只保留在审计中的 rawName，不把误切姓名继续作为人物卡片的可检索别名。
// 这样既不丢失证据，又避免“鲁镇南／时孚”等旧键在人物记中再次出现。
const retiredAliases = new Set([
  ...explicitExclusions.keys(),
  ...correctionRules.map(item => item.raw),
]);
for (const person of peopleById.values()) {
  person.aliases = Array.from(new Set((person.aliases || []).filter(alias => !retiredAliases.has(alias) || alias === person.name)));
}

const reviewCandidates = [...peopleById.values()].filter(item => item.visibilityStatus === 'review').map(item => ({
  personId: item.personId, rawName: item.aliases?.[0] || item.name, name: item.name, reason: item.normalizationReason || '候选待审', sourceIds: item.sourceIds || [],
}));

const audit = {
  schemaVersion: 'V49',
  modelId: 'sgz-person-entity-audit-v49',
  source: 'data/person-source-index.js',
  sourceHash,
  policy: '姓名先保留原文，再进行实体分类；只有有出处且 entityType=person、visibilityStatus=visible 的记录进入默认人物记。所有纠正保留 rawName、出处和原因；无法确认者进入待审，不静默删除。',
  explicitExclusions: [...explicitExclusions.entries()].map(([rawName, reason]) => ({ rawName, reason })),
  normalizations: normalizationAudit,
  exclusions: exclusionAudit,
  reviewCandidates,
  summary: {
    sourcePeopleBefore: (source.people || []).length,
    sourceAppointmentsBefore: (source.appointments || []).length,
    peopleAfter: peopleById.size,
    appointmentsAfter: appointments.length,
    visiblePeople: [...peopleById.values()].filter(item => item.includeInDefault === true).length,
    excludedAppointments: appointments.filter(item => item.visibilityStatus === 'excluded').length,
    reviewAppointments: appointments.filter(item => item.visibilityStatus === 'review').length,
    normalizedAppointments: appointments.filter(item => item.normalizationStatus === '已按出处规范化').length,
  },
};

const nextSource = {
  ...source,
  schemaVersion: 10,
  modelId: 'sgz-person-source-index-v49',
  generatedAt: '2026-08-22T00:00:00+08:00',
  policy: source.policy.includes('V49 增加实体分类、原文保留、规范化审计和默认人物可见性门禁')
    ? source.policy
    : `${source.policy} V49 增加实体分类、原文保留、规范化审计和默认人物可见性门禁。`,
  people: [...peopleById.values()],
  appointments,
  entityAudit: { modelId: audit.modelId, summary: audit.summary },
  summary: {
    ...source.summary,
    people: peopleById.size,
    appointments: appointments.length,
    defaultAppointments: appointments.filter(item => item.includeInDefault === true).length,
    defaultPeople: [...peopleById.values()].filter(item => item.includeInDefault === true).length,
  },
};

function jsModule(name, value) {
  return `(function(global){\n  'use strict';\n  global.${name}=Object.freeze(${JSON.stringify(value)});\n})(window);\n`;
}

fs.writeFileSync(path.join(dataDir, 'person-source-index.js'), jsModule('SGZ_PERSON_SOURCE_INDEX', nextSource));
fs.writeFileSync(path.join(dataDir, 'person-entity-audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
const runtimeExclusions = Object.fromEntries([
  ...explicitExclusions.entries(),
  ...exclusionAudit.map(item => [item.rawName, item.reason]),
]);
fs.writeFileSync(path.join(dataDir, 'person-entity-audit.js'), jsModule('SGZ_PERSON_ENTITY_AUDIT', {
  schemaVersion: 'V49',
  normalizeMap: Object.fromEntries(normalizationAudit.map(item => [item.rawName, { canonicalName: item.canonicalName, personId: item.personId, reason: item.reason }])),
  exclusions: runtimeExclusions,
  reviewNames: reviewCandidates.map(item => item.rawName),
  summary: audit.summary,
}));
fs.writeFileSync(path.join(dataDir, 'person-volume-coverage.json'), `${JSON.stringify({ ...((() => { try { return JSON.parse(fs.readFileSync(path.join(dataDir, 'person-volume-coverage.json'), 'utf8')); } catch { return {}; } })()), schemaVersion: 10, modelId: nextSource.modelId, generatedAt: nextSource.generatedAt, summary: nextSource.summary }, null, 2)}\n`);

console.log(JSON.stringify(audit.summary, null, 2));
