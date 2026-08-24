import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(`V54 校验失败：${message}`); };
function load(file, name) {
  const context = { window: {} };
  vm.runInNewContext(read(file), context, { filename: file });
  return context.window[name];
}

const html = read('index.html');
const portablePath = path.join(root, 'exports', '三国职官谱-单文件版.html');
const portable = fs.existsSync(portablePath) ? fs.readFileSync(portablePath, 'utf8') : '';
const portableBytes = fs.existsSync(portablePath) ? fs.statSync(portablePath).size : 0;
const policy = load('data/office-order-policies.js', 'SGZ_OFFICE_ORDER_POLICIES');
const titles = load('data/general-titles.js', 'SGZ_GENERAL_TITLES');

assert(Number(policy.schemaVersion) >= 1, '官职序位政策版本缺失');
assert(policy.commonCourtOrder.wei['侍中'] < policy.commonCourtOrder.wei['散骑常侍']);
assert(policy.commonCourtOrder.wei['散骑常侍'] < policy.commonCourtOrder.wei['黄门侍郎']);
assert(policy.commonCourtOrder.wei['黄门侍郎'] < policy.commonCourtOrder.wei['给事中']);
assert(policy.hiddenCourtCategories.includes('其他') && policy.hiddenCourtNames.includes('其他官署'), '其他官署未列入朝堂隐藏政策');
assert(policy.departmentOrder.includes('秘书省') && policy.departmentOrder.indexOf('常伯') < policy.departmentOrder.indexOf('秘书省'), '秘书省与常伯分组顺序缺失');

assert(html.includes('office-order-policies.js'), '主站未加载 V54 官职序位政策');
assert(html.includes('generalTitleSortOrder') && html.includes('const general=Number(node?.generalTitleSortOrder)'), '朝堂未读取动态将军名号排序');
assert(html.includes('courtDepartmentLabel(node,currentFaction.value)'), '朝堂未使用显式官署分组策略');
assert(!html.includes('||\'其他官署\''), '朝堂仍保留其他官署兜底显示');
assert(!/v-model="(peopleQuery|battleQuery|fangzhenQuery|epigraphicQuery|shihuoQuery)"/.test(html), '模块页仍存在重复检索输入框');
assert(html.includes('global-header-tools') && html.includes('打开全局检索'), '全局检索入口未固定到顶部');
assert(html.includes('paletteKeydown($event)') && html.includes('if(event?.isComposing) return'), '统一检索 Enter 未处理中文输入法组合态');
assert(html.includes('global-search-clear') && html.includes('清除检索内容'), '统一检索缺少应用内清空按钮');
assert(html.includes('data-sgz-theme') && html.includes('setDensity') && html.includes('setMotion'), '主题、密度与动效切换未接入');
assert(html.includes('prefers-reduced-motion') && html.includes('--v54-motion'), '减少动效契约未接入运行时样式');
assert(html.includes('themeOptions') && html.includes('兰台清昼') && html.includes('朱批纸本') && html.includes('青灯夜校'), '三套 V54 主题未登记');
assert(html.includes('generatedPattern:Boolean(title.generatedPattern)'), '模板生成名号未保留审校标记');

for (const group of titles.groups) {
  assert(group.titles.every(item => item.serviceDomain === '武官' && item.institutionType === '朝廷机关'), `${group.label}存在未标为武官的名号`);
  assert(group.titles.every(item => Number.isFinite(Number(item.sortOrder)) && item.rankGroup), `${group.label}名号缺少等级排序字段`);
  assert(new Set(group.titles.map(item => item.title)).size === group.titles.length, `${group.label}存在重复名号`);
}
const shu = titles.groups.find(group => group.polity === 'shu');
assert(shu && shu.titles.some(item => item.title === '征西将军' && item.evidence === '待考' && item.generatedPattern === true), '季汉四方模板名号未保留待考标记');
assert(shu && shu.titles.some(item => item.title === '中郎将系统'), '季汉审校层仍保留中郎将系统原始记录');

assert(portable.includes('SGZ_OFFICE_ORDER_POLICIES') && portable.includes('global-header-tools'), '便携版未同步 V54 政策与全局检索样式');
assert(portable.includes('Object.values(window.SGZ_PERSON_PORTRAITS||{})'), '便携版未使用单份默认立绘映射');
assert(portableBytes > 0 && portableBytes < 100 * 1024 * 1024, `便携版体积 ${portableBytes} 字节，超过 100 MiB 发布门禁`);

console.log(JSON.stringify({
  version: 'V54',
  court: { weiChangbo: ['侍中','散骑常侍','黄门侍郎','给事中'], hiddenOtherCourt: true },
  search: { unifiedEntry: true, moduleInputsRemoved: true, imeSafe: true, explicitClear: true },
  themes: ['兰台清昼','朱批纸本','青灯夜校'],
  generalTitles: Object.fromEntries(titles.groups.map(group => [group.polity, group.titles.length])),
  portable: { ready: Boolean(portable), bytes: portableBytes },
  checks: 'passed'
}, null, 2));
