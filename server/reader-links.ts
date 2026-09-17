import referenceData from '../domain/reader-references.json';
import fangzhenBaseline from '../atlas/data/v69-fangzhen-reader.json';
import seats from '../atlas/data/v66-administrative-seat-periods.json';
import {DomainError, type Appointment, type AppointmentReaderLinks, type CatalogueRecord} from '../domain/catalogue';

export const officeReferences = referenceData.offices;
export const inheritedOfficeLinks = referenceData.inherited as Record<string, string[]>;
export const fangzhenRecords = fangzhenBaseline.records;
export const administrativeUnits = [...new Map(seats.periods.map(p => [p.administrativeUnitId, {id: p.administrativeUnitId, name: p.unitName, polity: p.polity}])).values()];
export const polityLabels: Record<string, string> = {han: '后汉', wei: '魏', shu: '季汉', wu: '吴', jin: '西晋', eastjin: '东晋'};
const polityNames: Record<string, string[]> = {han: ['汉','漢','后汉','後漢'], wei: ['魏','曹魏'], shu: ['汉','漢','季汉','季漢','蜀汉','蜀漢'], wu: ['吴','吳','孙吴','孫吳'], jin: ['晋','晉','西晋','西晉'], eastjin: ['晋','晉','东晋','東晉'], tribal: ['异族诸部','異族諸部']};
export function effectiveReaderLinks(a: Appointment): AppointmentReaderLinks {
  return a.readerLinks ?? {offices: inheritedOfficeLinks[a.id] || [], fangzhen: null};
}
export function readerLinkOptions() {
  return {offices: officeReferences, inherited: inheritedOfficeLinks, units: administrativeUnits,
    fangzhen: fangzhenRecords.map(r => ({id: r.id, personId: r.personId, title: r.title, jurisdiction: r.jurisdiction, polity: r.polity, dynastyLabel: r.dynastyLabel, recordType: r.recordType, tenureText: r.tenureText, administrativeUnitId: 'administrativeUnitId' in r ? r.administrativeUnitId : null}))};
}
function requireLink(value: unknown, message: string): asserts value {
  if (!value) throw new DomainError('reader-links', message);
}
/** Called for the entire proposed transaction, including imports. No name matching. */
export function validateReaderLinks(records: readonly CatalogueRecord[]) {
  const claimed = new Map<string, string>();
  for (const a of records) {
    if (a.kind !== 'appointment') continue;
    const links = effectiveReaderLinks(a);
    for (const id of links.offices) {
      const office = officeReferences.find(o => o.id === id);
      requireLink(office, '官職關聯已不存在，請重新選擇。');
      // Frozen inherited links were reviewed before v1. Newly explicit links
      // require the owner to state the polity, never derive it from a name.
      if (a.readerLinks) requireLink(polityNames[office.factionKey]?.includes(a.polity), '官職與任官的政權不相符，請核對。');
    }
    const f = links.fangzhen;
    if (!f) continue;
    requireLink(polityNames[f.polityKey]?.includes(a.polity), '州鎮與任官的政權不相符，請核對。');
    if (f.recordId) {
      const old = fangzhenRecords.find(r => r.id === f.recordId);
      requireLink(old && old.personId === a.personId, '既有州鎮條目必須屬於同一人物；人物身份合併須另行處理。');
      requireLink(!claimed.has(f.recordId), '同一州鎮條目不能由兩條任官同時維護。');
      claimed.set(f.recordId, a.id);
    }
    if (f.administrativeUnitId) {
      const unit = administrativeUnits.find(u => u.id === f.administrativeUnitId);
      requireLink(unit && unit.name === a.jurisdiction && polityNames[f.polityKey].includes(unit.polity), '行政單元與任官的政權、轄區不相符，請核對。');
    }
  }
}
