import {validateRecord, type Appointment, type Source} from '../catalogue';
import {canonicalJson, fixedSnapshot, sha256, type Revision} from '../revisions';
import {requireResearch as ok} from './time';
import {verifyResearchGraph, verifySourcePin, pinKey, type ResearchWarning, type SourceHistory} from './validate';
import type {ResearchGraph, RevisionPin} from './types';

export const researchPin = (r: Revision): RevisionPin => ({id: r.id, revision: r.number, digest: r.digest});
export function personResearchRows(rows: readonly Revision[], watermark: number, personId: string): Revision[] {
  return fixedSnapshot(rows, watermark).filter(r => r.id === personId || (r.data.kind === 'appointment' && r.data.personId === personId));
}
/** An additive shadow view: no writes, no ID replacement and no historical inference. */
export async function legacyResearchPreview(rows: readonly Revision[], sources: SourceHistory, watermark: number, personId: string) {
  const selected = personResearchRows(rows, watermark, personId);
  const person = selected.find(r => r.id === personId && r.data.kind === 'person');
  ok(person, 'person-reference', '指定水位內沒有此人物；不按姓名合併或回退到最新版。');
  for (const r of selected) {
    validateRecord(r.data);
    ok(r.id === r.data.id && Number.isSafeInteger(r.number) && r.number > 0 && Number.isSafeInteger(r.commit) && r.commit > 0 && r.commit <= watermark && r.digest === await sha256(canonicalJson(r.data)), 'origin-integrity', '人物或任官修訂內容與固定摘要不符。');
  }
  const appointments = selected.filter((r): r is Revision<Appointment> => r.data.kind === 'appointment');
  const graph: ResearchGraph = {model: 1, personId, tenures: [], events: [], claims: [], evidence: [], factualConflicts: [], textualVariants: []};
  const sourcePins = new Map<string, RevisionPin>();
  const checkedSources = new Map<string, Revision<Source>>();
  // Person evidence is pinned too, even though P1 does not split name or kinship claims.
  for (const r of selected) for (const e of r.data.evidence) {
    const raw = sources.get(e.sourceId + '@' + e.sourceRevision);
    ok(raw, 'source-reference', '缺少原記錄實際引用的史料修訂；不回填最新版。');
    const pin = researchPin(raw);
    ok(pin.id === e.sourceId && pin.revision === e.sourceRevision, 'source-reference', '來源查找結果與引用身份不符。');
    if (!sourcePins.has(pinKey(pin))) {
      const checked = await verifySourcePin(pin, new Map([[pinKey(pin), JSON.parse(canonicalJson(raw)) as Revision<Source>]]), watermark);
      sourcePins.set(pinKey(pin), pin);
      checkedSources.set(pinKey(pin), checked);
    }
  }
  const warnings: ResearchWarning[] = [];
  for (const r of appointments) {
    const a = r.data, claimId = a.id + '/legacy:' + r.number;
    graph.tenures.push({id: a.id, personId, officeId: a.officeId, officeVersion: null,
      officeNameOriginal: a.officeName, polityOriginal: a.polity, natureOriginal: a.nature, jurisdictionOriginal: a.jurisdiction,
      legacyOrigin: researchPin(r), assessment: a.assessment, workflow: a.workflow, visibility: a.visibility, disposition: a.disposition, reason: a.reason,
      selected: {holding: null, start: null, end: null, continuity: null, attestations: [], rationale: ''}});
    graph.claims.push({id: claimId, subject: {kind: 'tenure', id: a.id}, content: {type: 'legacy-record', value: {officeName: a.officeName, nature: a.nature, polity: a.polity, jurisdiction: a.jurisdiction, date: {...a.date}}}, derivation: 'uninterpreted', assessment: a.assessment, rationale: a.reason});
    a.evidence.forEach((e, index) => graph.evidence.push({id: claimId + '/evidence:' + index, claimId, source: sourcePins.get(e.sourceId + '@' + e.sourceRevision)!, role: e.role === 'variant' ? 'unclassified-variant' : e.role, note: e.note}));
    if (a.duplicateOf) warnings.push({code: 'legacy-duplicate-preserved', id: a.id, message: '原互證記錄仍指向 ' + a.duplicateOf + '；不按同官同名自動合併任期。'});
    if (a.disposition === 'not-held') warnings.push({code: 'legacy-not-held-preserved', id: a.id, message: '保留舊未就處置；本輪不自動更改閱讀端排除政策。'});
  }
  const checked = await verifyResearchGraph(graph, checkedSources, watermark);
  const sourceList = [...sourcePins.values()].sort((a, b) => pinKey(a) < pinKey(b) ? -1 : pinKey(a) > pinKey(b) ? 1 : 0);
  const manifest = {model: 'prosopography-shadow-1', catalogueWatermark: watermark, personId,
    origins: selected.map(researchPin), sources: sourceList, graphDigest: checked.digest};
  return {readOnly: true as const, graph: checked.graph, manifest, digest: await sha256(canonicalJson(manifest)),
    warnings: [...warnings, ...checked.warnings],
    sourceRevisions: sourceList.map(pin => ({pin, data: checkedSources.get(pinKey(pin))!.data}))};
}
