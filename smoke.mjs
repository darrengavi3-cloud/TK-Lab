import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'/tmp/tk/atlas');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer((q,s)=>{const p=decodeURIComponent(new URL(q.url,'http://l').pathname);const t=path.join(root,path.normalize(p).replace(/^(\.\.[/\\])+/,''));if(!t.startsWith(root)||!existsSync(t)||statSync(t).isDirectory()){s.writeHead(404).end('x');return;}s.writeHead(200,{'content-type':MIME[path.extname(t).toLowerCase()]||'application/octet-stream'});createReadStream(t).pipe(s);});
const port=await new Promise(r=>server.listen(0,'127.0.0.1',()=>r(server.address().port)));
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,180)));
await page.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'load'});await page.waitForTimeout(7000);
console.log('狀態列:', (await page.locator('.statusbar').first().innerText().catch(()=>'（無）')).replace(/\n/g,' | '));
console.log('主導航:', (await page.locator('.v56-spine-nav button').allInnerTexts()).join(' / '));
const more=page.locator('button').filter({hasText:'更多'}).first();
if(await more.count()){await more.click().catch(()=>{});await page.waitForTimeout(900);}
const all=await page.locator('button, [role="menuitem"]').allInnerTexts();
console.log('史源入口可見:', all.some(t=>t.includes('史源')));
const item=page.locator('button, [role="menuitem"]').filter({hasText:'史源'}).first();
if(await item.count()){await item.click().catch(e=>console.log('click:',e.message));await page.waitForTimeout(7000);}
console.log('史源指標:', JSON.stringify(await page.locator('.shiyuan-workbench .battle-metric').allInnerTexts().catch(()=>[])));
console.log('卷次列數:', await page.locator('.v56-shiyuan-volumes .el-table__row').count());
console.log('錯誤:', errs.length, errs.slice(0,3).join(' / '));
await b.close();server.close();
