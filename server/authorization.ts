import { check, setting, type CatalogueEnv } from './storage';
/** Production identity is forwarded by trusted Sites dispatch, never read from a body. */
export async function owner(request:Request,env:CatalogueEnv):Promise<string>{
  const id=request.headers.get('oai-authenticated-user-id');
  check(id,'請先以擁有者帳戶登入。',401);
  const pinned=env.ADMIN_OWNER_ID||(env.DB?await setting(env.DB,'owner-id'):null);
  if(pinned){check(id===pinned,'此後台僅供擁有者使用。',403);return id;}
  const email=request.headers.get('oai-authenticated-user-email');
  check(env.ADMIN_OWNER_EMAIL&&email?.toLowerCase()===env.ADMIN_OWNER_EMAIL.toLowerCase(),'此帳戶沒有管理權限。',403);
  check(env.DB,'資料服務尚未就緒。',503);
  await env.DB.prepare("INSERT INTO catalogue_settings(key,value) VALUES('owner-id',?) ON CONFLICT(key) DO NOTHING").bind(id).run();
  check(await setting(env.DB,'owner-id')===id,'此後台僅供擁有者使用。',403);
  return id;
}
export function mutationGuard(request:Request):void{
  check(['POST','PUT'].includes(request.method),'不支援的操作。',405);
  check(request.headers.get('origin')===new URL(request.url).origin,'請從管理後台提交。',403);
  const site=request.headers.get('sec-fetch-site');
  check(!site||site==='same-origin','請從同一網站提交。',403);
  check(request.headers.get('x-catalogue-request')==='1','缺少操作來源標記。',403);
  check(!request.headers.has('next-action')&&!request.headers.has('x-rsc-action'),'不支援的操作。',405);
}
