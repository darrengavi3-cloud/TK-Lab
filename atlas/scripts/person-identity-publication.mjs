import { sourceDigest } from './appointment-publication.mjs';

// The V62 roster stays immutable. Additions require an explicit identity review;
// source extraction, a same-name match, or a workbook year cannot enlarge it.
export function reviewedReaderScope(base, review) {
  if (sourceDigest(base) !== review.baseScopeSha256 || base.people?.length !== 2096) {
    throw new Error('Reader scope baseline changed; identity review required');
  }
  const ids = new Set(base.people.map(row => row.personId));
  if (ids.size !== base.people.length) throw new Error('Duplicate baseline person');
  const seen = new Set();
  const additions = [];
  for (const row of review.records) {
    if (!row.personId || seen.has(row.personId)) throw new Error('Duplicate or missing identity review');
    seen.add(row.personId);
    if (row.status !== 'verified') continue;
    if (!row.name || !row.reason || !row.citations?.length || !row.sourceGuards?.length ||
        row.citations.some(c => !c.title || !c.quote || !/^https:\/\//.test(c.url))) {
      throw new Error(`Incomplete identity review: ${row.personId}`);
    }
    if (row.action === 'add' && !ids.has(row.personId)) {
      additions.push({ personId: row.personId, name: row.name });
      ids.add(row.personId);
    } else if (row.action !== 'correct' || !ids.has(row.personId)) {
      throw new Error(`Invalid identity scope action: ${row.personId}`);
    }
  }
  return [...base.people, ...additions];
}

export function validateIdentitySources(review, datasets) {
  for (const row of review.records.filter(row => row.status === 'verified')) {
    for (const guard of row.sourceGuards) {
      const source = (datasets[guard.dataset] || []).find(item => item[guard.idField] === guard.id);
      if (!source || sourceDigest(source) !== guard.sha256) {
        throw new Error(`Identity source changed; review required: ${row.personId} / ${guard.id}`);
      }
    }
  }
}
