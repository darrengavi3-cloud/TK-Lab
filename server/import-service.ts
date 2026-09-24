import type {CatalogueRecord} from '../domain/catalogue';
import {validateRecord} from '../domain/catalogue';
import {createRecord} from '../domain/create-record';
import {canonicalJson,sha256,importIdentity} from '../domain/revisions';
import {check,storage,type CatalogueEnv} from './storage';
import {watermark,commitStaged} from './catalogue-service';
import baseline from './generated/baseline-manifest.json';
import sheetJS from './generated/xlsx.mjs';
const XLSX=sheetJS as unknown as {read:(bytes:Uint8Array|string,options:Record<string,unknown>)=>{SheetNames:string[];Sheets:Record<string,unknown>};utils:{sheet_to_json:(sheet:unknown,options:Record<string,unknown>)=>unknown[]}};
interface Mapping {kind:CatalogueRecord['kind'];columns:Record<string,string>;allowUnmapped:boolean}
interface Prepared {rows:{data:CatalogueRecord;baseVersion:number;digest:string}[];warnings:string[];baseline:boolean;readerBaseline?:unknown;errors:{row:number;message:string}[]}
export interface ImportJob {id:string;filename:string;original_hash:string;mapping:string;mapping_hash:string;state:string;total:number;at:string;commit_seq:number|null}
export async function upload(env:CatalogueEnv,bytes:Uint8Array,filename:string,mediaType:string,maxBytes=24*1024*1024){
  const {db,bucket}=storage(env);check(bytes.length>0&&bytes.length<=maxBytes,`檔案需介於 1 位元組與 ${Math.floor(maxBytes/1024/1024)} MB。`,413);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource))).map(v=>v.toString(16).padStart(2,'0')).join('');
  await bucket.put('originals/'+hash,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
  await db.prepare('INSERT INTO catalogue_objects(hash,filename,bytes,media_type,at) VALUES(?,?,?,?,?) ON CONFLICT(hash) DO NOTHING').bind(hash,filename.slice(0,200),bytes.length,mediaType,new Date().toISOString()).run();
  return {hash,filename,bytes:bytes.length};
}
function checkZip(bytes:Uint8Array){
  if(bytes[0]!==0x50||bytes[1]!==0x4b)return;
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let total=0,entries=0;
  for(let i=0;i<bytes.length-46;i++)if(v.getUint32(i,true)===0x02014b50){total+=v.getUint32(i+24,true);entries++;check(total<=24*1024*1024&&entries<=1000,'Excel 解壓內容過大。',413);i+=45+v.getUint16(i+28,true)+v.getUint16(i+30,true)+v.getUint16(i+32,true);}
  check(entries>0,'Excel 封包不完整。');
}
export async function inspectFile(env:CatalogueEnv,hash:string){
  const {db,bucket}=storage(env);check(/^[a-f0-9]{64}$/.test(hash),'原檔識別碼無效。');
  const meta=await db.prepare('SELECT filename FROM catalogue_objects WHERE hash=?').bind(hash).first<{filename:string}>();check(meta,'原始檔不存在。',404);
  const object=await bucket.get('originals/'+hash);check(object,'原始檔暫時無法讀取。',503);
  const bytes=new Uint8Array(await object.arrayBuffer());
  if(/\.json$/i.test(meta.filename)){
    let parsed:unknown;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new Error('JSON 格式或 UTF-8 編碼無效。');}
    const doc=parsed as {records?:unknown[]};
    const rows=Array.isArray(parsed)?parsed:doc.records;
    check(Array.isArray(rows)&&rows.length>0&&rows.length<=10000,'JSON 須包含 1–10,000 筆記錄。');
    return {rows:rows as Record<string,unknown>[],columns:[...new Set(rows.slice(0,50).flatMap(r=>Object.keys(r as object)))],filename:meta.filename,document:parsed};
  }
  check(/\.(csv|xlsx|xls)$/i.test(meta.filename),'請使用 JSON、UTF-8 CSV 或 Excel。');
  checkZip(bytes);
  const csv=/\.csv$/i.test(meta.filename);
  const input=csv?new TextDecoder('utf-8',{fatal:true}).decode(bytes):bytes;
  const book=XLSX.read(input,{type:csv?'string':'array',cellDates:false,cellFormula:false,sheetRows:10001});
  check(book.SheetNames.length===1,'每次請匯入一個工作表；多工作表請分別匯出。');
  const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:'',raw:true}) as Record<string,unknown>[];
  check(rows.length>0&&rows.length<=10000,'每批限 1–10,000 筆。');
  return {rows,columns:[...new Set(rows.slice(0,50).flatMap(Object.keys))],filename:meta.filename,document:null};
}
export async function createImport(env:CatalogueEnv,hash:string,mapping:Mapping){
  const {db,bucket}=storage(env);const file=await inspectFile(env,hash);
  const isBaseline=hash===baseline.sha256;
  const mappingHash=await importIdentity(hash,'catalogue-1',mapping);
  const id='import:'+mappingHash;
  const existing=await db.prepare('SELECT * FROM catalogue_imports WHERE id=?').bind(id).first<ImportJob>();if(existing)return existing;
  if(isBaseline)check(await watermark(db)===0,'基線只可載入空的資料核心。',409);
  const isNative=file.rows.every(r=>typeof r.kind==='string'&&typeof r.id==='string'&&'evidence' in r);
  check(isNative||['person','appointment','source'].includes(mapping.kind),'請選擇資料類型。');
  const unmapped=isNative?[]:file.columns.filter(c=>!Object.values(mapping.columns).includes(c));
  check(unmapped.length===0||mapping.allowUnmapped,'尚有未對應欄位，請確認保留於原檔後再繼續。');
  const current=new Map((await db.prepare('SELECT id,version FROM catalogue_records').all<{id:string;version:number}>()).results.map(r=>[r.id,r.version]));
  const prepared:Prepared={rows:[],warnings:unmapped.map(c=>'原檔保留欄位：'+c),baseline:isBaseline,errors:[]};
  const seen=new Set<string>();
  for(let index=0;index<file.rows.length;index++){
    const raw=file.rows[index];let data:CatalogueRecord;
    try{
      if(isNative)data=JSON.parse(JSON.stringify(raw));
      else{
        const get=(field:string)=>String(raw[mapping.columns[field]]??'');
        const recordId=get('id')||mapping.kind+':import:'+await sha256(hash+':'+index);
        data=createRecord(mapping.kind,recordId);
        if(data.kind==='person'){data.name=get('name');data.aliases=get('aliases').split(/[;；]/).filter(Boolean);}
        else if(data.kind==='source'){data.title=get('title');data.text=get('text');data.locator=get('locator');data.edition=get('edition');data.url=get('url');}
        else{
          data.personId=get('personId');data.officeName=get('officeName');data.officeId=get('officeId')||null;data.nature=get('nature')||'待考';data.polity=get('polity');data.jurisdiction=get('jurisdiction');
          const year=(field:string)=>{const x=get(field);check(!x||/^-?\d+$/.test(x),'年份須為整數或空白。');return x?Number(x):null;};
          data.date={...data.date,original:get('dateText'),startYear:year('startYear'),endYear:year('endYear')};
        }
      }
      if(!isBaseline){data.assessment='pending';data.workflow='review';data.visibility='private';data.disposition='none';data.reason='匯入候選，等待核對';if(data.kind==='appointment')data.duplicateOf=null;if(data.kind==='person')data.aliasPublication='private';}
      validateRecord(data);
      check(!seen.has(data.id),'此批次有重複 ID。');seen.add(data.id);
      prepared.rows.push({data,baseVersion:current.get(data.id)||0,digest:await sha256(canonicalJson(data))});
    }catch(error){prepared.errors.push({row:index+2,message:error instanceof Error?error.message:'記錄無效'});}
  }
  if(isBaseline){
    const document=file.document as {readerBaseline:unknown;archives:Record<string,{text:string;sha256:string}>};
    prepared.readerBaseline=document.readerBaseline;
    // Only the exact build-generated baseline may retain historic review states.
    // Its original files travel in the same private package and remain byte-exact.
    for(const [name,entry] of Object.entries(baseline.manifest)){
      const archive=document.archives[name];
      check(archive&&await sha256(archive.text)===entry.sha256,'基線原檔核驗失敗：'+name,409);
      // V90: individual archived baseline files (e.g. the person registry) can now
      // exceed the normal admin-upload ceiling; these are checksum-verified trusted
      // baseline bytes, not end-user files, so they get the same internal headroom.
      await upload(env,new TextEncoder().encode(archive.text),name,'application/json',64*1024*1024);
    }
  }
  await bucket.put('imports/'+id+'.json',JSON.stringify(prepared));
  const state=prepared.errors.length?'invalid':'staging';
  await db.prepare('INSERT INTO catalogue_imports(id,filename,original_hash,mapping,mapping_hash,state,total,at) VALUES(?,?,?,?,?,?,?,?)').bind(id,file.filename,hash,JSON.stringify(mapping),mappingHash,state,prepared.rows.length,new Date().toISOString()).run();
  return db.prepare('SELECT * FROM catalogue_imports WHERE id=?').bind(id).first<ImportJob>();
}
export async function importDetail(env:CatalogueEnv,id:string){
  const {db,bucket}=storage(env);const job=await db.prepare('SELECT * FROM catalogue_imports WHERE id=?').bind(id).first<ImportJob>();check(job,'匯入批次不存在。',404);
  const object=await bucket.get('imports/'+id+'.json');check(object,'匯入資料不存在。',503);const prepared=await object.json<Prepared>();
  const count=(await db.prepare('SELECT count(*) AS n FROM catalogue_staged WHERE job_id=?').bind(id).first<{n:number}>())!.n;
  return {job,prepared,count};
}
export async function stageImport(env:CatalogueEnv,id:string){
  const {db}=storage(env);const detail=await importDetail(env,id);
  if(detail.job.state==='committed'||detail.job.state==='ready')return {state:detail.job.state,count:detail.count,total:detail.job.total};
  check(detail.job.state==='staging','請先修正匯入錯誤。',409);
  const rows=detail.prepared.rows.slice(detail.count,detail.count+50);
  if(rows.length)await db.batch(rows.map((r,index)=>db.prepare('INSERT INTO catalogue_staged(job_id,position,id,base_version,payload,digest) VALUES(?,?,?,?,?,?) ON CONFLICT(job_id,position) DO NOTHING').bind(id,detail.count+index,r.data.id,r.baseVersion,canonicalJson(r.data),r.digest)));
  const count=(await db.prepare('SELECT count(*) AS n FROM catalogue_staged WHERE job_id=?').bind(id).first<{n:number}>())!.n;
  if(count===detail.job.total)await db.prepare("UPDATE catalogue_imports SET state='ready' WHERE id=? AND state='staging'").bind(id).run();
  return {state:count===detail.job.total?'ready':'staging',count,total:detail.job.total};
}
export async function commitImport(env:CatalogueEnv,id:string,actor:string,reason:string){
  const {db,bucket}=storage(env),detail=await importDetail(env,id);
  if(detail.prepared.baseline){
    const hashes=new Set((await db.prepare('SELECT hash FROM catalogue_objects').all<{hash:string}>()).results.map(r=>r.hash));
    const missing=Object.entries(baseline.manifest).filter(([,v])=>!hashes.has(v.sha256));
    check(!missing.length,'基線原始檔尚未保存完整：'+missing.map(([n])=>n).join('、'),409);
    await bucket.put('baseline/reader.json',JSON.stringify(detail.prepared.readerBaseline));
  }
  const seq=await commitStaged(db,id,actor,reason);
  if(detail.prepared.baseline)await db.prepare("INSERT INTO catalogue_settings(key,value) VALUES('baseline-ready',?) ON CONFLICT(key) DO NOTHING").bind(baseline.inputDigest).run();
  return {commit:seq,state:'committed'};
}
