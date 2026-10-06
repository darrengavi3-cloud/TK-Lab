import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ledger=JSON.parse(fs.readFileSync(path.join(root,'data/accepted-independent-redraws-20261004.json'),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const ids=new Set(),hashes=new Set();
export const acceptedIndependentRedraws=ledger.records.map(row=>{
 if(ids.has(row.portraitId)||hashes.has(row.sha256))throw new Error('Duplicate independent redraw');
 ids.add(row.portraitId);hashes.add(row.sha256);
 if(!/^portrait:asset:[a-f0-9]+$/.test(row.portraitId)||!/^person:(?!unresolved:)/.test(row.personId))throw new Error('Invalid redraw identity');
 if(!/^\.\/assets\/portraits\/20261004\/frontal\/portrait-asset-[a-f0-9]+-redraw\.png$/.test(row.assetPath))throw new Error('Invalid independent redraw path');
 const original=fs.readFileSync(path.join(root,row.originalSrc));
 if(digest(original)!==row.originalSha256)throw new Error('Redraw original provenance mismatch');
 const bytes=fs.readFileSync(path.join(root,row.assetPath));
 if(!bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))||digest(bytes)!==row.sha256)throw new Error('Redraw PNG or SHA mismatch');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width!==row.width||height!==row.height||width<512||Math.abs(width/height-9/16)>.03)throw new Error('Redraw dimensions mismatch');
 if(!['strictFrontal','directGaze','shouldersFrontal','ageAppropriate','independentSinglePerson','completeCrown','completeHands','standingComposition'].every(key=>row.visualReview?.[key]===true)||row.productionMethod!=='independent-redraw'||row.evidenceStatus!=='待考'||!Number.isInteger(row.designAge)||!row.ageBasis)throw new Error('Redraw acceptance missing');
 return row;
});
export function applyIndependentRedraws(assetsById){
 for(const row of acceptedIndependentRedraws){
  const asset=assetsById[row.portraitId];
  if(!asset||asset.personId!==row.personId||asset.src!==row.originalSrc)throw new Error('Redraw must retain its exact original resource and person binding');
  asset.originalDesignRef=asset.designRef ? structuredClone(asset.designRef) : null;
  Object.assign(asset,{originalSrc:asset.src,originalSha256:row.originalSha256,src:row.assetPath,assetPath:row.assetPath,sha256:row.sha256,productionMethod:row.productionMethod,designAge:row.designAge,ageBasis:row.ageBasis,evidenceStatus:row.evidenceStatus,sourceTitle:'正面独立重制艺术立绘；服饰细节待考（非史实肖像）',sourceUrl:'',designStatus:'pending',designRef:null,interfaceOnly:true});
 }
}
