import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const DYNASTY_ORDER = Object.freeze(['后汉', '魏', '季汉', '吴', '西晋']);
const sourceFiles = [
  'person-name-normalization.js',
  'person-identities.js',
  'person-era-rosters.js',
  'person-source-index.js',
  'person-zi-supplement.js',
  'v60-person-workbook-import.js',
  'v61-person-supplements.js',
];

const window = {};
window.window = window;
const context = { window };
vm.createContext(context);
for (const fileName of sourceFiles) {
  vm.runInContext(fs.readFileSync(path.join(dataDir, fileName), 'utf8'), context, { filename: `data/${fileName}` });
}

const identities = window.SGZ_PERSON_IDENTITIES;
const eraRosters = window.SGZ_PERSON_ERA_ROSTERS;
const sourceIndex = window.SGZ_PERSON_SOURCE_INDEX;
const ziRecords = window.SGZ_PERSON_ZI_SUPPLEMENT || [];
const v60 = window.SGZ_V60_PERSON_WORKBOOK_IMPORT;
const v61 = window.SGZ_V61_PERSON_SUPPLEMENTS;
if (!identities || !eraRosters || !sourceIndex || !v60 || !v61) throw new Error('V62 人物覆盖层缺少必需的上游数据');

const clean = value => String(value == null ? '' : value).trim();
const canonicalPersonId = personId => identities.canonicalPersonId(clean(personId));
const people = new Map();
const eraRosterUnresolved = [];
let dynastyEvidenceCount = 0;
let polityEvidenceCount = 0;
let peeragePeriodEvidenceCount = 0;

function ensurePerson(personId) {
  const id = canonicalPersonId(personId);
  if (!id) return null;
  if (!people.has(id)) people.set(id, {
    personId: id,
    dynastyTags: new Set(),
    strongDynastyTags: new Set(),
    acceptedRiskyDynastyTags: new Set(),
    riskyDynastyEvidence: [],
    dynastyTagConflicts: [],
    historicalAffiliations: new Set(),
    rawPolities: new Set(),
    sourceRefs: new Map(),
    readerZi: '',
    readerZiSource: null,
  });
  return people.get(id);
}

function addSourceRef(person, source) {
  if (!person || !source) return;
  const ref = {
    dataset: clean(source.dataset),
    locator: clean(source.locator),
    evidenceType: clean(source.evidenceType),
    rawPolity: clean(source.rawPolity),
    normalizedPolity: clean(source.normalizedPolity),
    dynastyTags: Array.from(new Set(source.dynastyTags || [])).filter(tag => DYNASTY_ORDER.includes(tag)),
    historicalAffiliations: Array.from(new Set(source.historicalAffiliations || [])).filter(Boolean),
    evidenceStrength: clean(source.evidenceStrength),
  };
  const key = JSON.stringify(ref);
  if (!person.sourceRefs.has(key)) person.sourceRefs.set(key, ref);
}

function normalizeSegments(value) {
  return clean(value)
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .split(/(?:→|->)/)
    .map(item => item.trim())
    .filter(Boolean);
}

const dynastyAliases = new Map([
  ['东汉', '后汉'], ['后汉', '后汉'], ['汉廷', '后汉'],
  ['曹魏', '魏'], ['魏', '魏'],
  ['季汉', '季汉'], ['蜀汉', '季汉'], ['汉(季汉)', '季汉'], ['汉(蜀汉)', '季汉'],
  ['孙吴', '吴'], ['吴', '吴'],
  ['西晋', '西晋'],
]);
const affiliationAliases = new Map([
  ['袁绍', '袁绍集团'],
  ['董卓', '董卓集团'],
  ['刘璋', '刘璋集团'],
  ['马腾', '马腾集团'],
]);

