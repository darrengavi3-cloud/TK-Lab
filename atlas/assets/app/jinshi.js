export function epigraphicYear(value){
  if(typeof value!=='number'&&typeof value!=='string')return null;
  if(String(value).trim()==='')return null;
  const year=Number(value);
  return Number.isInteger(year)&&year>0?year:null;
}

export function epigraphicEraKey(item){
  const year=epigraphicYear(item?.year);
  if(year!==null)return year<220?'后汉':year<266?'三国':'两晋';
  const dynasty=item?.readerDisplayStatus==='candidate-dynasty'?'':item?.dynasty;
  if(['后汉','东汉'].includes(dynasty))return '后汉';
  if(['季汉','蜀汉','魏','吴'].includes(dynasty))return '三国';
  if(['西晋','东晋'].includes(dynasty))return '两晋';
  if(['魏','吴'].includes(item?.polity))return '三国';
  if(item?.polity==='晋')return '两晋';
  return '';
}

export function epigraphicInscriptionState(item){
  if(!String(item?.inscription||'').trim())return '源文未见';
  const status=String(item?.inscriptionStatus||'');
  if(/待校/.test(status))return '待校';
  return /残|缺/.test(status)?'残缺':'已录入';
}

export function matchesEpigraphicInscriptionStatus(item,status){
  if(!status||status==='all')return true;
  if(status==='已录入')return Boolean(String(item?.inscription||'').trim());
  return epigraphicInscriptionState(item)===status;
}

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

// 释文中的缺字符号必须逐字保留（DESIGN.md V62／V65），此处只做切分与标注，
// 不改写任何字符：□ 为可数缺字，■ 为残泐不可识，连续的 • 或 . 为字数不明的阙文。
// 裸 □ 与字体缺字时的豆腐块无法分辨，专业读者会误判为渲染问题。
const LACUNA_RUN = /(\u25A1+|\u25A0+|[\u2022\u00B7]{2,}|\.{3,})/g;

export function lacunaKindOf(run){
  const head=String(run||'')[0];
  if(head==='\u25A1') return 'missing';
  if(head==='\u25A0') return 'illegible';
  return 'ellipsis';
}

export function lacunaHintOf(run){
  const kind=lacunaKindOf(run);
  const count=String(run||'').length;
  if(kind==='missing') return '原石缺 '+count+' 字';
  if(kind==='illegible') return '残泐不可识 '+count+' 字';
  return '阙文，字数不明';
}

export function segmentLacunae(fragments){
  const out=[];
  for(const fragment of fragments||[]){
    const text=String(fragment&&fragment.text||'');
    if(!text){continue;}
    let cursor=0;
    LACUNA_RUN.lastIndex=0;
    let match;
    while((match=LACUNA_RUN.exec(text))!==null){
      if(match.index>cursor) out.push({text:text.slice(cursor,match.index),hit:!!fragment.hit,lacuna:null,hint:''});
      out.push({text:match[0],hit:!!fragment.hit,lacuna:lacunaKindOf(match[0]),hint:lacunaHintOf(match[0])});
      cursor=match.index+match[0].length;
    }
    if(cursor<text.length) out.push({text:text.slice(cursor),hit:!!fragment.hit,lacuna:null,hint:''});
  }
  return out;
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
