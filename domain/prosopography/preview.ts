import {validateRecord, type Appointment, type Source} from '../catalogue';
import {canonicalJson, sha256, type Revision} from '../revisions';
import {graphWarnings, officePresenceInYear, pinKey, researchId, validateGraph, validatePin} from './graph';
import {requireResearch as invariant, historicalYear} from './time';
import type {ResearchGraph, RevisionPin, ResearchWarning} from './types';

export const PROSOPOGRAPHY_BRIDGE = 'legacy-shadow-v1';
export const revisionPin = (r: Revision): RevisionPin => ({id: r.id, revision: r.number, digest: r.digest});
/** Recompute hashes; never trust a stored digest or a map's asserted identity. */
export async function verifyRevision(r: Revision, watermark: number): Promise<void> {
  invariant(r && r.data && r.id === r.data.id && Number.isSafeInteger(r.number) && r.number > 0 && Number.isSafeInteger(r.commit) && r.commit > 0 && r.commit <= watermark, 'revision', '引用的修訂不存在、身份不符或晚於快照序號。');
  validateRecord(r.data);
  invariant(await sha256(canonicalJson(r.data)) === r.digest, 'integrity', '修訂資料與 SHA-256 摘要不符。');
}
export async function pinSources(graph: ResearchGraph, history: ReadonlyMap<string, Revision>, watermark: number, additionalPins: readonly RevisionPin[] = []) {
  validateGraph(graph);
  invariant(Number.isSafeInteger(watermark) && watermark >= 0, 'watermark', '快照序號無效。');
  const required = new Map<string, RevisionPin>();
  for (const e of graph.evidence) required.set(pinKey(e.source), e.source);
  for (const v of graph.textualVariants) for (const r of v.readings) required.set(pinKey(r.source), r.source);
  for (const pin of additionalPins) {
    validatePin(pin);
    const previous = required.get(pinKey(pin));
    invariant(!previous || previous.digest === pin.digest, 'pin-conflict', '同一史料修訂不可具有兩個摘要。');
    required.set(pinKey(pin), pin);
  }
  const pinned: {pin: RevisionPin; data: Source}[] = [];
  for (const [key, pin] of [...required].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const r = history.get(key);
    invariant(r && r.id === pin.id && r.number === pin.revision && r.digest === pin.digest && r.data?.kind === 'source', 'source', '必須提供精確的史料修訂，不可改用最新版本。');
    await verifyRevision(r, watermark);
    pinned.push({pin: {...pin}, data: JSON.parse(canonicalJson(r.data)) as Source});
  }
  for (const v of graph.textualVariants) for (const reading of v.readings) {
    const source = pinned.find(s => pinKey(s.pin) === pinKey(reading.source))!;
    invariant(source.data.text.includes(reading.text), 'reading', '異文讀法未見於指定的原文修訂；不可正規化或改寫原文後冒稱原讀。');
  }
  return pinned;
}
/** Owner-only shadow bridge. It neither changes legacy records nor publishes. */
export async function legacyResearchPreview(rows: readonly Revision[], sources: ReadonlyMap<string, Revision>, personId: string, watermark: number, year: number | null = null) {
  invariant(researchId(personId) && Number.isSafeInteger(watermark) && watermark >= 0, 'request', '人物 ID 或快照序號無效。');
  invariant(year === null || historicalYear(year), 'year', '查詢年份無效；不可使用第零年。');
  invariant(new Set(rows.map(r => r.id)).size === rows.length, 'snapshot', '輸入須是每個 ID 只有一個版本的固定快照。');
  const person = rows.find(r => r.id === personId && r.data.kind === 'person');
  invariant(person, 'person', '此固定快照沒有該人物；不依同名或別名自動合併。');
  const appointments = rows.filter((r): r is Revision<Appointment> => r.data.kind === 'appointment' && r.data.personId === personId).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  invariant(appointments.length <= 1000, 'size', '單次人物預覽最多處理一千條任官；請先分批核對。');
  const relevant = [person, ...appointments];
  for (const r of relevant) await verifyRevision(r, watermark);
  const byId = new Map(appointments.map(r => [r.id, r]));
  const graph: ResearchGraph = {model: 1, personId, tenures: [], events: [], claims: [], evidence: [], factualConflicts: [], textualVariants: []};
  const warnings: ResearchWarning[] = [];
  for (const r of appointments) {
    const a = r.data;
    if (a.duplicateOf) {
      const target = byId.get(a.duplicateOf)?.data;
      invariant(target && target.disposition === 'none' && target.personId === a.personId && target.officeName === a.officeName && target.date.startYear === a.date.startYear && target.date.endYear === a.date.endYear, 'duplicate', '互證目標不存在或不符合既有任官身份，不可自動合併。');
      warnings.push({code: 'reviewed-duplicate', subjectId: a.id, note: '既有互證記錄連到原任職，保留其說法與證據，不增加第二次任職。'});
    } else {
      graph.tenures.push({id: 'tenure:' + a.id, personId, officeId: a.officeId, officeNameOriginal: a.officeName, polityOriginal: a.polity, natureOriginal: a.nature, jurisdictionOriginal: a.jurisdiction,
        assessment: a.assessment, workflow: a.workflow, visibility: a.visibility, disposition: a.disposition, reason: a.reason, legacyOrigin: revisionPin(r),
        selected: {holding: null, start: null, end: null, continuity: null, attestations: [], rationale: ''}});
    }
    const claimId = 'claim:' + a.id;
    graph.claims.push({id: claimId, subject: {kind: 'tenure', id: 'tenure:' + (a.duplicateOf || a.id)},
      content: {type: 'legacy-record', value: {officeName: a.officeName, nature: a.nature, polity: a.polity, jurisdiction: a.jurisdiction, date: {...a.date}}},
      derivation: 'uninterpreted', assessment: 'pending', rationale: '原樣引用舊記錄；新結構中的實任、事件與年代尚未逐項採擇。', origin: revisionPin(r)});
    for (const [i, e] of a.evidence.entries()) {
      const source = sources.get(pinKey({id: e.sourceId, revision: e.sourceRevision}));
      invariant(source && source.id === e.sourceId && source.number === e.sourceRevision && source.data.kind === 'source', 'source', '缺少任官引用的固定史料修訂。');
      graph.evidence.push({id: claimId + ':e:' + i, claimId, source: revisionPin(source), role: e.role === 'variant' ? 'unclassified-variant' : e.role, note: e.note});
    }
  }
  // Do not manufacture an appointment event, continuous tenure, or a split title
  // from an unclassified legacy string. The preserved originals remain inspectable.
  if (appointments.length) warnings.push({code: 'events-not-extracted', subjectId: personId, note: '尚未逐條抽取任命、免官及復拜事件；events 為空不表示沒有歷史事件。'});
  // Person-level citations remain provenance only, not manufactured career claims.
  const personPins = person.data.evidence.map(e => {
    const source = sources.get(pinKey({id: e.sourceId, revision: e.sourceRevision}));
    invariant(source && source.id === e.sourceId && source.number === e.sourceRevision && source.data?.kind === 'source', 'source', '缺少人物引用的固定史料修訂。');
    return revisionPin(source);
  });
  const pinned = await pinSources(graph, sources, watermark, personPins);
  warnings.push(...graphWarnings(graph));
  const payload = {
    model: 1, bridge: PROSOPOGRAPHY_BRIDGE, access: 'owner-only', persistence: 'none', watermark, personId,
    origins: relevant.map(r => ({pin: revisionPin(r), data: JSON.parse(canonicalJson(r.data))})),
    graph, sources: pinned, warnings,
    sourceRevisions: pinned.map(s => s.pin),
    presence: year === null ? [] : officePresenceInYear(graph, year),
  };
  return {...payload, digest: await sha256(canonicalJson(payload))};
}
