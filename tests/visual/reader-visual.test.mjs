/* 读者界面渲染门禁。
 *
 * release:offline 只验证数据、类型与构建产物，从不打开浏览器，因此下列几类
 * 缺陷长期只能靠人工目视发现：字面被容器硬切、触控目标不足、文字对比不达标、
 * 短标签按钮竖排、页面横向溢出。这些都是纯量测，不需要基准截图，因此没有
 * 截图比对的维护负担。
 *
 * 以 atlas/ 源码树直接静态伺服，不依赖 dist/ 产物。
 *   npm run test:visual
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const atlasRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'atlas');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

function startServer(root) {
  const server = createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = path.join(root, path.normalize(requestPath).replace(/^(\.\.[/\\])+/, ''));
    if (!target.startsWith(root) || !existsSync(target) || statSync(target).isDirectory()) {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream' });
    createReadStream(target).pipe(response);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

/* 页内量测。整段在浏览器上下文执行，故不引用外部作用域。 */
const TOUCH_TARGET = 44;

/* 以 IIFE 形式送入页面：page.evaluate 收到字符串时按表达式求值，不会代传参数。 */
const AUDIT = '(' + String(function audit(touchTarget) {
  /* getComputedStyle 可能返回 rgb()、rgba() 或 color(srgb r g b / a)；
     后者分量是 0—1 而非 0—255，按 255 解析会把浅色误判成近黑。 */
  function parseColor(value) {
    const text = String(value || '');
    if (!text || text === 'transparent') return null;
    const srgb = text.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/);
    if (srgb) {
      return { r: Number(srgb[1]) * 255, g: Number(srgb[2]) * 255, b: Number(srgb[3]) * 255, a: srgb[4] === undefined ? 1 : Number(srgb[4]) };
    }
    const rgb = text.match(/^rgba?\(([^)]+)\)$/);
    if (rgb) {
      const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      if (parts.length < 3 || parts.some(Number.isNaN)) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    }
    return null;
  }

  function relativeLuminance(color) {
    const channel = raw => {
      const value = raw / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  }

  function over(front, back) {
    const alpha = front.a;
    return { r: front.r * alpha + back.r * (1 - alpha), g: front.g * alpha + back.g * (1 - alpha), b: front.b * alpha + back.b * (1 - alpha), a: 1 };
  }

  function backdropOf(element) {
    let node = element;
    let accumulated = null;
    while (node && node.nodeType === 1) {
      const style = getComputedStyle(node);
      const color = parseColor(style.backgroundColor);
      if (color && color.a > 0) {
        accumulated = accumulated ? over(accumulated, color) : color;
        if (accumulated.a >= 0.999) return accumulated;
      }
      node = node.parentElement;
    }
    const page = parseColor(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    return accumulated ? over(accumulated, page) : page;
  }

  function contrast(front, back) {
    const a = relativeLuminance(front);
    const b = relativeLuminance(back);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  function visible(element) {
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) <= 0.05) return false;
    /* 作者已声明为装饰的子树（印记、字章等）不计入文字对比：
       它们不进入无障碍树，其可读性由相邻的真实标签承担。 */
    return !element.closest('[aria-hidden="true"]');
  }

  const findings = { clipped: [], small: [], contrast: [], wrapped: [] };

  for (const element of document.querySelectorAll('*')) {
    if (element.children.length || !(element.textContent || '').trim()) continue;
    if (!visible(element)) continue;
    const style = getComputedStyle(element);

    /* 一、字面被容器硬切：overflow 隐藏且无省略号，而内容宽于容器。 */
    if (style.overflow === 'hidden' && style.textOverflow === 'clip' && element.scrollWidth > element.clientWidth + 1 && element.clientWidth > 0) {
      findings.clipped.push({ text: element.textContent.trim().slice(0, 18), selector: element.className ? '.' + String(element.className).trim().split(/\s+/)[0] : element.tagName });
    }

    /* 三、可见文字对比。等价于 WCAG 1.4.3：大字 3:1，其余 4.5:1。 */
    const front = parseColor(style.color);
    if (front) {
      const back = backdropOf(element);
      const composed = front.a < 1 ? over(front, back) : front;
      const ratio = contrast(composed, back);
      const size = parseFloat(style.fontSize);
      const bold = Number.parseInt(style.fontWeight, 10) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const required = large ? 3 : 4.5;
      if (ratio + 0.01 < required) {
        findings.contrast.push({ text: element.textContent.trim().slice(0, 18), ratio: Math.round(ratio * 100) / 100, required, size, selector: element.className ? '.' + String(element.className).trim().split(/\s+/)[0] : element.tagName });
      }
    }
  }

  const interactive = 'button,a[href],input,select,textarea,[role="button"],[role="tab"],[role="checkbox"],.el-checkbox,.el-radio';
  for (const element of document.querySelectorAll(interactive)) {
    if (!visible(element)) continue;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    /* 二、触控目标。只在粗指针下要求。行内链接不计（命中区由行高决定）；
       组件内部的隐藏原生输入框也不计——真正的命中区是它外层的 wrapper。 */
    const wrapped = element.closest('.el-select__wrapper, .el-input__wrapper, .el-select, .el-input');
    const proxied = wrapped && wrapped !== element && wrapped.getBoundingClientRect().height + 0.5 >= touchTarget;
    if (matchMedia('(pointer: coarse)').matches && style.display !== 'inline' && !proxied) {
      if (rect.height + 0.5 < touchTarget || rect.width + 0.5 < touchTarget) {
        findings.small.push({ text: (element.textContent || element.getAttribute('aria-label') || element.tagName).trim().slice(0, 16), width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    }

    /* 四、短标签按钮竖排：两三个汉字却排成两行以上。
       内部有结构（年份＋事件名等多行卡片）的按钮不适用此判定。 */
    const label = (element.textContent || '').trim();
    if (label && label.length >= 2 && label.length <= 6 && element.children.length === 0) {
      const size = parseFloat(style.fontSize);
      if (rect.height > size * 2.6 && rect.width < size * 3.2) {
        findings.wrapped.push({ text: label, width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    }
  }

  return {
    ...findings,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  };
}) + `)(${TOUCH_TARGET})`;

const MODULES = [
  ['职官', 'offices'], ['人物', 'people'], ['战事', 'battles'],
  ['州镇', 'fangzhen'], ['金石', 'jinshi'], ['食货', 'shihuo'], ['史源', 'shiyuan'], ['形势', 'map']
];

/* 覆盖三种代表性组合：宽屏阅读、笔电审校（两栏展开时最挤）、手机阅读。 */
const CASES = [
  { name: '1440 阅读 兰台清昼', width: 1440, height: 900, theme: 'lantai-day', mode: 'reader', touch: false },
  { name: '1440 阅读 青灯夜校', width: 1440, height: 900, theme: 'lamp-night', mode: 'reader', touch: false },
  { name: '1280 审校 兰台清昼', width: 1280, height: 860, theme: 'lantai-day', mode: 'review', touch: false },
  { name: '390 阅读 兰台清昼', width: 390, height: 844, theme: 'lantai-day', mode: 'reader', touch: true }
];

const { server, port } = await startServer(atlasRoot);
const browser = await chromium.launch();
const origin = `http://127.0.0.1:${port}/index.html`;

test.after(async () => {
  await browser.close();
  server.close();
});

for (const scenario of CASES) {
  for (const [label, key] of MODULES) {
    test(`${scenario.name} · ${key}`, async () => {
      const context = await browser.newContext({
        viewport: { width: scenario.width, height: scenario.height },
        locale: 'zh-CN',
        isMobile: scenario.touch,
        hasTouch: scenario.touch
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(String(error).slice(0, 200)));

      await page.goto(origin, { waitUntil: 'load', timeout: 60_000 });
      await page.waitForTimeout(1500);
      await page.evaluate(theme => document.documentElement.setAttribute('data-sgz-theme', theme), scenario.theme);
      if (scenario.mode === 'review') {
        const toggle = page.locator('button').filter({ hasText: '审校' }).first();
        if (await toggle.count()) await toggle.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(800);
      }
      if (key !== 'offices') {
        const item = page.locator('.v56-spine-nav button').filter({ hasText: label }).first();
        if (await item.count()) await item.click({ timeout: 8_000 }).catch(() => {});
        await page.waitForTimeout(4_000);
      } else {
        await page.waitForTimeout(1_500);
      }

      const result = await page.evaluate(AUDIT);
      await context.close();

      const show = list => JSON.stringify(list.slice(0, 6), null, 1);
      assert.deepEqual(pageErrors, [], `运行时异常：${pageErrors.join(' / ')}`);
      assert.equal(result.overflowX, false, '页面出现横向溢出');
      assert.equal(result.clipped.length, 0, `字面被容器硬切（overflow:hidden 且无省略号）：${show(result.clipped)}`);
      assert.equal(result.wrapped.length, 0, `短标签按钮竖排：${show(result.wrapped)}`);
      if (scenario.touch) {
        assert.equal(result.small.length, 0, `触控目标小于 ${TOUCH_TARGET}px：${show(result.small)}`);
      }
      assert.equal(result.contrast.length, 0, `文字对比不达 WCAG AA：${show(result.contrast)}`);
    });
  }
}
