import test from 'node:test';
import assert from 'node:assert/strict';
import {loadResearchForTests} from './helpers/research-loader.mjs';

const {modules: c, cleanup} = await loadResearchForTests();
test.after(cleanup);
const clone = value => JSON.parse(JSON.stringify(value));
const exact = year => ({...c.unknownTime('原紀年'), earliestYear: year, latestYear: year, precision: 'year', certainty: 'explicit'});
const range = (start, end) => ({...exact(start), earliestYear: start, latestYear: end, precision: 'range'});
const header = id => ({id, assessment: 'pending', workflow: 'draft', visibility: 'reader', disposition: 'none', reason: '', evidence: []});
async function rev(data, number = 1, commit = 1) {
  return {id: data.id, number, commit, data: clone(data), digest: await c.sha256(c.canonicalJson(data)), actor: 'fixture-owner', at: '2026-09-19T00:00:00Z', reason: 'synthetic test fixture'};
}
async function fixture() {
  const person = await rev({...header('person:test:a'), kind: 'person', name: '測試人物', aliases: [], aliasPublication: 'private', legacyIds: []});
  const source = await rev({...header('source:test:a'), kind: 'source', title: '測試底本', edition: '甲本', locator: '測試卷頁', text: '原文\n  原注　𬱟\n異體', textScope: 'excerpt', url: 'https://example.org/fixture'}, 1, 2);
  const row = await rev({...header('appointment:test:a'), kind: 'appointment', personId: person.id, officeId: null, officeName: '測試官', nature: '實任', polity: '測試政權', jurisdiction: '測試地', date: {original: '年代原文', startYear: 199, endYear: 201, precision: 'range', certainty: 'certain', basis: ''}, duplicateOf: null, assessment: 'verified', reason: '測試依據', evidence: [{sourceId: source.id, sourceRevision: 1, role: 'support', note: '原引文'}]}, 1, 3);
  const tenure = {id: row.id, personId: person.id, officeId: null, officeVersion: null, officeNameOriginal: '測試官', polityOriginal: '測試政權', natureOriginal: '實任', jurisdictionOriginal: '測試地', legacyOrigin: c.researchPin(row), assessment: 'verified', workflow: 'ready', visibility: 'private', disposition: 'none', reason: '测试理由', selected: {holding: 'claim:holding', start: 'claim:start', end: 'claim:end', continuity: 'claim:continuity', attestations: [], rationale: '逐項採擇'}};
  const claim = (type, value, claimId = 'claim:' + type) => ({id: claimId, subject: {kind: 'tenure', id: row.id}, content: {type, value}, derivation: 'direct', assessment: 'verified', rationale: '測試說法依據'});
  const graph = {model: 1, personId: person.id, tenures: [tenure], events: [], claims: [claim('holding', 'held'), claim('start', exact(199)), claim('end', exact(201)), claim('continuity', 'continuous')], evidence: [], factualConflicts: [], textualVariants: []};
  const addEvidence = target => graph.evidence.push({id: 'evidence:' + target.id, claimId: target.id, source: c.researchPin(source), role: 'support', note: ''});
  graph.claims.forEach(addEvidence);
  const add = (type, value, id) => {const created = claim(type, value, id); graph.claims.push(created); addEvidence(created); return created;};
  const sources = new Map([[source.id + '@1', source]]), rows = [person, row, source];
  const calls = [];
  const repo = {
    watermark: async () => {calls.push(['watermark']); return 3;},
    snapshot: async seq => {calls.push(['snapshot', seq]); return c.fixedSnapshot(rows, seq);},
    getRevision: async (id, version) => {calls.push(['revision', id, version]); return sources.get(id + '@' + version) ?? null;},
  };
  return {person, source, row, tenure, graph, sources, rows, calls, repo, add};
}
const presence = async (f, year = 200) => (await c.researchPresence(f.graph, f.sources, 3, year)).results[0];

