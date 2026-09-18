import {canonicalJson, sha256, type Revision} from '../revisions';
import {validateResearchGraph, pinKey} from './validate';
import {requireResearch as ok} from './time';
import type {ResearchGraph, RevisionPin} from './types';

export const RESEARCH_COLLECTIONS = ['tenures', 'events', 'claims', 'evidence', 'factualConflicts', 'textualVariants'] as const;
export interface JournalPin extends RevisionPin {kind: 'person' | 'appointment' | 'source'}
export interface JournalManifest {
  format: 'research-journal-1';
  personId: string;
  catalogueWatermark: number;
  graphDigest: string;
  pins: JournalPin[];
}
export interface JournalRow {
  person_id: string; version: number; request_id: string; request_hash: string;
  catalogue_watermark: number; graph: string; graph_digest: string;
  manifest: string; manifest_digest: string; actor: string; reason: string; at: string; guard: number;
}
export function researchMembers(graph: ResearchGraph) {
  return RESEARCH_COLLECTIONS.flatMap(kind => graph[kind].map(value => ({kind, id: value.id, payload: canonicalJson(value)})));
}
/** Copying a verified legacy excerpt does not constitute a new historical review. */
export function requiresResearchReview(graph: ResearchGraph): boolean {
  return graph.claims.some(c => c.assessment === 'verified' && c.derivation !== 'uninterpreted')
    || graph.tenures.some(t => Object.entries(t.selected).some(([key, value]) => key !== 'rationale' && (Array.isArray(value) ? value.length > 0 : value !== null)));
}
/** Raw legacy claims cannot authenticate edited words, dates, or a removed origin pin. */
export function validateLegacyClaims(graph: ResearchGraph, original: ResearchGraph): void {
  const tenures = new Map(original.tenures.map(t => [t.id, t]));
  const claims = new Map(original.claims.map(c => [c.id, c]));
  for (const tenure of graph.tenures) {
    const old = tenures.get(tenure.id);
    if (old) ok(canonicalJson(tenure.legacyOrigin) === canonicalJson(old.legacyOrigin), 'origin-reference', '既有任職不可移除或替換原修訂引用。');
  }
  for (const claim of graph.claims) {
    if (claim.content.type !== 'legacy-record' && !claims.has(claim.id)) continue;
    const old = claims.get(claim.id);
    ok(old && canonicalJson(claim.subject) === canonicalJson(old.subject)
      && canonicalJson(claim.content) === canonicalJson(old.content) && claim.derivation === 'uninterpreted',
    'origin-content', '舊記錄的原文字句及紀年不可改寫；研究解釋請另立說法。');
  }
}
export async function journalManifest(graph: ResearchGraph, watermark: number, rows: readonly Revision[]): Promise<JournalManifest> {
  const pins = new Map<string, JournalPin>();
  for (const row of rows) {
    ok(row.id === row.data.id && row.commit > 0 && row.commit <= watermark && row.digest === await sha256(canonicalJson(row.data)), 'origin-integrity', '固定修訂內容不符。');
    const pin = {id: row.id, revision: row.number, digest: row.digest, kind: row.data.kind};
    const old = pins.get(pinKey(pin));
    ok(!old || canonicalJson(old) === canonicalJson(pin), 'origin-integrity', '同一修訂出現相左的摘要。');
    pins.set(pinKey(pin), pin);
  }
  return {format: 'research-journal-1', personId: graph.personId, catalogueWatermark: watermark,
    graphDigest: await sha256(canonicalJson(graph)), pins: [...pins.values()].sort((a, b) => pinKey(a) < pinKey(b) ? -1 : pinKey(a) > pinKey(b) ? 1 : 0)};
}
export async function decodeJournal(row: JournalRow) {
  const graph = JSON.parse(row.graph) as ResearchGraph, manifest = JSON.parse(row.manifest) as JournalManifest;
  validateResearchGraph(graph);
  ok(Number.isSafeInteger(row.version) && row.version > 0 && row.guard === 1
    && graph.personId === row.person_id && manifest.personId === row.person_id
    && manifest.format === 'research-journal-1' && manifest.catalogueWatermark === row.catalogue_watermark
    && manifest.graphDigest === row.graph_digest && await sha256(canonicalJson(graph)) === row.graph_digest
    && await sha256(canonicalJson(manifest)) === row.manifest_digest, 'journal-integrity', '研究修訂摘要或身份不相符。');
  return {personId: row.person_id, number: row.version, catalogueWatermark: row.catalogue_watermark,
    graph, manifest, graphDigest: row.graph_digest, manifestDigest: row.manifest_digest,
    actor: row.actor, reason: row.reason, at: row.at};
}
