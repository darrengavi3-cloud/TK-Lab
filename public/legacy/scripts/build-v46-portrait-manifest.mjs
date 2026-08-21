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
const model = researchWindow.SGZResearchModel;
const identities = identityWindow.SGZ_PERSON_IDENTITIES;
const ziRows = ziWindow.SGZ_PERSON_ZI_SUPPLEMENT || [];
const legacy = portraitsWindow.SGZ_PERSON_PORTRAITS || {};
const source = sourceWindow.SGZ_PERSON_SOURCE_INDEX || { people: [], appointments: [] };
const fallbackSrc = './assets/portraits/generated/person-placeholder-v46.png';
const polityColors = { 汉: '#A54136', 魏: '#376B9E', 吴: '#3F7652', 晋: '#665483' };

function cleanName(value) {
  return String(value || '').replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
}

function personIdFor(name, sourcePerson) {
  const resolved = identities?.resolve?.(name);
  return String(sourcePerson?.personId || resolved?.personId || model.personIdFor(cleanName(name), { name: cleanName(name) }));
}

function ziFor(name) {
  const key = cleanName(name);
  const resolved = identities?.resolve?.(key);
  const resolvedName = resolved?.name || key;
  return ziRows.find(item => item.name === key || item.name === resolvedName)?.zi || '';
}

function polityFor(personId) {
  const values = new Set((source.appointments || [])
    .filter(item => item.personId === personId)
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
  const key = cleanName(name);
  const personId = explicitId || personIdFor(key, sourcePerson);
  const legacyItem = legacyMeta(key) || {};
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
    sourceTitle: isDengAi ? 'V46 项目生成头像（非史实肖像，deng-ai-v2）' : (legacyItem.sourceTitle || (hasSpecific ? '既有项目立绘（非史实肖像或用户参考图）' : 'V46 通用界面识别占位（非史实肖像）')),
    sourceUrl: legacyItem.sourceUrl || '',
    portraitKind: isDengAi ? 'ai-illustration-v2' : (legacyItem.portraitKind || (hasSpecific ? 'existing' : 'ui-placeholder')),
    status: hasSpecific ? 'ready' : 'fallback',
    interfaceOnly: true
  };
}

const defaultPeople = (source.people || []).filter(item => item.includeInDefault === true);
const byPersonId = {};
const byName = {};
defaultPeople.forEach(person => {
  const item = entry(person.name, person, person.personId);
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

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: '人物记默认可见人物按稳定 personId 建立立绘索引；占位图仅作界面识别，不代表史实肖像。',
  fallbackSrc,
  defaultPersonIds: defaultPeople.map(person => String(person.personId)),
  byPersonId,
  byName,
  summary: {
    defaultPeople: defaultPeople.length,
    indexedPersonIds: Object.keys(byPersonId).length,
    specificPortraits: Object.values(byPersonId).filter(item => item.status === 'ready').length,
    fallbackPortraits: Object.values(byPersonId).filter(item => item.status === 'fallback').length,
    dengAiSrc: byName['邓艾']?.src || ''
  }
};

fs.writeFileSync(path.join(dataDir, 'portrait-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(dataDir, 'portrait-manifest.js'), `window.SGZ_PERSON_PORTRAIT_MANIFEST=${JSON.stringify(manifest)};\n`, 'utf8');
console.log(JSON.stringify(manifest.summary));
