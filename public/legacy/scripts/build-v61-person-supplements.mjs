import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const snapshotWorkbookPath = process.argv[2] || '/Users/bobiaisi01/Desktop/260年人物纪.xlsx';
const peerageWorkbookPath = process.argv[3] || '/Users/bobiaisi01/Desktop/曹魏封爵数据库 VFinal.1.xlsx';
const packagesRoot = process.env.SGZ_NODE_PACKAGES || '/Users/bobiaisi01/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const requireFromPackages = createRequire(path.join(packagesRoot, 'package.json'));
const { FileBlob, SpreadsheetFile } = requireFromPackages('@oai/artifact-tool');

const trim = value => String(value == null ? '' : value).trim();
const compact = value => trim(value).replace(/\s+/g, ' ');
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const cleanDash = value => ['—', '-', '－'].includes(compact(value)) ? '' : compact(value);
const nameNormalization = JSON.parse(fs.readFileSync(path.join(root, 'data', 'person-name-normalization.json'), 'utf8'));
const charMap = new Map([
  ['張','张'],['劉','刘'],['關','关'],['馬','马'],['黃','黄'],['術','术'],['紹','绍'],['譚','谭'],['審','审'],['顏','颜'],
  ['呂','吕'],['諸','诸'],['楊','杨'],['駿','骏'],['華','华'],['導','导'],['鑒','鉴'],['溫','温'],['漢','汉'],['吳','吴'],
  ['晉','晋'],['東','东'],['國','国'],['縣','县'],['鄉','乡'],['長','长'],['書','书'],['車','车'],['騎','骑'],['衛','卫'],
  ['驃','骠'],['鎮','镇'],['護','护'],['參','参'],['錄','录'],['時','时'],['見','见'],['為','为'],['與','与'],['於','于'],
  ['處','处'],['冊','册'],['頁','页'],['載','载'],['謂','谓'],['並','并'],['應','应'],['當','当'],['內','内'],['開','开'],
  ['屬','属'],['宮','宫'],['賈','贾'],['鄧','邓'],['黃','黄'],['龍','龙'],['簡','简'],['牘','牍'],['廟','庙'],['隱','隐'],
  ['頌','颂'],['鄭','郑'],['遊','游'],['誌','志'],['橋','桥'],['銘','铭'],['議','议'],['陳','陈'],['羨','羡'],['蔣','蒋'],
  ['凱','凯'],['誘','诱'],['尅','克'],['斷','断'],['陸','陆'],['趙','赵'],['寶','宝'],['嶠','峤'],['謝','谢'],['興','兴'],
  ['齊','齐'],['邁','迈'],['號','号'],['臨','临'],['顯','显'],['顧','顾'],['費','费'],['會','会'],['稽','稽'],['復','复'],
  ['檢','检'],['條','条'],['專','专'],['層','层'],['歸','归'],['獻','献'],['繼','继'],['承','承'],['襲','袭'],['封','封'],
]);
const normalizationSourceChars = Array.from(nameNormalization.traditional || '');
const normalizationTargetChars = Array.from(nameNormalization.simplified || '');
if (normalizationSourceChars.length !== normalizationTargetChars.length) throw new Error('人物姓名繁简映射长度不一致');
normalizationSourceChars.forEach((char, index) => charMap.set(char, normalizationTargetChars[index]));

function normalizeName(value) {
  return Array.from(compact(value).normalize('NFKC')).map(char => charMap.get(char) || char).join('');
}
function normalizePolity(value) {
  const raw = normalizeName(value).replace(/人$/, '');
  if (['东汉','后汉','汉廷','蜀汉','季汉','汉'].includes(raw)) return '汉';
  if (['曹魏','魏'].includes(raw)) return '魏';
  if (['孙吴','吴'].includes(raw)) return '吴';
  if (['西晋','东晋','晋朝','晋'].includes(raw)) return '晋';
  return raw;
}
function parseYear(value) {
  const match = compact(value).match(/(?:18|19|20|21|22|23|24|25|26|27|28|29|30|31)\d/);
  return match ? Number(match[0]) : null;
}
function rowObject(headers, values) {
  return Object.fromEntries(headers.map((header, index) => [header, values[index] == null ? '' : values[index]]));
}
async function readWorkbook(filePath, sheetName) {
  if (!fs.existsSync(filePath)) throw new Error(`附件不存在：${filePath}`);
  const bytes = fs.readFileSync(filePath);
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(filePath));
  const sheet = workbook.worksheets.getItem(sheetName);
  const used = sheet.getUsedRange();
  const values = used.values || [];
  const headers = (values[0] || []).map(compact);
  const rows = values.slice(1).map((values, index) => ({
    sourceRow: index + 2,
    values,
    raw: rowObject(headers, values),
  })).filter(item => item.values.some(value => compact(value)));
  return {
    filePath,
    fileName: path.basename(filePath),
    sha256: sha256(bytes),
    sheetName,
    range: used.address || '',
    headers,
    rows,
  };
}

