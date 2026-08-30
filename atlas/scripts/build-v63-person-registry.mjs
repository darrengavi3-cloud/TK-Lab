#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const dataDir = path.join(root, 'data');
const readJson = name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
const text = value => String(value == null ? '' : value).trim();
const cleanCandidate = value => /^(?:|—|[-－]|待考|未详|不详|未载|缺载)$/.test(text(value)) ? '' : text(value);
const statusValues = new Set(['verified', 'review-only', 'suppressed']);

const v60 = readJson('v60-person-workbook-import.json');
const v61 = readJson('v61-person-supplements.json');
const sourceIndex = readJson('person-source-index.json');
const v62 = readJson('v62-people-offices.json');
const portraits = readJson('portrait-manifest.json');

const context = { window: {} };
context.window.window = context.window;
vm.createContext(context);
for (const name of ['person-name-normalization.js', 'person-identities.js', 'person-biographies.js']) {
  vm.runInContext(fs.readFileSync(path.join(dataDir, name), 'utf8'), context, { filename: `data/${name}` });
}
const normalization = context.window.SGZ_PERSON_NAME_NORMALIZATION;
const identityApi = context.window.SGZ_PERSON_IDENTITIES;
const biographies = context.window.SGZ_PERSON_BIOGRAPHIES || {};
const normalize = value => text(normalization?.toSimplified?.(text(value)) || value).replace(/\s+/g, '');

// 当前数据实际有 13 组 person:source/person:jin 重复；其中 4 组旧身份表已登记，V63 补齐余下 9 组。
const addedJinLegacyMappings = Object.freeze({
  'person:source:39b648a0de5f': 'person:jin:he-zeng',
  'person:source:6b39a55f3d4a': 'person:jin:shi-bao',
  'person:source:ddfd92e807eb': 'person:jin:li-xi',
  'person:source:45e1c2cbae81': 'person:jin:pei-xiu',
  'person:source:37c04d0369b5': 'person:jin:yang-hu',
  'person:source:db972a495cb3': 'person:jin:chen-qian',
  'person:source:4b67da7624a1': 'person:jin:li-yin',
  'person:source:d63328bf31f7': 'person:jin:wei-guan',
  'person:source:a5ff5c1362bd': 'person:jin:wang-xiang',
});
const protectedExistingPeople = Object.freeze({
  '李憙': 'person:jin:li-xi', '石鉴': 'person:jin:shi-jian', '胡烈': 'person:jin:hu-lie', '鲁芝': 'person:jin:lu-zhi',
  '袁邵': 'person:jin:yuan-shao', '石苞': 'person:jin:shi-bao', '卫瓘': 'person:jin:wei-guan', '羊祜': 'person:jin:yang-hu',
  '杜预': 'person:source:b948df238097', '刘琨': 'person:source:beb0020a5f82',
});

const legacyToCanonical = {};
for (const [legacyId, canonicalId] of Object.entries(identityApi.legacyPersonIdMap || {})) legacyToCanonical[legacyId] = canonicalId;
for (const identity of identityApi.identities || []) {
  for (const legacyId of identity.legacyPersonIds || []) legacyToCanonical[legacyId] = identity.personId;
}
Object.assign(legacyToCanonical, addedJinLegacyMappings, portraits.legacyPersonIdAliases || {});

function canonicalPersonId(personId) {
  let current = text(personId);
  const seen = new Set();
  while (legacyToCanonical[current] && !seen.has(current)) {
    seen.add(current);
    current = legacyToCanonical[current];
  }
  if (seen.has(current)) throw new Error(`V63 人物 ID 别名存在环：${[...seen, current].join(' -> ')}`);
  return current;
}
for (const key of Object.keys(legacyToCanonical)) legacyToCanonical[key] = canonicalPersonId(key);

