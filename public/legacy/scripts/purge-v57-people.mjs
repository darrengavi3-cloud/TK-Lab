import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(decodeURIComponent(new URL('..', import.meta.url).pathname));
const dataDir = path.join(root, 'data');
const dryRun = process.argv.includes('--dry-run');

function loadGlobal(file) {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dataDir, file), 'utf8'), context, { timeout: 10000, filename: file });
  return Object.fromEntries(Object.entries(context).filter(([key]) => key.startsWith('SGZ_')));
}

function writeJson(file, value) {
  if (!dryRun) fs.writeFileSync(path.join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`);
}

function writeJs(file, globalName, value) {
  if (!dryRun) fs.writeFileSync(path.join(dataDir, file), `(function(global){\n  'use strict';\n  global.${globalName}=Object.freeze(${JSON.stringify(value)});\n})(window);\n`);
}

const { SGZ_PERSON_SOURCE_INDEX: source } = loadGlobal('person-source-index.js');
const { SGZ_PERSON_ENTITY_AUDIT: oldAudit } = loadGlobal('person-entity-audit.js');
const { SGZ_PERSON_V57_RUNTIME_RULES: rules } = loadGlobal('person-v57-runtime-rules.js');

const aliasesToRemove = new Set([
  ...rules.blockedNames,
  ...Object.keys(oldAudit.exclusions || {}),
]);
const normalizeMap = Object.fromEntries([
  ...Object.entries(oldAudit.normalizeMap || {}).map(([rawName, value]) => [rawName, value && typeof value === 'object' ? value.canonicalName : value]),
  ...Object.entries(rules.normalizeMap || {}),
]);
const outsideScope = new Set(['曹鼎']);
const correctedCanonicalNames = new Set(Object.values(normalizeMap));
const canonicalIdByName = new Map();

for (const person of source.people || []) {
  if (person.entityType === 'person' && person.visibilityStatus === 'visible' && person.name && !aliasesToRemove.has(person.name)) {
    canonicalIdByName.set(person.name, person.personId);
  }
}

function canonicalName(raw) {
  const name = String(raw || '').trim();
  return normalizeMap[name] || name;
}

function isBlockedRecord(record, nameField = 'name') {
  const names = [record?.[nameField], record?.rawName, ...(Array.isArray(record?.aliases) ? record.aliases : [])]
    .map(value => String(value || '').trim()).filter(Boolean);
  const normalized = names.map(canonicalName);
  if (normalized.some(name => outsideScope.has(name))) return true;
  if (normalized.some(name => aliasesToRemove.has(name))) return true;
  return names.some(name => aliasesToRemove.has(name));
}

const before = {
  people: source.people.length,
  appointments: source.appointments.length,
  excludedPeople: source.people.filter(row => row.visibilityStatus !== 'visible' || row.entityType !== 'person').length,
};

const people = [];
const seenPeople = new Set();
for (const original of source.people || []) {
  const row = { ...original, aliases: Array.isArray(original.aliases) ? [...original.aliases] : [] };
  const normalized = canonicalName(row.name);
  const wasCorrection = normalized !== row.name;
  if (outsideScope.has(normalized)) continue;
  if (wasCorrection) {
    row.name = normalized;
    row.aliases = row.aliases.filter(alias => !aliasesToRemove.has(alias));
    row.personId = canonicalIdByName.get(normalized) || row.personId;
    row.entityType = 'person';
    row.visibilityStatus = 'visible';
    row.includeInDefault = original.includeInDefault === true;
    row.normalizationStatus = 'V57规范化';
    row.homonymStatus = '已按稳定 ID 区分';
  }
  const correctedRow = correctedCanonicalNames.has(row.name) && row.normalizationReason;
  if (correctedRow) {
    row.entityType = 'person';
    row.visibilityStatus = 'visible';
    row.includeInDefault = original.includeInDefault === true;
    row.normalizationStatus = 'V57规范化';
  }
  if (!correctedRow && isBlockedRecord(row)) continue;
  if (row.entityType !== 'person' || row.visibilityStatus !== 'visible') continue;
  if (seenPeople.has(row.personId)) continue;
  seenPeople.add(row.personId);
  people.push(row);
}

const appointments = [];
const seenAppointments = new Set();
for (const original of source.appointments || []) {
  const row = { ...original, aliases: Array.isArray(original.aliases) ? [...original.aliases] : [] };
  const normalized = canonicalName(row.name || row.rawName);
  if (outsideScope.has(normalized)) continue;
  if (aliasesToRemove.has(row.name) || aliasesToRemove.has(row.rawName)) {
    if (!normalizeMap[row.name] && !normalizeMap[row.rawName]) continue;
  }
  if (normalizeMap[row.name] || normalizeMap[row.rawName]) {
    row.name = normalized;
    row.rawName = normalized;
    row.personId = canonicalIdByName.get(normalized) || row.personId;
    row.aliases = row.aliases.filter(alias => !aliasesToRemove.has(alias));
    row.entityType = 'person';
    row.visibilityStatus = 'visible';
    row.includeInDefault = original.includeInDefault === true;
    row.normalizationStatus = 'V57规范化';
    row.homonymStatus = '已按稳定 ID 区分';
  }
  const correctedRow = correctedCanonicalNames.has(row.name) && row.normalizationReason;
  if (correctedRow) {
    row.entityType = 'person';
    row.visibilityStatus = 'visible';
    row.includeInDefault = original.includeInDefault === true;
    row.normalizationStatus = 'V57规范化';
  }
  if (!correctedRow && isBlockedRecord(row)) continue;
  if (row.entityType !== 'person' || row.visibilityStatus !== 'visible') continue;
  if (seenAppointments.has(row.id)) continue;
  seenAppointments.add(row.id);
  appointments.push(row);
}

const defaultPeople = people.filter(row => row.includeInDefault !== false);
const defaultAppointments = appointments.filter(row => row.includeInDefault !== false);
const next = {
  ...source,
  schemaVersion: 11,
  modelId: 'sgz-person-source-index-v57',
  generatedAt: new Date().toISOString(),
  policy: `${source.policy || ''} V57：读者可见人物实体逐条净化；非人物、排除项和无法建立实体关系的 OCR 残片不进入活动索引；纠正项保留稳定 ID 与原始出处。`,
  people,
  appointments,
  summary: {
    ...(source.summary || {}),
    people: people.length,
    appointments: appointments.length,
    defaultPeople: defaultPeople.length,
    defaultAppointments: defaultAppointments.length,
    v57RemovedPeople: before.people - people.length,
    v57RemovedAppointments: before.appointments - appointments.length,
  },
  entityAudit: {
    schemaVersion: 'V57',
    policy: '活动人物索引只保留可建立史料实体关系的读者可见人物；误识别项已从活动源移除。',
    removedPeople: before.people - people.length,
    removedAppointments: before.appointments - appointments.length,
    correctedNames: Object.keys(normalizeMap),
    remainingReviewRecords: 0,
  },
};

const audit = {
  schemaVersion: 'V57',
  policy: 'V57 活动数据净化记录；误识别项已物理移出活动索引，纠正映射仅作为构建审计，不作为读者可见人物实体。',
  normalizeMap: Object.fromEntries(Object.entries(normalizeMap).map(([rawName, canonicalName]) => [rawName, { canonicalName, status: '已写入规范人物记录' }])),
  exclusions: {},
  reviewNames: [],
  summary: {
    removedPeople: before.people - people.length,
    removedAppointments: before.appointments - appointments.length,
    correctedNames: Object.keys(normalizeMap).length,
    remainingReviewRecords: 0,
  },
};

const coverage = JSON.parse(fs.readFileSync(path.join(dataDir, 'person-volume-coverage.json'), 'utf8'));
coverage.schemaVersion = 11;
coverage.modelId = 'sgz-person-source-index-v57';
coverage.generatedAt = next.generatedAt;
coverage.summary = { ...coverage.summary, people: people.length, appointments: appointments.length, defaultPeople: defaultPeople.length, defaultAppointments: defaultAppointments.length };
coverage.v57 = { removedPeople: before.people - people.length, removedAppointments: before.appointments - appointments.length, correctedNames: Object.keys(normalizeMap) };

const result = {
  mode: dryRun ? 'dry-run' : 'write',
  before,
  after: { people: people.length, appointments: appointments.length, defaultPeople: defaultPeople.length, defaultAppointments: defaultAppointments.length },
  removedPeople: before.people - people.length,
  removedAppointments: before.appointments - appointments.length,
  correctedNames: Object.keys(normalizeMap),
};
console.log(JSON.stringify(result, null, 2));

if (!dryRun) {
  writeJs('person-source-index.js', 'SGZ_PERSON_SOURCE_INDEX', next);
  writeJson('person-source-index.json', next);
  writeJs('person-entity-audit.js', 'SGZ_PERSON_ENTITY_AUDIT', audit);
  writeJson('person-entity-audit.json', audit);
  writeJson('person-volume-coverage.json', coverage);
}
