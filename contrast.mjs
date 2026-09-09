import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
const root=path.resolve('/tmp/tk/atlas');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer((q,s)=>{const p=decodeURIComponent(new URL(q.url,'http://l').pathname);const t=path.join(root,path.normalize(p).replace(/^(\.\.[/\\])+/,''));if(!t.startsWith(root)||!existsSync(t)||statSync(t).isDirectory()){s.writeHead(404).end('x');return;}s.writeHead(200,{'content-type':MIME[path.extname(t).toLowerCase()]||'application/octet-stream'});createReadStream(t).pipe(s);});
const port=await new Promise(r=>server.listen(0,'127.0.0.1',()=>r(server.address().port)));
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});const page=await ctx.newPage();
await page.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'load'});await page.waitForTimeout(7000);
const more=page.locator('.v56-mobile-more, .v84-more-menu button').first();
if(await more.count()){await more.click().catch(()=>{});await page.waitForTimeout(1200);}
const info=await page.evaluate(()=>{
  const out=[];
  for(const el of document.querySelectorAll('*')){
    const t=(el.textContent||'').trim();
    if(el.children.length||!t)continue;
    if(!/更多/.test(t))continue;
    const cs=getComputedStyle(el);
    const r=el.getBoundingClientRect();
    let bg='',node=el;
    while(node&&node.nodeType===1){const c=getComputedStyle(node).backgroundColor;if(c&&c!=='rgba(0, 0, 0, 0)'){bg=c;break;}node=node.parentElement;}
    out.push({text:t,tag:el.tagName,cls:el.className,color:cs.color,bg,size:cs.fontSize,
      w:Math.round(r.width),h:Math.round(r.height),visible:r.width>1&&r.height>1,
      ariaHidden:el.closest('[aria-hidden="true"]')?true:false,
      parentCls:el.parentElement?el.parentElement.className:''});
  }
  return out;
});
info.forEach(i=>console.log(JSON.stringify(i)));
await b.close();server.close();
