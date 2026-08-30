import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const auditPath=path.join(root,'data/v65-epigraphy-audit.json');
const outputPath=path.join(root,'data/v65-epigraphy-individual-search.json');
const audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
const targets=(audit.records||[]).filter(row=>row.publicationStatus==='review-only');
const endpoints=[
  {key:'wikipedia',label:'中文 Wikipedia',api:'https://zh.wikipedia.org/w/api.php'},
  {key:'wikisource',label:'维基文库',api:'https://zh.wikisource.org/w/api.php'},
];
const prior=fs.existsSync(outputPath)?JSON.parse(fs.readFileSync(outputPath,'utf8')):{records:[]};
const priorById=new Map((prior.records||[]).map(row=>[row.recordId,row]));
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const clean=value=>String(value==null?'':value).trim();

function requestUrl(endpoint,name){
  const url=new URL(endpoint.api);
  url.search=new URLSearchParams({
    action:'query',
    list:'search',
    srsearch:`"${name}"`,
    srnamespace:'0',
    srlimit:'10',
    format:'json',
    formatversion:'2',
  }).toString();
  return url;
}

function isReusable(search,endpoint,name){
  if(search?.status!=='completed'||search?.httpStatus!==200||search?.method!=='individual-single-name-api') return false;
  try{
    const url=new URL(search.url);
    return url.origin===new URL(endpoint.api).origin&&url.searchParams.get('srsearch')===`"${name}"`&&!/\sOR\s/i.test(url.searchParams.get('srsearch')||'');
  }catch{return false;}
}

async function fetchOne(endpoint,record){
  const url=requestUrl(endpoint,record.name);
  let lastError='';
  for(let attempt=1;attempt<=8;attempt+=1){
    try{
      const response=await fetch(url,{
        headers:{'user-agent':'GuanShiTai-V65/1.0 (owner-only historical research; individual epigraphy discovery)'},
        signal:AbortSignal.timeout(20_000),
      });
      if(response.status===429||response.status>=500){
        lastError=`HTTP ${response.status}`;
        const retryAfter=Number(response.headers.get('retry-after')||0);
        await wait(Math.min(60_000,Math.max(8_000,retryAfter*1000||attempt*8_000)));
        continue;
      }
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload=await response.json();
      const results=(payload.query?.search||[]).map(item=>({
        pageid:item.pageid??null,
        title:clean(item.title),
        snippet:clean(item.snippet).replace(/<[^>]+>/g,''),
        timestamp:clean(item.timestamp),
      }));
      return {
        endpoint:endpoint.key,
        source:endpoint.label,
        method:'individual-single-name-api',
        query:record.name,
        url:url.toString(),
        status:'completed',
        httpStatus:response.status,
        searchedAt:'2026-08-30',
        totalHits:results.length,
        resultTitles:results.map(item=>item.title),
        results,
      };
    }catch(error){
      lastError=error instanceof Error?error.message:String(error);
      await wait(Math.min(20_000,attempt*2_000));
    }
  }
  return {
    endpoint:endpoint.key,
    source:endpoint.label,
    method:'individual-single-name-api',
    query:record.name,
    url:url.toString(),
    status:'failed',
    httpStatus:null,
    searchedAt:'2026-08-30',
    totalHits:0,
    resultTitles:[],
    results:[],
    error:lastError,
  };
}

const records=targets.map(row=>({
  recordId:row.recordId,
  name:row.name,
  searches:[...(priorById.get(row.recordId)?.searches||[])],
}));
const byId=new Map(records.map(row=>[row.recordId,row]));

for(const endpoint of endpoints){
  const pending=targets.filter(record=>{
    const existing=byId.get(record.recordId)?.searches.find(search=>search.endpoint===endpoint.key);
    return !isReusable(existing,endpoint,record.name);
  });
  let cursor=0;
  const worker=async()=>{
    while(cursor<pending.length){
      const index=cursor++;
      const record=pending[index];
      const result=await fetchOne(endpoint,record);
      const target=byId.get(record.recordId);
      target.searches=target.searches.filter(search=>search.endpoint!==endpoint.key);
      target.searches.push(result);
      if((index+1)%10===0||index+1===pending.length) console.log(`V65 ${endpoint.label} 独立检索 ${index+1}/${pending.length}`);
      await wait(1_200);
    }
  };
  await Promise.all(Array.from({length:Math.min(1,Math.max(1,pending.length))},worker));
}

for(const record of records){
  record.searches.sort((a,b)=>endpoints.findIndex(endpoint=>endpoint.key===a.endpoint)-endpoints.findIndex(endpoint=>endpoint.key===b.endpoint));
}
const searches=records.flatMap(record=>record.searches);
const payload={
  schemaVersion:'V65',
  modelId:'sgz-v65-epigraphy-individual-search',
  searchedAt:'2026-08-30',
  scope:'对仍为空的136条金石逐碑分别执行中文 Wikipedia 与维基文库单碑名 API 查询；查询结果仅作候选发现，不自动写入释文。',
  method:'individual-single-name-api',
  targetCount:targets.length,
  endpointCount:endpoints.length,
  completedSearches:searches.filter(row=>row.status==='completed'&&row.httpStatus===200).length,
  failedSearches:searches.filter(row=>row.status!=='completed'||row.httpStatus!==200).length,
  completedRecords:records.filter(row=>endpoints.every(endpoint=>isReusable(row.searches.find(search=>search.endpoint===endpoint.key),endpoint,row.name))).length,
  records,
};
fs.writeFileSync(outputPath,`${JSON.stringify(payload,null,2)}\n`);
console.log(JSON.stringify({targetCount:payload.targetCount,completedRecords:payload.completedRecords,completedSearches:payload.completedSearches,failedSearches:payload.failedSearches},null,2));
if(payload.targetCount!==136||payload.completedRecords!==136||payload.failedSearches!==0) process.exitCode=1;
