import {validateDate} from '../catalogue';
import {CAREER_EVENT_TYPES, type ResearchGraph, type RevisionPin, type Claim, type ResearchWarning, type OfficeTenure} from './types';
import {requireResearch as ensure, validateTime} from './time';

export const researchId = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_.@/-]{0,299}$/.test(v);
const text = (v: unknown): v is string => typeof v === 'string';
const assessments = ['pending', 'verified', 'disputed', 'excluded'];
export const pinKey = (p: RevisionPin): string => JSON.stringify([p.id, p.revision]);
export function validatePin(p: RevisionPin): void {
  ensure(p && researchId(p.id) && Number.isSafeInteger(p.revision) && p.revision > 0 && typeof p.digest === 'string' && /^[a-f0-9]{64}$/.test(p.digest), 'pin', '引用須固定有效識別碼、修訂序號及 SHA-256 摘要。');
}
function uniqueIds(ids: string[]): boolean {
  return Array.isArray(ids) && ids.every(researchId) && new Set(ids).size === ids.length;
}
/** Structural validation only: not an automatic historical review. */
export function validateGraph(g: ResearchGraph): void {
  ensure(g && typeof g === 'object' && g.model === 1 && researchId(g.personId), 'graph', '人物誌模型或人物識別碼無效。');
  const tables = [g.tenures, g.events, g.claims, g.evidence, g.factualConflicts, g.textualVariants];
  const caps = [1000, 1000, 5000, 10000, 1000, 1000];
  const allIds = new Set<string>();
  for (const [i, rows] of tables.entries()) {
    ensure(Array.isArray(rows) && rows.length <= caps[i], 'size', '關聯清單缺失或超出本批次上限。');
    for (const row of rows) {
      ensure(row && researchId(row.id) && !allIds.has(row.id), 'identity', '各研究記錄須使用不重複的穩定識別碼。');
      allIds.add(row.id);
    }
  }
  const tenures = new Map(g.tenures.map(t => [t.id, t]));
  const events = new Map(g.events.map(e => [e.id, e]));
  const claims = new Map(g.claims.map(c => [c.id, c]));
  for (const c of g.claims) {
    ensure(c.subject && ['tenure', 'event'].includes(c.subject.kind) && (c.subject.kind === 'tenure' ? tenures : events).has(c.subject.id), 'subject', '說法引用的任職或事件不存在。');
    ensure(c.content && typeof c.content === 'object' && assessments.includes(c.assessment) && ['direct', 'inferred', 'uninterpreted'].includes(c.derivation) && text(c.rationale), 'claim', '說法的內容、判斷或推導方式無效。');
    if (c.origin !== null) validatePin(c.origin);
    const v = c.content;
    const allowed = c.subject.kind === 'event' ? ['event-date'] : ['holding', 'start', 'end', 'attestation', 'continuity', 'legacy-record'];
    ensure(allowed.includes(v.type), 'predicate', '事件日期不可直接充作任期，說法類型必須對應主體。');
    if (v.type === 'holding') ensure(['held', 'not-held', 'posthumous', 'unknown'].includes(v.value), 'holding', '實任狀態無效。');
    else if (v.type === 'continuity') ensure(v.value === 'continuous', 'continuity', '連續任期須獨立登記。');
    else if (v.type === 'legacy-record') {
      ensure(v.value && [v.value.officeName, v.value.nature, v.value.polity, v.value.jurisdiction].every(text), 'legacy', '舊任官原始欄位不可缺失。');
      validateDate(v.value.date);
    } else validateTime(v.value);
    ensure((c.derivation === 'uninterpreted') === (v.type === 'legacy-record'), 'derivation', '未解譯的舊資料不可冒充新的結構化史實。');
    ensure(c.derivation !== 'inferred' || c.rationale.trim(), 'basis', '推定說法須保留推定依據。');
    ensure(c.assessment !== 'verified' || (c.derivation !== 'uninterpreted' && c.rationale.trim()), 'review', '核定說法須有獨立判斷，不承襲舊記錄審定。');
  }
  const support = new Set<string>();
  const evidenceKeys = new Set<string>();
  const sourceDigests = new Map<string, string>();
  const checkSource = (pin: RevisionPin) => {
    validatePin(pin);
    const key = pinKey(pin);
    ensure(!sourceDigests.has(key) || sourceDigests.get(key) === pin.digest, 'pin-conflict', '同一史料修訂不可具有兩個摘要。');
    sourceDigests.set(key, pin.digest);
  };
  for (const e of g.evidence) {
    ensure(claims.has(e.claimId) && ['support', 'counter', 'unclassified-variant'].includes(e.role) && text(e.note), 'evidence', '證據引用的說法或用途無效。');
    checkSource(e.source);
    const key = JSON.stringify([e.claimId, e.source.id, e.source.revision, e.role]);
    ensure(!evidenceKeys.has(key), 'duplicate-evidence', '相同說法的同一史料修訂及用途不可重複計入。');
    evidenceKeys.add(key);
    if (e.role === 'support') support.add(e.claimId);
  }
  for (const c of g.claims) ensure(c.assessment !== 'verified' || support.has(c.id), 'review', '核定說法須有支持史料，反證或異文標記不能代替支持。');
  const select = (id: string | null, subject: string, type: Claim['content']['type']) => {
    ensure(id === null || researchId(id), 'selection', '採用說法須為有效識別碼或空值。');
    if (id === null) return;
    const claim = claims.get(id);
    ensure(claim && claim.subject.id === subject && claim.content.type === type && claim.assessment !== 'excluded', 'selection', '採用說法須屬於同一主體、對應欄位且未被排除。');
  };
  for (const t of g.tenures) {
    ensure(t.personId === g.personId && (t.officeId === null || researchId(t.officeId)), 'person', '任職不可混入另一人物；官職 ID 須為識別碼或空值。');
    ensure([t.officeNameOriginal, t.polityOriginal, t.natureOriginal, t.jurisdictionOriginal, t.reason].every(text) && t.officeNameOriginal.trim(), 'tenure', '任職須保存原始官名、性質、政權及轄區文字。');
    ensure(assessments.includes(t.assessment) && ['draft', 'review', 'ready'].includes(t.workflow) && ['private', 'reader'].includes(t.visibility), 'status', '史實判斷、整理流程與顯示政策須分別記錄。');
    ensure(['none', 'incorrect', 'duplicate', 'not-held', 'out-of-scope', 'legacy-suppressed'].includes(t.disposition), 'status', '任職處置無效。');
    ensure(t.assessment === 'excluded' ? t.disposition !== 'none' && t.reason.trim() : t.disposition === 'none', 'status', '排除處置須附理由，非排除記錄不可帶有排除處置。');
    if (t.legacyOrigin !== null) validatePin(t.legacyOrigin);
    const s = t.selected;
    ensure(s && uniqueIds(s.attestations) && text(s.rationale), 'selection', '須明確登記採用哪些說法及採用理由。');
    for (const field of ['holding', 'start', 'end', 'continuity'] as const) select(s[field], t.id, field);
    for (const id of s.attestations) select(id, t.id, 'attestation');
    ensure(![s.holding, s.start, s.end, s.continuity, ...s.attestations].some(Boolean) || s.rationale.trim(), 'selection', '採用說法不可省略研究者理由。');
  }
  for (const e of g.events) {
    ensure(e.personId === g.personId && CAREER_EVENT_TYPES.includes(e.type) && text(e.original), 'event', '事件須屬於同一人物並保留原文。');
    ensure(uniqueIds(e.tenureIds) && e.tenureIds.every(id => tenures.has(id)), 'event-tenure', '事件關聯的任職不存在或重複。');
    ensure(uniqueIds(e.afterEventIds) && e.afterEventIds.every(id => events.has(id) && id !== e.id), 'chronology', '相對次序不可自指、重複或引用不存在事件。');
    select(e.dateClaimId, e.id, 'event-date');
  }
  // Kahn's algorithm avoids recursion depth dependence on submitted graphs.
  const degrees = new Map(g.events.map(e => [e.id, e.afterEventIds.length]));
  const following = new Map<string, string[]>();
  for (const e of g.events) for (const p of e.afterEventIds) following.set(p, [...(following.get(p) || []), e.id]);
  const queue = [...degrees].filter(([, degree]) => degree === 0).map(([id]) => id);
  for (let i = 0; i < queue.length; i++) for (const id of following.get(queue[i]) || []) {
    degrees.set(id, degrees.get(id)! - 1);
    if (degrees.get(id) === 0) queue.push(id);
  }
  ensure(queue.length === events.size, 'chronology', '相對次序存在循環；互相矛盾的次序須另作異說，不可強制成時間線。');
  for (const f of g.factualConflicts) {
    ensure(uniqueIds(f.claimIds) && f.claimIds.length >= 2 && f.claimIds.every(id => claims.has(id)) && text(f.note), 'conflict', '史事異說須關聯至少兩項不重複且存在的說法。');
    const first = claims.get(f.claimIds[0])!;
    ensure(f.claimIds.every(id => {
      const c = claims.get(id)!;
      return c.subject.kind === first.subject.kind && c.subject.id === first.subject.id && c.content.type === first.content.type;
    }), 'conflict', '異說組須比較同一主體的同一問題。');
  }
  for (const v of g.textualVariants) {
    ensure(text(v.locus) && v.locus.trim() && text(v.note) && Array.isArray(v.readings) && v.readings.length >= 2 && v.readings.length <= 100, 'variant', '文本異文須有校勘位置及至少兩個版本讀法。');
    for (const r of v.readings) {
      ensure(r && text(r.text) && r.text.length > 0, 'variant', '異文讀法不可缺失。');
      checkSource(r.source);
    }
    ensure(new Set(v.readings.map(r => pinKey(r.source))).size === v.readings.length && new Set(v.readings.map(r => r.text)).size >= 2, 'variant', '異文須區分見證及不同讀法，不能重複計算同一版本。');
  }
}

