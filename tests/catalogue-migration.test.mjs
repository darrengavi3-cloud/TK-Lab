import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readLegacyBaseline } from '../importers/legacy-atlas/index.mjs';
const root=process.cwd();
const migration=readLegacyBaseline(root);
const json=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const ids=rows=>rows.map(r=>r.id).sort();

test('shadow import closes the frozen V86 appointment status counts without promoting candidates',()=>{
  assert.equal(migration.report.readerPeople,2074);
  assert.equal(migration.report.appointments,851);
  assert.deepEqual(migration.report.appointmentCounts,{verified:263,pending:507,disputed:2,suppressed:79});
  const rows=migration.records.filter(r=>r.kind==='appointment');
  assert.deepEqual(Object.fromEntries(['verified','pending','disputed','excluded'].map(s=>[s,rows.filter(r=>r.assessment===s).length])),{verified:263,pending:507,disputed:2,excluded:79});
  assert.equal(migration.report.writeCutover,false);
  assert.equal(migration.report.dataAuthority,'atlas');
});
test('every original byte, including full registry and superseded decisions, is retained',()=>{
  for(const [name,archive] of Object.entries(migration.archives)){
    const input=fs.readFileSync(path.join(root,name));
    assert.ok(input.equals(Buffer.from(archive.text,'utf8')),name);
    assert.equal(archive.sha256,digest(input),name);
    assert.equal(archive.bytes,input.length,name);
  }
  const config=json('atlas/data/release-config.json');
  for(const name of [...config.identityReviewBatches,...config.appointmentReviewBatches,...config.appointmentSupplementBatches.flatMap(b=>[b.evidence,b.decisions])]) assert.ok(migration.archives['atlas/data/'+name],name);
});
test('person and appointment IDs are mapped one for one, not merely counted',()=>{
  const registry=json('atlas/data/v63-person-registry.json');
  assert.deepEqual(ids(migration.records.filter(r=>r.kind==='person')),[...registry.people,...registry.excludedPeople].map(r=>r.personId).sort());
  const expected=json('atlas/data/person-source-index.json').appointments.map(r=>r.id);
  for(const batch of json('atlas/data/release-config.json').appointmentSupplementBatches) expected.push(...json('atlas/data/'+batch.decisions).records.map(r=>r.id));
  assert.deepEqual(ids(migration.records.filter(r=>r.kind==='appointment')),expected.sort());
  assert.equal(new Set(migration.records.map(r=>r.id)).size,migration.records.length);
});
test('existing reader payloads, peerage relation keys and identity maps survive unchanged',()=>{
  assert.deepEqual(migration.readerBaseline.people,json('atlas/data/v63-reader-people.json'));
  assert.deepEqual(migration.readerBaseline.relations,json('atlas/data/v63-reader-person-relations.json'));
  const registry=json('atlas/data/v63-person-registry.json');
  assert.deepEqual(migration.identityMaps.legacyToCanonical,registry.legacyToCanonical);
  assert.deepEqual(migration.identityMaps.sourceRecordToCanonical,registry.sourceRecordToCanonical);
});
test('source excerpts and supporting quotes are preserved without trimming or normalization',()=>{
  const sources=new Map(migration.records.filter(r=>r.kind==='source').map(r=>[r.id,r]));
  const records=new Map(migration.records.map(r=>[r.id,r]));
  for(const raw of json('atlas/data/person-source-index.json').appointments){
    // A verified correction may deliberately replace the citation set; the raw
    // source remains byte-identical in archives. Unreviewed rows retain excerpts.
    const row=records.get(raw.id);
    if(row.assessment==='pending'||row.assessment==='disputed') assert.ok(row.evidence.some(e=>sources.get(e.sourceId).text===raw.sourceExcerpt),raw.id);
  }
  for(const source of sources.values()) assert.equal(source.textScope,'excerpt');
  for(const record of migration.records) for(const e of record.evidence){
    assert.ok(sources.has(e.sourceId));assert.equal(e.sourceRevision,1);
  }
});
test('unresolved identity links are explicit and do not invent people or erase facts',()=>{
  const people=new Set(migration.records.filter(r=>r.kind==='person').map(r=>r.id));
  const missing=migration.records.filter(r=>r.kind==='appointment'&&!people.has(r.personId)).map(r=>({appointmentId:r.id,personId:r.personId}));
  assert.deepEqual(migration.report.unresolvedReferences,missing);
  assert.equal(migration.records.filter(r=>r.kind==='appointment').length,851);
});