function snapshotSourceRows(rows) {
  const occurrences = new Map();
  return rows.map(row => {
    const digest = hash(JSON.stringify([
      text(row.rawName || row.name), cleanCandidate(row.zi), cleanCandidate(row.polityRaw || row.polity),
      cleanCandidate(row.birthplace), cleanCandidate(row.residence), cleanCandidate(row.office), cleanCandidate(row.family),
    ]));
    const occurrence = (occurrences.get(digest) || 0) + 1;
    occurrences.set(digest, occurrence);
    return { row, sourceRecordId: `source:v61:snapshot260:${digest}${occurrence > 1 ? `:${occurrence}` : ''}` };
  });
}
const snapshotRows = snapshotSourceRows(v61.snapshots260 || []);
const v60ByLegacyId = new Map();
for (const row of v60.people || []) {
  const records = v60ByLegacyId.get(row.personId) || [];
  records.push(row);
  v60ByLegacyId.set(row.personId, records);
}
const v60ZiByLegacyId = new Map([...v60ByLegacyId].map(([personId, rows]) => [
  personId,
  [...new Set(rows.map(row => normalize(cleanCandidate(row.zi))).filter(Boolean))],
]));

const sourceRecordToCanonical = {};
for (const row of v60.people || []) {
  const sourceRecordId = row.sourceRecordId || `source:v60:person:${String(row.ordinal).padStart(4, '0')}`;
  sourceRecordToCanonical[sourceRecordId] = canonicalPersonId(row.canonicalPersonId || row.personId);
}

const forcedSnapshotIsolation = new Map([
  ['snapshot260:eb2197b97c47ac03', 'person:snapshot260:eb2197b97c47ac03'], // 孙登候选
  ['snapshot260:233ae7b50e194cc2', 'person:snapshot260:233ae7b50e194cc2'], // 刘弘候选
  ['snapshot260:aca96ed43706ca1c', 'person:snapshot260:aca96ed43706ca1c'], // 王嗣吴系空表字候选
  ['snapshot260:552a1609e42505e8', 'person:snapshot260:552a1609e42505e8'], // 王嗣承宗候选
]);
const ziConflicts = [];
const conflictPrimaryIds = new Set();
const isolatedSourceRecordIds = new Set();
for (const { row, sourceRecordId } of snapshotRows) {
  // V61 重建后 personId 可能已是隔离 ID；冲突检查必须回到重建前的身份候选。
  const legacyPersonId = text(row.conflictWithPersonId || row.sourceIdentityPersonId || row.personId);
  const v60Zis = v60ZiByLegacyId.get(legacyPersonId) || [];
  const snapshotZi = normalize(cleanCandidate(row.zi));
  const differs = snapshotZi && v60Zis.length && !v60Zis.includes(snapshotZi);
  const forcedId = forcedSnapshotIsolation.get(row.snapshotId);
  if (differs) {
    const primaryId = canonicalPersonId(legacyPersonId);
    // 若旧产物已给该来源分配独立 ID，将其视为已发布身份并继续冻结；
    // 不因 V63 重建算法改变人物、履历或立绘引用。
    const existingPersonId = canonicalPersonId(row.canonicalPersonId || row.personId);
    const frozenIsolatedId = existingPersonId && existingPersonId !== primaryId ? existingPersonId : '';
    const isolatedPersonId = forcedId || frozenIsolatedId || `person:snapshot260:${String(row.snapshotId || '').replace(/^snapshot260:/, '') || hash(sourceRecordId)}`;
    sourceRecordToCanonical[sourceRecordId] = isolatedPersonId;
    isolatedSourceRecordIds.add(sourceRecordId);
    conflictPrimaryIds.add(primaryId);
    ziConflicts.push({
      conflictId: `v63:zi-conflict:${hash(`${legacyPersonId}|${sourceRecordId}`)}`,
      personId: primaryId,
      name: text(row.name || row.rawName),
      legacyPersonId,
      v60Candidates: v60ByLegacyId.get(legacyPersonId)?.map(item => ({
        sourceRecordId: item.sourceRecordId || `source:v60:person:${String(item.ordinal).padStart(4, '0')}`,
        value: cleanCandidate(item.zi),
        workbookRow: item.workbookSource?.row || null,
      })) || [],
      snapshotCandidate: { sourceRecordId, snapshotId: row.snapshotId, value: cleanCandidate(row.zi), workbookRow: row.workbookSource?.row || null },
      isolatedPersonId,
      searchState: 'completed',
      historicalDisposition: '存疑',
      publicationStatus: 'review-only',
      reason: '同一旧 personId 下的非空表字候选不一致；V63 按来源记录隔离，未经原典核验不得合并。',
    });
  } else if (forcedId) {
    sourceRecordToCanonical[sourceRecordId] = forcedId;
    isolatedSourceRecordIds.add(sourceRecordId);
    conflictPrimaryIds.add(canonicalPersonId(legacyPersonId));
  } else {
    const canonicalId = canonicalPersonId(row.canonicalPersonId || legacyPersonId);
    // 空姓名、非人物标题及复合歧义行仍留在审校台账，但不建立空的人物映射。
    if (canonicalId) sourceRecordToCanonical[sourceRecordId] = canonicalId;
  }
}

