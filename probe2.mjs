import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
const root=path.resolve('/tmp/tk/atlas');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer((q,s)=>{const p=decodeURIComponent(new URL(q.url,'http://l').pathname);const t=path.join(root,path.normalize(p).replace(/^(\.\.[/\\])+/,''));if(!t.startsWith(root)||!existsSync(t)||statSync(t).isDirectory()){s.writeHead(404).end('x');return;}s.writeHead(200,{'content-type':MIME[path.extname(t).toLowerCase()]||'application/octet-stream'});createReadStream(t).pipe(s);});
const port=await new Promise(r=>server.listen(0,'127.0.0.1',()=>r(server.address().port)));
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await ctx.newPage();
await page.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'load'});await page.waitForTimeout(7000);
const out=await page.evaluate(()=>{
  const res=[];
  const nav=document.querySelector('.v56-spine-nav');
  const more=document.querySelector('.v56-mobile-more');
  const root=getComputedStyle(document.documentElement);
  res.push({probe:'tokens',railBg:root.getPropertyValue('--v56-rail-bg').trim(),railInk:root.getPropertyValue('--v56-rail-ink').trim(),ink:root.getPropertyValue('--v56-ink').trim(),sheet:root.getPropertyValue('--v56-sheet').trim()});
  if(nav)res.push({probe:'nav',color:getComputedStyle(nav).color,bg:getComputedStyle(nav).backgroundColor});
  if(more)res.push({probe:'more',color:getComputedStyle(more).color,bg:getComputedStyle(more).backgroundColor,inDropdown:!!more.closest('.v84-more-menu')});
  for(const el of document.querySelectorAll('span,button,small,strong,i,em')){
    if(el.children.length)continue;
    const t=(el.textContent||'').trim();
    if(t!=='更多')continue;
    const cs=getComputedStyle(el);const r=el.getBoundingClientRect();
    let bg='none',node=el.parentElement;
    const chain=[];
    while(node&&node.nodeType===1&&chain.length<6){
      const c=getComputedStyle(node).backgroundColor;
      chain.push(node.tagName+'.'+String(node.className).split(' ')[0]+'='+c);
      if(c&&c!=='rgba(0, 0, 0, 0)'&&bg==='none')bg=c;
      node=node.parentElement;
    }
    res.push({tag:el.tagName,cls:String(el.className),color:cs.color,ownBg:cs.backgroundColor,firstOpaqueAncestorBg:bg,
      w:Math.round(r.width),h:Math.round(r.height),chain});
  }
  return res;
});
console.log(JSON.stringify(out,null,1));
await b.close();server.close();
