import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');

function loadWindow(file) {
  const context = { window: {}, console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dataDir, file), 'utf8'), context, { filename: file });
  return context.window;
}

const researchWindow = loadWindow('research-model.js');
const identityWindow = loadWindow('person-identities.js');
const ziWindow = loadWindow('person-zi-supplement.js');
const portraitsWindow = loadWindow('person-portraits.js');
const sourceWindow = loadWindow('person-source-index.js');
const boardWindow = loadWindow('v48-portrait-board.js');
const entityAuditWindow = loadWindow('person-entity-audit.js');
const model = researchWindow.SGZResearchModel;
const identities = identityWindow.SGZ_PERSON_IDENTITIES;
const ziRows = ziWindow.SGZ_PERSON_ZI_SUPPLEMENT || [];
const legacy = portraitsWindow.SGZ_PERSON_PORTRAITS || {};
const source = sourceWindow.SGZ_PERSON_SOURCE_INDEX || { people: [], appointments: [] };
const board = boardWindow.SGZ_V48_PORTRAIT_BOARD || { records: [] };
const entityAudit = entityAuditWindow.SGZ_PERSON_ENTITY_AUDIT || { normalizeMap: {} };
const fallbackSrc = './assets/portraits/generated/person-placeholder-v46.png';
const polityColors = { 汉: '#A54136', 魏: '#376B9E', 吴: '#3F7652', 晋: '#665483' };

function cleanName(value) {
  return String(value || '').replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
}

function canonicalName(value) {
  const key = cleanName(value);
  return String(entityAudit.normalizeMap?.[key]?.canonicalName || key);
}

function sourcePersonFor(name) {
  const key = canonicalName(name);
  return (source.people || []).find(item => canonicalName(item.name) === key || (item.aliases || []).some(alias => canonicalName(alias) === key)) || null;
}

function personIdFor(name, sourcePerson) {
  const key = canonicalName(name);
  const sourceMatch = sourcePerson || sourcePersonFor(key);
  const resolved = identities?.resolve?.(key);
  if (resolved?.personId) return String(resolved.personId);
  const sourceId = String(sourceMatch?.personId || '');
  if (sourceId) return String(identities?.canonicalPersonId?.(sourceId) || sourceId);
  return String(model.personIdFor(key, { name: key }));
}

function ziFor(name) {
  const key = cleanName(name);
  const resolved = identities?.resolve?.(key);
  const resolvedName = resolved?.name || key;
  return ziRows.find(item => item.name === key || item.name === resolvedName)?.zi || '';
}

function polityFor(personId) {
  const values = new Set((source.appointments || [])
    .filter(item => String(identities?.canonicalPersonId?.(item.personId) || item.personId) === personId)
    .map(item => String(item.polity || '').trim())
    .filter(Boolean));
  return Array.from(values).join('／') || '未详';
}

function legacyMeta(name) {
  const key = cleanName(name);
  const direct = legacy[key];
  if (direct) return typeof direct === 'string' ? { src: direct } : { ...direct };
  const resolved = identities?.resolve?.(key);
  if (resolved?.name && legacy[resolved.name]) {
    const item = legacy[resolved.name];
    return typeof item === 'string' ? { src: item } : { ...item };
  }
  return null;
}