function derivePolity(normalizedValue, derivationContext = {}) {
  const value = clean(normalizedValue);
  const dynastyTags = new Set();
  const historicalAffiliations = new Set();
  const segments = normalizeSegments(value);
  const identityPolities = derivationContext.identityPolities || [];
  const identityHasSeasonHan = identityPolities.some(item => /(?:季汉|蜀汉)/.test(item));
  const rawPolity = clean(derivationContext.rawPolity);

  for (const segment of segments) {
    if (dynastyAliases.has(segment)) {
      dynastyTags.add(dynastyAliases.get(segment));
      continue;
    }
    if (segment === '汉') {
      if (derivationContext.dataset === 'v60-workbook' && /(?:东汉|東漢|後漢)/.test(rawPolity)) {
        dynastyTags.add('后汉');
      } else if (derivationContext.dataset === 'v60-workbook'
        || derivationContext.dataset === 'snapshot260'
        || derivationContext.phase === '蜀亡前夕'
        || identityHasSeasonHan) {
        dynastyTags.add('季汉');
      } else if (derivationContext.dataset === 'curated-identities'
        || derivationContext.dataset === 'era-roster'
        || derivationContext.dataset === 'peerage-event') {
        dynastyTags.add('后汉');
      } else {
        historicalAffiliations.add('汉');
      }
      continue;
    }
    if (segment === '晋') {
      if (derivationContext.dataset === 'v60-workbook' || derivationContext.dataset === 'curated-identities') {
        dynastyTags.add('西晋');
      } else {
        historicalAffiliations.add('晋');
      }
      continue;
    }

    if (/^(?:东汉|后汉|汉廷)/.test(segment)) dynastyTags.add('后汉');
    if (/^(?:季汉|蜀汉)/.test(segment)) dynastyTags.add('季汉');
    if (/^(?:曹魏|魏)(?:宗室|$)/.test(segment)) dynastyTags.add('魏');
    if (/^(?:孙吴|吴)(?:$|[·])/u.test(segment)) dynastyTags.add('吴');
    if (/^西晋(?:$|[·])/u.test(segment)) dynastyTags.add('西晋');

    const affiliation = affiliationAliases.get(segment) || segment;
    if (!dynastyAliases.has(affiliation)) historicalAffiliations.add(affiliation);
  }
  return { dynastyTags: [...dynastyTags], historicalAffiliations: [...historicalAffiliations] };
}

function addPolityEvidence(personId, rawPolity, normalizedPolity, source, derivationContext = {}) {
  const person = ensurePerson(personId);
  if (!person) return;
  const raw = clean(rawPolity) || clean(normalizedPolity);
  const normalized = clean(normalizedPolity) || raw;
  if (raw) person.rawPolities.add(raw);
  if (!normalized) return;
  const derived = derivePolity(normalized, { ...derivationContext, rawPolity: raw });
  const evidenceStrength = source.dataset === 'snapshot260' ? 'review-risk' : 'strong';
  if (evidenceStrength === 'review-risk') {
    derived.dynastyTags.forEach(tag => person.riskyDynastyEvidence.push({
      tag,
      dataset: source.dataset,
      locator: clean(source.locator),
      rawPolity: raw,
      normalizedPolity: normalized,
    }));
  } else {
    derived.dynastyTags.forEach(tag => {
      person.dynastyTags.add(tag);
      person.strongDynastyTags.add(tag);
    });
  }
  derived.historicalAffiliations.forEach(item => person.historicalAffiliations.add(item));
  polityEvidenceCount += 1;
  addSourceRef(person, {
    ...source,
    evidenceType: 'explicit-polity',
    rawPolity: raw,
    normalizedPolity: normalized,
    dynastyTags: derived.dynastyTags,
    historicalAffiliations: derived.historicalAffiliations,
    evidenceStrength,
  });
}

function addDynastyEvidence(personId, dynastyTag, source) {
  const person = ensurePerson(personId);
  if (!person || !DYNASTY_ORDER.includes(dynastyTag)) return;
  person.riskyDynastyEvidence.push({
    tag: dynastyTag,
    dataset: source.dataset,
    locator: clean(source.locator),
    rawPolity: '',
    normalizedPolity: '',
  });
  dynastyEvidenceCount += 1;
  addSourceRef(person, {
    ...source,
    evidenceType: source.evidenceType || 'explicit-period',
    dynastyTags: [dynastyTag],
    evidenceStrength: 'review-risk',
  });
}

