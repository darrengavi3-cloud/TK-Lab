import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const sourcePath = 'data/v62-jinshi-display.json';
const outputPath = 'data/v62-jinshi-display.js';
const checkOnly = process.argv.includes('--check');

function loadGlobals(files) {
  const context = { window: {}, console };
  vm.createContext(context);
  files.forEach(file => vm.runInContext(read(file), context, { filename:file }));
  return context.window;
}

function serializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function renderScript(payload) {
  return `(function(global){\n  'use strict';\n  const data=${JSON.stringify(payload)};\n  data.records=Object.freeze(data.records.map(item=>Object.freeze({...item,titleAliases:Object.freeze((item.titleAliases||[]).slice())})));\n  data.policy=Object.freeze({...data.policy});\n  data.baseline=Object.freeze({...data.baseline});\n  global.SGZ_V62_JINSHI_DISPLAY=Object.freeze(data);\n})(window);\n`;
}

const payload = JSON.parse(read(sourcePath));
const globals = loadGlobals([
  'data/epigraphic-records.js',
  'data/epigraphic-v46-jin.js',
  'data/v60-research-ledger.js',
  'data/v61-epigraphy-research.js',
]);
const base = [
  ...(globals.SGZ_EPIGRAPHIC_RECORDS?.records || []),
  ...(globals.SGZ_EPIGRAPHIC_V46_JIN?.records || []),
];
const v60ById = new Map((globals.SGZ_V60_RESEARCH_LEDGER?.epigraphy || []).map(item => [item.id, item]));
const v61ById = new Map((globals.SGZ_V61_EPIGRAPHY_RESEARCH?.epigraphy || []).map(item => [item.id, item]));
const merged = base.map(row => Object.assign({}, row, v60ById.get(row.id) || {}, v61ById.get(row.id) || {}));
const baseById = new Map(base.map(row => [row.id, row]));

assert.equal(payload.schemaVersion, 'V62', 'V62 金石显示覆盖缺少正确 schemaVersion');
assert.equal(base.length, 188, '金石目录数量不再是 188');
assert.equal(baseById.size, 188, '金石稳定 ID 存在重复');
assert.equal(merged.filter(row => String(row.inscription || '').trim()).length, 50, '有释文记录不再是 50');
assert.equal(merged.filter(row => !String(row.inscription || '').trim()).length, 138, '空释文记录不再是 138');
assert.equal(payload.records.length, payload.baseline.titleOverrideCount, '题名覆盖数量与基线不一致');
assert.equal(new Set(payload.records.map(row => row.id)).size, payload.records.length, '题名覆盖 ID 重复');

for (const row of payload.records) {
  const source = baseById.get(row.id);
  assert(source, `题名覆盖引用未知 ID：${row.id}`);
  assert.equal(row.sourceName, source.name, `题名覆盖原题不匹配：${row.id}`);
  assert.equal(typeof row.displayTitle, 'string', `displayTitle 不是字符串：${row.id}`);
  assert(row.displayTitle.trim(), `displayTitle 为空：${row.id}`);
  assert(Array.isArray(row.titleAliases), `titleAliases 不是数组：${row.id}`);
  assert.equal(typeof row.variantLabel, 'string', `variantLabel 不是字符串：${row.id}`);
}

if (checkOnly) {
  const outputGlobals = loadGlobals([outputPath]);
  assert.deepEqual(serializable(outputGlobals.SGZ_V62_JINSHI_DISPLAY), payload, 'JS 运行时镜像与规范 JSON 不一致');
} else {
  fs.writeFileSync(path.join(root, outputPath), renderScript(payload));
}

console.log(JSON.stringify({
  version:'V62',
  mode:checkOnly ? 'check' : 'build',
  records:base.length,
  withInscription:50,
  withoutInscription:138,
  titleOverrides:payload.records.length,
  output:outputPath,
  checks:'passed',
}, null, 2));
