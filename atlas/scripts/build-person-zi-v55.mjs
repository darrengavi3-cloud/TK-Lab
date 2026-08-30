import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const context={window:{}};
context.window.window=context.window;
vm.createContext(context);
for(const file of ['person-identities.js','person-zi-supplement.js','person-source-index.js']){
  new vm.Script(fs.readFileSync(path.join(root,'data',file),'utf8'),{filename:file}).runInContext(context);
}

const simplifyMap={
  '劉':'刘','孫':'孙','張':'张','趙':'赵','馬':'马','諸':'诸','鍾':'钟','衞':'卫','衛':'卫','鄧':'邓','賈':'贾','顧':'顾','陸':'陆','謝':'谢','楊':'杨','許':'许','嚴':'严','龐':'庞','費':'费','蔣':'蒋','華':'华','黃':'黄','權':'权','禪':'禅','禕':'祎','溫':'温','淵':'渊','遜':'逊','騭':'骘','奮':'奋','吳':'吴','魯':'鲁','鄒':'邹','羣':'群','業':'业','騫':'骞','渾':'浑','濤':'涛','齊':'齐','駿':'骏','鑒':'鉴','頠':'𫖮','陽':'阳','興':'兴','謙':'谦','肅':'肃','導':'导','錄':'录','歷':'历','關':'关','揚':'扬','遼':'辽','別':'别','駕':'驾','為':'为','爲':'为','預':'预','凱':'凯','蘭':'兰','穎':'颖','龍':'龙','達':'达','處':'处','彥':'彦','開':'开','規':'规','讓':'让','濬':'浚','邁':'迈','長':'长','奧':'奥','彌':'弥','嶠':'峤','賀':'贺','紀':'纪','呂':'吕','騰':'腾','緯':'纬','鐘':'钟'
};
const simplify=value=>Array.from(String(value||'')).map(char=>simplifyMap[char]||char).join('').trim();
const sourcePeople=context.window.SGZ_PERSON_SOURCE_INDEX?.people||[];
const idsByName=new Map();
for(const person of sourcePeople){
  for(const value of [person.name,...(person.aliases||[])]){
    const key=simplify(value);
    if(!key) continue;
    if(!idsByName.has(key)) idsByName.set(key,new Set());
    idsByName.get(key).add(person.personId);
  }
}

const staleNameMap={'卓弟旻':'董旻'};
const rows=(context.window.SGZ_PERSON_ZI_SUPPLEMENT||[]).map(raw=>{
  const name=staleNameMap[raw.name]||raw.name;
  const identity=context.window.SGZ_PERSON_IDENTITIES?.resolve(name);
  const sourceIds=idsByName.get(simplify(name))||new Set();
  const personId=identity?.personId||(sourceIds.size===1?[...sourceIds][0]:'');
  return {...raw,personId,name,normalizationNote:raw.name!==name?`原抽取“${raw.name}”为关系式误读，已归一为${name}`:''};
}).sort((a,b)=>String(a.name).localeCompare(String(b.name),'zh-CN'));

const audit={
  schemaVersion:'V55',
  total:rows.length,
  resolvedByPersonId:rows.filter(row=>row.personId).length,
  unresolved:rows.filter(row=>!row.personId).map(row=>({name:row.name,sourceLocator:row.sourceLocator})),
  stalePublicNamesRemoved:Object.keys(staleNameMap),
  policy:'表字优先按 personId 关联；姓名只用于构建期唯一匹配，误读名称不进入公开别名。'
};

fs.writeFileSync(path.join(root,'data/person-zi-supplement.json'),`${JSON.stringify({schemaVersion:'V55',records:rows,audit},null,2)}\n`);
fs.writeFileSync(path.join(root,'data/person-zi-supplement.js'),`(function(global){\n  'use strict';\n  const records=${JSON.stringify(rows,null,2)};\n  const byPersonId=Object.fromEntries(records.filter(item=>item.personId).map(item=>[item.personId,item]));\n  global.SGZ_PERSON_ZI_SUPPLEMENT=Object.freeze(records.map(Object.freeze));\n  global.SGZ_PERSON_ZI_BY_ID=Object.freeze(byPersonId);\n  global.SGZ_PERSON_ZI_AUDIT=Object.freeze(${JSON.stringify(audit,null,2)});\n})(window);\n`);
console.log(JSON.stringify(audit));
