export function normalizePersonSearchText(value,toSimplified){
  const normalized=String(value==null?'':value).normalize('NFKC');
  const simplified=typeof toSimplified==='function'?toSimplified(normalized):normalized;
  return String(simplified).toLowerCase().replace(/[\s·•・]+/g,'').trim();
}

export function firstPersonFieldMatch(values,query,options={}){
  const mode=options.mode==='exact'?'exact':'contains';
  const normalize=options.normalize||normalizePersonSearchText;
  for(const raw of values||[]){
    const value=String(raw==null?'':raw).trim();
    const candidate=normalize(value);
    if(value&&(mode==='exact'?candidate===query:candidate.includes(query)))return value;
  }
  return '';
}

export function fieldIsPublished(registry,personId,field){
  if(!registry)return true;
  return (registry.publicationByPersonId?.[personId]?.[field]
    ||registry.byPersonId?.[personId]?.publicationStatus?.[field])==='verified';
}

export function matchPerson(person,query,options={}){
  const normalize=value=>normalizePersonSearchText(value,options.toSimplified);
  const q=normalize(query);
  if(!q)return {matched:true,score:0,reason:'',kind:''};
  const first=(values,mode='contains')=>firstPersonFieldMatch(values,q,{mode,normalize});
  const exactFields=[
    {label:'姓名',values:[person.name,person.canonicalName],score:0},
    {label:'别名',values:person.aliases||[],score:10},
    {label:'表字',values:[person.zi],score:12}
  ];
  for(const field of exactFields){
    const value=first(field.values,'exact');
    if(value)return {matched:true,score:field.score,reason:`直接命中·${field.label}`,matchedValue:value,kind:'direct'};
  }
  const containsFields=[
    {label:'姓名',values:[person.name,person.canonicalName,...(person.searchKeys||[])],score:20,kind:'direct'},
    {label:'别名／表字',values:[...(person.aliases||[]),person.zi],score:30,kind:'direct'},
    {label:'官职',values:(person.appointments||[]).flatMap(item=>[item.displayTitle,item.nodeName,item.title,item.officeName,item.jurisdiction]),score:100,kind:'related'},
    {label:'爵号／封地',values:(person.peerageEvents||[]).flatMap(item=>[item.displayRank,item.rank,item.displayTitle,item.title,item.fief]),score:110,kind:'related'},
    {label:'朝代／历史归属',values:[...(person.dynastyTags||[]),...(person.historicalAffiliations||[])],score:120,kind:'related'},
    {label:'籍贯',values:[person.birthplace],score:130,kind:'related'}
  ];
  for(const field of containsFields){
    const value=first(field.values);
    if(value)return {matched:true,score:field.score,reason:`${field.kind==='direct'?'直接':'关联'}命中·${field.label}`,matchedValue:value,kind:field.kind};
  }
  return {matched:false,score:999,reason:'',kind:''};
}

export function dynastySortIndex(person,dynastyOrder){
  const order=Array.isArray(dynastyOrder)?dynastyOrder:[];
  const indexes=(person?.dynastyTags||[]).map(tag=>order.indexOf(tag)).filter(index=>index>=0);
  return indexes.length?Math.min(...indexes):order.length;
}

export function comparePeople(a,b,options={}){
  const queryActive=Boolean(String(options.query||'').trim());
  return (queryActive?(Number(a.searchScore)||0)-(Number(b.searchScore)||0):0)
    ||dynastySortIndex(a,options.dynastyOrder)-dynastySortIndex(b,options.dynastyOrder)
    ||String(a.name||'').localeCompare(String(b.name||''),'zh-CN')
    ||String(a.personId||'').localeCompare(String(b.personId||''));
}
