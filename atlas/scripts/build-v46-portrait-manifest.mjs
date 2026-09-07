import fs from 'node:fs';
import { validateIdentitySources } from './person-identity-publication.mjs';
import crypto from 'node:crypto';
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
const v58BoardWindow = loadWindow('v58-portrait-board.js');
const entityAuditWindow = loadWindow('person-entity-audit.js');
const model = researchWindow.SGZResearchModel;
const identities = identityWindow.SGZ_PERSON_IDENTITIES;
const ziRows = ziWindow.SGZ_PERSON_ZI_SUPPLEMENT || [];
const legacy = portraitsWindow.SGZ_PERSON_PORTRAITS || {};
const source = sourceWindow.SGZ_PERSON_SOURCE_INDEX || { people: [], appointments: [] };
const board = boardWindow.SGZ_V48_PORTRAIT_BOARD || { records: [] };
const v58Board = v58BoardWindow.SGZ_V58_PORTRAIT_BOARD || { records: [] };
const entityAudit = entityAuditWindow.SGZ_PERSON_ENTITY_AUDIT || { normalizeMap: {} };
const v69PortraitProduction = fs.existsSync(path.join(dataDir, 'v69-portrait-production.json'))
  ? JSON.parse(fs.readFileSync(path.join(dataDir, 'v69-portrait-production.json'), 'utf8'))
  : { records: [] };
const v69PortraitCandidates = fs.existsSync(path.join(dataDir, 'v69-portrait-candidates.json'))
  ? JSON.parse(fs.readFileSync(path.join(dataDir, 'v69-portrait-candidates.json'), 'utf8'))
  : { candidates: [] };
const v70PortraitCandidates = fs.existsSync(path.join(dataDir, 'v70-portrait-candidates.json'))
  ? JSON.parse(fs.readFileSync(path.join(dataDir, 'v70-portrait-candidates.json'), 'utf8'))
  : { records: [] };
const v73PortraitCandidates = fs.existsSync(path.join(dataDir, 'v73-portrait-candidates.json'))
  ? JSON.parse(fs.readFileSync(path.join(dataDir, 'v73-portrait-candidates.json'), 'utf8'))
  : { records: [] };
