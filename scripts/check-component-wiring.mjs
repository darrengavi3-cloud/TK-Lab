/* 组件接线校验：模板里出现的自定义标签，必须能在界面单元登记表中找到对应组件。
 *
 * 背景：模块化重构后，模板改为使用 <shihuo-workbench> 一类自定义标签，组件由
 * assets/app/ui/*-ui.js 导出、经 registerSgzUiModuleComponents 登记。此前曾出现
 * 「模板已改用自定义标签，但模块文件并未导出 ui，也未回落到约定路径」的缺陷：
 * 语法检查与单文件模板编译都能通过，运行时却无法解析标签。本脚本把这条契约
 * 变成可执行断言，防止同类问题再次发生。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const htmlPath = path.join(root, 'atlas', 'index.html');
const uiDir = path.join(root, 'atlas', 'assets', 'app', 'ui');

const fail = message => { console.error(`✗ ${message}`); process.exitCode = 1; };
const html = fs.readFileSync(htmlPath, 'utf8');

/* 一、抽出模板字面量范围：从 setup 返回体里的 template 起，到对应的结束反引号。 */
const templateStart = html.indexOf('template:');
if (templateStart < 0) fail('未找到模板字面量起点 template:');
const tickStart = html.indexOf('`', templateStart);
const tickEnd = html.lastIndexOf('`');
if (tickStart < 0 || tickEnd <= tickStart) fail('模板字面量边界异常');
const template = html.slice(tickStart + 1, tickEnd);

/* 二、模板中的所有自定义标签（含连字符，Vue 约定俗成的组件写法）。 */
const customTags = new Set();
for (const match of template.matchAll(/<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)[\s/>]/g)) {
  customTags.add(match[1]);
}

/* 三、收集界面单元实际导出的组件名。既看显式 ui 登记对象，也看导出的组件常量。 */
const registeredTags = new Set();
const kebab = name => name
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
  .toLowerCase();

const uiFiles = fs.existsSync(uiDir)
  ? fs.readdirSync(uiDir).filter(name => name.endsWith('-ui.js'))
  : [];
if (!uiFiles.length) fail(`界面单元目录为空：${path.relative(root, uiDir)}`);

for (const fileName of uiFiles) {
  const source = fs.readFileSync(path.join(uiDir, fileName), 'utf8');
  // 组件常量：export const XxxYyy = { ... } / export function XxxYyy(...)
  // 全大写下划线命名（如 SHIHUO_STATE_UPDATE_EVENT）是事件名等值常量，不是组件，需排除。
  for (const match of source.matchAll(/export\s+(?:const|function)\s+([A-Z][A-Za-z0-9]*)/g)) {
    const name = match[1];
    if (/^[A-Z0-9_]+$/.test(name)) continue;
    registeredTags.add(kebab(name));
  }
  // 登记对象：export const ui = { A, B } / = { A: X, B: Y }
  const uiObject = source.match(/export\s+const\s+ui\s*=\s*\{([\s\S]*?)\};/);
  if (uiObject) {
    for (const key of uiObject[1].split(',')) {
      const name = key.split(':')[0].trim();
      if (name) registeredTags.add(kebab(name));
    }
  }
}
registeredTags.delete('ui');

/* 四、排除非本模块的所有标签来源：
 *   1. Element Plus 组件库（el-* 前缀），由 vendor 中的插件全局注册；
 *   2. 读者共享组件（assets/app/reader-components.js 里的 SGZ_READER_COMPONENTS），
 *      在 index.html 底部独立登记，不归界面单元管辖。 */
const readerComponentsPath = path.join(root, 'atlas', 'assets', 'app', 'reader-components.js');
const readerTags = new Set();
if (fs.existsSync(readerComponentsPath)) {
  const source = fs.readFileSync(readerComponentsPath, 'utf8');
  for (const match of source.matchAll(/^\s{4}([A-Z][A-Za-z0-9]*)\s*:\s*\{/gm)) {
    readerTags.add(kebab(match[1]));
  }
}
if (!readerTags.size) fail('未能从 reader-components.js 解析出共享组件清单');
/* 逐个断言：模板用到的自定义标签都必须有登记来源。 */
const isExempt = tag => tag.startsWith('el-') || readerTags.has(tag);
const missing = [...customTags].filter(tag => !registeredTags.has(tag) && !isExempt(tag)).sort();
const unused = [...registeredTags].filter(tag => !customTags.has(tag) && tag !== 'ui').sort();

const elCount = [...customTags].filter(t => t.startsWith('el-')).length;
const readerCount = [...customTags].filter(t => readerTags.has(t)).length;
console.log(`模板自定义标签：${customTags.size} 个（Element Plus ${elCount} 个、读者共享 ${readerCount} 个已豁免）`);
console.log(`已登记组件：${registeredTags.size} 个`);
if (missing.length) {
  fail(`模板使用了未登记的组件标签：${missing.join('、')}\n  这些标签在运行时无法解析，请确认对应界面单元已导出并登记。`);
} else {
  console.log('✓ 模板中所有自定义标签均有登记来源');
}
if (unused.length) {
  console.log(`· 已登记但模板未直接使用（可能是父级转发或按需渲染）：${unused.join('、')}`);
}

/* 五、界面单元加载表校验。sgzUiUnitLoaders 里每个 import() 目标都必须真实存在，
 * 且必须是字面量路径——读者包构建靠正则静态追踪这些目标，写成拼接表达式会导致
 * 界面单元被静默漏出产物（曾实际发生）。同时要求 ui 目录下没有孤儿界面单元。 */
const loaderTable = html.match(/const sgzUiUnitLoaders\s*=\s*\{([\s\S]*?)\};/);
if (!loaderTable) {
  fail('未找到 sgzUiUnitLoaders 加载表');
} else {
  const loaderPaths = [...loaderTable[1].matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
  if (!loaderPaths.length) fail('加载表中未解析到任何 import() 字面量路径');
  const normalize = rel => rel.replace(/^\.\//, '');
  const missingFiles = loaderPaths.filter(rel => !fs.existsSync(path.join(root, 'atlas', normalize(rel))));
  if (missingFiles.length) {
    fail(`加载表引用了不存在的界面单元：\n  ${missingFiles.join('\n  ')}`);
  } else {
    console.log(`✓ 加载表 ${loaderPaths.length} 个界面单元路径均存在`);
  }
  const declared = new Set(loaderPaths.map(normalize));
  const orphans = uiFiles
    .map(name => `assets/app/ui/${name}`)
    .filter(rel => !declared.has(rel));
  if (orphans.length) fail(`界面单元目录中存在未被加载表引用的孤儿文件：${orphans.join('、')}`);
}

if (!process.exitCode) console.log('\n✓ 组件接线校验通过');
