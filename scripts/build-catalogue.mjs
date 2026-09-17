import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import vm from 'node:vm';
import {gzipSync} from 'node:zlib';
import {readLegacyBaseline} from '../importers/legacy-atlas/index.mjs';
import {readOfficeNodes} from './reader-reference-inputs.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
fs.mkdirSync('server/generated',{recursive:true});
fs.mkdirSync('work/migration',{recursive:true});
const baseline=readLegacyBaseline();
const seed={schemaVersion:1,records:baseline.records,readerBaseline:baseline.readerBaseline,inputDigest:baseline.inputDigest,manifest:baseline.manifest,archives:baseline.archives};
const seedText=JSON.stringify(seed);
fs.writeFileSync('work/migration/v86-seed.json',seedText);
// Private Worker module, never copied into public assets.
fs.writeFileSync('server/generated/baseline-seed.ts','export default '+JSON.stringify(gzipSync(seedText).toString('base64'))+';\n');
for(const [name,archive] of Object.entries(baseline.archives)){
  const destination=path.join('work/migration/originals',name);
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,archive.text);
}
fs.writeFileSync('server/generated/baseline-manifest.json',JSON.stringify({sha256:hash(seedText),inputDigest:baseline.inputDigest,records:seed.records.length,manifest:baseline.manifest}));
const references=JSON.parse(fs.readFileSync('domain/reader-references.json','utf8'));
const officeTrees=readOfficeNodes();
for(const ref of references.offices){
  const node=officeTrees[ref.factionKey]?.office.find(n=>n.key===ref.nodeKey);
  if(!node||node.name!==ref.name)throw new Error('官職穩定關聯已改動，請明確遷移：'+ref.id);
}
const codeInputs=['domain/catalogue.ts','domain/revisions.ts','domain/publication.ts','domain/reader-references.json','server/catalogue-service.ts','server/import-service.ts','server/publication-service.ts','server/reader-links.ts','server/reading-projections.ts','server/admin-router.ts','atlas/data/reviewed-office-succession.json','atlas/data/v69-fangzhen-reader.json','atlas/data/v66-administrative-seat-periods.json'];
const codeId=hash(codeInputs.map(p=>p+'\0'+fs.readFileSync(p,'utf8')).join('\n'));
const assetsDigest=hash(fs.readFileSync('release-metadata/reader-bundle.json'));
fs.writeFileSync('server/generated/build-identity.json',JSON.stringify({codeId,assetsDigest,readerContract:1,dataBaseline:'V86',model:1,policy:'r1-compatible-v1'}));
const reader='public/legacy/index.html';
if(fs.existsSync(reader))fs.copyFileSync(reader,'server/generated/reader.html');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('public/legacy/data/v69-person-profiles.js','utf8'),context,{timeout:1000});
fs.writeFileSync('server/generated/reader-profiles.json',JSON.stringify(context.window.SGZ_V69_PERSON_PROFILES));
const xlsx=fs.readFileSync('atlas/assets/vendor/xlsx/xlsx.full.min.js','utf8')+'\nexport default XLSX;\n';
await build({stdin:{contents:xlsx,loader:'js',resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',define:{require:'undefined',module:'undefined',exports:'undefined'},minify:true,outfile:'server/generated/xlsx.mjs',logLevel:'silent'});
if(fs.existsSync('admin/client.ts'))await build({entryPoints:['admin/client.ts'],bundle:true,format:'esm',platform:'browser',minify:true,outfile:'public/admin-client.mjs',logLevel:'silent'});
console.log(JSON.stringify({baselineRecords:seed.records.length,seedBytes:Buffer.byteLength(seedText),codeId}));