const v60 = JSON.parse(fs.readFileSync(path.join(root, 'data', 'v60-person-workbook-import.json'), 'utf8'));
const sourceIndex = JSON.parse(fs.readFileSync(path.join(root, 'data', 'person-source-index.json'), 'utf8'));
const identityContext = { window: {} };
identityContext.window.window = identityContext.window;
vm.createContext(identityContext);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'person-identities.js'), 'utf8'), identityContext, { filename: 'data/person-identities.js' });
const identityApi = identityContext.window.SGZ_PERSON_IDENTITIES;
const snapshotWorkbook = await readWorkbook(snapshotWorkbookPath, '260年史实人物');
const peerageWorkbook = await readWorkbook(peerageWorkbookPath, '封爵事件库');

const v60ByName = new Map();
const knownByName = new Map();
const knownZiById = new Map();
function indexKnown(name, personId, zi = '', isV60 = false) {
  const key = normalizeName(name);
  if (!key || !personId) return;
  const target = isV60 ? v60ByName : knownByName;
  const ids = target.get(key) || new Set();
  ids.add(personId);
  target.set(key, ids);
  const all = knownByName.get(key) || new Set();
  all.add(personId);
  knownByName.set(key, all);
  if (cleanDash(zi)) knownZiById.set(personId, normalizeName(cleanDash(zi)));
}
for (const person of v60.people || []) {
  const canonicalId = identityApi.resolve(person.name, { ...person, personId: person.personId })?.personId || identityApi.canonicalPersonId(person.personId);
  [person.name, person.normalizedName, person.rawName].filter(Boolean).forEach(name => indexKnown(name, canonicalId, person.zi, true));
}
for (const person of sourceIndex.people || []) {
  const canonicalId = identityApi.resolve(person.name, { ...person, personId: person.personId })?.personId || identityApi.canonicalPersonId(person.personId);
  [person.name, ...(person.aliases || [])].filter(Boolean).forEach(name => indexKnown(name, canonicalId, '', false));
}
for (const identity of identityApi.identities || []) {
  [identity.name, ...(identity.aliases || []), ...(identity.normalizationAliases || [])].filter(Boolean).forEach(name => indexKnown(name, identity.personId, '', false));
}

function singleId(index, name) {
  const ids = index.get(normalizeName(name));
  return ids && ids.size === 1 ? [...ids][0] : '';
}
function workbookSource(workbook, row) {
  return { fileName: workbook.fileName, sha256: workbook.sha256, sheet: workbook.sheetName, row };
}

