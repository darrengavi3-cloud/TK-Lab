import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadProsopography, loadCatalogueRouter} from './helpers/prosopography-loader.mjs';

const loaded = await loadProsopography();
const c = loaded.api;
test.after(loaded.cleanup);
const clone = x => structuredClone(x);
const pin = {id: 'source:test:a', revision: 1, digest: 'a'.repeat(64)};
const common = id => ({id, assessment: 'pending', workflow: 'draft', visibility: 'private', disposition: 'none', reason: '', evidence: []});
const person = (id = 'person:test:a', name = '同名') => ({...common(id), kind: 'person', name, aliases: ['異名'], aliasPublication: 'private', legacyIds: []});
const source = (text = '原文\n　原注𬱟\t不行。', id = pin.id) => ({...common(id), kind: 'source', title: '測試底本（非史實資料）', edition: '甲本', locator: '卷一第2行', text, textScope: 'excerpt', url: ''});
const oldDate = {original: '某年間', startYear: 200, endYear: 205, precision: 'range', certainty: 'certain', basis: '測試'};
const appointment = (id = 'appointment:test:a', personId = 'person:test:a') => ({...common(id), kind: 'appointment', personId, officeId: null, officeName: '測試官', nature: '授官', polity: '季漢', jurisdiction: '測試郡', date: clone(oldDate), duplicateOf: null, evidence: [{sourceId: pin.id, sourceRevision: 1, role: 'support', note: ''}]});
async function revision(data, commit = 1, previous = null) {
  return c.prepareRevision(previous, {baseRevision: previous?.number || 0, data, reviewedContentDigest: await c.sha256(c.canonicalJson(data))}, {commit, actor: 'fixture-owner', at: '2026-09-19T00:00:00Z', reason: '測試用修訂，非史料考證'});
}
const exact = year => ({...c.unknownTime('原始紀年'), earliestYear: year, latestYear: year, precision: 'year', certainty: 'explicit'});
const range = (first, last) => ({...exact(first), earliestYear: first, latestYear: last, precision: 'range'});
const tenure = (id = 'tenure:test:a') => ({id, personId: 'person:test:a', officeId: null, officeNameOriginal: '測試官', polityOriginal: '季漢', natureOriginal: '實任', jurisdictionOriginal: '測試郡', assessment: 'verified', workflow: 'draft', visibility: 'private', disposition: 'none', reason: '測試核定', legacyOrigin: null, selected: {holding: null, start: null, end: null, continuity: null, attestations: [], rationale: '測試採擇'}});
function graph(sourcePin = pin) {
  const g = {model: 1, personId: 'person:test:a', tenures: [tenure()], events: [], claims: [], evidence: [], factualConflicts: [], textualVariants: []};
  addClaim(g, 'holding', 'held', {sourcePin});
  return g;
}
function addClaim(g, type, value, options = {}) {
  const t = options.tenure || g.tenures[0];
  const id = options.id || `claim:test:${type}:${g.claims.length}`;
  const claim = {id, subject: {kind: options.event ? 'event' : 'tenure', id: options.event?.id || t.id}, content: {type, value}, derivation: 'direct', assessment: 'verified', rationale: '測試逐項核定', origin: null, ...options.patch};
  g.claims.push(claim);
  g.evidence.push({id: `evidence:test:${g.evidence.length}`, claimId: id, source: clone(options.sourcePin || pin), role: 'support', note: ''});
  if (options.select !== false) {
    if (options.event) options.event.dateClaimId = id;
    else if (type === 'attestation') t.selected.attestations.push(id);
    else t.selected[type] = id;
  }
  return claim;
}
const event = (id = 'event:test:a', type = 'appointment') => ({id, personId: 'person:test:a', type, original: '測試原文', tenureIds: ['tenure:test:a'], dateClaimId: null, afterEventIds: []});
async function fixture() {
  const p = await revision(person(), 1);
  const s1 = await revision(source(), 2);
  const a = await revision(appointment(), 3);
  const s2 = await revision({...source('後修訂正文，原注不再相同。'), edition: '乙次修訂'}, 4, s1);
  return {p, s1, s2, a, history: [p, s1, a, s2]};
}
function store(history) {
  return {watermark: async () => Math.max(0, ...history.map(r => r.commit)), snapshot: async w => c.fixedSnapshot(history, w), revision: async (id, version) => history.find(r => r.id === id && r.number === version) || null};
}
const rejectsCode = code => e => e.code === `prosopography-${code}`;

