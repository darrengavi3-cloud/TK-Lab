import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { projectOfficeSuccession } from '../atlas/scripts/build-office-succession.mjs';
import { readReleaseConfig, loadSupplementDecisions } from '../atlas/scripts/release-config.mjs';

const root = new URL('../atlas/', import.meta.url);
const json = name => JSON.parse(fs.readFileSync(new URL(`data/${name}.json`, root), 'utf8'));
const people = json('v63-reader-people').people;
const relations = json('v63-reader-person-relations').appointments;
const offices = projectOfficeSuccession(people, relations);
const context = { window: { SGZ_OFFICE_SUCCESSION: { offices } } };
vm.runInNewContext(fs.readFileSync(new URL('assets/app/office-succession.js', root), 'utf8'), context);
const apply = context.window.SGZ_APPLY_OFFICE_SUCCESSION;

test('twenty representative journeys retain reviewed identities, appointments and matching timeline facts', () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('fixtures/v76-reviewed-journeys.json', import.meta.url), 'utf8'));
  const profiles = json('v69-person-profiles').profiles;
  assert.equal(fixture.people.length, 20);
  for (const expected of fixture.people) {
    const person = people.find(row => row.personId === expected.personId);
    assert.equal(person.name, expected.name);
    const profile = Array.isArray(profiles) ? profiles.find(row => row.personId === person.personId) : profiles[person.personId];
    const facts = relations.filter(row => row.personId === person.personId);
    for (const previous of expected.appointments) {
      const fact = facts.find(row => row.appointmentId === previous.appointmentId);
      assert.ok(fact, `lost reviewed appointment ${previous.appointmentId}`);
      assert.deepEqual([fact.nodeName, fact.startYear, fact.endYear], [previous.officeName, previous.startYear, previous.endYear]);
      assert.ok(person.appointmentIds.includes(fact.appointmentId));
      const event = profile.lifeEvents.find(row => row.relatedRecordId === fact.appointmentId);
      assert.deepEqual([event.title, event.startYear, event.endYear], [fact.nodeName, fact.startYear, fact.endYear]);
      assert.deepEqual(event.citations, fact.citations);
    }
  }
});

test('reviewed succession replaces stale cached dates and preserves separate acting/restoration events', () => {
  const node = { kind: 'office', name: '大将军', key: 'stable-id', officeStartYear: 234,
    figures: ['蒋琬（234—239）', '费祎（244—253）', '姜维（256—263）'], evolutionEvents: [{year:234}] };
  apply(node, 'shu');
  assert.equal(node.key, 'stable-id');
  assert.equal(node.officeStartYear, null);
  assert.equal(node.figures.find(row => row.name === '蒋琬').startYear, 235);
  assert.equal(node.figures.find(row => row.name === '费祎').startYear, 243);
  const jiang = node.figures.filter(row => row.name === '姜维');
  assert.deepEqual(Array.from(jiang, row => [row.startYear, row.endYear]), [[256,256],[256,null],[258,null]]);
  assert.ok(jiang.some(row => /后将军/.test(row.note) && row.citations.some(c=>/行大将军事|行大將軍事/.test(c.quote))));
  assert.doesNotMatch(node.evolution, /蒋琬.*234年|费祎.*244年|256—263/);
  const first = JSON.stringify(node);
  apply(node, 'shu');
  assert.equal(JSON.stringify(node), first, 'cache import and repeated normalization must be idempotent');
  const wei = {kind:'office',name:'大将军',figures:['曹爽']};
  assert.equal(apply(wei, 'wei'), wei);
  assert.deepEqual(wei.figures, ['曹爽']);
});

test('succession preserves unknown years, acting office names and independent institution history', () => {
  const node = { kind:'office', name:'尚书令', officeStartYear:219,
    figures:['法正（219—220）','费祎（238—244）','董允（244—246）'] };
  apply(node,'shu');
  assert.equal(node.officeStartYear,219);
  assert.equal(node.figures.find(row=>row.name==='费祎').startYear,null);
  assert.match(node.figures.find(row=>row.name==='董允').note,/守尚书令/);
  assert.equal(node.figures[0],'法正（219—220）');
  for (const office of offices) for (const row of office.appointments) {
    const fact = relations.find(fact=>fact.appointmentId===row.appointmentId);
    assert.equal(row.personId,fact.personId);
    assert.equal(row.startYear,fact.startYear);
    assert.equal(row.endYear,fact.endYear);
    assert.deepEqual(row.citations,fact.citations);
  }
  const dsm = offices.find(row=>row.name==='大司马').appointments[0];
  assert.equal(dsm.startYear,239);
  for(const volume of ['卷33','卷44']) assert.ok(dsm.citations.some(c=>c.url.endsWith(volume)));
});

test('public office projection fails closed for missing identities or citations', () => {
  assert.throws(()=>projectOfficeSuccession([], relations), /Incomplete/);
  const changed=structuredClone(relations);
  changed.find(row=>row.polity==='季汉'&&row.nodeName==='大将军').citations=[];
  assert.throws(()=>projectOfficeSuccession(people,changed), /Incomplete/);
  assert.ok(readReleaseConfig().appointmentReviewBatches.includes('v76-appointment-source-review.json'));
  assert.ok(loadSupplementDecisions(fileURLToPath(new URL('../atlas/',import.meta.url))).records.length);
});
