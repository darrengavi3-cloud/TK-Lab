import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {verifyResearchBackup} from './verify-research-backup.mjs';
const baseTables=JSON.parse(fs.readFileSync(new URL('../domain/backup-tables.json',import.meta.url),'utf8'));
const researchTables=JSON.parse(fs.readFileSync(new URL('../domain/research-backup-tables.json',import.meta.url),'utf8'));
const tables={...baseTables,...researchTables};
const hash=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>JSON.stringify(sort(value));
function sort(value){if(Array.isArray(value))return value.map(sort);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,sort(value[k])]));return value;}
const requireValue=(condition,message)=>{if(!condition)throw new Error(message);};
const safeKey=key=>/^(originals\/[a-f0-9]{64}|imports\/import:[a-f0-9]{64}\.json|baseline\/reader\.json|releases\/[a-f0-9]{64}\/(manifest\.json|data\/[a-z0-9.-]+))$/.test(key)&&!key.includes('..');

export function verifyBackup(buffer){
  const text=gunzipSync(buffer,{maxOutputLength:256*1024*1024}).toString('utf8');
  const lines=text.trimEnd().split('\n').map(line=>JSON.parse(line));
  const first=lines.shift(),last=lines.pop();
  requireValue(['guanshitai-backup-2','guanshitai-backup-3','guanshitai-backup-4'].includes(first?.format)&&last?.type==='complete','不支援或未完整下載的備份。');
  const names=Object.keys(first.format==='guanshitai-backup-4'?tables:baseTables).filter(t=>first.format!=='guanshitai-backup-2'||t!=='catalogue_reader_links');
  requireValue(JSON.stringify(first.tables)===JSON.stringify(names),'資料表契約不相符。');
  const data=Object.fromEntries(names.map(t=>[t,[]])),objects=new Map();let rowCount=0;
  for(const line of lines){
    if(line.type==='row'){
      requireValue(names.includes(line.table)&&line.row&&Object.keys(line.row).length===tables[line.table].length&&tables[line.table].every(k=>k in line.row),'備份資料欄位無效。');
      data[line.table].push(line.row);rowCount++;
    }else if(line.type==='object'){
      requireValue(safeKey(line.key)&&!objects.has(line.key)&&Number.isSafeInteger(line.bytes)&&line.bytes>=0&&line.bytes<=32*1024*1024,'備份物件無效。');
      objects.set(line.key,{...line,parts:[],position:0});
    }else if(line.type==='bytes'){
      const object=objects.get(line.key),bytes=Buffer.from(line.data,'base64');
      requireValue(object&&object.position===line.offset&&object.position+bytes.length<=object.bytes,'備份物件不連續或不完整。');
      object.parts.push(bytes);object.position+=bytes.length;
    }else throw new Error('未知備份行。');
  }
  requireValue(last.rows===rowCount&&last.objects===objects.size&&last.rowsDigest===hash(JSON.stringify(data)),'備份摘要不一致。');
  for(const table of Object.keys(tables))data[table]??=[];
  requireValue(first.watermark===last.watermark&&last.watermark===Math.max(0,...data.catalogue_commits.map(r=>r.seq)),'提交序號不相符。');
  for(const object of objects.values()){
    object.content=Buffer.concat(object.parts);delete object.parts;
    requireValue(object.content.length===object.bytes&&hash(object.content)===object.sha256,'物件核驗失敗：'+object.key);
  }
  for(const row of data.catalogue_objects){const o=objects.get('originals/'+row.hash);requireValue(o&&o.sha256===row.hash&&o.bytes===row.bytes,'原檔缺失或已改寫。');}
  for(const row of [...data.catalogue_revisions,...data.catalogue_staged])requireValue(hash(canonical(JSON.parse(row.payload)))===row.digest,'修訂內容摘要不一致。');
  for(const r of data.catalogue_releases){
    const manifest=JSON.parse(r.manifest),stored=objects.get('releases/'+r.id+'/manifest.json');
    requireValue(stored&&canonical(JSON.parse(stored.content))===canonical(manifest),'發布清單缺失或不符。');
    for(const [name,digest] of Object.entries(manifest.files))requireValue(objects.get('releases/'+r.id+'/'+name)?.sha256===digest,'閱讀產物缺失或已改寫。');
  }
  const settings=new Map(data.catalogue_settings.map(r=>[r.key,r.value]));
  requireValue([...settings.keys()].every(k=>['baseline-ready','active-release'].includes(k)),'備份不得攜入授權設定。');
  if(settings.has('baseline-ready'))requireValue(objects.has('baseline/reader.json'),'讀者基線缺失。');
  if(settings.has('active-release'))requireValue(data.catalogue_releases.some(r=>r.id===settings.get('active-release')&&r.state==='published'),'目前閱讀版不存在。');
  for(const row of data.catalogue_imports)if(row.filename!=='單筆修訂')requireValue(objects.has('imports/'+row.id+'.json'),'匯入暫存物件缺失。');
  verifyResearchBackup(data);
  return {manifest:first,data,objects};
}
const sqlValue=value=>value===null?'NULL':typeof value==='number'&&Number.isFinite(value)?String(value):"'"+String(value).replaceAll("'","''")+"'";
export function restoreSql(backup){
  return Object.entries(tables).flatMap(([table,columns])=>(backup.data[table]??[]).map(row=>'INSERT INTO '+table+'('+columns.join(',')+') VALUES('+columns.map(c=>sqlValue(row[c])).join(',')+');'));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [input,output]=process.argv.slice(2);requireValue(input&&output,'用法：node scripts/restore-catalogue.mjs BACKUP.ndjson.gz NEW_DIRECTORY');
  requireValue(!fs.existsSync(output),'輸出目錄已存在；還原不覆蓋現有資料。');
  const result=verifyBackup(fs.readFileSync(input));
  fs.mkdirSync(output,{recursive:true,mode:0o700});
  fs.writeFileSync(path.join(output,'data.sql'),restoreSql(result).join('\n')+'\n',{mode:0o600});
  for(const [key,object] of result.objects){const file=path.join(output,'objects',key);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,object.content,{mode:0o600});}
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({...result.manifest,verified:true,objectCount:result.objects.size},null,2));
  console.log(JSON.stringify({verified:true,watermark:result.manifest.watermark,objects:result.objects.size,output:path.resolve(output)}));
}