test('unknown time preserves original words and null endpoints', () => {
  const t = c.unknownTime('建安中'); c.validateTime(t);
  assert.equal(t.original, '建安中'); assert.equal(t.earliestYear, null);
});
test('BCE years are supported with no invented year zero', () => {
  c.validateTime(exact(-1)); assert.equal(c.historicalYear(-1), true); assert.equal(c.historicalYear(0), false);
});
test('one-sided chronological bounds remain ranges, not complete tenures', () => {
  c.validateTime({...range(199, 201), latestYear: null});
  c.validateTime({...range(199, 201), earliestYear: null});
});
for (const [label, value] of [
  ['zero', exact(0)], ['fraction', exact(199.5)], ['out of range', exact(5001)],
  ['reversed', range(201, 199)], ['year with unequal endpoints', {...range(199, 201), precision: 'year'}],
  ['unknown with numbers', {...exact(199), precision: 'unknown'}], ['known with unknown certainty', {...exact(199), certainty: 'unknown'}],
  ['inferred without basis', {...exact(199), certainty: 'inferred'}], ['missing era field', {...exact(199), era: undefined}],
  ['invalid precision', {...exact(199), precision: 'month'}], ['null time', null],
]) test('invalid historical time rejected: ' + label, () => assert.throws(() => c.validateTime(value), e => e.code === 'time'));