for (const identity of identities.identities || []) {
  const person = ensurePerson(identity.personId);
  if (!person) continue;
  for (const polity of identity.polities || []) {
    addPolityEvidence(identity.personId, polity, polity, {
      dataset: 'curated-identities',
      locator: `data/person-identities.js#${identity.personId}`,
    }, { dataset: 'curated-identities', identityPolities: identity.polities || [] });
  }
}

for (const person of sourceIndex.people || []) {
  if (person.entityType !== 'person' || person.visibilityStatus !== 'visible') continue;
  ensurePerson(person.personId);
}

for (const item of v60.people || []) {
  const person = ensurePerson(item.personId);
  if (!person) continue;
  addPolityEvidence(item.personId, item.polityRaw, item.polity, {
    dataset: 'v60-workbook',
    locator: `${item.workbookSource?.sheet || '人物總表'}!${item.workbookSource?.row || ''}`,
  }, { dataset: 'v60-workbook' });
}

for (const item of v61.people || []) ensurePerson(item.personId);
for (const snapshot of v61.snapshots260 || []) {
  if (!snapshot.personId) continue;
  ensurePerson(snapshot.personId);
  addPolityEvidence(snapshot.personId, snapshot.polityRaw, snapshot.polity, {
    dataset: 'snapshot260',
    locator: `${snapshot.workbookSource?.sheet || '260年史实人物'}!${snapshot.workbookSource?.row || ''}`,
  }, { dataset: 'snapshot260' });
}

for (const record of eraRosters.records || []) {
  const identityPolity = record.phase === '蜀亡前夕' ? '季汉' : record.polity;
  const identity = identities.resolve(record.person, { polity: identityPolity });
  if (!identity?.personId) {
    eraRosterUnresolved.push({ id: record.id, person: record.person, polity: record.polity, phase: record.phase });
    continue;
  }
  addPolityEvidence(identity.personId, record.polity, record.polity, {
    dataset: 'era-roster',
    locator: record.id,
  }, { dataset: 'era-roster', phase: record.phase });
  if (record.officePolity) {
    addPolityEvidence(identity.personId, record.officePolity, record.officePolity, {
      dataset: 'era-roster',
      locator: `${record.id}#officePolity`,
    }, { dataset: 'era-roster', phase: record.phase });
  }
}

for (const event of v61.peerageEvents || []) {
  if (!event.readerVisible || !event.recipientPersonIds?.length) continue;
  let dynastyTag = '';
  if (event.category === '献帝朝中央授爵') dynastyTag = '后汉';
  else if (Number.isFinite(event.year) && event.year >= 220 && event.year <= 265
    && !['非封爵记录', '人物辨析（范围外）', '地方割据/朝廷羁縻'].includes(event.category)) dynastyTag = '魏';
  if (!dynastyTag) continue;
  for (const personId of event.recipientPersonIds) {
    addDynastyEvidence(personId, dynastyTag, {
      dataset: 'peerage-event',
      locator: event.eventId,
      evidenceType: 'peerage-event-period',
    });
    peeragePeriodEvidenceCount += 1;
  }
}

function acceptRiskyTag(person, evidence, reason) {
  person.dynastyTags.add(evidence.tag);
  person.acceptedRiskyDynastyTags.add(evidence.tag);
  evidence.disposition = 'accepted';
  evidence.reason = reason;
}

function rejectRiskyTag(person, evidence, reason) {
  evidence.disposition = 'review-only';
  evidence.reason = reason;
  person.dynastyTagConflicts.push({
    proposedTag: evidence.tag,
    dataset: evidence.dataset,
    locator: evidence.locator,
    rawPolity: evidence.rawPolity,
    normalizedPolity: evidence.normalizedPolity,
    disposition: 'review-only',
    reason,
  });
}

