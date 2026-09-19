/**
 * Catalogue v1: owner-managed working records. This module has no storage,
 * framework or DOM dependency. Reader eligibility is not factual verification.
 */
export const CATALOGUE_MODEL = 1 as const;
export const PUBLICATION_POLICY = "r1-compatible-v1";
export type Assessment = "pending" | "verified" | "disputed" | "excluded";
export type Workflow = "draft" | "review" | "ready";
export type Disposition = "none" | "incorrect" | "duplicate" | "not-held" | "out-of-scope" | "legacy-suppressed";
export interface HistoricalDate {
  original: string;
  startYear: number | null;
  endYear: number | null;
  precision: "unknown" | "year" | "range";
  certainty: "unknown" | "certain" | "inferred";
  basis: string;
}
export interface Evidence {
  sourceId: string;
  sourceRevision: number;
  role: "support" | "counter" | "variant";
  note: string;
}
export interface Header {
  id: string;
  assessment: Assessment;
  workflow: Workflow;
  visibility: "private" | "reader";
  disposition: Disposition;
  reason: string;
  evidence: Evidence[];
}
export interface Person extends Header {
  kind: "person";
  name: string;
  aliases: string[];
  aliasPublication: "private" | "verified";
  legacyIds: string[];
}
export interface Appointment extends Header {
  kind: "appointment";
  personId: string;
  officeId: string | null;
  officeName: string;
  nature: string;
  polity: string;
  jurisdiction: string;
  date: HistoricalDate;
  duplicateOf: string | null;
  /** Absent on v1 revisions; existing reviewed office mappings remain explicit defaults. */
  readerLinks?: AppointmentReaderLinks;
}
export interface AppointmentReaderLinks {
  offices: string[];
  fangzhen: null | {
    recordId: string | null;
    polityKey: 'han' | 'wei' | 'shu' | 'wu' | 'jin' | 'eastjin';
    recordType: 'cishi' | 'taishou' | 'junshou' | 'dudu' | 'duwei' | 'other';
    /** Optional additive V2 classification. Absence preserves v1/V86 behaviour. */
    powerKinds?: ('administrative' | 'military_title' | 'military_command' | 'delegated_power')[];
    administrativeUnitId: string | null;
  };
}
export interface Source extends Header {
  kind: "source";
  title: string;
  edition: string;
  locator: string;
  text: string;
  textScope: "excerpt" | "full";
  url: string;
}
export type CatalogueRecord = Person | Appointment | Source;
export class DomainError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
function requireValue(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new DomainError(code, message);
}
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9:_.@/-]{0,199}$/;
const text = (value: unknown): value is string => typeof value === "string";
const id = (value: unknown): value is string => text(value) && idPattern.test(value);
const integerYear = (value: unknown) => value === null || (Number.isInteger(value) && Number(value) >= -5000 && Number(value) <= 5000);