test('continuous tenure requires separate holding, bounds and continuity evidence', async () => {
  const f = await fixture(); assert.equal((await presence(f)).status, 'continuous');
  f.tenure.selected.continuity = null;
  assert.equal((await presence(f)).status, 'possible'); assert.equal((await presence(f)).definite, false);
});
test('known start with unknown end never extends indefinitely', async () => {
  const f = await fixture(); f.tenure.selected.end = null;
  assert.equal((await presence(f, 250)).status, 'unknown');
});
test('attestation supports only the evidenced year, not surrounding years', async () => {
  const f = await fixture(); f.tenure.selected.start = null; f.tenure.selected.end = null; f.tenure.selected.continuity = null;
  f.tenure.selected.attestations = [f.add('attestation', exact(200)).id];
  assert.equal((await presence(f, 200)).status, 'attested'); assert.equal((await presence(f, 201)).status, 'unknown');
});
test('uncertain endpoint ranges yield only the common definite interval', async () => {
  const f = await fixture(); f.graph.claims[1].content.value = range(198, 200); f.graph.claims[2].content.value = range(202, 204);
  assert.equal((await presence(f, 199)).status, 'possible'); assert.equal((await presence(f, 200)).status, 'continuous');
  assert.equal((await presence(f, 203)).status, 'possible'); assert.equal((await presence(f, 205)).status, 'outside');
});
test('inferred dates cannot establish definite occupancy', async () => {
  const f = await fixture(); f.graph.claims[1].content.value = {...exact(199), certainty: 'inferred', basis: '研究推測'};
  assert.equal((await presence(f)).definite, false);
});
for (const status of ['pending', 'disputed']) test(status + ' holding stays research-visible but not definite', async () => {
  const f = await fixture(); f.graph.claims[0].assessment = status;
  assert.equal((await presence(f)).status, 'possible');
});
test('workflow ready does not upgrade pending research assessment', async () => {
  const f = await fixture(); f.tenure.assessment = 'pending'; assert.equal((await presence(f)).definite, false);
});
test('excluded records remain in research results and are not counted', async () => {
  const f = await fixture(); f.tenure.assessment = 'excluded'; f.tenure.disposition = 'incorrect'; f.tenure.reason = '錯誤';
  assert.equal((await presence(f)).status, 'excluded');
});
for (const holding of ['not-held', 'posthumous']) test(holding + ' is not actual tenure', async () => {
  const f = await fixture(); f.graph.claims[0].content.value = holding;
  f.tenure.selected = {...f.tenure.selected, start: null, end: null, continuity: null};
  assert.equal((await presence(f)).status, 'not-held');
});
test('not-held with an actual tenure selection is rejected, not silently published', async () => {
  const f = await fixture(); f.graph.claims[0].content.value = 'not-held';
  assert.throws(() => c.validateResearchGraph(f.graph), e => e.code === 'not-held');
});
test('impossible adopted endpoints must become alternatives', async () => {
  const f = await fixture(); f.graph.claims[1].content.value = exact(202);
  assert.throws(() => c.validateResearchGraph(f.graph), e => e.code === 'tenure-order');
});
test('counter-evidence blocks a definite claim without deleting either source', async () => {
  const f = await fixture(); f.graph.evidence.push({...f.graph.evidence[1], id: 'evidence:counter', role: 'counter'});
  assert.equal((await presence(f)).definite, false);
});
test('competing factual claims are preserved and not averaged into one date', async () => {
  const f = await fixture(); const alt = f.add('start', exact(200), 'claim:start:alternative');
  f.graph.factualConflicts.push({id: 'conflict:start', claimIds: ['claim:start', alt.id], note: '兩說並存'});
  assert.equal((await presence(f)).definite, false); assert.equal(f.graph.claims[1].content.value.earliestYear, 199);
});
test('source marked excluded cannot establish a definite claim', async () => {
  const f = await fixture(); f.source.data.assessment = 'excluded'; f.source.data.disposition = 'incorrect'; f.source.data.reason = '錯誤來源';
  f.source.digest = await c.sha256(c.canonicalJson(f.source.data)); f.graph.evidence.forEach(e => e.source = c.researchPin(f.source));
  assert.equal((await presence(f)).definite, false);
});
test('capture and surrender events do not fabricate a death or an end date', async () => {
  const f = await fixture(); f.tenure.selected.end = null;
  f.graph.events.push({id: 'event:capture', personId: f.person.id, type: 'capture', original: '被俘', tenureIds: [f.row.id], dateClaimId: null, afterEventIds: []});
  assert.equal((await presence(f, 210)).status, 'unknown'); assert.equal(f.graph.events[0].type, 'capture');
});
test('event date cannot be used as the tenure start without an independent claim', async () => {
  const f = await fixture(); f.graph.claims[1].content.type = 'event-date';
  assert.throws(() => c.validateResearchGraph(f.graph), e => ['selection', 'claim'].includes(e.code));
});
test('relative chronology allows unknown dates but rejects cycles', async () => {
  const f = await fixture(); const event = id => ({id, personId: f.person.id, type: 'appointment', original: '', tenureIds: [f.row.id], dateClaimId: null, afterEventIds: []});
  const a = event('event:a'), b = event('event:b'); b.afterEventIds = [a.id]; f.graph.events = [a, b];
  c.validateResearchGraph(f.graph); a.afterEventIds = [b.id];
  assert.throws(() => c.validateResearchGraph(f.graph), e => e.code === 'event-cycle');
});
test('one event can refer to multiple concurrent tenures without merging their IDs', async () => {
  const f = await fixture(); const second = clone(f.tenure); second.id = 'appointment:test:b'; second.legacyOrigin = null;
  second.selected = {holding: null, start: null, end: null, continuity: null, attestations: [], rationale: ''}; f.graph.tenures.push(second);
  f.graph.events.push({id: 'event:concurrent', personId: f.person.id, type: 'appointment', original: '任甲官、領乙官', tenureIds: [f.tenure.id, second.id], dateClaimId: null, afterEventIds: []});
  c.validateResearchGraph(f.graph); assert.equal((await c.researchPresence(f.graph, f.sources, 3, 200)).results.length, 2);
});
test('duplicate stable IDs and missing foreign keys fail', async () => {
  const f = await fixture(); f.graph.claims.push(clone(f.graph.claims[0]));
  assert.throws(() => c.validateResearchGraph(f.graph), e => e.code === 'identity');
  f.graph.claims.pop(); f.graph.evidence[0].claimId = 'absent';
  assert.throws(() => c.validateResearchGraph(f.graph));
});
test('adoption cannot point to another tenure or question', async () => {
  const f = await fixture(); f.tenure.selected.start = 'claim:end';
  assert.throws(() => c.validateResearchGraph(f.graph), e => e.code === 'selection');
});
test('the same source can support several claims but not duplicate the same link', async () => {
  const f = await fixture(); c.validateResearchGraph(f.graph);
  f.graph.evidence.push({...f.graph.evidence[0], id: 'evidence:duplicate'});
  assert.throws(() => c.validateResearchGraph(f.graph), e => e.code === 'duplicate-evidence');
});
test('raw text and whitespace are verified byte-for-byte through the source digest', async () => {
  const f = await fixture(); await presence(f); f.source.data.text = f.source.data.text.replace('  ', ' ');
  await assert.rejects(() => presence(f), e => e.code === 'source-integrity');
});
test('missing pinned source never falls back to a newer source version', async () => {
  const f = await fixture(); f.sources.delete(f.source.id + '@1');
  f.sources.set(f.source.id + '@2', await rev(f.source.data, 2, 3));
  await assert.rejects(() => presence(f), e => e.code === 'source-reference');
});
test('future sources are excluded by the captured catalogue watermark', async () => {
  const f = await fixture(); f.source.commit = 4;
  await assert.rejects(() => presence(f), e => e.code === 'source-reference');
});
test('the same revision cannot carry contradictory digests', async () => {
  const f = await fixture(); f.graph.evidence[1].source = {...f.graph.evidence[1].source, digest: '0'.repeat(64)};
  await assert.rejects(() => presence(f), e => e.code === 'source-integrity');
});
test('textual variants keep the exact reading in each fixed witness', async () => {
  const f = await fixture(); const other = await rev({...f.source.data, edition: '乙本', text: '原文\n  原注　異字'}, 2, 3); f.sources.set(other.id + '@2', other);
  f.graph.textualVariants.push({id: 'variant:a', locus: '測試卷頁', readings: [{source: c.researchPin(f.source), text: '原注　𬱟'}, {source: c.researchPin(other), text: '原注　異字'}], note: '異文'});
  await c.verifyResearchGraph(f.graph, f.sources, 3);
  f.graph.textualVariants[0].readings[0].text = '原注 𬱟';
  await assert.rejects(() => c.verifyResearchGraph(f.graph, f.sources, 3), e => e.code === 'variant-text');
});
test('a textual variant requires different pinned witnesses', async () => {
  const f = await fixture(); f.graph.textualVariants.push({id: 'variant:a', locus: '卷頁', readings: [{source: c.researchPin(f.source), text: '原文'}, {source: c.researchPin(f.source), text: '原注'}], note: ''});
  assert.throws(() => c.validateResearchGraph(f.graph), e => e.code === 'variant');
});
test('legacy preview preserves IDs and raw dates without inventing events or tenure', async () => {
  const f = await fixture(); const before = clone(f.rows);
  const p = await c.previewPersonResearch(f.repo, f.person.id);
  assert.equal(p.readOnly, true); assert.equal(p.graph.tenures[0].id, f.row.id); assert.equal(p.graph.tenures[0].selected.start, null);
  assert.equal(p.graph.events.length, 0); assert.deepEqual(p.graph.claims[0].content.value.date, f.row.data.date);
  assert.deepEqual(f.rows, before); assert.equal(p.warnings[0].code, 'legacy-time-uninterpreted');
  assert.equal((await c.researchPresence(p.graph, f.sources, 3, 200)).results[0].status, 'unknown');
});
test('preview includes exact source text and actual old source revision', async () => {
  const f = await fixture(); f.sources.set(f.source.id + '@2', await rev({...f.source.data, text: '後改原文'}, 2, 3));
  const p = await c.previewPersonResearch(f.repo, f.person.id);
  assert.equal(p.sourceRevisions[0].pin.revision, 1); assert.equal(p.sourceRevisions[0].data.text, f.source.data.text);
  assert.deepEqual(f.calls.filter(c => c[0] === 'revision'), [['revision', f.source.id, 1]]);
});
test('later record edits do not alter an earlier preview manifest', async () => {
  const f = await fixture(); const a = await c.legacyResearchPreview(f.rows, f.sources, 3, f.person.id);
  f.rows.push(await rev({...f.row.data, officeName: '後改官名'}, 2, 4));
  const b = await c.legacyResearchPreview(f.rows, f.sources, 3, f.person.id);
  assert.equal(a.digest, b.digest);
});
test('different data at a new watermark changes the manifest', async () => {
  const f = await fixture(); const a = await c.legacyResearchPreview(f.rows, f.sources, 3, f.person.id);
  f.rows.push(await rev({...f.row.data, officeName: '後改官名'}, 2, 4));
  const b = await c.legacyResearchPreview(f.rows, f.sources, 4, f.person.id);
  assert.notEqual(a.digest, b.digest);
});
test('corrupt origin payload cannot produce a preview', async () => {
  const f = await fixture(); f.row.data.officeName = '篡改';
  await assert.rejects(() => c.previewPersonResearch(f.repo, f.person.id), e => e.code === 'origin-integrity');
});
test('same-name people do not share career records', async () => {
  const f = await fixture(); const other = await rev({...f.person.data, id: 'person:test:b'}, 1, 3); f.rows.push(other);
  const p = await c.previewPersonResearch(f.repo, other.id); assert.equal(p.graph.tenures.length, 0);
});
test('legacy variant flags are not automatically reclassified as textual variants', async () => {
  const f = await fixture(); f.row.data.evidence[0].role = 'variant'; f.row.data.assessment = 'disputed'; f.row.digest = await c.sha256(c.canonicalJson(f.row.data));
  const p = await c.previewPersonResearch(f.repo, f.person.id);
  assert.equal(p.graph.textualVariants.length, 0); assert.equal(p.graph.evidence[0].role, 'unclassified-variant');
});
test('a known duplicate remains auditable and excluded, not a second real tenure', async () => {
  const f = await fixture(); f.rows.push(await rev({...f.row.data, id: 'appointment:test:duplicate', assessment: 'excluded', disposition: 'duplicate', duplicateOf: f.row.id}, 1, 3));
  const p = await c.previewPersonResearch(f.repo, f.person.id);
  assert.equal(p.graph.tenures.length, 2); assert.ok(p.warnings.some(w => w.code === 'legacy-duplicate-preserved'));
  assert.equal((await c.researchPresence(p.graph, f.sources, 3, 200)).results.filter(r => r.status === 'excluded').length, 1);
});
test('person-level evidence is pinned even before identity claims are split', async () => {
  const f = await fixture(); f.person.data.evidence = [{sourceId: f.source.id, sourceRevision: 1, role: 'support', note: '姓名'}]; f.person.digest = await c.sha256(c.canonicalJson(f.person.data));
  const p = await c.previewPersonResearch(f.repo, f.person.id); assert.equal(p.manifest.sources.length, 1);
});
test('inspection is read-only and checks origins before producing presence results', async () => {
  const f = await fixture(); const r = await c.inspectPersonResearch(f.repo, {graph: f.graph, watermark: 3, year: 200});
  assert.equal(r.persisted, false); assert.equal(r.presence.results[0].status, 'continuous');
  f.tenure.legacyOrigin.digest = '0'.repeat(64);
  await assert.rejects(() => c.inspectPersonResearch(f.repo, {graph: f.graph}), e => e.code === 'origin-reference');
});
test('request captures the watermark once before loading sources', async () => {
  const f = await fixture(); await c.previewPersonResearch(f.repo, f.person.id);
  assert.equal(f.calls.filter(c => c[0] === 'watermark').length, 1); assert.deepEqual(f.calls[1], ['snapshot', 3]);
});
for (const raw of ['', '-1', '1.5', '03', 'Infinity', '9007199254740992']) test('watermark parser rejects ' + JSON.stringify(raw), () => assert.throws(() => c.parseResearchWatermark(raw), e => e.code === 'watermark'));
test('zero watermark is explicit, not a request for latest', () => {assert.equal(c.parseResearchWatermark('0'), 0); assert.equal(c.parseResearchWatermark(null), undefined);});
test('future requested watermarks are rejected', async () => {
  const f = await fixture(); await assert.rejects(() => c.previewPersonResearch(f.repo, f.person.id, 4), e => e.code === 'watermark');
});
test('source fan-out limit fails before reading hundreds of individual revisions', async () => {
  const f = await fixture(); const p = clone(f.person); p.data.evidence = Array.from({length: 201}, (_, i) => ({sourceId: 'source:' + i, sourceRevision: 1, role: 'support', note: ''})); f.rows[0] = p;
  await assert.rejects(() => c.previewPersonResearch(f.repo, f.person.id), e => e.code === 'source-limit');
  assert.equal(f.calls.filter(c => c[0] === 'revision').length, 0);
});

