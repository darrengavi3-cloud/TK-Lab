import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function load(files, names) {
  const context = { window: {}, console };
  context.globalThis = context;
  vm.createContext(context);
  files.forEach(file => vm.runInContext(read(file), context, { filename: file }));
  return Object.fromEntries(names.map(name => [name, context.window[name]]));
}

const { SGZ_PERSON_SOURCE_INDEX: source, SGZ_PERSON_ENTITY_AUDIT: entityAudit, SGZ_JINSHI_SCHEMA: schema, SGZ_PERSON_PORTRAIT_MANIFEST: manifest, SGZ_V48_PORTRAIT_BOARD: board, SGZ_EPIGRAPHIC_V46_JIN: jin } = load(
  ['data/person-source-index.js', 'data/person-entity-audit.js', 'data/jinshi-schema.js', 'data/portrait-manifest.js', 'data/v48-portrait-board.js', 'data/epigraphic-v46-jin.js'],
  ['SGZ_PERSON_SOURCE_INDEX', 'SGZ_PERSON_ENTITY_AUDIT', 'SGZ_JINSHI_SCHEMA', 'SGZ_PERSON_PORTRAIT_MANIFEST', 'SGZ_V48_PORTRAIT_BOARD', 'SGZ_EPIGRAPHIC_V46_JIN']
);
const audit = json('data/person-entity-audit.json');

const badNames = ['豐雖宿', '都护', '扶波', '扶风', '桂林', '贵阳', '江阳', '公表权', '国硃寓', '海鹽', '懷義', '胡业亦', '黄琬代', '曹爽请', '曹爽引', '别部', '别驾', '常侍大', '牧辽东', '车骑', '左车骑', '右车骑', '车骑大', '伏波', '平北', '平狄', '安东', '安北', '平东', '越骑'];
const defaultPeople = source.people.filter(item => item.includeInDefault === true);
assert(defaultPeople.every(item => item.entityType === 'person' && item.visibilityStatus === 'visible'), '默认人物存在未通过实体门禁的记录');
assert(new Set(defaultPeople.map(item => item.personId)).size === defaultPeople.length, '默认人物 personId 重复');
assert(new Set(defaultPeople.map(item => item.name)).size === defaultPeople.length, '默认人物规范姓名重复');
assert(badNames.every(name => !defaultPeople.some(item => item.name === name || (item.aliases || []).includes(name))), '已知错误姓名仍进入默认人物记');
assert(source.appointments.filter(item => item.includeInDefault === true).every(item => item.entityType === 'person' && item.visibilityStatus === 'visible'), '默认任官记录存在非人物实体');
assert(audit.normalizations.some(item => item.rawName === '豐雖宿' && item.canonicalName === '李丰'), '豐雖宿未按出处规范化');
assert(audit.normalizations.some(item => item.rawName === '胡业亦' && item.canonicalName === '胡业'), '胡业亦未按出处规范化');
assert(audit.normalizations.some(item => item.rawName === '黄琬代' && item.canonicalName === '黄琬'), '黄琬代未按出处规范化');
assert(audit.normalizations.some(item => item.rawName === '公表权' && item.canonicalName === '孙权'), '公表权未按出处规范化');
assert(audit.normalizations.some(item => item.rawName === '国硃寓' && item.canonicalName === '朱寓'), '国硃寓未按出处规范化');
assert(audit.normalizations.some(item => item.rawName === '賁九江' && item.canonicalName === '孙贲'), '賁九江未按出处规范化为孙贲');
assert(audit.normalizations.some(item => item.rawName === '公女曼' && item.canonicalName === '曹曼'), '公女曼未按出处规范化为曹曼');
assert(audit.normalizations.some(item => item.rawName === '康代' && item.canonicalName === '韦康'), '康代未按出处规范化为韦康');
const feiYi = source.appointments.filter(item => item.name === '费祎');
assert(feiYi.length > 0 && new Set(feiYi.map(item => item.personId)).size === 1, '费祎跨段任官未合并');

assert(board.count === 50 && board.records.length === 50, 'V48 设计板不是 50 人');
const mappedBoard = board.records.map(item => {
  const mapped = manifest.byName?.[item.name];
  return { item, mapped };
});
assert(mappedBoard.every(item => item.mapped && item.mapped.designRef), '存在未写入 production manifest 的 Figma 设计人物');
assert(mappedBoard.every(item => ['ready', 'designOnly'].includes(item.mapped.status)), '设计人物状态未区分 ready/designOnly');
assert((manifest.summary?.designOnlyPortraits || 0) > 0, 'manifest 未统计 designOnly 立绘');
assert((manifest.summary?.figmaBoardMapped || 0) === 50, 'Figma 设计板映射数量不是 50');
assert(Object.values(manifest.byPersonId || {}).every(item => item.src && item.interfaceOnly === true), '立绘 manifest 存在无资源或缺界面声明的条目');

assert(schema.schemaVersion === 'V49' && schema.columns.length >= 10, '金石录字段契约缺失');
assert(new Set(schema.columns.map(item => item.key)).size === schema.columns.length, '金石录表头字段重复');
assert(schema.columns.every(item => item.label && item.sourceField), '金石录表头缺少 sourceField 映射');
const normalizedJin = jin.records.map(record => schema.normalize(record));
assert(normalizedJin.every(record => record.entityType === 'epigraphicRecord' && record.name && record.materialType && record.dateText), '金石录记录未投影到 V49 字段');
assert(normalizedJin.every(record => typeof record.inscription === 'string'), '金石录释文字段不是字符串');
const jinAudit = json('data/v46-jinshi-audit.json');
assert(jinAudit.strikeParagraphCount === 31 && jinAudit.excludedStrikethrough.length === 31, '金石录删除线审计基线异常');
assert(normalizedJin.every(record => !/伪刻|伪碑/.test(record.name)), '明显伪刻记录进入晋金石运行数据');

const html = read('index.html');
assert(html.includes('./data/person-entity-audit.js') && html.includes('./data/jinshi-schema.js'), 'V49 审计/金石 schema 未接入主页面');
assert(html.includes('personEntityAllowed') && html.includes('personCanonicalNameFor'), '人物实体门禁未接入人物注册表');
assert(html.includes('prop="materialType"') && html.includes('scope.row.dateText') && html.includes('scope.row.findspot'), '金石表格仍使用旧字段表头');
const portablePath = path.join(root, 'exports', '三国职官谱-单文件版.html');
if (fs.existsSync(portablePath)) {
  const portable = fs.readFileSync(portablePath, 'utf8');
  assert(portable.includes('SGZ_PERSON_ENTITY_AUDIT') && portable.includes('SGZ_JINSHI_SCHEMA'), '便携版未内嵌 V49 数据契约');
}

console.log(JSON.stringify({
  version: 'V49',
  people: { source: source.people.length, default: defaultPeople.length, normalized: audit.summary.normalizedAppointments, excluded: audit.summary.excludedAppointments },
  portraits: { board: board.count, ready: manifest.summary.specificPortraits, designOnly: manifest.summary.designOnlyPortraits, fallback: manifest.summary.fallbackPortraits },
  jinshi: { records: normalizedJin.length, columns: schema.columns.length, strikeParagraphs: jinAudit.strikeParagraphCount },
  checks: 'passed'
}, null, 2));
