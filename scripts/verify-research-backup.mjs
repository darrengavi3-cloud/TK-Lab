import {createHash} from 'node:crypto';
const canonical = value => JSON.stringify(sort(value));
function sort(value) {return Array.isArray(value) ? value.map(sort) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, sort(value[k])])) : value;}
const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
const requireValue = (condition, message) => {if (!condition) throw new Error(message);};
const collections = ['tenures','events','claims','evidence','factualConflicts','textualVariants'];
const key = (...parts) => JSON.stringify(parts);
/** Integrity and relational completeness only; this does not perform historical review. */
export function verifyResearchBackup(data) {
  const revisions = data.catalogue_research_revisions;
  const members = data.catalogue_research_members;
  const pins = data.catalogue_research_pins;
  requireValue(Array.isArray(revisions) && Array.isArray(members) && Array.isArray(pins), '研究備份資料表缺失。');
  const original = new Map(data.catalogue_revisions.map(r => [key(r.id, r.version), r]));
  const records = new Map(data.catalogue_records.map(r => [r.id, r.kind]));
  const versions = new Map(), requests = new Set(), expectedMembers = new Map(), expectedPins = new Map();
  for (const row of revisions) {
    const graph = JSON.parse(row.graph), manifest = JSON.parse(row.manifest);
    const revisionKey = key(row.person_id, row.version);
    requireValue(!versions.has(revisionKey) && !requests.has(row.request_id) && row.guard === 1
      && Number.isSafeInteger(row.version) && row.version > 0 && records.get(row.person_id) === 'person'
      && data.catalogue_commits.some(c => c.seq === row.catalogue_watermark), '研究修訂身份或版本無效。');
    versions.set(revisionKey, row);requests.add(row.request_id);
    requireValue(graph.model === 1 && graph.personId === row.person_id && hash(graph) === row.graph_digest
      && manifest.format === 'research-journal-1' && manifest.personId === row.person_id
      && manifest.catalogueWatermark === row.catalogue_watermark && manifest.graphDigest === row.graph_digest
      && hash(manifest) === row.manifest_digest && Array.isArray(manifest.pins), '研究修訂內容摘要不一致。');
    for (const kind of collections) {
      requireValue(Array.isArray(graph[kind]), '研究圖缺少資料集合。');
      for (const value of graph[kind]) {
        const memberKey = key(row.person_id, row.version, kind, value.id);
        requireValue(!expectedMembers.has(memberKey), '研究索引重複。');
        expectedMembers.set(memberKey, canonical(value));
      }
    }
    let hasPerson = false;
    for (const pin of manifest.pins) {
      const origin = original.get(key(pin.id, pin.revision));
      const pinKey = key(row.person_id, row.version, pin.id, pin.revision);
      requireValue(!expectedPins.has(pinKey) && origin && origin.commit_seq <= row.catalogue_watermark
        && origin.digest === pin.digest && records.get(pin.id) === pin.kind
        && hash(JSON.parse(origin.payload)) === pin.digest, '研究固定引文缺失或被改寫。');
      hasPerson ||= pin.kind === 'person' && pin.id === row.person_id;
      expectedPins.set(pinKey, canonical({kind: pin.kind, digest: pin.digest}));
    }
    requireValue(hasPerson, '研究備份未固定人物修訂。');
    const cited = [...graph.evidence.map(e => e.source), ...graph.textualVariants.flatMap(v => v.readings.map(r => r.source)), ...graph.tenures.flatMap(t => t.legacyOrigin ? [t.legacyOrigin] : [])];
    for (const pin of cited) requireValue(manifest.pins.some(p => p.id === pin.id && p.revision === pin.revision && p.digest === pin.digest), '研究圖與固定引文清單不一致。');
  }
  for (const row of revisions) if (row.version > 1) requireValue(versions.has(key(row.person_id, row.version - 1)), '研究修訂歷史不連續。');
  for (const row of members) {
    const k = key(row.person_id, row.version, row.kind, row.id);
    requireValue(expectedMembers.get(k) === canonical(JSON.parse(row.payload)), '研究實體索引與修訂不一致。');
    expectedMembers.delete(k);
  }
  for (const row of pins) {
    const k = key(row.person_id, row.version, row.record_id, row.record_version);
    requireValue(expectedPins.get(k) === canonical({kind: row.kind, digest: row.digest}), '研究引用索引與修訂不一致。');
    expectedPins.delete(k);
  }
  requireValue(expectedMembers.size === 0 && expectedPins.size === 0, '研究備份缺少實體或引用索引。');
}
