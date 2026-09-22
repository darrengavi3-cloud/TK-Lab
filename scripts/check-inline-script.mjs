#!/usr/bin/env node
/**
 * 校验 atlas/index.html 内联脚本的语法与结构锚点。
 *
 * 背景：atlas/index.html 是全站唯一入口，内联脚本约 71 万字符。
 * 拆分模块时，任何一处括号或模板字符串失衡都会让整页静默白屏，
 * 而既有测试链要到构建后期才会暴露。本脚本把这一检查提前到秒级，
 * 用于每次结构性改动后的即时回归。
 *
 * 同时校验 scripts/reader-reference-inputs.mjs 依赖的两处字面锚点，
 * 它们承担「不变量」角色，一旦漂移，catalogue 构建会直接失败。
 *
 * 用法：
 *   node scripts/check-inline-script.mjs            # 仅校验
 *   node scripts/check-inline-script.mjs --quiet    # 仅失败时输出
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const indexHtml = path.join(root, 'atlas', 'index.html');
const quiet = process.argv.includes('--quiet');

const log = (...args) => { if (!quiet) console.log(...args); };
const problems = [];

const html = fs.readFileSync(indexHtml, 'utf8');

/* ---------- 1. 内联脚本语法 ---------- */
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
if (!inlineScripts.length) {
  problems.push('未找到内联脚本块；atlas/index.html 结构可能已变更。');
}
inlineScripts.forEach((match, index) => {
  const code = match[1];
  try {
    new vm.Script(code, { filename: `inline-script-${index}.js` });
    log(`✓ 内联脚本 #${index} 语法正确（${code.length} 字符）`);
  } catch (error) {
    problems.push(`内联脚本 #${index} 语法错误：${error.message}`);
    const lineNumber = Number((error.stack.match(/inline-script-\d+\.js:(\d+)/) || [])[1]);
    if (lineNumber) {
      const lines = code.split('\n');
      const excerpt = [];
      for (let i = Math.max(0, lineNumber - 4); i < Math.min(lines.length, lineNumber + 2); i++) {
        excerpt.push(`    ${i + 1}: ${lines[i]}`);
      }
      problems.push(`  出错位置附近：\n${excerpt.join('\n')}`);
    }
  }
});

/* ---------- 2. 恒定锚点（reader-reference-inputs.mjs 依赖） ---------- */
const anchorStart = 'const FACTIONS = [';
const anchorEnd = '/* =========================================================================\n   Vue App';
const startIndex = html.indexOf(anchorStart);
const endIndex = html.indexOf(anchorEnd, startIndex);
if (startIndex < 0) {
  problems.push(`缺少规范定义锚点「${anchorStart}」；build:catalogue 将报 Missing canonical atlas definitions。`);
} else if (endIndex <= startIndex) {
  problems.push('缺少「Vue App」区块注释锚点（必须保持 LF 换行与原有缩进）。');
} else {
  log(`✓ 规范定义锚点完整（第 ${html.slice(0, startIndex).split('\n').length} 行起）`);
}

/* ---------- 3. 行尾一致性（构建脚本按 \n 字面比较） ---------- */
const crlfCount = (html.match(/\r\n/g) || []).length;
if (crlfCount > 0) {
  problems.push(`atlas/index.html 含 ${crlfCount} 处 CRLF；构建锚点按 LF 匹配，必须保持 LF。`);
} else {
  log('✓ 行尾为 LF');
}

/* ---------- 4. 模板字面量闭合 ---------- */
const templateOpen = html.indexOf('  template: `', startIndex);
if (templateOpen > 0) {
  const templateClose = html.indexOf('\n  `', templateOpen);
  if (templateClose < 0) {
    problems.push('未找到 template 模板字面量的闭合反引号。');
  } else {
    const lines = html.slice(templateOpen, templateClose).split('\n').length;
    const rootTags = (html.slice(templateOpen, templateClose).match(/<div class="shell"/g) || []).length;
    if (rootTags !== 1) {
      problems.push(`模板根节点异常：期望 1 个 <div class="shell">，实际 ${rootTags} 个。`);
    } else {
      log(`✓ 模板字面量闭合正确，共 ${lines} 行`);
    }
  }
} else {
  problems.push('未找到 template 模板字面量起始标记。');
}

/* ---------- 结果 ---------- */
if (problems.length) {
  console.error('\n✗ 内联脚本校验未通过：');
  for (const problem of problems) console.error(`  · ${problem}`);
  process.exit(1);
}
log('\n✓ atlas/index.html 内联脚本校验通过');