const request = (path, {actor = 'owner', method = 'GET', payload, headers = {}} = {}) => new Request('https://fixture.example' + path, {method, headers: {...(actor ? {'oai-authenticated-user-id': actor} : {}), ...(method === 'POST' ? {'origin': 'https://fixture.example', 'x-catalogue-request': '1', 'content-type': 'application/json'} : {}), ...headers}, ...(payload === undefined ? {} : {body: typeof payload === 'string' ? payload : JSON.stringify(payload)})});
const environment = f => ({ADMIN_OWNER_ID: 'owner', DB: {repo: f.repo, prepare: () => {throw new Error('Unexpected SQL/write in fixture');}}, BUCKET: {get: () => {throw new Error('Unexpected R2 access');}}});
for (const [actor, status] of [[null, 401], ['other', 403]]) test('research HTTP route rejects unauthorized actor before any data read: ' + actor, async () => {
  const f = await fixture(); const response = await c.catalogueRouter(request('/api/admin/research/people/' + f.person.id, {actor}), environment(f));
  assert.equal(response.status, status); assert.equal(f.calls.length, 0);
});
test('owner can fetch the actual research preview route with no-store headers', async () => {
  const f = await fixture(); const response = await c.catalogueRouter(request('/api/admin/research/people/' + f.person.id), environment(f));
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal((await response.json()).readOnly, true);
});
test('cross-origin inspect is blocked before repository reads', async () => {
  const f = await fixture(); const response = await c.catalogueRouter(request('/api/admin/research/inspect', {method: 'POST', payload: {graph: f.graph}, headers: {origin: 'https://other.example'}}), environment(f));
  assert.equal(response.status, 403); assert.equal(f.calls.length, 0);
});
test('same-origin inspect uses validation, not save or publish routes', async () => {
  const f = await fixture(); const response = await c.catalogueRouter(request('/api/admin/research/inspect', {method: 'POST', payload: {graph: f.graph, year: 200}}), environment(f));
  assert.equal(response.status, 200); assert.equal((await response.json()).persisted, false);
});
test('malformed JSON is a client error, not an internal failure', async () => {
  const f = await fixture(); const response = await c.catalogueRouter(request('/api/admin/research/inspect', {method: 'POST', payload: '{bad'}), environment(f));
  assert.equal(response.status, 400);
});
test('invalid research structure produces 422 without changing data', async () => {
  const f = await fixture(); const response = await c.catalogueRouter(request('/api/admin/research/inspect', {method: 'POST', payload: {graph: {model: 99}}}), environment(f));
  assert.equal(response.status, 422); assert.equal(f.calls.length, 0);
});
test('research has no anonymous public route', async () => {
  const f = await fixture(); const response = await c.catalogueRouter(request('/api/research/people/' + f.person.id, {actor: null}), environment(f));
  assert.equal(response, null); assert.equal(f.calls.length, 0);
});
test('malformed encoded IDs are rejected by the real router', async () => {
  const f = await fixture(); const response = await c.catalogueRouter(request('/api/admin/research/people/%ZZ'), environment(f));
  assert.equal(response.status, 400); assert.equal(f.calls.length, 0);
});