// New dates are uncertainty bounds for a single temporal claim, not tenure spans.
test('unknown chronology uses null without silently replacing the original text', () => {
  const x = c.unknownTime('景耀某年，原字𬱟'); c.validateTime(x);
  assert.equal(x.original, '景耀某年，原字𬱟'); assert.equal(x.earliestYear, null);
});
test('historical numbering accepts BCE and CE but never a year zero', () => {
  c.validateTime(exact(-1)); c.validateTime(exact(1));
  for (const year of [0, 0.5, Infinity, NaN, 5001, -5001, '200']) assert.equal(c.historicalYear(year), false);
  assert.throws(() => c.validateTime(exact(0)), rejectsCode('time'));
});
test('a singleton year and an uncertain range are structurally distinct', () => {
  c.validateTime(range(200, 205)); c.validateTime(range(null, 205));
  assert.throws(() => c.validateTime({...range(200, 205), precision: 'year'}), rejectsCode('time'));
  assert.throws(() => c.validateTime(range(205, 200)), rejectsCode('time'));
});
test('unknown labels cannot hide numeric endpoints and inferred dates need a basis', () => {
  assert.throws(() => c.validateTime({...exact(200), certainty: 'unknown'}), rejectsCode('time'));
  assert.throws(() => c.validateTime({...c.unknownTime(), precision: 'range'}), rejectsCode('time'));
  assert.throws(() => c.validateTime({...exact(200), certainty: 'inferred'}), rejectsCode('time'));
  c.validateTime({...exact(200), certainty: 'inferred', basis: '測試推算依據'});
});
test('partial or malformed temporal claims are rejected without year coercion', () => {
  for (const x of [null, [], {}, {...exact(200), earliestYear: '200'}, {...exact(200), era: 3}]) assert.throws(() => c.validateTime(x));
});

