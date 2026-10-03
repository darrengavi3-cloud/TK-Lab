import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {loadWorkspaceFixture} from '../helpers/research-workspace-fixture.mjs';
const core=await loadWorkspaceFixture();
const compiled=await build({entryPoints:['admin/research-client.ts'],bundle:true,format:'esm',platform:'browser',write:false,logLevel:'silent'});
const browser=await chromium.launch({headless:true});
test.after(async()=>{await browser.close();await core.cleanup();});
async function host(t){
 const fixture=await core.fixture();let failAfterSave=false;const saveIds=[];
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://'+req.headers.host),p=url.pathname;
  if(p.startsWith('/api/admin/')||p==='/admin/research'){
   const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','owner');
   const input=new Request(url,{method:req.method,headers,...(body.length?{body}: {})});const result=await core.router.catalogueRouter(input,fixture.env);
   if(p==='/api/admin/research/dossiers'&&req.method==='POST'){saveIds.push(JSON.parse(body).requestId);if(failAfterSave&&result.status===200){failAfterSave=false;res.writeHead(503,{'content-type':'application/json'}).end(JSON.stringify({error:'測試：保存回應中斷，請重試。'}));return;}}
   res.writeHead(result.status,Object.fromEntries(result.headers)).end(Buffer.from(await result.arrayBuffer()));return;
  }
  if(p==='/research-client.mjs'){res.writeHead(200,{'content-type':'text/javascript'}).end(compiled.outputFiles[0].text);return;}
  const relative=p.startsWith('/legacy/')?'atlas/'+p.slice(8):['/admin.css','/research.css','/favicon.svg'].includes(p)?'public'+p:null;
  if(!relative||relative.includes('..')){res.writeHead(404).end();return;}
  res.writeHead(200,{'content-type':({'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[path.extname(relative)]||'application/octet-stream'}).end(await fs.readFile(relative));
 }catch(e){res.writeHead(500,{'content-type':'application/json'}).end(JSON.stringify({error:e.message}));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fixture.close();});
 return {...fixture,url:'http://127.0.0.1:'+server.address().port,saveIds,failNextSave:()=>{failAfterSave=true;}};
}
const waitMessage=(page,text)=>page.getByRole('status').filter({hasText:text}).waitFor();
async function openPerson(page,h){await page.goto(h.url+'/admin/research?person='+encodeURIComponent(h.person.id));try {await page.getByRole('heading',{name:'合成人物研究案卷',exact:true}).waitFor();} catch(e) {await fs.mkdir('work/validation/research',{recursive:true});await page.screenshot({path:'work/validation/research/failed-load.png',fullPage:true});console.error(await page.locator('body').innerText());throw e;}}
async function addPack(page,pack){await page.getByLabel('載入研究材料或草稿').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});await page.getByText('我已確認材料對應目前人物',{exact:true}).click();await page.getByRole('button',{name:'加入案卷',exact:true}).click();await waitMessage(page,'事件與異說已加入草稿');}
async function ensureNoOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}

