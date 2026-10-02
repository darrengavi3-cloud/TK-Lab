import {loadResearchModules} from './research-ui-loader.mjs';
import {sqliteDatabase} from './research-sqlite.mjs';

// Actual router, catalogue imports, journal and SQLite migrations. The object
// store is an in-memory R2-shaped adapter; no production service is contacted.
export async function loadWorkspaceFixture() {
  const loaded = await loadResearchModules(['server/admin-router.ts','server/catalogue-service.ts','server/research-preview.ts','server/research-journal.ts','domain/create-record.ts','domain/prosopography/workspace.ts','domain/revisions.ts','domain/prosopography/time.ts'], {
    'server/bootstrap-service.ts': 'export function bootstrap(){throw Error("Unexpected bootstrap");}',
    'server/publication-service.ts': 'export function makePublication(){throw Error("Unexpected publication");} export const publishData=makePublication;',
  });
  const [router, catalogue, preview, journal, {createRecord}, workspace, revisions, time] = loaded.modules;
  async function fixture() {
    const db=sqliteDatabase(), objects=new Map();
    const bucket={async put(key,body){objects.set(key,typeof body==='string'?new TextEncoder().encode(body):new Uint8Array(body));},async get(key){const data=objects.get(key);return data?{body:data,arrayBuffer:async()=>data.slice().buffer,text:async()=>new TextDecoder().decode(data),json:async()=>JSON.parse(new TextDecoder().decode(data))}:null;}};
    const env={DB:db,BUCKET:bucket,ADMIN_OWNER_ID:'owner'};
    const person={...createRecord('person','person:workspace-test'),name:'合成人物'};
    const source={...createRecord('source','source:workspace-test'),title:'合成史料',text:'  原始字句\n異體字「幃」。 <script>不得執行</script>  ',edition:'測試本',locator:'卷一'};
    const appointment={...createRecord('appointment','appointment:workspace-test'),personId:person.id,officeName:'測試官',evidence:[{sourceId:source.id,sourceRevision:1,role:'support',note:''}]};
    for(const [i,data] of [person,source,appointment].entries()) await catalogue.saveRecord(db,'owner',{requestId:'fixture:record:'+i,baseRevision:0,data,reason:'合成測試資料'});
    const repo={watermark:()=>catalogue.watermark(db),snapshot:n=>catalogue.snapshot(db,n),getRevision:(id,n)=>catalogue.getRevision(db,id,n)};
    const raw=await preview.previewPersonResearch(repo,person.id);
    const inputSha256='a'.repeat(64), prefix='source:materials:'+inputSha256+':';
    const sources=[{...createRecord('source',prefix+'six'),title:'六年本',text:'  六年，授測試官。\n「行已」不改。  ',edition:'合成甲本',locator:'第六行'}, {...createRecord('source',prefix+'eight'),title:'八年本',text:'八年授測試官無句讀',edition:'合成乙本',locator:'第八行'}];
    const pack={format:'guanshitai-research-materials-1',title:'合成研究材料',subjectName:person.name,inputSha256,sources,events:[{key:'E01',original:'同一次授官的兩種紀年',type:'appointment',dates:[{key:'six',time:{...time.unknownTime('六年'),earliestYear:270,latestYear:270,precision:'year',certainty:'explicit'},derivation:'direct',rationale:'合成六年本',sourceIds:[sources[0].id]},{key:'eight',time:{...time.unknownTime('八年'),earliestYear:272,latestYear:272,precision:'year',certainty:'explicit'},derivation:'direct',rationale:'合成八年本',sourceIds:[sources[1].id]}],conflictNote:'同一任命，兩個候選年；不得串接連續任期。'}]};
    return {db,bucket,objects,env,person,source,appointment,repo,raw,pack,close:()=>db.close()};
  }
  return {...loaded, fixture, router, catalogue, preview, journal, workspace, revisions, time};
}
