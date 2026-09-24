import {DomainError} from '../catalogue';

/** Historical numbering, not astronomical numbering: negative = BCE, no year zero. */
export interface HistoricalTime {
  original: string;
  earliestYear: number | null;
  latestYear: number | null;
  precision: 'unknown' | 'year' | 'range';
  certainty: 'unknown' | 'explicit' | 'inferred';
  era: string | null;
  polity: string | null;
  sexagenary: string | null;
  basis: string;
}
export function requireResearch(value: unknown, code: string, message: string): asserts value {
  if (!value) throw new DomainError('prosopography-' + code, message);
}
export function historicalYear(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) !== 0 && Math.abs(Number(value)) <= 5000;
}
export function unknownTime(original = ''): HistoricalTime {
  return {original, earliestYear: null, latestYear: null, precision: 'unknown', certainty: 'unknown', era: null, polity: null, sexagenary: null, basis: ''};
}
export function validateTime(time: HistoricalTime): void {
  requireResearch(time && typeof time === 'object' && !Array.isArray(time), 'time', '年代必須是完整記錄。');
  requireResearch(typeof time.original === 'string' && typeof time.basis === 'string', 'time', '須保留原始紀年與換算依據。');
  for (const value of [time.era, time.polity, time.sexagenary]) requireResearch(value === null || typeof value === 'string', 'time', '年號、政權及干支須為文字或空值。');
  requireResearch([time.earliestYear, time.latestYear].every(y => y === null || historicalYear(y)), 'time', '未知年份使用 null；不允許第零年、小數或超出範圍的年份。');
  requireResearch(time.earliestYear === null || time.latestYear === null || time.earliestYear <= time.latestYear, 'time', '年代下限不可晚於上限。');
  requireResearch(['unknown', 'year', 'range'].includes(time.precision) && ['unknown', 'explicit', 'inferred'].includes(time.certainty), 'time', '年代精度或確定性無效。');
  const unknown = time.earliestYear === null && time.latestYear === null;
  requireResearch((time.precision === 'unknown') === unknown && (time.certainty === 'unknown') === unknown, 'time', '未知年代不可攜帶數字；已知上下限不可標成未知。');
  requireResearch(time.precision !== 'year' || (time.earliestYear !== null && time.earliestYear === time.latestYear), 'time', '單年精度須有相同的已知上下限。');
  requireResearch(time.certainty !== 'inferred' || time.basis.trim(), 'time', '推定年代必須說明推定依據。');
}
