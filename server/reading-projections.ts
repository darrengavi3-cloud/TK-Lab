import {isReaderCandidate, isVerifiedFact, holdsOfficeInYear, type Appointment, type Source} from '../domain/catalogue';
import type {Revision} from '../domain/revisions';
import {check} from './storage';
import {effectiveReaderLinks, officeReferences, polityLabels} from './reader-links';
import oldSuccession from '../atlas/data/reviewed-office-succession.json';
import oldFangzhen from '../atlas/data/v69-fangzhen-reader.json';
import seats from '../atlas/data/v66-administrative-seat-periods.json';

export type ReaderRow = Record<string, unknown>;
export function citationsFor(a: Appointment, rows: Revision[], sources: Map<string, Source>) {
  const links = [...a.evidence];
  for (const duplicate of rows) {
    if (duplicate.data.kind !== 'appointment' || duplicate.data.disposition !== 'duplicate' || duplicate.data.duplicateOf !== a.id) continue;
    for (const e of duplicate.data.evidence) if (!links.some(x => x.sourceId === e.sourceId && x.sourceRevision === e.sourceRevision && x.role === e.role && x.note === e.note)) links.push(e);
  }
  return links.map(e => {
    const s = sources.get(e.sourceId + '@' + e.sourceRevision);
    check(s && s.visibility === 'reader' && s.assessment !== 'excluded', '引用的原文尚未允許讀者閱讀：' + e.sourceId, 409);
    return {title: [s.title, s.edition, s.locator].filter(Boolean).join(' · '), url: s.url, quote: s.text, textScope: s.textScope, role: e.role, ...(e.note ? {note: e.note} : {})};
  });
}
export function appointmentForReader(a: Appointment, rows: Revision[], sources: Map<string, Source>): ReaderRow {
  const certain = a.date.certainty === 'certain';
  return {appointmentId: a.id, personId: a.personId, nodeName: a.officeName,
    startYear: certain ? a.date.startYear : null, endYear: certain ? a.date.endYear : null,
    polity: a.polity, jurisdiction: a.jurisdiction, factionName: a.polity, appointmentNature: a.nature,
    treeType: 'source', dateText: a.date.original, dateCertainty: a.date.certainty, citations: citationsFor(a, rows, sources)};
}