// 在汇总 V62 覆盖层和立绘前先登记已知兼容 ID，避免后续产物
// 使用新 sourceRecordId 候选 ID 时被误建为第二个人物。
function registerLegacyId(legacyId, personId) {
  const legacy = text(legacyId);
  const canonicalId = canonicalPersonId(personId);
  if (!legacy || !canonicalId || legacy === canonicalId) return;
  const existing = legacyToCanonical[legacy] && canonicalPersonId(legacy);
  if (existing && existing !== canonicalId) throw new Error(`V63 旧 ID 出现多目标：${legacy} -> ${existing} / ${canonicalId}`);
  legacyToCanonical[legacy] = canonicalId;
}
for (const row of v60.people || []) {
  const sourceRecordId = row.sourceRecordId || `source:v60:person:${String(row.ordinal).padStart(4, '0')}`;
  for (const legacyId of row.legacyPersonIds || []) registerLegacyId(legacyId, sourceRecordToCanonical[sourceRecordId]);
}
for (const person of v61.people || []) {
  const canonicalId = canonicalPersonId(person.canonicalPersonId || person.personId);
  for (const legacyId of person.legacyPersonIds || []) registerLegacyId(legacyId, canonicalId);
}
for (const { row, sourceRecordId } of snapshotRows) {
  for (const legacyId of row.legacyPersonIds || []) {
    const sourceIdentity = text(row.sourceIdentityPersonId);
    const isolatedTarget = text(sourceRecordToCanonical[sourceRecordId]);
    if (!row.conflictWithPersonId && legacyId === sourceIdentity && isolatedTarget && isolatedTarget !== canonicalPersonId(sourceIdentity)) continue;
    registerLegacyId(legacyId, isolatedTarget);
  }
}
for (const key of Object.keys(legacyToCanonical)) legacyToCanonical[key] = canonicalPersonId(key);

const entries = new Map();
function ensure(personId, name = '') {
  const canonicalId = canonicalPersonId(personId);
  if (!canonicalId) return null;
  if (!entries.has(canonicalId)) entries.set(canonicalId, {
    personId: canonicalId, name: text(name), aliases: new Set(), legacyPersonIds: new Set(), sourceRecordIds: new Set(),
    datasets: new Set(), readerDatasets: new Set(), identityStatus: 'review-only', fieldCandidates: {}, appointmentIds: new Set(), peerageEventIds: new Set(), portraitIds: new Set(),
  });
  const entry = entries.get(canonicalId);
  if (!entry.name && name) entry.name = text(name);
  if (personId && personId !== canonicalId) entry.legacyPersonIds.add(personId);
  return entry;
}
function addCandidate(entry, field, value, publicationStatus, sourceRecordId = '', historicalDisposition = '存疑') {
  const cleaned = Array.isArray(value) ? value.filter(Boolean) : cleanCandidate(value);
  if (!entry || (Array.isArray(cleaned) ? !cleaned.length : !cleaned)) return;
  if (!entry.fieldCandidates[field]) entry.fieldCandidates[field] = [];
  const signature = JSON.stringify(cleaned);
  if (!entry.fieldCandidates[field].some(item => JSON.stringify(item.value) === signature && item.sourceRecordId === sourceRecordId)) {
    entry.fieldCandidates[field].push({ value: cleaned, publicationStatus, historicalDisposition, sourceRecordId });
  }
}