export function graphWarnings(g: ResearchGraph): ResearchWarning[] {
  validateGraph(g);
  const out: ResearchWarning[] = [];
  const claims = new Map(g.claims.map(c => [c.id, c]));
  for (const t of g.tenures) {
    if (!t.selected.holding) out.push({code: 'holding-uninterpreted', subjectId: t.id, note: '未採用實任說法，不計入明確在任。'});
    if (!t.officeId) out.push({code: 'office-unmapped', subjectId: t.id, note: '保留原官名，尚未對應官職制度實體。'});
    if (inconsistentSelectedChronology(t, claims)) out.push({code: 'inconsistent-tenure', subjectId: t.id, note: '採用的始終任或見任年代互不相容；保留異說，不能推得明確任期。'});
  }
  for (const c of g.claims) if (c.content.type === 'legacy-record') out.push({code: 'legacy-date-uninterpreted', subjectId: c.id, note: '舊起訖年原樣保存；尚未判斷是事件範圍、任期或見任記載。'});
  for (const e of g.evidence) if (e.role === 'unclassified-variant') out.push({code: 'variant-unclassified', subjectId: e.id, note: '舊異文標記尚未區分文本異文與史事異說。'});
  return out;
}

/** A contradiction among adopted claims is a research warning, not data loss. */
export function inconsistentSelectedChronology(t: OfficeTenure, claims: ReadonlyMap<string, Claim>): boolean {
  const start = claims.get(t.selected.start || '')?.content;
  const end = claims.get(t.selected.end || '')?.content;
  const earliest = start?.type === 'start' ? start.value.earliestYear : null;
  const latest = end?.type === 'end' ? end.value.latestYear : null;
  if (earliest != null && latest != null && earliest > latest) return true;
  return t.selected.attestations.some(id => {
    const c = claims.get(id)?.content;
    return c?.type === 'attestation' && ((earliest != null && c.value.latestYear !== null && c.value.latestYear < earliest)
      || (latest != null && c.value.earliestYear !== null && c.value.earliestYear > latest));
  });
}
