import type {Appointment} from '../catalogue';
import {canonicalJson, sha256, type Revision} from '../revisions';
import type {OfficeTenure, ResearchGraph} from './types';
import {revisionPin, verifyRevision} from './evidence';
import {pinKey, validateGraph} from './validate';
import {requireResearch as ensure} from './time';

/** Read-only, deterministic shadow conversion. Never guesses events or tenure endpoints. */
export async function legacyResearchGraph(personId: string, snapshot: readonly Revision[], pinned: ReadonlyMap<string, Revision>, watermark: number): Promise<ResearchGraph> {
  ensure(new Set(snapshot.map(r => r.id)).size === snapshot.length, 'snapshot', '輸入必須是每個 ID 僅一版的固定快照。');
  const person = snapshot.find(r => r.id === personId);
  ensure(person?.data.kind === 'person', 'person', '人物不存在；不以同名或別名自動合併。');
  await verifyRevision(person, revisionPin(person), watermark);
  const rows = snapshot.filter((r): r is Revision<Appointment> => r.data.kind === 'appointment' && r.data.personId === personId).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const byId = new Map(rows.map(r => [r.id, r]));
  const graph: ResearchGraph = {model: 1, personId, tenures: [], events: [], claims: [], evidence: [], factualConflicts: [], textualVariants: []};
  for (const row of rows) {
    await verifyRevision(row, revisionPin(row), watermark);
    const a = row.data;
    let subjectId = a.id;
    if (a.duplicateOf) {
      const target = byId.get(a.duplicateOf)?.data;
      ensure(target && target.disposition === 'none' && target.officeName === a.officeName && target.date.startYear === a.date.startYear && target.date.endYear === a.date.endYear, 'duplicate', '已登記的互證目標不存在或與原任官不符。');
      subjectId = target.id;
    } else {
      const tenure: OfficeTenure = {id: a.id, personId, officeId: a.officeId, officeNameOriginal: a.officeName, polityOriginal: a.polity, natureOriginal: a.nature, jurisdictionOriginal: a.jurisdiction,
        assessment: a.assessment, workflow: a.workflow, visibility: a.visibility, disposition: a.disposition, reason: a.reason, legacyOrigin: revisionPin(row),
        selected: {holding: null, start: null, end: null, continuity: null, attestations: [], rationale: ''}};
      graph.tenures.push(tenure);
    }
    const claimId = 'claim:legacy:' + await sha256(a.id);
    graph.claims.push({id: claimId, subject: {kind: 'tenure', id: subjectId}, content: {type: 'legacy-record', value: {officeName: a.officeName, nature: a.nature, polity: a.polity, jurisdiction: a.jurisdiction, date: JSON.parse(canonicalJson(a.date))}}, derivation: 'uninterpreted', assessment: 'pending', rationale: '保留原任官修訂；尚未拆分事件、始終任與見任說法，不承襲結構化核定。', origin: revisionPin(row)});
    for (const e of a.evidence) {
      const source = pinned.get(pinKey({id: e.sourceId, revision: e.sourceRevision, digest: ''}));
      ensure(source?.data.kind === 'source', 'source-reference', '舊引用的精確史料修訂缺失，不能用最新版本替代。');
      await verifyRevision(source, revisionPin(source), watermark);
      graph.evidence.push({id: 'evidence:' + await sha256(canonicalJson([a.id, e.sourceId, e.sourceRevision, e.role])), claimId, source: revisionPin(source), role: e.role === 'variant' ? 'unclassified-variant' : e.role, note: e.note});
    }
  }
  validateGraph(graph);
  return graph;
}
