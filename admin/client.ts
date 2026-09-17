import {createRecord} from '../domain/create-record';
import {canonicalJson,type Revision} from '../domain/revisions';
import type {CatalogueRecord,Evidence,AppointmentReaderLinks} from '../domain/catalogue';
interface VueBridge {toRefs:<T extends object>(value:T)=>Record<keyof T,unknown>;createApp:(options:Record<string,unknown>)=>{use:(plugin:unknown,options?:unknown)=>{mount:(selector:string)=>void}};reactive:<T extends object>(value:T)=>T;computed:<T>(getter:()=>T)=>{value:T};watch:(getter:()=>unknown,callback:()=>void,options?:Record<string,unknown>)=>void;onMounted:(fn:()=>void|Promise<void>)=>void;nextTick:()=>Promise<void>}
declare global {interface Window {Vue:VueBridge;ElementPlus:{ElMessageBox:{confirm:(message:string,title:string,options?:Record<string,unknown>)=>Promise<unknown>}}}}
interface Row {id:string;version:number;data:CatalogueRecord;digest:string}
interface Job {id:string;filename:string;state:string;total:number}
interface Candidate {id:string;digest:string;counts:{people:number;appointments:number;pending:number;linkedAppointments?:number;fangzhen?:number};changes:{id:string;revision:number;assessment:string}[]}
interface LinkOptions {
  offices:{id:string;factionKey:string;nodeKey:string;name:string;category:string;path:string[]}[];
  inherited:Record<string,string[]>;
  units:{id:string;name:string;polity:string}[];
  fangzhen:{id:string;personId:string;title:string;jurisdiction:string;polity:string;dynastyLabel:string;recordType:string;tenureText:string;administrativeUnitId:string|null}[];
}
const polityLabels:Record<string,string>={han:'後漢',wei:'曹魏',shu:'季漢',wu:'孫吳',jin:'西晉',eastjin:'東晉',tribal:'異族諸部'};
interface Release {id:string;state:string;at:string;watermark:number;manifest:Candidate}
interface Preview {job:Job;count:number;warnings:string[];errors:{row:number;message:string}[];rows:{id:string;kind:string;baseVersion:number;data:CatalogueRecord}[];more:boolean}
class ApiError extends Error {status:number;constructor(status:number,message:string){super(message);this.status=status;}}
const {createApp,reactive,computed,watch,onMounted,nextTick}=window.Vue;
const randomId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16))).map(v=>v.toString(16).padStart(2,'0')).join('');
async function api<T>(path:string,method='GET',value?:unknown):Promise<T>{
  const response=await fetch('/api/admin'+path,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json','X-Catalogue-Request':'1'},body:value===undefined?undefined:JSON.stringify(value)});
  const data=await response.json() as {error?:string};if(!response.ok)throw new ApiError(response.status,data.error||'請求未完成。');return data as T;
}
const locale={name:'zh-tw',el:{select:{loading:'載入中',noMatch:'沒有符合的記錄',noData:'尚無記錄',placeholder:'請選擇'},table:{emptyText:'尚無資料',confirmFilter:'確認',resetFilter:'重設',clearFilter:'全部',sumText:'合計'},pagination:{goto:'前往',pagesize:'筆／頁',total:'共 {total} 筆',pageClassifier:'頁',page:'頁',prev:'上一頁',next:'下一頁',currentPage:'第 {pager} 頁',prevPages:'向前 {pager} 頁',nextPages:'向後 {pager} 頁'},messagebox:{title:'提示',confirm:'確認',cancel:'取消',error:'資料無效',close:'關閉'},inputNumber:{decrease:'減少',increase:'增加'}}};
const labels:Record<string,string>={pending:'待核',verified:'已核',disputed:'存疑',excluded:'排除'};
const names:Record<string,string>={person:'人物',appointment:'任官',source:'史料'};
function recordName(data:CatalogueRecord){return data.kind==='person'?data.name:data.kind==='source'?data.title:data.officeName;}
const navigation=[{id:'workspace',label:'資料工作台'},{id:'sources',label:'史料庫'},{id:'imports',label:'匯入中心'},{id:'history',label:'修訂紀錄'},{id:'publish',label:'發布中心'},{id:'settings',label:'系統設定'}];
const fieldLabels:Record<string,string>={id:'穩定 ID',kind:'資料類型',name:'姓名',aliases:'別名',aliasPublication:'別名審定',title:'典籍或史料名稱',edition:'底本版本',locator:'卷頁定位',text:'原文',textScope:'原文範圍',url:'來源網址',personId:'人物',officeId:'官職',officeName:'原始官名',nature:'任職性質',polity:'政權',jurisdiction:'轄區',date:'年代',assessment:'史實判斷',workflow:'整理進度',visibility:'讀者可見性',disposition:'處置',decisionReason:'史實判斷依據',evidence:'引用史料',duplicateOf:'互證所屬記錄',legacy:'原始資料映射',readerLinks:'閱讀關聯'};
const dispositions=[{value:'incorrect',label:'確認錯誤'},{value:'duplicate',label:'重複互證'},{value:'not-held',label:'未實任'},{value:'out-of-scope',label:'範圍排除'},{value:'legacy-suppressed',label:'沿用舊處置，尚未細分'}];
const fieldSets:Record<string,{key:string;label:string}[]>={
  person:[{key:'id',label:'穩定 ID（可留空）'},{key:'name',label:'人物姓名'},{key:'aliases',label:'別名（分號分隔）'}],
  source:[{key:'id',label:'穩定 ID（可留空）'},{key:'title',label:'題名'},{key:'edition',label:'版本'},{key:'locator',label:'卷頁定位'},{key:'text',label:'原文'},{key:'url',label:'來源網址'}],
  appointment:[{key:'id',label:'穩定 ID（可留空）'},{key:'personId',label:'人物 ID'},{key:'officeName',label:'原始官名'},{key:'officeId',label:'官職 ID（可留空）'},{key:'nature',label:'任職性質'},{key:'polity',label:'政權'},{key:'jurisdiction',label:'轄區'},{key:'dateText',label:'原始年代'},{key:'startYear',label:'起年'},{key:'endYear',label:'迄年'}],
};
createApp({setup(){
  const state=reactive({needsBaseline:false,screen:'workspace',kind:'person' as CatalogueRecord['kind'],query:'',page:1,total:0,rows:[] as Row[],selected:null as Revision|null,loadedJson:'',reason:'',reviewed:false,ready:false,loading:false,busy:false,error:'',message:'',unauthorized:false,actor:'',theme:'laitai-day',composing:false,referenceLoading:false,personOptions:[] as Row[],sourceOptions:[] as Row[],conflict:null as Revision|null,recoverable:null as {base:number;data:CatalogueRecord;reason:string;at:number}|null,draftPersisted:false,revisions:[] as Revision[],jobs:[] as Job[],fileHash:'',fileInfo:null as {filename:string;total:number;columns:string[];native:boolean}|null,importKind:'person',mapping:{} as Record<string,string>,allowUnmapped:false,importPreview:null as Preview|null,importConfirmed:false,staging:false,stopStaging:false,releases:[] as Release[],candidate:null as Candidate|null,publishConfirmed:false,activeRelease:null as string|null});
  let listEpoch=0,selectionEpoch=0,personEpoch=0,sourceEpoch=0,draftTimer:ReturnType<typeof setTimeout>|undefined;
  const references=reactive({value:null as LinkOptions|null,officeQuery:''});
  const activeLinks=computed<AppointmentReaderLinks>(()=>{
    const a=state.selected?.data;
    return a?.kind==='appointment'?(a.readerLinks??{offices:references.value?.inherited[a.id]||[],fangzhen:null}):{offices:[],fangzhen:null};
  });
  const officeOptions=computed(()=>{
    const all=references.value?.offices||[],q=references.officeQuery.trim().toLowerCase();
    const selected=all.filter(o=>activeLinks.value.offices.includes(o.id));
    const matches=all.filter(o=>!activeLinks.value.offices.includes(o.id)&&q.split(/\s+/).every(term=>[...o.path,o.category,polityLabels[o.factionKey]].join(' ').toLowerCase().includes(term)));
    return [...selected,...matches.slice(0,60)];
  });
  const fangzhenOptions=computed(()=>references.value?.fangzhen.filter(r=>state.selected?.data.kind==='appointment'&&r.personId===state.selected.data.personId)||[]);
  function updateLinks(links:AppointmentReaderLinks){if(state.selected?.data.kind==='appointment')state.selected.data.readerLinks=links;}
  function setOfficeLinks(offices:string[]){updateLinks({...activeLinks.value,offices});}
  function toggleFangzhen(enabled:boolean){updateLinks({...activeLinks.value,fangzhen:enabled?{recordId:null,polityKey:'han',recordType:'other',administrativeUnitId:null}:null});}
  function setFangzhenField(key:string,value:string|null){const f=activeLinks.value.fangzhen;if(f)updateLinks({...activeLinks.value,fangzhen:{...f,[key]:value||null}});}
  function selectFangzhenRecord(id:string){
    const old=references.value?.fangzhen.find(r=>r.id===id),f=activeLinks.value.fangzhen;if(!f)return;
    if(!old){setFangzhenField('recordId',null);return;}
    const key=({后汉:'han',季汉:'shu',魏:'wei',吴:'wu',西晋:'jin',东晋:'eastjin'} as Record<string,string>)[old.dynastyLabel]||f.polityKey;
    const unit=state.selected?.data.kind==='appointment'&&old.jurisdiction===state.selected.data.jurisdiction?old.administrativeUnitId:null;
    updateLinks({...activeLinks.value,fangzhen:{recordId:old.id,polityKey:key as typeof f.polityKey,recordType:old.recordType as typeof f.recordType,administrativeUnitId:unit}});
  }
  const dirty=()=>!!state.selected&&canonicalJson(state.selected.data)!==state.loadedJson;
  const draftKey=()=>state.selected?'guanshitai:admin-draft:'+state.actor+':'+state.selected.id:'';
  const saveStatus=computed(()=>state.busy?'正在處理…':dirty()?(state.draftPersisted?'未保存 · 草稿已暫存此裝置':'有修改，尚未保存'):state.selected?.number?'已保存於伺服器':'尚未保存');
  const mappingFields=computed(()=>fieldSets[state.importKind]);
  const clearFeedback=()=>{state.error='';state.message='';state.unauthorized=false;};
  function failure(error:unknown){void nextTick().then(()=>document.querySelector<HTMLElement>('#admin-error')?.focus());state.error=error instanceof Error?error.message:'操作未完成，請稍後重試。';state.unauthorized=error instanceof ApiError&&(error.status===401||error.status===403);}
  async function run(fn:()=>Promise<void>){if(state.busy)return;clearFeedback();state.busy=true;try{await fn();}catch(error){failure(error);}finally{state.busy=false;}}
  function persistDraft(){if(!state.selected||!state.actor||!dirty())return;try{localStorage.setItem(draftKey(),JSON.stringify({base:state.selected.number,data:state.selected.data,reason:state.reason,at:Date.now()}));state.draftPersisted=true;}catch{state.draftPersisted=false;}}
  async function canLeave(){persistDraft();if(!dirty()||state.draftPersisted)return true;try{await window.ElementPlus.ElMessageBox.confirm('此裝置無法暫存草稿。離開會捨棄尚未保存的輸入。','保留未保存內容',{confirmButtonText:'捨棄並離開',cancelButtonText:'繼續編輯',type:'warning'});return true;}catch{return false;}}
  watch(()=>state.selected?canonicalJson(state.selected.data)+state.reason:'',()=>{clearTimeout(draftTimer);state.draftPersisted=false;draftTimer=setTimeout(persistDraft,300);state.reviewed=false;});
  function writeUrl(){const p=new URLSearchParams({screen:state.screen,kind:state.kind,page:String(state.page)});if(state.query)p.set('q',state.query);if(state.selected)p.set('id',state.selected.id);history.replaceState(null,'','/admin?'+p);}
  async function loadList(){const epoch=++listEpoch;state.loading=true;try{const result=await api<{rows:Row[];total:number}>('/records?kind='+state.kind+'&q='+encodeURIComponent(state.query)+'&page='+state.page);if(epoch!==listEpoch)return;state.rows=result.rows;state.total=result.total;writeUrl();}catch(e){if(epoch===listEpoch)failure(e);}finally{if(epoch===listEpoch)state.loading=false;}}
  async function closeEditor(){if(await canLeave())state.selected=null;}
  async function clearSearch(){state.query='';state.page=1;await loadList();document.querySelector<HTMLInputElement>('input[aria-label="搜尋記錄"]')?.focus();}
  async function search(){if(state.composing)return;state.page=1;await loadList();}
  async function loadReleases(){const result=await api<{active:string|null;rows:Release[]}>('/releases');state.releases=result.rows;state.activeRelease=result.active;}
  async function refreshScreen(){clearFeedback();if(state.screen==='workspace'||state.screen==='sources')await loadList();else if(state.screen==='imports')state.jobs=await api<Job[]>('/imports');else if(state.screen==='publish')await loadReleases();else if(state.screen==='history'&&state.selected)state.revisions=await api<Revision[]>('/records/'+encodeURIComponent(state.selected.id)+'/history');}
  async function navigate(screen:string){if(!await canLeave())return;state.screen=screen;if(screen==='sources'){state.kind='source';state.selected=null;state.query='';state.page=1;}else if(screen==='workspace'&&state.kind==='source'){state.kind='person';state.selected=null;state.query='';state.page=1;}writeUrl();try{await refreshScreen();}catch(e){failure(e);}}
  async function changeKind(){if(!await canLeave())return;state.selected=null;state.page=1;state.query='';await loadList();}
  async function searchPeople(q:string){const epoch=++personEpoch;state.referenceLoading=true;try{const r=await api<{rows:Row[]}>('/records?kind=person&q='+encodeURIComponent(q));if(epoch===personEpoch)state.personOptions=r.rows;}catch(e){failure(e);}finally{if(epoch===personEpoch)state.referenceLoading=false;}}
  async function searchSources(q:string){const epoch=++sourceEpoch;try{const r=await api<{rows:Row[]}>('/records?kind=source&q='+encodeURIComponent(q));if(epoch===sourceEpoch)state.sourceOptions=r.rows;}catch(e){failure(e);}}
  function readDraft(id:string){try{const raw=localStorage.getItem('guanshitai:admin-draft:'+state.actor+':'+id);if(!raw)return null;const value=JSON.parse(raw);if(Date.now()-value.at>7*86400000)return null;return value;}catch{return null;}}
  async function selectRecord(id:string){
    if(!await canLeave())return;const epoch=++selectionEpoch;clearFeedback();state.loading=true;
    try{
      let r:Revision;try{r=await api<Revision>('/records/'+encodeURIComponent(id));}catch(e){const d=readDraft(id);if(!(e instanceof ApiError)||e.status!==404||!d)throw e;r={id,number:0,commit:0,data:createRecord(d.data.kind,id),digest:'',actor:state.actor,at:'',reason:''};}
      if(epoch!==selectionEpoch)return;state.selected=r;state.loadedJson=canonicalJson(r.data);state.reason='';state.reviewed=false;state.conflict=null;state.recoverable=readDraft(id);if(state.recoverable&&canonicalJson(state.recoverable.data)===state.loadedJson){try{localStorage.removeItem(draftKey());}catch{}state.recoverable=null;}state.draftPersisted=false;
      if(r.data.kind==='appointment'){const p=await api<Revision>('/records/'+encodeURIComponent(r.data.personId));if(epoch!==selectionEpoch)return;state.personOptions=[{id:p.id,version:p.number,data:p.data,digest:p.digest}];}
      if(r.data.evidence.length){const result=await Promise.all(r.data.evidence.map(e=>api<Revision>('/records/'+encodeURIComponent(e.sourceId))));if(epoch!==selectionEpoch)return;state.sourceOptions=result.map(x=>({id:x.id,version:x.number,data:x.data,digest:x.digest}));}
      writeUrl();await nextTick();document.querySelector<HTMLElement>('.editor h2')?.focus();
    }catch(e){if(epoch===selectionEpoch)failure(e);}finally{if(epoch===selectionEpoch)state.loading=false;}
  }
  async function newRecord(){if(!await canLeave())return;clearFeedback();const id=state.kind+':'+randomId(),data=createRecord(state.kind,id);state.selected={id,number:0,commit:0,data,digest:'',actor:state.actor,at:'',reason:''};state.loadedJson=canonicalJson(data);state.reason='';state.reviewed=false;state.recoverable=null;state.conflict=null;writeUrl();if(state.kind==='appointment')void searchPeople('');}
  function restoreDraft(){if(!state.selected||!state.recoverable)return;state.selected.data=state.recoverable.data;state.selected.number=state.recoverable.base;state.reason=state.recoverable.reason;state.recoverable=null;state.message='已恢復裝置草稿，尚未保存於伺服器。';}
  function discardDraft(){try{localStorage.removeItem(draftKey());}catch{}state.recoverable=null;}
  function useConflictBase(){if(!state.selected||!state.conflict)return;state.selected.number=state.conflict.number;state.conflict=null;state.reviewed=false;state.message='保留了你的輸入；請完成比較再保存。';}
  async function save(){await run(async()=>{
    if(!state.selected)return;const s=state.selected,data=JSON.parse(canonicalJson(s.data)) as CatalogueRecord;
    if(data.assessment!=='excluded'){data.disposition='none';if(data.kind==='appointment')data.duplicateOf=null;}
    if(data.kind==='appointment'){data.date.startYear=data.date.startYear??null;data.date.endYear=data.date.endYear??null;}
    if(!state.reason.trim())throw new Error('請填寫本次修訂說明。');
    const request={requestId:'edit:'+randomId(),baseRevision:s.number,data,reason:state.reason,reviewedContentDigest:state.reviewed?(await api<{digest:string}>('/review','POST',{data})).digest:undefined};
    try{
      const r=await api<Revision>('/records','POST',request);
      discardDraft();state.selected=r;state.loadedJson=canonicalJson(r.data);state.reason='';state.reviewed=false;state.message='已保存修訂 '+r.number+'；閱讀版尚未改變。';await loadList();
    }catch(error){if(error instanceof ApiError&&error.status===409)state.conflict=await api<Revision>('/records/'+encodeURIComponent(s.id));throw error;}
  });}
  async function showHistory(){await navigate('history');}
  async function restoreRevision(r:Revision){if(!state.selected)return;const latest=await api<Revision>('/records/'+encodeURIComponent(r.id));state.selected={...latest,data:JSON.parse(canonicalJson(r.data))};state.loadedJson=canonicalJson(latest.data);state.reason='恢復修訂 '+r.number+' 的內容';state.reviewed=false;state.screen=r.data.kind==='source'?'sources':'workspace';state.kind=r.data.kind;writeUrl();state.message='舊內容已載入，請核對後保存為新修訂。';}
  function addEvidence(){state.selected?.data.evidence.push({sourceId:'',sourceRevision:1,role:'support',note:''});void searchSources('');}
  function setEvidenceVersion(e:Evidence){e.sourceRevision=state.sourceOptions.find(s=>s.id===e.sourceId)?.version||1;}
  async function chooseFile(event:Event){const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;await run(async()=>{
    if(file.size>24*1024*1024)throw new Error('檔案不可超過 24 MB。');
    const response=await fetch('/api/admin/objects',{method:'POST',credentials:'same-origin',headers:{'X-Catalogue-Request':'1','X-Filename':encodeURIComponent(file.name),'Content-Type':'application/octet-stream'},body:file});
    const result=await response.json() as {hash:string;error:string};if(!response.ok)throw new ApiError(response.status,result.error);
    state.fileHash=result.hash;state.fileInfo=await api('/objects/'+result.hash+'/inspect');state.mapping={};state.importPreview=null;state.importConfirmed=false;
    for(const f of fieldSets[state.importKind])if(state.fileInfo?.columns.includes(f.key))state.mapping[f.key]=f.key;
  });}
  async function openImport(id:string){clearFeedback();try{state.importPreview=await api<Preview>('/imports/'+encodeURIComponent(id));state.importConfirmed=false;}catch(e){failure(e);}}
  async function resumeImport(){await run(async()=>{if(!state.importPreview)return;state.staging=true;state.stopStaging=false;try{while(!state.stopStaging){const r=await api<{state:string;count:number;total:number}>('/imports/'+encodeURIComponent(state.importPreview.job.id)+'/stage','POST',{});state.importPreview.count=r.count;state.importPreview.job.state=r.state;if(r.state!=='staging')break;}state.message=state.stopStaging?'已暫停；可從此批次繼續。':'預覽已準備，尚未提交。';}finally{state.staging=false;}});}
  async function prepareImport(){await run(async()=>{const job=await api<Job>('/imports','POST',{hash:state.fileHash,mapping:{kind:state.importKind,columns:state.mapping,allowUnmapped:state.allowUnmapped}});await openImport(job.id);state.jobs=await api<Job[]>('/imports');});if(state.importPreview?.job.state==='staging')await resumeImport();}
  async function commitImport(){await run(async()=>{if(!state.importPreview||!state.importConfirmed)return;await api('/imports/'+encodeURIComponent(state.importPreview.job.id)+'/commit','POST',{reason:'確認匯入 '+state.importPreview.job.filename});state.importPreview.job.state='committed';state.jobs=await api<Job[]>('/imports');state.message='整批已保存於工作資料；閱讀版尚未改變。';});}
  async function initializeBaseline(){
    await run(async()=>{const job=await api<Job>('/bootstrap','POST',{});state.screen='imports';await openImport(job.id);writeUrl();});
    if(state.importPreview?.job.state==='staging')await resumeImport();
    if(state.importPreview?.job.state==='ready'){state.importConfirmed=true;await commitImport();}
    if(state.importPreview?.job.state==='committed'){state.needsBaseline=false;state.message='既有資料已載入。可以開始編輯；目前閱讀內容維持原版。';}
  }
  async function createCandidate(){await run(async()=>{state.candidate=await api<Candidate>('/releases','POST',{});state.publishConfirmed=false;await loadReleases();state.message='候選已固定，請打開閱讀預覽核對。';});}
  async function publishCandidate(){await run(async()=>{if(!state.candidate||!state.publishConfirmed)return;await api('/publish','POST',{id:state.candidate.id,digest:state.candidate.digest,previousId:state.activeRelease,requestId:'publish:'+randomId()});await loadReleases();state.publishConfirmed=false;state.message='閱讀內容已發布。後續保存的草稿不會改動此版本。';});}
  async function rollback(r:Release){try{await window.ElementPlus.ElMessageBox.confirm('切回 '+formatTime(r.at)+' 的閱讀內容？工作資料與後續修訂會保留。','確認切换閱讀版',{confirmButtonText:'切回此版',cancelButtonText:'取消',type:'warning'});}catch{return;}state.candidate=r.manifest;state.publishConfirmed=true;await publishCandidate();}
  function setTheme(){document.documentElement.dataset.sgzTheme=state.theme;try{const prefs=JSON.parse(localStorage.getItem('sgz_ui_preferences_v56')||'{}');localStorage.setItem('sgz_ui_preferences_v56',JSON.stringify({...prefs,theme:state.theme}));}catch{}}
  function formatTime(value:string){return value?new Intl.DateTimeFormat('zh-Hant',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'';}
  window.addEventListener('beforeunload',event=>{persistDraft();if(dirty()&&!state.draftPersisted){event.preventDefault();}});
  window.addEventListener('pagehide',persistDraft);
  onMounted(async()=>{try{
    const session=await api<{actor:string;baselineLoaded:boolean}>('/session');state.actor=session.actor;state.needsBaseline=!session.baselineLoaded;
    references.value=await api<LinkOptions>('/reader-links');state.ready=true;
    const params=new URLSearchParams(location.search);const screen=params.get('screen');if(navigation.some(n=>n.id===screen))state.screen=screen!;
    const kind=params.get('kind');if(['person','appointment','source'].includes(kind||''))state.kind=kind as CatalogueRecord['kind'];
    if(state.screen==='sources')state.kind='source';state.query=params.get('q')||'';state.page=Number(params.get('page'))||1;
    try{state.theme=JSON.parse(localStorage.getItem('sgz_ui_preferences_v56')||'{}').theme||'laitai-day';}catch{}setTheme();
    await refreshScreen();const selected=params.get('id');if(selected)await selectRecord(selected);
  }catch(e){failure(e);}});
  return {...window.Vue.toRefs(state),closeEditor,clearSearch,
    activeLinks,officeOptions,fangzhenOptions,polityLabels,unitOptions:computed(()=>references.value?.units||[]),
    filterOffices:(q:string)=>{references.officeQuery=q;},officeLabel:(o:LinkOptions['offices'][number])=>[polityLabels[o.factionKey],...o.path].filter(Boolean).join(' · '),
    setOfficeLinks,toggleFangzhen,setFangzhenField,selectFangzhenRecord,
    differences:(before:Record<string,unknown>,after:Record<string,unknown>)=>[...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])).map(k=>({field:fieldLabels[k]||k,before:before[k]??'—',after:after[k]??'—'})),
    initializeBaseline,navigation,dispositions,assessments:Object.entries(labels).map(([value,label])=>({value,label})),saveStatus,mappingFields,
    kindLabel:(kind:string)=>names[kind]||kind,assessmentLabel:(a:string)=>labels[a]||a,recordName,format:(v:unknown)=>JSON.stringify(v,null,2),formatTime,
    importState:(s:string)=>({staging:'暫存中',ready:'等待確認',invalid:'需要修正',committed:'已提交'}[s]||s),
    navigate,refreshScreen,loadList,search,changeKind,selectRecord,newRecord,restoreDraft,discardDraft,useConflictBase,save,showHistory,restoreRevision,searchPeople,searchSources,addEvidence,setEvidenceVersion,chooseFile,prepareImport,openImport,resumeImport,commitImport,createCandidate,publishCandidate,rollback,setTheme};
}}).use(window.ElementPlus,{locale}).mount('#catalogue');
