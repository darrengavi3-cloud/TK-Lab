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