for (const identity of identityApi.identities || []) {
  const entry = ensure(identity.personId, identity.name);
  entry.identityStatus = 'resolved';
  entry.datasets.add('curated-identities');
  for (const alias of identity.aliases || []) entry.aliases.add(alias);
  for (const legacyId of identity.legacyPersonIds || []) entry.legacyPersonIds.add(legacyId);
  addCandidate(entry, 'aliases', [...(identity.aliases || [])], 'verified', `identity:${identity.personId}`, '确定');
}

for (const person of sourceIndex.people || []) {
  const canonicalId = canonicalPersonId(person.personId);
  const entry = ensure(canonicalId, person.name);
  entry.datasets.add('activity-source');
  for (const alias of person.aliases || []) entry.aliases.add(alias);
  for (const sourceId of person.sourceIds || []) entry.sourceRecordIds.add(sourceId);
  if (/\u5df2按显式身份|\u5df2核|\u5df2消歧/.test(text(person.homonymStatus)) || (identityApi.identities || []).some(item => item.personId === canonicalId)) entry.identityStatus = 'resolved';
}
for (const appointment of sourceIndex.appointments || []) {
  const entry = ensure(canonicalPersonId(appointment.personId), appointment.name);
  entry.datasets.add('appointments');
  entry.appointmentIds.add(appointment.id);
  entry.sourceRecordIds.add(appointment.id);
}

for (const row of v60.people || []) {
  const sourceRecordId = row.sourceRecordId || `source:v60:person:${String(row.ordinal).padStart(4, '0')}`;
  const entry = ensure(sourceRecordToCanonical[sourceRecordId], row.name);
  entry.datasets.add('v60-workbook');
  entry.readerDatasets.add('v60');
  entry.sourceRecordIds.add(sourceRecordId);
  if (row.personId !== entry.personId) entry.legacyPersonIds.add(row.personId);
  for (const legacyId of row.legacyPersonIds || []) if (legacyId !== entry.personId) entry.legacyPersonIds.add(legacyId);
  addCandidate(entry, 'zi', row.zi, 'review-only', sourceRecordId);
  addCandidate(entry, 'birthplace', row.birthplace, 'review-only', sourceRecordId);
  addCandidate(entry, 'birthYear', row.birthYear, 'review-only', sourceRecordId);
  addCandidate(entry, 'deathYear', row.deathYear, 'review-only', sourceRecordId);
  addCandidate(entry, 'dynastyTags', row.polity ? [row.polity] : [], 'review-only', sourceRecordId);
}

for (const person of v61.people || []) {
  const canonicalId = canonicalPersonId(person.canonicalPersonId || person.personId);
  const entry = ensure(canonicalId, person.name);
  entry.datasets.add('v61-supplement');
  for (const alias of person.aliases || []) entry.aliases.add(alias);
  for (const sourceRecordId of person.sourceRecordIds || []) entry.sourceRecordIds.add(sourceRecordId);
  if (person.personId && person.personId !== entry.personId) entry.legacyPersonIds.add(person.personId);
  for (const legacyId of person.legacyPersonIds || []) if (legacyId !== entry.personId) entry.legacyPersonIds.add(legacyId);
  addCandidate(entry, 'zi', person.zi, 'review-only', person.sourceRecordIds?.[0] || `v61-person:${person.personId}`);
  addCandidate(entry, 'birthplace', person.birthplace, 'review-only', person.sourceRecordIds?.[0] || `v61-person:${person.personId}`);
  addCandidate(entry, 'dynastyTags', person.politics || [], 'review-only', person.sourceRecordIds?.[0] || `v61-person:${person.personId}`);
}

