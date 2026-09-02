import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const workbookPath = process.argv[2] || '/Users/bobiaisi01/Desktop/汉末—西晋统一人物数据库（184—280）V1-第八批.xlsx';
const packagesRoot = process.env.SGZ_NODE_PACKAGES || '/Users/bobiaisi01/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const requireFromPackages = createRequire(path.join(packagesRoot, 'package.json'));
const { FileBlob, SpreadsheetFile } = requireFromPackages('@oai/artifact-tool');

const trim = value => String(value == null ? '' : value).trim();
const compact = value => trim(value).replace(/\s+/g, ' ');
const nameNormalization = JSON.parse(fs.readFileSync(path.join(root, 'data', 'person-name-normalization.json'), 'utf8'));
const tradToSimp = new Map([
  ['張','张'],['劉','刘'],['關','关'],['馬','马'],['黃','黄'],['袁','袁'],['術','术'],['紹','绍'],['譚','谭'],['熙','熙'],['尚','尚'],
  ['豐','丰'],['沮','沮'],['審','审'],['顏','颜'],['傕','傕'],['郭','郭'],['蔡','蔡'],['邕','邕'],['呂','吕'],['佈','布'],['諸','诸'],
  ['葛','葛'],['瑾','瑾'],['岱','岱'],['丁','丁'],['瑜','瑜'],['蒙','蒙'],['濬','濬'],['預','预'],['苞','苞'],['楊','杨'],['駿','骏'],
  ['華','华'],['導','导'],['郗','郗'],['鑒','鉴'],['桓','桓'],['溫','温'],['寔','寔'],['裕','裕'],['將','将'],['軍','军'],['太','太'],
  ['尉','尉'],['師','师'],['傅','傅'],['後','后'],['漢','汉'],['魏','魏'],['吳','吴'],['晉','晋'],['東','东'],['西','西'],['門','门'],
  ['闔','阖'],['廣','广'],['陽','阳'],['陰','阴'],['郡','郡'],['國','国'],['縣','县'],['鄉','乡'],['長','长'],['從','从'],['書','书'],
  ['車','车'],['騎','骑'],['衛','卫'],['驃','骠'],['鎮','镇'],['征','征'],['安','安'],['平','平'],['護','护'],['都','都'],['督','督'],
  ['別','别'],['駕','驾'],['治','治'],['功','功'],['曹','曹'],['簿','簿'],['掾','掾'],['史','史'],['參','参'],['軍','军'],['記','记'],
  ['錄','录'],['業','业'],['時','时'],['見','见'],['為','为'],['與','与'],['於','于'],['從','从'],['國','国'],['歲','岁'],['年','年'],
  ['約','约'],['餘','余'],['無','无'],['號','号'],['稱','称'],['據','据'],['發','发'],['現','现'],['資','资'],['料','料'],['來','来'],
  ['源','源'],['主','主'],['要','要'],['出','出'],['處','处'],['冊','册'],['頁','页'],['記','记'],['載','载'],['謂','谓'],['並','并'],
  ['應','应'],['當','当'],['內','内'],['外','外'],['開','开'],['府','府'],['屬','属'],['東','东'],['宮','宫'],['詹','詹'],['事','事'],
  ['賈','贾'],['逵','逵'],['麗','丽'],['與','与'],['龐','庞'],['肱','肱'],['鄧','邓'],['芝','芝'],['姜','姜'],['維','维'],['黃','黄'],
  ['龍','龙'],['甘','甘'],['梁','梁'],['休','休'],['侯','侯'],['相','相'],['涪','涪'],['陵','陵'],['簡','简'],['牘','牍'],['禹','禹'],
  ['廟','庙'],['窆','窆'],['隱','隐'],['士','士'],['程','程'],['仲','仲'],['泰','泰'],['始','始'],['祠','祠'],['堂','堂'],['頌','颂'],
  ['鄭','郑'],['袤','袤'],['遊','游'],['述','述'],['誌','志'],['馗','馗'],['妻','妻'],['王','王'],['橋','桥'],['銘','铭'],['議','议'],
  ['郎','郎'],['陳','陈'],['皋','皋'],['陽','阳'],['羨','羡'],['周','周'],['吳','吴'],['蔣','蒋'],['左','左'],['棻','棻'],['向','向'],
  ['凱','凯'],['竺','竺'],['使','使'],['益','益'],['州','州'],['刺','刺'],['平','平'],['恩','恩'],['縣','县'],['母','母'],['稚','稚'],
  ['誘','诱'],['尅','克'],['斷','断'],['陸','陆'],['喈','喈'],['徐','徐'],['霍','霍'],['趙','赵'],['氾','氾'],['寶','宝'],['孟','孟'],
  ['芝','芝'],['溫','温'],['嶠','峤'],['康','康'],['崧','崧'],['謝','谢'],['企','企'],['爨','爨'],['劉','刘'],['媚','媚'],['罐','罐'],
  ['浙','浙'],['紹','绍'],['興','兴'],['荀','荀'],['籍','籍'],['齊','齐'],['慈','慈'],['纂','纂'],['武','武'],['邈','邈'],['羊','羊'],
  ['瑾','瑾'],['邁','迈'],['號','号'],['咷','咷'],['臨','临'],['漳','漳'],['顯','显'],['略','略'],['赤','赤'],['松','松'],['政','政'],
  ['任','任'],['城','城'],['夫','夫'],['人','人'],['祥','祥'],['光','光'],['越','越'],['窯','窑'],['魯','鲁'],['潔','洁'],['婦','妇'],
  ['變','变'],['文','文'],['宋','宋'],['倉','仓'],['華','华'],['百','百'],['石','石'],['訓','训'],['造','造'],['慈','慈'],['纂','纂'],
  ['癸','癸'],['陰','阴'],['顧','顾'],['費','费'],['敷','敷'],['薛','薛'],['珝','珝'],['喻','喻'],['襜','襜'],['禪','禅'],['謶','谶'],
  ['璽','玺'],['諶','谶'],['幹','干'],['貞','贞'],['歲','岁'],['榮','荣'],['國','国'],['從','从'],['鄉','乡'],['會','会'],['稽','稽'],
  ['裴','裴'],['松','松'],['之','之'],['註','注'],['復','复'],['檢','检'],['核','核'],['條','条'],['專','专'],['層','层'],['與','与'],
]);
const normalizationSourceChars = Array.from(nameNormalization.traditional || '');
const normalizationTargetChars = Array.from(nameNormalization.simplified || '');
if (normalizationSourceChars.length !== normalizationTargetChars.length) throw new Error('人物姓名繁简映射长度不一致');
normalizationSourceChars.forEach((char, index) => tradToSimp.set(char, normalizationTargetChars[index]));
function normalizeName(value){
  return Array.from(compact(value).normalize('NFKC')).map(char => tradToSimp.get(char) || char).join('');
}
/* 附件中少数字段把封爵或官号拼入姓名；规范源保留 rawName 供审校，
   但 name／normalizedName 必须使用可注册的人物姓名，避免错误值进入人物记。 */
