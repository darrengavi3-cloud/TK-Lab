import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
const built=process.argv.includes('--built');
const root=path.resolve(built?'dist/client/legacy':'atlas/exports/观史台-读者版');
const kind=process.argv[3]==='redraw'?'redraw':'new';
const ledger=JSON.parse(fs.readFileSync(kind==='redraw'?'atlas/data/accepted-independent-redraws-20261004.json':'atlas/data/accepted-portrait-additions-20261004.json','utf8'));
if(kind==='new')ledger.records=ledger.records.map(row=>({...row,legacyPortraitId:row.portraitId,portraitId:'portrait:additional:20261004:'+String(row.order).padStart(3,'0')}));
const readerIds=new Set(JSON.parse(fs.readFileSync(path.join(root,'data/v63-reader-people.json'),'utf8')).people.map(person=>person.personId));
const orders=process.argv[2]?.split(',').map(Number);
if(orders) ledger.records=ledger.records.filter(row=>orders.includes(row.order));
assert.ok(ledger.records.length,'Empty batch');
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp'};
const server=createServer((req,res)=>{const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||fs.statSync(target).isDirectory()){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream'});fs.createReadStream(target).pipe(res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});const results=[];
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();
  for(const row of ledger.records){
   const pageKind=readerIds.has(row.personId)?'person-detail':'artwork-only-viewer';
   const pagePath=pageKind==='person-detail'?`/index.html#people?person=${encodeURIComponent(row.personId)}`:`/portraits.html?portrait=${encodeURIComponent(row.portraitId)}`;
   await page.goto(`http://127.0.0.1:${server.address().port}${pagePath}`);
   if(pageKind==='person-detail')await page.waitForFunction(id=>[...document.querySelectorAll('.sgz-person-portrait-panel')].some(panel=>panel.getClientRects().length&&panel.dataset.personId===id),row.personId);
   else{const panel=page.locator('.portrait-viewer');await panel.waitFor();assert.equal(await panel.getAttribute('data-person-id'),row.personId);assert.equal(await panel.getAttribute('data-portrait-id'),row.portraitId);assert.equal(await panel.locator('h1').innerText(),'艺术立绘');await panel.locator('.portrait-scope-note').waitFor();assert.equal(await panel.getByRole('link',{name:'查看人物条目'}).count(),0);}
   if(row.portraitId){const selector=page.locator('[data-portrait-id=\"'+row.portraitId+'\"]:visible').first();if(await selector.count())await selector.click();}
   const image=page.locator('.people-detail-portrait:visible img').first();await image.waitFor({timeout:30000});
   await page.waitForFunction(()=>{const im=[...document.querySelectorAll('.people-detail-portrait img')].find(im=>im.getClientRects().length && getComputedStyle(im).visibility!=='hidden');return im?.complete&&im.naturalWidth>0;});
   const actual=await image.evaluate(im=>({src:im.getAttribute('src'),width:im.naturalWidth,height:im.naturalHeight}));
   assert.ok(actual.src.endsWith(row.assetPath.replace('./','/')),JSON.stringify(actual));
   const originalBytes=fs.readFileSync(path.join(root,row.assetPath.replace('./','')));
   assert.equal(createHash('sha256').update(originalBytes).digest('hex'),row.sha256);
   const original=await page.evaluate(src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve({width:im.naturalWidth,height:im.naturalHeight});im.onerror=()=>reject(new Error('Original PNG failed to decode'));im.src=src;}),row.assetPath);
   assert.equal(original.width,row.width);assert.equal(original.height,row.height);
   if(!built){assert.equal(actual.width,row.width);assert.equal(actual.height,row.height);}
   await page.locator('.reader-quiet-note:visible').filter({hasText:'人物艺术立绘；表现年龄为设计选择，服饰细节待考。'}).first().waitFor();
   await image.evaluate(async im=>{await im.decode();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
   const rendering=await image.evaluate(im=>{const c=getComputedStyle(im),r=im.getBoundingClientRect();return {display:c.display,visibility:c.visibility,opacity:c.opacity,width:r.width,height:r.height,objectFit:c.objectFit,currentSrc:im.currentSrc};});
   assert.ok(rendering.width>0&&rendering.height>0&&Number(rendering.opacity)>0,JSON.stringify(rendering));
   assert.equal(rendering.objectFit,'contain','Full portrait must be displayed without cropping');
   fs.mkdirSync('work/validation/screenshots',{recursive:true});
   const screenshot='work/validation/screenshots/portrait-'+kind+'-'+row.order+'-'+viewport.width+(built?'-built':'')+'.png';
   await page.screenshot({path:screenshot,fullPage:false});
   results.push({order:row.order,name:row.name,personId:row.personId,portraitId:row.portraitId||('portrait:additional:20261004:'+String(row.order).padStart(3,'0')),viewport,...actual,pageKind,pagePath,originalDimensions:original,testSurface:built?'deployment-build':'reader-export',rendering,screenshot,evidenceLabel:'待考',passed:true});
  }
  await context.close();
 }
 fs.mkdirSync('work/validation',{recursive:true});fs.writeFileSync('work/validation/portrait-'+kind+'-batch-'+(orders?.join('-')||'all')+(built?'-built':'')+'.json',JSON.stringify({status:'passed',checks:results},null,2)+'\n');
 console.log(JSON.stringify({status:'passed',portraits:ledger.records.length,viewportChecks:results.length}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
