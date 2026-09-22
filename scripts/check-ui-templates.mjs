/**
 * 界面单元模板编译校验。
 *
 * 目的：atlas/assets/app/ui/*.js 里的 template 是字符串，JS 语法检查无法发现
 * 标签未闭合、属性重复等模板层错误。本脚本用本地 vendored 的 Vue 全局构建
 * （含运行时编译器）实际编译每个模板，编译失败即报错。
 *
 * 同时校验登记契约：
 *   - 每个 ui 单元必须是带 name 与 template 的对象
 *   - 每个导出组件的 name 必须唯一，避免 app.component 覆盖
 *
 * 用法：node scripts/check-ui-templates.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const uiDir = path.join(root, 'atlas', 'assets', 'app', 'ui');
const vuePath = path.join(root, 'atlas', 'assets', 'vendor', 'vue', 'vue.global.min.js');

if (!fs.existsSync(vuePath)) {
  console.error(`✗ 未找到 Vue 运行时：${vuePath}`);
  process.exit(1);
}

/* 在干净的 vm 上下文里加载 Vue 全局构建，仅取 compile 能力。
   Vue 的浏览器构建把实体解码委托给 DOM（compiler-dom 的 decodeEntities）：
     const el = cachedDiv || (cachedDiv = document.createElement('div'));
     attr ? (el.innerHTML = `<div foo="${v}">`, el.children[0].getAttribute('foo'))
          : (el.innerHTML = v, el.textContent)
   因此替身必须支持 innerHTML 解析、textContent 读取、children 与 getAttribute。
   这里用极简解析器模拟，只为让实体解码走通，不参与真实渲染。 */
const decodeTable = {
  'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'", 'nbsp': '\u00a0',
  'middot': '·', 'hellip': '…', 'mdash': '—', 'ndash': '–', 'times': '×',
};
const decodeEntities = text => String(text).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (all, body) => {
  if (body[0] === '#') {
    const code = body[1] === 'x' || body[1] === 'X'
      ? parseInt(body.slice(2), 16)
      : parseInt(body.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : all;
  }
  return Object.prototype.hasOwnProperty.call(decodeTable, body) ? decodeTable[body] : all;
});
/** 从 innerHTML 字符串里解析出直接子元素，供 decodeEntities 的 attr 分支读取。 */
const parseChildElements = html => {
  const children = [];
  const tagRe = /<([a-zA-Z][\w-]*)((?:\s+[\w:-]+\s*=\s*"[^"]*")*)\s*\/?>/g;
  let match;
  while ((match = tagRe.exec(html))) {
    const attrs = {};
    const attrRe = /([\w:-]+)\s*=\s*"([^"]*)"/g;
    let attr;
    while ((attr = attrRe.exec(match[2] || ''))) attrs[attr[1]] = decodeEntities(attr[2]);
    children.push({
      getAttribute: name => (Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null),
      style: {}, setAttribute() {}, appendChild() {}, removeChild() {},
      addEventListener() {}, removeEventListener() {},
      get innerHTML() { return ''; }, set innerHTML(value) { void value; },
      get textContent() { return ''; },
      get children() { return []; },
    });
  }
  return children;
};
const stubElement = () => {
  let html = '';
  let childCache = null;
  return {
    style: {}, setAttribute() {}, appendChild() {}, removeChild() {},
    addEventListener() {}, removeEventListener() {},
    getAttribute() { return null; },
    get innerHTML() { return html; },
    set innerHTML(value) { html = String(value); childCache = null; },
    get textContent() { return decodeEntities(html); },
    set textContent(value) { html = String(value); childCache = null; },
    get children() { return childCache || (childCache = parseChildElements(html)); },
  };
};
const sandbox = {
  console, setTimeout, clearTimeout, queueMicrotask,
  document: {
    createElement: stubElement,
    createTextNode: () => ({}),
    createComment: () => ({}),
    createDocumentFragment: stubElement,
    querySelector: () => null,
    addEventListener() {}, removeEventListener() {},
    head: stubElement(), body: stubElement(),
  },
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.navigator = { userAgent: 'node' };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(vuePath, 'utf8'), sandbox, { filename: 'vue.global.min.js' });

const Vue = sandbox.Vue;
if (!Vue || typeof Vue.compile !== 'function') {
  console.error('✗ Vue 运行时未暴露 compile（可能是不含编译器的 runtime-only 构建）');
  process.exit(1);
}

if (!fs.existsSync(uiDir)) {
  console.log('· 尚无界面单元目录，跳过（atlas/assets/app/ui/）');
  process.exit(0);
}

const files = fs.readdirSync(uiDir).filter(name => name.endsWith('.js')).sort();
if (!files.length) {
  console.log('· 界面单元目录为空，跳过');
  process.exit(0);
}

let checked = 0;
const failures = [];
const seenNames = new Map();

for (const file of files) {
  const full = path.join(uiDir, file);
  let module;
  try {
    module = await import(new URL(`../atlas/assets/app/ui/${file}`, import.meta.url).href);
  } catch (error) {
    failures.push(`${file}：模块加载失败 — ${error.message}`);
    continue;
  }

  const units = module.ui;
  if (!units || typeof units !== 'object') {
    failures.push(`${file}：未导出 ui 登记表`);
    continue;
  }

  for (const [key, component] of Object.entries(units)) {
    const label = `${file} → ${key}`;
    if (!component || typeof component !== 'object') {
      failures.push(`${label}：不是组件对象`);
      continue;
    }
    if (!component.name) {
      failures.push(`${label}：缺少 name，无法在 app.component 中稳定登记`);
      continue;
    }
    const previous = seenNames.get(component.name);
    if (previous && previous !== label) {
      failures.push(`${label}：组件名 ${component.name} 与 ${previous} 重复`);
      continue;
    }
    seenNames.set(component.name, label);

    if (typeof component.template !== 'string' || !component.template.trim()) {
      failures.push(`${label}：template 缺失或为空`);
      continue;
    }

    try {
      const { errors } = Vue.compile(component.template, { onError() {} });
      const fatal = (errors || []).filter(item => item.level === undefined || item.level > 1);
      if (fatal.length) {
        failures.push(`${label}：模板编译报错 — ${fatal.map(item => item.message).join('; ')}`);
        continue;
      }
    } catch (error) {
      failures.push(`${label}：模板编译抛出异常 — ${error.message}`);
      continue;
    }
    checked += 1;
  }
}

if (failures.length) {
  console.error('✗ 界面单元模板校验未通过：');
  failures.forEach(item => console.error(`  - ${item}`));
  process.exit(1);
}

console.log(`✓ 界面单元模板校验通过（${files.length} 个文件，${checked} 个组件）`);
files.forEach(file => console.log(`  · ${file}`));
