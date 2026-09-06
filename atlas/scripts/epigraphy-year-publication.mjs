import { sourceDigest } from './appointment-publication.mjs';

export const JIN_TAISHI_FIRST_YEAR = 265;
export function taishiChronologicalYear(value) {
  const match = String(value || '').match(/^泰始(元|一|二|三|四|五|六|七|八|九|十)年$/);
  if (!match) return null;
  const ordinal = { 元: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }[match[1]];
  return JIN_TAISHI_FIRST_YEAR + ordinal - 1;
}

export function reviewedEpigraphicYears(raws, review) {
  if (!review.source?.title || !/^https:\/\//.test(review.source.url) || !review.source.note) {
    throw new Error('纪年更正缺少出处');
  }
  const byId = new Map(raws.map(row => [row.id, row]));
  const result = new Map();
  for (const row of review.records) {
    const raw = byId.get(row.recordId);
    if (!raw || result.has(row.recordId) || sourceDigest(raw) !== row.sourceDigest ||
        raw.yearText !== row.yearText || raw.year !== row.previousYear) {
      throw new Error(`纪年底本已变更或重复，须重新审校：${row.recordId}`);
    }
    const year = taishiChronologicalYear(row.yearText);
    if (year === null || row.year !== year) throw new Error(`泰始纪年换算不符：${row.recordId}`);
    result.set(row.recordId, year);
  }
  return result;
}
