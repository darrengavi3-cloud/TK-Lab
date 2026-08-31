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

export function normalizeEpigraphicMediaAssets(value){
  return (Array.isArray(value)?value:[]).map((asset,index)=>({
    assetId:String(asset?.assetId||`media-${index+1}`),
    kind:String(asset?.kind||'image'),
    localPath:String(asset?.localPath||''),
    sourceTitle:String(asset?.sourceTitle||''),
    sourceUrl:String(asset?.sourceUrl||''),
    rightsStatus:String(asset?.rightsStatus||''),
    altText:String(asset?.altText||''),
    width:Number.isFinite(Number(asset?.width))?Number(asset.width):null,
    height:Number.isFinite(Number(asset?.height))?Number(asset.height):null,
  })).filter(asset=>asset.localPath
    &&asset.altText
    &&!/^([a-z][a-z0-9+.-]*:|\/|\\)/i.test(asset.localPath)
    &&!asset.localPath.split(/[\\/]/).includes('..'));
}

export function paginateEpigraphicRecords(records,page,pageSize=12){
  const rows=Array.isArray(records)?records:[];
  const size=Math.max(1,Number(pageSize)||12);
  const pageCount=Math.max(1,Math.ceil(rows.length/size));
  const current=Math.min(pageCount,Math.max(1,Number(page)||1));
  return {page:current,pageCount,total:rows.length,rows:rows.slice((current-1)*size,current*size)};
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
    merged.mediaAssets=normalizeEpigraphicMediaAssets(merged.mediaAssets);
    return normalize(merged);
  }));
}