test('a holding claim alone cannot establish any specific year', () => {
  assert.equal(c.presenceInYear(graph(), 'tenure:test:a', 200).status, 'unknown');
});
test('an event occurring somewhere in a range does not establish continuous holding', () => {
  const g = graph(); const e = event(); g.events.push(e); addClaim(g, 'event-date', range(200, 205), {event: e});
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 203).status, 'unknown');
  assert.equal(g.tenures[0].selected.start, null);
});
test('explicit single-year attestation means some time in that year, not the full year', () => {
  const g = graph(); addClaim(g, 'attestation', exact(200));
  const r = c.presenceInYear(g, g.tenures[0].id, 200);
  assert.equal(r.status, 'attested'); assert.equal(r.definite, true); assert.match(r.reason, /不表示整年/);
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 201).status, 'unknown');
});
test('an attestation range supports possibility, not definite presence in each year', () => {
  const g = graph(); addClaim(g, 'attestation', range(200, 205));
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 203).status, 'possible');
});
test('start and end dates alone cannot establish uninterrupted tenure', () => {
  const g = graph(); addClaim(g, 'start', exact(200)); addClaim(g, 'end', exact(205));
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 203).status, 'possible');
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 200).status, 'attested');
});
test('independently evidenced continuity uses latest start and earliest end bounds', () => {
  const g = graph(); addClaim(g, 'start', range(200, 202)); addClaim(g, 'end', range(205, 207)); addClaim(g, 'continuity', 'continuous');
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 203).status, 'continuous');
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 201).status, 'possible');
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 206).status, 'possible');
});
test('definite bounds can exclude an outside year without extending an unknown end', () => {
  const g = graph(); addClaim(g, 'start', exact(200));
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 199).status, 'outside');
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 260).status, 'unknown');
  addClaim(g, 'end', exact(205));
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 206).status, 'outside');
});
test('inferred dates never inherit explicit-year certainty', () => {
  const g = graph(); addClaim(g, 'attestation', {...exact(200), certainty: 'inferred', basis: '年齡倒推'});
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 200).status, 'possible');
});
test('pending, disputed and inferred claims do not become definite through selection', () => {
  for (const patch of [{assessment: 'pending'}, {assessment: 'disputed'}, {derivation: 'inferred'}]) {
    const g = graph(); addClaim(g, 'attestation', exact(200), {patch});
    assert.equal(c.presenceInYear(g, g.tenures[0].id, 200).definite, false);
  }
});
test('workflow readiness and reader visibility are not factual verification', () => {
  const g = graph(); addClaim(g, 'attestation', exact(200)); Object.assign(g.tenures[0], {assessment: 'pending', workflow: 'ready', visibility: 'reader'});
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 200).definite, false);
});
test('verified not-held and posthumous grants remain genuine experiences but not tenure', () => {
  for (const holding of ['not-held', 'posthumous']) {
    const g = graph(); g.claims[0].content.value = holding; addClaim(g, 'attestation', exact(200));
    assert.equal(c.presenceInYear(g, g.tenures[0].id, 200).status, 'not-held');
    assert.equal(g.tenures[0].assessment, 'verified'); assert.equal(g.tenures[0].disposition, 'none');
  }
});
test('explicitly excluded records stay inspectable but cannot enter presence results', () => {
  const g = graph(); Object.assign(g.tenures[0], {assessment: 'excluded', disposition: 'incorrect', reason: '測試排除'});
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 200).status, 'excluded'); assert.equal(g.tenures.length, 1);
});
test('incompatible adopted endpoints are retained as a warning, not a invented interval', () => {
  const g = graph(); addClaim(g, 'start', exact(205)); addClaim(g, 'end', exact(200));
  c.validateGraph(g); assert.equal(c.presenceInYear(g, g.tenures[0].id, 203).status, 'unknown');
  assert.ok(c.graphWarnings(g).some(w => w.code === 'inconsistent-tenure'));
});
test('an explicit unresolved factual conflict prevents a selected date becoming definite', () => {
  const g = graph(); const a = addClaim(g, 'attestation', exact(200)); const b = addClaim(g, 'attestation', exact(201), {select: false});
  g.factualConflicts.push({id: 'conflict:test:a', claimIds: [a.id, b.id], note: '兩種記載並存'});
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 200).status, 'possible');
});
test('a death, capture or surrender event never closes an unknown tenure automatically', () => {
  const g = graph(); addClaim(g, 'start', exact(200));
  for (const type of ['death', 'capture', 'surrender']) {const e = event(`event:test:${type}`, type); g.events.push(e); addClaim(g, 'event-date', exact(205), {event: e});}
  assert.equal(g.tenures[0].selected.end, null); assert.equal(c.presenceInYear(g, g.tenures[0].id, 204).status, 'unknown');
});
test('same office held on two occasions remains two stable tenures', () => {
  const g = graph(); const second = tenure('tenure:test:second'); g.tenures.push(second);
  addClaim(g, 'holding', 'held', {tenure: second}); addClaim(g, 'attestation', exact(210), {tenure: second});
  addClaim(g, 'attestation', exact(200));
  assert.equal(c.personPresenceInYear(g, 210).length, 2);
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 210).definite, false);
  assert.equal(c.presenceInYear(g, second.id, 210).definite, true);
});
test('one career event may involve more than one tenure without packing a compound office name', () => {
  const g = graph(); const second = tenure('tenure:test:second'); g.tenures.push(second); const e = event(); e.tenureIds.push(second.id); g.events.push(e);
  c.validateGraph(g); assert.equal(g.events.length, 1); assert.equal(g.events[0].tenureIds.length, 2);
});
test('relative chronology works without dates and rejects a cycle', () => {
  const g = graph(); const a = event(), b = event('event:test:b', 'restoration'); b.afterEventIds = [a.id]; g.events.push(a, b);
  c.validateGraph(g); assert.equal(g.events[1].dateClaimId, null);
  a.afterEventIds = [b.id]; assert.throws(() => c.validateGraph(g), rejectsCode('chronology'));
});
test('a missing event or tenure reference is rejected instead of silently dropped', () => {
  const g = graph(); const e = event(); e.tenureIds = ['tenure:missing']; g.events.push(e);
  assert.throws(() => c.validateGraph(g), rejectsCode('event-tenure'));
  e.tenureIds = [g.tenures[0].id]; e.afterEventIds = ['event:missing'];
  assert.throws(() => c.validateGraph(g), rejectsCode('chronology'));
});
test('identities cannot be reused across different research entities', () => {
  const g = graph(); const e = event(g.tenures[0].id); g.events.push(e);
  assert.throws(() => c.validateGraph(g), rejectsCode('identity'));
});
test('one-person research graphs cannot absorb another person by shared name', () => {
  const g = graph(); g.tenures[0].personId = 'person:test:b'; assert.throws(() => c.validateGraph(g), rejectsCode('person'));
});
test('selection cannot cross subjects or use an event date as a start date', () => {
  const g = graph(); const other = tenure('tenure:test:b'); g.tenures.push(other); const start = addClaim(g, 'start', exact(200), {tenure: other});
  g.tenures[0].selected.start = start.id; assert.throws(() => c.validateGraph(g), rejectsCode('selection'));
  g.tenures[0].selected.start = null; const e = event(); g.events.push(e); const date = addClaim(g, 'event-date', exact(200), {event: e});
  g.tenures[0].selected.start = date.id; assert.throws(() => c.validateGraph(g), rejectsCode('selection'));
});
test('counter evidence alone cannot certify a claim', () => {
  const g = graph(); g.evidence[0].role = 'counter'; assert.throws(() => c.validateGraph(g), rejectsCode('review'));
});
test('the same evidence cannot be counted again under a different note', () => {
  const g = graph(); g.evidence.push({...g.evidence[0], id: 'evidence:duplicate', note: '換個註語'});
  assert.throws(() => c.validateGraph(g), rejectsCode('duplicate-evidence'));
});
test('one pinned version cannot have conflicting digests', () => {
  const g = graph(); addClaim(g, 'attestation', exact(200), {sourcePin: {...pin, digest: 'b'.repeat(64)}});
  assert.throws(() => c.validateGraph(g), rejectsCode('pin-conflict'));
});
test('factual conflict groups compare the same subject and the same question', () => {
  const g = graph(); const a = addClaim(g, 'start', exact(200)); const b = addClaim(g, 'end', exact(205));
  g.factualConflicts.push({id: 'conflict:test:a', claimIds: [a.id, b.id], note: ''}); assert.throws(() => c.validateGraph(g), rejectsCode('conflict'));
});
test('uninterpreted old text cannot silently inherit a verified structured assessment', () => {
  const g = graph(); const a = addClaim(g, 'legacy-record', {officeName: '官', nature: '', polity: '', jurisdiction: '', date: clone(oldDate)}, {select: false, patch: {derivation: 'uninterpreted'}});
  assert.throws(() => c.validateGraph(g), rejectsCode('review'));
  a.assessment = 'pending'; c.validateGraph(g);
});
test('adoption requires a rationale, independently of source support', () => {
  const g = graph(); g.tenures[0].selected.rationale = ''; assert.throws(() => c.validateGraph(g), rejectsCode('selection'));
});
test('malformed collections, oversize graphs and non-integer pins fail closed', () => {
  const g = graph(); assert.throws(() => c.validateGraph({...g, claims: null}), rejectsCode('size'));
  assert.throws(() => c.validateGraph({...g, events: Array(1001).fill(event())}), rejectsCode('size'));
  assert.throws(() => c.validatePin({...pin, revision: 1.5}), rejectsCode('pin'));
});

