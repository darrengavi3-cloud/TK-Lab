import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { applyConsistencyReview, consistencySourceDigest } from '../atlas/scripts/consistency-publication.mjs';
import { matchPerson } from '../atlas/assets/app/people.js';

const read = file => JSON.parse(fs.readFileSync(new URL(file, import.meta.url)));
const runtime = file => {
  const scope = {};
  new Function('global', 'window', fs.readFileSync(new URL(file, import.meta.url), 'utf8'))(scope, scope);
  return Object.values(scope)[0];
};

test('all sixteen reported simplified names match through the actual reader search', () => {
  const baseline = fs.readFileSync(new URL('../research/v86-product/consistency-candidates.txt', import.meta.url), 'utf8');
  const cases = [...baseline.matchAll(/简体作「([^」]+)」）｜(person:[^\s]+)/g)];
  assert.equal(cases.length, 16);
  const people = read('../atlas/data/v63-reader-people.json').people;
  const { toSimplified } = runtime('../atlas/data/person-name-normalization.js');
  for (const [, query, id] of cases) {
    const match = matchPerson(people.find(p => p.personId === id), query, { toSimplified });
    assert.equal(match.matched, true, query);
    assert.equal(match.score, 0, query);
  }
});

test('reviewed epigraphy preserves source text and unknown years, and rejects stale decisions', () => {
  const sources = runtime('../atlas/data/epigraphic-v46-jin.js').records;
  const decisions = read('../atlas/data/v86-epigraphy-consistency-review.json').records;
  const reader = read('../atlas/data/v69-epigraphic-records.json').records;
  for (const decision of decisions) {
    const raw = sources.find(r => r.id === decision.recordId);
    const original = JSON.stringify(raw);
    const result = applyConsistencyReview(raw, structuredClone(raw), decision);
    const published = reader.find(r => r.id === raw.id);
    assert.equal(JSON.stringify(raw), original);
    assert.equal(published.year, raw.year);
    if (decision.titleDate) {
      assert.equal(published.yearText, decision.titleDate);
      assert.equal(published.dateText, `${decision.titleDate}（题名照录）`);
    }
    if (decision.inscriptionStopBefore) {
      assert.equal(published.inscription, result.inscription);
      assert.equal(raw.inscription.startsWith(published.inscription), true);
      assert.equal(published.inscription.includes(decision.inscriptionStopBefore), false);
    }
    assert.throws(() => applyConsistencyReview({ ...raw, sourceLocator: 'changed' }, structuredClone(raw), decision), /底本已变更/);
    assert.equal(consistencySourceDigest(raw), decision.sourceDigest);
  }
});

test('all 59 baseline candidates have a disposition; new or changed findings require reassessment', () => {
  const review = read('../research/v86-product/consistency-review.json');
  const baseline = fs.readFileSync(new URL('../research/v86-product/consistency-candidates.txt', import.meta.url));
  assert.equal(createHash('sha256').update(baseline).digest('hex'), review.baselineReportSha256);
  assert.equal(review.records.length, 59);
  assert.equal(new Set(review.records.map(r => r.id)).size, 59);
  assert.ok(review.records.every(r => r.reason && r.evidence.length && ['fixed', 'false-positive', 'already-reviewed', 'source-review'].includes(r.disposition)));
  const output = execFileSync(process.execPath, ['atlas/scripts/verify-historical-consistency.mjs', '--json'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  const current = JSON.parse(output).findings;
  assert.deepEqual(current.map(r => r.id).sort(), review.records.filter(r => r.disposition === 'source-review').map(r => r.currentFindingId).sort());
});
