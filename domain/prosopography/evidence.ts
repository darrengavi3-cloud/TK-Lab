import {validateRecord, type Source} from '../catalogue';
import {canonicalJson, sha256, type Revision} from '../revisions';
import type {ResearchGraph, RevisionPin} from './types';
import {pinKey, validateGraph, validatePin} from './validate';
import {requireResearch as ensure} from './time';

export const revisionPin = (r: Revision): RevisionPin => ({id: r.id, revision: r.number, digest: r.digest});
export async function verifyRevision(r: Revision, pin: RevisionPin, watermark: number): Promise<void> {
  validatePin(pin);
  ensure(r && r.id === pin.id && r.data?.id === pin.id && r.number === pin.revision && Number.isSafeInteger(r.commit) && r.commit > 0 && r.commit <= watermark, 'source-version', '固定修訂不存在、版本不符，或晚於所選快照。');
  validateRecord(r.data);
  ensure(r.digest === pin.digest && await sha256(canonicalJson(r.data)) === pin.digest, 'integrity', '固定修訂的內容或摘要已不相符。');
}
export function graphPins(g: ResearchGraph): {sources: RevisionPin[]; origins: RevisionPin[]} {
  validateGraph(g);
  const unique = (pins: RevisionPin[]) => {
    const byKey = new Map<string, RevisionPin>();
    for (const p of pins) {
      const old = byKey.get(pinKey(p));
      ensure(!old || old.digest === p.digest, 'integrity', '同一原始修訂出現互相矛盾的摘要。');
      byKey.set(pinKey(p), p);
    }
    return [...byKey.values()].sort((a, b) => pinKey(a) < pinKey(b) ? -1 : pinKey(a) > pinKey(b) ? 1 : 0);
  };
  return {
    sources: unique([...g.evidence.map(e => e.source), ...g.textualVariants.flatMap(v => v.readings.map(r => r.source))]),
    origins: unique([...g.tenures.flatMap(t => t.legacyOrigin ? [t.legacyOrigin] : []), ...g.claims.flatMap(c => c.origin ? [c.origin] : [])]),
  };
}
export async function verifyGraphReferences(g: ResearchGraph, revisions: ReadonlyMap<string, Revision>, watermark: number): Promise<Revision<Source>[]> {
  ensure(Number.isSafeInteger(watermark) && watermark >= 0, 'watermark', '快照序號無效。');
  const pins = graphPins(g);
  const sourceRows: Revision<Source>[] = [];
  for (const pin of [...pins.sources, ...pins.origins]) {
    const row = revisions.get(pinKey(pin));
    ensure(row, 'source-reference', '缺少固定的史料或原始任官修訂。');
    await verifyRevision(row, pin, watermark);
  }
  for (const pin of pins.sources) {
    const row = revisions.get(pinKey(pin))!;
    ensure(row.data.kind === 'source', 'source-kind', '證據必須引用史料，不能把人物或任官記錄冒充原文。');
    sourceRows.push(row as Revision<Source>);
  }
  for (const t of g.tenures) if (t.legacyOrigin) {
    const row = revisions.get(pinKey(t.legacyOrigin))!;
    const a = row.data;
    ensure(a.kind === 'appointment' && a.id === t.id && a.personId === g.personId && a.officeName === t.officeNameOriginal && a.nature === t.natureOriginal && a.polity === t.polityOriginal && a.jurisdiction === t.jurisdictionOriginal, 'origin', '任職的原始欄位必須與所固定的舊記錄相符。');
  }
  for (const c of g.claims) if (c.origin) {
    const a = revisions.get(pinKey(c.origin))!.data;
    ensure(c.content.type === 'legacy-record' && a.kind === 'appointment' && a.personId === g.personId && (a.id === c.subject.id || a.duplicateOf === c.subject.id), 'origin', '舊說法須指向本人的原任官或已明確標記的互證目標。');
    ensure(canonicalJson(c.content.value) === canonicalJson({officeName: a.officeName, nature: a.nature, polity: a.polity, jurisdiction: a.jurisdiction, date: a.date}), 'origin', '舊記錄文字與年代不可在轉換時被改寫。');
  }
  const verified = new Set(g.claims.filter(c => c.assessment === 'verified').map(c => c.id));
  for (const e of g.evidence) if (e.role === 'support' && verified.has(e.claimId)) {
    const source = revisions.get(pinKey(e.source))!.data;
    ensure(source.assessment !== 'excluded', 'excluded-evidence', '已排除史料不能支撐核定說法，仍可作為待考或反證材料保存。');
  }
  for (const v of g.textualVariants) for (const reading of v.readings) {
    const source = revisions.get(pinKey(reading.source))!.data as Source;
    ensure(source.text.includes(reading.text), 'variant-text', '異文讀法必須逐字見於所固定的原文修訂；不自動改字或正規化。');
  }
  return sourceRows;
}
