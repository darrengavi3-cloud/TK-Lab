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
