import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

// Exercise the actual React shell and homepage, including fixed-snapshot selection.
const compiled=await build({stdin:{contents:'import React from "react"; import {createRoot} from "react-dom/client"; import Home from "./app/page.tsx"; createRoot(document.getElementById("root")).render(<Home/>);',loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},logLevel:'silent'});
const snapshot='a'.repeat(64);
const fixture={people:[{personId:'person:test:shan-a',name:'山濤',aliases:['山涛'],zi:'巨源',dynastyTags:['西晋']},{personId:'person:test:shan-b',name:'山濤',aliases:['山涛'],dynastyTags:['后汉']},{personId:'person:test:yang',name:'羊祜',dynastyTags:['西晋']}]};
const browser=await chromium.launch({headless:true});
test.after(()=>browser.close());
async function host(t){
  const state={fail:false,requests:[]};
  const server=createServer(async(req,res)=>{
    const p=new URL(req.url,'http://localhost').pathname;state.requests.push(p);
    if(p==='/reader/current'){res.writeHead(302,{Location:`/reader/snapshot/${snapshot}/index.html`}).end();return;}
    if(p===`/reader/snapshot/${snapshot}/data/v63-reader-people.json`){res.writeHead(state.fail?503:200,{'content-type':'application/json'}).end(JSON.stringify(fixture));return;}
    if(p===`/reader/snapshot/${snapshot}/index.html`){res.writeHead(200,{'content-type':'text/html;charset=utf-8'}).end(`<div class="shell" data-module-state="loading"><div class="people-workbench" style="height:300px;overflow:auto"><div style="height:2400px">fixture reader</div></div><div class="el-drawer__body" style="height:180px;overflow:auto"><div style="height:3000px">fixture detail</div></div></div><script>window.addEventListener('message',e=>{if(!/^#(people|offices)/.test(e.data.hash||''))return;window.received=e.data;history.replaceState(null,"",e.data.hash);document.querySelector('.shell').dataset.moduleState='ready';parent.postMessage({type:'guanshitai:route',mode:'replace',hash:e.data.hash,title:'山涛 · 人物记'},location.origin)});parent.postMessage({type:'guanshitai:ready'},location.origin);</script>`);return;}
    if(p==='/bundle.js'){res.writeHead(200,{'content-type':'text/javascript'}).end(compiled.outputFiles[0].contents);return;}
    if(p.endsWith('.css')){try{const file=path.resolve('.'+p);if(!file.startsWith(process.cwd()+path.sep))throw Error();res.writeHead(200,{'content-type':'text/css'}).end(await fs.readFile(file));return;}catch{res.writeHead(404).end();return;}}
    res.writeHead(200,{'content-type':'text/html;charset=utf-8'}).end('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app/globals.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  return {...state,state,url:'http://127.0.0.1:'+server.address().port};
}
async function noOverflow(page){const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>({tag:n.tagName,class:n.className,right:n.getBoundingClientRect().right})).slice(0,12)}));assert.ok(layout.scroll<=layout.width+1,JSON.stringify(layout));}

test('homepage searches the active snapshot and keeps homonyms on distinct stable links',async t=>{
  const h=await host(t),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});t.after(()=>context.close());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(h.url);await page.getByRole('link',{name:'浏览人物档案'}).waitFor();await page.waitForFunction(()=>document.querySelectorAll('.atlas-featured a').length>0);
  assert.equal(await page.locator('iframe').count(),0);await page.getByLabel('搜索人物',{exact:true}).fill('山涛');await page.getByText('找到 2 位人物',{exact:true}).waitFor();
  const links=await page.locator('.atlas-result-links a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));assert.deepEqual(links,['#people?person=person%3Atest%3Ashan-a','#people?person=person%3Atest%3Ashan-b']);
  assert.ok(h.state.requests.includes(`/reader/snapshot/${snapshot}/data/v63-reader-people.json`));assert.equal(h.state.requests.includes('/legacy/data/v63-reader-people.json'),false);
  await noOverflow(page);assert.equal(await page.locator('.atlas-explore').evaluate(n=>getComputedStyle(n).borderRadius),'24px');
  await fs.mkdir('work/validation/blue-atlas',{recursive:true});await page.screenshot({path:'work/validation/blue-atlas/home-desktop.png',fullPage:true});
  await page.locator('.atlas-result-links a').nth(1).click();await page.locator('iframe').waitFor();await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow.received?.hash?.includes('shan-b'));
  assert.equal(new URL(page.url()).hash,'#people?person=person%3Atest%3Ashan-b');assert.deepEqual(errors,[]);
});

