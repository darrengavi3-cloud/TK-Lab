import {validateDate, validateRecord, type Source} from '../catalogue';
import {canonicalJson, sha256, type Revision} from '../revisions';
import {requireResearch as ok, validateTime} from './time';
import {CAREER_EVENT_TYPES, type Claim, type ResearchGraph, type RevisionPin} from './types';

export interface ResearchWarning {code: string; id: string; message: string}
export type SourceHistory = ReadonlyMap<string, Revision<Source>>;
export const MAX_RESEARCH_ITEMS = 5000;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const id = (v: unknown): v is string => text(v) && /^[a-zA-Z0-9][a-zA-Z0-9:_.@/-]{0,511}$/.test(v);
const assessments = ['pending', 'verified', 'disputed', 'excluded'];
export const pinKey = (pin: RevisionPin): string => pin.id + '@' + pin.revision;
export function validatePin(pin: RevisionPin): void {
  ok(object(pin) && id(pin.id) && Number.isSafeInteger(pin.revision) && pin.revision > 0 && /^[a-f0-9]{64}$/.test(pin.digest), 'pin', '引用必須固定 ID、正整數修訂及 SHA-256。');
}
function ids(values: unknown): asserts values is string[] {
  ok(Array.isArray(values) && values.every(id) && new Set(values).size === values.length, 'ids', '關聯 ID 清單不可重複或無效。');
}
/** Structural checks preserve historical disputes; only broken structure is rejected. */
export function validateResearchGraph(graph: ResearchGraph): ResearchWarning[] {
  ok(object(graph) && graph.model === 1 && id(graph.personId), 'graph', '人物誌模型或人物 ID 無效。');
  const collections = [graph.tenures, graph.events, graph.claims, graph.evidence, graph.factualConflicts, graph.textualVariants];
  ok(collections.every(Array.isArray), 'graph', '人物誌的實體與關聯清單不可缺失。');
  ok(collections.reduce((n, rows) => n + rows.length, 0) <= MAX_RESEARCH_ITEMS, 'limit', '單次研究預覽最多容納 5000 項記錄。');
  const used = new Set<string>();
  for (const rows of collections) for (const row of rows) {
    ok(object(row) && id(row.id) && !used.has(row.id), 'identity', '每項實體或關聯須使用不重複的穩定 ID。');
    used.add(row.id);
  }
  const warnings: ResearchWarning[] = [];
  const tenures = new Map(graph.tenures.map(t => [t.id, t]));
  const events = new Map(graph.events.map(e => [e.id, e]));
  const claims = new Map(graph.claims.map(c => [c.id, c]));
  for (const tenure of graph.tenures) {
    ok(tenure.personId === graph.personId && (tenure.officeId === null || id(tenure.officeId)), 'person-reference', '任職須關聯本人物及有效官職 ID。');
    ok([tenure.officeNameOriginal, tenure.polityOriginal, tenure.natureOriginal, tenure.jurisdictionOriginal, tenure.reason].every(text) && tenure.officeNameOriginal.trim(), 'tenure', '須完整保留原官名及原始描述。');
    ok(assessments.includes(tenure.assessment) && ['draft', 'review', 'ready'].includes(tenure.workflow) && ['private', 'reader'].includes(tenure.visibility), 'status', '研究判斷、工作流程與顯示政策須分開記錄。');
    ok(['none', 'incorrect', 'duplicate', 'not-held', 'out-of-scope', 'legacy-suppressed'].includes(tenure.disposition), 'status', '處置性質無效。');
    ok((tenure.assessment === 'excluded') === (tenure.disposition !== 'none') && (tenure.assessment !== 'excluded' || tenure.reason.trim()), 'status', '排除須保留原因，不能靜默刪除。');
    if (tenure.legacyOrigin !== null) validatePin(tenure.legacyOrigin);
    if (tenure.officeVersion !== null) {
      validatePin(tenure.officeVersion);
      warnings.push({code: 'office-version-unresolved', id: tenure.id, message: '制度版本字典尚未接管；本預覽不核定此制度版本。'});
    }
    ok(object(tenure.selected) && text(tenure.selected.rationale), 'selection', '採擇須保留獨立理由。');
    const selected = tenure.selected;
    ids(selected.attestations);
    for (const type of ['holding', 'start', 'end', 'continuity'] as const) {
      const ref = selected[type];
      ok(ref === null || id(ref), 'selection', '採擇引用無效。');
      if (ref !== null) {
        const claim = claims.get(ref);
        ok(claim && object(claim.subject) && object(claim.content) && claim.subject.kind === 'tenure' && claim.subject.id === tenure.id && claim.content.type === type && claim.assessment !== 'excluded', 'selection', '採擇必須指向本次任職同一問題的有效說法。');
      }
    }
    for (const ref of selected.attestations) {
      const claim = claims.get(ref);
      ok(claim && object(claim.subject) && object(claim.content) && claim.subject.kind === 'tenure' && claim.subject.id === tenure.id && claim.content.type === 'attestation' && claim.assessment !== 'excluded', 'selection', '見任記載不可指向授官事件或其他任期。');
    }
    if ([selected.holding, selected.start, selected.end, selected.continuity, ...selected.attestations].some(Boolean)) ok(selected.rationale.trim(), 'selection', '採用研究說法前須填寫採擇理由。');
  }
  for (const claim of graph.claims) {
    ok(object(claim.subject) && ['tenure', 'event'].includes(claim.subject.kind) && id(claim.subject.id), 'claim', '說法須有明確對象。');
    ok((claim.subject.kind === 'tenure' ? tenures : events).has(claim.subject.id), 'claim-reference', '說法的對象不存在。');
    ok(object(claim.content) && ['holding', 'start', 'end', 'attestation', 'event-date', 'continuity', 'legacy-record'].includes(claim.content.type), 'claim', '說法類型無效。');
    ok(assessments.includes(claim.assessment) && ['direct', 'inferred', 'uninterpreted'].includes(claim.derivation) && text(claim.rationale), 'claim', '說法須區分原文、推定與未解釋資料。');
    ok((claim.subject.kind === 'event') === (claim.content.type === 'event-date'), 'claim', '事件年代與任職時間不可混用。');
    ok((claim.derivation === 'uninterpreted') === (claim.content.type === 'legacy-record'), 'claim', '未解釋的舊記錄不能冒充已分解事實。');
    ok(!['inferred'].includes(claim.derivation) || claim.rationale.trim(), 'claim', '推定說法須保留依據。');
    if (claim.content.type === 'holding') ok(['held', 'not-held', 'posthumous', 'unknown'].includes(claim.content.value), 'claim', '實任狀態無效。');
    else if (claim.content.type === 'continuity') ok(claim.content.value === 'continuous', 'claim', '連續任期須有獨立說法。');
    else if (claim.content.type === 'legacy-record') {
      const value = claim.content.value;
      ok(object(value) && [value.officeName, value.nature, value.polity, value.jurisdiction].every(text), 'legacy', '舊記錄原文不可缺失。');
      validateDate(value.date);
      warnings.push({code: 'legacy-time-uninterpreted', id: claim.id, message: '原始年代保留；尚未判定其指事件範圍、見任年份或連續任期。'});
    } else validateTime(claim.content.value);
    if (claim.assessment === 'verified' && claim.content.type !== 'legacy-record') ok(claim.rationale.trim() && graph.evidence.some(e => e.claimId === claim.id && e.role === 'support'), 'claim-evidence', '核定說法須有理由及固定版本的支持史料。');
  }
  for (const tenure of graph.tenures) {
    const start = claims.get(tenure.selected.start ?? '')?.content;
    const end = claims.get(tenure.selected.end ?? '')?.content;
    if (start?.type === 'start' && end?.type === 'end' && start.value.earliestYear !== null && end.value.latestYear !== null) {
      ok(start.value.earliestYear <= end.value.latestYear, 'tenure-order', '選定起訖無法形成任期；請將相左年代保留為異說，而非同時採用。');
    }
    for (const ref of tenure.selected.attestations) {
      const attestation = claims.get(ref)!.content;
      if (attestation.type !== 'attestation') continue;
      const at = attestation.value;
      ok(!(start?.type === 'start' && start.value.earliestYear !== null && at.latestYear !== null && at.latestYear < start.value.earliestYear)
        && !(end?.type === 'end' && end.value.latestYear !== null && at.earliestYear !== null && at.earliestYear > end.value.latestYear),
      'tenure-order', '見任年代與選定任期不相容；請保留為待考異說，不同時採用。');
    }
    const holding = claims.get(tenure.selected.holding ?? '')?.content;
    if (holding?.type === 'holding' && ['not-held', 'posthumous'].includes(holding.value)) {
      ok(!tenure.selected.start && !tenure.selected.end && !tenure.selected.continuity && !tenure.selected.attestations.length, 'not-held', '未就與追贈不建立實任任期；授官年代請存入事件。');
    }
  }
  const evidenceKeys = new Set<string>();
  for (const evidence of graph.evidence) {
    ok(claims.has(evidence.claimId) && ['support', 'counter', 'unclassified-variant'].includes(evidence.role) && text(evidence.note), 'evidence', '證據須指向具體說法並保留用途。');
    validatePin(evidence.source);
    const key = JSON.stringify([evidence.claimId, pinKey(evidence.source), evidence.role]);
    ok(!evidenceKeys.has(key), 'duplicate-evidence', '同一說法的同版同用途引文不可重複計數。');
    evidenceKeys.add(key);
    if (evidence.role === 'unclassified-variant') warnings.push({code: 'variant-unclassified', id: evidence.id, message: '舊異文標記尚未判定是文本異文還是史事異說。'});
  }
  for (const event of graph.events) {
    ok(event.personId === graph.personId && CAREER_EVENT_TYPES.includes(event.type) && text(event.original), 'event', '事件須保留人物、類型及原文。');
    ids(event.tenureIds); ids(event.afterEventIds);
    ok(event.tenureIds.every(ref => tenures.has(ref)) && event.afterEventIds.every(ref => ref !== event.id && events.has(ref)), 'event-reference', '事件引用的任職或先行事件不存在。');
    ok(event.dateClaimId === null || id(event.dateClaimId), 'event-date', '事件年代引用無效。');
    if (event.dateClaimId !== null) {
      const claim = claims.get(event.dateClaimId);
      ok(claim && claim.subject.kind === 'event' && claim.subject.id === event.id && claim.content.type === 'event-date' && claim.assessment !== 'excluded', 'event-date', '事件只能採用自己的事件年代。');
    }
  }
  // Iterative topological check avoids recursion exhaustion on imported chronologies.
  const indegree = new Map(graph.events.map(e => [e.id, e.afterEventIds.length]));
  const following = new Map<string, string[]>();
  for (const event of graph.events) for (const prior of event.afterEventIds) following.set(prior, [...(following.get(prior) ?? []), event.id]);
  const queue = graph.events.filter(e => !indegree.get(e.id)).map(e => e.id);
  for (let i = 0; i < queue.length; i++) for (const next of following.get(queue[i]) ?? []) {
    indegree.set(next, indegree.get(next)! - 1);
    if (!indegree.get(next)) queue.push(next);
  }
  ok(queue.length === graph.events.length, 'event-cycle', '事件先後關係存在循環。');
  for (const conflict of graph.factualConflicts) {
    ids(conflict.claimIds);
    ok(conflict.claimIds.length >= 2 && text(conflict.note) && conflict.note.trim(), 'conflict', '史事異說須至少兩項說法及說明。');
    const alternatives = conflict.claimIds.map(ref => claims.get(ref));
    const first = alternatives[0];
    ok(first && alternatives.every(c => c && c.subject.kind === first.subject.kind && c.subject.id === first.subject.id && c.content.type === first.content.type), 'conflict', '史事異說須比較同一對象的同一問題。');
  }
  for (const variant of graph.textualVariants) {
    ok(text(variant.locus) && variant.locus.trim() && text(variant.note) && Array.isArray(variant.readings) && variant.readings.length >= 2, 'variant', '版本異文須保留文本位置及至少兩個版本讀法。');
    const seen = new Set<string>();
    for (const reading of variant.readings) {
      ok(object(reading) && text(reading.text) && reading.text.length > 0, 'variant', '異文讀法不可缺失。');
      validatePin(reading.source);
      ok(!seen.has(pinKey(reading.source)), 'variant', '同一版本不可當成兩個見證。');
      seen.add(pinKey(reading.source));
    }
  }
  return warnings;
}
export async function verifySourcePin(pin: RevisionPin, sources: SourceHistory, watermark: number): Promise<Revision<Source>> {
  validatePin(pin);
  const source = sources.get(pinKey(pin));
  ok(source && source.id === pin.id && source.data.id === pin.id && source.data.kind === 'source' && source.number === pin.revision && Number.isSafeInteger(source.commit) && source.commit > 0 && source.commit <= watermark, 'source-reference', '缺少水位內的固定史料修訂，不能改用最新版。');
  validateRecord(source.data);
  ok(source.digest === pin.digest && await sha256(canonicalJson(source.data)) === pin.digest, 'source-integrity', '史料原文或修訂摘要不符。');
  return source;
}
/** Clone first: callers cannot mutate graph selections during asynchronous checks. */
export async function verifyResearchGraph(input: ResearchGraph, sourceHistory: SourceHistory, watermark: number) {
  ok(Number.isSafeInteger(watermark) && watermark >= 0, 'watermark', '研究水位無效。');
  const graph = JSON.parse(canonicalJson(input)) as ResearchGraph;
  const warnings = validateResearchGraph(graph);
  const pins = new Map<string, RevisionPin>();
  for (const pin of [...graph.evidence.map(e => e.source), ...graph.textualVariants.flatMap(v => v.readings.map(r => r.source))]) {
    const old = pins.get(pinKey(pin));
    ok(!old || old.digest === pin.digest, 'source-integrity', '同一來源修訂不能有兩個摘要。');
    pins.set(pinKey(pin), pin);
  }
  // Freeze every referenced source before the first await, not one per digest.
  const sources = new Map<string, Revision<Source>>();
  for (const key of pins.keys()) {
    const source = sourceHistory.get(key);
    if (source) sources.set(key, JSON.parse(canonicalJson(source)) as Revision<Source>);
  }
  for (const pin of pins.values()) await verifySourcePin(pin, sources, watermark);
  for (const variant of graph.textualVariants) for (const reading of variant.readings) {
    ok(sources.get(pinKey(reading.source))!.data.text.includes(reading.text), 'variant-text', '異文讀法不是所引固定版本中的原文；不得以規範化文本替代。');
  }
  const blocked = new Set(graph.factualConflicts.flatMap(c => c.claimIds));
  for (const e of graph.evidence) if (e.role === 'counter') blocked.add(e.claimId);
  const trusted = (claim: Claim | undefined): boolean => !!claim && claim.assessment === 'verified' && claim.derivation === 'direct' && !blocked.has(claim.id)
    && graph.evidence.some(e => e.claimId === claim.id && e.role === 'support' && sources.get(pinKey(e.source))!.data.assessment !== 'excluded');
  return {graph, warnings, trusted, digest: await sha256(canonicalJson(graph))};
}
