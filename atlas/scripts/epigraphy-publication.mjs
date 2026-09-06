import { createHash } from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest('hex');

export function applyReviewedTranscription(raw, record, review) {
  if (!review) return record;
  if (review.recordId !== raw.id || digest(JSON.stringify(raw)) !== review.sourceDigest) {
    throw new Error(`金石底本已变更，须重新审校：${raw.id}`);
  }
  if (String(record.inscription || '').trim()) throw new Error(`不得覆盖已有录文：${raw.id}`);
  if (!review.inscription?.trim() || digest(review.inscription) !== review.transcriptionDigest ||
      !review.transcriptionNote || !review.transcriptionReferences?.length ||
      !review.transcriptionReferences.every(source => source.title && /^https:\/\//.test(source.url))) {
    throw new Error(`金石录文或出处校验失败：${raw.id}`);
  }
  if (Object.hasOwn(review, 'inscriptionVariants')) {
    if (!Array.isArray(review.inscriptionVariants) ||
        digest(JSON.stringify(review.inscriptionVariants)) !== review.apparatusDigest ||
        !review.inscriptionVariants.every(item => item.label && item.text?.trim() && item.source)) {
      throw new Error(`金石旧注或异文校验失败：${raw.id}`);
    }
    if (record.inscriptionVariants?.length) throw new Error(`不得覆盖已有旧注或异文：${raw.id}`);
  }
  for (const field of ['inscription', 'inscriptionStatus', 'transcriptionNote', 'transcriptionReferences', 'inscriptionVariants']) {
    if (Object.hasOwn(review, field)) record[field] = structuredClone(review[field]);
  }
  if (review.suppressUnverifiedPersonLink === true) record.people = '';
  return record;
}
