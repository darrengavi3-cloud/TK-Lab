export function highlightTextFragments(text,query){
  const value=String(text||'');
  const q=String(query||'').trim().toLowerCase();
  if(!value)return [];
  if(!q)return [{text:value,hit:false}];
  const lower=value.toLowerCase();
  const fragments=[];
  let cursor=0;
  while(cursor<value.length){
    const at=lower.indexOf(q,cursor);
    if(at<0){fragments.push({text:value.slice(cursor),hit:false});break;}
    if(at>cursor)fragments.push({text:value.slice(cursor,at),hit:false});
    fragments.push({text:value.slice(at,at+q.length),hit:true});
    cursor=at+q.length;
  }
  return fragments;
}

function overlayAt(source,id){
  if(source instanceof Map)return source.get(id)||{};
  return source&&typeof source==='object'?source[id]||{}:{};
}

export function mergeEpigraphicRecords(options={}){
  const clone=options.clone||((value)=>JSON.parse(JSON.stringify(value)));
  const normalize=typeof options.normalize==='function'?options.normalize:(value=>value);
  const overlays=Array.isArray(options.overlays)?options.overlays:[];
  const readerOverlays=options.readerOverlays||{};
  return clone((options.records||[]).map(raw=>{
    const merged=Object.assign({},raw,...overlays.map(source=>overlayAt(source,raw.id)));
    const reader=overlayAt(readerOverlays,raw.id);
    if(reader&&Object.keys(reader).length){
      merged.inscription=String(reader.inscription||'');
      merged.inscriptionStatus=String(reader.inscriptionStatus||'');
      merged.inscriptionVariants=clone(reader.inscriptionVariants||[]);
    }
    return normalize(merged);
  }));
}
