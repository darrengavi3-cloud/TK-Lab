import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const indexPath=path.join(root,'index.html');
const outputPath=path.join(root,'data','shihuo-records.js');
const sourcePath=process.argv[2]?path.resolve(process.argv[2]):indexPath;
const html=fs.readFileSync(sourcePath,'utf8');
const alreadyExternal=/const SHIHUO_DATA = window\.SGZ_SHIHUO_DATA/.test(html);
if(sourcePath===indexPath&&alreadyExternal){
  const output=fs.existsSync(outputPath)?fs.readFileSync(outputPath,'utf8'):'';
  if(/schemaVersion:'V55'/.test(output)&&!output.includes('const SHIHUO_POLITIES = SHIHUO_DATA.polities')){
    console.log(JSON.stringify({status:'already-extracted',output:path.relative(root,outputPath)},null,2));
    process.exit(0);
  }
  throw new Error('食货志已外置，但产物无效；请以含原始内联数据的备份 index.html 作为参数重建');
}
const start=html.indexOf("const SHIHUO_POLITIES =");
const end=html.indexOf("const HAN_RANK_FAMILIES =",start);
if(start<0||end<0){
  throw new Error('未找到食货志内联数据边界');
}
const source=html.slice(start,end).trim();
const payload=`(function(global){
  'use strict';
  ${source}

  function recordKind(row){
    if(['户口与人口','物价'].includes(row.category)) return 'quantitative';
    if(/制度|令$|户调|田租|官营|专营|复除|赈恤|常平仓|罢/.test(String(row.title||''))) return 'institution';
    return 'event';
  }
  function evidence(row){
    return {sourceTitle:row.sourceTitle||'',sourceLevel:row.sourceLevel||'史料整理',confidence:row.confidence||'待考',sourceLocator:row.sourceLocator||''};
  }
  function scopeFor(row){ return row.year!=null&&Number.isFinite(Number(row.year))&&Number(row.year)<168?'baseline':'core'; }
  const records=SHIHUO_RECORDS.map(row=>Object.freeze({...row,recordKind:recordKind(row),scope:scopeFor(row),rawRecord:{title:row.title,year:row.year??null,yearText:row.yearText||'',detail:row.detail||''},readerSummary:row.detail||'',evidence:evidence(row)}));
  const recordsById=new Map(records.map(row=>[row.id,row]));
  const events=SHIHUO_EVENTS.map(row=>{const linked=recordsById.get(row.recordId);return Object.freeze({...row,recordKind:'event',scope:scopeFor(row),rawRecord:{title:row.title,year:row.year??null,yearText:row.yearText||'',detail:row.detail||''},readerSummary:row.detail||'',evidence:evidence(linked||row)});});
  const household=SHIHUO_HOUSEHOLD.map(row=>{const linked=recordsById.get(row.recordId);return Object.freeze({...row,recordKind:'quantitative',scope:scopeFor(row),comparable:row.year!=null&&Number.isFinite(Number(row.year))&&!/约|推算|回顾/.test([row.households,row.population,row.note].join('')),evidence:evidence(linked||row)});});
  global.SGZ_SHIHUO_DATA=Object.freeze({schemaVersion:'V55',polities:Object.freeze(SHIHUO_POLITIES),categories:Object.freeze(SHIHUO_CATEGORIES),records:Object.freeze(records),events:Object.freeze(events),household:Object.freeze(household),policy:'146、157 年资料仅作战乱前基线；168—316 年为主体。图表仅比较有确定年份且非约数、非推算值的记录。'});
})(window);
`;
fs.writeFileSync(outputPath,payload,'utf8');
const aliases=`const SHIHUO_DATA = window.SGZ_SHIHUO_DATA || {polities:[],categories:[],records:[],events:[],household:[]};
const SHIHUO_POLITIES = SHIHUO_DATA.polities;
const SHIHUO_CATEGORIES = SHIHUO_DATA.categories;
const SHIHUO_RECORDS = SHIHUO_DATA.records;
const SHIHUO_EVENTS = SHIHUO_DATA.events;
const SHIHUO_HOUSEHOLD = SHIHUO_DATA.household;
`;
if(sourcePath===indexPath) fs.writeFileSync(indexPath,html.slice(0,start)+aliases+html.slice(end),'utf8');
console.log(JSON.stringify({records:(source.match(/\{ id:'sh_/g)||[]).length,source:path.relative(root,sourcePath),output:path.relative(root,outputPath)},null,2));