const snapshotRows = snapshotWorkbook.rows.map(({ sourceRow, raw }) => ({
  sourceRow,
  rawName: compact(raw['姓名']),
  normalizedName: normalizeName(raw['姓名']),
  zi: cleanDash(raw['表字']),
  polityRaw: cleanDash(raw['势力']),
  polity: normalizePolity(raw['势力']),
  birthplace: cleanDash(raw['籍贯']),
  residence: cleanDash(raw['驻地']),
  office: cleanDash(raw['官职']),
  family: cleanDash(raw['家族']),
}));
const snapshotGroups = new Map();
for (const row of snapshotRows.filter(item => item.normalizedName)) {
  const rows = snapshotGroups.get(row.normalizedName) || [];
  rows.push(row);
  snapshotGroups.set(row.normalizedName, rows);
}
const excludedSnapshotNames = new Set(['王族', '外族', '景耀三年']);
function snapshotIdentity(row) {
  if (!row.normalizedName) return { personId: '', disposition: '排除', reason: '空姓名行，不建立人物实体' };
  if (excludedSnapshotNames.has(row.normalizedName)) return { personId: '', disposition: '排除', reason: '非人物标题行，不建立人物实体' };
  if (/[（）()]/.test(row.rawName)) return { personId: '', disposition: '审校保留', reason: '复合歧义姓名，仅留审校态' };
  const group = snapshotGroups.get(row.normalizedName) || [row];
  const normalizedZi = normalizeName(row.zi);
  const distinctZi = new Set(group.map(item => normalizeName(item.zi)).filter(Boolean));
  const v60Id = singleId(v60ByName, row.normalizedName);
  if (group.length === 1) {
    if (v60Id) return { personId: v60Id, disposition: '合并', reason: '按唯一规范化姓名关联 V60 稳定人物 ID' };
    const existingId = singleId(knownByName, row.normalizedName);
    if (existingId) return { personId: existingId, disposition: '合并', reason: '按唯一规范化姓名关联既有稳定人物 ID' };
    return { personId: `person:snapshot260:${hash(row.normalizedName)}`, disposition: '采用', reason: '260 年快照新增确定性人物 ID' };
  }
  if (normalizedZi) {
    if (v60Id && knownZiById.get(v60Id) === normalizedZi) return { personId: v60Id, disposition: '合并', reason: '同名且表字一致，关联 V60 稳定人物 ID' };
    if (distinctZi.size === 1 && v60Id) return { personId: v60Id, disposition: '合并', reason: '重复行表字一致，关联 V60 稳定人物 ID' };
    return { personId: `person:snapshot260:${hash(`${row.normalizedName}|${normalizedZi}`)}`, disposition: '采用', reason: '同名人物按表字生成独立稳定 ID' };
  }
  if (distinctZi.size <= 1 && v60Id) return { personId: v60Id, disposition: '合并', reason: '同名重复行仅一组表字，空表字行关联 V60 稳定人物 ID' };
  if (distinctZi.size <= 1) {
    const existingId = singleId(knownByName, row.normalizedName);
    if (existingId) return { personId: existingId, disposition: '合并', reason: '同名重复行仅一组表字，空表字行关联既有稳定人物 ID' };
  }
  return { personId: `person:snapshot260:${hash(`${row.normalizedName}|row:${row.sourceRow}`)}`, disposition: '采用', reason: '仅同名而无法消歧，按原始行号生成稳定 ID' };
}

const supplementPeople = new Map();
function ensurePerson(personId, data = {}) {
  if (!personId) return null;
  if (!supplementPeople.has(personId)) supplementPeople.set(personId, {
    personId,
    name: data.name || '',
    aliases: [],
    zi: data.zi || '',
    birthplace: data.birthplace || '',
    politics: [],
    datasets: [],
    readerVisible: true,
    workbookSources: [],
  });
  const person = supplementPeople.get(personId);
  if (!person.name && data.name) person.name = data.name;
  if (!person.zi && data.zi) person.zi = data.zi;
  if (!person.birthplace && data.birthplace) person.birthplace = data.birthplace;
  if (data.polity && !person.politics.includes(data.polity)) person.politics.push(data.polity);
  if (data.dataset && !person.datasets.includes(data.dataset)) person.datasets.push(data.dataset);
  if (data.alias && data.alias !== person.name && !person.aliases.includes(data.alias)) person.aliases.push(data.alias);
  if (data.source && !person.workbookSources.some(item => item.sha256 === data.source.sha256 && item.sheet === data.source.sheet && item.row === data.source.row)) person.workbookSources.push(data.source);
  return person;
}

const snapshots260 = snapshotRows.map(row => {
  const identity = snapshotIdentity(row);
  const source = workbookSource(snapshotWorkbook, row.sourceRow);
  const record = {
    snapshotId: `snapshot260:${hash(`${snapshotWorkbook.sha256}|${row.sourceRow}`)}`,
    entityType: 'personSnapshot',
    year: 260,
    personId: identity.personId,
    name: row.normalizedName || row.rawName,
    rawName: row.rawName,
    zi: row.zi,
    polity: row.polity,
    polityRaw: row.polityRaw,
    birthplace: row.birthplace,
    residence: row.residence,
    office: row.office,
    family: row.family,
    readerVisible: Boolean(identity.personId) && !['排除', '审校保留'].includes(identity.disposition),
    disposition: identity.disposition,
    dispositionReason: identity.reason,
    workbookSource: source,
  };
  if (record.readerVisible) ensurePerson(record.personId, {
    name: record.name,
    zi: record.zi,
    birthplace: record.birthplace,
    polity: record.polity,
    dataset: 'snapshot260',
    source,
  });
  return record;
});

