import type {Claim, OfficeTenure, Presence, PresenceResult, ResearchGraph} from './types';
import {historicalYear, requireResearch as ensure, type HistoricalTime} from './time';
import {validateGraph, inconsistentSelectedChronology} from './validate';

/** Callers must also verify pinned evidence before exposing results outside a test. */
export function presenceInYear(g: ResearchGraph, tenureId: string, year: number): PresenceResult {
  validateGraph(g);
  ensure(historicalYear(year), 'year', '查詢年份須為有效公元紀年，不使用第零年。');
  const t = g.tenures.find(t => t.id === tenureId);
  ensure(t, 'tenure', '查詢的任職不存在。');
  return classify(g, t, year);
}
/** Validates once for a whole person rather than once per tenure. */
export function personPresenceInYear(g: ResearchGraph, year: number): PresenceResult[] {
  validateGraph(g);
  ensure(historicalYear(year), 'year', '查詢年份須為有效公元紀年，不使用第零年。');
  return g.tenures.map(t => classify(g, t, year));
}
function classify(g: ResearchGraph, t: OfficeTenure, year: number): PresenceResult {
  const byId = new Map(g.claims.map(c => [c.id, c]));
  const get = (id: string | null) => id === null ? undefined : byId.get(id);
  const selected = t.selected;
  const conflicted = new Set(g.factualConflicts.flatMap(f => f.claimIds));
  const supported = new Set(g.evidence.filter(e => e.role === 'support').map(e => e.claimId));
  const reliable = (c: Claim | undefined): c is Claim => !!c && t.assessment === 'verified' && c.assessment === 'verified' && c.derivation === 'direct' && supported.has(c.id) && !conflicted.has(c.id);
  const result = (status: Presence, reason: string, ids: string[] = []): PresenceResult => ({tenureId: t.id, year, status, definite: status === 'attested' || status === 'continuous', claimIds: ids, reason});
  if (t.assessment === 'excluded' || t.disposition !== 'none') return result('excluded', '已排除的任職不計入在任，但研究記錄仍保留。');
  const holding = get(selected.holding);
  if (!holding || holding.content.type !== 'holding' || holding.content.value === 'unknown') return result('unknown', '尚無採用的實任說法；不能由舊官名字串推定。');
  if (holding.content.value !== 'held') return result(reliable(holding) ? 'not-held' : 'unknown', '未就任與追贈不計入實任；其經歷記錄不因此成為錯誤。', [holding.id]);
  const start = get(selected.start), end = get(selected.end), continuity = get(selected.continuity);
  const a = start?.content.type === 'start' ? start.content.value : undefined;
  const b = end?.content.type === 'end' ? end.content.value : undefined;
  const timeReliable = (c: Claim | undefined, time: HistoricalTime | undefined) => reliable(c) && time?.certainty === 'explicit';
  const boundaries = [holding, start, end, continuity].filter((c): c is Claim => !!c).map(c => c.id);
  if (inconsistentSelectedChronology(t, byId)) return result('unknown', '採用的起訖或見任說法互相矛盾；保留記錄而不製造任期。', [...boundaries, ...selected.attestations]);
  if (timeReliable(start, a) && a!.earliestYear !== null && year < a!.earliestYear) return result('outside', '早於有依據的最早始任年份。', [start!.id]);
  if (timeReliable(end, b) && b!.latestYear !== null && year > b!.latestYear) return result('outside', '晚於有依據的最晚終任年份。', [end!.id]);
  const attestations = [...selected.attestations.map(id => byId.get(id)!), ...(start ? [start] : []), ...(end ? [end] : [])];
  for (const c of attestations) {
    const v = c.content;
    if (v.type !== 'attestation' && v.type !== 'start' && v.type !== 'end') continue;
    if (reliable(holding) && timeReliable(c, v.value) && v.value.earliestYear === year && v.value.latestYear === year) return result('attested', '有該年曾經實任的明確記載；不表示整年在任。', [holding.id, c.id]);
  }
  if (reliable(holding) && reliable(continuity) && timeReliable(start, a) && timeReliable(end, b) && a!.latestYear !== null && b!.earliestYear !== null && a!.latestYear <= year && year <= b!.earliestYear) return result('continuous', '有獨立的連續任期說法，且查詢年在起訖界限保證的範圍內。', boundaries);
  const possibleAttestation = attestations.some(c => {
    const v = c.content;
    return (v.type === 'attestation' || v.type === 'start' || v.type === 'end') && v.value.earliestYear !== null && v.value.latestYear !== null && v.value.earliestYear <= year && year <= v.value.latestYear;
  });
  const possibleWindow = a?.earliestYear != null && b?.latestYear != null && a.earliestYear <= year && year <= b.latestYear;
  if (possibleAttestation || possibleWindow) return result('possible', '年代可能相交，但精度、史實判斷、異說或連續性不足以支持明確在任。', [...new Set([...boundaries, ...selected.attestations])]);
  return result('unknown', '缺少此年的在任依據；不延長至死亡、下一官職或政權終結。', [holding.id]);
}
