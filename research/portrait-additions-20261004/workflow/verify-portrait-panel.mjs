import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve('atlas/exports/观史台-读者版');
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp'};
const server=createServer((req,res)=>{const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||fs.statSync(target).isDirectory()){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream'});fs.createReadStream(target).pipe(res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});const results=[];
try{
 const manifest=JSON.parse(fs.readFileSync('atlas/data/portrait-manifest.json','utf8'));const personId='person:source:6bea1ab8f79e';const entry=manifest.byPersonId[personId];assert.equal(entry.portraitIds.length,2);
 const expected=entry.portraitIds.map(id=>manifest.assetsById[id]);
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});const page=await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#people?person=${encodeURIComponent(personId)}`);
  const scope=()=>page.locator('.sgz-person-portrait-panel:visible').first();await scope().waitFor();const image=()=>scope().locator('img');
  await image().evaluate(im=>im.decode());assert.equal(await image().getAttribute('src'),entry.src);
  for(const theme of ['laitai-day','review-paper','lamp-night']){
   await page.evaluate(theme=>document.documentElement.setAttribute('data-sgz-theme',theme),theme);
   const choose=scope().locator('button[data-portrait-id]').nth(1);await choose.focus();assert.ok(await choose.evaluate(b=>getComputedStyle(b).outlineStyle!=='none'));await choose.press('Enter');
   await page.waitForFunction(src=>[...document.querySelectorAll('.sgz-person-portrait-panel img')].some(im=>im.getClientRects().length&&im.getAttribute('src')===src&&im.complete&&im.naturalWidth>0),expected[1].src);await image().evaluate(im=>im.decode());assert.equal(await choose.getAttribute('aria-pressed'),'true');
   const box=await choose.boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.equal(await scope().getByRole('link',{name:'查看原图'}).getAttribute('href'),expected[1].src);
   const first=scope().locator('button[data-portrait-id]').nth(0);await first.press('Space');await page.waitForFunction(src=>[...document.querySelectorAll('.sgz-person-portrait-panel img')].some(im=>im.getClientRects().length&&im.getAttribute('src')===src&&im.complete&&im.naturalWidth>0),expected[0].src);
   results.push({width,theme,keyboard:true,touchTarget:true,exactIdBinding:true,originalLink:true,passed:true});
  }
  let release;const held=new Promise(resolve=>release=resolve);const pattern='**/'+expected[1].src.replace('./','');await page.route(pattern,async route=>{await held;await route.abort();});
  await scope().locator('button[data-portrait-id]').nth(1).click();await scope().getByText('加载立绘…',{exact:true}).waitFor();assert.equal(await scope().locator('.people-detail-portrait').getAttribute('aria-busy'),'true');release();await scope().getByText('立绘未能加载。',{exact:true}).waitFor();await page.unroute(pattern);await scope().getByRole('button',{name:'重试立绘'}).click();await image().evaluate(im=>im.decode());await scope().getByRole('button',{name:'重试立绘'}).waitFor({state:'hidden'});
  const counterpart=width===390?1440:390;await page.setViewportSize({width:counterpart,height:1000});await page.waitForTimeout(250);if(!await scope().isVisible()){await page.locator('.v84-reading-toolbar input').fill('钟会');await page.locator('.v56-person-row[data-person-id=\"'+personId+'\"]').click();}await scope().waitFor();assert.equal(await image().getAttribute('src'),expected[1].src);
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  fs.mkdirSync('work/validation/screenshots',{recursive:true});await page.screenshot({path:`work/validation/screenshots/portrait-panel-${width}.png`});
  results.push({width,loading:true,error:true,retry:true,sharedAcrossResponsive:true,enlargedText:true,reducedMotion:true,passed:true});await context.close();
 }
 const context=await browser.newContext();const page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/index.html#people`);await page.waitForFunction(()=>window.SGZ_READER_COMPONENTS?.PersonPortraitPanel);
 await page.evaluate(()=>{const host=document.createElement('div');host.id='empty-portrait-fixture';document.body.append(host);Vue.createApp({components:SGZ_READER_COMPONENTS,template:'<person-portrait-panel :person="{name: \'无图人物\', personId: \'person:test:empty\'}"/>'}).mount(host);});
 const empty=page.locator('#empty-portrait-fixture');assert.equal(await empty.locator('img,a,button').count(),0);assert.ok((await empty.innerText()).includes('无'));results.push({empty:true,passed:true});await context.close();
 fs.writeFileSync('work/validation/portrait-panel-interaction.json',JSON.stringify({status:'passed',checks:results,fontEnvironment:'Linux无已安装CJK字体；不宣称汉字字形或真实设备验收'},null,2)+'\n');console.log(JSON.stringify({status:'passed',checks:results.length}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