// Integrity tests use real immutable catalogue revisions and SHA-256 values.
test('legacy preview preserves original text, status and unknown semantics without mutating input', async () => {
  const f = await fixture(); const original = c.canonicalJson(f.history); const out = await c.previewPersonResearch(store(f.history), {personId: f.p.id, year: 203});
  assert.equal(out.graph.tenures[0].id, f.a.id); assert.equal(out.graph.claims[0].content.value.date.original, '某年間');
  assert.equal(out.graph.tenures[0].selected.start, null); assert.equal(out.graph.events.length, 0); assert.equal(out.presence[0].status, 'unknown');
  assert.equal(c.canonicalJson(f.history), original); assert.equal(out.persisted, false); assert.equal(out.published, false); assert.equal(out.historicalReviewPerformed, false);
});
test('legacy verified intervals still require independent interpretation before definite presence', async () => {
  const f = await fixture(); const verified = await revision({...f.a.data, assessment: 'verified', reason: '舊核定'}, 5, f.a);
  const out = await c.previewPersonResearch(store([...f.history, verified]), {personId: f.p.id, year: 203});
  assert.equal(out.graph.tenures[0].assessment, 'verified'); assert.equal(out.graph.claims[0].assessment, 'pending'); assert.equal(out.presence[0].definite, false);
});
test('pinned older source survives later edits including whitespace and unusual characters', async () => {
  const f = await fixture(); const out = await c.previewPersonResearch(store(f.history), {personId: f.p.id});
  assert.equal(out.sources[0].pin.revision, 1); assert.equal(out.sources[0].text, f.s1.data.text); assert.notEqual(out.sources[0].text, f.s2.data.text);
  assert.equal(out.sources[0].textScope, 'excerpt');
});
test('missing older sources are not replaced by the latest version', async () => {
  const f = await fixture(); await assert.rejects(() => c.previewPersonResearch(store([f.p, f.a, f.s2]), {personId: f.p.id}), rejectsCode('source-reference'));
});
test('tampered source bytes fail even if the stored digest was left unchanged', async () => {
  const f = await fixture(); const tampered = clone(f.s1); tampered.data.text += '改字';
  await assert.rejects(() => c.previewPersonResearch(store([f.p, tampered, f.a]), {personId: f.p.id}), rejectsCode('integrity'));
});
test('a fixed revision from after the selected watermark cannot be cited', async () => {
  const f = await fixture(); const g = graph(c.revisionPin(f.s2));
  await assert.rejects(() => c.validateResearchPreview(store(f.history), {graph: g, watermark: 3}), rejectsCode('source-version'));
});
test('a forged source pin digest is rejected in submitted research graphs', async () => {
  const f = await fixture(); const g = graph({...c.revisionPin(f.s1), digest: '0'.repeat(64)});
  await assert.rejects(() => c.validateResearchPreview(store(f.history), {graph: g}), rejectsCode('integrity'));
});
test('a person revision cannot masquerade as primary-source evidence', async () => {
  const f = await fixture(); const g = graph(c.revisionPin(f.p));
  await assert.rejects(() => c.validateResearchPreview(store(f.history), {graph: g}), rejectsCode('source-kind'));
});
test('private sources are inspectable by the owner without becoming reader publications', async () => {
  const f = await fixture(); const out = await c.previewPersonResearch(store(f.history), {personId: f.p.id});
  assert.equal(f.s1.data.visibility, 'private'); assert.equal(out.sources[0].text, f.s1.data.text); assert.equal(out.published, false);
});
test('excluded evidence may be preserved but cannot certify new verified assertions', async () => {
  const f = await fixture(); const excluded = await revision({...source(), assessment: 'excluded', disposition: 'incorrect', reason: '測試錯誤材料'}, 5, f.s2);
  const g = graph(c.revisionPin(excluded));
  await assert.rejects(() => c.validateResearchPreview(store([...f.history, excluded]), {graph: g}), rejectsCode('excluded-evidence'));
  g.claims[0].assessment = 'pending'; const out = await c.validateResearchPreview(store([...f.history, excluded]), {graph: g}); assert.equal(out.sources.length, 1);
});
test('textual variants retain distinct version readings separately from factual conflicts', async () => {
  const f = await fixture(); const g = graph(c.revisionPin(f.s1));
  g.textualVariants.push({id: 'variant:test:a', locus: '測試校勘位置', note: '', readings: [{source: c.revisionPin(f.s1), text: '原注𬱟'}, {source: c.revisionPin(f.s2), text: '原注不再相同'}]});
  const out = await c.validateResearchPreview(store(f.history), {graph: g}); assert.equal(out.graph.factualConflicts.length, 0); assert.equal(out.sources.length, 2);
});
test('textual readings cannot normalize or invent characters absent from their source', async () => {
  const f = await fixture(); const g = graph(c.revisionPin(f.s1));
  g.textualVariants.push({id: 'variant:test:a', locus: '位置', note: '', readings: [{source: c.revisionPin(f.s1), text: '不存在的改字'}, {source: c.revisionPin(f.s2), text: '後修訂正文'}]});
  await assert.rejects(() => c.validateResearchPreview(store(f.history), {graph: g}), rejectsCode('variant-text'));
});
test('the same witness cannot appear twice in one textual-variant group', () => {
  const g = graph(); g.textualVariants.push({id: 'variant:test:a', locus: '位置', note: '', readings: [{source: pin, text: '甲'}, {source: pin, text: '乙'}]});
  assert.throws(() => c.validateGraph(g), rejectsCode('variant'));
});
test('legacy variant links are retained as unclassified rather than fabricated collation', async () => {
  const f = await fixture(); const a = await revision({...f.a.data, evidence: [{...f.a.data.evidence[0], role: 'variant'}]}, 5, f.a);
  const out = await c.previewPersonResearch(store([...f.history, a]), {personId: f.p.id});
  assert.equal(out.graph.textualVariants.length, 0); assert.equal(out.graph.factualConflicts.length, 0);
  assert.equal(out.graph.evidence[0].role, 'unclassified-variant'); assert.ok(out.warnings.some(w => w.code === 'variant-unclassified'));
});
test('explicit duplicates add an original occurrence, not an extra tenure', async () => {
  const f = await fixture(); const d = await revision({...appointment('appointment:test:duplicate'), assessment: 'excluded', disposition: 'duplicate', reason: '同一事實互證', duplicateOf: f.a.id}, 5);
  const out = await c.previewPersonResearch(store([...f.history, d]), {personId: f.p.id});
  assert.equal(out.graph.tenures.length, 1); assert.equal(out.graph.claims.length, 2);
  assert.ok(out.graph.claims.every(x => x.subject.id === f.a.id)); assert.equal(out.sources.length, 1);
});
test('similar names or offices are never automatic duplicate or identity merges', async () => {
  const f = await fixture(); const p2 = await revision(person('person:test:b'), 5); const a2 = await revision(appointment('appointment:test:b', p2.id), 6); const a3 = await revision(appointment('appointment:test:restoration'), 7);
  const out = await c.previewPersonResearch(store([...f.history, p2, a2, a3]), {personId: f.p.id});
  assert.equal(out.graph.tenures.length, 2); assert.ok(out.graph.tenures.every(t => t.personId === f.p.id));
});
test('a duplicate target in another person or with incompatible years is rejected', async () => {
  const f = await fixture(); const d = await revision({...appointment('appointment:test:duplicate'), assessment: 'excluded', disposition: 'duplicate', reason: '測試互證', duplicateOf: 'appointment:missing'}, 5);
  await assert.rejects(() => c.previewPersonResearch(store([...f.history, d]), {personId: f.p.id}), rejectsCode('duplicate'));
});
test('editing copied legacy facts invalidates their fixed origin rather than rewriting it', async () => {
  const f = await fixture(); const out = await c.previewPersonResearch(store(f.history), {personId: f.p.id});
  out.graph.claims[0].content.value.date.original = '被改寫的年代';
  await assert.rejects(() => c.validateResearchPreview(store(f.history), {graph: out.graph}), rejectsCode('origin'));
});
test('editing an original office label also invalidates its fixed origin', async () => {
  const f = await fixture(); const out = await c.previewPersonResearch(store(f.history), {personId: f.p.id});
  out.graph.tenures[0].officeNameOriginal = '另一官職';
  await assert.rejects(() => c.validateResearchPreview(store(f.history), {graph: out.graph}), rejectsCode('origin'));
});
test('old zero-year values remain uninterpreted raw data instead of becoming new chronology', async () => {
  const f = await fixture(); const a = await revision({...f.a.data, date: {...oldDate, startYear: 0, endYear: 0, precision: 'year'}}, 5, f.a);
  const out = await c.previewPersonResearch(store([...f.history, a]), {personId: f.p.id});
  assert.equal(out.graph.claims[0].content.value.date.startYear, 0); assert.equal(out.graph.tenures[0].selected.start, null);
});
test('fixed watermark previews and digest reproduce despite later catalogue edits', async () => {
  const f = await fixture(); const first = await c.previewPersonResearch(store(f.history), {personId: f.p.id, watermark: 3, year: 203});
  const later = await revision({...f.a.data, officeName: '新官名'}, 5, f.a);
  const repeat = await c.previewPersonResearch(store([...f.history, later]), {personId: f.p.id, watermark: 3, year: 203});
  assert.equal(first.digest, repeat.digest); assert.deepEqual(first.graph, repeat.graph);
});
test('changing query year or research selection changes the digest without publishing', async () => {
  const f = await fixture(); const a = await c.previewPersonResearch(store(f.history), {personId: f.p.id, year: 203}); const b = await c.previewPersonResearch(store(f.history), {personId: f.p.id, year: 204});
  assert.notEqual(a.digest, b.digest); assert.equal(a.published, false); assert.equal(b.persisted, false);
});
test('the preview adapter consumes read callbacks only and performs no repository writes', async () => {
  const f = await fixture(); const calls = []; const reader = store(f.history);
  const readOnly = Object.fromEntries(Object.entries(reader).map(([k, fn]) => [k, async (...args) => {calls.push(k); return fn(...args);} ]));
  await c.previewPersonResearch(readOnly, {personId: f.p.id});
  assert.deepEqual(new Set(calls), new Set(['watermark', 'snapshot', 'revision']));
});
test('query parsing requires exact person IDs and strict integer years/watermarks', () => {
  assert.deepEqual(c.parseResearchQuery(new URLSearchParams('personId=person:test:a&year=-1&watermark=0')), {personId: 'person:test:a', year: -1, watermark: 0});
  for (const query of ['personId=同名', 'personId=person:a&year=0', 'personId=person:a&year=', 'personId=person:a&year=200.5', 'personId=person:a&year=1e2', 'personId=person:a&watermark=-1']) assert.throws(() => c.parseResearchQuery(new URLSearchParams(query)));
});
test('unknown people and future watermarks cannot produce an apparent successful preview', async () => {
  const f = await fixture(); await assert.rejects(() => c.previewPersonResearch(store(f.history), {personId: 'person:missing'}), rejectsCode('person'));
  await assert.rejects(() => c.previewPersonResearch(store(f.history), {personId: f.p.id, watermark: 999}), rejectsCode('watermark'));
});

