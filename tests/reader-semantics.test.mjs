import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { applyReviewedTranscription } from '../atlas/scripts/epigraphy-publication.mjs';
import crypto from 'node:crypto';
import test from 'node:test';
import { reviewedAppointments, sourceDigest } from '../atlas/scripts/appointment-publication.mjs';
import { reviewedReaderScope, validateIdentitySources } from '../atlas/scripts/person-identity-publication.mjs';
import { fangzhenValidAtYear, classifyFangzhenDynasty } from '../atlas/assets/app/fangzhen.js';
import { createPersonNavigator } from '../atlas/assets/app/navigation.js';
import { acceptedRouteMessage, validRouteHash } from '../atlas/assets/app/route-contract.js';
import { parseRouteHash, serializeRouteHash } from '../atlas/assets/app/shell.js';

const root = new URL('../atlas/', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const json = name => JSON.parse(read(`data/${name}.json`));
const source = json('person-source-index');
const review = json('v71-appointment-review');
const relations = json('v63-reader-person-relations');

test('reviewed identities extend the frozen roster without losing ids or publishing the old Wei candidate', () => {
  const base = json('v62-reader-scope');
  const identityReview = json('v71-person-identity-review');
  const roster = json('v63-reader-people').people;
  const additions = ['person:han:liu-wangzhi', 'person:han:wang-shang-wenbiao', 'person:jin:li-xing-junshi'];
  assert.deepEqual(new Set(roster.map(row => row.personId)), new Set([...base.people.map(row => row.personId), ...additions]));
  assert.equal(reviewedReaderScope(base, identityReview).length, 2099);
  const liu = roster.find(row => row.personId === 'person:snapshot260:9fbd9f0edab3ad59');
  assert.equal(liu.zi, '道真');
  assert.equal(liu.birthplace, '燕国蓟');
  assert.deepEqual(liu.dynastyTags, ['西晋']);
  const candidates = json('v63-person-registry').byPersonId[liu.personId].reviewCandidates.dynastyTags;
  assert.ok(candidates.some(row => row.value.includes('魏')));
  assert.ok(candidates.filter(row => row.value.includes('魏')).every(row => row.publicationStatus === 'review-only'));
  for (const row of identityReview.records) {
    const person = roster.find(person => person.personId === row.personId);
    assert.ok(person.appointmentIds.length);
    for (const id of person.appointmentIds) {
      const appointment = relations.appointments.find(fact => fact.appointmentId === id);
      assert.equal(appointment.personId, person.personId);
      assert.equal(appointment.startYear, null);
      assert.equal(appointment.endYear, null);
      assert.ok(appointment.citations.some(citation => citation.quote === row.citations[0].quote));
    }
  }
  assert.throws(() => reviewedReaderScope({ ...base, people: base.people.slice(1) }, identityReview), /baseline changed/);
  assert.throws(() => reviewedReaderScope(base, { ...identityReview, records: [...identityReview.records, identityReview.records[0]] }), /Duplicate/);
  assert.throws(() => validateIdentitySources(identityReview, { appointments: [] }), /Identity source changed/);
});

test('identity resolution cannot publish an unreviewed appointment; source edits invalidate review', () => {
  const row = source.appointments.find(row => row.id === review.records[0].appointmentId);
  assert.deepEqual(reviewedAppointments([row], { records: [] }), []);
  const decision = { appointmentId: row.id, sourceSha256: sourceDigest(row), status: 'verified', reason: 'Fixture review' };
  assert.equal(reviewedAppointments([row], { records: [decision] }).length, 1);
  assert.throws(() => reviewedAppointments([{ ...row, officeName: 'other' }], { records: [decision] }), /source changed/);
  assert.throws(() => reviewedAppointments([row], { records: [decision, decision] }), /Duplicate/);
});

test('all 149 formerly published assertions have dispositions; corrected subjects and negations survive rebuild', () => {
  assert.equal(review.records.length, 149);
  const published = new Map(relations.appointments.map(row => [row.appointmentId, row]));
  assert.equal(published.size, 101);
  const row = suffix => published.get(`appointment:source:${suffix}`);
  assert.equal(row('sgz:22:dc35da5cf8f9').personId, 'person:workbook:13d66149e45735fd');
  assert.equal(row('sgz:22:dc35da5cf8f9').nodeName, '从事祭酒');
  assert.equal(row('sgz:38:829deeeb0689').personId, 'person:workbook:2cbac2c953caf4a3');
  assert.equal(row('jinshu:024:b8d36c4d1199').nodeName, '太子太保');
  assert.equal(row('jinshu:092:fb598d513c5b').personId, 'person:workbook:820719bf57950697');
  assert.equal(row('jinshu:092:fb598d513c5b').nodeName, '太傅长史');
  assert.ok(row('jinshu:090:d98e5b408f46').citations.some(citation => citation.quote.includes('上不從')));
  assert.equal(row('jinshu:024:bc1019f07d24').startYear, null, 'Do not infer a tenure from the eight-minister narrative');
  for (const suffix of ['jinshu:003:4b5d9e2c1811','sgz:49:208a42091504','sgz:60:2286bb4d9b3e']) {
    assert.equal(row(suffix), undefined, 'An appointment order alone does not establish actual tenure');
  }
  for (const suffix of ['sgz:33:37976c389d0c', 'sgz:04:c0283bf31d40', 'sgz:04:eb02abb80150', 'sgz:48:69bd8dd84fa3', 'jinshu:107:6c58ebee08e9']) {
    assert.equal(row(suffix), undefined, `Refuted, unrealized or wrong-person assertion published: ${suffix}`);
  }
  for (const decision of review.records) assert.equal(published.has(decision.appointmentId), decision.status === 'verified');
  for (const fact of relations.appointments) {
    const original = source.appointments.find(row => row.id === fact.appointmentId);
    assert.equal(fact.citations[0].quote, original.sourceExcerpt, 'Reference excerpt was truncated or rewritten');
    assert.match(fact.citations[0].url, /^https:\/\//);
  }
});

test('snapshots contain confirmed, bounded tenures only, including inclusive endpoints', () => {
  const record = { readerDisplayStatus: 'verified', startYear: 192, endYear: 196 };
  assert.equal(fangzhenValidAtYear(record, 192), true);
  assert.equal(fangzhenValidAtYear(record, '196'), true);
  for (const year of [191, 197, null, '', false, 'unknown']) assert.equal(fangzhenValidAtYear(record, year), false);
  for (const values of [{ startYear: null }, { endYear: null }, { startYear: 197 }, { readerDisplayStatus: 'candidate' }]) {
    assert.equal(fangzhenValidAtYear({ ...record, ...values }, 194), false);
  }
  for (const row of json('v69-fangzhen-reader').records.filter(row => row.startYear == null && row.endYear == null)) {
    for (const year of [184, 260, 316]) assert.equal(fangzhenValidAtYear(row, year), false);
  }
  assert.equal(classifyFangzhenDynasty({ polity: '汉', startYear: null, endYear: null }), '汉');
});

test('verified administrative tenures resolve into person timelines; candidates do not', () => {
  const records = new Map(json('v69-fangzhen-reader').records.map(row => [row.id, row]));
  const events = json('v69-person-profiles').profiles.flatMap(person => person.lifeEvents || []).filter(event => event.eventType === 'fangzhen');
  assert.equal(events.length, 43);
  for (const event of events) {
    const record = records.get(event.relatedRecordId);
    assert.equal(record.readerDisplayStatus, 'verified');
    assert.equal(event.personId, record.personId);
  }
  assert.equal(json('v63-reader-people').people.filter(person => person.bio).length, 70);
  assert.equal(json('v63-reader-people').people.filter(person => person.bioClassical).length, 0);
});

test('person links switch module, await data, and prevent stale results from replacing a later selection', async () => {
  let active = 'fangzhen'; const pending = []; const selected = [];
  const navigate = createPersonNavigator({
    activate: () => { active = 'people'; }, prepare: () => new Promise(resolve => pending.push(resolve)),
    isActive: () => active === 'people', find: id => ({ personId: id }), select: person => selected.push(person.personId),
    missing: () => assert.fail('Unexpected missing person'), failed: error => assert.fail(error.message)
  });
  const first = navigate('first'); assert.equal(active, 'people'); assert.equal(selected.length, 0);
  const second = navigate('second'); pending[0](); await first; assert.equal(selected.length, 0);
  pending[1](); await second; assert.deepEqual(selected, ['second']);
  const third = navigate('third'); active = 'jinshi'; pending[2](); await third; assert.deepEqual(selected, ['second']);
});

test('host routes require the expected frame and origin, and preserve archive context', () => {
  const frame = {}; const origin = 'https://example.test';
  const hash = serializeRouteHash('fangzhen', { view: 'compare', year: '220', compare: '260', verified: '1', q: '荆州' });
  const event = { source: frame, origin, data: { type: 'guanshitai:route', mode: 'push', hash } };
  assert.equal(acceptedRouteMessage(event, frame, origin), true);
  assert.equal(acceptedRouteMessage({ ...event, source: {} }, frame, origin), false);
  assert.equal(acceptedRouteMessage({ ...event, origin: 'https://untrusted.test' }, frame, origin), false);
  assert.equal(validRouteHash('#people\n'), false);
  assert.equal(validRouteHash('#unknown'), false);
  assert.equal(validRouteHash('#people?' + 'q'.repeat(4096)), false);
  const restored = parseRouteHash(hash);
  assert.equal(restored.module, 'fangzhen');
  assert.equal(restored.params.get('q'), '荆州');
  assert.equal(restored.params.get('compare'), '260');
});

test('a history restore within people cancels an older in-flight person link', async () => {
  let epoch = 0; let finish; let selected = false;
  const navigate = createPersonNavigator({
    activate: () => ++epoch, prepare: () => new Promise(resolve => { finish = resolve; }),
    isActive: scope => scope === epoch, find: () => ({}), select: () => { selected = true; },
    missing() {}, failed: error => assert.fail(error.message)
  });
  const request = navigate('old-link');
  epoch += 1; // Browser back/forward restores another dossier in the same module.
  finish(); await request;
  assert.equal(selected, false);
});

test('canonical, portable scripts and shared reader templates compile', () => {
  const html = read('index.html');
  for (const [, code] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) if (code.trim()) new vm.Script(code);
  const portable = new URL('exports/观史台-轻量单文件版.html', root);
  if (fs.existsSync(portable)) {
    for (const [, code] of fs.readFileSync(portable, 'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) if (code.trim()) new vm.Script(code);
  }
  const decode = text => text.replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  const context = { console: { warn() {}, info() {} }, document: { createElement: () => ({
    set innerHTML(text) { this.textContent = decode(text); this.children = [{ getAttribute: () => decode(text.match(/foo="([\s\S]*)">/)[1]) }]; }
  }) } };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('assets/vendor/vue/vue.global.min.js'), context);
  vm.runInContext(read('assets/app/reader-components.js'), context);
  const templates = [html.slice(html.lastIndexOf('  template: `') + 13, html.lastIndexOf('  `\n});')), ...Object.values(context.SGZ_READER_COMPONENTS).map(component => component.template)];
  for (const template of templates) context.Vue.compile(template, { onError: error => assert.fail(error.message) });
});

test('all existing inscriptions, sections and variants are preserved verbatim', () => {
  const payload = json('v69-epigraphic-records');
  const restored = new Set([...json('v65-epigraphy-reader-overlays').records, ...json('v71-epigraphy-transcription-review').records].map(row => row.recordId));
  const originals = payload.records.filter(row => row.inscription && !restored.has(row.id))
    .map(row => [row.id, row.inscription, row.transcriptionSections || [], row.inscriptionVariants || []]);
  assert.equal(originals.length, 44);
  const digest = crypto.createHash('sha256').update(JSON.stringify(originals)).digest('hex');
  assert.equal(digest, '1702c9de1279c4550949599c673b0686ae2f85026bc91a2d65d78cc9bb1313c3');
});

test('the final reader retains all six reviewed transcriptions and variants without legacy overlays', () => {
  const payload = json('v69-epigraphic-records');
  const context = { window: {} };
  vm.runInNewContext(read('exports/观史台-读者版/data/v69-epigraphic-records.js'), context);
  const reader = JSON.parse(JSON.stringify(context.window.SGZ_V69_EPIGRAPHIC_RECORDS));
  const overlays = json('v65-epigraphy-reader-overlays').records;
  assert.equal(overlays.length, 6);
  assert.equal(payload.summary.withInscription, 54);
  assert.equal(reader.summary.withoutInscription, 112);
  for (const overlay of overlays) {
    for (const rows of [payload.records, reader.records]) {
      const record = rows.find(row => row.id === overlay.recordId);
      assert.equal(record.inscription, overlay.inscription, overlay.recordId);
      assert.deepEqual(record.inscriptionVariants, overlay.inscriptionVariants);
      assert.ok(record.transcriptionReferences.length);
      assert.ok(record.transcriptionReferences.every(reference => reference.title && /^https:\/\//.test(reference.url)));
    }
  }
  const canonicalHtml = read('index.html');
  const readerHtml = read('exports/观史台-读者版/index.html');
  for (const html of [canonicalHtml, readerHtml]) {
    assert.ok(html.includes('<inscription-apparatus :record="jinshiPrimaryDetail" />'));
    assert.ok(html.includes('<inscription-apparatus :record="activeEpigraphicDetail" />'));
  }
});

test('reviewed Wei texts reach the final reader with lacunae and provenance intact', () => {
  const review = json('v71-epigraphy-transcription-review');
  const c = { window: {} };
  vm.runInNewContext(read('exports/观史台-读者版/data/v69-epigraphic-records.js'), c);
  const rows = c.window.SGZ_V69_EPIGRAPHIC_RECORDS.records;
  assert.deepEqual(review.records.map(r => r.recordId).sort(), ['wei-henghai-lu-lang', 'wei-liubiao-stele', 'wei-luoyang-north-boundary', 'wei-wangji-stele']);
  for (const r of review.records) {
    const actual = rows.find(row => row.id === r.recordId);
    assert.equal(actual.inscription, r.inscription);
    assert.equal(crypto.createHash('sha256').update(actual.inscription).digest('hex'), r.transcriptionDigest);
    assert.equal(actual.transcriptionNote, r.transcriptionNote);
    assert.deepEqual(JSON.parse(JSON.stringify(actual.transcriptionReferences)), r.transcriptionReferences);
  }
  assert.equal(rows.find(r => r.id === 'wei-henghai-lu-lang').people, '');
  assert.ok(rows.find(r => r.id === 'wei-henghai-lu-lang').inscription.startsWith('君諱□□□□，□□博望人也。'));
  assert.ok(rows.find(r => r.id === 'wei-liubiao-stele').inscription.includes('距邕死已三十六年'));
  assert.ok(rows.find(r => r.id === 'wei-wangji-stele').inscription.startsWith('〈上闕。〉'));
  assert.equal(rows.find(r => r.id === 'wei-luoyang-north-boundary').inscription, '洛陽北界');
});

test('epigraphy publication rejects changed sources, edited text and overwrites', () => {
  const c = { window: {} };
  vm.runInNewContext(read('data/epigraphic-records.js'), c);
  const r = json('v71-epigraphy-transcription-review').records[0];
  const raw = JSON.parse(JSON.stringify(c.window.SGZ_EPIGRAPHIC_RECORDS.records.find(row => row.id === r.recordId)));
  assert.equal(applyReviewedTranscription(raw, { inscription: '' }, r).inscription, r.inscription);
  assert.throws(() => applyReviewedTranscription({ ...raw, name: 'changed' }, {}, r), /须重新审校/);
  assert.throws(() => applyReviewedTranscription(raw, {}, { ...r, inscription: r.inscription + '改' }), /校验失败/);
  assert.throws(() => applyReviewedTranscription(raw, { inscription: '原文' }, r), /不得覆盖/);
});
