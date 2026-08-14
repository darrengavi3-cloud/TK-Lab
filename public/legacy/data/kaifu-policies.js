(function(global){
  'use strict';

  const sources = Object.freeze({
    jinshu24:{
      id:'source:jinshu:024:zhiguan',title:'《晋书》卷二十四·职官志',sourceLevel:'一手史料',
      sourceLocator:'卷二十四“开府仪同三司”至“诸公及开府位从公”条',
      sourceUrl:'https://zh.wikisource.org/wiki/晉書/卷024',confidence:'确定'
    },
    sgz35:{
      id:'source:sgz:035:zhugeliang',title:'《三国志》卷三十五·诸葛亮传',sourceLevel:'一手史料',
      sourceLocator:'建兴元年“封亮武乡侯，开府治事”',sourceUrl:'https://zh.wikisource.org/wiki/三國志/卷35',confidence:'确定'
    },
    sgz44:{
      id:'source:sgz:044:jiangwan',title:'《三国志》卷四十四·蒋琬传',sourceLevel:'一手史料',
      sourceLocator:'“丞相亮开府，辟琬为东曹掾”',sourceUrl:'https://zh.wikisource.org/wiki/三國志/卷44',confidence:'确定'
    },
    sgz04Pei:{
      id:'source:sgz:004:peizhu:sunyi',title:'《三国志》卷四·裴松之注引文',sourceLevel:'一手史料',
      sourceLocator:'裴注所录孙壹“开府辟召仪同三司”诏文',sourceUrl:'https://zh.wikisource.org/wiki/三國志/卷04',confidence:'推定'
    },
    attachmentOffice:{
      id:'source:index:xlsx:office-v43',title:'《三国职官表（点校整理本）》',sourceLevel:'文档考据',
      sourceLocator:'官职总表及三张府属官表',confidence:'存疑',
      note:'仅作定位与候选索引；具体制度、员额及任官仍以正史逐条复核。'
    },
    attachmentJin:{
      id:'source:index:docx:jin-office-v43',title:'《晋人官职》',sourceLevel:'文档考据',
      sourceLocator:'晋人任官资料整理',confidence:'存疑',
      note:'仅作定位索引；不确定任期保留原始文字，不据此强定起讫年。'
    }
  });

  const evidence = source => ({
    sourceTitle:source.title,sourceLevel:source.sourceLevel,sourceLocator:source.sourceLocator,
    sourceUrl:source.sourceUrl||'',confidence:source.confidence,evidenceNote:source.note||''
  });
  const jinCivil = ['太宰','太傅','太保','司徒','司空'];
  const jinMilitary = ['大司马','大将军','太尉','骠骑将军','车骑将军','卫将军','伏波将军','抚军将军','都护将军','镇军将军','中军将军','征东将军','征西将军','征南将军','征北将军','镇东将军','镇西将军','镇南将军','镇北将军','龙骧将军','典军将军','上军将军','辅国将军'];

  const policies = [
    ...jinCivil.map((officeName,index)=>({
      id:`kaifu:jin:civil:${index+1}`,polity:'晋',officeName,qualificationType:'法定开府',validFrom:266,validTo:316,
      evidence:evidence(sources.jinshu24),researchStatus:'确定',
      note:'《职官志》列为文官公；府署员属依“诸公及开府位从公者”条。'
    })),
    ...jinMilitary.map((officeName,index)=>({
      id:`kaifu:jin:military:${index+1}`,polity:'晋',officeName,qualificationType:'加号开府',additionalTitle:'开府仪同三司',validFrom:266,validTo:316,
      evidence:evidence(sources.jinshu24),researchStatus:'确定',
      note:'官名本身不等于人人开府；须有开府或位从公依据，未见加号者不得自动生成府属。'
    })),
    {
      id:'kaifu:shu:zhugeliang:223',polity:'汉',officeName:'丞相',personName:'诸葛亮',qualificationType:'特诏开府',
      validFrom:223,validTo:234,sourceTenureText:'建兴元年（223）开府治事，至建兴十二年（234）卒',
      evidence:evidence(sources.sgz35),researchStatus:'确定',note:'《蒋琬传》又见开府辟东曹掾，可与具体府属互证。'
    },
    {
      id:'kaifu:wei:huangquan',polity:'魏',officeName:'车骑将军',personName:'黄权',qualificationType:'加号开府',additionalTitle:'开府仪同三司',
      validFrom:223,validTo:240,sourceTenureText:'魏黄权以车骑将军开府仪同三司；具体起年随任官材料复核',
      evidence:evidence(sources.jinshu24),researchStatus:'推定',note:'《晋书·职官志》用于制度沿革；具体任年另须与本传合校。'
    },
    {
      id:'kaifu:wei:sunyi:peizhu',polity:'魏',officeName:'车骑将军',personName:'孙壹',qualificationType:'特诏开府',additionalTitle:'开府辟召仪同三司',
      validFrom:258,validTo:265,sourceTenureText:'甘露年间归魏后受诏；确年随本纪、本传复核',
      evidence:evidence(sources.sgz04Pei),researchStatus:'推定',note:'此条出自裴注引文，证据层不得与《三国志》正文混同。'
    },
    {
      id:'kaifu:wei:xiangguo:sima-zhao',polity:'魏',officeName:'相国',personName:'司马昭',qualificationType:'事实见府属',
      validFrom:264,validTo:265,sourceTenureText:'咸熙元年—咸熙二年',evidence:evidence(sources.attachmentOffice),researchStatus:'存疑',
      note:'附件所列相国府扩充员额作为候选索引；各曹与员额未获正史逐条印证者仍标待考。'
    },
    {
      id:'kaifu:generic:unverified',officeName:'未匹配开府官职',qualificationType:'待考',evidence:evidence(sources.attachmentOffice),researchStatus:'存疑',
      note:'仅用于兼容旧数据中的 kaifu=true；没有制度、加号、特诏或具体府属证据时不得显示为确定开府。'
    }
  ];

  global.SGZ_KAIFU_SOURCES=sources;
  global.SGZ_KAIFU_POLICIES=Object.freeze(policies);
  global.SGZ_V43_TENURE_CANDIDATES=Object.freeze([
    {personName:'袁邵',sourceTenureText:'264—266？',startYear:264,endYear:null,researchStatus:'存疑',sourceId:sources.attachmentJin.id},
    {personName:'董荣',sourceTenureText:'267—269？',startYear:267,endYear:null,researchStatus:'存疑',sourceId:sources.attachmentJin.id},
    {personName:'皇甫晏',sourceTenureText:'269/270—272',startYear:null,endYear:272,researchStatus:'存疑',sourceId:sources.attachmentJin.id}
  ]);
})(window);
