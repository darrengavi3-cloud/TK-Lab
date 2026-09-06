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

/**
 * 州镇表读者态的职任标题统一使用官名本身。辖区已由 jurisdiction 字段
 * 单独承载，因此“某郡太守”中的辖区前缀不应再次混入职任标题。
 * 仅规范标题字段，不改原始记录或史料正文。
 */
export function normalizeFangzhenOfficeTitle(value){
  const raw=String(value==null?'':value).trim();
  if(!raw)return '';
  return raw.replace(/(?:[\u4e00-\u9fff]{1,8})?郡太守/g,'太守');
}

export function normalizeFangzhenRecord(record){
  const value=record&&typeof record==='object'?record:{};
  const title=normalizeFangzhenOfficeTitle(value.title||value.displayTitle||value.commission);
  const commission=normalizeFangzhenOfficeTitle(value.commission||value.title||value.displayTitle);
  return {
    ...value,
    ...(title?{title}:{}),
    ...(commission?{commission}:{}),
  };
}

export function projectFangzhenRecords(records,options={}){
  const source=Array.isArray(records)?records:[];
  const projector=options.mode==='review'?options.projectForReading:options.projectForReader;
  const projected=typeof projector==='function'?projector(source):source.map(record=>({...record}));
  return projected.map(record=>{
    const normalized=normalizeFangzhenRecord(record);
    return {
      ...normalized,
      jurisdictionKind: classifyFangzhenJurisdiction(normalized),
      dynastyLabel: classifyFangzhenDynasty(normalized)
    };
  });
}

/**
 * 州、郡与方镇是三种不同的辖区语义：刺史／州牧归州，太守／国相归郡，
 * 都督、都尉及明确以军府／将军统军的记录归方镇。保留原 recordType，
 * 这里只提供读者界面的分组字段，不据辖区名推导新的历史事实。
 */
export function classifyFangzhenJurisdiction(record){
  const type=String(record?.recordType||'').trim();
  if(type==='dudu'||type==='duwei')return '方镇';
  if(type==='cishi')return '州';
  if(type==='taishou'||type==='junshou')return '郡';
  const title=String(record?.title||'');
  const jurisdiction=String(record?.jurisdiction||'');
  if(/都督|军府|中外军事|督.+军事/.test(title)||/军|诸军/.test(jurisdiction))return '方镇';
  if(/太守|国相|郡守/.test(title)||/郡(?:（.*）)?$/.test(jurisdiction))return '郡';
  if(/州牧|刺史/.test(title)||/州$/.test(jurisdiction))return '州';
  return '州';
}

/**
 * 汉末与季汉只在已有明确来源标识或可定位年份时拆分，模糊记录保留“汉”。
 */
export function classifyFangzhenDynasty(record){
  const polity=String(record?.polity||'').trim();
  if(polity==='季汉'||polity==='蜀汉')return '季汉';
  if(polity!=='汉')return polity||'';
  const id=String(record?.id||'');
  if(/^fz_shu(?:[_-]|$)/.test(id))return '季汉';
  if(/^fz_han(?:[_-]|$)/.test(id))return '后汉';
  const start=knownYear(record?.startYear),end=knownYear(record?.endYear);
  if(Number.isFinite(start)&&start>=221)return '季汉';
  if(Number.isFinite(end)&&end<=220)return '后汉';
  return '汉';
}

export function knownYear(value){
  if(value===null||value===undefined||String(value).trim()===''||typeof value==='boolean')return null;
  const year=Number(value);
  return Number.isInteger(year)?year:null;
}

// Missing bounds are unknown, not an unbounded tenure. A snapshot asserts
// actual service, so candidates and incomplete intervals cannot enter it.
export function fangzhenValidAtYear(record,value){
  const year=knownYear(value),start=knownYear(record?.startYear),end=knownYear(record?.endYear);
  return record?.readerDisplayStatus==='verified'
    && year!==null && start!==null && end!==null && start<=end
    && start<=year && year<=end;
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
