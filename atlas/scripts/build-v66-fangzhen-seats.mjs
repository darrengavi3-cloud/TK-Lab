import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => {
  if (!condition) throw new Error(`V66 州镇治所构建失败：${message}`);
};

function loadRawRecords() {
  const html = read('index.html');
  const start = html.indexOf('const FACTIONS = [');
  const end = html.indexOf('/* =========================================================================\n   Vue App', start);
  assert(start >= 0 && end > start, '无法从 index.html 提取州镇规范源');
  const context = {
    console,
    window: { HISTORY_MAP_REGISTRY: json('data/map-period-registry.json') },
    document: { getElementById: () => ({ innerHTML: '' }) }
  };
  context.window.window = context.window;
  vm.createContext(context);
  for (const relative of [
    'data/research-model.js',
    'data/person-name-normalization.js',
    'data/wu-fangzhen-records.js',
    'data/shu-fangzhen-records.js',
    'data/fangzhen-term-supplement.js',
    'data/v62-jin-fangzhen.js'
  ]) vm.runInContext(read(relative), context, { filename: relative, timeout: 20_000 });
  vm.runInContext(
    `${html.slice(start, end)}\nglobalThis.__v66RawFangzhen=JSON.parse(JSON.stringify(FANGZHEN_PRESETS));`,
    context,
    { filename: 'index.html#fangzhen', timeout: 20_000 }
  );
  return context.__v66RawFangzhen;
}

const periodsModel = json('data/v66-administrative-seat-periods.json');
const v65Audit = json('data/v65-fangzhen-audit.json');
const v62Jin = json('data/v62-jin-fangzhen.json');
const rawRecords = loadRawRecords();
const sourceById = new Map(periodsModel.sources.map(source => [source.sourceId, source]));
const periodById = new Map(periodsModel.periods.map(period => [period.seatPeriodId, period]));
const v65ById = new Map(v65Audit.records.map(row => [row.recordId, row]));
const v62JinIds = new Set(v62Jin.records.map(row => row.id));
const overrides = periodsModel.recordPeriodOverrides || {};

assert(periodsModel.schemaVersion === 'V66', '治所分期表版本不是 V66');
assert(rawRecords.length === 533, `州镇规范源应为 533 条，当前 ${rawRecords.length}`);
assert(new Set(rawRecords.map(row => String(row.id || ''))).size === 533, '州镇规范源 ID 不唯一');
assert(v65ById.size === 533, 'V65 州镇发布门禁不是 533 条');
assert(v62JinIds.size === 29, 'V62 西晋州镇记录不是 29 条');
assert(periodById.size === periodsModel.periods.length, '治所分期 ID 不唯一');
assert(sourceById.size === periodsModel.sources.length, '治所来源 ID 不唯一');