const personNameOverrides = new Map([
  ['陈王刘宠', '刘宠'],
  ['丁中', '丁冲'],
]);
function normalizePersonName(value){
  const normalized = normalizeName(value);
  return personNameOverrides.get(normalized) || normalized;
}
function normalizePolity(value){
  const raw = normalizeName(value);
  if (['东汉','后汉','汉','蜀汉','季汉'].includes(raw)) return ['蜀汉','季汉'].includes(raw) ? '季汉' : '汉';
  if (['曹魏','魏'].includes(raw)) return '魏';
  if (['孙吴','吴'].includes(raw)) return '吴';
  if (['西晋','东晋','晋','晋朝'].includes(raw)) return '晋';
  return raw;
}
function parseYear(value){
  const raw = compact(value);
  if (!raw || /[?？]/.test(raw)) return null;
  const match = raw.match(/-?\d{2,4}/);
  return match ? Number(match[0]) : null;
}
function hash(value){
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}
function stableSourceRecordIds(rows, headers, prefix){
  const occurrences = new Map();
  return rows.map(values => {
    const signature = JSON.stringify(headers.map((header, index) => [header, compact(values[index])]));
    const digest = hash(signature);
    const occurrence = (occurrences.get(digest) || 0) + 1;
    occurrences.set(digest, occurrence);
    return `${prefix}:${digest}${occurrence > 1 ? `:${occurrence}` : ''}`;
  });
}
function sheetValues(sheetName, workbook){
  const sheet = workbook.worksheets.getItem(sheetName);
  const used = sheet.getUsedRange();
  return { sheet, used, values: used.values || [] };
}
function rowObject(headers, row){
  return Object.fromEntries(headers.map((header, index) => [compact(header), row[index] == null ? '' : row[index]]));
}