export function validateDate(value: HistoricalDate): HistoricalDate {
  requireValue(value && typeof value === "object", "date", "年代資料必須完整。");
  requireValue(text(value.original) && text(value.basis), "date", "保留原始年代及換算依據。");
  requireValue(integerYear(value.startYear) && integerYear(value.endYear), "date", "未知年份使用空值，不以其他日期代填。");
  requireValue(value.startYear === null || value.endYear === null || value.startYear <= value.endYear, "date", "起年不可晚於迄年。");
  requireValue(["unknown","year","range"].includes(value.precision) && ["unknown","certain","inferred"].includes(value.certainty), "date", "年代精度或確定性無效。");
  requireValue(value.precision !== "year" || (value.startYear !== null && value.startYear === value.endYear), "date", "單年精度須有相同的已知起訖年。");
  requireValue(value.certainty !== "inferred" || value.basis.trim(), "date", "推定年代須記錄推定依據。");
  return value;
}
export function validateRecord(value: CatalogueRecord): CatalogueRecord {
  requireValue(value && typeof value === "object" && !Array.isArray(value), "record", "記錄格式無效。");
  requireValue(id(value.id), "id", "必須保留有效的穩定 ID。");
  requireValue(["person","appointment","source"].includes(value.kind), "kind", "未知資料類型。");
  requireValue(["pending","verified","disputed","excluded"].includes(value.assessment), "assessment", "未知史實判斷。");
  requireValue(["draft","review","ready"].includes(value.workflow), "workflow", "未知整理狀態。");
  requireValue(["private","reader"].includes(value.visibility), "visibility", "未知顯示政策。");
  requireValue(["none","incorrect","duplicate","not-held","out-of-scope","legacy-suppressed"].includes(value.disposition), "disposition", "未知處置性質。");
  requireValue(text(value.reason), "reason", "審定理由須為文字。");
  requireValue(value.assessment !== "excluded" || (value.disposition !== "none" && value.reason.trim()), "disposition", "排除記錄須保留處置性質及理由。");
  requireValue(value.assessment === "excluded" || value.disposition === "none", "disposition", "非排除記錄不可帶有排除處置。");
  requireValue(Array.isArray(value.evidence), "evidence", "引用清單不可缺失。");
  const seen = new Set<string>();
  for (const e of value.evidence) {
    requireValue(e && id(e.sourceId) && Number.isSafeInteger(e.sourceRevision) && e.sourceRevision > 0 && ["support","counter","variant"].includes(e.role) && text(e.note), "evidence", "引用須固定史料修訂及用途。");
    const key = JSON.stringify([e.sourceId,e.sourceRevision,e.role]);
    requireValue(!seen.has(key), "duplicate-evidence", "重複引用不可重複計數。");
    seen.add(key);
  }
  if (value.kind === "person") {
    requireValue(text(value.name) && value.name.trim(), "name", "人物須有名稱。");
    requireValue(Array.isArray(value.aliases) && value.aliases.every(text), "aliases", "別名須為文字清單。");
    requireValue(["private","verified"].includes(value.aliasPublication), "alias-policy", "別名須有獨立的發布判斷。");
    requireValue(Array.isArray(value.legacyIds) && value.legacyIds.every(id) && new Set(value.legacyIds).size === value.legacyIds.length, "legacy-ids", "舊身份 ID 不可重複或無效。");
  } else if (value.kind === "appointment") {
    requireValue(id(value.personId) && (value.officeId === null || id(value.officeId)), "reference", "任官須使用明確的人物及官職 ID。");
    requireValue(text(value.officeName) && value.officeName.trim() && text(value.nature) && text(value.polity) && text(value.jurisdiction), "appointment", "須保留原始官名及任職性質。");
    validateDate(value.date);
    requireValue(value.duplicateOf === null || (id(value.duplicateOf) && value.duplicateOf !== value.id), "duplicate-target", "互證須指向另一條任官。");
    requireValue((value.disposition === "duplicate") === (value.duplicateOf !== null), "duplicate-target", "互證目標與重複處置必須同時登記。");
    requireValue(value.assessment !== "verified" || (value.reason.trim() && value.evidence.some(e => e.role === "support")), "review", "核定任官須有審定理由與支持史料。");
    if (value.readerLinks !== undefined) {
      const links = value.readerLinks;
      requireValue(links && Array.isArray(links.offices) && links.offices.length <= 20 && links.offices.every(id) && new Set(links.offices).size === links.offices.length, 'reader-links', '官職關聯須選擇不重複的既有官職。');
      const f = links.fangzhen;
      requireValue(f === null || (f && (f.recordId === null || id(f.recordId)) && ['han','wei','shu','wu','jin','eastjin'].includes(f.polityKey) && ['cishi','taishou','junshou','dudu','duwei','other'].includes(f.recordType) && (!f.powerKinds || (Array.isArray(f.powerKinds) && f.powerKinds.every(k => ['administrative','military_title','military_command','delegated_power'].includes(k)))) && (f.administrativeUnitId === null || id(f.administrativeUnitId))), 'reader-links', '州鎮關聯須填寫政權、職任類型及有效識別碼。');
      requireValue(!f || value.jurisdiction.trim(), 'reader-links', '同步到州鎮表前，請填寫轄區。');
    }
  } else {
    requireValue(text(value.title) && value.title.trim() && text(value.edition) && text(value.locator) && text(value.text) && text(value.url), "source", "史料須保留題名、版本、定位與原文。");
    requireValue(["excerpt","full"].includes(value.textScope), "source-scope", "節引不可冒稱全文。");
    requireValue(!value.url || /^https?:\/\//i.test(value.url), "source-url", "史料網址須使用 HTTP 或 HTTPS。");
    requireValue(value.evidence.length === 0, "source-evidence", "原文版本不使用事實引用欄。");
  }
  return value;
}
export function isReaderCandidate(record: Header): boolean {
  return record.visibility === "reader" && record.assessment !== "excluded" && record.disposition === "none";
}
export function isVerifiedFact(record: Header): boolean {
  return record.assessment === "verified" && record.disposition === "none";
}
export function holdsOfficeInYear(record: Appointment, year: number): boolean {
  validateRecord(record);
  const notHeld = /未拜|不拜|未受|不受|未就|不就|未赴|不赴|未任|未上任|追贈|追赠/.test(record.nature);
  return Number.isInteger(year) && !notHeld && isVerifiedFact(record) && record.date.certainty === "certain"
    && record.date.startYear !== null && record.date.endYear !== null
    && record.date.startYear <= year && year <= record.date.endYear;
}
/** Alias search never performs an identity merge. */
export function resolvePersonId(personId: string, aliases: ReadonlyMap<string,string>): string {
  const seen = new Set<string>();
  let current = personId;
  while (aliases.has(current)) {
    requireValue(!seen.has(current), "identity-cycle", "身份映射存在循環。");
    seen.add(current);
    current = aliases.get(current)!;
  }
  return current;
}
/** All callers check references before admitting a staged batch. */
export function validateLinks(records: readonly CatalogueRecord[], sourceRevisions: ReadonlySet<string>): void {
  const byId = new Map<string,CatalogueRecord>();
  for (const record of records) {
    validateRecord(record);
    requireValue(!byId.has(record.id), "duplicate-id", "穩定 ID 不可重複。");
    byId.set(record.id,record);
  }
  const oldIds = new Map<string,string>();
  for (const record of records) {
    if (record.kind === "person") for (const oldId of record.legacyIds) {
      requireValue(oldId === record.id || !byId.has(oldId), "identity-alias", "舊 ID 不可覆蓋另一活動記錄。");
      requireValue(!oldIds.has(oldId) || oldIds.get(oldId) === record.id, "identity-alias", "同一舊 ID 不可指向多個人物。");
      oldIds.set(oldId,record.id);
    }
    if (record.kind === "appointment") {
      requireValue(byId.get(record.personId)?.kind === "person", "person-reference", "任官人物不存在。");
      if (record.duplicateOf) {
        const target = byId.get(record.duplicateOf);
        requireValue(target?.kind === "appointment" && target.disposition === "none" && target.personId === record.personId && target.officeName === record.officeName && target.date.startYear === record.date.startYear && target.date.endYear === record.date.endYear, "duplicate-target", "互證目標須為同一人物的一條未排除任官。");
      }
    }
    for (const e of record.evidence) {
      requireValue(byId.get(e.sourceId)?.kind === "source" && sourceRevisions.has(e.sourceId + "@" + e.sourceRevision), "source-reference", "引用的史料修訂不存在。");
    }
  }
}