function recipientParts(rawValue) {
  const raw = compact(rawValue);
  if (!raw) return { people: [], reason: '受封者为空' };
  if (/[?？]|名不详|子某|郭某/.test(raw)) return { people: [], reason: '包含匿名或疑问人物' };
  if (/[／/]/.test(raw)) return { people: [], reason: '斜线并列属于复合歧义，不能判定为多人名单' };
  if (/五子|七子|二孙|诸子|子孙|幼子|一子|二子|三子|四子|四弟|子弟|十三人|若干/.test(raw)) return { people: [], reason: '群体或无名子嗣不建立人物实体' };
  const segments = raw.split('、').map(compact).filter(Boolean);
  const people = [];
  for (const segment of segments) {
    const match = segment.match(/^([^（）()]+)(?:[（(]([^）)]+)[）)])?$/);
    if (!match) return { people: [], reason: '受封者文字结构无法稳定拆分' };
    const name = normalizeName(match[1]);
    const parenthetical = normalizeName(match[2] || '');
    if (!/^\p{Script=Han}{2,6}$/u.test(name) || /之子|其子|子$/.test(name)) return { people: [], reason: '受封者不是可稳定识别的具名人物' };
    const alias = parenthetical && /^\p{Script=Han}{2,4}$/u.test(parenthetical) && !/帝|王|侯|公|子$/.test(parenthetical) ? parenthetical : '';
    people.push({ name, alias });
  }
  return { people, reason: '' };
}

const peerageEvents = [];
for (const { sourceRow, raw } of peerageWorkbook.rows) {
  const rawRecipient = compact(raw['受封者']);
  const recordId = compact(raw['记录ID']);
  const category = compact(raw['人物/记录类别']);
  const sourceCitation = compact(raw['史料出处']);
  const source = workbookSource(peerageWorkbook, sourceRow);
  let disposition = '采用';
  let dispositionReason = '';
  if (!recordId) {
    disposition = '审校保留';
    dispositionReason = '缺少原记录 ID';
  } else if (category === '非封爵记录') {
    disposition = '排除';
    dispositionReason = '原表明确标记为非封爵记录';
  } else if (category === '人物辨析（范围外）') {
    disposition = '排除';
    dispositionReason = '原表明确标记为项目时空范围外';
  } else if (!sourceCitation) {
    disposition = '审校保留';
    dispositionReason = '缺少史料出处';
  }
  const parsedRecipients = recipientParts(rawRecipient);
  if (disposition === '采用' && !parsedRecipients.people.length) {
    disposition = '审校保留';
    dispositionReason = parsedRecipients.reason || '受封者无法稳定识别';
  }
  const recipientPersonIds = [];
  const resolvedRecipients = [];
  if (disposition === '采用') {
    for (const recipient of parsedRecipients.people) {
      let personId = singleId(v60ByName, recipient.name);
      if (!personId) personId = singleId(knownByName, recipient.name);
      if (!personId) {
        const snapshotIds = new Set([...supplementPeople.values()].filter(person => normalizeName(person.name) === recipient.name).map(person => person.personId));
        if (snapshotIds.size === 1) personId = [...snapshotIds][0];
        else if (snapshotIds.size > 1) {
          disposition = '审校保留';
          dispositionReason = `同名人物“${recipient.name}”在 260 年快照中无法消歧`;
          break;
        }
      }
      if (!personId) personId = `person:peerage:${hash(recipient.name)}`;
      recipientPersonIds.push(personId);
      resolvedRecipients.push({ ...recipient, personId });
    }
  }
  if (disposition !== '采用') recipientPersonIds.length = 0;
  else resolvedRecipients.forEach(recipient => ensurePerson(recipient.personId, {
    name: recipient.name,
    alias: recipient.alias,
    polity: '魏',
    dataset: 'peerage',
    source,
  }));
  const successionRaw = cleanDash(raw['承袭/分封']);
  peerageEvents.push({
    eventId: `peerage:${recordId || hash(`${peerageWorkbook.sha256}|${sourceRow}`)}`,
    entityType: 'peerageEvent',
    sourcePersonId: compact(raw['人物ID']),
    sourceRecordId: recordId,
    recipientPersonIds: [...new Set(recipientPersonIds)],
    rawRecipient,
    grantDate: cleanDash(raw['受封时间']),
    year: parseYear(raw['受封时间']),
    officeAtGrant: cleanDash(raw['受封时官职']),
    reason: cleanDash(raw['受封原因']),
    rank: cleanDash(raw['封爵等级']),
    title: cleanDash(raw['爵号']),
    fiefHouseholds: cleanDash(raw['食邑/封国规模']),
    fief: cleanDash(raw['封地']),
    titleEvolution: cleanDash(raw['爵位沿革']),
    succession: /^\d+$/.test(successionRaw) ? '' : successionRaw,
    successionRaw,
    category,
    sourceCitation,
    readerVisible: disposition === '采用' && recipientPersonIds.length > 0,
    disposition,
    dispositionReason,
    fieldWarnings: /^\d+$/.test(successionRaw) ? ['承袭／分封字段为孤立数字，仅在审校态保留原值'] : [],
    workbookSource: source,
  });
}