test('admin research routes remain behind owner and mutation guards, never reader routes', async () => {
  const source = await readFile(new URL('../server/admin-router.ts', import.meta.url), 'utf8');
  const owner = source.indexOf('const actor=await owner(request,env)');
  const guard = source.indexOf('mutationGuard(request)');
  const route = source.indexOf("path==='/api/admin/prosopography'");
  assert.ok(owner >= 0 && route > owner && route > guard);
  assert.ok(source.includes("path==='/api/admin/prosopography/validate'"));
  assert.equal(source.slice(source.indexOf('async function readerRoute')).includes('prosopography'), false);
});

test('selected attestations outside adopted bounds preserve contradiction rather than proving presence', () => {
  const g = graph(); addClaim(g, 'start', exact(200)); addClaim(g, 'end', exact(205)); addClaim(g, 'continuity', 'continuous'); addClaim(g, 'attestation', exact(199));
  c.validateGraph(g);
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 199).status, 'unknown');
  assert.equal(c.presenceInYear(g, g.tenures[0].id, 203).definite, false);
  assert.ok(c.graphWarnings(g).some(w => w.code === 'inconsistent-tenure'));
});

async function routeFixture() {
  const f = await fixture(); const calls = [];
  const reads = store(f.history);
  const readOnly = Object.fromEntries(Object.entries(reads).map(([name, fn]) => [name, async (...args) => {calls.push(name); return fn(...args);} ]));
  const router = await loadCatalogueRouter(c, readOnly);
  const env = {ADMIN_OWNER_ID: 'owner', DB: {prepare() {throw new Error('Unexpected D1 mutation or direct query');}}, BUCKET: {}};
  return {router, env, f, calls};
}
const adminRequest = (path, options = {}) => new Request(`https://example.test/api/admin/${path}`, {headers: {'oai-authenticated-user-id': 'owner'}, ...options});
const postHeaders = {'oai-authenticated-user-id': 'owner', origin: 'https://example.test', 'x-catalogue-request': '1', 'content-type': 'application/json', 'sec-fetch-site': 'same-origin'};
test('HTTP preview denies unauthenticated and non-owner requests before reading research data', async () => {
  const {router, env, calls} = await routeFixture();
  assert.equal((await router(adminRequest('prosopography?personId=person:test:a', {headers: {}}), env)).status, 401);
  assert.equal((await router(adminRequest('prosopography?personId=person:test:a', {headers: {'oai-authenticated-user-id': 'other'}}), env)).status, 403);
  assert.equal(calls.length, 0);
});
test('HTTP preview uses no-store and the real read-only service behind the owner guard', async () => {
  const {router, env} = await routeFixture(); const response = await router(adminRequest('prosopography?personId=person:test:a&year=203'), env);
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  const data = await response.json(); assert.equal(data.published, false); assert.equal(data.persisted, false); assert.equal(data.presence[0].status, 'unknown');
});
test('HTTP HEAD preview returns headers without research JSON bytes', async () => {
  const {router, env} = await routeFixture(); const response = await router(adminRequest('prosopography?personId=person:test:a', {method: 'HEAD'}), env);
  assert.equal(response.status, 200); assert.equal(await response.text(), '');
});
test('HTTP POST validation rejects cross-origin or missing request markers', async () => {
  const {router, env, calls} = await routeFixture();
  for (const headers of [{...postHeaders, origin: 'https://other.test'}, {...postHeaders, 'x-catalogue-request': ''}, {...postHeaders, 'sec-fetch-site': 'cross-site'}]) {
    assert.equal((await router(adminRequest('prosopography/validate', {method: 'POST', headers, body: '{}'}), env)).status, 403);
  }
  assert.equal(calls.length, 0);
});
test('HTTP POST validates supplied claims without saving or granting a publication approval', async () => {
  const {router, env, f} = await routeFixture(); const g = graph(c.revisionPin(f.s1));
  const response = await router(adminRequest('prosopography/validate', {method: 'POST', headers: postHeaders, body: JSON.stringify({graph: g})}), env);
  assert.equal(response.status, 200); const out = await response.json(); assert.equal(out.structurallyValid, true); assert.equal(out.historicalReviewPerformed, false); assert.equal(out.persisted, false); assert.equal(out.published, false);
});
test('HTTP invalid JSON and invalid date queries return explicit client errors', async () => {
  const {router, env} = await routeFixture();
  assert.equal((await router(adminRequest('prosopography/validate', {method: 'POST', headers: postHeaders, body: '{'}), env)).status, 400);
  assert.equal((await router(adminRequest('prosopography?personId=person:test:a&year=0'), env)).status, 422);
});
test('HTTP unsupported research operations and action headers cannot invoke writes', async () => {
  const {router, env, calls} = await routeFixture();
  assert.equal((await router(adminRequest('prosopography', {method: 'POST', headers: postHeaders, body: '{}'}), env)).status, 405);
  assert.equal((await router(adminRequest('prosopography/validate'), env)).status, 405);
  assert.equal((await router(adminRequest('prosopography?personId=person:test:a', {headers: {...postHeaders, 'next-action': 'x'}}), env)).status, 405);
  assert.equal(calls.length, 0);
});
