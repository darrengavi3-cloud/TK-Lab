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
    {personId:'person:wu:sun-ben',name:'孙贲',aliases:['孫賁','孙賁'],polities:['吴'],searchKeys:['sunben']},
    {personId:'person:jin:sima-yan',name:'司马炎',aliases:['司馬炎','晋武帝'],polities:['魏','晋'],searchKeys:['simayan']},
    {personId:'person:shu:ma-zhong',name:'马忠',aliases:['馬忠'],polities:['汉','蜀汉','季汉'],homonymDiscriminator:'蜀汉将领',searchKeys:['mazhong']},
    {personId:'person:wu:ma-zhong',name:'马忠',aliases:['馬忠'],polities:['吴'],homonymDiscriminator:'孙吴将领',searchKeys:['mazhong']},
    {personId:'person:wei:zhong-yao',name:'钟繇',aliases:['鍾繇','元常'],polities:['魏','汉'],searchKeys:['zhongyao']},
    {personId:'person:wei:sima-yi',name:'司马懿',aliases:['司馬懿','仲达','仲達'],polities:['魏','晋'],searchKeys:['simayi']},
    {personId:'person:shu:jiang-wei',name:'姜维',aliases:['姜維','伯约','伯約'],polities:['汉','蜀汉','季汉'],searchKeys:['jiangwei']},
    {personId:'person:wei:liu-fang',name:'刘放',aliases:['劉放'],searchKeys:['liufang']},
    {personId:'person:han:liu-biao',name:'刘表',aliases:['劉表'],polities:['汉'],searchKeys:['liubiao']},
    {personId:'person:wei:cao-shuang',name:'曹爽',aliases:['昭伯'],searchKeys:['caoshuang']},
    {personId:'person:wei:cao-man',name:'曹曼',aliases:[],normalizationAliases:['公女曼'],polities:['魏'],searchKeys:['caoman']},
    {personId:'person:han:cao-ding',name:'曹鼎',aliases:[],normalizationAliases:['伯父鼎'],polities:['汉'],searchKeys:['caoding']},
    {personId:'person:wu:shi-kuang',name:'士匡',aliases:[],normalizationAliases:['匡师友'],polities:['吴'],searchKeys:['shikuang']},
    {personId:'person:han:zhang-lu',name:'张鲁',aliases:['張魯'],normalizationAliases:['鲁镇南'],polities:['汉'],searchKeys:['zhanglu']},
    {personId:'person:han:dong-min',name:'董旻',aliases:[],normalizationAliases:['卓弟旻'],polities:['汉'],searchKeys:['dongmin']},
    {personId:'person:wei:wei-kang',name:'韦康',aliases:['韋康'],polities:['魏'],searchKeys:['weikang']},
    {personId:'person:shu:zhuge-liang',name:'诸葛亮',aliases:['諸葛亮','孔明'],polities:['汉','蜀汉','季汉'],searchKeys:['zhugeliang']},
    {personId:'person:shu:fei-yi',name:'费祎',aliases:['費禕','費祎','费禕','文伟','文偉'],polities:['汉','蜀汉','季汉'],searchKeys:['feiyi']},
    {personId:'person:shu:jiang-wan',name:'蒋琬',aliases:['蔣琬','公琰'],polities:['汉','蜀汉','季汉'],searchKeys:['jiangwan']},
    {personId:'person:shu:dong-yun',name:'董允',aliases:['董允','休昭'],polities:['汉','蜀汉','季汉'],searchKeys:['dongyun']},
    {personId:'person:shu:lai-min',name:'来敏',aliases:['來敏','敬达','敬達'],polities:['汉','蜀汉','季汉'],searchKeys:['laimin']},
    {personId:'person:shu:liu-yin',name:'柳隐',aliases:['柳隱','休然'],polities:['汉','蜀汉','季汉'],searchKeys:['liuyin']},
    {personId:'person:han:liu-zhang',name:'刘璋',aliases:['劉璋','季玉'],polities:['汉'],searchKeys:['liuzhang']},
    {personId:'person:wu:bu-zhi',name:'步骘',aliases:['步騭'],polities:['吴'],legacyPersonIds:['person:source:20b3d8e91af1'],searchKeys:['buzhi']},
    {personId:'person:wei:cao-pi',name:'曹丕',aliases:[],polities:['汉','魏'],searchKeys:['caopi']},
    {personId:'person:wei:cao-ren',name:'曹仁',aliases:['子孝'],polities:['汉','魏'],legacyPersonIds:['person:source:121d406fe7d1'],searchKeys:['caoren']},
    {personId:'person:wei:cao-zhen',name:'曹真',aliases:['子丹'],polities:['魏'],legacyPersonIds:['person:source:603b840477e3'],searchKeys:['caozhen']},
    {personId:'person:shu:fa-zheng',name:'法正',aliases:['孝直'],polities:['汉','蜀汉','季汉'],legacyPersonIds:['person:source:12d700a23b77'],searchKeys:['fazheng']},
    {personId:'person:wei:hua-xin',name:'华歆',aliases:['華歆'],polities:['汉','魏'],legacyPersonIds:['person:source:09f7e29a49fb'],searchKeys:['huaxin']},
    {personId:'person:wei:jia-xu',name:'贾诩',aliases:['賈詡'],polities:['汉','魏'],legacyPersonIds:['person:source:397edec8b12a'],searchKeys:['jiaxu']},
    {personId:'person:jin:li-yin',name:'李胤',aliases:['宣伯'],polities:['魏','晋'],searchKeys:['liyin']},
    {personId:'person:shu:liu-ba',name:'刘巴',aliases:['劉巴'],polities:['汉','蜀汉','季汉'],searchKeys:['liuba']},
    {personId:'person:jin:lu-qin',name:'卢钦',aliases:['盧欽'],polities:['魏','晋'],searchKeys:['luqin']},
    {personId:'person:jin:lu-zhi',name:'鲁芝',aliases:['魯芝'],polities:['魏','晋'],searchKeys:['luzhi']},
    {personId:'person:wu:lu-xun',name:'陆逊',aliases:['陸遜'],polities:['吴'],legacyPersonIds:['person:source:f88e20a568d0'],searchKeys:['luxun']},
    {personId:'person:shu:qiao-zhou',name:'谯周',aliases:['譙周'],polities:['汉','蜀汉','季汉'],searchKeys:['qiaozhou']},
    {personId:'person:jin:wei-guan',name:'卫瓘',aliases:['衛瓘'],polities:['魏','晋'],searchKeys:['weiguan']},
    {personId:'person:wei:wei-zhen',name:'卫臻',aliases:['衛臻','公振'],polities:['汉','魏'],legacyPersonIds:['person:source:1d12af903d2f'],searchKeys:['weizhen']},
    {personId:'person:shu:wei-yan',name:'魏延',aliases:[],polities:['汉','蜀汉','季汉'],legacyPersonIds:['person:source:9001e293139f'],searchKeys:['weiyan']},
    {personId:'person:wei:zou-qi',name:'邹岐',aliases:['鄒岐'],polities:['魏'],legacyPersonIds:['person:source:0ac0345962bc'],searchKeys:['zouqi']},
    {personId:'person:shu:xu-jing',name:'许靖',aliases:['許靖'],polities:['汉','蜀汉','季汉'],legacyPersonIds:['person:source:a106eb6551c1'],searchKeys:['xujing']},
    {personId:'person:shu:li-fu',name:'李福',aliases:[],polities:['汉','蜀汉','季汉'],searchKeys:['lifu']},
    {personId:'person:wu:lu-su',name:'鲁肃',aliases:['魯肅'],polities:['吴'],legacyPersonIds:['person:source:8dc0bfe19c5d'],searchKeys:['lusu']},
    {personId:'person:wu:quan-cong',name:'全琮',aliases:['子璜'],polities:['吴'],legacyPersonIds:['person:source:8f0533393cfd'],searchKeys:['quancong']},
    {personId:'person:wu:dai-liang',name:'戴良',aliases:[],polities:['吴'],legacyPersonIds:['person:source:b13a3444a2dd'],searchKeys:['dailiang']},
    {personId:'person:wei:xu-miao',name:'徐邈',aliases:['景山'],polities:['魏'],legacyPersonIds:['person:source:1341c89829db'],searchKeys:['xumiao']},
    {personId:'person:shu:li-feng',name:'李丰',aliases:['李豐'],polities:['汉','蜀汉','季汉'],homonymDiscriminator:'季汉李严之子',searchKeys:['lifeng']},
    {personId:'person:wei:li-feng',name:'李丰',aliases:['李豐'],polities:['魏'],legacyPersonIds:['person:source:c2c2cfbd720b'],homonymDiscriminator:'曹魏中书令',searchKeys:['lifeng']},
    {personId:'person:wu:zhuge-ke',name:'诸葛恪',aliases:['諸葛恪'],polities:['吴'],legacyPersonIds:['person:source:c10071bc56e7'],searchKeys:['zhugeke']},
    {personId:'person:wei:cui-lin',name:'崔林',aliases:['德儒'],polities:['魏'],legacyPersonIds:['person:source:e91b523e72ad'],searchKeys:['cuilin']},
    {personId:'person:shu:li-zhuan',name:'李譔',aliases:[],polities:['汉','蜀汉','季汉'],searchKeys:['lizhuan']},
    {personId:'person:wu:sun-he',name:'孙河',aliases:['孫河'],polities:['吴'],legacyPersonIds:['person:source:35a5246521f7'],searchKeys:['sunhe']},
    {personId:'person:shu:chen-zhi',name:'陈祗',aliases:['陳祗'],polities:['汉','蜀汉','季汉'],legacyPersonIds:['person:source:cc650c22182b'],searchKeys:['chenzhi']},
    {personId:'person:han:tao-qian',name:'陶谦',aliases:['陶謙'],polities:['汉'],legacyPersonIds:['person:source:6570aa164b2e'],searchKeys:['taoqian']},
    {personId:'person:wei:sun-li',name:'孙礼',aliases:['孫禮'],polities:['魏'],legacyPersonIds:['person:source:23b3d654e08b'],searchKeys:['sunli']},
    {personId:'person:wei:xiahou-xuan',name:'夏侯玄',aliases:[],polities:['魏'],legacyPersonIds:['person:source:ab63a1750cf5'],searchKeys:['xiahouxuan']},
    {personId:'person:wu:teng-yin',name:'滕胤',aliases:['承嗣'],polities:['吴'],legacyPersonIds:['person:source:e8e51760ad21'],searchKeys:['tengyin']},
    {personId:'person:jin:shi-bao',name:'石苞',aliases:['仲容'],polities:['魏','晋'],searchKeys:['shibao']},
    {personId:'person:jin:sima-wang',name:'司马望',aliases:['司馬望'],polities:['魏','晋'],legacyPersonIds:['person:source:2831848a9591'],searchKeys:['simawang']},
    {personId:'person:jin:chen-qian',name:'陈骞',aliases:['陳騫'],polities:['魏','晋'],searchKeys:['chenqian']},
    {personId:'person:shu:dong-jue',name:'董厥',aliases:[],polities:['汉','蜀汉','季汉'],searchKeys:['dongjue']},
    {personId:'person:jin:wang-xiang',name:'王祥',aliases:[],polities:['魏','晋'],searchKeys:['wangxiang']},
    {personId:'person:jin:he-zeng',name:'何曾',aliases:['颖考','穎考'],polities:['魏','晋'],searchKeys:['hezeng']},
    {personId:'person:jin:hu-lie',name:'胡烈',aliases:[],polities:['魏','晋'],searchKeys:['hulie']},
    {personId:'person:jin:li-xi',name:'李憙',aliases:['李熹','季和'],polities:['魏','晋'],searchKeys:['lixi']},
    {personId:'person:jin:yuan-shao',name:'袁邵',aliases:[],polities:['魏','晋'],searchKeys:['yuanshao']},
    {personId:'person:jin:wang-chen',name:'王沈',aliases:[],polities:['魏','晋'],searchKeys:['wangchen']},
    {personId:'person:jin:pei-xiu',name:'裴秀',aliases:['季彦','季彥'],polities:['魏','晋'],searchKeys:['peixiu']},
    {personId:'person:jin:sima-fu',name:'司马孚',aliases:['司馬孚'],polities:['魏','晋'],legacyPersonIds:['person:source:73ba4a010168'],searchKeys:['simafu']},
    {personId:'person:jin:xun-xu',name:'荀勖',aliases:[],polities:['魏','晋'],searchKeys:['xunxu']},
    {personId:'person:jin:xun-yi',name:'荀顗',aliases:['景倩'],polities:['魏','晋'],legacyPersonIds:['person:source:838b8308032f'],searchKeys:['xunyi']},
    {personId:'person:jin:yang-xiu',name:'羊琇',aliases:[],polities:['晋'],searchKeys:['yangxiu']},
    {personId:'person:jin:zheng-chong',name:'郑冲',aliases:['鄭沖'],polities:['魏','晋'],legacyPersonIds:['person:source:d04dd2bef1e2'],searchKeys:['zhengchong']},
    {personId:'person:jin:yang-hu',name:'羊祜',aliases:['叔子'],polities:['魏','晋'],searchKeys:['yanghu']},
    {personId:'person:jin:sima-zhou',name:'司马伷',aliases:['司馬伷'],polities:['魏','晋'],searchKeys:['simazhou']},
    {personId:'person:jin:sima-jun',name:'司马骏',aliases:['司馬駿'],polities:['魏','晋'],searchKeys:['simajun']},
    {personId:'person:wu:lu-kang',name:'陆抗',aliases:['陸抗'],polities:['吴'],legacyPersonIds:['person:source:745dc71ccc2c'],searchKeys:['lukang']},
    {personId:'person:wu:he-zhi',name:'何植',aliases:[],polities:['吴'],legacyPersonIds:['person:source:64713c14be03'],searchKeys:['hezhi']},
    {personId:'person:wu:zhang-ti',name:'张悌',aliases:['張悌'],polities:['吴'],legacyPersonIds:['person:source:4fe4b9999e27'],searchKeys:['zhangti']},
    {personId:'person:wu:puyang-xing',name:'濮阳兴',aliases:['濮陽興'],polities:['吴'],legacyPersonIds:['person:source:a3e7a34102f6'],searchKeys:['puyangxing']},
    {personId:'person:wu:sun-shao',name:'孙邵',aliases:['孫邵'],polities:['吴'],legacyPersonIds:['person:source:d19aff65e0f7'],searchKeys:['sunshao']},
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
  identities.forEach(item=>Array.from(new Set([item.name].concat(item.aliases||[],item.normalizationAliases||[]))).forEach(alias=>{
    const key=clean(alias);
    if(!aliases.has(key)) aliases.set(key,[]);
    aliases.get(key).push(item);
  }));

  function resolve(name,context={}){
    const raw=clean(name);
    const candidates=aliases.get(raw)||[];
    if(candidates.length===1) return candidates[0];
    if(candidates.length>1){
      const contextPersonId=String(context.personId||'').trim();
      if(contextPersonId){
        const idMatch=candidates.find(item=>item.personId===contextPersonId||(item.legacyPersonIds||[]).includes(contextPersonId));
        if(idMatch) return idMatch;
      }
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
  const legacyPersonIdMap=Object.freeze({
    'person:source:51390b3cd295':'person:shu:dong-yun'
  });
  function canonicalPersonId(personId){
    const raw=String(personId||'').trim();
    return legacyPersonIdMap[raw]||identities.find(item=>(item.legacyPersonIds||[]).includes(raw))?.personId||raw;
  }

  global.SGZ_PERSON_IDENTITIES=Object.freeze({
    version:5,identities:Object.freeze(identities),resolve,
    legacyPersonIdMap,canonicalPersonId,
    candidateCount:(name)=>aliases.get(clean(name))?.length||0,
    personIdFor:(name,context)=>resolve(name,context)?.personId||fallbackId(name,context),
    searchKeysFor:(name)=>resolve(name)?.searchKeys||[],
    canonicalNameFor:(name)=>resolve(name)?.canonicalName||'',
    policy:'稳定 personId 为唯一键；显式身份优先于旧来源 ID，旧 ID 只作兼容映射；跨来源、跨政权的同一人物归并到一条身份；历史别名可供检索，OCR／句法误读只放 normalizationAliases 内部纠错，不作为公开别名；同名异人按显式身份拆分。'
  });
})(window);