if (!fs.existsSync(workbookPath)) throw new Error(`附件不存在：${workbookPath}`);
const workbookBytes = fs.readFileSync(workbookPath);
const workbookHash = crypto.createHash('sha256').update(workbookBytes).digest('hex');
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const peopleSheet = sheetValues('人物總表', workbook);
const sourceSheet = sheetValues('来源索引', workbook);
const peopleHeaders = peopleSheet.values[0].map(compact);
const sourceHeaders = sourceSheet.values[0].map(compact);
const peopleRows = peopleSheet.values.slice(1).filter(row => row.some(value => compact(value)));
const sourceRows = sourceSheet.values.slice(1).filter(row => row.some(value => compact(value)));
const ordinalColumn = peopleHeaders.indexOf('序號');
const peopleSourceRecordIds = peopleRows.map((values, index) => {
  const ordinal = Number(values[ordinalColumn]) || index + 1;
  return `source:v60:person:${String(ordinal).padStart(4, '0')}`;
});
const indexSourceRecordIds = stableSourceRecordIds(sourceRows, sourceHeaders, 'source:v60:index');

const v63RegistryPath = path.join(root, 'data', 'v63-person-registry.json');
const v63Registry = fs.existsSync(v63RegistryPath)
  ? JSON.parse(fs.readFileSync(v63RegistryPath, 'utf8'))
  : {};
function candidatePublicationStatus(row){
  const present = key => compact(row[key]) ? 'review-only' : 'suppressed';
  return {
    name: 'verified',
    zi: present('表字'),
    birthplace: present('籍貫'),
    birthYear: present('出生年'),
    deathYear: present('卒年'),
    dynastyTags: present('所屬勢力'),
    appointments: present('官職'),
    peerage: present('爵位'),
  };
}

const projectSource = JSON.parse(fs.readFileSync(path.join(root, 'data', 'person-source-index.json'), 'utf8'));
const identityContext = { window: {} };
identityContext.window.window = identityContext.window;
vm.createContext(identityContext);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'person-identities.js'), 'utf8'), identityContext, { filename: 'data/person-identities.js' });
const identityApi = identityContext.window.SGZ_PERSON_IDENTITIES;
const existingByName = new Map();
const projectPersonIds = new Set();
function indexExisting(name, person) {
  const key = normalizeName(name);
  if (!key || !person?.personId) return;
  const list = existingByName.get(key) || [];
  list.push(person);
  existingByName.set(key, list);
}
for (const person of projectSource.people || []) {
  const resolved = identityApi.resolve(person.name, { ...person, personId: person.personId });
  const canonicalPerson = { ...person, personId: resolved?.personId || identityApi.canonicalPersonId(person.personId) };
  projectPersonIds.add(canonicalPerson.personId);
  [person.name, ...(person.aliases || [])].forEach(name => indexExisting(name, canonicalPerson));
}
for (const identity of identityApi.identities || []) {
  const canonicalPerson = { ...identity, personId: identity.personId, visibilityStatus: 'visible' };
  [identity.name, ...(identity.aliases || []), ...(identity.normalizationAliases || [])].forEach(name => indexExisting(name, canonicalPerson));
}
const sourcesByName = new Map();
for (let index = 0; index < sourceRows.length; index += 1) {
  const row = rowObject(sourceHeaders, sourceRows[index]);
  const name = normalizePersonName(row['人物']);
  const item = { sourceRecordId: indexSourceRecordIds[index], row: index + 2, rawName: compact(row['人物']), normalizedName: name, primarySource: compact(row['主要出处']) };
  const list = sourcesByName.get(name) || [];
  list.push(item);
  sourcesByName.set(name, list);
}
const reviewedWorkbookDuplicateOrdinals = new Map([
  ['张既', [126, 506]],
  ['卫恒', [308, 1032]],
  ['唐咨', [712, 1088]],
  ['和郁', [845, 1112]],
]);
function reviewedDuplicateIdentity(normalizedName, ordinal) {
  const ordinals = reviewedWorkbookDuplicateOrdinals.get(normalizedName) || [];
  return ordinals.includes(ordinal) ? ordinals : [];
}

