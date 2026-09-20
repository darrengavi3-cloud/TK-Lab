#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const dataDir = path.join(root, 'data');
const readJson = name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
const sourceDigest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

const v90 = readJson('v90-person-workbook-import.json');
const v62ReaderScope = readJson('v62-reader-scope.json');
const baseScopeSha256 = sourceDigest(v62ReaderScope);

// 只对"新候选＋非待考史源与引文齐全"的人物生成 add 条目：已命中既有身份库的人
// 不在此处改动其身份归属；史源或引文含"待考"字样的留在候选层，不视为已核。
const qualifying = v90.people.filter(row => !row.matchedExisting && row.usableCitation);

const MULTI_POLITY = /[、,，]/;
function verifiedFields(row) {
  const polity = String(row.polity || '').trim();
  if (!polity || MULTI_POLITY.test(polity)) return {};
  return { dynastyTags: [polity] };
}

const records = qualifying.map(row => ({
  reviewId: `identity:v90:${row.personId}`,
  personId: row.personId,
  name: row.name,
  action: 'add',
  status: 'verified',
  reviewedAt: '2026-09-19',
  reason: `据用户提供《汉末—西晋统一人物数据库》人物总表第${row.workbookSource.row}行收录（${row.workbookSource.sheet}）；卒年${row.deathYear ?? '未详'}、生年${row.birthYear ?? '未详'}落在184—280范围内或未见明确越界年份；史源与引文见 citations，未逐条外部核验，未编造原典网址。`,
  verifiedFields: verifiedFields(row),
  replaceFields: [],
  sourceGuards: [{
    dataset: 'v90',
    idField: 'sourceRecordId',
    id: row.sourceRecordId,
    sha256: sourceDigest(row),
  }],
  citations: [{
    title: row.sourceTitleRaw,
    url: '',
    quote: row.quoteRaw,
  }],
}));

const payload = {
  schemaVersion: 1,
  baseScopeSha256,
  policy: {
    scope: '仅覆盖 v90-person-workbook-import.json 中未命中既有身份库、且史源与引文均非"待考"的新候选',
    urlPolicy: 'V90 起原典引用网址非必填（person-identity-publication.mjs 已放宽）；本批全部留空，未构造未经核实的链接',
    reviewDepth: '本批为按用户提供总表批量收录，reason 字段如实说明未逐条外部核验，不冒充逐人史料考证',
  },
  records,
};

fs.writeFileSync(path.join(dataDir, 'v90-person-identity-review.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ qualifying: qualifying.length, records: records.length }, null, 2));