test('an adopted attestation cannot fall outside the adopted tenure bounds', async () => {
  const f = await fixture(); f.tenure.selected.attestations = [f.add('attestation', exact(198)).id];
  assert.throws(() => c.validateResearchGraph(f.graph), e => e.code === 'tenure-order');
  f.graph.claims.at(-1).content.value = exact(202);
  assert.throws(() => c.validateResearchGraph(f.graph), e => e.code === 'tenure-order');
});
test('all source revisions are detached before asynchronous digest verification', async () => {
  const f = await fixture();
  const other = await rev({...f.source.data, id: 'source:test:b'}, 1, 3);
  f.sources.set(other.id + '@1', other); f.graph.evidence[1].source = c.researchPin(other);
  const verifying = c.verifyResearchGraph(f.graph, f.sources, 3);
  other.data.text = 'changed while the earlier digest was in flight';
  const checked = await verifying; assert.equal(checked.trusted(checked.graph.claims[1]), true);
});
test('caller edits cannot change graph selections during verification', async () => {
  const f = await fixture(); const verifying = c.researchPresence(f.graph, f.sources, 3, 200);
  f.tenure.selected.continuity = null;
  assert.equal((await verifying).results[0].status, 'continuous');
});
test('presence queries reject zero, fractional and nonnumeric years', async () => {
  const f = await fixture();
  for (const year of [0, 199.5, '200', NaN]) await assert.rejects(() => c.researchPresence(f.graph, f.sources, 3, year), e => e.code === 'year');
});