const fallbackSrc = './assets/portraits/generated/person-placeholder-v46.png';
const polityColors = { 汉: '#A54136', 魏: '#376B9E', 吴: '#3F7652', 晋: '#665483' };
const identitySuppressions = ['v73-person-identity-suppressions.json', 'v75-person-identity-suppressions.json'].map(name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8')));
const sourceAppointments = JSON.parse(fs.readFileSync(path.join(dataDir, 'person-source-index.json'), 'utf8')).appointments;
for (const review of identitySuppressions) validateIdentitySources(review, { appointments: sourceAppointments });
const suppressedNonPeople = new Set(identitySuppressions.flatMap(review => review.records.filter(row => row.status === 'verified' && row.action === 'suppress').map(row => row.personId)));

// V62: the old name-based pool produced 31 temporary person IDs.  Keep those
// IDs as compatibility aliases, but store every portrait against the reviewed,
// stable person ID.  Do not remove an alias: saved reader state may still carry
// one of these keys.
const v62LegacyPersonIdAliases = Object.freeze({
  'person:unresolved:1hqyzmd': 'person:workbook:d40ea13e6aeb4ac3', // 司马昭
  'person:unresolved:1jq8rz1': 'person:source:6bea1ab8f79e', // 钟会
  'person:unresolved:05pju5o': 'person:workbook:8bd63f6483bc253f', // 陈泰
  'person:unresolved:037gvak': 'person:workbook:72594c927185e28d', // 郗虑
  'person:unresolved:129y0l9': 'person:workbook:02e2cbcc648a104b', // 蒯越
  'person:unresolved:1lv8rc2': 'person:workbook:c2b23952ed4f6f1f', // 辛毗
  'person:unresolved:1xhzc3t': 'person:workbook:51e7b15708c569d0', // 卫觊
  'person:unresolved:16qqvij': 'person:workbook:1eddacb9a6aa34cc', // 诸葛诞
  'person:unresolved:0b97q09': 'person:workbook:9deda736cce490ae', // 文钦
  'person:unresolved:1gqa825': 'person:workbook:3b15f7d60a56d977', // 毋丘俭
  'person:unresolved:1mtxllo': 'person:wei:le-chen', // 乐綝（旧字形：乐𬘭）
  'person:unresolved:06pffzq': 'person:wei:cheng-ji', // 成济
  'person:unresolved:1eofejd': 'person:workbook:10602094ff4cb2ed', // 王基
  'person:unresolved:1h4zt9c': 'person:workbook:232a9f6a939d9949', // 牵招
  'person:unresolved:1eo3nc4': 'person:workbook:699340a4a842aeda', // 诸葛瞻
  'person:unresolved:1lfx0vo': 'person:workbook:85cbb6f1a2590033', // 廖化
  'person:unresolved:025puiw': 'person:workbook:3ddbdd5eabe3b3d8', // 张翼
  'person:unresolved:0t6tvsl': 'person:workbook:467af8a161400901', // 罗宪
  'person:unresolved:1lqp9wr': 'person:workbook:4628d13c3024011b', // 马谡
  'person:unresolved:1skndbm': 'person:workbook:a905207ace5bd181', // 杨仪
  'person:unresolved:0yjpax9': 'person:workbook:70152738b6dbc7c0', // 马良
  'person:unresolved:1w08fz2': 'person:workbook:957381792af51e59', // 王平
  'person:unresolved:1vgus60': 'person:workbook:261c3244950d8e2a', // 周处
  'person:unresolved:1tjnx9a': 'person:workbook:948a0bb7fcb5757c', // 司马师
  'person:unresolved:0wbpe5n': 'person:workbook:65c2d1dfcc0f0bbc', // 诸葛瑾
  'person:unresolved:1teot86': 'person:source:74484c7b8050', // 吕岱
  'person:unresolved:0w48d0q': 'person:workbook:52107cd52f541ec4', // 丁奉
  'person:unresolved:017nhr4': 'person:workbook:af953fe35ee88d6e', // 周瑜
  'person:unresolved:1p6qcr2': 'person:workbook:3efd0606e6263df4', // 吕蒙
  'person:unresolved:0h6p2zb': 'person:workbook:4ca6a0b48b2aefbf', // 王濮
  'person:unresolved:12z4250': 'person:source:b948df238097' // 杜预
});

const v62PrimaryPortraitSrc = Object.freeze({
  'person:source:6bea1ab8f79e': './assets/portraits/v51/person-source-6bea1ab8f79e.png',
  'person:source:74484c7b8050': './assets/portraits/v58/lu-dai.png'
});

const v62PersonNameOverrides = Object.freeze({
  'person:wei:le-chen': { name: '乐綝', aliases: ['乐綝', '樂綝', '乐𬘭'] },
  'person:wei:cheng-ji': { name: '成济', aliases: ['成济'] },
  // 爵号与姓名拆分：陈王为封爵，人物姓名为刘宠；旧组合值仅留兼容审校记录。
  'person:workbook:7eba7742ef741dc7': { name: '刘宠', aliases: ['刘宠'], removedAliases: ['陈王刘宠'] }
});

const v62PortraitSlotGroups = Object.freeze([
  { dynasty: '后汉', dynastyKey: 'later-han' },
  { dynasty: '魏', dynastyKey: 'wei' },
  { dynasty: '季汉', dynastyKey: 'shuhan' },
  { dynasty: '吴', dynastyKey: 'wu' },
  { dynasty: '西晋', dynastyKey: 'western-jin' }
]);

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

// V58 生产资源覆盖 V48 的 designOnly 状态，但保留原 personId、默认档案门槛与 V48 设计板统计。
(v58Board.records || []).forEach(boardItem => {
  const sourcePerson = sourcePersonFor(boardItem.name);
  const personId = String(boardItem.personId || personIdFor(boardItem.name, sourcePerson));
  const current = byPersonId[personId] || entry(boardItem.name, sourcePerson, personId);
  current.personId = personId;
  current.name = canonicalName(boardItem.name);
  current.src = boardItem.src;
  current.polity = boardItem.polity || current.polity || '未详';
  current.color = boardItem.accent || current.color || '#8D948A';
  current.sourceTitle = boardItem.sourceTitle || 'V58 Figma 界面识别立绘（非史实肖像）';
  current.portraitKind = 'ui-illustration-v58';
  current.status = 'ready';
  current.designStatus = 'figma-design';
  current.designRef = { fileKey: 'gvWRC5GHHSgd8QX9b2VJgo', version: 'V58', order: boardItem.order, role: boardItem.role, priority: boardItem.priority };
  current.interfaceOnly = true;
  byPersonId[personId] = current;
  byName[current.name] = current;
});

for (const personId of suppressedNonPeople) delete byPersonId[personId];
for (const [name, item] of Object.entries(byName)) {
  if (name === '安国' || suppressedNonPeople.has(item?.personId)) delete byName[name];
}

function v62CanonicalPersonId(personId) {
  const raw = String(personId || '');
  return String(v62LegacyPersonIdAliases[raw] || identities?.canonicalPersonId?.(raw) || raw);
}

function v62PortraitId(personId, src) {
  const digest = crypto.createHash('sha256')
    .update(`${personId}\u0000${String(src || '')}`, 'utf8')
    .digest('hex')
    .slice(0, 20);
  return `portrait:asset:${digest}`;
}

function v62ReadExistingCatalog() {
  const file = path.join(dataDir, 'v62-portrait-catalog.json');
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed?.reservedSlots?.length === 100 ? parsed : null;
  } catch {
    return null;
  }
}

