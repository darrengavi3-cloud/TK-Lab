(function(global){
  'use strict';

  const primary={
    sourceTitle:'《晋书》卷二十四·职官志',sourceLevel:'一手史料',
    sourceLocator:'“诸公及开府位从公者”及“加兵者”条',
    sourceUrl:'https://zh.wikisource.org/wiki/晉書/卷024',confidence:'确定'
  };
  const attachment={
    sourceTitle:'《三国职官表（点校整理本）》',sourceLevel:'文档考据',
    sourceLocator:'相国府属官明细、相国府诸曹掾属、大将军与三公府属官',confidence:'存疑',
    evidenceNote:'附件仅作候选索引；未见正史明确制度条文的数字保持待考。'
  };
  let serial=0;
  function policy(ownerOfficeName,officeName,authorizedCount,displayCapacity,sourceText,options={}){
    serial+=1;
    const evidence=options.evidence||attachment;
    return {
      id:options.id||`seat:v43:${serial}`,polity:options.polity||'',ownerOfficeName,officeName,
      validFrom:Number.isFinite(options.validFrom)?options.validFrom:null,
      validTo:Number.isFinite(options.validTo)?options.validTo:null,
      authorizedCount:Number.isFinite(authorizedCount)?authorizedCount:null,
      displayCapacity:Number.isFinite(displayCapacity)?displayCapacity:(Number.isFinite(authorizedCount)?authorizedCount:1),
      sourceText,countStatus:options.countStatus||(Number.isFinite(authorizedCount)&&evidence===primary?'确定':'待考'),
      rule:options.rule||`${ownerOfficeName}·${officeName}员额`,evidence,
      note:options.note||''
    };
  }

  const rows=[
    {id:'seat:han:shi-zhong:end-han',officeId:'office:han:shi-zhong',validFrom:184,validTo:220,rule:'末汉朝廷侍中席位',authorizedCount:6,displayCapacity:6,sourceId:'source:后汉书百官志',countStatus:'推定',note:'展示六席，不倒推为东汉全期固定员额。'},
    {id:'seat:shu:shi-zhong:period',officeId:'office:shu:shi-zhong',validFrom:221,validTo:263,rule:'季汉朝堂侍中展示席位',authorizedCount:null,displayCapacity:6,sourceId:'source:三国志蜀书',countStatus:'待考',note:'具体时期员额未统一见于单一条文，展示容量与史实员额分开。'},
    {id:'seat:jin:shi-zhong:taishi',officeId:'office:jin:shi-zhong',validFrom:266,validTo:316,rule:'西晋侍中定员',authorizedCount:4,displayCapacity:4,sourceId:'source:晋书职官志',countStatus:'确定',note:'晋制侍中四人。'},

    policy('晋诸公及开府位从公','长史',1,1,'置长史一人，秩一千石',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    policy('晋诸公及开府位从公','西阁祭酒',1,1,'西东阁祭酒各一人',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    policy('晋诸公及开府位从公','东阁祭酒',1,1,'西东阁祭酒各一人',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    policy('晋诸公及开府位从公','西曹掾',1,1,'西东曹掾各一人',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    policy('晋诸公及开府位从公','东曹掾',1,1,'西东曹掾各一人',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    policy('晋开府加兵公','司马',1,1,'增置司马一人，秩千石',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    policy('晋开府加兵公','从事中郎',2,2,'从事中郎二人，秩比千石',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    policy('晋开府加兵公','主簿',1,1,'主簿一人',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    policy('晋开府加兵公','记室督',1,1,'记室督一人',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    policy('晋开府加兵公','舍人',4,4,'舍人四人',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    ...['兵曹','铠曹','士曹','营军都督','刺奸都督','帐下都督','外都督','令史'].map(name=>policy('晋开府加兵公',name,1,1,`${name}一人`,{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'})),
    policy('司徒','左长史',1,1,'司徒加置左右长史各一人',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    policy('司徒','右长史',1,1,'司徒加置左右长史各一人',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),
    policy('司空','导桥掾',1,1,'司空加置导桥掾一人',{polity:'晋',validFrom:266,validTo:316,evidence:primary,countStatus:'确定'}),

    policy('相国／丞相府','军师祭酒',null,4,'无员',{countStatus:'待考',note:'“无员”按无固定法定员额处理；四席仅为展示容量。'}),
    policy('相国／丞相府','中军师',2,2,'魏二人／蜀一人',{polity:'魏',countStatus:'待考'}),
    policy('相国／丞相府','中军师',1,1,'魏二人／蜀一人',{polity:'汉',countStatus:'待考'}),
    policy('相国／丞相府','前军师',1,1,'一人',{countStatus:'待考'}),
    policy('相国／丞相府','后军师',1,1,'一人',{countStatus:'待考'}),
    policy('相国／丞相府','长史',2,2,'魏左右二人／蜀吴各一人',{polity:'魏',countStatus:'待考'}),
    policy('相国／丞相府','长史',1,1,'魏左右二人／蜀吴各一人',{polity:'汉',countStatus:'待考'}),
    policy('相国／丞相府','长史',1,1,'魏左右二人／蜀吴各一人',{polity:'吴',countStatus:'待考'}),
    policy('相国／丞相府','司马',2,2,'魏左右／蜀一人',{polity:'魏',countStatus:'待考'}),
    policy('相国／丞相府','司马',1,1,'魏左右／蜀一人',{polity:'汉',countStatus:'待考'}),
    policy('相国／丞相府','从事中郎',2,2,'魏二人／蜀一人',{polity:'魏',countStatus:'待考'}),
    policy('相国／丞相府','从事中郎',1,1,'魏二人／蜀一人',{polity:'汉',countStatus:'待考'}),
    policy('相国／丞相府','主簿',4,4,'四人',{countStatus:'待考'}),
    policy('相国／丞相府','参军',null,22,'二十二员（无定额）',{countStatus:'存疑',note:'原文同时出现“二十二员”与“无定额”，不强行选定其一；法定员额留空，展示二十二席。'}),
    policy('相国／丞相府','参战',11,11,'十一人',{polity:'魏',validFrom:264,validTo:265,countStatus:'待考'}),
    policy('相国／丞相府','记室',null,3,'无员',{countStatus:'待考'}),
    policy('相国／丞相府','门下督',null,2,'无员',{countStatus:'待考'}),
    policy('相国／丞相府','舍人',19,19,'十九人',{polity:'魏',validFrom:264,validTo:265,countStatus:'待考'}),

    policy('大将军府','军师',1,1,'一人',{polity:'魏',countStatus:'待考'}),
    policy('大将军府','长史',null,2,'初一人，正元初增左右',{polity:'魏',countStatus:'待考'}),
    policy('大将军府','司马',2,2,'景元四年由一增二',{polity:'魏',validFrom:262,validTo:265,countStatus:'待考'}),
    policy('大将军府','从事中郎',null,2,'景元四年增额',{polity:'魏',validFrom:262,validTo:265,countStatus:'待考'}),
    policy('大将军府','主簿',1,1,'一人',{polity:'魏',countStatus:'待考'}),
    policy('大将军府','参军',6,6,'六人（蜀无定额）',{polity:'魏',countStatus:'待考'}),
    policy('大将军府','参军',null,6,'六人（蜀无定额）',{polity:'汉',countStatus:'待考',note:'汉无定额；六席仅作展示容量。'}),
    policy('大将军府','舍人',4,4,'初四人',{polity:'魏',validFrom:220,validTo:261,countStatus:'待考'}),
    policy('大将军府','舍人',14,14,'景元四年由四增十四',{polity:'魏',validFrom:262,validTo:265,countStatus:'待考'})
  ];

  global.SGZ_SEAT_POLICIES=Object.freeze(rows);
})(window);