for (const period of periodsModel.periods) {
  assert(period.seatPeriodId && period.administrativeUnitId && period.seatName && period.seatType, `${period.seatPeriodId || '未知分期'} 字段不全`);
  assert(Number.isInteger(period.validFromYear) && Number.isInteger(period.validToYear) && period.validFromYear <= period.validToYear, `${period.seatPeriodId} 有效年代非法`);
  assert(period.publicationStatus === 'verified', `${period.seatPeriodId} 不是已核分期`);
  assert(Array.isArray(period.sourceIds) && period.sourceIds.length > 0, `${period.seatPeriodId} 缺来源`);
  for (const sourceId of period.sourceIds) {
    const source = sourceById.get(sourceId);
    assert(source, `${period.seatPeriodId} 引用不存在的来源 ${sourceId}`);
    assert(/^https:\/\//.test(source.sourceUrl || '') && source.sourceLocator && source.sourceExcerpt, `${sourceId} 缺 URL、定位或摘录`);
  }
}

const normal = value => String(value || '').normalize('NFKC').replace(/\s+/g, '');
const yearSignals = row => [...new Set([
  ...(Array.isArray(row.attestedYears) ? row.attestedYears : []),
  Number.isInteger(row.startYear) ? row.startYear : null,
  Number.isInteger(row.endYear) ? row.endYear : null
].filter(Number.isInteger))].sort((a, b) => a - b);

function evidenceForPeriod(period) {
  return period.sourceIds.map(sourceId => ({ ...sourceById.get(sourceId) }));
}

function automaticJinPeriod(row) {
  const jurisdiction = normal(row.jurisdiction || row.region);
  const candidates = periodsModel.periods.filter(period =>
    period.polity === '晋' && normal(period.unitName) === jurisdiction
  );
  if (candidates.length === 1) return { period: candidates[0], method: 'unique-polity-unit-period' };
  const years = yearSignals(row);
  if (years.length) {
    const matches = candidates.filter(period => years.every(year => year >= period.validFromYear && year <= period.validToYear));
    if (matches.length === 1) return { period: matches[0], method: 'record-year-within-seat-period' };
  }
  return { period: null, method: candidates.length ? 'ambiguous-period' : 'no-period-candidate' };
}

function resolveSeat(row, upstream) {
  const recordId = String(row.id || '');
  if (!upstream.readerVisible || upstream.publicationStatus !== 'reader-visible') {
    return {
      status: 'not-assessed-upstream-review-only',
      method: 'v65-publication-gate',
      reason: 'V65 任职事实未通过读者发布门禁，V66 不单独以治所补全升级该记录。',
      period: null
    };
  }

  if (Object.hasOwn(overrides, recordId)) {
    const override = overrides[recordId];
    if (!override.seatPeriodId) {
      return { status: 'unresolved', method: 'record-specific-review', reason: override.reason, period: null };
    }
    const period = periodById.get(override.seatPeriodId);
    assert(period, `${recordId} 的指定治所分期不存在：${override.seatPeriodId}`);
    return { status: 'verified', method: 'record-specific-primary-resolution', reason: override.reason, period };
  }

  if (v62JinIds.has(recordId)) {
    const result = automaticJinPeriod(row);
    if (result.period) {
      return {
        status: 'verified',
        method: result.method,
        reason: '该西晋州镇记录与政权、州名及可确认年代的唯一治所分期相符。',
        period: result.period
      };
    }
    return {
      status: 'unresolved',
      method: result.method,
      reason: '现有任期信号不能把该记录唯一归入已核治所分期；任职记录可按上游门禁公开，治所字段不公开。',
      period: null
    };
  }

  return {
    status: 'unresolved',
    method: 'no-record-specific-seat-evidence',
    reason: '任职事实虽已通过 V65 门禁，但现有原文未明确人物实际驻地，且不能用“政权＋辖区”通用补丁代替逐条治所证据。',
    period: null
  };
}

const auditRecords = rawRecords.map(row => {
  const recordId = String(row.id || '');
  const upstream = v65ById.get(recordId);
  assert(upstream, `${recordId} 缺 V65 州镇审校记录`);
  const resolution = resolveSeat(row, upstream);
  const period = resolution.period;
  const readerVisible = upstream.readerVisible === true && upstream.publicationStatus === 'reader-visible';
  const seatReaderVisible = readerVisible && resolution.status === 'verified';
  return {
    auditId: `v66-fangzhen-seat:${recordId}`,
    recordId,
    dataset: upstream.dataset,
    polity: row.polity || upstream.polity || '',
    commander: row.commander || row.name || upstream.commander || '',
    title: row.title || row.commission || upstream.title || '',
    jurisdiction: row.jurisdiction || row.region || upstream.jurisdiction || '',
    startYear: row.startYear ?? null,
    endYear: row.endYear ?? null,
    upstreamPublicationStatus: upstream.publicationStatus,
    upstreamReaderVisible: upstream.readerVisible === true,
    seatResolution: {
      status: resolution.status,
      method: resolution.method,
      reason: resolution.reason,
      seatPeriodId: period?.seatPeriodId || null,
      administrativeUnitId: period?.administrativeUnitId || null,
      seatName: period?.seatName || null,
      seatType: period?.seatType || null,
      validFromYear: period?.validFromYear ?? null,
      validToYear: period?.validToYear ?? null,
      sources: period ? evidenceForPeriod(period) : []
    },
    v62JinDisposition: v62JinIds.has(recordId)
      ? (seatReaderVisible ? '采用：任职已核，治所已核并公开' : '采用：任职已核，治所未能唯一确定且不公开')
      : null,
    publicationStatus: readerVisible ? 'reader-visible' : 'review-only',
    recordPublicationStatus: readerVisible ? 'reader-visible' : 'review-only',
    seatPublicationStatus: seatReaderVisible
      ? 'reader-visible'
      : (resolution.status === 'not-assessed-upstream-review-only' ? 'not-assessed' : 'suppressed'),
    readerVisible,
    seatReaderVisible,
    publicationReason: readerVisible
      ? (seatReaderVisible
          ? '任职事实已通过 V65 门禁；V66 治所拥有来源、定位、摘录与有效年代。'
          : '任职事实已通过 V65 门禁；治所尚未唯一核定，读者投影只发布任职字段。')
      : resolution.reason
  };
});

const readerAuditRows = auditRecords.filter(row => row.readerVisible);
const publicSeatAuditRows = auditRecords.filter(row => row.seatReaderVisible);
const v62JinAuditRows = auditRecords.filter(row => v62JinIds.has(row.recordId));
const countBy = (rows, getter) => Object.fromEntries([...new Set(rows.map(getter))].sort().map(value => [value, rows.filter(row => getter(row) === value).length]));

assert(auditRecords.length === 533, '治所处置没有覆盖 533 条州镇记录');
assert(new Set(auditRecords.map(row => row.recordId)).size === 533, '治所处置 recordId 不唯一');
assert(v62JinAuditRows.length === 29, 'V62 西晋治所处置不是 29 条');
assert(v62JinAuditRows.filter(row => row.readerVisible).length === 29, 'V62 西晋任职公开记录不是 29 条');
assert(v62JinAuditRows.filter(row => row.seatReaderVisible).length === 25, 'V62 西晋治所公开记录不是 25 条');
assert(v62JinAuditRows.filter(row => !row.seatReaderVisible).length === 4, 'V62 西晋治所暂缓记录不是 4 条');
assert(
  ['fz-v62-jin-gaoguang-youzhou','fz-v62-jin-qianhong-liangzhou','fz-v62-jin-taokan-jingzhou','fz-v62-jin-zhangguang-liangzhou']
    .every(recordId => v62JinAuditRows.some(row => row.readerVisible && !row.seatReaderVisible && row.recordId === recordId)),
  'V62 西晋四条治所暂缓项不完整'
);
assert(readerAuditRows.length === 45, `V66 任职读者投影应继承 V65 的 45 条，当前 ${readerAuditRows.length}`);
assert(publicSeatAuditRows.length === 27, `V66 已核治所公开数应为 27，当前 ${publicSeatAuditRows.length}`);
assert(publicSeatAuditRows.every(row => row.seatResolution.sources.length > 0), '公开治所存在无来源记录');
assert(publicSeatAuditRows.every(row => row.seatResolution.sources.every(source => source.sourceUrl && source.sourceLocator && source.sourceExcerpt)), '公开治所来源字段不完整');

const auditPayload = {
  schemaVersion: 'V66',
  modelId: 'sgz-v66-fangzhen-seat-audit',
  generatedAt: '2026-08-30',
  scope: 'V65 任职发布门禁与 V66 治所字段门禁分离；533 条规范记录逐条处置，形势图冻结。',
  policy: {
    publication: '任职记录可见性严格继承 V65 reader-visible；治所字段仅在 V66 seat verified 时附加。',
    unknownSeat: '治所不能唯一确定时不输出治所字段或占位文案，不再吞掉已通过 V65 门禁的任职记录。',
    noGenericPatch: '不使用“政权＋辖区＝单一治所”的通用补丁；州治、军府驻地与人物实际驻地分开。',
    noReaderEvidence: '来源 URL、定位与摘录仅保存在本审校台账和治所规范表，不进入读者投影。'
  },
  summary: {
    totalRecords: 533,
    v65ReaderVisible: auditRecords.filter(row => row.upstreamReaderVisible).length,
    seatVerified: auditRecords.filter(row => row.seatResolution.status === 'verified').length,
    readerVisible: readerAuditRows.length,
    reviewOnly: auditRecords.length - readerAuditRows.length,
    readerVisibleWithSeat: publicSeatAuditRows.length,
    readerVisibleWithoutSeat: readerAuditRows.length - publicSeatAuditRows.length,
    upstreamReviewOnly: auditRecords.filter(row => row.seatResolution.status === 'not-assessed-upstream-review-only').length,
    upstreamVisibleSeatUnresolved: auditRecords.filter(row => row.upstreamReaderVisible && row.seatResolution.status === 'unresolved').length,
    v62JinTotal: v62JinAuditRows.length,
    v62JinReaderVisible: v62JinAuditRows.filter(row => row.readerVisible).length,
    v62JinSeatVisible: v62JinAuditRows.filter(row => row.seatReaderVisible).length,
    v62JinSeatSuppressed: v62JinAuditRows.filter(row => !row.seatReaderVisible).length,
    bySeatResolution: countBy(auditRecords, row => row.seatResolution.status),
    byPublication: countBy(auditRecords, row => row.publicationStatus)
  },
  records: auditRecords
};

const readerFields = [
  'id', 'entityType', 'eraGroup', 'archiveScope', 'polity', 'recordType', 'commander', 'personId',
  'title', 'commission', 'relation', 'appointmentStatus', 'jurisdiction', 'birthplace', 'startYear',
  'endYear', 'tenureText', 'confirmedRange'
];
const pick = (row, fields) => Object.fromEntries(fields.filter(field => row[field] !== undefined).map(field => [field, row[field]]));
const rawById = new Map(rawRecords.map(row => [String(row.id || ''), row]));
const readerRecords = readerAuditRows.map(auditRow => {
  const row = rawById.get(auditRow.recordId);
  const base = pick(row, readerFields);
  if (!auditRow.seatReaderVisible) return base;
  const seat = auditRow.seatResolution;
  return {
    ...base,
    seat: seat.seatName,
    seatName: seat.seatName,
    seatType: seat.seatType,
    seatPeriodId: seat.seatPeriodId,
    administrativeUnitId: seat.administrativeUnitId,
    seatValidFromYear: seat.validFromYear,
    seatValidToYear: seat.validToYear
  };
}).sort((a, b) => String(a.id).localeCompare(String(b.id)));

const readerPayload = {
  schemaVersion: 'V66-reader',
  modelId: 'sgz-v66-fangzhen-reader',
  generatedAt: '2026-08-30',
  summary: {
    records: readerRecords.length,
    verifiedSeats: publicSeatAuditRows.length,
    recordsWithoutSeat: readerRecords.length - publicSeatAuditRows.length,
    v62JinRecords: readerRecords.filter(row => v62JinIds.has(row.id)).length,
    v62JinVerifiedSeats: publicSeatAuditRows.filter(row => v62JinIds.has(row.recordId)).length
  },
  recordIds: readerRecords.map(row => row.id),
  verifiedSeatRecordIds: publicSeatAuditRows.map(row => row.recordId).sort((a, b) => a.localeCompare(b)),
  records: readerRecords
};

const forbiddenReaderKeys = ['sourceTitle', 'sourceUrl', 'sourceLocator', 'sourceExcerpt', 'sources', 'auditId', 'workbookSource', 'publicationReason'];
const readerText = JSON.stringify(readerPayload);
for (const key of forbiddenReaderKeys) assert(!readerText.includes(`"${key}"`), `读者投影泄露审校字段 ${key}`);
assert(readerRecords.length === 45 && new Set(readerRecords.map(row => row.id)).size === 45, '读者任职投影不是 45 条唯一记录');
assert(readerRecords.filter(row => row.seat).length === 27, '读者投影已核治所不是 27 条');
assert(readerRecords.every(row => {
  const seatKeys = ['seat','seatName','seatType','seatPeriodId','administrativeUnitId','seatValidFromYear','seatValidToYear'];
  const present = seatKeys.filter(key => row[key] !== undefined);
  return present.length === 0 || present.length === seatKeys.length;
}), '读者记录的治所字段不是全有或全无');

const periodsJs = `/* Generated by scripts/build-v66-fangzhen-seats.mjs. */\n(function(global){\n  'use strict';\n  const payload=${JSON.stringify(periodsModel)};\n  payload.sources=Object.freeze(payload.sources.map(Object.freeze));\n  payload.periods=Object.freeze(payload.periods.map(Object.freeze));\n  payload.periodById=Object.freeze(Object.fromEntries(payload.periods.map(row=>[row.seatPeriodId,row])));\n  global.SGZ_V66_ADMINISTRATIVE_SEAT_PERIODS=Object.freeze(payload);\n})(window);\n`;
const readerJs = `/* Generated by scripts/build-v66-fangzhen-seats.mjs. */\n(function(global){\n  'use strict';\n  const payload=${JSON.stringify(readerPayload)};\n  payload.recordIds=Object.freeze(payload.recordIds);\n  payload.verifiedSeatRecordIds=Object.freeze(payload.verifiedSeatRecordIds);\n  payload.records=Object.freeze(payload.records.map(Object.freeze));\n  payload.recordById=Object.freeze(Object.fromEntries(payload.records.map(row=>[row.id,row])));\n  global.SGZ_V66_FANGZHEN_READER=Object.freeze(payload);\n})(window);\n`;

fs.writeFileSync(path.join(root, 'data/v66-administrative-seat-periods.js'), periodsJs);
fs.writeFileSync(path.join(root, 'data/v66-fangzhen-seat-audit.json'), `${JSON.stringify(auditPayload, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'data/v66-fangzhen-reader.json'), `${JSON.stringify(readerPayload, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'data/v66-fangzhen-reader.js'), readerJs);

console.log(JSON.stringify(auditPayload.summary, null, 2));