// 260 年快照与曹魏封爵表中的 personId 映射可能由同名关联产生。
// 它们可以支持已有标签，但不能单独把对立政权标签加到读者态。
for (const person of people.values()) {
  const snapshots = person.riskyDynastyEvidence.filter(item => item.dataset === 'snapshot260');
  const peerages = person.riskyDynastyEvidence.filter(item => item.dataset === 'peerage-event');

  for (const evidence of snapshots) {
    const accepted = person.dynastyTags;
    if (accepted.has(evidence.tag)) {
      acceptRiskyTag(person, evidence, '与已核实王朝归属一致');
    } else if (!accepted.size) {
      acceptRiskyTag(person, evidence, '260 年快照为当前唯一五朝归属候选，未见冲突');
    } else if (accepted.has('西晋') && ['魏', '季汉', '吴'].includes(evidence.tag)) {
      acceptRiskyTag(person, evidence, '260 年快照与西晋归属构成可核验的前朝—西晋承接');
    } else {
      rejectRiskyTag(person, evidence, `260 年快照提示“${evidence.tag}”，但与已核实标签“${[...accepted].join('、')}”不构成已证承接，疑为同名映射`);
    }
  }

  for (const evidence of peerages) {
    const accepted = person.dynastyTags;
    if (accepted.has(evidence.tag)) {
      acceptRiskyTag(person, evidence, '与已核实王朝归属一致');
    } else if (!accepted.size) {
      acceptRiskyTag(person, evidence, '封爵事件为当前唯一五朝归属候选，未见冲突');
    } else if (evidence.tag === '后汉' && [...accepted].some(tag => ['魏', '季汉', '吴', '西晋'].includes(tag))) {
      acceptRiskyTag(person, evidence, '后汉封爵与后续王朝归属的时序相容');
    } else if (evidence.tag === '魏' && accepted.has('西晋')) {
      acceptRiskyTag(person, evidence, '曹魏封爵与西晋归属的时序相容');
    } else {
      rejectRiskyTag(person, evidence, `封爵事件提示“${evidence.tag}”，但与已核实标签“${[...accepted].join('、')}”冲突，疑为同名受封者映射`);
    }
  }
}

for (const record of ziRecords) {
  const person = ensurePerson(record.personId);
  if (!person || !clean(record.zi) || record.confidence !== '确定' || !clean(record.sourceLocator)) continue;
  person.readerZi = clean(record.zi);
  person.readerZiSource = {
    dataset: 'v55-verified-zi',
    sourceTitle: clean(record.sourceTitle),
    sourceLocator: clean(record.sourceLocator),
    confidence: record.confidence,
  };
}

function zhSort(left, right) {
  return String(left).localeCompare(String(right), 'zh-Hans-CN');
}
const records = [...people.values()].map(person => {
  const dynastyTags = DYNASTY_ORDER.filter(tag => person.dynastyTags.has(tag));
  const historicalAffiliations = [...person.historicalAffiliations].sort(zhSort);
  const rawPolities = [...person.rawPolities].sort(zhSort);
  const sourceRefs = [...person.sourceRefs.values()].sort((a, b) => (
    a.dataset.localeCompare(b.dataset) || a.locator.localeCompare(b.locator) || a.rawPolity.localeCompare(b.rawPolity)
  ));
  const affiliationStatus = dynastyTags.length ? 'resolved' : historicalAffiliations.length ? 'historical-only' : 'unresolved';
  const unresolvedReason = affiliationStatus === 'resolved'
    ? ''
    : rawPolities.length
      ? '原始归属不能无歧义映射到后汉、魏、季汉、吴、西晋之一'
      : '现有规范源未提供可核实的政权归属';
  const strongDynastyTags = DYNASTY_ORDER.filter(tag => person.strongDynastyTags.has(tag));
  const acceptedRiskyDynastyTags = DYNASTY_ORDER.filter(tag => person.acceptedRiskyDynastyTags.has(tag));
  const crossDynastyBasis = dynastyTags.length <= 1
    ? 'single'
    : strongDynastyTags.length > 1
      ? 'explicit'
      : 'supported-transition';
  return {
    personId: person.personId,
    dynastyTags,
    historicalAffiliations,
    rawPolities,
    readerZi: person.readerZi,
    readerZiSource: person.readerZiSource,
    affiliationStatus,
    unresolvedReason,
    dynastyResolution: {
      strongDynastyTags,
      acceptedRiskyDynastyTags,
      crossDynastyBasis,
      reviewConflictCount: person.dynastyTagConflicts.length,
    },
    readerTagConflicts: person.dynastyTagConflicts,
    sourceRefs,
  };
}).sort((a, b) => a.personId.localeCompare(b.personId));

