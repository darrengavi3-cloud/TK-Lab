#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const dataDir = path.join(root, 'data');
const workbookPath = process.argv[2] || process.env.SGZ_V90_WORKBOOK || '';
if (!workbookPath || !fs.existsSync(workbookPath)) {
  throw new Error('缺少上传工作簿路径。用法：node build-v90-person-workbook-import.mjs <xlsx路径>');
}
const workbookBytes = fs.readFileSync(workbookPath);
const workbookHash = crypto.createHash('sha256').update(workbookBytes).digest('hex');
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
const text = value => String(value == null ? '' : value).trim();

// ---------- xlsx 读取（无 xlsx 依赖，直接读 OOXML 内部 XML） ----------
function unzipEntry(entry) {
  return execFileSync('unzip', ['-p', workbookPath, entry], { maxBuffer: 1024 * 1024 * 64 }).toString('utf8');
}
function loadSharedStrings() {
  const xml = unzipEntry('xl/sharedStrings.xml');
  const items = [];
  const siRegex = /<si>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = siRegex.exec(xml))) {
    const body = match[1];
    const parts = [];
    const tRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(body))) parts.push(decodeXmlEntities(tMatch[1]));
    items.push(parts.join(''));
  }
  return items;
}
function decodeXmlEntities(value) {
  return value
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');
}
function parseSheet(sheetName, shared) {
  const xml = unzipEntry(`xl/worksheets/${sheetName}`);
  const rows = new Map();
  const rowRegex = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(xml))) {
    const rowNumber = Number(rowMatch[1]);
    const rowBody = rowMatch[2];
    const cellValues = {};
    // 自闭合空单元格（如 <c r="M2" s="21"/>）不能用同一条"开标签…</c>"规则匹配，
    // 否则非贪婪匹配会跨过它们，把下一个真正带值的单元格错配到这一列上。
    const cellRegex = /<c r="([A-Z]+)\d+"[^>]*\/>|<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowBody))) {
      if (cellMatch[2] === undefined) continue; // 自闭合空单元格，跳过
      const column = cellMatch[2];
      const attrs = cellMatch[3];
      const body = cellMatch[4];
      const isShared = /t="s"/.test(attrs);
      const valueMatch = /<v>([\s\S]*?)<\/v>/.exec(body);
      if (!valueMatch) continue;
      const raw = valueMatch[1];
      cellValues[column] = isShared ? shared[Number(raw)] ?? '' : decodeXmlEntities(raw);
    }
    rows.set(rowNumber, cellValues);
  }
  return rows;
}

const shared = loadSharedStrings();
const overviewRows = parseSheet('sheet1.xml', shared);
const ethnicRows = parseSheet('sheet2.xml', shared);

