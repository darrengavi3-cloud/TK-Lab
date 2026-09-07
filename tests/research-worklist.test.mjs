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

test('second source-review batch preserves all 213 published facts and freezes its 20 decisions', () => {
  const progress = work('appointment-batch-02-review');
  const decisions = read('atlas/data/v79-appointment-source-review.json').records;
  const triage = work('appointment-triage').records.slice(20, 40);
  const current = new Map(read('atlas/data/v63-reader-person-relations.json').appointments.map(r => [r.appointmentId, r]));
  assert.equal(progress.previousPublished.length, 213);
  for (const old of progress.previousPublished) assert.equal(hash(JSON.stringify(current.get(old.appointmentId))), old.sha256, old.appointmentId);
  assert.deepEqual(decisions.map(r => r.appointmentId), triage.map(r => r.recordId));
  assert.deepEqual(progress.counts, { reviewed: 20, verified: 12, suppressed: 6, pending: 2, remainingUnreviewedInQueue: 60 });
  for (const [status, count] of [['verified', 12], ['suppressed', 6], ['review-only', 2]]) assert.equal(decisions.filter(r => r.status === status).length, count);
  for (let i = 0; i < decisions.length; i++) {
    const decision = decisions[i];
    assert.equal(decision.sourceSha256, triage[i].sourceSnapshotSha256);
    assert.equal(hash(JSON.stringify(decision)), progress.records[i].decisionSha256);
    const fact = current.get(decision.appointmentId);
    assert.equal(Boolean(fact), decision.status === 'verified');
    if (fact) assert.equal(fact.citations[0].quote, triage[i].sourceSnapshot.sourceExcerpt);
  }
});

test('second batch fixes subjects, preserves qualifications and refuses ambiguous or unregistered assignments', () => {
  const facts = read('atlas/data/v63-reader-person-relations.json').appointments;
  const get = suffix => facts.find(r => r.appointmentId === 'appointment:source:' + suffix);
  for (const [suffix, personId, officeName] of [
    ['sgz:06:933d5cb670f7', 'person:source:653eea8eb9c6', '濮阳长'],
    ['sgz:06:c87d3944bc1a', 'person:workbook:e1d0e31a7b6329cb', '司徒掾'],
    ['sgz:08:1e74a1462c0a', 'person:source:ab031a3e252f', '大司马'],
    ['sgz:09:59206beeba4b', 'person:wei:cao-shuang', '武卫将军'],
    ['sgz:09:e51ee43f1b35', 'person:workbook:725ae36bb5bd06f2', '厉锋将军']
  ]) {
    assert.equal(get(suffix).personId, personId);
    assert.equal(get(suffix).nodeName, officeName);
  }
  for (const [suffix, start, end] of [
    ['sgz:04:ca285f4afbbd', 245, 248], ['sgz:04:fd5f5aa2a419', 239, 240],
    ['sgz:06:9b1ccfe3d1da', 188, 190], ['sgz:06:f8244e4b759d', 184, null],
    ['sgz:08:1e74a1462c0a', 189, 193], ['sgz:09:525296c06bb9', 242, 249],
    ['sgz:09:59206beeba4b', null, null], ['sgz:09:e51ee43f1b35', null, null],
    ['sgz:10:b72a5b3a36df', 196, 212], ['sgz:10:e4e682d44c25', null, null]
  ]) assert.deepEqual([get(suffix).startYear, get(suffix).endYear], [start, end]);
  assert.match(get('sgz:06:9b1ccfe3d1da').citations[0].note, /右将军.*异称未决/);
  assert.ok(get('sgz:06:9b1ccfe3d1da').citations.some(c => c.quote.includes('右將軍皇甫嵩')));
  assert.match(get('sgz:06:f8244e4b759d').citations[0].note, /辟署/);
  assert.match(get('sgz:09:59206beeba4b').citations[0].note, /历日换算/);
  assert.match(get('sgz:10:e4e682d44c25').citations[0].note, /不是?否定|非否定/);
  const xun = get('sgz:10:b72a5b3a36df');
  assert.match(xun.citations[0].note, /守/);
  assert.ok(xun.citations.some(c => c.url.endsWith('卷13') && c.quote.includes('代荀彧')));
  assert.equal(facts.filter(f => f.personId === xun.personId && f.nodeName === '尚书令').length, 1);
  for (const suffix of ['sgz:05:efb18232fd22', 'sgz:06:26e0f88d68b9', 'sgz:08:9f402aec33e4', 'sgz:11:7c0afd2160cf', 'sgz:11:da32e34d0275', 'sgz:12:bc5eeabffa36', 'sgz:13:27807e9f3fe2', 'sgz:14:a95f2afc1fc8']) assert.equal(get(suffix), undefined);
  assert.equal(facts.some(f => f.personId === 'person:workbook:55d46dfb6301bfdd' && f.nodeName === '伊阙都尉'), false);
  assert.equal(facts.some(f => f.personId === 'person:source:ab031a3e252f' && f.nodeName === '太傅'), false);
});
