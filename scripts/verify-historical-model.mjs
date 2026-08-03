import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data', 'map-period-registry.json'), 'utf8'));
const wuAudit = JSON.parse(fs.readFileSync(path.join(root, 'data', 'wu-import-audit.json'), 'utf8'));
const start = html.indexOf('const FACTIONS = [');
const end = html.indexOf('/* =========================================================================\n   Vue App', start);
if (start < 0 || end < 0) throw new Error('无法提取历史数据模型');

const context = {
  console,
  window: { HISTORY_MAP_REGISTRY: registry },
  document: { getElementById: () => ({ innerHTML: '' }) }
};
context.window.window = context.window;
vm.createContext(context);
new vm.Script(
  fs.readFileSync(path.join(root, 'data', 'research-model.js'), 'utf8'),
  { filename:'research-model.js' }
).runInContext(context);
new vm.Script(
  fs.readFileSync(path.join(root, 'data', 'wu-fangzhen-records.js'), 'utf8'),
  { filename:'wu-fangzhen-records.js' }
).runInContext(context);
new vm.Script(
  fs.readFileSync(path.join(root, 'data', 'shu-fangzhen-records.js'), 'utf8'),
  { filename:'shu-fangzhen-records.js' }
).runInContext(context);
new vm.Script(`${html.slice(start, end)}
globalThis.__model = {
  factions: FACTIONS,
  periods: PERIODS,
  records: normalizeFangzhenRecords(FANGZHEN_PRESETS),
  archives: FANGZHEN_ARCHIVE_DEFS,
  trees: normalizeAndValidateTrees(buildPresets())
};`, { filename: 'historical-model.js' }).runInContext(context);

const { trees, records, archives } = context.__model;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const names = (faction, type = 'office') => trees[faction][type].map(node => node.name);

assert(trees.han.office.every(node => !node.rank9), '东汉预设仍含九品官品');
assert(trees.shu.office.every(node => !node.rank9), '汉预设仍含九品官品');
assert(!names('wei').includes('刑部尚书'), '曹魏预设仍含刑部尚书');
assert(names('wei').some(name => name.includes('魏郡')), '曹魏缺少魏郡政区节点');
assert(names('wei').some(name => name.includes('许昌令')), '曹魏缺少许昌县令节点');
assert(names('han').some(name => name.includes('地方政区总览')), '东汉缺少地方政区总览');
assert(names('han').some(name => name === '别驾从事'), '东汉缺少百官志州级属官');
assert(names('jin').some(name => name.includes('司州刺史')), '西晋缺少司州政区');
assert(!names('wei').some(name => /^都督(中外|河北|幽州|雍凉|陇右|关中|荆扬益|南方|荆豫|荆州|江北|江南|豫州|扬州|淮北|青徐|青州|徐州|兖州)/.test(name)), '曹魏仍把都督辖区固化为常设层级');
assert(names('shu').includes('宗正'), '汉九卿缺少宗正');
assert(!names('wu').some(name => /^(大都督|左都护|右都护|右部督|左部督|偏将督)/.test(name)), '孙吴仍含错误的固定都督层级');
assert(names('wu').includes('廷尉') && names('wu').includes('宗正'), '孙吴九卿修订未完成');
assert(!names('jin').includes('建康令') && names('jin').includes('秣陵令／建邺令'), '西晋县制名称修订未完成');
assert(!names('tribal').includes('大都护（西域）'), '异族树仍含时代错置的大都护');
assert(!names('tribal', 'noble').some(name => /^(仟长|什长)/.test(name)), '异族爵位树仍混入军事编制');
assert(archives.some(item => item.key === 'eastjin'), '缺少东晋扩展档案');
assert(records.filter(record => record.commander === '姜维' && record.polity === '汉').length === 4, '姜维职任未拆成四段');
assert(records.some(record => record.polity === '西晋' && /跨朝|同一职任/.test(record.note || '')), '曹魏跨266年职任未拆入西晋');
assert(records.every(record => record.sourceLevel && record.confidence && record.appointmentStatus), '州镇录存在未迁移的史料状态字段');
assert(records.every(record => record.entityType==='appointment' && record.personId && record.officeId && record.jurisdictionId), '州镇录存在未迁移的统一实体关联');
assert(Object.values(trees).every(group=>['office','noble'].every(type=>group[type].every(node=>node.entityId&&node.evidence&&node.researchStatus))), '职官或爵位节点存在未迁移的研究实体字段');
const rawWuDocumentRecords = context.window.WU_FANGZHEN_RECORDS;
const wuDocumentRecords = records.filter(record => record.importBatch === 'sunwu-docx-20260801');
assert(rawWuDocumentRecords.length === 212, `孙吴文档有效记录应为 212 条，当前 ${rawWuDocumentRecords.length} 条`);
assert(wuDocumentRecords.length === 211, '陆逊荆州牧重复条应合并，档案内其余文档记录应为 211 条');
assert(records.some(record => record.commander === '陆逊' && /孙吴州郡长官考/.test(record.sourceTitle || '')), '陆逊荆州牧文档出处未合并到原记录');
assert(wuAudit.excluded.length === 7, '孙吴文档修订删除项审计必须保留 7 条');
assert(!rawWuDocumentRecords.some(record => ['范克','戴昌','孙奋'].includes(record.commander) || (record.commander === '黄盖' && record.jurisdiction === '始安郡')), '修订删除号人物任命被错误导入');
assert(wuDocumentRecords.every(record => record.sourceLocator && record.sourceExcerpt), '孙吴文档记录缺少段落定位或原文摘录');
const shuRecords = records.filter(record => record.importBatch === 'shu-commandery-prefects-screenshot-20260802');
assert(shuRecords.length === 93, `蜀汉郡守截图表应整理为 93 条，当前 ${shuRecords.length} 条`);
assert(shuRecords.every(record => record.polity === '汉' && record.recordType === 'taishou' && record.sourceTitle.includes('蜀汉郡守考')), '蜀汉郡守档案字段未统一为汉国太守档案');
assert(shuRecords.some(record => record.jurisdiction === '犍为郡'), '蜀汉郡守档案缺少犍为郡');
assert(shuRecords.some(record => record.commander === '张？' && record.appointmentStatus === '存疑'), '截图中待考人物未保留存疑状态');

console.log('历史数据模型验证通过');
console.log(`默认州镇职任：${records.length} 条；东晋扩展：${records.filter(record => record.eraGroup === 'eastjin').length} 条`);
console.log('职官、爵位、人物、任官、辖区与史料关联字段完整');