for (const { row, sourceRecordId } of snapshotRows) {
  const entry = ensure(sourceRecordToCanonical[sourceRecordId], row.name || row.rawName);
  if (!entry) continue;
  entry.datasets.add('snapshot260');
  if (row.readerVisible === true) entry.readerDatasets.add('snapshot260');
  entry.sourceRecordIds.add(sourceRecordId);
  const sourceIdentityPersonId = text(row.conflictWithPersonId || row.sourceIdentityPersonId || row.personId);
  const primaryForLegacyId = canonicalPersonId(sourceIdentityPersonId);
  if (row.personId && row.personId !== entry.personId && primaryForLegacyId === entry.personId) entry.legacyPersonIds.add(row.personId);
  for (const legacyId of row.legacyPersonIds || []) if (legacyId !== entry.personId && canonicalPersonId(legacyId) === entry.personId) entry.legacyPersonIds.add(legacyId);
  addCandidate(entry, 'zi', row.zi, 'review-only', sourceRecordId);
  addCandidate(entry, 'birthplace', row.birthplace, 'review-only', sourceRecordId);
  addCandidate(entry, 'dynastyTags', row.polity ? [row.polity] : [], 'review-only', sourceRecordId);
}

for (const event of v61.peerageEvents || []) {
  if (!event.readerVisible || event.disposition !== '采用') continue;
  for (const legacyId of event.recipientPersonIds || []) {
    const entry = ensure(canonicalPersonId(legacyId), '');
    entry.datasets.add('peerage');
    entry.readerDatasets.add('peerage');
    entry.peerageEventIds.add(event.eventId);
    if (legacyId !== entry.personId) entry.legacyPersonIds.add(legacyId);
  }
}

for (const row of v62.people || []) {
  const entry = ensure(canonicalPersonId(row.personId), '');
  entry.datasets.add('v62-people');
  const safe = row.affiliationStatus === 'resolved' && !(row.readerTagConflicts || []).length;
  addCandidate(entry, 'dynastyTags', row.dynastyTags || [], safe ? 'verified' : 'review-only', `v62:${row.personId}`, safe ? '确定' : '存疑');
  addCandidate(entry, 'historicalAffiliations', row.historicalAffiliations || [], safe ? 'verified' : 'review-only', `v62:${row.personId}`, safe ? '确定' : '存疑');
  if (row.readerZi && row.readerZiSource?.confidence === '确定') addCandidate(entry, 'zi', row.readerZi, 'verified', `v62-zi:${row.personId}`, '确定');
}

for (const [name, biography] of Object.entries(biographies)) {
  const matches = [...entries.values()].filter(entry => normalize(entry.name) === normalize(name));
  const entry = matches.find(item => item.datasets.has('curated-identities')) || matches.find(item => item.datasets.has('v60-workbook')) || matches[0];
  if (!entry) continue;
  entry.datasets.add('biographies');
  addCandidate(entry, 'zi', biography.zi, 'verified', `biography:${normalize(name)}`, '确定');
  addCandidate(entry, 'birthplace', biography.birthplace, 'verified', `biography:${normalize(name)}`, '确定');
  addCandidate(entry, 'birthYear', biography.birthYear, 'verified', `biography:${normalize(name)}`, '确定');
  addCandidate(entry, 'deathYear', biography.deathYear, 'verified', `biography:${normalize(name)}`, '确定');
  addCandidate(entry, 'bio', biography.bio, 'verified', `biography:${normalize(name)}`, '确定');
}

const portraitResolutions = [];
for (const asset of Object.values(portraits.assetsById || {})) {
  const legacyPersonId = text(asset.personId);
  const canonicalId = canonicalPersonId(legacyPersonId);
  const entry = ensure(canonicalId, asset.name);
  entry.datasets.add('portraits');
  entry.portraitIds.add(asset.portraitId);
  if (legacyPersonId !== canonicalId) entry.legacyPersonIds.add(legacyPersonId);
  portraitResolutions.push({ portraitId: asset.portraitId, legacyPersonId, personId: canonicalId });
}

