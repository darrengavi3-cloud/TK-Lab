import tables from '../domain/backup-tables.json';
import researchTables from '../domain/research-backup-tables.json';
import {sha256} from '../domain/revisions';
import {check,storage,type CatalogueEnv} from './storage';

/** One D1 read transaction fixes every table before immutable R2 objects stream. */
export async function backup(env:CatalogueEnv):Promise<ReadableStream<Uint8Array>>{
  const {db,bucket}=storage(env);
  const schema=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('catalogue_research_revisions','catalogue_research_members','catalogue_research_pins')").all()).results;
  check(schema.length===0||schema.length===3,'研究資料表不完整，不能產生可能遺漏資料的備份。',503);
  const withResearch=schema.length===3,names=[...Object.keys(tables),...(withResearch?Object.keys(researchTables):[])];
  const results=await db.batch(names.map(name=>db.prepare('SELECT * FROM '+name+(name==='catalogue_settings'?" WHERE key IN ('baseline-ready','active-release')":''))));
  const data=Object.fromEntries(names.map((name,i)=>[name,results[i].results])) as Record<string,Record<string,unknown>[]>;
  const watermark=Math.max(0,...data.catalogue_commits.map(r=>Number(r.seq)));
  const keys=new Set<string>();
  for(const row of data.catalogue_objects)keys.add('originals/'+row.hash);
  for(const row of data.catalogue_imports)if(row.filename!=='單筆修訂')keys.add('imports/'+row.id+'.json');
  for(const row of data.catalogue_releases){
    keys.add('releases/'+row.id+'/manifest.json');
    for(const name of Object.keys(JSON.parse(String(row.manifest)).files))keys.add('releases/'+row.id+'/'+name);
  }
  if(data.catalogue_settings.some(r=>r.key==='baseline-ready'))keys.add('baseline/reader.json');
  async function* lines(){
    yield {type:'manifest',format:withResearch?'guanshitai-backup-4':'guanshitai-backup-3',watermark,at:new Date().toISOString(),tables:names};
    let rowCount=0;
    for(const table of names)for(const row of data[table]){yield {type:'row',table,row};rowCount++;}
    for(const key of keys){
      const object=await bucket.get(key);if(!object)throw new Error('Missing backup object '+key);
      const bytes=new Uint8Array(await object.arrayBuffer());
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
      yield {type:'object',key,bytes:bytes.length,sha256:hash};
      for(let offset=0;offset<bytes.length;offset+=32768)yield {type:'bytes',key,offset,data:btoa(String.fromCharCode(...bytes.slice(offset,offset+32768)))};
    }
    yield {type:'complete',watermark,rows:rowCount,objects:keys.size,rowsDigest:await sha256(JSON.stringify(data))};
  }
  const generator=lines(),encoder=new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async pull(controller){try{const item=await generator.next();if(item.done)controller.close();else controller.enqueue(encoder.encode(JSON.stringify(item.value)+'\n'));}catch(e){controller.error(e);}},
    async cancel(){await generator.return(undefined);},
  });
}
