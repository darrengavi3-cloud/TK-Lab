import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

// Browser layout/keyboard gate; server validation is exercised by the real D1
// integration tests. This fixture never connects to or changes production.
const compiled=await build({entryPoints:['admin/client.ts'],bundle:true,format:'esm',platform:'browser',write:false,logLevel:'silent'});
const refs=JSON.parse(fs.readFileSync('domain/reader-references.json','utf8'));
const data={id:'appointment:visual',kind:'appointment',personId:'person:visual',officeId:null,officeName:'驗收任官',nature:'待考',polity:'季汉',jurisdiction:'益州',date:{original:'年代未詳',startYear:null,endYear:null,precision:'unknown',certainty:'unknown',basis:''},assessment:'pending',workflow:'draft',visibility:'private',disposition:'none',duplicateOf:null,reason:'',evidence:[]};
const row={id:data.id,version:1,number:1,commit:1,data,digest:'fixture',actor:'visual-owner',reason:'隔離驗收',at:'2026-09-17T00:00:00Z'};
const person={...row,id:'person:visual',data:{id:'person:visual',kind:'person',name:'驗收人物'}};
const server=createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost'),p=url.pathname;
  if(p.startsWith('/api/admin/')){
    const result=p.endsWith('/session')?{actor:'visual-owner',baselineLoaded:true}:p.endsWith('/reader-links')?{...refs,units:[],fangzhen:[]}:p==='/api/admin/records'?{rows:[row],total:1}:p.endsWith('person%3Avisual')?person:row;
    response.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(result));return;
  }
  if(p==='/admin-client.mjs'){response.writeHead(200,{'content-type':'text/javascript'}).end(compiled.outputFiles[0].text);return;}
  const relative=p==='/admin'?'admin/index.html':p==='/admin.css'?'public/admin.css':p.startsWith('/legacy/')?'atlas/'+p.slice(8):null;
  if(!relative||relative.includes('..')||!fs.existsSync(relative)){response.writeHead(404).end();return;}
  response.writeHead(200,{'content-type':({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[path.extname(relative)]||'application/octet-stream'}).end(fs.readFileSync(relative));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
test.after(async()=>{await browser.close();await new Promise(resolve=>server.close(resolve));});
for(const width of [390,1280])test(`appointment link selectors preserve layout, no-results and keyboard at ${width}px`,async()=>{
  const context=await browser.newContext({viewport:{width,height:860},locale:'zh-TW',reducedMotion:'reduce'});
  try{
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/admin?kind=appointment&id=appointment%3Avisual`,{waitUntil:'load'});
    const select=page.getByRole('combobox',{name:'關聯官職',exact:true});
    await select.fill('不存在的官職');
    await page.getByText('沒有符合的記錄',{exact:true}).waitFor({state:'visible'});
    await select.fill('季漢 大将军');
    const option=page.getByRole('option',{name:'季漢 · 大将军',exact:true});await option.waitFor({state:'visible'});
    const geometry=await select.evaluate(input=>{
      const trigger=input.closest('.el-select').getBoundingClientRect();
      const popup=document.getElementById(input.getAttribute('aria-controls')).closest('.el-popper').getBoundingClientRect();
      return {trigger:{x:trigger.x,width:trigger.width},popup:{x:popup.x,width:popup.width},viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(geometry.overflow,false);assert.ok(Math.abs(geometry.trigger.width-geometry.popup.width)<=1,JSON.stringify(geometry));
    assert.ok(Math.abs(geometry.trigger.x-geometry.popup.x)<=1);
    assert.ok(geometry.popup.x>=0&&geometry.popup.x+geometry.popup.width<=geometry.viewport+1);
    await option.click();
    // Element Plus clears the active filter on the first Escape, then closes.
    await select.press('Escape');await select.press('Escape');
    assert.equal(await select.getAttribute('aria-expanded'),'false');
    await page.getByText('同步到州鎮表',{exact:true}).click();
    const polity=page.getByRole('combobox',{name:'州鎮檔案',exact:true});await polity.press('Enter');await polity.press('ArrowDown');await polity.press('Enter');await polity.press('Escape');
    await page.getByRole('button',{name:'保存修訂',exact:true}).scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
