import { reviewedEpigraphicYears, taishiChronologicalYear } from '../atlas/scripts/epigraphy-year-publication.mjs';
import { reviewedBiographies } from '../atlas/scripts/biography-publication.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { applyReviewedTranscription } from '../atlas/scripts/epigraphy-publication.mjs';
import crypto from 'node:crypto';
import test from 'node:test';
import { reviewedAppointments, sourceDigest } from '../atlas/scripts/appointment-publication.mjs';
import { reviewedSupplementAppointments, appointmentStatusCounts } from '../atlas/scripts/appointment-supplements.mjs';
import { reviewedReaderScope, validateIdentitySources } from '../atlas/scripts/person-identity-publication.mjs';
import { fangzhenValidAtYear, classifyFangzhenDynasty } from '../atlas/assets/app/fangzhen.js';
import { epigraphicYear, epigraphicEraKey, epigraphicInscriptionState, matchesEpigraphicInscriptionStatus } from '../atlas/assets/app/jinshi.js';
import { createPersonNavigator } from '../atlas/assets/app/navigation.js';
import { acceptedRouteMessage, validRouteHash } from '../atlas/assets/app/route-contract.js';
import { parseRouteHash, serializeRouteHash } from '../atlas/assets/app/shell.js';

const root = new URL('../atlas/', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const json = name => JSON.parse(read(`data/${name}.json`));
const source = json('person-source-index');
const review = json('v71-appointment-review');
const relations = json('v63-reader-person-relations');

test('V74 chancellery evidence preserves refutations, corrected subjects and unknown dates', () => {
  const scope = reviewedReaderScope(json('v62-reader-scope'), json('v71-person-identity-review'), json('v73-person-identity-suppressions'));
  const evidence = json('v74-chancellery-evidence');
  const supplement = json('v74-appointment-supplements');
  const accepted = reviewedSupplementAppointments(scope, evidence, supplement);
  assert.equal(accepted.length, 34);
  const office = (name, title) => accepted.find(row => row.name === name && row.officeName === title);
  assert.ok(office('李朝', '别驾从事'));
  assert.equal(office('李朝', '西曹掾'), undefined);
  assert.ok(office('马齐', '丞相掾'));
  assert.equal(office('马齐', '从事中郎'), undefined);
  assert.ok(office('尹默', '军祭酒'));
  assert.equal(office('胡济', '中典军').startYear, null);
  assert.equal(office('霍弋', '黄门侍郎').startYear, null);
  assert.equal(office('张裔', '留府长史').citations.length, 2);
  assert.equal(office('张裔', '留府长史').startYear, 227);
  assert.match(office('董恢', '郎中').citations[0].quote, /疑習氏之言/);
  assert.equal(office('董恢', '巴郡太守'), undefined);
  const publishedIds = new Set(relations.appointments.map(row => row.appointmentId));
  for (const row of supplement.records) assert.equal(publishedIds.has(row.id), row.status === 'verified');
  const combined = { records: [...review.records, ...json('v74-appointment-source-review').records] };
  const counts = appointmentStatusCounts(source.appointments, combined, supplement, publishedIds);
  assert.deepEqual(counts, { verified: 143, pending: 609, disputed: 2, suppressed: 48 });
  assert.deepEqual(json('v73-review-status-ledger').modules.find(row => row.key === 'appointments').counts, counts);
  const changed = structuredClone(evidence);
  changed.records.find(row => row.id === 'dong-hui').quote = '闢為丞相府屬，遷巴郡太守';
  assert.throws(() => reviewedSupplementAppointments(scope, changed, supplement), /evidence changed/);
  const changedYear = structuredClone(evidence);
  changedYear.records.find(row => row.id === 'zhang-yi-year').quote = '明年';
  assert.throws(() => reviewedSupplementAppointments(scope, changedYear, supplement), /evidence changed/);
  const changedFact = structuredClone(supplement);
  changedFact.records.find(row => row.name === '董恢' && row.status === 'disputed').status = 'verified';
  assert.throws(() => reviewedSupplementAppointments(scope, evidence, changedFact), /content changed/);
  const wronglyPublished = new Set(publishedIds).add(review.records.find(row => row.status === 'suppressed').appointmentId);
  assert.throws(() => appointmentStatusCounts(source.appointments, combined, supplement, wronglyPublished), /Suppressed/);
  const portraits = json('v73-portrait-candidates');
  assert.equal(portraits.records.length, 100);
  assert.equal(portraits.records.find(row => row.name === '李朝').priorityGroup, '刘备州府');
  assert.equal(portraits.records.find(row => row.name === '董恢').priorityGroup, '府署关系存疑');
});

test('reviewed identities extend the frozen roster without losing ids or publishing the old Wei candidate', () => {
  const base = json('v62-reader-scope');
  const identityReview = json('v71-person-identity-review');
  const identitySuppressions = json('v73-person-identity-suppressions');
  const roster = json('v63-reader-people').people;
  const additions = ['person:han:liu-wangzhi', 'person:han:wang-shang-wenbiao', 'person:jin:li-xing-junshi'];
  const expectedIds = new Set([...base.people.map(row => row.personId), ...additions]);
  expectedIds.delete('person:source:032cc177a216');
  assert.deepEqual(new Set(roster.map(row => row.personId)), expectedIds);
  assert.equal(reviewedReaderScope(base, identityReview, identitySuppressions).length, 2098);
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
  assert.equal(published.size, 143);
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
    if (!original) continue;
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
  assert.equal(json('v63-reader-people').people.filter(person => person.bio).length, 92);
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
  assert.equal(payload.summary.withInscription, 59);
  assert.equal(reader.summary.withoutInscription, 107);
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
  assert.deepEqual(review.records.filter(r => r.recordId.startsWith('wei-')).map(r => r.recordId).sort(), ['wei-daxiang-yan_kang', 'wei-henghai-lu-lang', 'wei-laozi-temple-edict', 'wei-liubiao-stele', 'wei-luoyang-north-boundary', 'wei-wangji-stele']);
  for (const r of review.records) {
    const actual = rows.find(row => row.id === r.recordId);
    assert.equal(actual.inscription, r.inscription);
    assert.equal(crypto.createHash('sha256').update(actual.inscription).digest('hex'), r.transcriptionDigest);
    assert.equal(actual.transcriptionNote, r.transcriptionNote);
    if (r.inscriptionVariants) assert.deepEqual(JSON.parse(JSON.stringify(actual.inscriptionVariants)), r.inscriptionVariants);
    const yearReview = json('v72-epigraphy-year-review');
    const expectedRefs = yearReview.records.some(row => row.recordId === r.recordId) ? [...r.transcriptionReferences, yearReview.source] : r.transcriptionReferences;
    assert.deepEqual(JSON.parse(JSON.stringify(actual.transcriptionReferences)), expectedRefs);
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

test('epigraphy dates do not coerce unknown years into the Han period', () => {
  for (const year of [null, undefined, '', ' ', false, true, [], 0, NaN, '未知']) {
    assert.equal(epigraphicYear(year), null);
    assert.equal(epigraphicEraKey({ year, polity: '魏' }), '三国');
  }
  assert.equal(epigraphicYear(' 220 '), 220);
  for (const [year, era] of [[219, '后汉'], [220, '三国'], [265, '三国'], [266, '两晋']]) {
    assert.equal(epigraphicEraKey({ year }), era);
  }
  assert.equal(epigraphicEraKey({ year: null, dynasty: '季汉', polity: '汉' }), '三国');
  assert.equal(epigraphicEraKey({ year: null, dynasty: '东晋', polity: '晋' }), '两晋');
  assert.equal(epigraphicEraKey({ year: null, polity: '汉' }), '');
  assert.equal(epigraphicEraKey({ year: null, dynasty: '后汉', polity: '汉', readerDisplayStatus: 'candidate-dynasty' }), '');
  const rows = json('v69-epigraphic-records').records;
  assert.equal(epigraphicEraKey(rows.find(row => row.id === 'wei-chengzhong-stele')), '三国');
  const ordered = [...rows].sort((a, b) => (epigraphicYear(a.year) ?? Infinity) - (epigraphicYear(b.year) ?? Infinity));
  const firstUnknown = ordered.findIndex(row => epigraphicYear(row.year) === null);
  assert.ok(firstUnknown > 0);
  assert.ok(ordered.slice(firstUnknown).every(row => epigraphicYear(row.year) === null));
});

test('the inscription filter includes transmitted and fragmentary texts without rewriting their status', () => {
  const rows = json('v69-epigraphic-records').records;
  const recorded = rows.filter(row => matchesEpigraphicInscriptionStatus(row, '已录入'));
  assert.equal(recorded.length, 59);
  assert.equal(rows.filter(row => matchesEpigraphicInscriptionStatus(row, '源文未见')).length, 107);
  for (const row of json('v71-epigraphy-transcription-review').records) {
    assert.ok(matchesEpigraphicInscriptionStatus(row, '已录入'));
    assert.ok(matchesEpigraphicInscriptionStatus(row, epigraphicInscriptionState(row)));
  }
  assert.ok(matchesEpigraphicInscriptionStatus({ inscription: '残文', inscriptionStatus: '传本录文（残缺）' }, '残缺'));
  assert.ok(matchesEpigraphicInscriptionStatus({ inscription: '待校文字', inscriptionStatus: '待校' }, '待校'));
  assert.equal(epigraphicInscriptionState({ inscription: '', inscriptionStatus: '已录入' }), '源文未见');
});

test('reviewed old commentary retains its text and rejects altered apparatus', () => {
  const c = { window: {} };
  vm.runInNewContext(read('data/epigraphic-records.js'), c);
  const r = json('v71-epigraphy-transcription-review').records.find(row => row.recordId === 'wei-laozi-temple-edict');
  const raw = JSON.parse(JSON.stringify(c.window.SGZ_EPIGRAPHIC_RECORDS.records.find(row => row.id === r.recordId)));
  const published = applyReviewedTranscription(raw, {}, r);
  assert.deepEqual(published.inscriptionVariants, r.inscriptionVariants);
  assert.ok(published.inscription.endsWith('黄初三年十月十五日　子下'));
  assert.ok(!published.inscription.includes('丙子'));
  assert.ok(published.inscriptionVariants[0].text.includes('十五日為丙子日'));
  const altered = structuredClone(r);
  altered.inscriptionVariants[0].text += '改';
  assert.throws(() => applyReviewedTranscription(raw, {}, altered), /旧注或异文校验失败/);
  assert.throws(() => applyReviewedTranscription(raw, { inscriptionVariants: [{ text: '旧注' }] }, r), /不得覆盖已有旧注或异文/);
});


test('reviewed biographies pin identities and evidence without replacing existing biographies', () => {
  const review = json('v71-person-biography-review');
  const scope = reviewedReaderScope(json('v62-reader-scope'), json('v71-person-identity-review'), json('v73-person-identity-suppressions'));
  const approved = reviewedBiographies(scope, review);
  const people = json('v63-reader-people').people;
  assert.equal(approved.length, 8);
  for (const row of approved) {
    const published = people.find(person => person.personId === row.personId);
    assert.equal(published.bio, row.bio);
    assert.deepEqual(published.bioCitations, row.citations);
  }
  const newer = reviewedBiographies(scope, json('v74-person-biography-review'));
  assert.equal(newer.length, 14);
  for (const row of newer) {
    const published = people.find(person => person.personId === row.personId);
    assert.equal(published.bio, row.bio);
    assert.deepEqual(published.bioCitations, row.citations);
  }
  const additions = new Set([...approved, ...newer].map(row => row.personId));
  const originals = people.filter(person => person.bio && !additions.has(person.personId))
    .map(({ personId, bio }) => ({ personId, bio }));
  assert.equal(originals.length, 70);
  assert.equal(sourceDigest(originals), review.baselineBiographyDigest);
  const altered = structuredClone(review);
  altered.records[0].bio += '无据新增。';
  assert.throws(() => reviewedBiographies(scope, altered), /content changed/);
  altered.records[0] = { ...review.records[0], name: '刘表' };
  assert.throws(() => reviewedBiographies(scope, altered), /identity changed/);
  altered.records[0] = { ...review.records[0], citations: [] };
  assert.throws(() => reviewedBiographies(scope, altered), /Incomplete/);
  assert.throws(() => reviewedBiographies(scope, review, new Map([[approved[0].personId, true]])), /overwrite/);
});


test('Tai Shi corrections preserve source years and reject stale or ambiguous reviews', () => {
  const c = { window: {} };
  vm.runInNewContext(read('data/epigraphic-v46-jin.js'), c);
  const raw = c.window.SGZ_EPIGRAPHIC_V46_JIN.records;
  const review = json('v72-epigraphy-year-review');
  const corrected = reviewedEpigraphicYears(raw, review);
  const published = {window:{}};
  vm.runInNewContext(read('exports/观史台-读者版/data/v69-epigraphic-records.js'), published);
  for (const row of review.records) {
    const actual = published.window.SGZ_V69_EPIGRAPHIC_RECORDS.records.find(r => r.id === row.recordId);
    assert.equal(actual.year, row.year);
    assert.equal(actual.yearText, row.yearText);
  }
  assert.equal(corrected.size, 7);
  for (const [text, year] of [['泰始元年',265],['泰始六年',270],['泰始九年',273],['泰始十年',274]]) {
    assert.equal(taishiChronologicalYear(text), year);
  }
  for (const text of ['', '泰始十一年', '泰始元年十二月', '太始元年', '咸宁元年']) assert.equal(taishiChronologicalYear(text), null);
  const altered = structuredClone(review);
  altered.records[0].year += 1;
  assert.throws(() => reviewedEpigraphicYears(raw, altered), /换算不符/);
  altered.records[0] = {...review.records[0], sourceDigest: 'changed'};
  assert.throws(() => reviewedEpigraphicYears(raw, altered), /须重新审校/);
  const rows = json('v69-epigraphic-records').records;
  for (const row of review.records) {
    const actual = rows.find(r => r.id === row.recordId);
    assert.equal(actual.year, row.year);
    assert.equal(actual.yearText, row.yearText);
    assert.equal(raw.find(r => r.id === row.recordId).year, row.previousYear);
    assert.deepEqual(actual.transcriptionReferences.at(-1), review.source);
  }
  const unchanged = rows.filter(r => !corrected.has(r.id)).map(r => [r.id,r.year ?? null,r.yearText || '']).sort((a,b) => a[0].localeCompare(b[0]));
  assert.equal(sourceDigest(unchanged), '6210bbcf3a6feca66394a04b5bc20867383f642c4637b16ce66bc045d6885b0c');
});

test('the next Jin texts preserve all 56 existing texts and keep the Yang Zhao variant separate', () => {
  const additions = ['jinshi-v55-1dea8afedc3a27b9','jinshi-v55-2d74fd631f41de58','jinshi-v55-bad19cd9f016b00a'];
  const rows = json('v69-epigraphic-records').records;
  const originals = rows.filter(r => r.inscription && !additions.includes(r.id))
    .map(r => [r.id,r.inscription,r.transcriptionSections || [],r.inscriptionVariants || [],r.transcriptionNote || '']).sort((a,b) => a[0].localeCompare(b[0]));
  assert.equal(originals.length, 56);
  assert.equal(sourceDigest(originals), 'a4af410799a43b856606693756ff5b586e2c39240e6809311c71405cd0e33fbd');
  const yang = rows.find(r => r.id === additions[1]);
  assert.ok(yang.inscription.startsWith('肇字秀初'));
  assert.ok(yang.inscriptionVariants[0].text.startsWith('肇宇季初'));
  assert.ok(yang.inscription.includes('又略见《怀旧赋》注。'));
});