/** All three reading views consume the same fixed revision and pinned quotes. */
export function linkedReadingProjections(rows: Revision[], people: Map<string, ReaderRow>, appointments: ReaderRow[], sources: Map<string, Source>) {
  const byId = new Map(appointments.map(a => [String(a.appointmentId), a]));
  const offices = new Map<string, ReaderRow>();
  // Existing reviewed replacements are a frozen, explicit mapping. Retain their
  // tombstones when a fact is withdrawn so legacy strings cannot reappear.
  for (const old of oldSuccession.offices) {
    const ref = officeReferences.find(o => o.factionKey === old.factionKey && o.name === old.name)!;
    offices.set(ref.id, {...ref, appointments: [], replacesNames: [...new Set(old.appointments.map(a => a.name))], replaceEvolution: true});
  }
  const fangzhen = new Map<string, ReaderRow>(oldFangzhen.records.map(r => [r.id, {...r}]));
  const managedFangzhenIds = new Set<string>();
  let linkedAppointments = 0;
  for (const r of rows) {
    if (r.data.kind !== 'appointment') continue;
    const a = r.data, links = effectiveReaderLinks(a), dto = byId.get(a.id);
    if (links.offices.length || links.fangzhen) linkedAppointments++;
    for (const key of links.offices) {
      const ref = officeReferences.find(o => o.id === key)!;
      if (!offices.has(key)) offices.set(key, {...ref, appointments: [], replacesNames: [], replaceEvolution: false});
      if (!dto) continue;
      const person = people.get(a.personId)!;
      (offices.get(key)!.appointments as ReaderRow[]).push({appointmentId: a.id, personId: a.personId, name: person.name,
        officeName: dto.nodeName, startYear: dto.startYear, endYear: dto.endYear, citations: dto.citations,
        appointmentNature: a.nature, dateCertainty: a.date.certainty, dateText: a.date.original, catalogueManaged: true});
    }
    const f = links.fangzhen;
    if (!f) continue;
    const id = f.recordId || a.id;
    managedFangzhenIds.add(id);
    fangzhen.delete(id);
    if (!isReaderCandidate(a)) continue;
    check(people.has(a.personId), '州鎮任官的人物尚未可供閱讀：' + a.personId, 409);
    // Pending/disputed rows remain labelled candidates only in the state table.
    const fact = dto || appointmentForReader(a, rows, sources);
    const polity = ({han:'汉',shu:'汉',wei:'魏',wu:'吴',jin:'晋',eastjin:'晋'})[f.polityKey];
    const row: ReaderRow = {id, appointmentId: a.id, personId: a.personId, commander: people.get(a.personId)!.name,
      title: a.officeName, commission: a.officeName, polity, dynastyLabel: polityLabels[f.polityKey],
      eraGroup: f.polityKey === 'eastjin' ? 'eastjin' : f.polityKey === 'jin' ? 'jin' : 'three',
      archiveScope: f.polityKey === 'eastjin' ? '东晋扩展' : '核心：汉末—西晋', recordType: f.recordType,
      ...(f.powerKinds?.length ? {powerKinds: [...new Set(f.powerKinds)]} : {}),
      relation: '职任记录', jurisdiction: a.jurisdiction, appointmentStatus: a.nature,
      startYear: fact.startYear, endYear: fact.endYear,
      tenureText: a.date.original || (a.date.certainty === 'certain' ? [a.date.startYear ?? '始年未详', a.date.endYear ?? '终年未详'].join('—') : '年代未详'),
      dateCertainty: a.date.certainty, readerDisplayStatus: isVerifiedFact(a) ? 'verified' : 'pending',
      assessment: a.assessment, catalogueManaged: true,
      definiteTenure: a.date.startYear !== null && holdsOfficeInYear(a, a.date.startYear), citations: fact.citations};
    if (f.administrativeUnitId) {
      row.administrativeUnitId = f.administrativeUnitId;
      // A changed tenure never inherits an old seat beyond its evidenced period.
      const period = seats.periods.filter(p => p.administrativeUnitId === f.administrativeUnitId && p.publicationStatus === 'verified'
        && row.definiteTenure && a.date.startYear! >= p.validFromYear && a.date.endYear! <= p.validToYear);
      if (period.length === 1) Object.assign(row, {seat: period[0].seatName, seatName: period[0].seatName, seatType: period[0].seatType, seatPeriodId: period[0].seatPeriodId, seatValidFromYear: period[0].validFromYear, seatValidToYear: period[0].validToYear});
    }
    fangzhen.set(id, row);
  }
  for (const office of offices.values()) (office.appointments as ReaderRow[]).sort((a, b) => Number(a.startYear ?? Infinity) - Number(b.startYear ?? Infinity) || String(a.appointmentId).localeCompare(String(b.appointmentId), 'en'));
  const stateRows = [...fangzhen.values()];
  return {
    succession: {schemaVersion: 1, offices: [...offices.values()], managedAppointmentIds: rows.filter(r => r.data.kind === 'appointment').map(r => r.id)},
    fangzhen: {...oldFangzhen, records: stateRows, summary: {...oldFangzhen.summary, records: stateRows.length,
      verified: stateRows.filter(r=>r.readerDisplayStatus==='verified').length,
      candidate: stateRows.filter(r=>r.readerDisplayStatus!=='verified').length,
      dynasties: Object.fromEntries([...new Set(stateRows.map(r=>String(r.dynastyLabel)))].map(label=>[label,stateRows.filter(r=>r.dynastyLabel===label).length]))}},
    managedFangzhenIds, linkedAppointments,
  };
}
