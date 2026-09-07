import fs from 'node:fs';
import path from 'node:path';
import { reviewedAppointments, sourceDigest } from './appointment-publication.mjs';

// Research decisions and authored supplements share the same identity and
// evidence gates in the registry, reader projection, and status ledger.
export function reviewedSupplementAppointments(scope, evidence, review) {
  const people = new Map(scope.map(row => [row.personId, row]));
  const sources = new Map(evidence.records.map(row => [row.id, row]));
  if (sources.size !== evidence.records.length) throw new Error('Duplicate supplement evidence');
  const seen = new Set();
  return review.records.map(row => {
    if (!row.id || seen.has(row.id)) throw new Error('Duplicate supplement appointment');
    seen.add(row.id);
    const person = people.get(row.personId);
    const source = sources.get(row.evidenceId);
    if (!person || person.name !== row.name || sourceDigest(person) !== row.scopeEntryDigest) {
      throw new Error(`Supplement identity changed: ${row.id}`);
    }
    if (!source || sourceDigest(source) !== row.evidenceDigest || !source.title ||
        !source.quote || !/^https:\/\//.test(source.url)) {
      throw new Error(`Supplement evidence changed: ${row.id}`);
    }
    const { contentDigest, ...content } = row;
    if (sourceDigest(content) !== contentDigest) throw new Error(`Supplement content changed: ${row.id}`);
    const supporting = (row.supportingEvidence || []).map(guard => {
      const item = sources.get(guard.id);
      if (!item || sourceDigest(item) !== guard.digest || !item.title || !item.quote || !/^https:\/\//.test(item.url)) {
        throw new Error(`Supplement evidence changed: ${row.id}`);
      }
      return { title: item.title, url: item.url, quote: item.quote };
    });
    if (!['verified', 'pending', 'disputed', 'suppressed'].includes(row.status) ||
        !row.reason || !row.officeName || !row.dateNote ||
        [row.startYear, row.endYear].some(year => year !== null && !Number.isInteger(year)) ||
        (row.startYear !== null && row.endYear !== null && row.startYear > row.endYear)) {
      throw new Error(`Incomplete supplement appointment: ${row.id}`);
    }
    return { ...row, relationshipType: '任官', citations: [{
      title: source.title, url: source.url, quote: source.quote,
      note: [row.dateNote, row.readerNote].filter(Boolean).join('；')
    }, ...supporting] };
  }).filter(row => row.status === 'verified');
}

export function loadAppointmentPublication(root, scope, canonicalPersonId = value => value) {
  const json = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
  const sourceRows = json('person-source-index.json').appointments;
  const review = { records: [
    ...json('v71-appointment-review.json').records,
    ...json('v74-appointment-source-review.json').records
  ] };
  const supplement = json('v74-appointment-supplements.json');
  const supplementEvidence = json('v74-chancellery-evidence.json');
  const sourcePublished = reviewedAppointments(sourceRows, review, canonicalPersonId);
  const supplemented = reviewedSupplementAppointments(scope, supplementEvidence, supplement);
  const published = [...sourcePublished, ...supplemented];
  if (new Set(published.map(row => row.id)).size !== published.length) throw new Error('Appointment ID collision');
  return { published, sourceRows, review, supplement };
}

export function appointmentStatusCounts(sourceRows, review, supplement, publishedIds) {
  // Validate the original evidence even for nonpublished decisions.
  reviewedAppointments(sourceRows, review);
  const byId = new Map(review.records.map(row => [row.appointmentId, row]));
  const counts = { verified: 0, pending: 0, disputed: 0, suppressed: 0 };
  const ids = new Set();
  for (const row of sourceRows) {
    if (ids.has(row.id)) throw new Error('Duplicate appointment source');
    ids.add(row.id);
    const decision = byId.get(row.id);
    let status = 'pending';
    if (decision?.status === 'suppressed') status = 'suppressed';
    else if (publishedIds.has(row.id)) status = 'verified';
    else if (decision?.disposition === 'disputed' || /争议|冲突|反证/.test(`${row.researchStatus || ''} ${row.homonymStatus || ''}`)) status = 'disputed';
    if (status === 'suppressed' && publishedIds.has(row.id)) throw new Error('Suppressed appointment was published');
    counts[status]++;
  }
  for (const row of supplement.records) {
    if (ids.has(row.id)) throw new Error('Appointment ID collision');
    ids.add(row.id);
    if (!Object.hasOwn(counts, row.status)) throw new Error('Unknown supplement status');
    if (publishedIds.has(row.id) !== (row.status === 'verified')) throw new Error('Supplement publication mismatch');
    counts[row.status]++;
  }
  if ([...publishedIds].some(id => !ids.has(id))) throw new Error('Unregistered appointment was published');
  return counts;
}
