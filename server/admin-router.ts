import {owner,mutationGuard} from './authorization';
import {backup} from './backup-service';
import {bootstrap} from './bootstrap-service';
import {validateRecord} from '../domain/catalogue';
import {canonicalJson,sha256} from '../domain/revisions';
import {storage,check,setting,HttpError,type CatalogueEnv} from './storage';
import {domainErrorStatus,listRecords,getRevision,history,saveRecord,watermark} from './catalogue-service';
import {upload,inspectFile,createImport,importDetail,stageImport,commitImport} from './import-service';
import {makePublication,publishData} from './publication-service';
import adminHtml from '../admin/index.html?raw';
import readerHtml from './generated/reader.html?raw';
const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:noStore});
async function bytes(request:Request,limit:number){const reader=request.body?.getReader();check(reader,'請提供資料。');const chunks:Uint8Array[]=[];let size=0;while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();throw new HttpError(413,'檔案或操作內容過大。');}chunks.push(part.value);}const all=new Uint8Array(size);let pos=0;for(const chunk of chunks){all.set(chunk,pos);pos+=chunk.length;}return all;}
async function body(request:Request){try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await bytes(request,1024*1024)));}catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'資料格式不正確。');}}
function safeId(value:string){try{return decodeURIComponent(value);}catch{throw new HttpError(400,'識別碼無效。');}}
export async function catalogueRouter(request:Request,env:CatalogueEnv):Promise<Response|null>{
  const url=new URL(request.url),path=url.pathname;
  if(path!=='/admin'&&path!=='/admin/'&&!path.startsWith('/api/admin/')&&!path.startsWith('/reader/'))return null;
  try{
    if(request.headers.has('next-action')||request.headers.has('x-rsc-action'))return json({error:'不支援此操作。'},405);
    if(path.startsWith('/reader/'))return await readerRoute(request,env);
    const actor=await owner(request,env);
    if(!['GET','HEAD'].includes(request.method))mutationGuard(request);
    if(path==='/admin'||path==='/admin/'){check(['GET','HEAD'].includes(request.method),'不支援此操作。',405);return new Response(request.method==='HEAD'?null:adminHtml,{headers:{...noStore,'Content-Type':'text/html;charset=utf-8'}});}
    const {db,bucket}=storage(env);
    const method=request.method==='HEAD'?'GET':request.method;
    if(method==='GET'&&path==='/api/admin/session'){
      const counts=(await db.prepare('SELECT kind,count(*) AS total FROM catalogue_records GROUP BY kind').all()).results;
      return json({actor,counts,watermark:await watermark(db),activeRelease:await setting(db,'active-release'),baselineLoaded:!!await setting(db,'baseline-ready')});
    }
    if(method==='GET'&&path==='/api/admin/records')return json(await listRecords(db,url.searchParams.get('kind')||'person',url.searchParams.get('q')||'',Math.max(1,Math.min(10000,Number(url.searchParams.get('page'))||1))));
    if(method==='POST'&&path==='/api/admin/records')return json(await saveRecord(db,actor,await body(request)));
    if(method==='POST'&&path==='/api/admin/review'){const input=await body(request);validateRecord(input.data);return json({digest:await sha256(canonicalJson(input.data))});}
    if(method==='POST'&&path==='/api/admin/bootstrap')return json(await bootstrap(env));
    const record=path.match(/^\/api\/admin\/records\/([^/]+)(\/history|\/impact)?$/);
    if(method==='GET'&&record){
      const id=safeId(record[1]);
      if(record[2]==='/history')return json(await history(db,id));
      if(record[2]==='/impact')return json((await db.prepare('SELECT e.*,r.name FROM catalogue_evidence e JOIN catalogue_records r ON r.id=e.id WHERE e.source_id=? ORDER BY r.name').bind(id).all()).results);
      const result=await getRevision(db,id);check(result,'記錄不存在。',404);return json(result);
    }
    if(method==='POST'&&path==='/api/admin/objects'){
      let filename='upload';try{filename=decodeURIComponent(request.headers.get('x-filename')||'upload');}catch{throw new HttpError(400,'檔名無效。');}
      return json(await upload(env,await bytes(request,24*1024*1024),filename,request.headers.get('content-type')||'application/octet-stream'));
    }
    const object=path.match(/^\/api\/admin\/objects\/([a-f0-9]{64})(\/inspect)?$/);
    if(method==='GET'&&object){
      if(object[2]){const file=await inspectFile(env,object[1]);return json({columns:file.columns,total:file.rows.length,sample:file.rows.slice(0,5),filename:file.filename,native:file.rows.every(r=>'kind' in r&&'evidence' in r)});}
      const data=await bucket.get('originals/'+object[1]);check(data,'原檔不存在。',404);
      return new Response(data.body,{headers:{...noStore,'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="source-'+object[1]+'.bin"'}});
    }
    if(method==='GET'&&path==='/api/admin/imports')return json((await db.prepare("SELECT * FROM catalogue_imports WHERE filename<>'單筆修訂' ORDER BY at DESC LIMIT 50").all()).results);
    if(method==='POST'&&path==='/api/admin/imports'){const input=await body(request);return json(await createImport(env,input.hash,input.mapping));}
    const job=path.match(/^\/api\/admin\/imports\/([^/]+)(\/stage|\/commit|\/preview)?$/);
    if(job){
      const id=safeId(job[1]);
      if(method==='GET'&&job[2]==='/preview'){const d=await importDetail(env,id);return new Response(JSON.stringify(d.prepared,null,2),{headers:{...noStore,'Content-Type':'application/json;charset=utf-8','Content-Disposition':'attachment; filename="import-preview.json"'}});}
      if(method==='GET'&&!job[2]){const d=await importDetail(env,id);return json({job:d.job,count:d.count,warnings:d.prepared.warnings,errors:d.prepared.errors,rows:d.prepared.rows.slice(0,80).map(r=>({id:r.data.id,kind:r.data.kind,baseVersion:r.baseVersion,data:r.data})),more:d.prepared.rows.length>80});}
      if(method==='POST'&&job[2]==='/stage')return json(await stageImport(env,id));
      if(method==='POST'&&job[2]==='/commit'){
        const input=await body(request);return json(await commitImport(env,id,actor,input.reason||'確認匯入'));
      }
    }
    if(method==='GET'&&path==='/api/admin/releases')return json({active:await setting(db,'active-release'),rows:(await db.prepare('SELECT * FROM catalogue_releases ORDER BY at DESC LIMIT 50').all<{manifest:string}>()).results.map(r=>({...r,manifest:JSON.parse(r.manifest)})),events:(await db.prepare('SELECT * FROM catalogue_publication_events ORDER BY seq DESC LIMIT 50').all()).results});
    if(method==='POST'&&path==='/api/admin/releases')return json(await makePublication(env,actor));
    if(method==='POST'&&path==='/api/admin/publish')return json(await publishData(env,actor,await body(request)));
    if(method==='GET'&&path==='/api/admin/backup'){
      return new Response((await backup(env)).pipeThrough(new CompressionStream('gzip') as unknown as ReadableWritablePair<Uint8Array,Uint8Array>),{headers:{...noStore,'Content-Type':'application/gzip','Content-Disposition':'attachment; filename="guanshitai-backup.ndjson.gz"'}});
    }
    return json({error:'找不到此操作。'},404);
  }catch(error){
    const status=domainErrorStatus(error);if(status>=500)console.error('Catalogue request failed',error instanceof Error?error.message:'unknown');
    return json({error:status>=500?'資料服務暫時無法使用，輸入仍保留，請稍後重試。':error instanceof Error?error.message:'操作失敗。',...(error instanceof HttpError&&error.details?{details:error.details}:{})},status);
  }
}
async function readerRoute(request:Request,env:CatalogueEnv){
  check(['GET','HEAD'].includes(request.method),'閱讀頁只接受讀取。',405);
  const {db,bucket}=storage(env),url=new URL(request.url);
  if(url.pathname==='/reader/current'){
    const active=await setting(db,'active-release');
    return new Response(null,{status:302,headers:{...noStore,Location:new URL(active?'/reader/snapshot/'+active+'/index.html':'/legacy/index.html',url).href}});
  }
  const match=url.pathname.match(/^\/reader\/(snapshot|preview)\/([a-f0-9]{64})\/(.+)$/);check(match,'閱讀快照不存在。',404);
  const [,mode,id,relative]=match;
  check(!relative.includes('..')&&!relative.includes('%')&&!relative.includes('\\'),'資源路徑無效。',400);
  const release=await db.prepare('SELECT state,manifest FROM catalogue_releases WHERE id=?').bind(id).first<{state:string;manifest:string}>();check(release,'閱讀快照不存在。',404);
  if(mode==='preview')await owner(request,env);else check(release.state==='published','此版本尚未發布。',404);
  const prefix='/reader/'+mode+'/'+id+'/';
  if(relative==='index.html'){
    const html=readerHtml.replace('<head>','<head><base href="'+prefix+'">');
    return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  const manifest=JSON.parse(release.manifest);
  if(manifest.files[relative]){
    const object=await bucket.get('releases/'+id+'/'+relative);check(object,'閱讀資源暫時無法載入。',503);
    return new Response(request.method==='HEAD'?null:object.body,{headers:{'Content-Type':relative.endsWith('.js')?'text/javascript;charset=utf-8':'application/json;charset=utf-8','Cache-Control':mode==='preview'?'no-store':'private, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
  }
  return Response.redirect(new URL('/legacy/'+relative+url.search,url).href,302);
}