test('real browser imports, compares, saves after lost response, reloads, resolves conflict and exports',async t=>{
 const h=await host(t),context=await browser.newContext({viewport:{width:1440,height:980},locale:'zh-TW',reducedMotion:'reduce'});t.after(()=>context.close());const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>{errors.push(e.message);console.error('Research browser:',e.message);});
 await openPerson(page,h);await addPack(page,h.pack);assert.equal(await page.getByLabel('原始紀年 1',{exact:true}).inputValue(),'六年');assert.equal(await page.getByLabel('原始紀年 2',{exact:true}).inputValue(),'八年');
 await page.getByRole('button',{name:'並讀支持材料',exact:true}).first().click();await page.locator('.source-transcription').first().waitFor();assert.equal(await page.locator('.source-transcription').first().textContent(),h.pack.sources[0].text);
 const picker=page.getByRole('combobox',{name:'並讀材料',exact:true});await picker.click();await page.getByRole('option').filter({hasText:'八年本'}).click();await picker.press('Escape');await picker.press('Escape');assert.equal(await page.locator('.source-sheet').count(),2);
 await fs.mkdir('work/validation/research',{recursive:true});await page.screenshot({path:'work/validation/research/comparison-desktop.png',fullPage:true});await ensureNoOverflow(page);
 h.failNextSave();await page.getByRole('button',{name:'保存案卷',exact:true}).click();await page.getByRole('alert').filter({hasText:'保存回應中斷'}).waitFor();assert.ok((await page.getByLabel('本次修訂說明').inputValue()).includes('合成研究材料'));
 await page.getByRole('button',{name:'保存案卷',exact:true}).click();await waitMessage(page,'已保存研究修訂 1');assert.equal(h.saveIds[0],h.saveIds[1]);assert.equal(h.db.sql.prepare('SELECT count(*) n FROM catalogue_research_revisions').get().n,1);
 await page.reload();await waitMessage(page,'已讀取研究修訂 1');await page.getByRole('tab',{name:'事件編年 · 1'}).click();await page.getByLabel('研究理由 1',{exact:true}).fill('本地新判斷仍須保留');await page.getByLabel('本次修訂說明').fill('合併另一分頁的修訂');
 const remote=await core.journal.getResearchRevision(h.db,h.person.id),graph=structuredClone(remote.graph);graph.events[0].original='另一分頁補充的事項原文';const checked=await core.preview.inspectPersonResearch(h.repo,{graph,watermark:remote.catalogueWatermark});await core.journal.saveResearch(h.db,h.repo,'owner',{requestId:'fixture:concurrent:save',baseRevision:1,watermark:remote.catalogueWatermark,graph,inspectedGraphDigest:checked.graphDigest,reason:'另一分頁補充'});
 await page.getByRole('button',{name:'保存案卷',exact:true}).click();await page.getByRole('heading',{name:'伺服器已有修訂 2'}).waitFor();const difference=page.locator('.revision-conflict>details').filter({has:page.locator('summary').filter({hasText:/^events · /})});await difference.locator('summary').click();await difference.getByRole('button',{name:'採用此項伺服器內容'}).click();
 await page.getByRole('button',{name:'已完成比較，繼續保存'}).click();await page.getByRole('button',{name:'以比較後草稿繼續'}).click();await page.getByRole('button',{name:'保存案卷',exact:true}).click();await waitMessage(page,'已保存研究修訂 3');
 const final=await core.journal.getResearchRevision(h.db,h.person.id);assert.equal(final.graph.events[0].original,'另一分頁補充的事項原文');assert.equal(final.graph.claims.find(c=>c.id.endsWith('date:six')).rationale,'本地新判斷仍須保留');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'匯出草稿 JSON'}).click();const file=await download;const exported=JSON.parse(await fs.readFile(await file.path(),'utf8'));assert.equal(exported.persisted,true);assert.equal(exported.published,false);assert.deepEqual(exported.graph,final.graph);assert.ok(exported.originalPreview);assert.equal(exported.sourceRevisions.find(s=>s.pin.id===h.pack.sources[0].id).data.text,h.pack.sources[0].text);
 await page.getByRole('tab',{name:'修訂紀錄',exact:true}).click();await page.getByRole('button',{name:'查看此修訂'}).last().click();await page.getByRole('button',{name:'恢復至草稿'}).click();await waitMessage(page,'已載入舊內容');await page.getByRole('button',{name:'保存案卷',exact:true}).click();await waitMessage(page,'已保存研究修訂 4');assert.equal((await core.journal.getResearchRevision(h.db,h.person.id)).graph.events[0].original,'同一次授官的兩種紀年');
 assert.deepEqual(errors,[]);assert.equal(h.db.sql.prepare('SELECT count(*) n FROM catalogue_publication_events').get().n,0);
});

test('mobile master/detail, IME-safe search, keyboard selectors and all three themes remain usable',async t=>{
 const h=await host(t),context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-TW',reducedMotion:'reduce'});t.after(()=>context.close());const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>{errors.push(e.message);console.error('Research browser:',e.message);});await openPerson(page,h);await addPack(page,h.pack);
 await page.getByRole('button',{name:/六年.*八年.*同一次授官/}).click();await page.getByLabel('事項原文',{exact:true}).waitFor();await ensureNoOverflow(page);
 const kind=page.getByRole('combobox',{name:'事件性質',exact:true});await kind.press('Enter');const bounds=await kind.evaluate(input=>{const t=input.closest('.el-select').getBoundingClientRect(),p=document.getElementById(input.getAttribute('aria-controls')).closest('.el-popper').getBoundingClientRect();return {tw:t.width,pw:p.width,x:p.x,right:p.right,w:innerWidth};});assert.ok(Math.abs(bounds.tw-bounds.pw)<=1,JSON.stringify(bounds));assert.ok(bounds.x>=0&&bounds.right<=bounds.w+1);await kind.press('ArrowDown');await kind.press('Escape');await kind.press('Escape');assert.equal(await kind.getAttribute('aria-expanded'),'false');
 await page.getByRole('button',{name:'保存案卷',exact:true}).click();await waitMessage(page,'已保存研究修訂 1');
 for(const theme of ['藍圖清晝','紫調對讀','深藍夜讀']){await page.getByRole('combobox',{name:'外觀主題',exact:true}).press('Enter');await page.getByRole('option',{name:theme,exact:true}).click();await ensureNoOverflow(page);await page.screenshot({path:'work/validation/research/mobile-'+theme+'.png',fullPage:true});}
 await page.getByRole('button',{name:'← 返回事件列表',exact:true}).click();await page.locator('.event-list:visible').waitFor();
 const query=page.getByLabel('搜尋人物',{exact:true});await query.dispatchEvent('compositionstart');await query.fill('不存在的人物');assert.equal(await page.getByRole('button',{name:'搜尋',exact:true}).isDisabled(),true);await query.dispatchEvent('compositionend');await page.getByRole('button',{name:'搜尋',exact:true}).click();await page.getByText('沒有符合的人物，請更換關鍵字或清除搜尋。',{exact:true}).waitFor();await page.getByRole('button',{name:'清除',exact:true}).click();await page.getByRole('button',{name:/合成人物.*person:workspace-test/}).waitFor();assert.deepEqual(errors,[]);
});