for (const conflict of ziConflicts) {
  const primary = ensure(conflict.personId, conflict.name);
  primary.identityStatus = 'conflict';
  const isolated = ensure(conflict.isolatedPersonId, conflict.name);
  isolated.identityStatus = 'conflict';
}

const fields = ['name', 'aliases', 'zi', 'birthplace', 'birthYear', 'deathYear', 'bio', 'dynastyTags', 'historicalAffiliations', 'appointments', 'peerage', 'portraits'];
function chooseField(entry, field) {
  if (field === 'name') return { status: entry.name ? 'verified' : 'suppressed', value: entry.name || undefined };
  if (field === 'aliases') return { status: entry.aliases.size ? 'verified' : 'suppressed', value: [...entry.aliases].sort((a, b) => a.localeCompare(b, 'zh-CN')) };
  if (field === 'appointments') {
    const status = entry.appointmentIds.size ? (entry.identityStatus === 'resolved' ? 'verified' : 'review-only') : 'suppressed';
    return { status, value: [...entry.appointmentIds].sort() };
  }
  if (field === 'peerage') return { status: entry.peerageEventIds.size ? (entry.identityStatus === 'conflict' ? 'review-only' : 'verified') : 'suppressed', value: [...entry.peerageEventIds].sort() };
  if (field === 'portraits') return { status: entry.portraitIds.size ? 'verified' : 'suppressed', value: [...entry.portraitIds].sort() };
  const candidates = entry.fieldCandidates[field] || [];
  const verified = candidates.filter(item => item.publicationStatus === 'verified');
  const normalizedValues = new Set(verified.map(item => JSON.stringify(item.value)));
  if (entry.identityStatus !== 'conflict' && verified.length && normalizedValues.size === 1) return { status: 'verified', value: verified[0].value };
  if (candidates.length) return { status: 'review-only', value: undefined };
  return { status: 'suppressed', value: undefined };
}

const people = [...entries.values()].map(entry => {
  if (conflictPrimaryIds.has(entry.personId)) entry.identityStatus = 'conflict';
  const publicationStatus = {};
  const values = {};
  for (const field of fields) {
    const selected = chooseField(entry, field);
    publicationStatus[field] = selected.status;
    if (selected.value !== undefined && selected.status === 'verified') values[field] = selected.value;
  }
  return {
    personId: entry.personId,
    name: entry.name,
    aliases: [...entry.aliases].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    legacyPersonIds: [...entry.legacyPersonIds].filter(id => id !== entry.personId).sort(),
    sourceRecordIds: [...entry.sourceRecordIds].sort(),
    datasets: [...entry.datasets].sort(),
    readerDatasets: [...entry.readerDatasets].sort(),
    identityStatus: entry.identityStatus,
    publicationStatus,
    values,
    reviewCandidates: Object.fromEntries(Object.entries(entry.fieldCandidates).map(([field, candidates]) => [field, candidates])),
  };
}).sort((a, b) => a.personId.localeCompare(b.personId));

const byPersonId = Object.fromEntries(people.map(person => [person.personId, person]));
const publicationByPersonId = Object.fromEntries(people.map(person => [person.personId, person.publicationStatus]));
for (const person of people) for (const legacyId of person.legacyPersonIds) {
  const existing = legacyToCanonical[legacyId];
  if (existing && existing !== person.personId) throw new Error(`V63 旧 ID 出现多目标：${legacyId} -> ${existing} / ${person.personId}`);
  legacyToCanonical[legacyId] = person.personId;
}
for (const key of Object.keys(legacyToCanonical)) legacyToCanonical[key] = canonicalPersonId(key);

