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
    {personId:'person:wei:cao-cao',name:'曹操',aliases:['魏武帝','太祖'],polities:['汉','魏'],searchKeys:['caocao']},
    {personId:'person:shu:liu-bei',name:'刘备',aliases:['劉備','汉昭烈帝','先主'],polities:['汉','蜀汉','季汉'],searchKeys:['liubei']},
    {personId:'person:shu:liu-shan',name:'刘禅',aliases:['劉禪','后主'],polities:['汉','蜀汉','季汉'],searchKeys:['liushan']},
    {personId:'person:wu:sun-quan',name:'孙权',aliases:['孫權','吴大帝'],polities:['吴'],searchKeys:['sunquan']},
    {personId:'person:jin:sima-yan',name:'司马炎',aliases:['司馬炎','晋武帝'],polities:['魏','晋'],searchKeys:['simayan']},
    {personId:'person:shu:ma-zhong',name:'马忠',aliases:['馬忠'],polities:['汉','蜀汉','季汉'],homonymDiscriminator:'蜀汉将领',searchKeys:['mazhong']},
    {personId:'person:wu:ma-zhong',name:'马忠',aliases:['馬忠'],polities:['吴'],homonymDiscriminator:'孙吴将领',searchKeys:['mazhong']},
    {personId:'person:wei:zhong-yao',name:'钟繇',aliases:['鍾繇','元常'],polities:['魏','汉'],searchKeys:['zhongyao']},
    {personId:'person:wei:liu-fang',name:'刘放',aliases:['劉放'],searchKeys:['liufang']},
    {personId:'person:han:liu-biao',name:'刘表',aliases:['劉表'],polities:['汉'],searchKeys:['liubiao']},
    {personId:'person:wei:cao-shuang',name:'曹爽',aliases:['昭伯'],searchKeys:['caoshuang']},
    {personId:'person:shu:zhuge-liang',name:'诸葛亮',aliases:['諸葛亮','孔明'],polities:['汉','蜀汉','季汉'],searchKeys:['zhugeliang']},
    {personId:'person:han:liu-zhang',name:'刘璋',aliases:['劉璋','季玉'],polities:['汉'],searchKeys:['liuzhang']},
    {personId:'person:wu:sun-hao',name:'孙皓',aliases:['孫皓','元宗'],polities:['吴'],searchKeys:['sunhao']},
    {personId:'person:jin:jia-chong',name:'贾充',aliases:['賈充','公闾'],polities:['魏','晋'],searchKeys:['jiachong']},
    {personId:'person:jin:shi-jian',name:'石鉴',aliases:['石鑒','林伯'],searchKeys:['shijian']},
    {personId:'person:jin:yang-jun',name:'杨骏',aliases:['楊駿','文长'],searchKeys:['yangjun']},
    {personId:'person:jin:pei-wei',name:'裴𫖮',aliases:['裴頠','逸民'],searchKeys:['peiwei']},
    {personId:'person:jin:liu-shi',name:'刘寔',aliases:['劉寔','子真'],searchKeys:['liushi']},
    {personId:'person:jin:xi-jian',name:'郗鉴',aliases:['郗鑒','道徽'],searchKeys:['xijian']},
    {personId:'person:jin:zhang-tianxi',name:'张天锡',aliases:['張天錫','公纯嘏'],searchKeys:['zhangtianxi']},
    {personId:'person:jin:xi-yin',name:'郗愔',aliases:['郗愔','方回'],searchKeys:['xiyin']},
    {personId:'person:jin:huan-wen',name:'桓温',aliases:['桓溫','元子'],searchKeys:['huanwen']},
    {personId:'person:jin:huan-qian',name:'桓谦',aliases:['桓謙','敬祖'],searchKeys:['huanqian']},
    {personId:'person:jin:liu-yu',name:'刘裕',aliases:['劉裕','寄奴'],searchKeys:['liuyu']},
    {personId:'person:jin:liu-dan',name:'刘耽',aliases:['劉耽'],searchKeys:['liudan']},
    {personId:'person:jin:luo-shang',name:'罗尚',aliases:['羅尚','敬之'],searchKeys:['luoshang']},
    {personId:'person:jin:sima-yao',name:'昌明',aliases:['司馬曜','司马曜'],canonicalName:'司马曜（字昌明）',searchKeys:['simayao','changming']},
    {personId:'person:tribal:murong-ke',name:'慕容恪',aliases:['玄恭'],searchKeys:['murongke']}
  ];
  const aliases=new Map();
  identities.forEach(item=>Array.from(new Set([item.name].concat(item.aliases||[]))).forEach(alias=>{
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
    version:2,identities:Object.freeze(identities),resolve,
    candidateCount:(name)=>aliases.get(clean(name))?.length||0,
    personIdFor:(name,context)=>resolve(name,context)?.personId||fallbackId(name,context),
    searchKeysFor:(name)=>resolve(name)?.searchKeys||[],
    canonicalNameFor:(name)=>resolve(name)?.canonicalName||'',
    policy:'稳定 personId 为唯一键；姓名和别名只用于显式解析，跨卷同人按显式身份合并，同名异人按政权或消歧标记拆分。'
  });
})(window);
