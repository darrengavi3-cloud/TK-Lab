(async function(global){
  'use strict';
  const host=document.getElementById('portrait-viewer');
  const element=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
  try{
    const get=async url=>{const response=await fetch(url);if(!response.ok)throw new Error('立绘资料加载失败');return response.json();};
    const [manifest,people]=await Promise.all([get('./data/portrait-manifest.json'),get('./data/v63-reader-people.json')]);
    const names=new Map(people.people.map(person=>[person.personId,person.name]));
    const assets=Object.values(manifest.assetsById).filter(asset=>asset.status==='ready'&&/^\.\/assets\/portraits\/20261004\/.*\.png$/.test(asset.src||''));
    const requested=new URLSearchParams(global.location.search).get('portrait');
    host.replaceChildren();host.removeAttribute('role');
    const picture=(asset,detail)=>{const img=element('img');img.src=asset.src;img.alt=(names.get(asset.personId)||'艺术素材')+'立绘';img.loading=detail?'eager':'lazy';img.decoding='async';const variants=global.SGZ_PORTRAIT_VARIANTS?.bySrc?.[asset.src];if(variants){img.srcset=variants.srcset;img.sizes=detail?'(max-width: 760px) 320px, 380px':'192px';}return img;};
    if(requested){
      const asset=assets.find(asset=>asset.portraitId===requested);if(!asset)throw new Error('该立绘暂不可查看。');
      const section=element('section',null,'portrait-viewer');section.dataset.personId=asset.personId;section.dataset.portraitId=asset.portraitId;
      const frame=element('div',null,'people-detail-portrait');frame.append(picture(asset,true));
      const info=element('div');info.append(element('h1',names.get(asset.personId)||'艺术立绘'));
      info.append(element('p','人物艺术立绘；表现年龄为设计选择，服饰细节待考。','reader-quiet-note'));
      const raw=element('a','查看原图','control');raw.href=asset.src;raw.target='_blank';raw.rel='noopener';info.append(raw);
      if(names.has(asset.personId)){const profile=element('a','查看人物条目','control');profile.href='./index.html#people?person='+encodeURIComponent(asset.personId);info.append(profile);}else{info.append(element('p','此立绘仅作为艺术素材展示，人物史料条目尚未开放。','portrait-scope-note'));}
      section.append(frame,info);host.append(section);
    }else{
      host.append(element('h1','人物立绘'));host.append(element('p','人物艺术立绘；表现年龄为设计选择，服饰细节待考。','reader-quiet-note'));
      const input=element('input');input.type='search';input.placeholder='搜索已开放的人物';input.setAttribute('aria-label','搜索人物立绘');host.append(input);
      const grid=element('div',null,'portrait-gallery');host.append(grid);
      const render=()=>{grid.replaceChildren();const query=input.value.trim();for(const asset of assets.filter(asset=>!query||(names.get(asset.personId)||'').includes(query))){const card=element('a');card.href='./portraits.html?portrait='+encodeURIComponent(asset.portraitId);card.dataset.portraitId=asset.portraitId;card.append(picture(asset,false),element('span',names.get(asset.personId)||'艺术立绘'));grid.append(card);}if(!grid.children.length)grid.append(element('p','未找到相符的立绘。'));};
      input.addEventListener('input',render);render();
    }
  }catch(error){host.replaceChildren(element('p',error.message));const retry=element('a','重新加载','control');retry.href=global.location.href;host.append(retry);host.setAttribute('role','alert');}
})(window);
