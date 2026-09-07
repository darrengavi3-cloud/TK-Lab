import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A public projection of already reviewed facts. Never infer an appointment's
// polity from a person's lifetime affiliations, or a tenure from succession.
export function projectOfficeSuccession(people, appointments) {
  const byId = new Map(people.map(person => [person.personId, person]));
  const definitions = [
    { name: '大将军', offices: ['大将军'], includesActing: true },
    { name: '大司马', offices: ['大司马'] },
    { name: '尚书令', offices: ['尚书令', '守尚书令'] }
  ];
  return definitions.map(definition => ({
    factionKey: 'shu', name: definition.name,
    appointments: appointments.filter(row => row.polity === '季汉' && (definition.offices.includes(row.nodeName) ||
      (definition.includesActing && row.nodeName === '后将军' && row.citations.some(c => /行大將軍事|行大将军事/.test(c.quote)))))
      .map(row => {
        const person = byId.get(row.personId);
        if (!person || !row.citations?.length) throw new Error(`Incomplete office succession: ${row.appointmentId}`);
        return { appointmentId: row.appointmentId, personId: person.personId, name: person.name,
          officeName: row.nodeName, startYear: row.startYear, endYear: row.endYear,
          citations: row.citations };
      }).sort((a, b) => (a.startYear ?? Infinity) - (b.startYear ?? Infinity) || a.appointmentId.localeCompare(b.appointmentId, 'en'))
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
  const payload = { schemaVersion: 1, offices: projectOfficeSuccession(
    read('v63-reader-people.json').people, read('v63-reader-person-relations.json').appointments) };
  fs.writeFileSync(path.join(root, 'data/reviewed-office-succession.json'), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'data/reviewed-office-succession.js'), `window.SGZ_OFFICE_SUCCESSION=${JSON.stringify(payload)};\n`);
  console.log(`已生成 ${payload.offices.length} 个职官的同源历任投影。`);
}
