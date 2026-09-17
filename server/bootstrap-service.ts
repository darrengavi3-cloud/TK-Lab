import seed from './generated/baseline-seed';
import manifest from './generated/baseline-manifest.json';
import {storage,check,type CatalogueEnv} from './storage';
import {upload,createImport} from './import-service';

/** Called only after the normal owner + origin guards. No installation token. */
export async function bootstrap(env:CatalogueEnv){
  const {db}=storage(env);
  const exists=await db.prepare('SELECT hash FROM catalogue_objects WHERE hash=?').bind(manifest.sha256).first();
  if(!exists){
    check((await db.prepare('SELECT count(*) AS n FROM catalogue_records').first<{n:number}>())?.n===0,'已有工作資料，不能重新載入初始基線。',409);
    const compressed=Uint8Array.from(atob(seed),c=>c.charCodeAt(0));
    const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip') as unknown as ReadableWritablePair<Uint8Array,Uint8Array>);
    const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
    const object=await upload(env,bytes,'v86-seed.json','application/json');
    check(object.hash===manifest.sha256,'基線封包核驗失敗。',409);
  }
  return createImport(env,manifest.sha256,{kind:'person',columns:{},allowUnmapped:false});
}
