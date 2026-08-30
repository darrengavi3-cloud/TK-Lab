import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const sha256 = relative => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

function runtime(relative, globalName) {
  const context = { window: {} };
  context.globalThis = context.window;
  vm.createContext(context);
  new vm.Script(read(relative), { filename: relative }).runInContext(context, { timeout: 20_000 });
  return context.window[globalName];
}

const html = read('index.html');
const modulesCss = read('assets/ui/modules.css');
const hanRecords = runtime('data/han-bai-guan-zhi.js', 'SGZ_HAN_BAI_GUAN_ZHI');
const residences = runtime('data/office-residences.js', 'SGZ_OFFICE_RESIDENCES');

/* 本轮只改后汉呈现层，不迁移或重写规范数据。 */
assert(sha256('data/han-bai-guan-zhi.js') === 'cd7137a267d0d5f93fbf2b5948be4df294d5b84b148ef8ac71ccb20152e32613', '后汉百官志规范数据哈希发生变化');
assert(sha256('data/office-residences.js') === '676f464e6198ccb233fd13d5286b129c34b22567c20684859dcc671a4842a41c', '府署规范数据哈希发生变化');
assert(sha256('data/kaifu-policies.js') === '42706e833f23ff23d9c5d40a84624f108ba194b424211f55e536b08c33966903', '开府政策规范数据哈希发生变化');
assert(hanRecords?.records?.length === 52, `后汉百官志记录不是 52 条：${hanRecords?.records?.length || 0}`);
assert(hanRecords.records.filter(row => row.hidden).length === 3, '后汉百官志隐藏制度锚点不是 3 条');

/* 后汉走专属投影，其他政权继续使用原通用朝堂模板。 */
const specialStart = html.indexOf('v-if="currentFaction===\'han\'&&courtHierarchy.root" class="han-court-canvas"');
const genericStart = html.indexOf('v-else-if="courtHierarchy.root" class="court-canvas"', specialStart);
assert(specialStart >= 0, '缺少后汉专属官职结构图分支');
assert(genericStart > specialStart, '其他政权的通用朝堂模板未保留为 v-else-if 分支');
const hanTemplate = specialStart >= 0 && genericStart > specialStart ? html.slice(specialStart, genericStart) : '';
assert(hanTemplate.includes('后汉官职结构') && hanTemplate.includes('《后汉书·百官志》'), '后汉结构图缺少规范题头');
assert(!hanTemplate.includes('游戏模式') && !hanTemplate.includes('游戏转化') && !hanTemplate.includes('忠诚'), '引用对话中的游戏化内容进入史实界面');
assert(!hanTemplate.includes('v-html'), '后汉结构图出现数据驱动 HTML 注入');
assert(!/<article[^>]+(?:@click|role="button")/.test(hanTemplate), '后汉结构图仍使用可点击 article 代替原生按钮');

const expectedSections = ['han-court-core', 'han-court-nine', 'han-court-secretariat', 'han-court-military', 'han-court-east-palace', 'han-court-local'];
assert(expectedSections.every(id => html.includes(`{id:'${id}'`) && hanTemplate.includes(`id="${id}"`)), '后汉功能导航与结构分区没有一一对应');
assert((hanTemplate.match(/v-if="hanCourtActiveSection==='han-court-/g) || []).length === 5, '专题区没有按当前选项单一展开');
assert(html.includes("const core=take(['太傅','太尉','司徒','司空','大将军'])"), '辅政与公位没有固定为太傅、三公和大将军');
for (const [id, names] of [
  ['ritual', ['太常', '大鸿胪', '宗正']],
  ['palace', ['光禄勋', '卫尉', '太仆']],
  ['governance', ['廷尉', '大司农', '少府']],
]) {
  const source = `{id:'${id}',label:`;
  const start = html.indexOf(source);
  const row = start >= 0 ? html.slice(start, start + 180) : '';
  assert(start >= 0 && names.every(name => row.includes(`'${name}'`)), `九卿${id}分组缺项或顺序错误`);
}
assert((hanTemplate.match(/class="han-nine-group"/g) || []).length === 1, '九卿模板不是单一数据驱动分组');
assert(hanTemplate.includes('v-if="workspaceMode!==\'review\'" id="han-court-detail"'), '审校态未让位给既有证据案卷，可能形成四列布局');
assert(html.includes("node.customTags||[]).includes('东汉百官志补录')&&status&&status!=='确定'"), '读者态没有隔离未确定的后汉补录节点');
assert(html.includes("publication&&publication!=='verified'"), '后汉读者投影没有拒绝明确标为非发布态的官位');
assert(html.includes("record.researchStatus==='确定'||window.SGZ_READER_BUILD===true") && html.includes("officePublicationStatus:published?'verified':'review-only'"), '《百官志》读者包剥离审校字段后没有保留构建期发布结论');

/* 东宫必须复用已核府署记录；虚拟太子不得写进树或保存历史。 */
const eastPalace = residences.find(record => record.id === 'residence:han:east-palace');
assert(eastPalace?.roles?.length === 10, `汉东宫府属不是 10 项：${eastPalace?.roles?.length || 0}`);
assert(html.includes("find(record=>record.id==='residence:han:east-palace')"), '东宫摘要没有复用规范府署记录');
assert(html.includes('activeCourtResidenceVirtual') && html.includes('node.virtualSlot?node:null'), '虚拟太子不能进入既有东宫府属视图');
assert(!/hanCourt(?:Query|ActiveSection)[\s\S]{0,120}(?:createNamedVersionSnapshot|patchLogPayload)/.test(html), '后汉纯界面状态被写入规范数据或保存快照');

/* 可用性与响应式契约。 */
for (const selector of ['.han-court-layout', '.han-court-nav', '.han-court-detail', '.han-nine-grid', '.han-office-chip-grid', '.han-court-detail-backdrop']) {
  assert(modulesCss.includes(selector), `缺少后汉结构图样式：${selector}`);
}
assert(modulesCss.includes('.han-court-layout.review-mode') && modulesCss.includes('@media (max-width: 760px)'), '审校态或移动端布局契约缺失');
assert(!hanTemplate.includes('type="search"') && html.includes('class="global-search-trigger"'), '后汉模块内仍有第二套检索入口');
assert(hanTemplate.includes(':aria-pressed=') && !hanTemplate.includes('@click="selectHanCourtNode(courtHierarchy.root'), '官位选择语义或皇帝结构节点不正确');
assert(hanTemplate.includes("viewportWidth<=760?'dialog':'complementary'") && hanTemplate.includes('@keydown="handleHanCourtDetailKeydown"'), '移动端详情缺少对话框或键盘契约');
assert(hanTemplate.includes('<teleport to="body" :disabled="viewportWidth>760">'), '移动详情没有脱离工作台层叠上下文，可能被顶栏遮挡');
assert(html.includes("event.key==='Escape'") && html.includes('hanCourtDetailTrigger') && html.includes('showHanCourtDetail.value=true'), '移动详情缺少焦点恢复或 Escape 关闭');
assert(!/function selectHanCourtNode\([^)]*\)[\s\S]{0,320}getElementById\('han-court-detail'\)/.test(html), '桌面官位点击仍强制移动到详情焦点');
assert(hanTemplate.includes('进入州镇表') && hanTemplate.includes("switchModule('fangzhen')"), '地方行政专题缺少稳定跨模块入口');

if (failures.length) {
  console.error(`后汉官职结构图验收失败（${failures.length} 项）：`);
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exit(1);
}

console.log('后汉官职结构图验收通过：规范数据未改，单一专题、东宫府属、全局检索边界与移动详情契约完整。');
