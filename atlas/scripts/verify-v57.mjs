import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(decodeURIComponent(new URL('..', import.meta.url).pathname));
const dataDir = path.join(root, 'data');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function loadGlobal(file) {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dataDir, file), 'utf8'), context, { timeout: 10000, filename: file });
  return Object.fromEntries(Object.entries(context).filter(([key]) => key.startsWith('SGZ_')));
}

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const { SGZ_PERSON_SOURCE_INDEX: source } = loadGlobal('person-source-index.js');
const { SGZ_PERSON_V57_RUNTIME_RULES: rules } = loadGlobal('person-v57-runtime-rules.js');
const { SGZ_PERSON_ENTITY_AUDIT: audit } = loadGlobal('person-entity-audit.js');
const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'portrait-manifest.json'), 'utf8'));
const modelSource = fs.readFileSync(path.join(dataDir, 'research-model.js'), 'utf8');

assert(indexHtml.includes('./assets/ui/v57.css'), 'index.html 未加载 V57 UI 令牌样式');
assert(indexHtml.includes('>检索</span>'), '顶栏缺少紧凑“检索”入口');
assert(!indexHtml.includes('检索本页'), '活动页面仍包含“检索本页”');
assert(!indexHtml.includes('go.js'), '活动页面仍加载 GoJS 运行时');
assert(!indexHtml.includes('id="goCanvas"'), '活动模板仍包含 GoJS 画布');
assert(indexHtml.includes('title="检索"'), '检索面板标题未收束为“检索”');
assert(indexHtml.includes('v57-appearance-popover'), '外观浮层未接入');
assert(indexHtml.includes('shihuoView'), '食货志缺少互斥视图状态');
for (const label of ['制度', '编年', '户口物价']) assert(indexHtml.includes(`>${label}</button>`), `食货志缺少${label}视图`);
assert(!indexHtml.includes('全部层级'), '金石录仍暴露档案层级筛选');
assert(indexHtml.includes("archiveKind"), '金石内部 archiveKind 字段被错误删除');
assert(indexHtml.includes("courtSlotKey(node)==='太子'"), '朝堂太子槽位未规范化');
assert(indexHtml.includes('courtDisplayName'), '朝堂缺少太子显示兼容层');
assert(!indexHtml.includes('办公谱'), '发现异常模块文案');
for (const field of ['evidenceStatus', 'reviewState', 'uncertaintyReason', 'readerVisibility']) assert(modelSource.includes(field), `研究模型缺少 ${field}`);

const people = Array.isArray(source.people) ? source.people : [];
const appointments = Array.isArray(source.appointments) ? source.appointments : [];
const personIds = new Set();
const appointmentPersonIds = new Set(appointments.map(row => row.personId));
for (const person of people) {
  assert(person.entityType === 'person' && person.visibilityStatus === 'visible', `活动人物存在非可见实体：${person.name}`);
  assert(person.personId && !personIds.has(person.personId), `人物 personId 重复：${person.personId}`);
  personIds.add(person.personId);
  assert(appointmentPersonIds.has(person.personId), `人物缺少有效任官／关系：${person.name}`);
}
const blocked = new Set([...(rules.blockedNames || []), ...Object.keys(audit.exclusions || {})]);
for (const row of [...people, ...appointments]) {
  const names = [row.name, row.rawName, ...(Array.isArray(row.aliases) ? row.aliases : [])].filter(Boolean);
  assert(!names.some(name => blocked.has(name)), `活动数据仍含误识别名：${names.join('/')}`);
}
assert(Object.keys(audit.exclusions || {}).length === 0, 'V57 活动审计仍残留排除人物记录');
assert(manifest.defaultPersonIds.length === people.filter(row => row.includeInDefault === true).length, '立绘默认人物索引与源索引数量不一致');
for (const personId of manifest.defaultPersonIds) assert(manifest.byPersonId?.[personId], `默认人物缺少立绘映射：${personId}`);

const shihuoCss = fs.readFileSync(path.join(root, 'assets/ui/v57.css'), 'utf8');
assert(shihuoCss.includes('.shihuo-workbench .battle-metrics'), '食货统计卡未收束');
assert(shihuoCss.includes('.v57-appearance-popover'), '外观浮层样式缺失');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, people: people.length, appointments: appointments.length, defaultPeople: manifest.defaultPersonIds.length, portraitsIndexed: Object.keys(manifest.byPersonId || {}).length }, null, 2));
}