const v60Ids = new Set((v60.people || []).map(person => person.personId));
const snapshotNamedRows = snapshots260.filter(item => item.rawName).length;
const snapshotVisible = snapshots260.filter(item => item.readerVisible);
const peerageVisible = peerageEvents.filter(item => item.readerVisible);
const peerageRecordIds = peerageEvents.map(item => item.sourceRecordId).filter(Boolean);
const people = [...supplementPeople.values()].map(person => ({
  ...person,
  aliases: [...new Set(person.aliases)].sort((a, b) => a.localeCompare(b, 'zh-CN')),
  politics: [...new Set(person.politics)],
  datasets: [...new Set(person.datasets)],
})).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN') || a.personId.localeCompare(b.personId));
const summary = {
  snapshotRows: snapshots260.length,
  snapshotNamedRows,
  snapshotVisibleRows: snapshotVisible.length,
  snapshotAuditRows: snapshots260.filter(item => item.disposition === '审校保留').length,
  snapshotExcludedRows: snapshots260.filter(item => item.disposition === '排除').length,
  snapshotVisiblePeople: new Set(snapshotVisible.map(item => item.personId)).size,
  peerageRows: peerageEvents.length,
  peerageSourceRecordIds: new Set(peerageRecordIds).size,
  peerageMissingRecordIds: peerageEvents.filter(item => !item.sourceRecordId).length,
  peerageVisibleEvents: peerageVisible.length,
  peerageAuditRows: peerageEvents.filter(item => item.disposition === '审校保留').length,
  peerageExcludedRows: peerageEvents.filter(item => item.disposition === '排除').length,
  peerageLinkedPeople: new Set(peerageVisible.flatMap(item => item.recipientPersonIds)).size,
  supplementPeople: people.length,
  newPersonEntities: people.filter(person => !v60Ids.has(person.personId)).length,
};

const payload = {
  schemaVersion: 'V61',
  modelId: 'sgz-v61-person-supplements',
  generatedAt: new Date().toISOString(),
  scope: '260 年人物快照与曹魏封爵独立导入；附件说明文字仅作数据和元数据，不作为执行指令',
  policy: {
    snapshotOffice: '仅作为 260 年快照文字，不自动生成任官记录',
    peerageModel: '封爵事件独立于任官、开府和官制关系',
    identity: '既有稳定 ID 优先；同名按表字和行号消歧；匿名、群体和复合歧义不建立人物实体',
    readerProjection: '读者态只显示已采用的史实字段；工作簿哈希、行号和处置原因仅审校态使用',
    ignoredSnapshotColumns: ['特技', '关系', '头像'],
  },
  workbooks: {
    snapshot260: {
      fileName: snapshotWorkbook.fileName,
      sourcePath: snapshotWorkbook.filePath,
      sha256: snapshotWorkbook.sha256,
      sheet: snapshotWorkbook.sheetName,
      range: snapshotWorkbook.range,
      columns: snapshotWorkbook.headers,
    },
    peerage: {
      fileName: peerageWorkbook.fileName,
      sourcePath: peerageWorkbook.filePath,
      sha256: peerageWorkbook.sha256,
      sheet: peerageWorkbook.sheetName,
      range: peerageWorkbook.range,
      columns: peerageWorkbook.headers,
    },
  },
  summary,
  people,
  snapshots260,
  peerageEvents,
  snapshotRowAudit: snapshots260.map(item => ({
    row: item.workbookSource.row,
    rawName: item.rawName,
    snapshotId: item.snapshotId,
    personId: item.personId,
    disposition: item.disposition,
    reason: item.dispositionReason,
  })),
  peerageRowAudit: peerageEvents.map(item => ({
    row: item.workbookSource.row,
    sourceRecordId: item.sourceRecordId,
    eventId: item.eventId,
    rawRecipient: item.rawRecipient,
    recipientPersonIds: item.recipientPersonIds,
    disposition: item.disposition,
    reason: item.dispositionReason,
  })),
};

const dataDir = path.join(root, 'data');
fs.writeFileSync(path.join(dataDir, 'v61-person-supplements.json'), `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(path.join(dataDir, 'v61-person-supplements.js'), `(function(global){\n  'use strict';\n  global.SGZ_V61_PERSON_SUPPLEMENTS=Object.freeze(${JSON.stringify(payload)});\n})(window);\n`);
console.log(JSON.stringify(summary, null, 2));
