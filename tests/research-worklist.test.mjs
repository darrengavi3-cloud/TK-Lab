import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const hash = s => createHash('sha256').update(s).digest('hex');
const work = n => read('research/v77-iteration/' + n + '.json');

test('research triage remains unapproved and preserves exact input evidence', () => {
  const triage = work('appointment-triage');
  assert.equal(triage.publicationApproved, false);
  assert.equal(triage.records.length, 100);
  assert.equal(new Set(triage.records.map(r => r.recordId)).size, 100);
  for (const row of triage.records) {
    assert.equal(row.sourceSnapshotSha256, hash(JSON.stringify(row.sourceSnapshot)));
    assert.equal(row.recordId, row.sourceSnapshot.id);
    assert.equal(row.publicationDecision, null);
    assert.ok(row.finding && row.sourceSnapshot.sourceExcerpt);
  }
  const biographies = work('biography-evidence-packs');
  assert.equal(biographies.publicationApproved, false);
  assert.equal(biographies.records.length, 24);
  const current = new Map(read('atlas/data/v63-reader-person-relations.json').appointments.map(r => [r.appointmentId, r]));
  for (const row of biographies.records) {
    assert.equal(row.factsSha256, hash(JSON.stringify(row.facts)));
    assert.equal(row.draftText, null);
    for (const fact of row.facts) {
      assert.equal(current.get(fact.appointmentId)?.personId, row.personId);
      assert.deepEqual(current.get(fact.appointmentId)?.citations, fact.citations);
    }
  }
  assert.equal(work('epigraphy-source-survey').records.length, 20);
  assert.ok(work('epigraphy-source-survey').imageChecks.every(r => !r.approvedForReuse));
});

test('all 59 existing inscriptions retain exact text including variants', () => {
  const current = new Map(read('atlas/data/v69-epigraphic-records.json').records.map(r => [r.id, r]));
  const baseline = work('preserved-inscriptions').records;
  assert.equal(baseline.length, 59);
  for (const row of baseline) {
    assert.equal(hash(current.get(row.recordId).inscription), row.sha256, row.recordId);
  }
});

test('first source-review batch resolves 19 candidates without changing the 197 published facts', () => {
  const progress = work('appointment-batch-01-review');
  const decisions = read('atlas/data/v78-appointment-source-review.json').records;
  const triage = work('appointment-triage').records.slice(0, 20);
  const current = new Map(read('atlas/data/v63-reader-person-relations.json').appointments.map(r => [r.appointmentId, r]));
  assert.equal(progress.previousPublished.length, 197);
  for (const old of progress.previousPublished) assert.equal(hash(JSON.stringify(current.get(old.appointmentId))), old.sha256, old.appointmentId);
  assert.deepEqual(decisions.map(r => r.appointmentId), triage.map(r => r.recordId));
  assert.equal(decisions.filter(r => r.status === 'verified').length, 16);
  assert.equal(decisions.filter(r => r.status === 'suppressed').length, 3);
  assert.equal(decisions.filter(r => r.status === 'review-only').length, 1);
  for (let i = 0; i < decisions.length; i++) {
    const decision = decisions[i];
    assert.equal(decision.sourceSha256, triage[i].sourceSnapshotSha256);
    assert.equal(hash(JSON.stringify(decision)), progress.records[i].decisionSha256);
    const fact = current.get(decision.appointmentId);
    assert.equal(Boolean(fact), decision.status === 'verified');
    if (fact) assert.equal(fact.citations[0].quote, triage[i].sourceSnapshot.sourceExcerpt);
  }
});

test('reviewed annals preserve retrospective dates, Wei polity stages, refusal subjects and office transitions', () => {
  const facts = read('atlas/data/v63-reader-person-relations.json').appointments;
  const get = suffix => facts.find(r => r.appointmentId === 'appointment:source:' + suffix);
  for (const suffix of ['sgz:01:086025d77767', 'sgz:01:ff7d5953c468']) {
    assert.equal(get(suffix).startYear, null);
    assert.equal(get(suffix).endYear, null);
  }
  for (const suffix of ['sgz:01:4deaf8c12bd9', 'sgz:01:5cc872d8d577', 'sgz:01:f468b0bebe12']) {
    assert.equal(get(suffix).startYear, 213);
    assert.match(get(suffix).citations[0].note, /魏公国/);
  }
  for (const [suffix, start, end] of [
    ['sgz:02:ee9f83595474', 220, 220], ['sgz:03:f45b9ace6450', 226, 236],
    ['sgz:04:1eba07d7f725', 250, 251], ['sgz:04:5ca5736ba0f0', 248, 256],
    ['sgz:04:8d02aa0c1925', 256, 263]
  ]) {
    assert.deepEqual([get(suffix).startYear, get(suffix).endYear], [start, end]);
  }
  assert.match(get('sgz:04:5ca5736ba0f0').citations[0].note, /拒受者为徐邈/);
  for (const suffix of ['sgz:01:dabd13008c69', 'sgz:03:c6e7de8a0c32', 'sgz:04:2f585cfc34c5', 'sgz:04:1d8fe3385e0b']) assert.equal(get(suffix), undefined);
});
