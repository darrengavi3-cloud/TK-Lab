import { CATALOGUE_MODEL, PUBLICATION_POLICY, DomainError, isReaderCandidate, isVerifiedFact, type CatalogueRecord, type Person, type Appointment, type Source } from "./catalogue";
import { canonicalJson, sha256, fixedSnapshot, type Revision } from "./revisions";
export interface ReaderCitation { title: string; edition: string; locator: string; quote: string; url: string; role: string; note: string }
export interface ReaderPerson { personId: string; name: string; aliases: string[]; assessment: string }
export interface ReaderAppointment { appointmentId: string; personId: string; officeId: string | null; officeName: string; nature: string; polity: string; jurisdiction: string; startYear: number | null; endYear: number | null; dateText: string; assessment: string; citations: ReaderCitation[] }
export interface ReaderProjection { people: ReaderPerson[]; appointments: ReaderAppointment[] }
function personDto(row: Person): ReaderPerson {
  return {personId:row.id,name:row.name,aliases:row.aliasPublication === "verified" ? [...row.aliases] : [],assessment:row.assessment};
}
function appointmentDto(row: Appointment, sourceHistory: ReadonlyMap<string,Source>): ReaderAppointment {
  const citations = row.evidence.map(e => {
    const source = sourceHistory.get(e.sourceId+"@"+e.sourceRevision);
    if (!source) throw new DomainError("source-reference","發布引用缺少固定的原文修訂。");
    if (source.visibility !== "reader" || source.assessment === "excluded") throw new DomainError("private-source","欲發布的事實引用了未允許讀者閱讀的史料。");
    return {title:source.title,edition:source.edition,locator:source.locator,quote:source.text,url:source.url,role:e.role,note:e.note};
  });
  return {appointmentId:row.id,personId:row.personId,officeId:row.officeId,officeName:row.officeName,nature:row.nature,polity:row.polity,jurisdiction:row.jurisdiction,startYear:row.date.startYear,endYear:row.date.endYear,dateText:row.date.original,assessment:row.assessment,citations};
}
/** Explicit whitelist; raw working records must never become reader payloads. */
export function projectReader(records: readonly CatalogueRecord[], sourceHistory: ReadonlyMap<string,Source>, options: {includeCandidates: boolean}): ReaderProjection {
  const visible = (row: CatalogueRecord) => isReaderCandidate(row) && (options.includeCandidates || isVerifiedFact(row));
  const people = records.filter((r):r is Person=>r.kind==="person"&&visible(r)).map(personDto);
  const personIds = new Set(people.map(r=>r.personId));
  const appointments = records.filter((r):r is Appointment=>r.kind==="appointment"&&visible(r)).map(row=>{
    if (!personIds.has(row.personId)) throw new DomainError("private-person","任官引用的人物尚未列入此讀者版本。");
    // Explicitly reviewed duplicates add evidence to their target, never another fact.
    const combined = [...row.evidence];
    for (const duplicate of records) {
      if (duplicate.kind !== "appointment" || duplicate.disposition !== "duplicate" || duplicate.duplicateOf !== row.id) continue;
      if (duplicate.assessment !== "excluded" || duplicate.personId !== row.personId || duplicate.officeName !== row.officeName || duplicate.date.startYear !== row.date.startYear || duplicate.date.endYear !== row.date.endYear) throw new DomainError("duplicate-target","互證目標與事實不符。");
      for (const link of duplicate.evidence) {
        if (!combined.some(e=>e.sourceId===link.sourceId&&e.sourceRevision===link.sourceRevision&&e.role===link.role&&e.note===link.note)) combined.push(link);
      }
    }
    return appointmentDto({...row,evidence:combined},sourceHistory);
  });
  return {people,appointments};
}
export interface Candidate {
  id: string; digest: string; watermark: number; codeCommit: string; assetsDigest: string;
  model: number; policy: string; records: {id:string;revision:number;digest:string}[];
  artifactDigest: string; evidenceRevisions: {id:string;revision:number;digest:string}[];
}
export async function makeCandidate(history: readonly Revision[], watermark: number, codeCommit: string, assetsDigest: string, artifact: unknown): Promise<Candidate> {
  if (!/^[a-f0-9]{40}$/.test(codeCommit) || !/^[a-f0-9]{64}$/.test(assetsDigest)) throw new DomainError("provenance","發布須固定完整程式提交與資產摘要。");
  const snapshot = fixedSnapshot(history,watermark);
  // Verify bytes instead of trusting an old stored digest.
  for (const revision of snapshot) {
    if (revision.id !== revision.data.id || await sha256(canonicalJson(revision.data)) !== revision.digest) throw new DomainError("integrity","修訂內容與摘要不符。");
  }
  const evidenceRevisions = new Map<string,{id:string;revision:number;digest:string}>();
  for (const record of snapshot) for (const e of record.data.evidence) {
    const source = history.find(r=>r.id===e.sourceId&&r.number===e.sourceRevision&&r.commit<=watermark&&r.data.kind==="source");
    if (!source || await sha256(canonicalJson(source.data)) !== source.digest) throw new DomainError("source-reference","候選缺少引用的固定史料修訂。");
    evidenceRevisions.set(e.sourceId+"@"+e.sourceRevision,{id:source.id,revision:source.number,digest:source.digest});
  }
  const pinnedEvidence = [...evidenceRevisions.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,v])=>v);
  const content = {watermark,evidenceRevisions:pinnedEvidence,codeCommit,assetsDigest,model:CATALOGUE_MODEL,policy:PUBLICATION_POLICY,records:snapshot.map(r=>({id:r.id,revision:r.number,digest:r.digest})),artifactDigest:await sha256(canonicalJson(artifact))};
  const digest = await sha256(canonicalJson(content));
  return {id:"release:"+digest,digest,...content};
}
export interface Approval { candidateId: string; digest: string; actor: string; at: string }
export function approve(candidate: Candidate, reviewedDigest: string, actor: string, at: string): Approval {
  if (reviewedDigest !== candidate.digest || !actor.trim() || !Number.isFinite(Date.parse(at))) throw new DomainError("approval","確認只能用於剛預覽的精確發布候選。");
  return {candidateId:candidate.id,digest:reviewedDigest,actor,at};
}
export interface DeploymentReceipt {
  state: "succeeded"; candidateId: string; candidateDigest: string; codeCommit: string;
  archiveDigest: string; versionId: string; versionNumber: number; deploymentId: string; completedAt: string;
}
/** Pure validation, never manufactures or retrieves a Sites deployment receipt. */
export function acceptReceipt(candidate: Candidate, approval: Approval, receipt: DeploymentReceipt): DeploymentReceipt {
  if (approval.candidateId !== candidate.id || approval.digest !== candidate.digest
    || receipt.state !== "succeeded" || receipt.candidateId !== candidate.id || receipt.candidateDigest !== candidate.digest
    || receipt.codeCommit !== candidate.codeCommit || !/^[a-f0-9]{64}$/.test(receipt.archiveDigest)
    || !receipt.versionId || !receipt.deploymentId || !Number.isSafeInteger(receipt.versionNumber) || receipt.versionNumber < 1
    || !Number.isFinite(Date.parse(receipt.completedAt))) throw new DomainError("receipt","尚無與此候選相符的成功部署回執。");
  return {...receipt};
}
