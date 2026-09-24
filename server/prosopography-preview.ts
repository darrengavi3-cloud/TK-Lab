import type {Revision} from '../domain/revisions';
import {canonicalJson, sha256} from '../domain/revisions';
import {legacyResearchGraph} from '../domain/prosopography/legacy';
import {graphPins, revisionPin, verifyGraphReferences, verifyRevision} from '../domain/prosopography/evidence';
import {personPresenceInYear} from '../domain/prosopography/presence';
import {graphWarnings, pinKey, researchId, validateGraph} from '../domain/prosopography/validate';
import {historicalYear, requireResearch as ensure} from '../domain/prosopography/time';
import type {ResearchGraph, RevisionPin} from '../domain/prosopography/types';

/** No write callback exists: preview cannot mutate D1, R2, a release, or a record. */
export interface ResearchReadStore {
  watermark(): Promise<number>;
  snapshot(watermark: number): Promise<Revision[]>;
  revision(id: string, version: number): Promise<Revision | null>;
}
export function parseResearchQuery(params: URLSearchParams): {personId: string; watermark?: number; year?: number} {
  const personId = params.get('personId');
  ensure(researchId(personId), 'person', '請指定人物識別碼，不使用人物名稱代替。');
  const numeric = (key: string) => {
    const value = params.get(key);
    if (value === null) return undefined;
    ensure(/^-?\d+$/.test(value) && Number.isSafeInteger(Number(value)), 'query', '快照及年份必須是整數，空白與小數均無效。');
    return Number(value);
  };
  const watermark = numeric('watermark'), year = numeric('year');
  ensure(watermark === undefined || watermark >= 0, 'query', '快照序號不可為負數。');
  ensure(year === undefined || historicalYear(year), 'year', '不使用第零年或無效年份。');
  return {personId, ...(watermark === undefined ? {} : {watermark}), ...(year === undefined ? {} : {year})};
}
async function fixedContext(store: ResearchReadStore, requested: number | undefined) {
  const latest = await store.watermark();
  const watermark = requested === undefined ? latest : requested;
  ensure(Number.isSafeInteger(watermark) && watermark >= 0 && watermark <= latest, 'watermark', '快照不可超出已提交資料範圍。');
  return {watermark, rows: await store.snapshot(watermark)};
}
async function loadPins(store: ResearchReadStore, pins: RevisionPin[], cache: Map<string, Revision>): Promise<void> {
  const unique = [...new Map(pins.map(p => [pinKey(p), p])).values()];
  ensure(unique.length <= 2000, 'size', '單次預覽最多引用 2000 個不同修訂。');
  for (let i = 0; i < unique.length; i += 8) await Promise.all(unique.slice(i, i + 8).map(async pin => {
    if (cache.has(pinKey(pin))) return;
    const row = await store.revision(pin.id, pin.revision);
    ensure(row, 'source-reference', '所引用的固定修訂不存在。');
    cache.set(pinKey(pin), row);
  }));
}
async function result(graph: ResearchGraph, rows: Revision[], cache: Map<string, Revision>, watermark: number, year?: number) {
  validateGraph(graph);
  const person = rows.find(r => r.id === graph.personId && r.data.kind === 'person');
  ensure(person, 'person', '所選快照中找不到該人物。');
  await verifyRevision(person, revisionPin(person), watermark);
  const sources = await verifyGraphReferences(graph, cache, watermark);
  const artifact = {model: 'prosopography-p1-preview-1', watermark, person: revisionPin(person), graph,
    sources: sources.map(r => ({pin: revisionPin(r), title: r.data.title, edition: r.data.edition, locator: r.data.locator, text: r.data.text, textScope: r.data.textScope})),
    warnings: graphWarnings(graph), presence: year === undefined ? [] : personPresenceInYear(graph, year)};
  return {...artifact, digest: await sha256(canonicalJson(artifact)), structurallyValid: true, historicalReviewPerformed: false, persisted: false, published: false};
}
export async function previewPersonResearch(store: ResearchReadStore, input: {personId: string; watermark?: number; year?: number}) {
  ensure(input && researchId(input.personId), 'person', '人物識別碼無效。');
  ensure(input.year === undefined || historicalYear(input.year), 'year', '查詢年份無效。');
  const {watermark, rows} = await fixedContext(store, input.watermark);
  const cache = new Map(rows.map(r => [pinKey(revisionPin(r)), r]));
  const needed: RevisionPin[] = rows.flatMap(r => r.data.kind === 'appointment' && r.data.personId === input.personId ? r.data.evidence.map(e => ({id: e.sourceId, revision: e.sourceRevision, digest: ''})) : []);
  await loadPins(store, needed, cache);
  const graph = await legacyResearchGraph(input.personId, rows, cache, watermark);
  return result(graph, rows, cache, watermark, input.year);
}
export async function validateResearchPreview(store: ResearchReadStore, input: {graph: ResearchGraph; watermark?: number; year?: number}) {
  ensure(input && typeof input === 'object', 'input', '請提供研究圖與所選快照。');
  validateGraph(input.graph);
  ensure(input.year === undefined || historicalYear(input.year), 'year', '查詢年份無效。');
  const {watermark, rows} = await fixedContext(store, input.watermark);
  const cache = new Map(rows.map(r => [pinKey(revisionPin(r)), r]));
  const pins = graphPins(input.graph);
  await loadPins(store, [...pins.sources, ...pins.origins], cache);
  return result(input.graph, rows, cache, watermark, input.year);
}
