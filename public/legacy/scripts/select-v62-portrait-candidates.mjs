import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const shouldWrite = process.argv.includes('--write');
const dynastyOrder = ['后汉', '魏', '季汉', '吴', '西晋'];
const blockedIdentityPattern = /(?:身份冲突|同名冲突|待消歧|无法消歧|复合歧义|排除|blocked|conflict|unresolved)/i;
let nameNormalization = null;

function loadWindow(file, key) {
  const fullPath = path.join(dataDir, file);
  if (!fs.existsSync(fullPath)) return null;
  const context = { window: {}, console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(fullPath, 'utf8'), context, { filename: file });
  return context.window[key] || null;
}

function loadJson(file) {
  const fullPath = path.join(dataDir, file);
  return fs.existsSync(fullPath) ? JSON.parse(fs.readFileSync(fullPath, 'utf8')) : null;
}

function cleanName(value) {
  const compact = String(value || '')
    .normalize('NFKC')
    .replace(/[\s·　]/g, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .trim();
  return typeof nameNormalization?.toSimplified === 'function' ? nameNormalization.toSimplified(compact) : compact;
}

function mergePerson(target, row, dataset) {
  if (!row?.personId) return;
  const personId = String(row.personId);
  const current = target.get(personId) || {
    personId,
    name: '',
    aliases: new Set(),
    datasets: new Set(),
    sourceRefs: new Set(),
    readerVisible: false,
    identitySignals: []
  };
  const name = String(row.name || row.normalizedName || row.rawName || '').trim();
  if (!current.name && name) current.name = name;
  [name, ...(row.aliases || [])].filter(Boolean).forEach(value => current.aliases.add(String(value)));
  current.datasets.add(dataset);
  (row.sourceIds || []).filter(Boolean).forEach(value => current.sourceRefs.add(String(value)));
  (row.sourceRefs || []).forEach(value => {
    const locator = value?.sourceId || value?.primarySource || value?.rawSource || value;
    if (locator) current.sourceRefs.add(String(locator));
  });
  current.readerVisible ||= row.readerVisible === true || row.visibilityStatus === 'visible' || row.includeInDefault === true;
  [row.identityStatus, row.homonymStatus, row.researchDisposition]
    .filter(Boolean)
    .forEach(value => current.identitySignals.push(String(value)));
  target.set(personId, current);
}

const overlay = loadJson('v62-people-offices.json');
if (!overlay?.people?.length) {
  throw new Error('V62 五朝人物覆盖层尚未生成：需要 data/v62-people-offices.json 后才能冻结候选。');
}

const manifest = loadWindow('portrait-manifest.js', 'SGZ_PERSON_PORTRAIT_MANIFEST');
const catalog = loadJson('v62-portrait-catalog.json');
nameNormalization = loadWindow('person-name-normalization.js', 'SGZ_PERSON_NAME_NORMALIZATION');
const source = loadWindow('person-source-index.js', 'SGZ_PERSON_SOURCE_INDEX') || { people: [], appointments: [] };
const v60 = loadWindow('v60-person-workbook-import.js', 'SGZ_V60_PERSON_WORKBOOK_IMPORT') || { people: [] };
const v61 = loadWindow('v61-person-supplements.js', 'SGZ_V61_PERSON_SUPPLEMENTS') || { people: [], snapshots260: [], peerageEvents: [] };
if (!manifest?.assetsById || !catalog?.reservedSlots?.length) {
  throw new Error('请先运行 scripts/build-v46-portrait-manifest.mjs 生成 V62 立绘资源槽。');
}

const people = new Map();
(source.people || []).forEach(row => mergePerson(people, row, 'source-index'));
(v60.people || []).forEach(row => mergePerson(people, row, 'v60-workbook'));
(v61.people || []).forEach(row => mergePerson(people, row, 'v61-supplement'));

const overlayById = new Map((overlay.people || []).map(row => [String(row.personId || ''), row]));
(overlay.people || []).forEach(row => mergePerson(people, row, 'v62-dynasty-audit'));

const existingPortraitPeople = new Set(Object.keys(manifest.byPersonId || {}));
const existingPortraitNames = new Set(Object.values(manifest.assetsById || {})
  .flatMap(item => [item.name, ...(item.aliases || [])])
  .map(cleanName)
  .filter(Boolean));
const appointmentCount = new Map();
(source.appointments || []).forEach(row => {
  const personId = String(manifest.legacyPersonIdAliases?.[row.personId] || row.personId || '');
  appointmentCount.set(personId, (appointmentCount.get(personId) || 0) + 1);
});
const snapshotPeople = new Set((v61.snapshots260 || []).map(row => String(row.personId || '')).filter(Boolean));
const peeragePeople = new Set((v61.peerageEvents || []).flatMap(row => row.recipientPersonIds || []).map(String));

const crossModuleFiles = [
  'battle-records.js',
  'shu-fangzhen-records.js',
  'wu-fangzhen-records.js',
  'fangzhen-term-supplement.js',
  'fangzhen-seat-supplement.js'
].map(file => ({ file, text: fs.existsSync(path.join(dataDir, file)) ? fs.readFileSync(path.join(dataDir, file), 'utf8') : '' }));

const normalizedNameGroups = new Map();
for (const item of people.values()) {
  const key = cleanName(item.name);
  if (!key) continue;
  if (!normalizedNameGroups.has(key)) normalizedNameGroups.set(key, new Set());
  normalizedNameGroups.get(key).add(item.personId);
}

function candidateFor(row) {
  const personId = String(row.personId || '');
  const item = people.get(personId);
  const name = item?.name || String(row.name || '');
  const nameKey = cleanName(name);
  const dynastyTags = Array.from(new Set((row.dynastyTags || []).filter(tag => dynastyOrder.includes(tag))));
  const readerTagConflicts = Array.isArray(row.readerTagConflicts) ? row.readerTagConflicts : [];
  const crossDynastyBasis = String(row.dynastyResolution?.crossDynastyBasis || (dynastyTags.length <= 1 ? 'single' : ''));
  const strongDynastyTags = Array.isArray(row.dynastyResolution?.strongDynastyTags)
    ? row.dynastyResolution.strongDynastyTags.filter(tag => dynastyOrder.includes(tag))
    : [];
  const acceptedRiskyDynastyTags = Array.isArray(row.dynastyResolution?.acceptedRiskyDynastyTags)
    ? row.dynastyResolution.acceptedRiskyDynastyTags.filter(tag => dynastyOrder.includes(tag))
    : [];
  const evidenceCertaintyScore = strongDynastyTags.length ? 2 : acceptedRiskyDynastyTags.length ? 1 : 0;
  const dynastyCertaintyScore = dynastyTags.length === 1
    ? 3
    : crossDynastyBasis === 'explicit'
      ? 2
      : crossDynastyBasis === 'supported-transition'
        ? 1
        : 0;
  const identitySignals = [row.identityStatus, row.homonymStatus, ...(item?.identitySignals || [])].filter(Boolean).join('｜');
  const sourceCoverageCount = item?.sourceRefs?.size || 0;
  const modules = new Set();
  if ((appointmentCount.get(personId) || 0) > 0) modules.add('appointments');
  if (snapshotPeople.has(personId)) modules.add('snapshot260');
  if (peeragePeople.has(personId)) modules.add('peerage');
  crossModuleFiles.forEach(({ file, text }) => {
    if (text && text.includes(personId)) modules.add(file);
  });
  return {
    personId,
    name,
    dynastyTags,
    eligible: Boolean(
      personId &&
      nameKey &&
      dynastyTags.length &&
      !personId.includes(':unresolved:') &&
      !existingPortraitPeople.has(personId) &&
      !existingPortraitNames.has(nameKey) &&
      !blockedIdentityPattern.test(identitySignals) &&
      (normalizedNameGroups.get(nameKey)?.size || 0) === 1 &&
      row.affiliationStatus === 'resolved' &&
      readerTagConflicts.length === 0 &&
      dynastyCertaintyScore > 0 &&
      evidenceCertaintyScore > 0 &&
      (row.readerVisible !== false) &&
      (item?.readerVisible !== false)
    ),
    exclusionReasons: [
      !personId ? '缺 personId' : '',
      !nameKey ? '缺姓名' : '',
      !dynastyTags.length ? '无五朝标签' : '',
      personId.includes(':unresolved:') ? '不稳定 ID' : '',
      existingPortraitPeople.has(personId) ? '已有正式立绘' : '',
      existingPortraitNames.has(nameKey) ? '同名人物已有正式立绘，需先完成 personId 消歧' : '',
      blockedIdentityPattern.test(identitySignals) ? '身份冲突' : '',
      (normalizedNameGroups.get(nameKey)?.size || 0) > 1 ? '同名冲突' : '',
      row.affiliationStatus !== 'resolved' ? '王朝归属未收口' : '',
      readerTagConflicts.length ? '王朝标签存在同名映射冲突' : '',
      dynastyCertaintyScore === 0 ? '跨朝归属缺少明确证据' : '',
      evidenceCertaintyScore === 0 ? '王朝标签无可核验来源' : '',
      row.readerVisible === false || item?.readerVisible === false ? '非读者可见' : ''
    ].filter(Boolean),
    crossModuleCount: modules.size,
    appointmentCount: appointmentCount.get(personId) || 0,
    sourceCoverageCount,
    datasets: Array.from(modules).sort(),
    crossDynastyBasis,
    dynastyCertaintyScore,
    evidenceCertaintyScore,
    strongDynastyTags,
    acceptedRiskyDynastyTags,
    readerTagConflicts
  };
}

const candidates = (overlay.people || []).map(candidateFor);
const selectedPersonIds = new Set();
const selectedByDynasty = {};
for (const dynasty of dynastyOrder) {
  selectedByDynasty[dynasty] = candidates
    .filter(item => item.eligible && item.dynastyTags.includes(dynasty) && !selectedPersonIds.has(item.personId))
    .sort((a, b) =>
      b.evidenceCertaintyScore - a.evidenceCertaintyScore ||
      b.dynastyCertaintyScore - a.dynastyCertaintyScore ||
      b.crossModuleCount - a.crossModuleCount ||
      b.appointmentCount - a.appointmentCount ||
      b.sourceCoverageCount - a.sourceCoverageCount ||
      a.name.localeCompare(b.name, 'zh-Hans-CN') ||
      a.personId.localeCompare(b.personId)
    )
    .slice(0, 20);
  selectedByDynasty[dynasty].forEach(item => selectedPersonIds.add(item.personId));
}

const shortages = Object.fromEntries(dynastyOrder
  .map(dynasty => [dynasty, 20 - selectedByDynasty[dynasty].length])
  .filter(([, count]) => count > 0));
const selectionStatus = Object.keys(shortages).length ? 'blocked-insufficient-candidates' : 'selected-awaiting-assets';
const selectedQueue = dynastyOrder.flatMap(dynasty => selectedByDynasty[dynasty].map(item => ({ ...item, dynasty })));
const selectedNames = selectedQueue.map(item => cleanName(item.name));
if (new Set(selectedQueue.map(item => item.personId)).size !== selectedQueue.length) throw new Error('V62 立绘候选存在重复 personId');
if (new Set(selectedNames).size !== selectedNames.length) throw new Error('V62 立绘候选存在同名冲突');
if (selectedQueue.some(item => !item.eligible || item.readerTagConflicts.length || existingPortraitPeople.has(item.personId) || existingPortraitNames.has(cleanName(item.name)))) {
  throw new Error('V62 立绘候选违反读者可见、冲突或现有立绘边界');
}
const preview = {
  selectionStatus,
  overlayRecords: overlay.people.length,
  existingPortraitPeople: existingPortraitPeople.size,
  eligibleCandidates: candidates.filter(item => item.eligible).length,
  selectedTotal: selectedPersonIds.size,
  selectedByDynasty,
  shortages
};

if (shouldWrite) {
  const updatedSlots = catalog.reservedSlots.map((slot, index) => {
    const selected = selectedQueue[index] || null;
    return {
      ...slot,
      personId: selected?.personId || null,
      name: selected?.name || '',
      dynasty: selected?.dynasty || slot.dynasty,
      status: 'planned',
      assetStatus: 'missing',
      designStatus: 'pending',
      candidateScore: selected ? {
        evidenceCertaintyScore: selected.evidenceCertaintyScore,
        dynastyCertaintyScore: selected.dynastyCertaintyScore,
        crossModuleCount: selected.crossModuleCount,
        appointmentCount: selected.appointmentCount,
        sourceCoverageCount: selected.sourceCoverageCount
      } : null,
      dynastyTags: selected?.dynastyTags || [],
      crossDynastyBasis: selected?.crossDynastyBasis || '',
      sourceDatasets: selected ? Array.from(people.get(selected.personId)?.datasets || []).sort() : []
    };
  });
  const updatedCatalog = {
    ...catalog,
    generatedAt: catalog.generatedAt || '2026-08-29',
    selectionStatus,
    assignedTotal: updatedSlots.filter(item => item.personId).length,
    readyTotal: 0,
    shortages,
    reservedSlots: updatedSlots
  };
  fs.writeFileSync(path.join(dataDir, 'v62-portrait-catalog.json'), JSON.stringify(updatedCatalog, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(dataDir, 'v62-portrait-catalog.js'), `window.SGZ_V62_PORTRAIT_CATALOG=${JSON.stringify(updatedCatalog)};\n`, 'utf8');
}

console.log(JSON.stringify(preview, null, 2));
if (Object.keys(shortages).length) process.exitCode = 2;