// ---------- 生卒年 / 出场活跃时间解析 ----------
const CN_DIGITS = { 元: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function chineseYear(token) {
  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  if (token === '元') return 1;
  let total = 0, section = 0, matched = false;
  for (const character of token) {
    if (character === '十') { section = (section || 1) * 10; total += section; section = 0; matched = true; continue; }
    if (CN_DIGITS[character] === undefined) return null;
    section = CN_DIGITS[character]; matched = true;
  }
  return matched ? total + section : null;
}
/** 只取字面出现的四位数字年份；"约/？/后/前"等标记一律忽略修饰，只用于判断是否确定。 */
function extractYears(token) {
  if (!token) return [];
  const matches = [...token.matchAll(/\d{3,4}/g)].map(m => Number(m[0])).filter(y => y >= 1 && y <= 999);
  return matches;
}
/** 返回 {birthYear, deathYear}：仅在明确写出数字年份时填值，"未详"/无法解析一律为 null。 */
function parseLifespan(rawSpan) {
  const value = text(rawSpan);
  if (!value || value === '未詳—未詳') return { birthYear: null, deathYear: null, raw: value };
  const [birthPart, deathPart] = value.split(/[—–]/);
  const birthYears = extractYears(birthPart);
  const deathYears = extractYears(deathPart ?? '');
  return {
    birthYear: birthPart && !/未詳/.test(birthPart) && birthYears.length ? birthYears[0] : null,
    deathYear: deathPart && !/未詳/.test(deathPart) && deathYears.length ? deathYears[0] : null,
    raw: value,
  };
}
function parseActivitySpan(rawSpan) {
  const value = text(rawSpan);
  if (!value) return { earliestYear: null, latestYear: null, raw: value };
  const years = extractYears(value);
  if (!years.length) return { earliestYear: null, latestYear: null, raw: value };
  return { earliestYear: Math.min(...years), latestYear: Math.max(...years), raw: value };
}

const SCOPE_MIN_YEAR = 184;
const SCOPE_MAX_YEAR = 280;
/**
 * 闭区间 184—280：仅当存在明确早于184的卒年，或明确晚于280的生年时排除；
 * 缺失年代（未详）一律视为不违反范围，不因缺日期而剔除——与 v60 先例一致。
 */
function withinScope(lifespan, activity) {
  if (lifespan.deathYear != null && lifespan.deathYear < SCOPE_MIN_YEAR) return false;
  if (lifespan.birthYear != null && lifespan.birthYear > SCOPE_MAX_YEAR) return false;
  if (lifespan.deathYear == null && lifespan.birthYear == null) {
    if (activity.latestYear != null && activity.latestYear < SCOPE_MIN_YEAR) return false;
    if (activity.earliestYear != null && activity.earliestYear > SCOPE_MAX_YEAR) return false;
  }
  return true;
}

// ---------- 政权归一化：蜀汉一律写季汉 ----------
function normalizePolity(raw) {
  return text(raw).replace(/蜀漢/g, '季漢').replace(/蜀汉/g, '季汉');
}

// ---------- 既有身份库（用于查重） ----------
const context = { window: {} };
context.window.window = context.window;
vm.createContext(context);
for (const name of ['person-name-normalization.js', 'person-identities.js']) {
  vm.runInContext(fs.readFileSync(path.join(dataDir, name), 'utf8'), context, { filename: `data/${name}` });
}
const normalization = context.window.SGZ_PERSON_NAME_NORMALIZATION;
const normalize = value => text(normalization?.toSimplified?.(text(value)) || value).replace(/\s+/g, '');
const existingRegistry = JSON.parse(fs.readFileSync(path.join(dataDir, 'v63-person-registry.json'), 'utf8'));
const existingByName = new Map();
for (const person of existingRegistry.people || []) {
  const key = normalize(person.name);
  if (!key) continue;
  const bucket = existingByName.get(key) || [];
  bucket.push(person.personId);
  existingByName.set(key, bucket);
}

// ---------- 逐行转换 ----------
const DAIKAO_PATTERN = /待考/;
function isUsableCitation(sourceTitleRaw, quoteRaw) {
  const sourceTitle = text(sourceTitleRaw);
  const quote = text(quoteRaw);
  if (!sourceTitle || !quote) return false;
  if (DAIKAO_PATTERN.test(sourceTitle) || DAIKAO_PATTERN.test(quote)) return false;
  return true;
}

function overviewRecord(rowNumber, row) {
  const name = text(row.B);
  if (!name) return null;
  const lifespan = parseLifespan(row.G);
  const activity = parseActivitySpan(row.H);
  return {
    rowNumber,
    name,
    zi: text(row.C),
    province: text(row.D),
    commandery: text(row.E),
    county: text(row.F),
    lifespanRaw: text(row.G),
    activityRaw: text(row.H),
    lifespan,
    activity,
    polityRaw: text(row.I),
    faction: text(row.J),
    selection: text(row.K),
    officeRaw: text(row.L),
    peerageRaw: text(row.M),
    posthumousGrantRaw: text(row.N),
    posthumousTitleRaw: text(row.O),
    sourceTitleRaw: text(row.P),
    quoteRaw: text(row.Q),
    bioRaw: text(row.R),
    ethnicity: '',
  };
}
function ethnicRecord(rowNumber, row) {
  const name = text(row.C);
  if (!name) return null;
  const lifespan = parseLifespan(row.H);
  return {
    rowNumber,
    name,
    ethnicity: text(row.B),
    zi: text(row.D),
    province: text(row.E),
    commandery: text(row.F),
    county: text(row.G),
    lifespanRaw: text(row.H),
    activityRaw: '',
    lifespan,
    activity: { earliestYear: null, latestYear: null, raw: '' },
    polityRaw: text(row.I),
    faction: text(row.J),
    selection: '',
    officeRaw: text(row.K),
    peerageRaw: text(row.L),
    posthumousGrantRaw: '',
    posthumousTitleRaw: text(row.M),
    sourceTitleRaw: text(row.N),
    quoteRaw: text(row.O),
    bioRaw: '',
  };
}

const overviewRecords = [...overviewRows.keys()].filter(r => r > 1).sort((a, b) => a - b)
  .map(r => overviewRecord(r, overviewRows.get(r))).filter(Boolean);
const ethnicRecords = [...ethnicRows.keys()].filter(r => r > 1).sort((a, b) => a - b)
  .map(r => ethnicRecord(r, ethnicRows.get(r))).filter(Boolean);

let inScopeCount = 0, outOfScopeCount = 0, usableCitationCount = 0;
const nameOccurrence = new Map();
function toPersonRow(record, sheetLabel, sourcePrefix) {
  const inScope = withinScope(record.lifespan, record.activity);
  if (!inScope) { outOfScopeCount += 1; return null; }
  inScopeCount += 1;
  const usableCitation = isUsableCitation(record.sourceTitleRaw, record.quoteRaw);
  if (usableCitation) usableCitationCount += 1;
  const normalizedName = normalize(record.name);
  const occurrence = (nameOccurrence.get(normalizedName) || 0) + 1;
  nameOccurrence.set(normalizedName, occurrence);
  const sourceRecordId = `source:v90:${sourcePrefix}:${String(record.rowNumber).padStart(4, '0')}`;
  const existingMatches = existingByName.get(normalizedName) || [];
  const matchedExisting = existingMatches.length === 1 ? existingMatches[0] : null;
  const personId = matchedExisting || `person:v90:${hash(`${normalizedName}|${sourceRecordId}`)}`;
  const polity = normalizePolity(record.polityRaw);
  return {
    personId,
    canonicalPersonId: personId,
    matchedExisting: Boolean(matchedExisting),
    ambiguousExistingMatches: existingMatches.length > 1 ? existingMatches : [],
    sourceRecordId,
    name: record.name,
    rawName: record.name,
    normalizedName,
    zi: record.zi,
    birthplace: [record.province, record.commandery, record.county].filter(Boolean).join('·'),
    birthYearRaw: record.lifespan.birthYear == null ? (record.lifespanRaw.split(/[—–]/)[0] || '') : String(record.lifespan.birthYear),
    birthYear: record.lifespan.birthYear,
    deathYearRaw: record.lifespan.deathYear == null ? (record.lifespanRaw.split(/[—–]/)[1] || '') : String(record.lifespan.deathYear),
    deathYear: record.lifespan.deathYear,
    activityRaw: record.activityRaw,
    polityRaw: record.polityRaw,
    polity,
    ethnicity: record.ethnicity,
    faction: record.faction,
    selectionRaw: record.selection,
    officeRaw: record.officeRaw,
    peerageRaw: record.peerageRaw,
    posthumousGrantRaw: record.posthumousGrantRaw,
    posthumousTitleRaw: record.posthumousTitleRaw,
    sourceTitleRaw: record.sourceTitleRaw,
    quoteRaw: record.quoteRaw,
    bioRaw: record.bioRaw,
    usableCitation,
    ordinal: record.rowNumber - 1,
    workbookSource: { fileName: path.basename(workbookPath), sha256: workbookHash, sheet: sheetLabel, row: record.rowNumber },
  };
}

const people = [
  ...overviewRecords.map(r => toPersonRow(r, '人物總覽', 'overview')),
  ...ethnicRecords.map(r => toPersonRow(r, '民族政權', 'ethnic')),
].filter(Boolean);

const matchedCount = people.filter(p => p.matchedExisting).length;
const newCount = people.length - matchedCount;

const payload = {
  schemaVersion: 'V90',
  modelId: 'sgz-v90-person-workbook-import',
  workbook: { fileName: path.basename(workbookPath), sha256: workbookHash, sheets: { 人物總覽: overviewRows.size - 1, 民族政權: ethnicRows.size - 1 } },
  policy: {
    scope: `卒年≥${SCOPE_MIN_YEAR}、生年≤${SCOPE_MAX_YEAR}（闭区间）；生卒年缺失时不以此排除，仅在有明确数字年份越界时排除`,
    polityNormalization: '蜀漢/蜀汉一律正规化为季漢/季汉',
    stableId: '命中既有身份库（按简体归一化姓名唯一匹配）沿用原 personId；否则新建 person:v90:<hash>',
    duplicateRows: '不在本脚本内自动合并同名候选；ambiguousExistingMatches 非空的行留待人工核实',
    publicationStatus: '本文件全部字段默认 review-only；读者可见性由独立的 v90-person-identity-review.json 决定',
    appointmentImport: '不由官职/爵位/追赠/谥号字段自动生成任官或封爵记录',
    citationBoundary: 'sourceTitleRaw/quoteRaw 照录原表史源与引文；含"待考"字样的不视为可用引证',
  },
  summary: {
    overviewRows: overviewRows.size - 1,
    ethnicRows: ethnicRows.size - 1,
    totalRows: overviewRows.size - 1 + (ethnicRows.size - 1),
    inScope: inScopeCount,
    outOfScope: outOfScopeCount,
    usableCitations: usableCitationCount,
    matchedExisting: matchedCount,
    newCandidates: newCount,
  },
  people,
};

fs.writeFileSync(path.join(dataDir, 'v90-person-workbook-import.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(dataDir, 'v90-person-workbook-import.js'), `(function(global){'use strict';global.SGZ_V90_PERSON_WORKBOOK_IMPORT=Object.freeze(${JSON.stringify(payload)});})(typeof window!=='undefined'?window:globalThis);\n`, 'utf8');

console.log(JSON.stringify(payload.summary, null, 2));
