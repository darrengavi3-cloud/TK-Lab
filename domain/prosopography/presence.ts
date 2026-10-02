import {historicalYear, requireResearch as ok, type HistoricalTime} from './time';
import {verifyResearchGraph, type SourceHistory} from './validate';
import type {Claim, PresenceResult, ResearchGraph} from './types';

/** Research-only query. Never guesses an endpoint from another job or a death. */
export async function researchPresence(graph: ResearchGraph, sources: SourceHistory, watermark: number, year: number) {
  ok(historicalYear(year), 'year', '查詢年份須使用非零的歷史年份。');
  const checked = await verifyResearchGraph(graph, sources, watermark);
  const claims = new Map(checked.graph.claims.map(c => [c.id, c]));
  const time = (c: Claim | undefined): HistoricalTime | null => c && ['start', 'end', 'attestation'].includes(c.content.type) ? c.content.value as HistoricalTime : null;
  const explicit = (c: Claim | undefined): boolean => checked.trusted(c) && time(c)?.certainty === 'explicit';
  const results: PresenceResult[] = checked.graph.tenures.map(t => {
    const s = t.selected;
    const holding = claims.get(s.holding ?? ''), start = claims.get(s.start ?? ''), end = claims.get(s.end ?? '');
    const startTime = time(start), endTime = time(end);
    const result = (status: PresenceResult['status'], reason: string, claimIds: string[] = []): PresenceResult => ({tenureId: t.id, year, status, definite: status === 'attested' || status === 'continuous', claimIds, reason});
    if (t.assessment === 'excluded' || t.disposition !== 'none') return result('excluded', '保留排除記錄及原始證據，不計入實任。');
    if (holding?.content.type === 'holding' && ['not-held', 'posthumous'].includes(holding.content.value) && checked.trusted(holding)) return result('not-held', '未就或追贈不是實任；授官事件仍可保留。', [holding.id]);
    const held = holding?.content.type === 'holding' && holding.content.value === 'held';
    if (!held) return result('unknown', '實任狀態尚未明確採擇。');
    if (explicit(start) && startTime?.earliestYear !== null && startTime && year < startTime.earliestYear) return result('outside', '早於有明文依據的最早始任界限。', [start!.id]);
    if (explicit(end) && endTime?.latestYear !== null && endTime && year > endTime.latestYear) return result('outside', '晚於有明文依據的最晚終任界限。', [end!.id]);
    const attested = s.attestations.map(ref => claims.get(ref)!);
    const exact = attested.find(c => explicit(c) && time(c)!.earliestYear === year && time(c)!.latestYear === year);
    const confirmedHolding = checked.trusted(holding) && t.assessment === 'verified';
    if (confirmedHolding && exact) return result('attested', '該年有固定史料版本支持見任；不外推鄰年。', [holding.id, exact.id]);
    const continuity = claims.get(s.continuity ?? '');
    if (confirmedHolding && checked.trusted(continuity) && explicit(start) && explicit(end)
      && startTime?.latestYear !== null && endTime?.earliestYear !== null && startTime && endTime
      && startTime.latestYear <= year && year <= endTime.earliestYear) {
      return result('continuous', '實任、連續性與起訖分別有依據，該年位於共同確定區間。', [holding.id, start!.id, end!.id, continuity!.id]);
    }
    const within = (t: HistoricalTime | null) => t && t.earliestYear !== null && t.latestYear !== null && t.earliestYear <= year && year <= t.latestYear;
    const betweenBounds = startTime?.earliestYear !== null && endTime?.latestYear !== null && startTime && endTime && startTime.earliestYear <= year && year <= endTime.latestYear;
    if (betweenBounds || attested.some(c => within(time(c)))) return result('possible', '年代或連續性尚不足以斷言該年實任；不納入確定名錄。', [s.holding, s.start, s.end, ...s.attestations].filter((v): v is string => v !== null));
    return result('unknown', '沒有足夠證據判定此年；不以最後見載、他官或死亡補齊任期。');
  });
  return {graphDigest: checked.digest, warnings: checked.warnings, year, results};
}
