import { DomainError, validateRecord, type CatalogueRecord } from "./catalogue";

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw new DomainError("json","稀疏清單不可作為修訂內容。");
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (typeof value === "object" && value && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    return "{" + Object.keys(value).sort().map(k => JSON.stringify(k)+":"+canonicalJson((value as Record<string,unknown>)[k])).join(",") + "}";
  }
  throw new DomainError("json","修訂只能包含完整的 JSON 值。");
}
export async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,"0")).join("");
}
export interface Revision<T extends CatalogueRecord = CatalogueRecord> {
  id: string; number: number; commit: number; actor: string; at: string;
  reason: string; digest: string; data: T;
}
export interface Change<T extends CatalogueRecord = CatalogueRecord> {
  baseRevision: number; data: T; reviewedContentDigest?: string;
}
export interface RevisionContext { commit: number; actor: string; at: string; reason: string }
/**
 * Pure decision function. Persistence must compare baseRevision again inside its
 * transaction and append revision+commit together. This is not a database adapter.
 */
export async function prepareRevision<T extends CatalogueRecord>(previous: Revision<T> | null, change: Change<T>, context: RevisionContext): Promise<Revision<T>> {
  if (!Number.isSafeInteger(change.baseRevision) || change.baseRevision < 0 || change.baseRevision !== (previous?.number ?? 0)) throw new DomainError("conflict","記錄已有新修訂；請比較內容後再保存。");
  if (previous && (previous.id !== change.data.id || previous.data.kind !== change.data.kind)) throw new DomainError("identity","修訂不可更換穩定 ID 或記錄類型。");
  if (!Number.isSafeInteger(context.commit) || context.commit <= (previous?.commit ?? 0) || !context.actor.trim() || !context.reason.trim() || !Number.isFinite(Date.parse(context.at))) throw new DomainError("context","修訂須有提交序號、操作者、時間及理由。");
  const data = JSON.parse(canonicalJson(change.data)) as T;
  validateRecord(data);
  const digest = await sha256(canonicalJson(data));
  // A changed verified assertion cannot inherit the old review accidentally.
  if (data.assessment === "verified" && digest !== previous?.digest && change.reviewedContentDigest !== digest) throw new DomainError("review-required","核定只適用於已檢查的精確內容；請重新確認此修訂。");
  return {id:data.id,number:change.baseRevision+1,commit:context.commit,actor:context.actor,at:context.at,reason:context.reason,digest,data};
}
export function fixedSnapshot(history: readonly Revision[], watermark: number): Revision[] {
  if (!Number.isSafeInteger(watermark) || watermark < 0) throw new DomainError("watermark","快照序號無效。");
  const chosen = new Map<string,Revision>();
  const versions = new Set<string>();
  for (const revision of history) {
    const key = revision.id+"@"+revision.number;
    if (versions.has(key)) throw new DomainError("history","修訂歷史存在重複版本。");
    versions.add(key);
    if (revision.commit <= watermark && (!chosen.has(revision.id) || chosen.get(revision.id)!.number < revision.number)) chosen.set(revision.id,revision);
  }
  return [...chosen.values()].sort((a,b)=>a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(r=>JSON.parse(canonicalJson(r)) as Revision);
}
export async function importIdentity(fileSha256: string, importer: string, mapping: unknown): Promise<string> {
  if (!/^[a-f0-9]{64}$/.test(fileSha256) || !importer.trim()) throw new DomainError("import-identity","匯入須固定原檔摘要與匯入器版本。");
  return sha256(canonicalJson({fileSha256,importer,mapping}));
}
