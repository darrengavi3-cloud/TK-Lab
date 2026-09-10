import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { reviewedReaderScope } from '../../atlas/scripts/person-identity-publication.mjs';

const read = path => JSON.parse(fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8'));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const base = read('atlas/data/v62-reader-scope.json');
const config = read('atlas/data/release-config.json');
const review = name => read('atlas/data/' + name);
const checkpoint = read('research/v77-iteration/appointment-batch-05-review.json').preservedBoundaries;
const frozen = read('tests/fixtures/v82-portrait-boundary.json');

export const expectedReaderPersonIds = reviewedReaderScope(base, ...config.identityReviewBatches.map(review))
  .map(person => person.personId).sort();
const laterBatches = config.identityReviewBatches.slice(checkpoint.identityReviewBatches.length);
assert.deepEqual(config.identityReviewBatches.slice(0, checkpoint.identityReviewBatches.length), checkpoint.identityReviewBatches);
assert.deepEqual(laterBatches, ['v85-person-identity-suppressions.json'], 'new identity batches require an explicit boundary review');
const withdrawals = review(laterBatches[0]);
const removedPeople = new Set(withdrawals.records.filter(row => row.status === 'verified' && row.action === 'suppress').map(row => row.personId));
const removedPortraits = new Set(withdrawals.withdrawnPortraits.map(row => row.portraitId));
assert.equal(removedPeople.size, 12);
assert.equal(removedPortraits.size, 12);
assert.equal(digest(frozen.portraitResolutions), checkpoint.portraitResolutionsSha256, 'historical portrait fixture changed');
assert.ok(withdrawals.withdrawnPortraits.every(row => removedPeople.has(row.personId)
  && frozen.portraitResolutions.some(old => old.portraitId === row.portraitId && old.personId === row.personId)));
export const expectedPortraitResolutions = frozen.portraitResolutions.filter(row => !removedPortraits.has(row.portraitId));
assert.ok(expectedPortraitResolutions.every(row => !removedPeople.has(row.personId)), 'a withdrawn identity retains a portrait');

export function assertReaderPeople(people) {
  assert.deepEqual(Array.from(people, person => person.personId).sort(), expectedReaderPersonIds,
    'reader identities must equal the independently reviewed scope, not just its count');
}

export function assertReaderPortraits(assets) {
  assert.deepEqual(Array.from(assets, asset => asset.portraitId).sort(), expectedPortraitResolutions.map(row => row.portraitId).sort(),
    'all retained portraits and no withdrawn portraits must be packaged');
}

export function assertHistoricalIdentityBoundary(boundary, people) {
  const historicalIds = reviewedReaderScope(base, ...boundary.identityReviewBatches.map(review)).map(row => row.personId).sort();
  assert.equal(historicalIds.length, boundary.people);
  assert.equal(digest(historicalIds), boundary.personIdsSha256, 'historical roster changed');
  assert.equal(digest(frozen.portraitResolutions), boundary.portraitResolutionsSha256, 'historical portrait bindings changed');
  assert.deepEqual(expectedReaderPersonIds, historicalIds.filter(id => !removedPeople.has(id)), 'only reviewed identities may be withdrawn');
  assertReaderPeople(people.people);
  assert.deepEqual(people.portraitResolutions, expectedPortraitResolutions, 'retained portrait bindings and order must stay unchanged');
}
