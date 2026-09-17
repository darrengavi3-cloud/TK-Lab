import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { loadAppointmentPublication, appointmentStatusCounts } from '../../atlas/scripts/appointment-supplements.mjs';
import { readReleaseConfig, loadSupplementBatches } from '../../atlas/scripts/release-config.mjs';

export const IMPORTER_VERSION = 'legacy-atlas-shadow-1';
export const BASELINE_COMMIT = '7b8d03990b6b72b4d62bf93f2a39aaeb9367ebd2';
const hash = input => createHash('sha256').update(input).digest('hex');
const sorted = values => [...values].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const string = value => typeof value === 'string' ? value : '';
const header = (id, assessment, visibility = 'private', reason = '') => ({
  id, assessment, workflow: 'review', visibility,
  disposition: assessment === 'excluded' ? 'legacy-suppressed' : 'none',
  reason: assessment === 'excluded' ? reason || '沿用舊發布處置；原始判斷保留於來源檔。' : reason,
  evidence: [],
});

/**
 * Read-only shadow migration. All source bytes are retained in archives.
 * Never writes the DB, canonical atlas, generated reader bundle or live Site.
 * Working records do not claim that remaining fields/domains are migrated.
 */
export function readLegacyBaseline(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')) {
  const root = path.join(projectRoot,'atlas');
  const config = readReleaseConfig(root);
  const archives = {};
  const read = relative => {
    const bytes = fs.readFileSync(path.join(projectRoot,relative));
    const text = bytes.toString('utf8');
    if (!Buffer.from(text,'utf8').equals(bytes)) throw new Error('Non-UTF8 legacy source: '+relative);
    archives[relative] = { sha256:hash(bytes), bytes:bytes.length, text };
    return JSON.parse(text);
  };
  const data = name => read('atlas/data/'+name);
  data('release-config.json');
  const registry = data('v63-person-registry.json');
  const reader = data('v63-reader-people.json');
  const relations = data('v63-reader-person-relations.json');
  const sourceIndex = data('person-source-index.json');
  const scope = data('v62-reader-scope.json');
  const release = read('release-metadata/current-release.json');
  // All decision/evidence batches are preserved, including superseded reviews.
  for (const name of [...config.identityReviewBatches,...config.appointmentReviewBatches,...config.appointmentSupplementBatches.flatMap(b=>[b.evidence,b.decisions])]) data(name);

  const canonicalPersonId = personId => {
    const seen = new Set();
    while (registry.legacyToCanonical?.[personId] && registry.legacyToCanonical[personId] !== personId) {
      if (seen.has(personId)) throw new Error('Identity cycle: '+personId);
      seen.add(personId);
      personId = registry.legacyToCanonical[personId];
    }
    return personId;
  };
  const publication = loadAppointmentPublication(root,scope.people,canonicalPersonId);
  const published = new Map(publication.published.map(r=>[r.id,r]));
  const decisions = new Map(publication.review.records.map(r=>[r.appointmentId,r]));
  const visiblePeople = new Set(reader.people.map(r=>r.personId));
  const allPersonIds = new Set([...registry.people,...registry.excludedPeople].map(r=>r.personId));
  const people = registry.people.map(row => {
    const assessment = row.publicationStatus?.name === 'verified' ? 'verified'
      : row.publicationStatus?.name === 'suppressed' ? 'excluded'
      : row.identityStatus === 'conflict' ? 'disputed' : 'pending';
    return {...header(row.personId,assessment,visiblePeople.has(row.personId)?'reader':'private'),
      kind:'person',name:row.name,aliases:[...(row.aliases||[])],aliasPublication:row.publicationStatus?.aliases==='verified'?'verified':'private',
      // Existing active IDs are not silently turned into redirects. Original
      // aliases and explicit maps remain intact in the archived registry.
      legacyIds:[...new Set(row.legacyPersonIds||[])].filter(id=>id!==row.personId&&!allPersonIds.has(id))};
  });
  for (const row of registry.excludedPeople) {
    if (people.some(p=>p.id===row.personId)) throw new Error('Excluded identity duplicates active registry: '+row.personId);
    people.push({...header(row.personId,'excluded','private',row.reason),kind:'person',name:row.name,aliases:[],aliasPublication:'private',legacyIds:[]});
  }
  const sources = new Map();
  const sourceLink = citation => {
    const value = {title:string(citation.title),edition:string(citation.edition),locator:string(citation.locator),
      text:string(citation.quote),textScope:'excerpt',url:string(citation.url)};
    // No trimming, Unicode normalization, OCR correction or quote rewriting.
    const id = 'source:legacy:'+hash(JSON.stringify(value));
    if (!sources.has(id)) sources.set(id,{...header(id,'pending','reader'),kind:'source',...value});
    return {sourceId:id,sourceRevision:1,role:'support',note:string(citation.note)};
  };
  const links = citations => {
    const result = new Map();
    for (const c of citations) {
      const link = sourceLink(c);
      const key = link.sourceId+'@1:support';
      if (result.has(key)) {
        const previous = result.get(key);
        if (link.note && !previous.note.split('\n').includes(link.note)) previous.note = [previous.note,link.note].filter(Boolean).join('\n');
      } else result.set(key,link);
    }
    return [...result.values()];
  };
  const date = row => {
    const startYear = Number.isInteger(row.startYear) ? row.startYear : null;
    const endYear = Number.isInteger(row.endYear) ? row.endYear : null;
    return {
      original: string(row.sourceTenureText)||string(row.dateNote),startYear,endYear,
      precision:startYear!==null&&endYear!==null?(startYear===endYear?'year':'range'):'unknown',
      // Migration does not infer chronological certainty from factual status.
      certainty:'unknown',basis:'',
    };
  };
  const appointment = (raw,decision,status,citations) => {
    const row = published.get(raw.id) || {...raw,...decision?.correction};
    const duplicateOf = decision?.corroboratesAppointmentId || null;
    return {...header(raw.id,status,status==='verified'?'reader':'private',string(decision?.reason)||string(raw.reason)),
      kind:'appointment',personId:canonicalPersonId(row.personId),
      officeId:string(row.officeId)||null,officeName:string(row.officeName),
      nature:string(row.appointmentStatus)||string(row.relationshipType)||'待考',
      polity:string(row.polity),jurisdiction:string(row.jurisdiction),
      date:date(row),duplicateOf,
      disposition:duplicateOf?'duplicate':status==='excluded'?'legacy-suppressed':'none',
      evidence:links(citations),
    };
  };
  const appointments = publication.sourceRows.map(raw => {
    const decision = decisions.get(raw.id);
    const status = decision?.status === 'suppressed' ? 'excluded' : published.has(raw.id) ? 'verified'
      : decision?.disposition === 'disputed' || /争议|冲突|反证/.test((raw.researchStatus||'')+' '+(raw.homonymStatus||'')) ? 'disputed' : 'pending';
    const citations = published.get(raw.id)?.citations || [
      {title:raw.sourceLocator||raw.sourceWork,url:raw.sourceUrl,quote:raw.sourceExcerpt},
      ...(decision?.citations||[]),
    ];
    return appointment(raw,decision,status,citations);
  });
  for (const batch of loadSupplementBatches(root)) {
    const evidence = new Map(batch.evidence.records.map(r=>[r.id,r]));
    for (const raw of batch.decisions.records) {
      const source = evidence.get(raw.evidenceId);
      if (!source) throw new Error('Missing supplement source: '+raw.id);
      const citations = published.get(raw.id)?.citations || [
        source,...(raw.supportingEvidence||[]).map(e=>{
          const item = evidence.get(e.id);
          if (!item) throw new Error('Missing supporting source: '+e.id);
          return item;
        }),
      ];
      appointments.push(appointment(raw,raw,raw.status==='suppressed'?'excluded':raw.status,citations));
    }
  }
  if (new Set(appointments.map(r=>r.id)).size!==appointments.length) throw new Error('Appointment ID collision');
  const sourceCounts = appointmentStatusCounts(publication.sourceRows,publication.review,publication.supplement,new Set(published.keys()));
  const expectedCounts = release.counts.appointments;
  for (const status of Object.keys(expectedCounts)) {
    if (sourceCounts[status]!==expectedCounts[status]) throw new Error('Baseline appointment count changed: '+status);
  }
  const sourceRows = sorted(sources.values());
  const records = sorted([...people,...appointments,...sourceRows]);
  const currentPersonIds = new Set(people.map(r=>r.id));
  const unresolvedReferences = appointments.filter(r=>!currentPersonIds.has(r.personId)).map(r=>({appointmentId:r.id,personId:r.personId}));
  const manifest = Object.fromEntries(Object.entries(archives).map(([name,a])=>[name,{sha256:a.sha256,bytes:a.bytes}]));
  return {
    schemaVersion:1,importer:IMPORTER_VERSION,baselineCommit:BASELINE_COMMIT,
    inputDigest:hash(JSON.stringify(manifest)),manifest,archives,records,
    identityMaps:{legacyToCanonical:registry.legacyToCanonical,sourceRecordToCanonical:registry.sourceRecordToCanonical},
    readerBaseline:{people:reader,relations},
    report:{
      dataVersion:release.version,readerPeople:reader.people.length,people:people.length,
      appointments:appointments.length,appointmentCounts:sourceCounts,sources:sourceRows.length,
      unresolvedReferences,
      dataAuthority:'atlas',
      writeCutover:false,
      preservedOnly:['person field reviews and biographies','peerage','offices and titles','fangzhen','epigraphy','residences','battles','economy','map periods and geometry'],
      note:'唯讀遷移候選；尚未匯入資料庫。原文完整保存；其餘領域仍使用 atlas 與既有發布政策。',
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const snapshot = readLegacyBaseline();
  const output = process.argv[2];
  if (!output) {
    console.log(JSON.stringify(snapshot.report,null,2));
  } else {
    const destination = path.resolve(output);
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
    const allowed = path.join(root,'work','migration')+path.sep;
    if (!destination.startsWith(allowed)) throw new Error('Write shadow artifacts only inside ignored work/migration/');
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    // Explicitly refuse overwriting a previous migration candidate.
    fs.writeFileSync(destination,JSON.stringify(snapshot)+'\n',{encoding:'utf8',flag:'wx'});
    console.log(JSON.stringify({output:destination,inputDigest:snapshot.inputDigest,...snapshot.report},null,2));
  }
}
