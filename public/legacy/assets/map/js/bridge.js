/* 父页面联动桥：地图州郡可跳转州镇录，州镇记录也可反向定位地图。 */
(function(global){
  'use strict';
  const layers={province:new Map(),commandery:new Map()};
  let mapRef=null,currentPeriod=null,pendingFocus=null,selected=null;
  function clean(value){return String(value||'').replace(/[（(].*?[）)]/g,'').replace(/州|郡|国|部$/,'').trim();}
  function send(type,payload){
    try{global.parent.postMessage(Object.assign({type:type},payload||{}),'*');}catch(_){}
  }
  function register(level,feature,layer,polity){
    if(!layers[level]||!feature||!layer) return;
    const names=[feature.name,feature.state,feature.sourceName].filter(Boolean);
    names.forEach(function(name){layers[level].set(clean(name),{feature:feature,layer:layer,polity:polity||feature.kingdom||''});});
    layer.on('click',function(){
      select(level,{feature:feature,layer:layer,polity:polity||feature.kingdom||''});
      send('sgz-map-selection',{level:level,name:feature.name||'',state:feature.state||'',sourceName:feature.sourceName||'',
        polity:polity||feature.kingdom||'',periodId:currentPeriod&&currentPeriod.id,year:currentPeriod&&currentPeriod.year});
    });
    if(pendingFocus){
      const wanted=clean(pendingFocus.name);
      if(names.some(function(name){const candidate=clean(name);return candidate.includes(wanted)||wanted.includes(candidate);})){const request=pendingFocus;pendingFocus=null;setTimeout(function(){focus(request);},80);}
    }
  }
  function clear(level){
    if(layers[level]) layers[level].clear();
    if(selected&&selected.level===level){restore(selected);selected=null;}
  }
  function restore(entry){
    if(!entry||!entry.layer||!entry.layer.setStyle) return;
    try{entry.layer.setStyle(entry.originalStyle||{});}catch(_){ }
  }
  function select(level,entry){
    restore(selected);
    if(!entry||!entry.layer) { selected=null; return; }
    entry.originalStyle={color:entry.layer.options.color,weight:entry.layer.options.weight,opacity:entry.layer.options.opacity,fillOpacity:entry.layer.options.fillOpacity,fillColor:entry.layer.options.fillColor};
    selected=Object.assign({level:level},entry);
    if(entry.layer.setStyle){
      entry.layer.setStyle({color:'#9C3B2E',weight:2.8,opacity:1,fillOpacity:Math.max(.30,Number(entry.layer.options.fillOpacity)||0),fillColor:entry.layer.options.fillColor});
      if(entry.layer.bringToFront) entry.layer.bringToFront();
    }
  }
  function clearSelection(){restore(selected);selected=null;}
  function setPeriod(period){
    currentPeriod=period||null;
    send('sgz-map-period',{periodId:period&&period.id,year:period&&period.year,index:period&&period.__index});
  }
  function focus(payload){
    const wanted=clean(payload&&payload.name); if(!wanted) return false;
    const pools=payload&&payload.level&&layers[payload.level]?[layers[payload.level]]:[layers.commandery,layers.province];
    let found=null;
    for(const pool of pools){
      found=pool.get(wanted)||Array.from(pool.entries()).find(function(entry){return entry[0].includes(wanted)||wanted.includes(entry[0]);})?.[1];
      if(found) break;
    }
    if(!found){pendingFocus=payload||null;return false;}
    const layer=found.layer;
    if(mapRef&&layer.getBounds){const bounds=layer.getBounds();if(bounds&&bounds.isValid()) mapRef.fitBounds(bounds.pad(.32),{maxZoom:6,animate:true});}
    if(layer.openTooltip) layer.openTooltip();
    if(layer.setStyle){
      const old={color:layer.options.color,weight:layer.options.weight,fillOpacity:layer.options.fillOpacity};
      layer.setStyle({color:'#8D3D32',weight:3,fillOpacity:Math.max(.28,Number(layer.options.fillOpacity)||0)});
      setTimeout(function(){try{layer.setStyle(old);}catch(_){}},1800);
    }
    return true;
  }
  global.addEventListener('message',function(event){
    if(event.data&&event.data.type==='sgz-map-focus') focus(event.data);
    if(event.data&&event.data.type==='sgz-map-clear-selection') clearSelection();
  });
  global.HistoryMapBridge={setMap:function(map){mapRef=map;},register:register,clear:clear,setPeriod:setPeriod,focus:focus,select:select,clearSelection:clearSelection};
})(window);
