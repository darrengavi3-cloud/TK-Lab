#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const dataDir = path.join(projectRoot, 'data');
const sourcePath = path.join(dataDir, 'v62-jin-fangzhen.json');
const outputPath = path.join(dataDir, 'v62-jin-fangzhen.js');

function fail(message) {
  throw new Error(`[V62 西晋州镇] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const model = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const dispositions = ['采用', '重复', '审校保留', '排除', '明确无候选'];

assert(model.schemaVersion === 'V62', 'schemaVersion 必须为 V62');
assert(model.scope?.startYear === 266 && model.scope?.endYear === 316, '范围必须固定为 266—316');
assert(Array.isArray(model.records) && model.records.length > 0, '缺少读者采用记录');
assert(Array.isArray(model.candidateAudit) && model.candidateAudit.length > 0, '缺少候选审校台账');

const candidateIds = new Set();
const dispositionCounts = Object.fromEntries(dispositions.map((value) => [value, 0]));
const recordIds = new Set();
const recordSignatures = new Set();
const adoptedRecordIds = new Set();
const sourceIds = new Set([
  ...model.discoverySources.map((source) => source.sourceId),
  ...model.primarySources.map((source) => source.sourceId)
]);

for (const source of model.discoverySources) {
  assert(/^https:\/\//.test(source.url), `发现来源 ${source.sourceId} 缺少 HTTPS URL`);
  assert(source.versionDate && source.retrievedAt, `发现来源 ${source.sourceId} 缺少版本日期或检索日期`);
}

for (const source of model.primarySources) {
  assert(source.sourceLevel === '一手史料', `原典 ${source.sourceId} 的来源等级错误`);
  assert(source.url.includes('zh.wikisource.org/'), `原典 ${source.sourceId} 必须指向可定位的维基文库页面`);
}

for (const record of model.records) {
  assert(record.id && !recordIds.has(record.id), `记录 ID 重复或为空：${record.id ?? '(empty)'}`);
  recordIds.add(record.id);
  assert(record.readerVisible === true, `采用记录 ${record.id} 必须显式 readerVisible=true`);
  assert(record.reviewDisposition === '采用', `采用记录 ${record.id} 的处置状态错误`);
  assert(record.researchStatus === '确定', `采用记录 ${record.id} 必须完成研究结论`);
  assert(record.sourceLevel === '一手史料', `采用记录 ${record.id} 不是一手史料支持`);
  assert(record.personId?.startsWith('person:'), `采用记录 ${record.id} 缺少稳定 personId`);
  assert(record.sourceUrl?.includes('zh.wikisource.org/'), `采用记录 ${record.id} 的读者来源不能是 Wikipedia`);
  assert(record.sourceLocator && record.sourceExcerpt, `采用记录 ${record.id} 缺少卷次定位或原文摘录`);
  assert(record.jurisdiction && record.title && record.commander, `采用记录 ${record.id} 缺少州、官职或人物`);
  for (const key of ['startYear', 'endYear']) {
    if (record[key] !== null) {
      assert(Number.isInteger(record[key]), `${record.id}.${key} 必须为整数或 null`);
      assert(record[key] >= 266 && record[key] <= 316, `${record.id}.${key} 超出 266—316`);
    }
  }
  if (record.startYear !== null && record.endYear !== null) {
    assert(record.startYear <= record.endYear, `${record.id} 起年晚于止年`);
  }
  if (record.scopeClippedEnd) {
    assert(record.endYear === 316, `${record.id} 的范围截点必须为 316`);
  }
  for (const year of record.attestedYears ?? []) {
    assert(Number.isInteger(year) && year >= 266 && year <= 316, `${record.id} 的见载年份越界：${year}`);
  }
  const signature = `${record.personId}|${record.jurisdiction}|${record.title}`;
  assert(!recordSignatures.has(signature), `重复采用同一人物同一州职：${signature}`);
  recordSignatures.add(signature);
}

for (const candidate of model.candidateAudit) {
  assert(candidate.candidateId && !candidateIds.has(candidate.candidateId), `候选 ID 重复或为空：${candidate.candidateId ?? '(empty)'}`);
  candidateIds.add(candidate.candidateId);
  assert(dispositions.includes(candidate.disposition), `候选 ${candidate.candidateId} 处置状态无效：${candidate.disposition}`);
  dispositionCounts[candidate.disposition] += 1;
  assert(sourceIds.has(candidate.discoverySourceId), `候选 ${candidate.candidateId} 的发现来源不存在：${candidate.discoverySourceId}`);
  for (const sourceId of candidate.primarySourceIds ?? []) {
    assert(sourceIds.has(sourceId), `候选 ${candidate.candidateId} 的原典来源不存在：${sourceId}`);
  }
  if (candidate.disposition === '采用') {
    assert(candidate.recordId && recordIds.has(candidate.recordId), `采用候选 ${candidate.candidateId} 未关联有效记录`);
    assert(!adoptedRecordIds.has(candidate.recordId), `采用记录被多个候选重复关联：${candidate.recordId}`);
    adoptedRecordIds.add(candidate.recordId);
    assert((candidate.primarySourceIds ?? []).length > 0, `采用候选 ${candidate.candidateId} 缺少原典来源`);
  } else {
    assert(candidate.reason, `非采用候选 ${candidate.candidateId} 缺少处置理由`);
  }
}

assert(adoptedRecordIds.size === model.records.length, '采用候选与读者记录未一一闭合');
assert(model.summary.candidateRows === model.candidateAudit.length, 'summary.candidateRows 与实际台账不一致');
assert(model.summary.readerRecords === model.records.length, 'summary.readerRecords 与实际记录不一致');
for (const disposition of dispositions) {
  assert(dispositionCounts[disposition] > 0, `处置类型 ${disposition} 没有候选`);
  assert(model.summary.dispositionCounts[disposition] === dispositionCounts[disposition], `处置计数不一致：${disposition}`);
}

const protectedExistingNames = new Set(['李憙', '石鉴', '胡烈', '鲁芝', '袁邵', '石苞', '卫瓘', '羊祜', '杜预', '刘琨']);
for (const record of model.records) {
  assert(!protectedExistingNames.has(record.commander), `禁止重复建立既有州镇人物：${record.commander}`);
}

const priorDataText = fs.readdirSync(dataDir)
  .filter((name) => /\.(?:js|json)$/.test(name))
  .filter((name) => !['v62-jin-fangzhen.json', 'v62-jin-fangzhen.js'].includes(name))
  .map((name) => fs.readFileSync(path.join(dataDir, name), 'utf8'))
  .join('\n');

for (const record of model.records) {
  assert(priorDataText.includes(record.personId), `personId 未在既有规范数据中找到：${record.personId}`);
  for (const relatedRecordId of record.relatedPriorRecordIds ?? []) {
    assert(priorDataText.includes(`\"id\": \"${relatedRecordId}\"`) || priorDataText.includes(`id:'${relatedRecordId}'`), `关联的既有州镇记录不存在：${relatedRecordId}`);
  }
}

const generatedAt = new Date().toISOString();
const javascript = `/* Generated by scripts/build-v62-jin-fangzhen.mjs. Do not edit directly. */\n` +
  `(function (global) {\n` +
  `  const payload = ${JSON.stringify(model, null, 2)};\n` +
  `  payload.records = Object.freeze(payload.records);\n` +
  `  payload.candidateAudit = Object.freeze(payload.candidateAudit);\n` +
  `  global.SGZ_V62_JIN_FANGZHEN = Object.freeze(payload);\n` +
  `  global.SGZ_V62_JIN_FANGZHEN_RECORDS = payload.records;\n` +
  `  global.SGZ_V62_JIN_FANGZHEN_AUDIT = payload.candidateAudit;\n` +
  `})(typeof window !== 'undefined' ? window : globalThis);\n`;

fs.writeFileSync(outputPath, javascript, 'utf8');
console.log(JSON.stringify({
  ok: true,
  generatedAt,
  source: path.relative(projectRoot, sourcePath),
  output: path.relative(projectRoot, outputPath),
  records: model.records.length,
  candidates: model.candidateAudit.length,
  dispositionCounts
}, null, 2));