function entry(name, sourcePerson, explicitId) {
  const key = canonicalName(name);
  const personId = explicitId || personIdFor(key, sourcePerson);
  const legacyItem = legacyMeta(key) || {};
  const boardItem = (board.records || []).find(item => canonicalName(item.name) === key || item.personId === personId);
  const isDengAi = key === '邓艾';
  const src = isDengAi ? './assets/portraits/wei/deng-ai-v2.png' : (legacyItem.src || fallbackSrc);
  const hasSpecific = Boolean(legacyItem.src) || isDengAi;
  const polity = polityFor(personId) === '未详' ? (legacyItem.polity || '未详') : polityFor(personId);
  return {
    personId,
    name: key,
    aliases: Array.from(new Set([...(sourcePerson?.aliases || []), key].filter(Boolean))),
    zi: ziFor(key),
    src,
    polity,
    color: legacyItem.color || polityColors[polity.split('／')[0]] || '#8D948A',
    sourceTitle: isDengAi ? 'V46 项目生成头像（非史实肖像，deng-ai-v2）' : (legacyItem.sourceTitle || (hasSpecific ? '既有项目立绘（非史实肖像或用户参考图）' : (boardItem ? 'V48 Figma 设计板（尚未导出生产资源）' : 'V46 通用界面识别占位（非史实肖像）'))),
    sourceUrl: legacyItem.sourceUrl || '',
    portraitKind: isDengAi ? 'ai-illustration-v2' : (legacyItem.portraitKind || (hasSpecific ? 'existing' : 'ui-placeholder')),
    status: hasSpecific ? 'ready' : (boardItem ? 'designOnly' : 'fallback'),
    designRef: boardItem ? { fileKey: 'gvWRC5GHHSgd8QX9b2VJgo', version: 'V48', order: boardItem.order, role: boardItem.role, priority: boardItem.priority } : null,
    interfaceOnly: true
  };
}

const defaultPeople = (source.people || []).filter(item => item.includeInDefault === true);
const byPersonId = {};
const byName = {};
defaultPeople.forEach(person => {
  const item = entry(person.name, person, personIdFor(person.name, person));
  byPersonId[item.personId] = item;
  byName[item.name] = item;
});

// Keep legacy name-keyed records reachable for court nodes and saved projects,
// including portraits whose person was not in the default source index.
Object.keys(legacy).forEach(name => {
  const item = entry(name, null);
  if (!byPersonId[item.personId]) byPersonId[item.personId] = item;
  if (!byName[item.name]) byName[item.name] = item;
});

// V48 的设计板不是生产资源，但必须进入同一份 manifest，明确标记 designOnly，
// 防止“设计完成”和“网站已同步”再次被误当成同一状态。
(board.records || []).forEach(boardItem => {
  const sourcePerson = sourcePersonFor(boardItem.name);
  const canonicalId = personIdFor(boardItem.name, sourcePerson);
  const item = entry(boardItem.name, sourcePerson, canonicalId);
  const current = byPersonId[canonicalId];
  if (current) {
    current.designRef = item.designRef;
    current.designStatus = 'figma-design';
    if (!current.src) current.src = fallbackSrc;
    if (current.status !== 'ready') current.status = 'designOnly';
    if (!current.sourceTitle || current.status === 'designOnly') current.sourceTitle = item.sourceTitle;
    byName[item.name] = current;
  } else {
    item.designStatus = 'figma-design';
    byPersonId[canonicalId] = item;
    byName[item.name] = item;
  }
});

const manifest = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  scope: '人物记默认可见人物按稳定 personId 建立立绘索引；占位图仅作界面识别，不代表史实肖像。',
  fallbackSrc,
  defaultPersonIds: defaultPeople.map(person => personIdFor(person.name, person)),
  byPersonId,
  byName,
  summary: {
    defaultPeople: defaultPeople.length,
    indexedPersonIds: Object.keys(byPersonId).length,
    specificPortraits: Object.values(byPersonId).filter(item => item.status === 'ready').length,
    designOnlyPortraits: Object.values(byPersonId).filter(item => item.status === 'designOnly').length,
    fallbackPortraits: Object.values(byPersonId).filter(item => item.status === 'fallback').length,
    figmaBoardRecords: board.records?.length || 0,
    figmaBoardMapped: (board.records || []).filter(item => byPersonId[personIdFor(item.name, sourcePersonFor(item.name))]).length,
    dengAiSrc: byName['邓艾']?.src || ''
  }
};

fs.writeFileSync(path.join(dataDir, 'portrait-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(dataDir, 'portrait-manifest.js'), `window.SGZ_PERSON_PORTRAIT_MANIFEST=${JSON.stringify(manifest)};\n`, 'utf8');
console.log(JSON.stringify(manifest.summary));
