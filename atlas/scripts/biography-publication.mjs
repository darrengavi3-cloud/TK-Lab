import { sourceDigest } from './appointment-publication.mjs';

// A name match cannot publish a biography. Reviews bind to the frozen roster ID
// and pin the authored text and its citations together.
export function reviewedBiographies(scope, review, existing = new Map()) {
  const byId = new Map(scope.map(row => [row.personId, row]));
  const seen = new Set();
  return review.records.filter(row => {
    if (!row.personId || seen.has(row.personId)) throw new Error('Duplicate or missing biography identity');
    seen.add(row.personId);
    return row.status === 'verified';
  }).map(row => {
    const person = byId.get(row.personId);
    if (!person || person.name !== row.name || sourceDigest(person) !== row.scopeEntryDigest) {
      throw new Error(`Biography identity changed: ${row.personId}`);
    }
    if (!row.reviewId || typeof row.bio !== 'string' || row.bio.trim().length < 40 ||
        !row.citations?.length || row.citations.some(c => !c.title || !c.quote || !/^https:\/\//.test(c.url))) {
      throw new Error(`Incomplete biography review: ${row.personId}`);
    }
    if (sourceDigest({ bio: row.bio, citations: row.citations }) !== row.contentDigest) {
      throw new Error(`Biography content changed; review required: ${row.personId}`);
    }
    if (existing.has(row.personId)) throw new Error(`Cannot overwrite existing biography: ${row.personId}`);
    return {
      personId: row.personId, reviewId: row.reviewId, bio: row.bio,
      citations: row.citations.map(({ title, url, quote, note }) => ({ title, url, quote, ...(note ? { note } : {}) }))
    };
  });
}
