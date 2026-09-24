import type {Source} from '../domain/catalogue';
import {canonicalJson, type Revision} from '../domain/revisions';
import {legacyResearchPreview, personResearchRows} from '../domain/prosopography/legacy';
import {researchPresence} from '../domain/prosopography/presence';
import {requireResearch as ok} from '../domain/prosopography/time';
import {validateResearchGraph, verifyResearchGraph, pinKey} from '../domain/prosopography/validate';
import type {ResearchGraph} from '../domain/prosopography/types';
import {matchesLegacyOriginal} from '../domain/prosopography/origin';

/** Adapter is read-only; all HTTP access must remain behind the existing owner guard. */
export interface ResearchRepository {
  watermark(): Promise<number>;
  snapshot(watermark: number): Promise<Revision[]>;
  getRevision(id: string, version: number): Promise<Revision | null>;
}
export const MAX_PREVIEW_SOURCES = 200;
export function parseResearchWatermark(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  ok(/^(0|[1-9][0-9]*)$/.test(raw) && Number.isSafeInteger(Number(raw)), 'watermark', '水位必須是非負整數，不能使用空字串或小數。');
  return Number(raw);
}
async function captureWatermark(repo: ResearchRepository, requested?: number): Promise<number> {
  const current = await repo.watermark();
  ok(Number.isSafeInteger(current) && current >= 0, 'watermark', '資料庫水位無效。');
  ok(requested === undefined || (Number.isSafeInteger(requested) && requested >= 0 && requested <= current), 'watermark', '指定水位尚未存在或無效。');
  return requested ?? current;
}
async function loadSources(repo: ResearchRepository, refs: {id: string; revision: number}[], watermark: number) {
  const distinct = new Map(refs.map(r => [r.id + '@' + r.revision, r]));
  ok(distinct.size <= MAX_PREVIEW_SOURCES, 'source-limit', '單次人物研究預覽最多讀取 200 個史料修訂；請縮小研究範圍。');
  const sources = new Map<string, Revision<Source>>();
  for (const [key, ref] of distinct) {
    const row = await repo.getRevision(ref.id, ref.revision);
    ok(row && row.data.kind === 'source' && row.id === ref.id && row.number === ref.revision && row.commit <= watermark, 'source-reference', '缺少指定水位內的原引用版本；不使用新版替代。');
    sources.set(key, JSON.parse(canonicalJson(row)) as Revision<Source>);
  }
  return sources;
}
export async function previewPersonResearch(repo: ResearchRepository, personId: string, requestedWatermark?: number) {
  ok(typeof personId === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_.@/-]{0,199}$/.test(personId), 'person-reference', '人物 ID 無效。');
  const watermark = await captureWatermark(repo, requestedWatermark);
  const rows = personResearchRows(await repo.snapshot(watermark), watermark, personId);
  const sources = await loadSources(repo, rows.flatMap(r => r.data.evidence.map(e => ({id: e.sourceId, revision: e.sourceRevision}))), watermark);
  return legacyResearchPreview(rows, sources, watermark, personId);
}
/** Validates a proposed graph, but never saves it or changes the active release. */
export async function inspectPersonResearch(repo: ResearchRepository, input: {graph: ResearchGraph; watermark?: number; year?: number}) {
  ok(input && typeof input === 'object' && !Array.isArray(input), 'graph', '請提供研究圖資料。');
  const graph = JSON.parse(canonicalJson(input.graph)) as ResearchGraph;
  validateResearchGraph(graph);
  const watermark = await captureWatermark(repo, input.watermark);
  const rows = personResearchRows(await repo.snapshot(watermark), watermark, graph.personId);
  const person = rows.find(r => r.id === graph.personId && r.data.kind === 'person');
  ok(person, 'person-reference', '指定水位內不存在此人物。');
  const origins = new Map(rows.map(r => [r.id + '@' + r.number, r]));
  for (const tenure of graph.tenures) if (tenure.legacyOrigin) {
    const origin = origins.get(pinKey(tenure.legacyOrigin));
    ok(origin && origin.data.kind === 'appointment' && origin.data.personId === graph.personId && origin.id === tenure.id && origin.digest === tenure.legacyOrigin.digest, 'origin-reference', '舊任官來源須對應此水位、人物及原穩定 ID。');
    ok(matchesLegacyOriginal(tenure, origin.data), 'origin-content', '固定舊修訂與原官名、性質、政權或轄區文字不符；校改請另立有依據的說法。');
  }
  // Reuse the bridge's origin byte verification, including person evidence.
  const refs = [...graph.evidence.map(e => e.source), ...graph.textualVariants.flatMap(v => v.readings.map(r => r.source)), ...rows.flatMap(r => r.data.evidence.map(e => ({id: e.sourceId, revision: e.sourceRevision})))];
  const sources = await loadSources(repo, refs, watermark);
  await legacyResearchPreview(rows, sources, watermark, graph.personId);
  const checked = await verifyResearchGraph(graph, sources, watermark);
  return {readOnly: true as const, persisted: false as const, watermark, graphDigest: checked.digest, warnings: checked.warnings,
    presence: input.year === undefined ? null : await researchPresence(checked.graph, sources, watermark, input.year)};
}
