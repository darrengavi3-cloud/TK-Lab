/* 模块迁出等价性校验：把原 index.html（git HEAD）中指定模块区域的用户可见文案
 * 逐条抽出，检查新界面单元是否全部保留。缺任何一条即视为不等价。
 * 用法：node scripts/_equiv-check.mjs <模块名> <原区域起行> <原区域止行> <界面单元文件> */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const [moduleName, startLine, endLine, uiFile] = process.argv.slice(2);
if (!moduleName) throw new Error('缺少模块名');

const original = execFileSync('git', ['show', `HEAD:atlas/index.html`], { encoding: 'utf8', maxBuffer: 1 << 30 });
const lines = original.split('\n');
const region = lines.slice(Number(startLine) - 1, Number(endLine)).join('\n');

/* 抽取可见文案：标签之间的中文文本、aria-label、label/placeholder/title 属性值。 */
const fragments = new Set();
for (const m of region.matchAll(/>([^<>{}]*[\u4e00-\u9fff][^<>{}]*)</g)) {
  const t = m[1].trim();
  if (t.length >= 2) fragments.add(t);
}
for (const m of region.matchAll(/(?:aria-label|label|placeholder|title)="([^"]*[\u4e00-\u9fff][^"]*)"/g)) {
  const t = m[1].trim();
  if (t.length >= 2) fragments.add(t);
}

const target = fs.readFileSync(uiFile, 'utf8');
const missing = [...fragments].filter(t => !target.includes(t)).sort();

console.log(`模块：${moduleName}`);
console.log(`原区域：${startLine}–${endLine} 行（共 ${Number(endLine) - Number(startLine) + 1} 行）`);
console.log(`抽出用户可见文案片段：${fragments.size} 个`);
if (missing.length) {
  console.log(`✗ 新界面单元缺失 ${missing.length} 个片段：`);
  for (const t of missing) console.log('   ·', t.slice(0, 90));
  process.exitCode = 1;
} else {
  console.log('✓ 文案逐条保全，缺失 0 个（功能与文案等价）');
}