const people = peopleRows.map((values, index) => {
  const raw = rowObject(peopleHeaders, values);
  const rawName = compact(raw['姓名']);
  const normalizedName = normalizePersonName(rawName);
  const existing = existingByName.get(normalizedName) || [];
  const distinctExisting = Array.from(new Map(existing.map(item => [item.personId, item])).values());
  const linkedToProject = distinctExisting.length === 1 && projectPersonIds.has(distinctExisting[0].personId);
  const sourceRefs = sourcesByName.get(normalizedName) || [];
  const ordinal = Number(raw['序號']) || index + 1;
  const duplicateOrdinals = reviewedDuplicateIdentity(normalizedName, ordinal);
  const stableCandidateId = distinctExisting.length === 1
    ? distinctExisting[0].personId
    : duplicateOrdinals.length
      ? `person:workbook:${hash(`${normalizedName}|sources:${duplicateOrdinals.map(value => `source:v60:person:${String(value).padStart(4, '0')}`).join(',')}`)}`
    : `person:workbook:${hash(`${normalizedName}|${peopleSourceRecordIds[index]}`)}`;
  // 旧算法只用于兼容查找；正式 ID 由 sourceRecordId 在 V63 注册表中冻结。
  const legacyRowPersonId = distinctExisting.length === 1
    ? distinctExisting[0].personId
    : duplicateOrdinals.length
      ? `person:workbook:${hash(`${normalizedName}|rows:${duplicateOrdinals.map(value => value + 1).join(',')}`)}`
      : `person:workbook:${hash(`${normalizedName}|${index + 2}`)}`;
  const canonicalId = v63Registry.sourceRecordToCanonical?.[peopleSourceRecordIds[index]]
    || v63Registry.legacyToCanonical?.[legacyRowPersonId]
    || v63Registry.legacyToCanonical?.[stableCandidateId]
    || stableCandidateId;
  const homonymStatus = duplicateOrdinals.length
    ? `附件异体／重复行已归并（序号 ${duplicateOrdinals.join('、')}）；史实字段仍待原典核验`
    : distinctExisting.length > 1 || sourceRefs.length > 1
    ? '同名或来源行重复，需按原典语境消歧'
    : '附件候选，尚未完成项目级身份核验';
  return {
    personId: canonicalId,
    canonicalPersonId: canonicalId,
    legacyPersonIds: [...new Set([legacyRowPersonId, stableCandidateId].filter(personId => personId && personId !== canonicalId))],
    sourceRecordId: peopleSourceRecordIds[index],
    name: normalizedName || rawName,
    rawName,
    normalizedName,
    zi: compact(raw['表字']),
    birthplace: compact(raw['籍貫']),
    birthYearRaw: compact(raw['出生年']),
    birthYear: parseYear(raw['出生年']),
    deathYearRaw: compact(raw['卒年']),
    deathYear: parseYear(raw['卒年']),
    polityRaw: compact(raw['所屬勢力']),
    polity: normalizePolity(raw['所屬勢力']),
    officeRaw: compact(raw['官職']),
    titleRaw: compact(raw['爵位']),
    ordinal,
    workbookSource: { fileName: path.basename(workbookPath), sha256: workbookHash, sheet: '人物總表', row: index + 2 },
    sourceRefs,
    homonymGroupId: `workbook-name:${hash(normalizedName || rawName)}`,
    homonymStatus,
    readerVisible: true,
    readerEligibility: linkedToProject ? 'eligible' : 'audit-only',
    researchDisposition: '存疑',
    candidateReason: linkedToProject ? '与现有项目人物实体按规范化姓名关联；不新增任官记录' : (distinctExisting.length === 1 ? '与稳定身份表关联，但附件字段仍待原典核验；不新增任官记录' : '来自附件人物总表，尚未完成原典级身份核验'),
    publicationStatus: candidatePublicationStatus(raw),
  };
});