const readerPeople = people.filter(person => person.publicationStatus.name === 'verified').map(person => {
  const output = { personId: person.personId, name: person.name };
  const valueKeys = { aliases: 'aliases', zi: 'zi', birthplace: 'birthplace', birthYear: 'birthYear', deathYear: 'deathYear', bio: 'bio', dynastyTags: 'dynastyTags', historicalAffiliations: 'historicalAffiliations', appointments: 'appointmentIds', peerage: 'peerageEventIds', portraits: 'portraitIds' };
  for (const [statusKey, valueKey] of Object.entries(valueKeys)) {
    if (person.publicationStatus[statusKey] === 'verified' && person.values[statusKey] !== undefined) output[valueKey] = person.values[statusKey];
  }
  return output;
});

const protectedResolution = Object.entries(protectedExistingPeople).map(([name, personId]) => ({ name, personId: canonicalPersonId(personId), resolved: Boolean(byPersonId[canonicalPersonId(personId)]) }));
const summary = {
  people: people.length,
  readerPeople: readerPeople.length,
  legacyMappings: Object.keys(legacyToCanonical).length,
  sourceRecordMappings: Object.keys(sourceRecordToCanonical).length,
  ziConflicts: ziConflicts.length,
  isolatedSnapshotRecords: isolatedSourceRecordIds.size,
  addedJinLegacyMappings: Object.keys(addedJinLegacyMappings).length,
  protectedExistingPeople: protectedResolution.filter(item => item.resolved).length,
  portraitAssets: portraitResolutions.length,
  portraitPersonIds: new Set(portraitResolutions.map(item => item.personId)).size,
  unresolvedPortraits: portraitResolutions.filter(item => !byPersonId[item.personId]).length,
  verifiedFieldCounts: Object.fromEntries(fields.map(field => [field, people.filter(person => person.publicationStatus[field] === 'verified').length])),
};

const registry = {
  schemaVersion: 'V63',
  modelId: 'sgz-v63-person-registry',
  policy: {
    canonicalId: '现有 personId 一经登记即冻结；来源表重排只改审校行号，不改正式人物 ID。',
    sourceRecordId: 'V60 使用附件序号，260 年快照使用语义内容哈希；不使用 Excel 行号生成正式 personId。',
    publication: '只有 verified 字段进入读者投影；review-only 与 suppressed 只保留在审校数据。',
    conflict: '表字、政权或其他身份信号冲突时按 sourceRecordId 隔离，禁止以唯一姓名自动合并。',
  },
  summary,
  people,
  byPersonId,
  legacyToCanonical: Object.fromEntries(Object.entries(legacyToCanonical).sort(([a], [b]) => a.localeCompare(b))),
  sourceRecordToCanonical: Object.fromEntries(Object.entries(sourceRecordToCanonical).sort(([a], [b]) => a.localeCompare(b))),
  publicationByPersonId,
  conflicts: ziConflicts,
  identityMigrations: Object.entries(addedJinLegacyMappings).map(([legacyPersonId, personId]) => ({ legacyPersonId, personId, status: 'resolved', reason: '同名 person:source/person:jin 双实体已核对为同一既有晋人身份' })),
  protectedExistingPeople: protectedResolution,
  portraitResolutions,
};
const reader = {
  schemaVersion: 'V63',
  modelId: 'sgz-v63-reader-people',
  summary: { people: readerPeople.length, legacyMappings: Object.keys(legacyToCanonical).length, portraitAssets: portraitResolutions.length },
  people: readerPeople,
  legacyIdMap: registry.legacyToCanonical,
  portraitResolutions,
};

const write = (name, payload, globalName) => {
  fs.writeFileSync(path.join(dataDir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, `${name}.js`), `/* Generated by scripts/build-v63-person-registry.mjs. */\n(function(global){\n  'use strict';\n  global.${globalName}=Object.freeze(${JSON.stringify(payload)});\n})(typeof window!=='undefined'?window:globalThis);\n`);
};
write('v63-person-registry', registry, 'SGZ_V63_PERSON_REGISTRY');
write('v63-reader-people', reader, 'SGZ_V63_READER_PEOPLE');
console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
