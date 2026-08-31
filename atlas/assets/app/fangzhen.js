export function buildAdministrativeSearchText(record,administrativeIndex,stateNames){
  const value=record||{};
  const text=[value.commander,value.title,value.jurisdiction,value.seat,value.tenureText,value.eraGroup,value.archiveScope,value.polity].map(item=>String(item||'')).join(' ');
  const state=(stateNames||[]).find(name=>String(value.jurisdiction||'').includes(name))||'';
  const stateEntry=(administrativeIndex?.states||[]).find(item=>item.name===state);
  const stateAliases=stateEntry?.aliases||[];
  const commanderyMatches=(administrativeIndex?.commanderies||[]).filter(item=>[item.name,...(item.aliases||[]),...(item.seats||[])].some(term=>text.includes(term)));
  const commanderyTerms=commanderyMatches.flatMap(item=>[item.name,...(item.aliases||[]),...(item.seats||[]),...(item.states||[])]);
  const seatTerms=[value.seat].flatMap(seat=>String(seat||'').split(/[／/、，,；;]/)).flatMap(seat=>[seat,...(administrativeIndex?.seatAliases?.[seat]||[])]);
  return [text,state,...stateAliases,...commanderyTerms,...seatTerms].join(' ').toLowerCase();
}

export function createAdministrativeSearchCache(){
  const cache=new Map();
  return {
    read(record,revision,build){
      const id=String(record?.id||'');
      const key=id+'@'+String(revision||'');
      if(cache.has(key))return cache.get(key);
      const value=build();cache.set(key,value);return value;
    },
    clear(){cache.clear();}
  };
}

export function projectFangzhenRecords(records,options={}){
  const source=Array.isArray(records)?records:[];
  const projector=options.mode==='review'?options.projectForReading:options.projectForReader;
  return typeof projector==='function'?projector(source):source.map(record=>({...record}));
}

export function extractAdministrativeState(value,stateNames){
  const text=String(value||'');
  return (stateNames||[]).find(name=>text.includes(name))||'';
}

export function buildJurisdictionIndex(records,stateNames){
  const rows=Array.isArray(records)?records:[];
  const counts=new Map();
  rows.forEach(record=>{
    const state=extractAdministrativeState(record?.jurisdiction,stateNames)||String(record?.jurisdiction||'').trim();
    if(state)counts.set(state,(counts.get(state)||0)+1);
  });
  return [...counts.entries()]
    .map(([name,count])=>({name,count}))
    .sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
}

export function paginateFangzhenRecords(records,page,pageSize=12){
  const rows=Array.isArray(records)?records:[];
  const size=Math.max(1,Number(pageSize)||12);
  const pageCount=Math.max(1,Math.ceil(rows.length/size));
  const current=Math.min(pageCount,Math.max(1,Number(page)||1));
  return {page:current,pageCount,total:rows.length,rows:rows.slice((current-1)*size,current*size)};
}

export function relatedFangzhenRecords(records,selected){
  if(!selected)return [];
  const rows=Array.isArray(records)?records:[];
  const unitId=String(selected.administrativeUnitId||'');
  const jurisdiction=String(selected.jurisdiction||'');
  return rows.filter(record=>unitId
    ? String(record.administrativeUnitId||'')===unitId || (!record.administrativeUnitId&&String(record.jurisdiction||'')===jurisdiction)
    : String(record.jurisdiction||'')===jurisdiction);
}

export function verifiedSeatPeriods(records){
  const unique=new Map();
  (Array.isArray(records)?records:[]).forEach(record=>{
    const id=String(record?.seatPeriodId||'');
    const seatName=String(record?.seatName||record?.seat||'').trim();
    if(!id||!seatName||unique.has(id))return;
    unique.set(id,{
      seatPeriodId:id,
      administrativeUnitId:String(record.administrativeUnitId||''),
      seatName,
      seatType:String(record.seatType||''),
      validFromYear:record.seatValidFromYear??null,
      validToYear:record.seatValidToYear??null,
    });
  });
  return [...unique.values()].sort((a,b)=>(Number(a.validFromYear)||0)-(Number(b.validFromYear)||0)||a.seatName.localeCompare(b.seatName,'zh-CN'));
}
