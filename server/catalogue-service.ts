import {validateRecord,validateLinks,type CatalogueRecord,DomainError} from '../domain/catalogue';
import {canonicalJson,sha256,prepareRevision,type Revision} from '../domain/revisions';
import {check,HttpError} from './storage';
import {validateReaderLinks} from './reader-links';
export interface StoredRevision {id:string;version:number;commit_seq:number;payload:string;digest:string;actor:string;at:string;reason:string}
export const decode=(r:StoredRevision):Revision=>({id:r.id,number:r.version,commit:r.commit_seq,data:JSON.parse(r.payload),digest:r.digest,actor:r.actor,at:r.at,reason:r.reason});
export async function getRevision(db:D1Database,id:string,version?:number):Promise<Revision|null>{
  const r=await db.prepare('SELECT v.*,c.actor,c.at,c.reason FROM catalogue_revisions v JOIN catalogue_commits c ON c.seq=v.commit_seq WHERE v.id=? '+(version?'AND v.version=?':'ORDER BY v.version DESC')+' LIMIT 1').bind(...(version?[id,version]:[id])).first<StoredRevision>();
  return r?decode(r):null;
}
export async function watermark(db:D1Database):Promise<number>{return (await db.prepare('SELECT coalesce(max(seq),0) AS n FROM catalogue_commits').first<{n:number}>())!.n;}
export async function snapshot(db:D1Database,seq:number):Promise<Revision[]>{
  const result=await db.prepare('SELECT v.*,c.actor,c.at,c.reason FROM catalogue_revisions v JOIN catalogue_commits c ON c.seq=v.commit_seq WHERE v.commit_seq<=? AND NOT EXISTS(SELECT 1 FROM catalogue_revisions newer WHERE newer.id=v.id AND newer.version>v.version AND newer.commit_seq<=?) ORDER BY v.id').bind(seq,seq).all<StoredRevision>();
  return result.results.map(decode);
}
export async function history(db:D1Database,id:string):Promise<Revision[]>{
  return (await db.prepare('SELECT v.*,c.actor,c.at,c.reason FROM catalogue_revisions v JOIN catalogue_commits c ON c.seq=v.commit_seq WHERE v.id=? ORDER BY v.version DESC').bind(id).all<StoredRevision>()).results.map(decode);
}
export async function listRecords(db:D1Database,kind:string,q:string,page:number){
  check(['person','appointment','source'].includes(kind),'未知資料類型。');
  const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
  const where="r.kind=? AND (r.name LIKE ? ESCAPE '\\' OR r.id LIKE ? ESCAPE '\\')";
  const total=(await db.prepare('SELECT count(*) AS n FROM catalogue_records r WHERE '+where).bind(kind,pattern,pattern).first<{n:number}>())!.n;
  const result=await db.prepare('SELECT r.*,v.payload,v.digest FROM catalogue_records r JOIN catalogue_revisions v ON v.id=r.id AND v.version=r.version WHERE '+where+' ORDER BY r.name,r.id LIMIT 40 OFFSET ?').bind(kind,pattern,pattern,(page-1)*40).all<{id:string;version:number;payload:string;digest:string}>();
  return {total,page,rows:result.results.map(r=>({id:r.id,version:r.version,digest:r.digest,data:JSON.parse(r.payload)}))};
}
export async function validateBatch(db:D1Database,changes:{data:CatalogueRecord;baseVersion:number}[]):Promise<void>{
  const existing=await snapshot(db,await watermark(db));
  const byId=new Map(existing.map(r=>[r.id,r.data]));
  const versionSet=new Set((await db.prepare("SELECT v.id,v.version FROM catalogue_revisions v JOIN catalogue_records r ON r.id=v.id WHERE r.kind='source'").all<{id:string;version:number}>()).results.map(r=>r.id+'@'+r.version));
  for(const c of changes){validateRecord(c.data);byId.set(c.data.id,c.data);if(c.data.kind==='source')versionSet.add(c.data.id+'@'+(c.baseVersion+1));}
  validateLinks([...byId.values()],versionSet);
  validateReaderLinks([...byId.values()]);
}
export async function commitStaged(db:D1Database,jobId:string,actor:string,reason:string):Promise<number>{
  const done=await db.prepare('SELECT seq FROM catalogue_commits WHERE request_id=?').bind(jobId).first<{seq:number}>();
  if(done)return done.seq;
  const job=await db.prepare('SELECT * FROM catalogue_imports WHERE id=?').bind(jobId).first<{state:string;total:number;mapping_hash:string}>();
  check(job&&job.state==='ready','批次尚未完成預覽。',409);check(reason.trim(),'請填寫修訂理由。');
  const pending=(await db.prepare('SELECT payload,base_version FROM catalogue_staged WHERE job_id=? ORDER BY position').bind(jobId).all<{payload:string;base_version:number}>()).results;
  check(pending.length===job.total,'批次暫存尚未完成。',409);
  await validateBatch(db,pending.map(r=>({data:JSON.parse(r.payload),baseVersion:r.base_version})));
  const seq="(SELECT seq FROM catalogue_commits WHERE request_id=?)";
  const run=(sql:string,...args:(string|number|null)[])=>db.prepare(sql).bind(...args);
  const commands=[
    run("INSERT INTO catalogue_commits(request_id,request_hash,actor,reason,at,guard) VALUES(?,?,?,?,?, CASE WHEN (SELECT state FROM catalogue_imports WHERE id=?)='ready' AND (SELECT count(*) FROM catalogue_staged WHERE job_id=?)=? AND NOT EXISTS(SELECT 1 FROM catalogue_staged s LEFT JOIN catalogue_records r ON r.id=s.id WHERE s.job_id=? AND (coalesce(r.version,0)<>s.base_version OR (r.id IS NOT NULL AND r.kind<>json_extract(s.payload,'$.kind')))) THEN 1 ELSE 0 END)",jobId,job.mapping_hash,actor,reason,new Date().toISOString(),jobId,jobId,job.total,jobId),
    run("INSERT INTO catalogue_records(id,kind,version,commit_seq,name,assessment,visibility) SELECT id,json_extract(payload,'$.kind'),base_version+1,"+seq+",coalesce(json_extract(payload,'$.name'),json_extract(payload,'$.officeName'),json_extract(payload,'$.title')),json_extract(payload,'$.assessment'),json_extract(payload,'$.visibility') FROM catalogue_staged WHERE job_id=? ON CONFLICT(id) DO UPDATE SET version=excluded.version,commit_seq=excluded.commit_seq,name=excluded.name,assessment=excluded.assessment,visibility=excluded.visibility",jobId,jobId),
    run("INSERT INTO catalogue_revisions(id,version,commit_seq,payload,digest) SELECT id,base_version+1,"+seq+",payload,digest FROM catalogue_staged WHERE job_id=?",jobId,jobId),
    run("INSERT INTO catalogue_people(id,aliases,alias_publication) SELECT id,json_extract(payload,'$.aliases'),json_extract(payload,'$.aliasPublication') FROM catalogue_staged WHERE job_id=? AND json_extract(payload,'$.kind')='person' ON CONFLICT(id) DO UPDATE SET aliases=excluded.aliases,alias_publication=excluded.alias_publication",jobId),
    run("DELETE FROM catalogue_aliases WHERE person_id IN(SELECT id FROM catalogue_staged WHERE job_id=? AND json_extract(payload,'$.kind')='person')",jobId),
    run("INSERT INTO catalogue_aliases(alias,person_id) SELECT a.value,s.id FROM catalogue_staged s,json_each(s.payload,'$.legacyIds') a WHERE s.job_id=? AND json_extract(s.payload,'$.kind')='person'",jobId),
    run("INSERT INTO catalogue_sources(id,edition,locator,scope) SELECT id,json_extract(payload,'$.edition'),json_extract(payload,'$.locator'),json_extract(payload,'$.textScope') FROM catalogue_staged WHERE job_id=? AND json_extract(payload,'$.kind')='source' ON CONFLICT(id) DO UPDATE SET edition=excluded.edition,locator=excluded.locator,scope=excluded.scope",jobId),
    run("INSERT INTO catalogue_appointments(id,person_id,office_id,office_name,nature,start_year,end_year,date_text,duplicate_of) SELECT id,json_extract(payload,'$.personId'),json_extract(payload,'$.officeId'),json_extract(payload,'$.officeName'),json_extract(payload,'$.nature'),json_extract(payload,'$.date.startYear'),json_extract(payload,'$.date.endYear'),json_extract(payload,'$.date.original'),json_extract(payload,'$.duplicateOf') FROM catalogue_staged WHERE job_id=? AND json_extract(payload,'$.kind')='appointment' ON CONFLICT(id) DO UPDATE SET person_id=excluded.person_id,office_id=excluded.office_id,office_name=excluded.office_name,nature=excluded.nature,start_year=excluded.start_year,end_year=excluded.end_year,date_text=excluded.date_text,duplicate_of=excluded.duplicate_of",jobId),
    run("DELETE FROM catalogue_evidence WHERE id IN(SELECT id FROM catalogue_staged WHERE job_id=?)",jobId),
    run("DELETE FROM catalogue_reader_links WHERE appointment_id IN(SELECT id FROM catalogue_staged WHERE job_id=?)",jobId),
    run("INSERT INTO catalogue_reader_links(appointment_id,fangzhen_id) SELECT id,json_extract(payload,'$.readerLinks.fangzhen.recordId') FROM catalogue_staged WHERE job_id=? AND json_extract(payload,'$.kind')='appointment' AND json_extract(payload,'$.readerLinks.fangzhen.recordId') IS NOT NULL",jobId),
    run("INSERT INTO catalogue_evidence(id,source_id,source_version,role,note) SELECT s.id,json_extract(e.value,'$.sourceId'),json_extract(e.value,'$.sourceRevision'),json_extract(e.value,'$.role'),json_extract(e.value,'$.note') FROM catalogue_staged s,json_each(s.payload,'$.evidence') e WHERE s.job_id=?",jobId),
    run("UPDATE catalogue_imports SET state='committed',commit_seq="+seq+" WHERE id=?",jobId,jobId),
  ];
  try{await db.batch(commands);}
  catch(error){
    const committed=await db.prepare('SELECT seq FROM catalogue_commits WHERE request_id=?').bind(jobId).first<{seq:number}>();
    if(committed)return committed.seq;
    if(String(error).includes('catalogue_cas_guard'))throw new HttpError(409,'資料已被其他分頁修改；本批次未提交，請重新比較。');
    if(String(error).includes('catalogue_reader_links'))throw new HttpError(409,'州鎮條目已由另一條任官關聯；本批次未提交，請重新核對。');
    throw error;
  }
  return (await db.prepare('SELECT seq FROM catalogue_commits WHERE request_id=?').bind(jobId).first<{seq:number}>())!.seq;
}
export async function saveRecord(db:D1Database,actor:string,input:{requestId:string;baseRevision:number;data:CatalogueRecord;reviewedContentDigest?:string;reason:string}){
  check(/^[a-zA-Z0-9:-]{8,160}$/.test(input.requestId),'操作識別碼無效。');
  const requestHash=await sha256(canonicalJson(input));
  // Imports store the exact request digest as mapping_hash.
  const prior=await db.prepare('SELECT mapping_hash,commit_seq FROM catalogue_imports WHERE id=?').bind(input.requestId).first<{mapping_hash:string;commit_seq:number|null}>();
  if(prior){check(prior.mapping_hash===requestHash,'操作識別碼已用於另一內容。',409);if(prior.commit_seq)return getRevision(db,input.data.id,input.baseRevision+1);}
  const previous=await getRevision(db,input.data.id);
  const next=await prepareRevision(previous,{baseRevision:input.baseRevision,data:input.data,reviewedContentDigest:input.reviewedContentDigest},{commit:(await watermark(db))+1,actor,at:new Date().toISOString(),reason:input.reason});
  if(!prior){
    await db.batch([
      db.prepare("INSERT INTO catalogue_imports(id,filename,original_hash,mapping,mapping_hash,state,total,at) VALUES(?,'單筆修訂',?,'{}',?,'ready',1,?)").bind(input.requestId,requestHash,requestHash,new Date().toISOString()),
      db.prepare('INSERT INTO catalogue_staged(job_id,position,id,base_version,payload,digest) VALUES(?,0,?,?,?,?)').bind(input.requestId,next.id,input.baseRevision,canonicalJson(next.data),next.digest),
    ]);
  }
  await commitStaged(db,input.requestId,actor,input.reason);
  return getRevision(db,input.data.id,input.baseRevision+1);
}
export function domainErrorStatus(error:unknown):number {return error instanceof DomainError?(error.code==='conflict'?409:422):error instanceof HttpError?error.status:503;}
