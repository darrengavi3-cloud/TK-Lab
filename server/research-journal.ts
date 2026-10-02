import {canonicalJson, sha256, type Revision} from '../domain/revisions';
import {personResearchRows} from '../domain/prosopography/legacy';
import {decodeJournal, journalManifest, researchMembers, requiresResearchReview, validateLegacyClaims, type JournalRow} from '../domain/prosopography/journal';
import type {ResearchGraph} from '../domain/prosopography/types';
import {inspectPersonResearch, previewPersonResearch, type ResearchRepository} from './research-preview';
import {check, HttpError} from './storage';

export interface SaveResearchInput {
  requestId: string;
  baseRevision: number;
  watermark: number;
  graph: ResearchGraph;
  inspectedGraphDigest: string;
  reviewedContentDigest?: string;
  reason: string;
}
export const JOURNAL_TABLES = ['catalogue_research_revisions', 'catalogue_research_members', 'catalogue_research_pins'] as const;
export async function researchStorageReady(db: D1Database): Promise<boolean> {
  const rows = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('catalogue_research_revisions','catalogue_research_members','catalogue_research_pins')").all<{name: string}>()).results;
  check(rows.length === 0 || rows.length === JOURNAL_TABLES.length, '研究資料表不完整，請先修復遷移。', 503);
  return rows.length === JOURNAL_TABLES.length;
}
async function ready(db: D1Database) {
  check(await researchStorageReady(db), '研究保存尚未啟用；須先備份並套用 0003_research_journal 遷移。', 503);
}
function personId(id: string) {check(typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_.@/-]{0,199}$/.test(id), '人物 ID 無效。');}
export async function getResearchRevision(db: D1Database, id: string, version?: number) {
  personId(id);
  check(version === undefined || (Number.isSafeInteger(version) && version > 0), '修訂序號無效。');
  await ready(db);
  const row = await db.prepare('SELECT * FROM catalogue_research_revisions WHERE person_id=? ' + (version === undefined ? 'ORDER BY version DESC' : 'AND version=?') + ' LIMIT 1').bind(...(version === undefined ? [id] : [id, version])).first<JournalRow>();
  return row ? decodeJournal(row) : null;
}
export async function researchHistory(db: D1Database, id: string, before?: number) {
  personId(id);check(before === undefined || (Number.isSafeInteger(before) && before > 0), '歷史游標無效。');
  await ready(db);
  const rows = (await db.prepare('SELECT person_id,version,catalogue_watermark,graph_digest,manifest_digest,actor,reason,at FROM catalogue_research_revisions WHERE person_id=? ' + (before === undefined ? '' : 'AND version<? ') + 'ORDER BY version DESC LIMIT 41').bind(...(before === undefined ? [id] : [id, before])).all<{version: number}>()).results;
  return {rows: rows.slice(0, 40), nextBefore: rows.length > 40 ? rows[39].version : null};
}
/** One request caches immutable catalogue revisions; no read falls forward to a newer source. */
function captureRepository(repo: ResearchRepository) {
  const reads = new Map<string, Promise<Revision | null>>();
  const snapshots = new Map<number, Promise<Revision[]>>();
  const fixed: ResearchRepository = {
    watermark: () => repo.watermark(),
    snapshot(seq) {
      if (!snapshots.has(seq)) snapshots.set(seq, repo.snapshot(seq).then(rows => JSON.parse(canonicalJson(rows)) as Revision[]));
      return snapshots.get(seq)!;
    },
    getRevision(id, version) {
      const key = id + '@' + version;
      if (!reads.has(key)) reads.set(key, repo.getRevision(id, version).then(row => row ? JSON.parse(canonicalJson(row)) as Revision : null));
      return reads.get(key)!;
    },
  };
  return {repo: fixed, async sourceRows() {return (await Promise.all(reads.values())).filter((r): r is Revision => r !== null);}};
}
export async function saveResearch(db: D1Database, sourceRepo: ResearchRepository, actor: string, value: SaveResearchInput) {
  // Detach before the first await. An in-flight caller must not change what was validated.
  const input = JSON.parse(canonicalJson(value)) as SaveResearchInput;
  check(input && !Array.isArray(input) && typeof input === 'object', '研究保存內容無效。');
  check(typeof actor === 'string' && actor.trim(), '缺少操作者。', 403);
  check(typeof input.requestId === 'string' && /^[a-zA-Z0-9:-]{8,160}$/.test(input.requestId), '操作識別碼無效。');
  check(Number.isSafeInteger(input.baseRevision) && input.baseRevision >= 0, '基礎修訂無效。');
  check(Number.isSafeInteger(input.watermark) && input.watermark > 0, '保存必須指定已存在的資料快照。');
  check(typeof input.reason === 'string' && input.reason.trim() && input.reason.length <= 4000, '請填寫修訂理由（最多 4000 字元）。');
  check(input.graph && typeof input.graph === 'object', '缺少研究圖。');
  personId(input.graph.personId);
  check(new TextEncoder().encode(canonicalJson(input)).length <= 1024 * 1024, '研究資料超過 1 MiB，請拆分整理。', 413);
  await ready(db);
  const requestHash = await sha256(canonicalJson({actor, input}));
  const replay = async () => {
    const row = await db.prepare('SELECT * FROM catalogue_research_revisions WHERE request_id=?').bind(input.requestId).first<JournalRow>();
    if (!row) return null;
    check(row.request_hash === requestHash && row.actor === actor, '操作識別碼已用於另一內容。', 409);
    return {persisted: true as const, published: false as const, replayed: true, revision: await decodeJournal(row)};
  };
  const done = await replay();if (done) return done;
  const previous = await getResearchRevision(db, input.graph.personId);
  check((previous?.number ?? 0) === input.baseRevision, '已有新研究修訂；請比較後再保存。', 409);
  const captured = captureRepository(sourceRepo);
  const inspected = await inspectPersonResearch(captured.repo, {graph: input.graph, watermark: input.watermark});
  check(input.inspectedGraphDigest === inspected.graphDigest, '內容已改變，請重新校驗後保存。', 409);
  if (requiresResearchReview(input.graph)) check(input.reviewedContentDigest === inspected.graphDigest, '採擇或核定須確認此份精確內容；結構校驗不等於史實核定。');
  const original = await previewPersonResearch(captured.repo, input.graph.personId, input.watermark);
  validateLegacyClaims(input.graph, original.graph);
  const snapshot = await captured.repo.snapshot(input.watermark);
  const originalIds = new Map(snapshot.map(r => [r.id, r.data]));
  for (const tenure of input.graph.tenures) {
    const existing = originalIds.get(tenure.id);
    check(!existing || (existing.kind === 'appointment' && existing.personId === input.graph.personId), '既有識別碼不可借用於另一人物或資料類型。');
  }
  const origins = personResearchRows(snapshot, input.watermark, input.graph.personId);
  const manifest = await journalManifest(input.graph, input.watermark, [...origins, ...await captured.sourceRows()]);
  const graph = canonicalJson(input.graph), manifestText = canonicalJson(manifest), digest = await sha256(manifestText);
  const pins = canonicalJson(manifest.pins), members = canonicalJson(researchMembers(input.graph));
  const version = input.baseRevision + 1, id = input.graph.personId;
  const run = (sql: string, ...args: (string | number)[]) => db.prepare(sql).bind(...args);
  // D1 batch is the transaction. CAS and pinned revision guards execute inside it.
  const commands = [
    run(`INSERT INTO catalogue_research_revisions(person_id,version,request_id,request_hash,catalogue_watermark,graph,graph_digest,manifest,manifest_digest,actor,reason,at,guard)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,CASE WHEN COALESCE((SELECT MAX(version) FROM catalogue_research_revisions WHERE person_id=?),0)=?
      AND NOT EXISTS(SELECT 1 FROM json_each(?) p LEFT JOIN catalogue_revisions v ON v.id=json_extract(p.value,'$.id') AND v.version=json_extract(p.value,'$.revision')
        LEFT JOIN catalogue_records r ON r.id=v.id WHERE v.id IS NULL OR v.digest<>json_extract(p.value,'$.digest') OR v.commit_seq>? OR r.kind<>json_extract(p.value,'$.kind'))
      THEN 1 ELSE 0 END)`, id, version, input.requestId, requestHash, input.watermark, graph, inspected.graphDigest, manifestText, digest, actor, input.reason, new Date().toISOString(), id, input.baseRevision, pins, input.watermark),
    run("INSERT INTO catalogue_research_members(person_id,version,kind,id,payload) SELECT ?,?,json_extract(m.value,'$.kind'),json_extract(m.value,'$.id'),json_extract(m.value,'$.payload') FROM json_each(?) m", id, version, members),
    run("INSERT INTO catalogue_research_pins(person_id,version,record_id,record_version,kind,digest) SELECT ?,?,json_extract(p.value,'$.id'),json_extract(p.value,'$.revision'),json_extract(p.value,'$.kind'),json_extract(p.value,'$.digest') FROM json_each(?) p", id, version, pins),
  ];
  try {await db.batch(commands);} catch (error) {
    const raced = await replay();if (raced) return raced;
    if (/research_cas_guard|UNIQUE constraint failed: catalogue_research_revisions/.test(String(error))) throw new HttpError(409, '資料已被修改；本次保存已回滾，請重新比較。');
    throw error;
  }
  const revision = await getResearchRevision(db, id, version);
  check(revision, '保存後未能讀回修訂。', 503);
  return {persisted: true as const, published: false as const, replayed: false, revision};
}