test('phone search, shortcut, clear and browser Back preserve the exploration query',async t=>{
  const h=await host(t),context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});t.after(()=>context.close());const page=await context.newPage();await page.goto(h.url+'/?q=山涛');await page.getByText('找到 2 位人物',{exact:true}).waitFor();
  await noOverflow(page);await page.keyboard.press('Control+k');assert.equal(await page.getByLabel('搜索人物',{exact:true}).evaluate(n=>n===document.activeElement),true);
  await page.locator('.atlas-result-links a').first().click();await page.locator('iframe').waitFor();await page.goBack({waitUntil:"commit"});await page.getByText('找到 2 位人物',{exact:true}).waitFor();assert.equal(await page.getByLabel('搜索人物',{exact:true}).inputValue(),'山涛');
  await page.getByRole('button',{name:'清除人物搜索',exact:true}).click();assert.equal(await page.getByLabel('搜索人物',{exact:true}).inputValue(),'');assert.equal(new URL(page.url()).search,'');await noOverflow(page);
  await page.screenshot({path:'work/validation/blue-atlas/home-mobile.png',fullPage:true});
});

test('snapshot failure has an honest error and retry, rather than candidate or zero-result fallback',async t=>{
  const h=await host(t);h.state.fail=true;const context=await browser.newContext({viewport:{width:390,height:844}});t.after(()=>context.close());const page=await context.newPage();await page.goto(h.url);await page.getByRole('alert').waitFor();
  await page.getByLabel('搜索人物',{exact:true}).fill('山涛');assert.equal(await page.getByText('找到 2 位人物',{exact:true}).count(),0);assert.equal(await page.getByText('没有匹配的人物，请尝试别名或其他写法。',{exact:true}).count(),0);
  h.state.fail=false;await page.getByRole('button',{name:'重新载入',exact:true}).click();await page.getByText('找到 2 位人物',{exact:true}).waitFor();await noOverflow(page);
});


test('device reading history resumes the stable record and scroll position, and can be cleared',async t=>{
 const h=await host(t),context=await browser.newContext({viewport:{width:390,height:844}});t.after(()=>context.close());const page=await context.newPage();await page.goto(h.url);await page.getByLabel('搜索人物',{exact:true}).fill('山涛');await page.locator('.atlas-result-links a').first().click();await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow.received?.hash?.includes('shan-a'));
 await page.locator('iframe').evaluate(f=>{f.contentDocument.querySelector('.people-workbench').scrollTop=640;f.contentDocument.querySelector('.el-drawer__body').scrollTop=960;});await page.goto(h.url);await page.getByRole('navigation',{name:'最近阅读记录'}).getByRole('link',{name:'山涛 · 人物记'}).click();await page.waitForFunction(()=>document.querySelector('iframe')?.contentDocument.querySelector('.people-workbench').scrollTop===640&&document.querySelector('iframe')?.contentDocument.querySelector('.el-drawer__body').scrollTop===960);assert.equal(new URL(page.url()).hash,'#people?person=person%3Atest%3Ashan-a');await page.goto(h.url);await page.getByRole('button',{name:'清除最近阅读',exact:true}).click();assert.equal(await page.getByRole('navigation',{name:'最近阅读记录'}).count(),0);await noOverflow(page);
});

test('recent reading rejects malformed stored entries and never exposes them as links',async t=>{
 const h=await host(t),context=await browser.newContext();t.after(()=>context.close());await context.addInitScript(()=>localStorage.setItem('guanshitai:recent-reading',JSON.stringify([{hash:'javascript:alert(1)',title:'unsafe',scroll:0},{hash:'#people',title:'invalid scroll',scroll:-1}])));const page=await context.newPage();await page.goto(h.url);await page.getByRole('link',{name:'浏览人物档案'}).waitFor();assert.equal(await page.getByRole('navigation',{name:'最近阅读记录'}).count(),0);
});

test('phone search reflows with fallback fonts, long labels and 200 percent text',async t=>{
 const h=await host(t),context=await browser.newContext({viewport:{width:320,height:844},reducedMotion:'reduce'});t.after(()=>context.close());const page=await context.newPage();await page.goto(h.url+'/?q=山涛');await page.getByText('找到 2 位人物',{exact:true}).waitFor();
 for(const font of ['Arial, sans-serif','serif','monospace']){await page.addStyleTag({content:`html{font-size:32px!important}.atlas-home{font-family:${font}!important}`});await noOverflow(page);const clear=page.getByRole('button',{name:'清除人物搜索',exact:true});assert.ok(await clear.isVisible());const bounds=await clear.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=320);}
 await page.locator('.atlas-result-links strong').first().evaluate(n=>n.textContent='LongUnbrokenName'.repeat(12));await noOverflow(page);await page.getByRole('button',{name:'清除人物搜索',exact:true}).click();assert.equal(await page.getByLabel('搜索人物',{exact:true}).inputValue(),'');await noOverflow(page);
});
