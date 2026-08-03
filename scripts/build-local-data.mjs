import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const registryPath = path.join(root, 'data', 'map-period-registry.json');
const auditPath = path.join(root, 'data', 'historical-audit.json');
const geoPath = path.join(root, 'assets', 'map', 'data', 'All_Provinces.json');
const historyEvidencePath = path.join(root, 'data', 'history-evidence.json');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
const historyEvidence = JSON.parse(fs.readFileSync(historyEvidencePath, 'utf8'));

const ids = registry.periods.map(period => period.id);
const expected = registry.requiredPeriodIds;
if (ids.length !== expected.length || ids.some((id, index) => id !== expected[index])) {
  throw new Error(`十四期注册表顺序错误：${ids.join(', ')}`);
}
if (new Set(ids).size !== ids.length) {
  throw new Error('十四期注册表存在重复 id');
}

fs.writeFileSync(
  path.join(root, 'data', 'map-period-registry.js'),
  `window.HISTORY_MAP_REGISTRY=${JSON.stringify(registry)};\nwindow.HISTORY_MAP_AUDIT=${JSON.stringify(audit)};\n`,
  'utf8'
);

fs.writeFileSync(
  path.join(root, 'assets', 'map', 'data', 'all-provinces-local.js'),
  `window.ALL_PROVINCES_LOCAL=${JSON.stringify(geo)};\n`,
  'utf8'
);

const historyEvidenceRuntime = `(function(global){
  'use strict';
  const data=${JSON.stringify(historyEvidence)};
  const sourceIndex=new Map((data.sources||[]).map(source=>[source.id,source]));
  function text(value){return String(value==null?'':value).trim();}
  function variants(value){
    const raw=text(value);
    if(!raw) return [];
    const compact=raw.replace(/[\\s·・]/g,'');
    const stripped=compact.replace(/[（(].*?[）)]/g,'').replace(/州|郡|国|部$/,'');
    return Array.from(new Set([raw,compact,stripped].filter(Boolean)));
  }
  function source(id){
    return sourceIndex.get(id)||{id:id,title:id,level:'待核',role:'未登记来源',url:'',note:'来源目录中尚未登记。'};
  }
  function sourcesFor(ids){return Array.from(new Set((ids||[]).filter(Boolean))).map(source);}
  function getPeriod(periodId){return (data.periods||[]).find(period=>period.periodId===periodId)||null;}
  function getClaim(periodId,claim){
    const period=getPeriod(periodId);
    const sourceIds=(claim&&claim.sourceIds&&claim.sourceIds.length?claim.sourceIds:period&&period.sourceIds)||[];
    return Object.assign({periodId:periodId,status:'推定',statement:'当前采用本期历史快照与地图几何底稿。',sourceIds:sourceIds},claim||{}, {sourceIds:sourceIds});
  }
  function findJurisdiction(selection,periodId){
    const names=Array.from(new Set([selection&&selection.name,selection&&selection.state,selection&&selection.sourceName].flatMap(variants)));
    const item=(data.jurisdictions||[]).find(jurisdiction=>{
      const candidates=Array.from(new Set([jurisdiction.name].concat(jurisdiction.aliases||[]).flatMap(variants)));
      return candidates.some(name=>names.includes(name));
    });
    const period=getPeriod(periodId);
    if(!item){
      return {
        id:'period-default:'+periodId+':'+(selection&&selection.name||selection&&selection.state||'unknown'),
        name:text(selection&&selection.name||selection&&selection.state||'当前辖区'),
        level:text(selection&&selection.level)||'辖区',
        status:'推定',
        statement:'尚未建立单独的辖区断言，沿用本期行政快照与几何底稿来源。',
        sourceIds:(period&&period.sourceIds)||[],
        sourceTitles:sourcesFor((period&&period.sourceIds)||[]).map(source=>source.title),
        periodId:periodId,
        fallback:true
      };
    }
    const claim=getClaim(periodId,(item.claims||{})[periodId]||item.defaultClaim);
    return Object.assign({id:item.id,name:item.name,level:item.level,aliases:item.aliases||[],fallback:false},claim,{sourceTitles:sourcesFor(claim.sourceIds).map(source=>source.title)});
  }
  function validate(){
    const periodIds=new Set((data.periods||[]).map(period=>period.periodId));
    const missingSources=[];
    (data.periods||[]).forEach(period=>{
      (period.sourceIds||[]).forEach(id=>{if(!sourceIndex.has(id)&&!missingSources.includes(id))missingSources.push(id);});
      (period.claims||[]).forEach(claim=>(claim.sourceIds||[]).forEach(id=>{if(!sourceIndex.has(id)&&!missingSources.includes(id))missingSources.push(id);}));
    });
    return {periodCount:periodIds.size,sourceCount:sourceIndex.size,missingSources:missingSources,valid:periodIds.size===16&&!missingSources.length};
  }
  global.SGZ_HISTORY_EVIDENCE=Object.freeze({schemaVersion:data.schemaVersion,modelId:data.modelId,scope:data.scope,sources:data.sources,periods:data.periods,jurisdictions:data.jurisdictions,source:source,sourcesFor:sourcesFor,getPeriod:getPeriod,findJurisdiction:findJurisdiction,validate:validate});
})(window);\n`;
fs.writeFileSync(path.join(root, 'data', 'history-evidence.js'), historyEvidenceRuntime, 'utf8');
fs.writeFileSync(path.join(root, 'assets', 'map', 'data', 'history-evidence.js'), historyEvidenceRuntime, 'utf8');

console.log(`已生成十四期注册表脚本：${ids.join(' → ')}`);
console.log(`已生成本地州郡几何脚本：${geoPath}`);
console.log(`已生成 V7 历史证据脚本：${historyEvidence.periods.length} 期、${historyEvidence.sources.length} 条来源`);
