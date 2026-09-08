import { sourceDigest } from './appointment-publication.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { loadIdentityReviewBatches } from './release-config.mjs';

export function loadReviewedReaderScope(root) {
  const base = JSON.parse(fs.readFileSync(path.join(root, 'data/v62-reader-scope.json'), 'utf8'));
  return reviewedReaderScope(base, ...loadIdentityReviewBatches(root));
}

// The V62 roster stays immutable. Additions require an explicit identity review;
// source extraction, a same-name match, or a workbook year cannot enlarge it.
export function reviewedReaderScope(base, ...reviews) {
  if (!reviews.length || base.people?.length !== 2096) {
    throw new Error('Reader scope baseline changed; identity review required');
  }
  const ids = new Set(base.people.map(row => row.personId));
  if (ids.size !== base.people.length) throw new Error('Duplicate baseline person');
  const seen = new Set();
  const additions = [];
  for (const review of reviews) {
    if (sourceDigest(base) !== review.baseScopeSha256) {
      throw new Error('Reader scope baseline changed; identity review required');
    }
    for (const row of review.records || []) {
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
      } else if (row.action === 'correct' && ids.has(row.personId)) {
        continue;
      } else if (row.action === 'suppress' && ids.has(row.personId)) {
        ids.delete(row.personId);
      } else {
        throw new Error(`Invalid identity scope action: ${row.personId}`);
      }
    }
  }
  return [...base.people, ...additions].filter(row => ids.has(row.personId));
}

export function validateIdentitySources(review, datasets) {
  for (const row of review.records.filter(row => row.status === 'verified')) {
    for (const guard of row.sourceGuards) {
      const source = (datasets[guard.dataset] || []).find(item => item[guard.idField] === guard.id);
      if (!source || sourceDigest(source) !== guard.sha256) {
        throw new Error(`Identity source changed; review required: ${row.personId} / ${guard.id}`);
      }
    }
    // A changed or newly added association invalidates the whole identity decision,
    // even when every individually frozen source row is still unchanged.
    for (const guard of row.sourceGroupGuards || []) {
      const dataset = datasets[guard.dataset];
      if (!Array.isArray(dataset) || guard.matchField !== 'personId' || guard.matchValue !== row.personId ||
          !guard.idField || !Number.isInteger(guard.count) || guard.count < 1) {
        throw new Error(`Invalid identity source group: ${row.personId}`);
      }
      const sources = dataset.filter(item => item[guard.matchField] === guard.matchValue)
        .sort((a, b) => String(a[guard.idField]).localeCompare(String(b[guard.idField])));
      if (sources.length !== guard.count || sourceDigest(sources) !== guard.sha256) {
        throw new Error(`Identity source group changed; review required: ${row.personId}`);
      }
    }
  }
}