const tagCounts = Object.fromEntries(DYNASTY_ORDER.map(tag => [tag, records.filter(item => item.dynastyTags.includes(tag)).length]));
const summary = {
  people: records.length,
  resolved: records.filter(item => item.affiliationStatus === 'resolved').length,
  historicalOnly: records.filter(item => item.affiliationStatus === 'historical-only').length,
  unresolved: records.filter(item => item.affiliationStatus === 'unresolved').length,
  readerZi: records.filter(item => item.readerZi).length,
  rawPolityValues: new Set(records.flatMap(item => item.rawPolities)).size,
  polityEvidence: polityEvidenceCount,
  dynastyEvidence: dynastyEvidenceCount,
  peeragePeriodEvidence: peeragePeriodEvidenceCount,
  eraRosterUnresolved: eraRosterUnresolved.length,
  readerTagConflicts: records.reduce((sum, item) => sum + item.readerTagConflicts.length, 0),
  peopleWithReaderTagConflicts: records.filter(item => item.readerTagConflicts.length).length,
  tagCounts,
};
const payload = {
  schemaVersion: 'V62',
  modelId: 'sgz-v62-people-offices',
  generatedAt: '2026-08-29',
  dynastyOrder: DYNASTY_ORDER,
  policy: {
    sourceBoundary: '只从稳定 personId 及规范源显式政权字段派生；不以姓名、姓氏或模糊年代猜测归属。',
    mainTags: '读者主标签只允许后汉、魏、季汉、吴、西晋，并按固定王朝顺序输出。',
    affiliations: '集团、地域势力与部族保留为 historicalAffiliations；原始归属文字完整保存在 rawPolities。',
    zi: 'readerZi 仅采用 V55 已按 personId 定位且置信度为确定的表字；附件表字不自动升级。',
    v60Han: 'V60 附件以东汉单列后汉人物，其余原值汉属于季汉数据块；该规则仅适用于固定哈希的 V60 工作簿。',
    snapshotJin: '260 年附件中的晋含西晋、东晋及范围外人物，不自动映射为西晋，保留审校。',
    riskyIdentityMerge: '260 年快照和曹魏封爵表的同名 personId 映射仅作候选证据；与已核实王朝标签冲突时，原记录进入 reviewQueue，冲突标签不进入读者态。',
  },
  upstream: {
    v60WorkbookSha256: v60.workbook?.sha256 || '',
    snapshot260Sha256: v61.workbooks?.snapshot260?.sha256 || '',
    peerageSha256: v61.workbooks?.peerage?.sha256 || '',
    ziSchemaVersion: window.SGZ_PERSON_ZI_AUDIT?.schemaVersion || '',
  },
  officeDisplayOverrides: [
    {
      recordId: 'fz_shu_jiangwei_258',
      rawTitle: '大将军（复拜）',
      displayTitle: '大将军',
      annotationField: 'appointmentStatus',
      annotationValue: '复授',
    },
  ],
  summary,
  people: records,
  reviewQueue: records
    .filter(item => item.affiliationStatus !== 'resolved' || item.readerTagConflicts.length)
    .map(item => ({
      personId: item.personId,
      queueType: item.readerTagConflicts.length ? 'dynasty-tag-conflict' : 'dynasty-unresolved',
      affiliationStatus: item.affiliationStatus,
      rawPolities: item.rawPolities,
      historicalAffiliations: item.historicalAffiliations,
      reason: item.unresolvedReason,
      readerTagConflicts: item.readerTagConflicts,
    })),
  eraRosterUnresolved,
};

const jsonPath = path.join(dataDir, 'v62-people-offices.json');
const jsPath = path.join(dataDir, 'v62-people-offices.js');
fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
fs.writeFileSync(jsPath, `(function(global){\n  'use strict';\n  const payload=${JSON.stringify(payload)};\n  const people=Object.freeze(payload.people.map(item=>Object.freeze(item)));\n  const byPersonId=Object.freeze(Object.fromEntries(people.map(item=>[item.personId,item])));\n  global.SGZ_V62_PEOPLE_OFFICES=Object.freeze({...payload,people,byPersonId});\n})(window);\n`, 'utf8');

console.log(JSON.stringify({ jsonPath, jsPath, summary }, null, 2));
