#!/usr/bin/env node

import fs from 'node:fs';
import { appointmentStatusCounts } from './appointment-supplements.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const json = name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
const registry = json('v63-person-registry.json');
const relations = json('v63-reader-person-relations.json');
const sourceIndex = json('person-source-index.json');
const fangzhen = json('v69-fangzhen-reader.json');
const epigraphy = json('v69-epigraphic-records.json');

const statusDefinitions = [
  { key: 'verified', label: '已核', meaning: '人物或事实已经逐项通过发布门槛，可用于默认阅读与确定性统计。' },
  { key: 'pending', label: '待补核', meaning: '已有候选材料，但证据、年代、身份或原文定位尚不足；不等于错误。' },
  { key: 'disputed', label: '存疑', meaning: '材料包含明确冲突、反证、遥领或未上任等争议信号，必须单独复核。' },
  { key: 'suppressed', label: '已排除', meaning: '已确认不应进入该实体层，例如官号、爵号或地名被误抽取为人物。' }
];

const personRows = registry.people || [];
const people = {
  verified: personRows.filter(row => row.publicationStatus?.name === 'verified').length,
  pending: personRows.filter(row => row.publicationStatus?.name !== 'verified' && row.identityStatus !== 'conflict').length,
  disputed: personRows.filter(row => row.publicationStatus?.name !== 'verified' && row.identityStatus === 'conflict').length,
  suppressed: (registry.excludedPeople || []).length
};

const verifiedAppointmentIds = new Set((relations.appointments || []).map(row => row.appointmentId));
const appointmentRows = sourceIndex.appointments || [];
const appointmentReview = { records: [...json('v71-appointment-review.json').records, ...json('v74-appointment-source-review.json').records] };
const appointments = appointmentStatusCounts(appointmentRows, appointmentReview, json('v74-appointment-supplements.json'), verifiedAppointmentIds);

const fangzhenRows = fangzhen.records || [];
const explicitFangzhenDispute = row => ['存疑', '未上任', '遥领'].includes(row.appointmentStatus);
const fangzhenCounts = {
  verified: fangzhenRows.filter(row => row.readerDisplayStatus === 'verified').length,
  pending: fangzhenRows.filter(row => row.readerDisplayStatus !== 'verified' && !explicitFangzhenDispute(row)).length,
  disputed: fangzhenRows.filter(row => row.readerDisplayStatus !== 'verified' && explicitFangzhenDispute(row)).length,
  suppressed: 0
};

const epigraphicRows = epigraphy.records || [];
const epigraphyVerified = row => row.researchStatus === '确定' && Boolean(String(row.inscription || '').trim());
const epigraphyDisputed = row => row.researchStatus === '争议' || row.archiveKind === '争议';
const epigraphyCounts = {
  verified: epigraphicRows.filter(epigraphyVerified).length,
  pending: epigraphicRows.filter(row => !epigraphyVerified(row) && !epigraphyDisputed(row)).length,
  disputed: epigraphicRows.filter(row => !epigraphyVerified(row) && epigraphyDisputed(row)).length,
  suppressed: 0
};

const sum = counts => Object.values(counts).reduce((total, value) => total + value, 0);
const modules = [
  { key: 'people', label: '人物实体', total: sum(people), counts: people, excludedFromStatistics: people.pending + people.disputed + people.suppressed },
  { key: 'appointments', label: '任官事实', total: sum(appointments), counts: appointments, excludedFromStatistics: appointments.pending + appointments.disputed + appointments.suppressed },
  { key: 'fangzhen', label: '州镇职任', total: sum(fangzhenCounts), counts: fangzhenCounts, excludedFromStatistics: fangzhenRows.filter(row => row.readerDisplayStatus !== 'verified' || !Number.isFinite(row.startYear) || !Number.isFinite(row.endYear)).length },
  { key: 'epigraphy', label: '金石记录', total: sum(epigraphyCounts), counts: epigraphyCounts, excludedFromStatistics: epigraphicRows.filter(row => row.researchStatus !== '确定').length }
];

for (const module of modules) {
  if (module.total !== Object.values(module.counts).reduce((total, value) => total + value, 0)) {
    throw new Error(`${module.label} 状态计数未闭合`);
  }
}

const totals = Object.fromEntries(statusDefinitions.map(status => [
  status.key,
  modules.reduce((total, module) => total + module.counts[status.key], 0)
]));

const payload = {
  schemaVersion: 'V74',
  modelId: 'sgz-v73-review-status-ledger',
  generatedAt: new Date(Number(process.env.SOURCE_DATE_EPOCH || 1788019200) * 1000).toISOString(),
  policy: {
    independence: '人物身份通过不自动放行任官、州镇或金石事实；每个模块逐条判定。',
    pending: '自动抽取层的“存疑”默认解释为尚待人工补核；只有明确冲突、反证或争议信号才进入“存疑”。',
    statistics: '待补核、存疑和已排除记录不进入确定性统计；州镇还要求起讫年明确。'
  },
  statusDefinitions,
  totals,
  modules
};

fs.writeFileSync(path.join(dataDir, 'v73-review-status-ledger.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(dataDir, 'v73-review-status-ledger.js'), `window.SGZ_V73_REVIEW_STATUS_LEDGER=${JSON.stringify(payload)};\n`, 'utf8');
console.log(JSON.stringify({ ok: true, totals, modules: modules.map(row => ({ label: row.label, ...row.counts, excludedFromStatistics: row.excludedFromStatistics })) }, null, 2));
