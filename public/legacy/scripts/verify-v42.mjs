import fs from 'node:fs';
import vm from 'node:vm';

const read = file => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const html = read('index.html');
const modelSource = read('data/research-model.js');
const context = { window: {}, console };
vm.runInNewContext(modelSource, context);
const model = context.window.SGZResearchModel;

assert(model.schemaVersion === 9, 'V43 研究模型未升级到 schemaVersion 9');
const migrated = model.migrate({ schemaVersion: 7, trees: {}, seatPolicies: [{ officeId: 'office:han:shi-zhong', displayCapacity: 6 }], residences: [] });
assert(migrated.schemaVersion === 9 && migrated.seatPolicies.length === 1, '员额规则迁移失败');
assert(Array.isArray(migrated.residences), '府署数组未保持兼容');
assert(html.includes('office-seat-policies.js') && html.includes('office-residences.js'), 'V42 数据脚本未接入页面');
assert(html.includes('courtResidenceClass') && html.includes('courtSlotClick(courtActiveState.node)'), '州府点击进入府署逻辑未接入');
assert(html.includes('residence-style-du-du') && html.includes('residence-style-prince') && html.includes('courtResidenceType'), '六类府署背景映射未完整接入');
assert(html.includes('SGZ_BAIGUANZHI_STAFF') && html.includes("'州郡属官'"), '州郡属官文官分类未接入');
assert(html.includes('fullInscription') || html.includes('scope.row.inscription'), '金石释文展示未接入');
assert(html.includes("displayName:(disputed?'* ':''"), '金石争议标记未接入');
assert(fs.existsSync('templates/三国职官谱_V42_统一导入模板.xlsx'), 'V42 统一导入模板未生成');
const portraitIndex = read('data/person-portraits.js');
assert((portraitIndex.match(/src:/g)||[]).length >= 44, '现有头像资源索引异常');
console.log('V42 数据模型、员额/府署、金石展示与统一导入模板断言通过（研究模型已升级至 v9）');
