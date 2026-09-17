export interface CatalogueEnv { DB?: D1Database; BUCKET?: R2Bucket; ASSETS?: Fetcher; ADMIN_OWNER_ID?: string; ADMIN_OWNER_EMAIL?: string }
export class HttpError extends Error {
  status: number; details: unknown;
  constructor(status: number, message: string, details?: unknown) { super(message); this.status=status; this.details=details; }
}
export function check(ok: unknown, message: string, status=422): asserts ok { if(!ok) throw new HttpError(status,message); }
export function storage(env: CatalogueEnv) {
  check(env.DB&&env.BUCKET,'資料服務暫時無法使用，請稍後重試。',503);
  return {db:env.DB,bucket:env.BUCKET};
}
export async function setting(db:D1Database,key:string):Promise<string|null>{ return (await db.prepare('SELECT value FROM catalogue_settings WHERE key=?').bind(key).first<{value:string}>())?.value??null; }
