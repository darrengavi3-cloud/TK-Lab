import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve(process.argv.includes('--built')?'dist/client/legacy':'atlas/exports/观史台-读者版');
const built=process.argv.includes('--built');
const ledger=['accepted-portrait-additions-20261004.json','accepted-independent-redraws-20261004.json'].flatMap((name,index)=>JSON.parse(fs.readFileSync('atlas/data/'+name)).records.map(row=>index?row:{...row,portraitId:'portrait:additional:20261004:'+String(row.order).padStart(3,'0')}));
const ids=ledger.map(row=>row.portraitId||'portrait:additional:20261004:'+String(row.order).padStart(3,'0')).sort();
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp'};
const server=createServer((req,res)=>{const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||fs.statSync(target).isDirectory()){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream'});fs.createReadStream(target).pipe(res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});const checks=[];
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();const base=`http://127.0.0.1:${server.address().port}`;
  await page.goto(base+'/portraits.html');await page.locator('.portrait-gallery a').first().waitFor();
  assert.deepEqual((await page.locator('.portrait-gallery a').evaluateAll(cards=>cards.map(card=>card.dataset.portraitId))).sort(),ids);
  const search=page.getByRole('searchbox',{name:'搜索人物立绘'});await search.fill('钟会');assert.ok(await page.locator('.portrait-gallery a').count()>0);assert.ok((await page.locator('.portrait-gallery').innerText()).includes('钟会'));
  await search.fill('不存在的测试人物xyz');await page.getByText('未找到相符的立绘。',{exact:true}).waitFor();assert.equal(await page.locator('.portrait-gallery a').count(),0);
  await search.fill('');assert.equal(await page.locator('.portrait-gallery a').count(),250);
  for(const order of [115,116]){
   const row=ledger.find(row=>row.order===order&&row.portraitId?.startsWith('portrait:asset:'));
   await page.goto(base+'/portraits.html?portrait='+encodeURIComponent(row.portraitId));const panel=page.locator('.portrait-viewer');await panel.waitFor();
   assert.equal(await panel.getAttribute('data-person-id'),row.personId);assert.equal(await panel.getAttribute('data-portrait-id'),row.portraitId);assert.equal(await panel.locator('h1').innerText(),'艺术立绘');assert.equal(await panel.getByRole('link',{name:'查看人物条目'}).count(),0);await panel.locator('.portrait-scope-note').waitFor();assert.equal(await panel.getByRole('link',{name:'查看原图'}).getAttribute('href'),row.assetPath);
  }
  await page.goto(base+'/portraits.html?portrait=portrait%3Atest%3Amissing');await page.getByRole('alert').waitFor();await page.getByText('该立绘暂不可查看。',{exact:true}).waitFor();await page.getByRole('link',{name:'重新加载'}).waitFor();
  checks.push({width,galleryCount:250,exactPortraitSet:true,search:true,emptySearch:true,clearSearch:true,artworkOnlyScope:[115,116],invalidId:true,rawLinks:true,passed:true});await context.close();
 }
 const result={status:'passed',testSurface:built?'deployment-build':'reader-export',checks};fs.writeFileSync('work/validation/portrait-gallery-interaction'+(built?'-built':'')+'.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
