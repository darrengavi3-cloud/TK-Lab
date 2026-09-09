#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
function pngSize(relative) {
  const file = path.join(root, String(relative || '').replace(/^\.\//, ''));
  if (!fs.existsSync(file)) return null;
  const bytes = fs.readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const candidates = json('data/v73-portrait-candidates.json');
const mapping = json('data/v73-figma-mapping.json');
const manifest = json('data/portrait-manifest.json');
const registry = json('data/v63-person-registry.json');
const reader = json('data/v63-reader-people.json');
const ledger = json('data/v73-review-status-ledger.json');
const html = read('index.html');
const rows = candidates.records || [];
const assets = Object.values(manifest.assetsById || {});
const v73Assets = assets.filter(row => row.portraitKind === 'ui-illustration-v73');
const peopleById = new Map((reader.people || []).map(row => [row.personId, row]));

assert(rows.length === 100, `V73 立绘候选应为 100 人，实际 ${rows.length}`);
assert(rows.slice(0, 15).filter(row => row.priorityGroup === '诸葛亮府署').length === 13, '府署优先分组数量异常');
assert(new Set(rows.map(row => row.personId)).size === 100, 'V73 候选 personId 不唯一');
assert(new Set(rows.map(row => row.name)).size === 100, 'V73 候选姓名不唯一');
assert(rows.every(row => /^person:(?!unresolved:)/.test(row.personId || '')), 'V73 候选含不稳定 personId');
assert(mapping.records?.length === 100 && new Set(mapping.records.map(row => row.nodeId)).size === 100, 'V73 Figma 映射不是 100 个唯一节点');
assert(v73Assets.length === 100 && manifest.summary?.v73PortraitRecords === 100, 'manifest 未登记 100 项 V73 资源');
  /* 2026-09 第十批：v83 身份审定批次抑制十二条由任官原文误切而成的伪人物
     （权加燮、全尚息、司盐、衡阳、弘农、魏兴、王請观、年就加、于策、于理、
     曹曼、邵信臣），并撤回其十二张立绘。以下计数随之更新。 */
assert(assets.length === 500, `当前审定总立绘应为 500 项，实际 ${assets.length}`);
assert(registry.summary?.portraitAssets === 500 && registry.portraitResolutions?.length === 500, '人物注册表立绘总数未同步为 500');

for (const row of rows) {
  const portraitId = `portrait:v73:${String(row.order).padStart(3, '0')}`;
  const asset = manifest.assetsById?.[portraitId];
  const size = pngSize(row.assetPath);
  assert(size?.width === 512 && size?.height === 512, `${portraitId} 不是 512×512 PNG`);
  assert(/^\d+:\d+$/.test(String(row.designRef?.nodeId || '')), `${portraitId} 缺少真实 Figma 节点`);
  assert(asset?.personId === row.personId && asset?.assetPath === row.assetPath, `${portraitId} 未与稳定人物绑定`);
  assert(asset?.designStatus === 'figma-design' && asset?.designRef?.nodeId === row.designRef?.nodeId, `${portraitId} Figma 映射未进入 manifest`);
  assert(peopleById.get(row.personId)?.portraitIds?.includes(portraitId), `${portraitId} 未进入人物记读者投影`);
}

assert(reader.people?.length === 2074, `当前审定读者人物应为 2074，实际 ${reader.people?.length || 0}`);
assert(!reader.people.some(row => row.name === '安国' || row.personId === 'person:source:032cc177a216'), '官号误抽取人物安国仍在读者人物表');
assert(!manifest.byName?.['安国'] && !manifest.byPersonId?.['person:source:032cc177a216'], '安国仍在立绘 manifest');
assert(!fs.existsSync(path.join(root, 'assets/portraits/v51/person-source-032cc177a216.png')), '安国旧立绘文件仍存在');
assert((registry.excludedPeople || []).some(row => row.name === '安国' && row.publicationStatus === 'suppressed'), '安国未进入已排除台账');

const expectedLedger = {
  '人物实体': [2074, 327, 14, 29, 370],
  '任官事实': [263, 510, 2, 76, 588],
  '州镇职任': [45, 408, 70, 0, 503],
  '金石记录': [31, 127, 8, 0, 105]
};
assert(ledger.modules?.length === 4, '审核状态台账没有覆盖四个资料模块');
for (const module of ledger.modules || []) {
  const expected = expectedLedger[module.label];
  assert(Boolean(expected), `审核状态台账出现未知模块：${module.label}`);
  if (expected) assert(JSON.stringify([module.counts.verified, module.counts.pending, module.counts.disputed, module.counts.suppressed, module.excludedFromStatistics]) === JSON.stringify(expected), `${module.label} 状态计数漂移`);
}
assert(html.includes('资料状态总览') && html.includes('待补核') && html.includes('SGZ_V73_REVIEW_STATUS_LEDGER'), 'V73 统一状态界面未接入');
assert(!html.includes("?'已核':'待审'"), '州镇界面仍显示旧“待审”标签');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, version: 'V73', failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, version: 'V73', readerPeople: 2074, portraits: { added: 100, total: 500 }, figma: { page: 'V73 / Portraits', nodes: 100 }, reviewModules: 4, removedNonPerson: '安国' }, null, 2));
}