function v62ReadFigmaMapping() {
  const file = path.join(dataDir, 'v62-figma-mapping.json');
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed?.fileKey === 'gvWRC5GHHSgd8QX9b2VJgo' ? parsed : null;
  } catch {
    return null;
  }
}

function v62FigmaNodeId(value) {
  return /^\d+:\d+$/.test(String(value || ''));
}

function v62PngIsReady(assetPath) {
  const fullPath = path.join(root, String(assetPath || '').replace(/^\.\//, ''));
  if (!fs.existsSync(fullPath)) return false;
  const bytes = fs.readFileSync(fullPath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(signature) &&
    bytes.readUInt32BE(16) === 512 &&
    bytes.readUInt32BE(20) === 512;
}

function v62BuildManifest() {
  const assetsById = {};
  const portraitsByCanonicalPersonId = new Map();
  const figmaMapping = v62ReadFigmaMapping();
  const figmaPortraitById = new Map((figmaMapping?.portraits || []).map(item => [item.portraitId, item]));

  Object.entries(byPersonId).forEach(([legacyPersonId, item], assetIndex) => {
    const personId = v62CanonicalPersonId(legacyPersonId);
    const nameOverride = v62PersonNameOverrides[personId] || null;
    const legacyNameAliases = Object.entries(byName)
      .filter(([, namedItem]) => namedItem === item || (namedItem?.src && namedItem.src === item.src))
      .map(([name]) => name);
    const removedAliases = new Set(nameOverride?.removedAliases || []);
    const aliases = new Set([...(item.aliases || []), ...legacyNameAliases, item.name, nameOverride?.name, ...(nameOverride?.aliases || [])]
      .filter(Boolean)
      .filter(alias => !removedAliases.has(alias)));
    const portraitId = v62PortraitId(personId, item.src);
    const asset = {
      ...item,
      portraitId,
      personId,
      name: nameOverride?.name || item.name,
      aliases: Array.from(aliases),
      assetPath: item.src,
      catalogOrder: assetIndex + 1,
      legacyPersonIds: legacyPersonId === personId ? [] : [legacyPersonId]
    };
    const mappedPortrait = figmaPortraitById.get(portraitId);
    if (mappedPortrait?.personId === personId && v62FigmaNodeId(mappedPortrait.nodeId)) {
      asset.designStatus = 'figma-design';
      asset.designRef = {
        ...(asset.designRef || {}),
        fileKey: 'gvWRC5GHHSgd8QX9b2VJgo',
        version: asset.designRef?.version || 'V58',
        pageName: mappedPortrait.pageName || 'V58 / Portraits',
        nodeId: mappedPortrait.nodeId
      };
    }
    assetsById[portraitId] = asset;
    if (!portraitsByCanonicalPersonId.has(personId)) portraitsByCanonicalPersonId.set(personId, []);
    portraitsByCanonicalPersonId.get(personId).push(asset);
  });

  const existingCatalog = v62ReadExistingCatalog();
  const existingSlotsById = new Map((existingCatalog?.reservedSlots || []).map(item => [item.portraitId, item]));
  const reservedSlots = v62PortraitSlotGroups.flatMap((group, groupIndex) => Array.from({ length: 20 }, (_, index) => {
    const localOrder = index + 1;
    const globalOrder = groupIndex * 20 + localOrder;
    const padded = String(localOrder).padStart(2, '0');
    const portraitId = `portrait:v62:${group.dynastyKey}:${padded}`;
    const assetPath = `./assets/portraits/v62/${group.dynastyKey}/${group.dynastyKey}-${padded}.png`;
    const previous = existingSlotsById.get(portraitId) || {};
    const mappedPortrait = figmaPortraitById.get(portraitId);
    const physicalReady = v62PngIsReady(assetPath);
    const personId = previous.personId ? v62CanonicalPersonId(previous.personId) : null;
    const name = String(previous.name || '').trim();
    const mappingReady = mappedPortrait?.personId === personId &&
      mappedPortrait?.pageName === 'V62 / Portraits' &&
      v62FigmaNodeId(mappedPortrait?.nodeId);
    const status = physicalReady && personId && name && mappingReady
      ? 'ready'
      : (previous.status === 'ready' ? 'planned' : (previous.status || 'planned'));
    return {
      ...previous,
      portraitId,
      assetPath,
      order: globalOrder,
      dynasty: group.dynasty,
      dynastyKey: group.dynastyKey,
      dynastyOrder: groupIndex + 1,
      slotOrder: localOrder,
      personId,
      name,
      status,
      assetStatus: physicalReady ? (status === 'ready' ? 'ready' : 'generated-unverified') : 'missing',
      designStatus: mappingReady ? 'figma-design' : (previous.designStatus || 'pending'),
      designRef: {
        ...(previous.designRef || {}),
        fileKey: 'gvWRC5GHHSgd8QX9b2VJgo',
        version: 'V62',
        pageName: 'V62 / Portraits',
        nodeId: mappingReady ? mappedPortrait.nodeId : (previous.designRef?.nodeId || null)
      },
      interfaceOnly: true
    };
  }));

  const dynastyColors = { '后汉': '#77736B', '魏': '#376B9E', '季汉': '#A34738', '吴': '#4E6961', '西晋': '#665483' };
  reservedSlots.filter(item => item.status === 'ready').forEach(slot => {
    const personId = v62CanonicalPersonId(slot.personId);
    const asset = {
      portraitId: slot.portraitId,
      personId,
      name: slot.name,
      aliases: Array.from(new Set([slot.name, ...(slot.aliases || [])].filter(Boolean))),
      zi: slot.zi || '',
      src: slot.assetPath,
      assetPath: slot.assetPath,
      polity: slot.dynasty,
      color: dynastyColors[slot.dynasty] || '#8D948A',
      sourceTitle: slot.sourceTitle || 'V62 界面识别立绘（非史实肖像）',
      sourceUrl: '',
      portraitKind: 'ui-illustration-v62',
      status: 'ready',
      designStatus: slot.designStatus || 'pending',
      designRef: slot.designRef || null,
      interfaceOnly: true,
      catalogOrder: Object.keys(byPersonId).length + slot.order,
      legacyPersonIds: []
    };
    assetsById[asset.portraitId] = asset;
    if (!portraitsByCanonicalPersonId.has(personId)) portraitsByCanonicalPersonId.set(personId, []);
    portraitsByCanonicalPersonId.get(personId).push(asset);
  });

  // V69 assets are admitted one by one from the production ledger.  A row is
  // only public when its local 512x512 file and its real Figma node/component
  // IDs have both been recorded; the remaining frozen candidates stay out of
  // the reader manifest until production is complete.
  const candidateByPersonId = new Map((v69PortraitCandidates.candidates || []).map(item => [item.personId, item]));
  const v69Colors = { '后汉': '#77736B', '魏': '#376B9E', '季汉': '#A34738', '吴': '#4E6961', '西晋': '#665483' };
  const v69ProductionComplete = v69PortraitProduction.status === 'complete'
    && (v69PortraitProduction.records || []).length === (v69PortraitCandidates.candidates || []).length;
  for (const row of v69ProductionComplete ? (v69PortraitProduction.records || []) : []) {
    const candidate = candidateByPersonId.get(row.personId);
    if (!candidate || row.status !== 'ready') continue;
    if (!v62PngIsReady(row.assetPath)) continue;
    const portraitId = `portrait:v69:${String(row.order).padStart(2, '0')}`;
    const personId = String(row.personId);
    if (assetsById[portraitId] || portraitsByCanonicalPersonId.has(personId)) continue;
    const dynasty = (candidate.dynastyTags || [])[0] || '未详';
    const asset = {
      portraitId,
      personId,
      name: String(row.name || candidate.name || '').trim(),
      aliases: Array.from(new Set([String(row.name || candidate.name || '').trim()].filter(Boolean))),
      zi: '',
      src: row.assetPath,
      assetPath: row.assetPath,
      polity: dynasty,
      color: v69Colors[dynasty] || '#8D948A',
      sourceTitle: 'V69 界面识别立绘（非史实肖像）',
      sourceUrl: '',
      portraitKind: 'ui-illustration-v69',
      status: 'ready',
      designStatus: 'figma-design',
      designRef: {
        fileKey: 'gvWRC5GHHSgd8QX9b2VJgo',
        version: 'V69',
        pageName: row.pageName || 'V69 / Portraits',
        nodeId: row.nodeId,
        componentId: row.componentId
      },
      interfaceOnly: true,
      catalogOrder: Object.keys(assetsById).length + 1,
      legacyPersonIds: []
    };
    assetsById[portraitId] = asset;
    portraitsByCanonicalPersonId.set(personId, [asset]);
  }

  // V70 本地生产资源：图片验收后即可进入读者清单；Figma 节点保持 pending，
  // 直到取得编辑席位并写入真实节点，不用空值冒充已推送。
  const v70Colors = { '魏': '#376B9E' };
  const v70Rows = Array.isArray(v70PortraitCandidates.records) ? v70PortraitCandidates.records : [];
  for (const row of v70Rows) {
    const personId = v62CanonicalPersonId(row.personId);
    if (!personId || !row.name || !v62PngIsReady(row.assetPath)) continue;
    if (portraitsByCanonicalPersonId.has(personId)) continue;
    const portraitId = `portrait:v70:${String(row.order).padStart(2, '0')}`;
    if (assetsById[portraitId]) continue;
    const asset = {
      portraitId,
      personId,
      name: String(row.name).trim(),
      aliases: [String(row.name).trim()],
      zi: String(row.zi || '').trim(),
      src: row.assetPath,
      assetPath: row.assetPath,
      polity: row.dynasty || '魏',
      color: v70Colors[row.dynasty] || '#376B9E',
      sourceTitle: 'V70 界面识别立绘（非史实肖像）',
      sourceUrl: '',
      portraitKind: 'ui-illustration-v70',
      status: 'ready',
      designStatus: 'pending-figma-upload',
      designRef: {
        fileKey: 'gvWRC5GHHSgd8QX9b2VJgo',
        version: 'V70',
        pageName: 'V70 / Portraits',
        nodeId: null,
        componentId: null
      },
      interfaceOnly: true,
      catalogOrder: Object.keys(assetsById).length + 1,
      legacyPersonIds: []
    };
    assetsById[portraitId] = asset;
    portraitsByCanonicalPersonId.set(personId, [asset]);
  }

  // V73 季汉补绘：只有本地 512×512 PNG 与真实 Figma 节点同时存在时发布。
  const v73Colors = { '季汉': '#A34738' };
  const v73Rows = Array.isArray(v73PortraitCandidates.records) ? v73PortraitCandidates.records : [];
  for (const row of v73Rows) {
    const personId = v62CanonicalPersonId(row.personId);
    const nodeId = row.designRef?.nodeId;
    if (!personId || !row.name || !v62PngIsReady(row.assetPath) || !v62FigmaNodeId(nodeId)) continue;
    if (suppressedNonPeople.has(personId) || portraitsByCanonicalPersonId.has(personId)) continue;
    const portraitId = `portrait:v73:${String(row.order).padStart(3, '0')}`;
    if (assetsById[portraitId]) continue;
    const asset = {
      portraitId,
      personId,
      name: String(row.name).trim(),
      aliases: [String(row.name).trim()],
      zi: String(row.zi || '').trim(),
      src: row.assetPath,
      assetPath: row.assetPath,
      polity: row.dynasty || '季汉',
      color: v73Colors[row.dynasty] || '#A34738',
      sourceTitle: 'V73 界面识别立绘（非史实肖像）',
      sourceUrl: '',
      portraitKind: 'ui-illustration-v73',
      status: 'ready',
      designStatus: 'figma-design',
      designRef: {
        fileKey: 'gvWRC5GHHSgd8QX9b2VJgo',
        version: 'V73',
        pageName: 'V73 / Portraits',
        nodeId,
        componentId: null
      },
      interfaceOnly: true,
      catalogOrder: Object.keys(assetsById).length + 1,
      legacyPersonIds: []
    };
    assetsById[portraitId] = asset;
    portraitsByCanonicalPersonId.set(personId, [asset]);
  }

  const canonicalByPersonId = {};
  const canonicalByName = {};
  portraitsByCanonicalPersonId.forEach((assets, personId) => {
    const preferredSrc = v62PrimaryPortraitSrc[personId] || '';
    const primary = assets.find(item => item.src === preferredSrc) || assets[0];
    const portraitIds = assets.map(item => item.portraitId);
    const aliases = Array.from(new Set(assets.flatMap(item => [item.name, ...(item.aliases || [])]).filter(Boolean)));
    const legacyPersonIds = Array.from(new Set(assets.flatMap(item => item.legacyPersonIds || [])));
    const indexItem = {
      ...primary,
      aliases,
      primaryPortraitId: primary.portraitId,
      portraitIds,
      portraitCount: portraitIds.length,
      legacyPersonIds
    };
    canonicalByPersonId[personId] = indexItem;
    aliases.forEach(alias => {
      const key = String(alias || '').trim();
      if (key && !canonicalByName[key]) canonicalByName[key] = indexItem;
    });
  });

  // Keep manifest/catalog output reproducible across release-check's
  // consecutive builds.  build-all supplies SOURCE_DATE_EPOCH from the
  // deterministic source lock; a fixed fallback preserves standalone use.
  const generatedAt = new Date(Number(process.env.SOURCE_DATE_EPOCH || 1788019200) * 1000).toISOString();
  const defaultPersonIds = Array.from(new Set(defaultPeople.map(person => v62CanonicalPersonId(personIdFor(person.name, person)))));
  const assets = Object.values(assetsById);
  const manifest = {
    schemaVersion: 3,
    generatedAt,
    scope: '人物记立绘按资源与稳定 personId 分层索引；同一人可保留多个界面识别立绘，不代表史实肖像。',
    fallbackSrc,
    defaultPersonIds,
    assetsById,
    byPersonId: canonicalByPersonId,
    byName: canonicalByName,
    legacyPersonIdAliases: { ...v62LegacyPersonIdAliases },
    summary: {
      defaultPeople: defaultPersonIds.length,
      assetRecords: assets.length,
      indexedPersonIds: Object.keys(canonicalByPersonId).length,
      specificPortraits: assets.filter(item => item.status === 'ready').length,
      designOnlyPortraits: assets.filter(item => item.status === 'designOnly').length,
      fallbackPortraits: assets.filter(item => item.status === 'fallback').length,
      v62PortraitRecords: reservedSlots.filter(item => item.status === 'ready').length,
      peopleWithMultiplePortraits: Object.values(canonicalByPersonId).filter(item => item.portraitIds.length > 1).length,
      legacyPersonIdAliases: Object.keys(v62LegacyPersonIdAliases).length,
      figmaBoardRecords: board.records?.length || 0,
      figmaBoardMapped: (board.records || []).filter(item => canonicalByPersonId[v62CanonicalPersonId(personIdFor(item.name, sourcePersonFor(item.name)))]).length,
      v58PortraitRecords: v58Board.records?.length || 0,
      v58PortraitMapped: (v58Board.records || []).filter(item => canonicalByPersonId[v62CanonicalPersonId(item.personId)]).length,
      v70PortraitRecords: assets.filter(item => item.portraitKind === 'ui-illustration-v70').length,
      v73PortraitRecords: assets.filter(item => item.portraitKind === 'ui-illustration-v73').length,
      dengAiSrc: canonicalByName['邓艾']?.src || ''
    }
  };

  const catalog = {
    schemaVersion: 1,
    generatedAt,
    scope: 'V62 资源槽与 V70 本地立绘候选均使用稳定 personId；V70 图片验收后可标记 ready，Figma 节点写入前保持 pending。',
    selectionStatus: existingCatalog?.selectionStatus && existingCatalog.selectionStatus !== 'awaiting-dynasty-audit'
      ? existingCatalog.selectionStatus
      : (fs.existsSync(path.join(dataDir, 'v62-people-offices.json')) ? 'candidate-selection-pending' : 'awaiting-dynasty-audit'),
    dynastyOrder: v62PortraitSlotGroups.map(item => item.dynasty),
    quotaPerDynasty: 20,
    plannedTotal: reservedSlots.length,
    assignedTotal: reservedSlots.filter(item => item.personId).length,
    readyTotal: reservedSlots.filter(item => item.status === 'ready').length,
    shortages: existingCatalog?.shortages || {},
    reservedSlots
  };
  return { manifest, catalog };
}

const { manifest, catalog } = v62BuildManifest();
if (process.env.SGZ_PORTRAIT_SKIP_JSON !== '1') {
  fs.writeFileSync(path.join(dataDir, 'portrait-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}
fs.writeFileSync(path.join(dataDir, 'portrait-manifest.js'), `window.SGZ_PERSON_PORTRAIT_MANIFEST=${JSON.stringify(manifest)};\n`, 'utf8');
fs.writeFileSync(path.join(dataDir, 'v62-portrait-catalog.json'), JSON.stringify(catalog, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(dataDir, 'v62-portrait-catalog.js'), `window.SGZ_V62_PORTRAIT_CATALOG=${JSON.stringify(catalog)};\n`, 'utf8');
console.log(JSON.stringify({ ...manifest.summary, plannedV62Portraits: catalog.plannedTotal, readyV62Portraits: catalog.readyTotal }));