const sourceIndex = sourceRows.map((values, index) => {
  const raw = rowObject(sourceHeaders, values);
  return {
    sourceRecordId: indexSourceRecordIds[index],
    row: index + 2,
    rawName: compact(raw['人物']),
    normalizedName: normalizePersonName(raw['人物']),
    primarySource: compact(raw['主要出处']),
    workbookSource: { fileName: path.basename(workbookPath), sha256: workbookHash, sheet: '来源索引', row: index + 2 },
  };
});
const summary = {
  workbookPeople: people.length,
  workbookSourceRows: sourceIndex.length,
  uniquePersonEntities: new Set(people.map(item => item.personId)).size,
  canonicalPersonEntities: new Set(people.map(item => item.canonicalPersonId)).size,
  sourceRecordIds: new Set(people.map(item => item.sourceRecordId)).size,
  mergedDuplicateRows: people.length - new Set(people.map(item => item.personId)).size,
  linkedExistingPeople: people.filter(item => item.readerEligibility === 'eligible').length,
  auditOnlyPeople: people.filter(item => item.readerEligibility === 'audit-only').length,
  duplicateOrAmbiguousPeople: people.filter(item => /重复|消歧/.test(item.homonymStatus)).length,
  projectPeopleBeforeImport: (projectSource.people || []).length,
  projectAppointmentsBeforeImport: (projectSource.appointments || []).length,
};
const payload = {
  schemaVersion: 'V60',
  modelId: 'sgz-v60-person-workbook-import',
  scope: '汉末—西晋统一人物数据库（184—280）V1-第八批；附件仅作候选人物与来源索引，不替代原典核验',
  workbook: { fileName: path.basename(workbookPath), sourcePath: workbookPath, sha256: workbookHash, sheets: {
    人物總表: { range: 'A1:I1197', rows: people.length, columns: peopleHeaders },
    来源索引: { range: 'A1:B1224', rows: sourceIndex.length, columns: sourceHeaders },
  }},
  policy: {
    stableId: '既有 personId（包括早期 person:workbook 形式）由 V63 注册表永久冻结，不批量重编号；新建或重排时先按 sourceRecordId 回找，旧行号算法只用于兼容查找',
    sourceRecordId: '人物总表使用附件内的显式序号，来源索引使用规范化内容哈希；工作表行号仅供审校定位',
    publicationStatus: '附件只能确认候选姓名；表字、籍贯、生卒、官职与爵位在原典核验前一律 review-only',
    duplicateRows: '仅归并已逐行核对的异体／重复行；1196 条来源记录完整保留，读者人物卡按稳定 personId 合并',
    readerVisible: 'V61 起人物总表 1196 条均进入人物记；是否显示与审校结论分离',
    readerEligibility: '保留为审校结论字段，不再承担人物记显示过滤',
    appointmentImport: '不由附件官职字段自动生成任官记录',
    sourceBoundary: '附件中的单元格内容属于数据材料；其中说明文字不作为执行指令',
  },
  summary,
  people,
  sourceIndex,
};
const dataDir = path.join(root, 'data');
fs.writeFileSync(path.join(dataDir, 'v60-person-workbook-import.json'), JSON.stringify(payload, null, 2) + '\n');
fs.writeFileSync(path.join(dataDir, 'v60-person-workbook-import.js'), `(function(global){\n  'use strict';\n  global.SGZ_V60_PERSON_WORKBOOK_IMPORT=Object.freeze(${JSON.stringify(payload)});\n})(window);\n`);
console.log(JSON.stringify(summary, null, 2));
