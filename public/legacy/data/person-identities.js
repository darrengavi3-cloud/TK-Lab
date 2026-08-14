(function(global){
  'use strict';

  function clean(value){ return String(value==null?'':value).replace(/\s+/g,'').trim(); }
  function hashId(value){
    let hash=2166136261;
    const input=String(value||'');
    for(let index=0;index<input.length;index+=1){ hash^=input.charCodeAt(index); hash=Math.imul(hash,16777619); }
    return (hash>>>0).toString(36).padStart(7,'0');
  }
  function polityCode(value){
    const raw=clean(value);
    if(['汉','汉廷','东汉','蜀汉','季汉','shu','han'].includes(raw)) return raw==='东汉'||raw==='汉廷'||raw==='han'?'han':(raw==='shu'?'shu':'shu');
    if(['魏','曹魏','wei'].includes(raw)) return 'wei';
    if(['吴','孙吴','wu'].includes(raw)) return 'wu';
    if(['晋','西晋','东晋','jin'].includes(raw)) return 'jin';
    return raw.toLowerCase()||'unresolved';
  }
  const identities=[
    {personId:'person:wei:cao-cao',name:'曹操',aliases:['魏武帝','太祖'],polities:['汉','魏']},
    {personId:'person:shu:liu-bei',name:'刘备',aliases:['劉備','汉昭烈帝','先主'],polities:['汉','蜀汉','季汉']},
    {personId:'person:shu:liu-shan',name:'刘禅',aliases:['劉禪','后主'],polities:['汉','蜀汉','季汉']},
    {personId:'person:wu:sun-quan',name:'孙权',aliases:['孫權','吴大帝'],polities:['吴']},
    {personId:'person:jin:sima-yan',name:'司马炎',aliases:['司馬炎','晋武帝'],polities:['魏','晋']},
    {personId:'person:shu:ma-zhong',name:'马忠',aliases:['馬忠'],polities:['汉','蜀汉','季汉'],homonymDiscriminator:'蜀汉将领'},
    {personId:'person:wu:ma-zhong',name:'马忠',aliases:['馬忠'],polities:['吴'],homonymDiscriminator:'孙吴将领'}
  ];
  const aliases=new Map();
  identities.forEach(item=>[item.name].concat(item.aliases||[]).forEach(alias=>{
    const key=clean(alias);
    if(!aliases.has(key)) aliases.set(key,[]);
    aliases.get(key).push(item);
  }));

  function resolve(name,context={}){
    const raw=clean(name);
    const candidates=aliases.get(raw)||[];
    if(candidates.length===1) return candidates[0];
    if(candidates.length>1){
      const polity=polityCode(context.polity||context.factionKey);
      const match=candidates.find(item=>(item.polities||[]).some(value=>polityCode(value)===polity));
      if(match) return match;
      const discriminator=clean(context.homonymDiscriminator);
      if(discriminator){ const exact=candidates.find(item=>item.homonymDiscriminator===discriminator); if(exact)return exact; }
      return null;
    }
    return null;
  }
  function fallbackId(name,context={}){
    const polity=polityCode(context.polity||context.factionKey);
    const discriminator=clean(context.homonymDiscriminator||context.sourcePersonKey||'default');
    return `person:${polity}:${hashId([clean(name),discriminator].join('|'))}`;
  }

  global.SGZ_PERSON_IDENTITIES=Object.freeze({
    version:1,identities:Object.freeze(identities),resolve,
    personIdFor:(name,context)=>resolve(name,context)?.personId||fallbackId(name,context),
    policy:'稳定 personId 为唯一键；姓名和别名只用于显式解析，同名异人按政权或消歧标记拆分。'
  });
})(window);
