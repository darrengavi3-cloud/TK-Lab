import { createHash } from 'node:crypto';

export const consistencySourceDigest = row => createHash('sha256').update(JSON.stringify(row)).digest('hex');

// These decisions repair a projection, never the archived source or its dates.
export function applyConsistencyReview(raw, record, decision) {
  if (!decision) return record;
  if (decision.recordId !== raw.id || consistencySourceDigest(raw) !== decision.sourceDigest) {
    throw new Error(`一致性复核底本已变更：${raw.id}`);
  }
  if (decision.titleDate) {
    const literal = /[（(]([^）)]+)[）)]\s*$/.exec(raw.rawTitle || '')?.[1];
    if (literal !== decision.titleDate || !/未详|未詳|待考/.test(record.yearText || '') || record.year != null) {
      throw new Error(`题名纪年复核不适用：${raw.id}`);
    }
    record.yearText = literal;
    // The reading pane consumes dateText, while search/audit consume yearText.
    record.dateText = `${literal}（题名照录）`;
    record.disputeNote = [record.disputeNote, '纪年照录原始题名括注；西元年及异体年号尚待核定。'].filter(Boolean).join(' ');
  }
  if (decision.inscriptionStopBefore) {
    const marker = decision.inscriptionStopBefore;
    const offset = raw.inscription.indexOf(marker);
    if (offset <= 0 || raw.inscription.indexOf(marker, offset + marker.length) !== -1 || record.inscription !== raw.inscription) {
      throw new Error(`释文边界复核不适用：${raw.id}`);
    }
    record.inscription = raw.inscription.slice(0, offset).trimEnd();
    record.transcriptionNote = [record.transcriptionNote, decision.reason, '完整解析档保留；本次仅校正条目边界，未校订残字或补文。'].filter(Boolean).join(' ');
  }
  return record;
}
