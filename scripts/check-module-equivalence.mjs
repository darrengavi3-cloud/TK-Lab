/* 模块迁出等价性校验：把原 index.html（git HEAD）中指定模块区域的用户可见文案
 * 逐条抽出，检查新界面单元是否全部保留。缺任何一条即视为不等价。
 * 用法：node scripts/check-module-equivalence.mjs <模块名> <原区域起行> <原区域止行> <界面单元文件> [基准ref] [基准文件] [共享文件]
 * 只验证文案保全，功能等价须另跑运行时／浏览器门禁。阶段二基准文件可为已迁出的 UI 单元。 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const [moduleName, startLine, endLine, uiFile, baselineRef = 'HEAD', baselineFile = 'atlas/index.html', sharedFile] = process.argv.slice(2);
if (!moduleName) throw new Error('缺少模块名');

const original = execFileSync('git', ['show', `${baselineRef}:${baselineFile}`], { encoding: 'utf8', maxBuffer: 1 << 30 });
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

if (!fragments.size) throw new Error('基准区域没有可见文案，不能作为等价性证据');
const target = fs.readFileSync(uiFile, 'utf8') + (sharedFile ? fs.readFileSync(sharedFile, 'utf8') : '');
const missing = [...fragments].filter(t => !target.includes(t)).sort();

console.log(`模块：${moduleName}`);
console.log(`原区域：${startLine}–${endLine} 行（共 ${Number(endLine) - Number(startLine) + 1} 行）`);
console.log(`抽出用户可见文案片段：${fragments.size} 个`);
if (missing.length) {
  console.log(`✗ 新界面单元缺失 ${missing.length} 个片段：`);
  for (const t of missing) console.log('   ·', t.slice(0, 90));
  process.exitCode = 1;
} else {
  console.log('✓ 文案逐条保全，缺失 0 个（功能等价另由运行时门禁验证）');
}
