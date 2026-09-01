import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyFangzhenJurisdiction,
  classifyFangzhenDynasty,
  projectFangzhenRecords,
} from '../assets/app/fangzhen.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const design=fs.readFileSync(path.join(root,'DESIGN.md'),'utf8');
const ux=fs.readFileSync(path.join(root,'UX-CONTRACT.md'),'utf8');
const reader=JSON.parse(fs.readFileSync(path.join(root,'data/v63-reader-people.json'),'utf8'));
const fangzhen=JSON.parse(fs.readFileSync(path.join(root,'data/v66-fangzhen-reader.json'),'utf8'));
const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};

const rows=fangzhen.records||[];
const projected=projectFangzhenRecords(rows,{mode:'reader'});
assert(rows.length===45&&new Set(rows.map(row=>row.id)).size===45,'州镇读者记录数量或稳定 ID 改变');
assert(projected.every(row=>['州','方镇'].includes(row.jurisdictionKind)),'州镇记录未全部落入州／方镇层级');
assert(projected.filter(row=>row.jurisdictionKind==='州').length===36,'州层级记录数量异常');
assert(projected.filter(row=>row.jurisdictionKind==='方镇').length===9,'方镇层级记录数量异常');
assert(projected.filter(row=>row.dynastyLabel==='后汉').length===5,'后汉记录未按稳定键拆分');
assert(projected.filter(row=>row.dynastyLabel==='季汉').length===6,'季汉记录未按稳定键拆分');
assert(projected.filter(row=>row.dynastyLabel==='汉').length===0,'已有稳定键的汉记录仍未完成后汉／季汉拆分');

assert((reader.people||[]).filter(person=>person.bio).length===70,'读者人物小传数量异常');
assert(html.includes('人物小传')&&html.includes('class="person-biography"'),'人物详情缺少人物小传卡片');
assert(!html.includes('相关历任长官'),'州镇页仍渲染重复的相关历任长官模块');
assert(html.includes('v-model="fangzhenLevel"')&&html.includes('label="辖区层级"'),'州／方镇筛选未接入上下文栏');
assert(html.includes('后汉州镇档案')&&html.includes('季汉州镇档案'),'后汉与季汉档案标签未拆分');
assert(html.includes('东汉十三州基准')&&html.includes('曹魏十二州基准')&&html.includes('益州一州基准'),'州数基准说明未呈现');
assert(html.includes('v67-fangzhen-index-group-label')&&html.includes("'group-'+group.kind"),'州／方镇左侧索引未分组');
assert(
  html.includes("params.set('level',fangzhenLevel.value)")
    && (html.includes("fangzhenLevel.value=['all','州','方镇']") || html.includes("fangzhenLevel.value=['all','州','郡','方镇']")),
  '州／方镇筛选未写入或恢复 URL'
);
assert(design.includes('## V68 人物小传与州／方镇分层')&&ux.includes('## V68 人物小传与州／方镇分层'),'V68 设计与交互契约未同步');

if(failures.length){
  console.error(JSON.stringify({ok:false,failures},null,2));
  process.exitCode=1;
}else{
  console.log(JSON.stringify({ok:true,biographies:70,fangzhen:{records:45,levels:{州:36,方镇:9},dynasties:{后汉:5,季汉:6}},removedRelatedOfficials:true},null,2));
}
