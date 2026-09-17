import {isReaderCandidate,isVerifiedFact,type Appointment,type Person,type Source} from '../domain/catalogue';
import {canonicalJson,sha256} from '../domain/revisions';
import {snapshot,watermark} from './catalogue-service';
import {storage,setting,check,type CatalogueEnv} from './storage';
import identity from './generated/build-identity.json';
import baselineProfiles from './generated/reader-profiles.json';
type ReaderRow=Record<string,unknown>;
interface BaselineReader {people:{people:ReaderRow[];summary:Record<string,unknown>;[key:string]:unknown};relations:{appointments:ReaderRow[];peerageEvents:ReaderRow[];[key:string]:unknown}}
interface CandidateManifest {id:string;digest:string;watermark:number;codeId:string;assetsDigest:string;readerContract:number;policy:string;dataBaseline:string;files:Record<string,string>;counts:Record<string,number>;changes:{id:string;kind:string;revision:number;assessment:string}[];records:{id:string;revision:number;digest:string}[];evidenceRevisions:{id:string;revision:number;digest:string}[]}
export async function makePublication(env:CatalogueEnv,actor:string){
  const {db,bucket}=storage(env);
  const baseObject=await bucket.get('baseline/reader.json');check(baseObject,'請先完成基線匯入。',409);
  const base=await baseObject.json<BaselineReader>();
  const seq=await watermark(db),rows=await snapshot(db,seq);
  const sourceVersions=new Map<string,Source>();
  const evidenceRevisions=[];
  for(const r of rows)check(await sha256(canonicalJson(r.data))===r.digest,'資料修訂核驗失敗：'+r.id,409);
  const cited=new Set(rows.flatMap(r=>r.data.evidence.map(e=>e.sourceId+'@'+e.sourceRevision)));
  for(const raw of (await db.prepare("SELECT v.id,v.version,v.payload,v.digest FROM catalogue_revisions v JOIN catalogue_records r ON r.id=v.id WHERE r.kind='source' AND v.commit_seq<=? ORDER BY v.id,v.version").bind(seq).all<{id:string;version:number;payload:string;digest:string}>()).results){
    const source=JSON.parse(raw.payload),key=raw.id+'@'+raw.version;
    check(await sha256(canonicalJson(source))===raw.digest,'史料修訂核驗失敗：'+key,409);
    sourceVersions.set(key,source);
    if(cited.has(key))evidenceRevisions.push({id:raw.id,revision:raw.version,digest:raw.digest});
  }
  const basePeople=new Map(base.people.people.map(p=>[String(p.personId),p]));
  const baseAppointments=new Map(base.relations.appointments.map(a=>[String(a.appointmentId),a]));
  const people=new Map<string,ReaderRow>();
  for(const r of rows){
    if(r.data.kind!=='person')continue;const p=r.data as Person;
    if(!isReaderCandidate(p)||!isVerifiedFact(p)){
      check(!basePeople.has(p.id),'人物「'+p.name+'」仍有既有跨板塊引用；請先完成關聯修訂後再排除。',409);continue;
    }
    const old=basePeople.get(p.id);
    if(r.number===1&&old){people.set(p.id,{...old});continue;}
    people.set(p.id,{...old,personId:p.id,name:p.name,aliases:p.aliasPublication==='verified'?[...p.aliases]:[],appointmentIds:old?.appointmentIds||[]});
  }
  const appointments:ReaderRow[]=[];
  for(const r of rows){
    if(r.data.kind!=='appointment'||!isReaderCandidate(r.data)||!isVerifiedFact(r.data))continue;
    const a=r.data as Appointment;check(people.has(a.personId),'任官的人物尚未可供閱讀：'+a.personId,409);
    if(r.number===1&&baseAppointments.has(a.id)){appointments.push({...baseAppointments.get(a.id)!});continue;}
    const links=[...a.evidence];
    for(const d of rows)if(d.data.kind==='appointment'&&d.data.disposition==='duplicate'&&d.data.duplicateOf===a.id)for(const e of d.data.evidence)if(!links.some(x=>canonicalJson(x)===canonicalJson(e)))links.push(e);
    const citations=links.map(e=>{
      const s=sourceVersions.get(e.sourceId+'@'+e.sourceRevision);
      check(s&&s.visibility==='reader'&&s.assessment!=='excluded','引用的原文尚未允許讀者閱讀：'+e.sourceId,409);
      return {title:[s.title,s.edition,s.locator].filter(Boolean).join(' · '),url:s.url,quote:s.text,textScope:s.textScope,role:e.role,...(e.note?{note:e.note}:{})};
    });
    const certain=a.date.certainty==='certain';
    appointments.push({appointmentId:a.id,personId:a.personId,nodeName:a.officeName,startYear:certain?a.date.startYear:null,endYear:certain?a.date.endYear:null,polity:a.polity,jurisdiction:a.jurisdiction,factionName:a.polity,appointmentNature:a.nature,treeType:'source',dateText:a.date.original,dateCertainty:a.date.certainty,citations});
  }
  const appointmentIds=new Set(appointments.map(a=>a.appointmentId));
  for(const [id,p] of people){
    const existing=Array.isArray(p.appointmentIds)?p.appointmentIds.filter(x=>appointmentIds.has(x)):[];
    const added=appointments.filter(a=>a.personId===id&&!existing.includes(a.appointmentId)).map(a=>a.appointmentId);
    if(Array.isArray(p.appointmentIds)||added.length)p.appointmentIds=[...existing,...added];
  }
  const ordered=[...base.people.people.map(p=>people.get(String(p.personId))).filter(Boolean),...[...people].filter(([id])=>!basePeople.has(id)).map(([,p])=>p)] as ReaderRow[];
  // Keep v1 structural compatibility. All unrelated fields come from the frozen,
  // already allowlisted reader baseline, never from research rows.
  const personPayload={...base.people,people:ordered,summary:{...base.people.summary,people:ordered.length}};
  const appointmentsById=new Map(appointments.map(a=>[a.appointmentId,a]));
  const orderedAppointments=[...base.relations.appointments.map(a=>appointmentsById.get(a.appointmentId)).filter(Boolean),...appointments.filter(a=>!baseAppointments.has(String(a.appointmentId)))];
  const relationPayload={...base.relations,appointments:orderedAppointments};
  const changedAppointments=new Set(rows.filter(r=>r.data.kind==='appointment'&&(r.number>1||r.commit>1)).map(r=>r.id));
  const profilesById=new Map((baselineProfiles.profiles as ReaderRow[]).map(p=>[String(p.personId),p]));
  const profiles=ordered.map(person=>{
    const old=profilesById.get(String(person.personId))||{personId:person.personId,isRuler:false};
    const oldEvents=(old.lifeEvents||[]) as ReaderRow[];
    const kept=oldEvents.filter(e=>e.eventType!=='appointment'||!changedAppointments.has(String(e.relatedRecordId)));
    const added=appointments.filter(a=>a.personId===person.personId&&changedAppointments.has(String(a.appointmentId))).map(a=>({
      eventId:'life:appointment:'+a.appointmentId,personId:a.personId,eventType:'appointment',startYear:a.startYear,endYear:a.endYear,title:a.nodeName,
      detail:[a.polity,a.jurisdiction,a.appointmentNature,a.dateText,a.dateCertainty==='inferred'?'年代推定':a.dateCertainty==='unknown'?'年代尚待核定':''].filter(Boolean).join(' · '),relatedRecordId:a.appointmentId,citations:a.citations,
    }));
    if(!added.length&&kept.length===oldEvents.length)return old;
    return {...old,lifeEvents:[...kept,...added]};
  });
  const profilePayload={...baselineProfiles,profiles,summary:{...baselineProfiles.summary,people:profiles.length,peopleWithLifeEvents:profiles.filter(p=>Array.isArray(p.lifeEvents)&&p.lifeEvents.length).length,lifeEvents:profiles.reduce((n,p)=>n+(Array.isArray(p.lifeEvents)?p.lifeEvents.length:0),0)}};
  const files:Record<string,string>={
    'data/v63-reader-people.json':JSON.stringify(personPayload),
    'data/v63-reader-people.js':'window.SGZ_V63_READER_PEOPLE='+JSON.stringify(personPayload)+';',
    'data/v63-reader-person-relations.json':JSON.stringify(relationPayload),
    'data/v63-reader-person-relations.js':"(function(g){const p="+JSON.stringify(relationPayload)+";g.SGZ_V63_READER_PERSON_RELATIONS=Object.freeze({...p,appointmentsById:Object.fromEntries(p.appointments.map(r=>[r.appointmentId,r])),peerageEventsById:p.peerageEvents.reduce((o,r)=>{(o[r.eventId]||(o[r.eventId]=[])).push(r);return o;},{}),peerageEventsByRelationId:Object.fromEntries(p.peerageEvents.map(r=>[r.relationId,r]))});})(window);",
    'data/v69-person-profiles.js':'window.SGZ_V69_PERSON_PROFILES='+JSON.stringify(profilePayload)+';',
    'data/v69-person-profiles.json':JSON.stringify(profilePayload),
  };
  const fileDigests:Record<string,string>={};for(const [name,bytes] of Object.entries(files))fileDigests[name]=await sha256(bytes);
  const changes=rows.filter(r=>r.number>1||r.commit>1).map(r=>({id:r.id,kind:r.data.kind,revision:r.number,assessment:r.data.assessment}));
  const content={watermark:seq,codeId:identity.codeId,assetsDigest:identity.assetsDigest,readerContract:identity.readerContract,policy:identity.policy,dataBaseline:identity.dataBaseline,records:rows.map(r=>({id:r.id,revision:r.number,digest:r.digest})),evidenceRevisions,files:fileDigests,counts:{people:ordered.length,appointments:appointments.length,pending:rows.filter(r=>r.data.kind==='appointment'&&r.data.assessment==='pending').length},changes};
  const digest=await sha256(canonicalJson(content)),id=digest;
  const manifest:CandidateManifest={id,digest,...content};
  for(const [name,bytes] of Object.entries(files))await bucket.put('releases/'+id+'/'+name,bytes,{httpMetadata:{contentType:name.endsWith('.js')?'text/javascript;charset=utf-8':'application/json;charset=utf-8'}});
  await bucket.put('releases/'+id+'/manifest.json',canonicalJson(manifest));
  await db.prepare("INSERT INTO catalogue_releases(id,watermark,digest,state,code_id,manifest,at,actor) VALUES(?,?,?,'candidate',?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(id,seq,digest,identity.codeId,JSON.stringify(manifest),new Date().toISOString(),actor).run();
  return manifest;
}
export async function verifyRelease(env:CatalogueEnv,id:string){
  const {db,bucket}=storage(env);check(/^[a-f0-9]{64}$/.test(id),'發布識別碼無效。');
  const release=await db.prepare('SELECT manifest,state FROM catalogue_releases WHERE id=?').bind(id).first<{manifest:string;state:string}>();
  check(release,'發布候選不存在。',404);const manifest=JSON.parse(release.manifest) as CandidateManifest;
  const {id:manifestId,digest,...content}=manifest;
  check(manifestId===id&&digest===id&&await sha256(canonicalJson(content))===digest,'發布清單核驗失敗。',409);
  const stored=await bucket.get('releases/'+id+'/manifest.json');
  check(stored&&canonicalJson(await stored.json())===canonicalJson(manifest),'發布清單與物件不相符。',409);
  check(manifest.readerContract===identity.readerContract,'此快照與目前閱讀程式不相容。',409);
  if(release.state==='candidate')check(manifest.codeId===identity.codeId&&manifest.assetsDigest===identity.assetsDigest,'網站程式已更新，請重新建立候選與預覽。',409);
  for(const [name,hash] of Object.entries(manifest.files)){
    const object=await bucket.get('releases/'+id+'/'+name);check(object&&await sha256(await object.text())===hash,'候選內容核驗失敗；保留目前閱讀版。',409);
  }
  return {manifest,state:release.state};
}
export async function publishData(env:CatalogueEnv,actor:string,input:{id:string;digest:string;requestId:string;previousId:string|null}){
  const {db}=storage(env);const release=await verifyRelease(env,input.id);
  check(input.digest===release.manifest.digest,'確認只適用於預覽過的精確內容。',409);
  check(/^[a-zA-Z0-9:-]{8,160}$/.test(input.requestId),'操作識別碼無效。');
  const existing=await db.prepare('SELECT * FROM catalogue_publication_events WHERE request_id=?').bind(input.requestId).first<{release_id:string;digest:string}>();
  if(existing){check(existing.release_id===input.id&&existing.digest===input.digest,'此操作識別碼已被使用。',409);return existing;}
  const active=await setting(db,'active-release');check(active===input.previousId,'閱讀版已在另一分頁切換，請重新預覽。',409);
  const at=new Date().toISOString();
  // Atomic pointer switch and receipt; this publishes DATA through this running
  // application. It does not claim or manufacture a new Sites code deployment.
  try{await db.batch([
    db.prepare("INSERT INTO catalogue_settings(key,value) VALUES('active-release',?) ON CONFLICT(key) DO UPDATE SET value=CASE WHEN catalogue_settings.value=? THEN excluded.value ELSE NULL END").bind(input.id,active),
    db.prepare("UPDATE catalogue_releases SET state='published' WHERE id=?").bind(input.id),
    db.prepare("INSERT INTO catalogue_publication_events(request_id,release_id,previous_id,actor,at,action,digest) VALUES(?,?,?,?,?,?,?)").bind(input.requestId,input.id,active,actor,at,release.state==='published'?'rollback':'publish',input.digest),
  ]);}catch(error){
    const receipt=await db.prepare('SELECT * FROM catalogue_publication_events WHERE request_id=?').bind(input.requestId).first();
    if(receipt)return receipt;
    if(String(error).includes('NOT NULL'))throw new HttpError(409,'閱讀版已被其他分頁切換，請重新確認。');
    throw error;
  }
  return {kind:'data-publication',releaseId:input.id,digest:input.digest,previousId:active,at,actor};
}
import {HttpError} from './storage';
