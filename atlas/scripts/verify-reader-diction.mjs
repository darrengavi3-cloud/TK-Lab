/* 读者投影词例门禁。
 *
 * 校勘上「未详」（不知其事）与「存疑」（有说而未定）是两种判断，读者界面
 * 不能混用，也不能与「未知／不详／无考」等同义写法并存。年代栏另有一套
 * 符号：范围槽位中的「？」表示该端未详，紧跟具体纪年之后的「？」表示该
 * 系年存疑。此脚本按 DESIGN.md「年代与证据词例」核验读者投影，并把需要
 * 人工审定的条目逐条列出。
 *
 * 默认只报告不阻断（exit 0）；加 --strict 后任何越例即失败，可在词例整理
 * 完成后接入 release-check.mjs。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const json = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

/* 规范词例。除此之外的同义写法一律视为越例。 */
const CANONICAL_UNKNOWN = '未详';
const CANONICAL_DOUBTFUL = '存疑';
const UNKNOWN_SYNONYMS = /(未知|不詳|未詳|无考|無考|不明)/;
const BARE_UNKNOWN = /^(未知|不详|不詳|未詳|无考|無考|不明)$/;
/* 年代栏允许的「？」用法：范围端点（—？ ／ ？—）或紧跟纪年之后（…年）？ */
const QUESTION_MARK = /[?？]/;
const ALLOWED_QUESTION = /(^[?？]—)|(—[?？]$)|(—[?？]、)|([年间初末後后]\s*[?？])|([）)]\s*[?？])/;
/* 任期栏承载了籍贯（部分并含表字）。显示层已按固定串式拆分呈现，
   规范源不动；此处只核验拆分是否覆盖，未能拆分者列出以便个别处理。 */
const PLACE_IN_TENURE = /(籍贯|籍貫|[一-鿿]{2,4}(郡|县|縣)?人[，,、。])/;
const TENURE_ZI = /^字([一-鿿]{1,3})[，,。]\s*/;
const TENURE_ORIGIN = /^([一-鿿]{2,10}?)人[，,。]\s*/;
const TENURE_ORIGIN_UNKNOWN = /^籍贯不详[，,。]\s*/;
function splitTenureText(raw) {
  const source = String(raw == null ? '' : raw).trim();
  if (!source) return { zi: '', origin: '', tenure: '', parsed: false };
  let rest = source, zi = '', origin = '';
  const ziMatch = rest.match(TENURE_ZI);
  if (ziMatch) { zi = ziMatch[1]; rest = rest.slice(ziMatch[0].length); }
  const unknownMatch = rest.match(TENURE_ORIGIN_UNKNOWN);
  if (unknownMatch) { origin = '未详'; rest = rest.slice(unknownMatch[0].length); }
  else {
    const originMatch = rest.match(TENURE_ORIGIN);
    if (originMatch) { origin = originMatch[1]; rest = rest.slice(originMatch[0].length); }
  }
  if (!origin) return { zi: '', origin: '', tenure: source, parsed: false };
  return { zi, origin, tenure: rest || '未详', parsed: true };
}

const TARGETS = [
  {
    file: 'data/v69-fangzhen-reader.json',
    label: '州镇表读者投影',
    rows: payload => payload.records || [],
    id: row => row.id,
    fields: ['tenureText', 'confirmedRange', 'appointmentStatus', 'commission', 'relation', 'seatType']
  },
  {
    file: 'data/v69-person-profiles.json',
    label: '人物小传读者投影',
    rows: payload => payload.profiles || payload.records || [],
    id: row => row.personId || row.id,
    fields: ['lifespanText', 'originText', 'note']
  }
];

const findings = { synonym: [], question: [], place: [], split: [] };

for (const target of TARGETS) {
  const full = path.join(root, target.file);
  if (!fs.existsSync(full)) continue;
  const rows = target.rows(json(target.file)) || [];
  for (const row of rows) {
    for (const field of target.fields) {
      const value = row[field];
      if (typeof value !== 'string' || !value) continue;
      const where = { file: target.label, id: String(target.id(row) || '?'), field, value };

      if (BARE_UNKNOWN.test(value)) {
        findings.synonym.push({ ...where, fix: CANONICAL_UNKNOWN });
      } else if (UNKNOWN_SYNONYMS.test(value) && !PLACE_IN_TENURE.test(value)) {
        findings.synonym.push({ ...where, fix: `改用「${CANONICAL_UNKNOWN}」` });
      }

      if (QUESTION_MARK.test(value) && !ALLOWED_QUESTION.test(value)) {
        findings.question.push(where);
      }

      if (field === 'tenureText' && PLACE_IN_TENURE.test(value)) {
        const parts = splitTenureText(value);
        if (parts.parsed) findings.split.push({ ...where, fix: `籍贯「${parts.origin}」${parts.zi ? `／表字「${parts.zi}」` : ''}　任期「${parts.tenure}」` });
        else findings.place.push(where);
      }
    }
  }
}

const sections = [
  ['同义写法越例', findings.synonym, `读者层只用「${CANONICAL_UNKNOWN}」与「${CANONICAL_DOUBTFUL}」两个词。`],
  ['问号用法待判', findings.question, '「？」须落在范围端点或紧跟纪年之后；其余位置含义不明。'],
  ['任期栏混装籍贯——显示层已拆分', findings.split, '规范源保持原样，读者界面按籍贯／表字／任期分栏呈现。'],
  ['任期栏混装籍贯——串式不合', findings.place, '不合固定串式，整串仍留在任期栏；如需分栏须个别处理。']
];

let total = 0;
for (const [title, list, note] of sections) {
  if (!title.includes('已拆分')) total += list.length;
  console.log(`\n【${title}】${list.length} 处　${note}`);
  for (const item of list) {
    console.log(`  ${item.id}　${item.field}　「${item.value}」${item.fix ? `　→ ${item.fix}` : ''}`);
  }
}

console.log(`\n合计 ${total} 处待处理（已由显示层拆分的 ${findings.split.length} 处不计）。`);
if (!total) {
  console.log('读者投影词例与 DESIGN.md 一致。');
} else if (strict) {
  throw new Error(`读者投影词例校验失败：${total} 处越例或待判。`);
} else {
  console.log('当前为报告模式；整理完成后以 --strict 接入 release-check.mjs。');
}
