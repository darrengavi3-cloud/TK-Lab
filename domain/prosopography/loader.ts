import type {Revision} from '../revisions';
import {validateRecord} from '../catalogue';
import {pinKey, researchId} from './graph';
import {legacyResearchPreview} from './preview';
import {historicalYear, requireResearch as invariant} from './time';

/** Read-only ports. There is deliberately no save, publish, or mutation operation. */
export interface ResearchPreviewStore {
  watermark(): Promise<number>;
  snapshot(watermark: number): Promise<Revision[]>;
  sourceRevision(id: string, revision: number): Promise<Revision | null>;
}
export function previewOptions(params: URLSearchParams, current: number) {
  invariant(Number.isSafeInteger(current) && current >= 0, 'watermark', '資料快照序號無效。');
  for (const key of params.keys()) invariant(['watermark', 'year'].includes(key) && params.getAll(key).length === 1, 'query', '只接受一次 watermark 與 year 參數。');
  const rawWatermark = params.get('watermark'), rawYear = params.get('year');
  invariant(rawWatermark === null || /^(0|[1-9][0-9]*)$/.test(rawWatermark), 'query', '快照序號須為完整的非負整數。');
  invariant(rawYear === null || /^-?[1-9][0-9]*$/.test(rawYear), 'query', '年份須為完整公元紀年，不使用第零年。');
  const watermark = rawWatermark === null ? current : Number(rawWatermark);
  const year = rawYear === null ? null : Number(rawYear);
  invariant(Number.isSafeInteger(watermark) && watermark <= current, 'watermark', '不可查詢尚未存在的快照序號。');
  invariant(year === null || historicalYear(year), 'year', '年份超出支援範圍。');
  return {watermark, year};
}
export async function loadResearchPreview(store: ResearchPreviewStore, personId: string, params: URLSearchParams) {
  invariant(researchId(personId), 'person', '人物識別碼無效。');
  const options = previewOptions(params, await store.watermark());
  const rows = await store.snapshot(options.watermark);
  const relevant = rows.filter(r => r.id === personId || (r.data.kind === 'appointment' && r.data.personId === personId));
  invariant(relevant.some(r => r.id === personId && r.data.kind === 'person'), 'person', '此固定快照沒有該人物。');
  invariant(relevant.length <= 1001, 'size', '單次人物預覽最多處理一千條任官。');
  const refs = new Map<string, {id: string; revision: number}>();
  for (const r of relevant) {
    validateRecord(r.data);
    for (const e of r.data.evidence) {
      const ref = {id: e.sourceId, revision: e.sourceRevision};
      refs.set(pinKey(ref), ref);
    }
  }
  invariant(refs.size <= 256, 'size', '單次預覽最多讀取 256 個史料修訂，未省略其餘證據；請縮小整理批次。');
  const sources = new Map<string, Revision>();
  const pending = [...refs];
  // Bound concurrent reads; duplicate citations only fetch one immutable revision.
  for (let offset = 0; offset < pending.length; offset += 4) {
    const result = await Promise.all(pending.slice(offset, offset + 4).map(async ([key, ref]) => {
      const row = await store.sourceRevision(ref.id, ref.revision);
      invariant(row, 'source', '缺少固定史料修訂：' + ref.id + '@' + ref.revision);
      return [key, row] as const;
    }));
    for (const [key, row] of result) sources.set(key, row);
  }
  return legacyResearchPreview(rows, sources, personId, options.watermark, options.year);
}
