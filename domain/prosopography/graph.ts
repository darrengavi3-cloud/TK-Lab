import {validateDate} from '../catalogue';
import {CAREER_EVENT_TYPES, type ResearchGraph, type RevisionPin, type Claim, type ResearchWarning, type PresenceResult} from './types';
import {requireResearch as invariant, validateTime, historicalYear} from './time';

export const researchId = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_.@/-]{0,299}$/.test(v);
const text = (v: unknown): v is string => typeof v === 'string';
const assessments = ['pending', 'verified', 'disputed', 'excluded'];
export const pinKey = (p: {id: string; revision: number}): string => JSON.stringify([p.id, p.revision]);
export function validatePin(p: RevisionPin): void {
  invariant(p && researchId(p.id) && Number.isSafeInteger(p.revision) && p.revision > 0 && typeof p.digest === 'string' && /^[a-f0-9]{64}$/.test(p.digest), 'pin', '引用須固定識別碼、修訂序號及 SHA-256 摘要。');
}
const uniqueIds = (ids: string[]) => Array.isArray(ids) && ids.every(researchId) && new Set(ids).size === ids.length;
/** Structural validation only. An assessment is never inferred from visibility. */
export function validateGraph(g: ResearchGraph): void {
  invariant(g && typeof g === 'object' && g.model === 1 && researchId(g.personId), 'graph', '人物誌模型或人物識別碼無效。');
  const tables = [g.tenures, g.events, g.claims, g.evidence, g.factualConflicts, g.textualVariants];
  const caps = [1000, 1000, 5000, 10000, 1000, 1000];
  const allIds = new Set<string>();
  for (const [i, rows] of tables.entries()) {
    invariant(Array.isArray(rows) && rows.length <= caps[i], 'size', '關聯清單缺失或超出本批次上限。');
    for (const row of rows) {
      invariant(row && researchId(row.id) && !allIds.has(row.id), 'identity', '研究記錄須使用不重複的穩定識別碼。');
      allIds.add(row.id);
    }
  }
  const tenures = new Map(g.tenures.map(t => [t.id, t]));
  const events = new Map(g.events.map(e => [e.id, e]));
  const claims = new Map(g.claims.map(c => [c.id, c]));
  for (const c of g.claims) {
    invariant(c.subject && ['tenure', 'event'].includes(c.subject.kind) && (c.subject.kind === 'tenure' ? tenures : events).has(c.subject.id), 'subject', '說法引用的任職或事件不存在。');
    invariant(c.content && typeof c.content === 'object' && assessments.includes(c.assessment) && ['direct', 'inferred', 'uninterpreted'].includes(c.derivation) && text(c.rationale), 'claim', '說法內容、判斷或推導方式無效。');
    if (c.origin !== null) validatePin(c.origin);
    const v = c.content;
    const allowed = c.subject.kind === 'event' ? ['event-date'] : ['holding', 'start', 'end', 'attestation', 'continuity', 'legacy-record'];
    invariant(allowed.includes(v.type), 'predicate', '事件日期不可直接充作任期，說法類型須對應主體。');
    if (v.type === 'holding') invariant(['held', 'not-held', 'posthumous', 'unknown'].includes(v.value), 'holding', '實任狀態無效。');
    else if (v.type === 'continuity') invariant(v.value === 'continuous', 'continuity', '連續任期須獨立登記。');
    else if (v.type === 'legacy-record') {
      invariant(v.value && [v.value.officeName, v.value.nature, v.value.polity, v.value.jurisdiction].every(text), 'legacy', '舊任官原始欄位不可缺失。');
      validateDate(v.value.date);
    } else validateTime(v.value);
    invariant((c.derivation === 'uninterpreted') === (v.type === 'legacy-record'), 'derivation', '未解譯的舊資料不可冒充新的結構化史實。');
    invariant(c.derivation !== 'inferred' || c.rationale.trim(), 'basis', '推定說法須保留依據。');
    invariant(c.assessment !== 'verified' || (c.derivation !== 'uninterpreted' && c.rationale.trim()), 'review', '核定說法須獨立判斷，不承襲舊記錄審定。');
  }
  const support = new Set<string>();
  const evidenceKeys = new Set<string>();
  const sourceDigests = new Map<string, string>();
  const checkSource = (pin: RevisionPin) => {
    validatePin(pin);
    const key = pinKey(pin);
    invariant(!sourceDigests.has(key) || sourceDigests.get(key) === pin.digest, 'pin-conflict', '同一史料修訂不可具有兩個摘要。');
    sourceDigests.set(key, pin.digest);
  };
  for (const e of g.evidence) {
    invariant(claims.has(e.claimId) && ['support', 'counter', 'unclassified-variant'].includes(e.role) && text(e.note), 'evidence', '證據引用的說法或用途無效。');
    checkSource(e.source);
    const key = JSON.stringify([e.claimId, e.source.id, e.source.revision, e.role]);
    invariant(!evidenceKeys.has(key), 'duplicate-evidence', '同一說法、史料修訂與用途不可重複計入。');
    evidenceKeys.add(key);
    if (e.role === 'support') support.add(e.claimId);
  }
  for (const c of g.claims) invariant(c.assessment !== 'verified' || support.has(c.id), 'review', '核定說法須有支持史料，反證或異文不能代替支持。');
  const select = (id: string | null, subject: string, type: Claim['content']['type']) => {
    invariant(id === null || researchId(id), 'selection', '採用說法須為識別碼或空值。');
    if (id === null) return;
    const claim = claims.get(id);
    invariant(claim && claim.subject.id === subject && claim.content.type === type && claim.assessment !== 'excluded', 'selection', '採用說法須屬於同一主體及對應欄位，且未被排除。');
  };
  for (const t of g.tenures) {
    invariant(t.personId === g.personId && (t.officeId === null || researchId(t.officeId)), 'person', '任職不可混入另一人物；官職 ID 須有效或留空。');
    invariant([t.officeNameOriginal, t.polityOriginal, t.natureOriginal, t.jurisdictionOriginal, t.reason].every(text) && t.officeNameOriginal.trim(), 'tenure', '任職須保存原始官名、性質、政權及轄區。');
    invariant(assessments.includes(t.assessment) && ['draft', 'review', 'ready'].includes(t.workflow) && ['private', 'reader'].includes(t.visibility), 'status', '史實判斷、整理流程與顯示政策須分別記錄。');
    invariant(['none', 'incorrect', 'duplicate', 'not-held', 'out-of-scope', 'legacy-suppressed'].includes(t.disposition), 'status', '任職處置無效。');
    invariant(t.assessment === 'excluded' ? t.disposition !== 'none' && t.reason.trim() : t.disposition === 'none', 'status', '排除處置須附理由，非排除記錄不可帶有排除處置。');
    if (t.legacyOrigin !== null) validatePin(t.legacyOrigin);
    const s = t.selected;
    invariant(s && uniqueIds(s.attestations) && text(s.rationale), 'selection', '須登記採用哪些說法及理由。');
    for (const field of ['holding', 'start', 'end', 'continuity'] as const) select(s[field], t.id, field);
    for (const id of s.attestations) select(id, t.id, 'attestation');
    invariant(![s.holding, s.start, s.end, s.continuity, ...s.attestations].some(Boolean) || s.rationale.trim(), 'selection', '採用說法不可省略研究者理由。');
  }
  for (const e of g.events) {
    invariant(e.personId === g.personId && CAREER_EVENT_TYPES.includes(e.type) && text(e.original), 'event', '事件須屬於同一人物並保留原文。');
    invariant(uniqueIds(e.tenureIds) && e.tenureIds.every(id => tenures.has(id)), 'event-tenure', '事件關聯的任職不存在或重複。');
    invariant(uniqueIds(e.afterEventIds) && e.afterEventIds.every(id => events.has(id) && id !== e.id), 'chronology', '相對次序不可自指、重複或引用不存在的事件。');
    select(e.dateClaimId, e.id, 'event-date');
  }
  // Iterative topological sort avoids call-stack limits on submitted histories.
  const degrees = new Map(g.events.map(e => [e.id, e.afterEventIds.length]));
  const following = new Map<string, string[]>();
  for (const e of g.events) for (const p of e.afterEventIds) following.set(p, [...(following.get(p) || []), e.id]);
  const queue = [...degrees].filter(([, degree]) => degree === 0).map(([id]) => id);
  for (let i = 0; i < queue.length; i++) for (const id of following.get(queue[i]) || []) {
    degrees.set(id, degrees.get(id)! - 1);
    if (degrees.get(id) === 0) queue.push(id);
  }
  invariant(queue.length === events.size, 'chronology', '相對次序存在循環；衝突次序須另作異說。');
  for (const f of g.factualConflicts) {
    invariant(uniqueIds(f.claimIds) && f.claimIds.length >= 2 && f.claimIds.every(id => claims.has(id)) && text(f.note), 'conflict', '史事異說須關聯至少兩項存在的說法。');
    const first = claims.get(f.claimIds[0])!;
    invariant(f.claimIds.every(id => {
      const c = claims.get(id)!;
      return c.subject.kind === first.subject.kind && c.subject.id === first.subject.id && c.content.type === first.content.type;
    }), 'conflict', '異說組須比較同一主體的同一問題。');
  }
  for (const v of g.textualVariants) {
    invariant(text(v.locus) && v.locus.trim() && text(v.note) && Array.isArray(v.readings) && v.readings.length >= 2 && v.readings.length <= 100, 'variant', '文本異文須有校勘位置及至少兩個版本讀法。');
    for (const r of v.readings) {
      invariant(r && text(r.text) && r.text.length > 0, 'variant', '異文讀法不可缺失。');
      checkSource(r.source);
    }
    invariant(new Set(v.readings.map(r => pinKey(r.source))).size === v.readings.length && new Set(v.readings.map(r => r.text)).size >= 2, 'variant', '異文須區分見證及不同讀法，不可重複同一版本。');
  }
}
export function graphWarnings(g: ResearchGraph): ResearchWarning[] {
  validateGraph(g);
  const out: ResearchWarning[] = [];
  const claims = new Map(g.claims.map(c => [c.id, c]));
  for (const t of g.tenures) {
    if (!t.selected.holding) out.push({code: 'holding-uninterpreted', subjectId: t.id, note: '未採用實任說法，不計入明確在任。'});
    if (!t.officeId) out.push({code: 'office-unmapped', subjectId: t.id, note: '保留原官名，尚未對應官職制度實體。'});
    const a = claims.get(t.selected.start || '')?.content;
    const b = claims.get(t.selected.end || '')?.content;
    if (a?.type === 'start' && b?.type === 'end' && a.value.earliestYear !== null && b.value.latestYear !== null && a.value.earliestYear > b.value.latestYear) out.push({code: 'inconsistent-tenure', subjectId: t.id, note: '始任早限晚於終任晚限；保留異說，不推得明確任期。'});
  }
  for (const c of g.claims) if (c.content.type === 'legacy-record') out.push({code: 'legacy-date-uninterpreted', subjectId: c.id, note: '舊起訖年原樣保存；未判斷是事件範圍、任期或見任記載。'});
  for (const e of g.evidence) if (e.role === 'unclassified-variant') out.push({code: 'variant-unclassified', subjectId: e.id, note: '舊異文標記尚未區分文本異文與史事異說。'});
  return out;
}
/** Query only the explicitly selected interpretation; never fill unknown endpoints. */
export function officePresence(g: ResearchGraph, tenureId: string, year: number): PresenceResult {
  validateGraph(g);
  invariant(historicalYear(year), 'year', '查詢年份無效；不可使用第零年。');
  const t = g.tenures.find(t => t.id === tenureId);
  invariant(t, 'tenure', '任職不存在。');
  return presenceResolver(g, year)(t);
}
/** Batch form validates and indexes once; it does not do N full graph scans. */
export function officePresenceInYear(g: ResearchGraph, year: number): PresenceResult[] {
  validateGraph(g);
  invariant(historicalYear(year), 'year', '查詢年份無效；不可使用第零年。');
  return g.tenures.map(presenceResolver(g, year));
}
function presenceResolver(g: ResearchGraph, year: number) {
  const claims = new Map(g.claims.map(c => [c.id, c]));
  const unresolved = new Set(g.evidence.filter(e => e.role !== 'support').map(e => e.claimId));
  for (const f of g.factualConflicts) {
    const active = f.claimIds.filter(id => claims.get(id)?.assessment !== 'excluded');
    if (active.length > 1) for (const id of active) unresolved.add(id);
  }
  const get = (id: string | null) => id === null ? undefined : claims.get(id);
  return (t: ResearchGraph['tenures'][number]): PresenceResult => {
  const tenureId = t.id;
  const result = (status: PresenceResult['status'], reason: string, claimIds: string[] = []): PresenceResult => ({tenureId, year, status, definite: status === 'attested' || status === 'continuous', claimIds, reason});
  if (t.assessment === 'excluded') return result(t.disposition === 'not-held' ? 'not-held' : 'excluded', '保留既有處置，不列入實任統計。');
  const clean = (c: Claim | undefined): c is Claim => t.assessment === 'verified' && !!c && c.assessment === 'verified' && c.derivation === 'direct'
    && !unresolved.has(c.id);
  const h = get(t.selected.holding);
  if (h?.content.type !== 'holding' || h.content.value === 'unknown') return result('unknown', '沒有採用明確的實任說法。');
  if (h.content.value !== 'held') return result(clean(h) ? 'not-held' : 'unknown', '未實任或追贈不能計作在任。', [h.id]);
  const start = get(t.selected.start), end = get(t.selected.end), continuity = get(t.selected.continuity);
  const a = start?.content.type === 'start' ? start.content.value : undefined;
  const b = end?.content.type === 'end' ? end.content.value : undefined;
  const chosen = [h, start, end, continuity].filter((c): c is Claim => !!c).map(c => c.id);
  if (a?.earliestYear != null && b?.latestYear != null && a.earliestYear > b.latestYear) return result('unknown', '採用的始終年代互相矛盾，未生成連續任期。', chosen);
  const explicitA = clean(start) && a?.certainty === 'explicit';
  const explicitB = clean(end) && b?.certainty === 'explicit';
  const outside = (explicitA && a.earliestYear !== null && year < a.earliestYear) || (explicitB && b.latestYear !== null && year > b.latestYear);
  // An independent point attestation does not require known start/end dates.
  for (const id of t.selected.attestations) {
    const c = claims.get(id)!;
    if (c.content.type !== 'attestation') continue;
    const d = c.content.value;
    if (clean(h) && clean(c) && d.certainty === 'explicit' && d.precision === 'year' && d.earliestYear === year) return outside ? result('unknown', '見任年份與採用的任期界限相衝突；保留雙方說法。', [...chosen, c.id]) : result('attested', '該年有明確見任記載，不表示全年在任。', [h.id, c.id]);
  }
  if (clean(h) && outside) return result('outside', '查詢年份在已採用的明確任期界限之外。', chosen);
  if (clean(h) && clean(continuity) && explicitA && explicitB && a.latestYear !== null && b.earliestYear !== null && a.latestYear <= year && year <= b.earliestYear) return result('continuous', '具連續任期依據，且位於不確定端點的內側範圍。', chosen);
  if (a?.earliestYear != null && b?.latestYear != null && a.earliestYear <= year && year <= b.latestYear) return result('possible', '符合採用年代的可能範圍，但未證成連續在任。', chosen);
  return result('unknown', '未知端點或欠缺連續任期依據；不補到死亡、轉任或政權終年。', chosen);
  };
}
