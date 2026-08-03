/* 十一期行政建置快照：把 262 年几何底稿按各期州郡沿革重新归并。 */
window.ADMINISTRATIVE_SNAPSHOTS = {
  huangjin:{year:184,provinceSource:'han184',commanderySource:'han184',note:'东汉十三州部；无常设雍州。'},
  shaodi:{year:189,provinceSource:'han184',commanderySource:'han189',note:'少帝即位期仍为东汉十三州部；南安郡已由汉阳郡分出（中平五年），中央政局变化不等于新设州制。'},
  dongzhuo:{year:190,provinceSource:'han184',commanderySource:'han190',note:'仍为东汉十三州部；关中属司隶，陇右、河西属凉州。'},
  xingping:{year:194,provinceSource:'han194',commanderySource:'han194',note:'兴平元年分凉州河西四郡置雍州；吕布、曹操争兖州，刘备接领徐州，孙策尚未渡江。'},
  jianbing:{year:199,provinceSource:'han199',commanderySource:'han199',note:'袁绍灭公孙瓒统一河北；曹操据兖豫徐，刘表荆州，刘璋益州，孙策江东，张鲁汉中，公孙度辽东。'},
  guandu:{year:200,provinceSource:'han200',commanderySource:'han200',note:'兴平元年分凉州河西四郡置雍州；此处是河西雍州，不是后来的关中雍州。巴郡尚未完成三分。'},
  chibi:{year:208,provinceSource:'han208',commanderySource:'han208',note:'巴、巴西并见，巴东尚未正式定名；后置郡继续归并。'},
  xiangfan:{year:219,provinceSource:'han219',commanderySource:'han219',note:'曹操据北方与荆州北部，刘备据益州、汉中与荆南，孙权据江东；襄樊之战为年度变局。'},
  sanguo:{year:220,provinceSource:'three220',commanderySource:'three220',note:'魏文帝复分河西为凉州、陇右为秦州；三辅仍属司隶。'},
  beifa:{year:228,provinceSource:'three228',commanderySource:'three228',note:'三国并立；魏初秦州中间暂废，陇右归雍州。'},
  guijin:{year:263,provinceSource:'three263',commanderySource:'three263',note:'以刘禅投降前主态势表达，魏、汉、吴仍在；汉末辖二十二郡。'},
  hanwang:{year:264,provinceSource:'wei264',commanderySource:'wei264',note:'汉亡后原汉境由魏接收，魏、吴并立，尚无晋。'},
  jinchu:{year:266,provinceSource:'jin266',commanderySource:'jin266',note:'晋、吴并立；梁、秦、宁、平四州尚未全部设置。'},
  taikang:{year:280,provinceSource:'jin280',commanderySource:'jin280',note:'平吴后十九州。'}
  ,hui_di:{year:290,provinceSource:'jin290',commanderySource:'jin290',note:'惠帝嗣位，州制延续太康十九州。'}
  ,yongjia:{year:311,provinceSource:'jin311',commanderySource:'jin311',note:'永嘉之乱，洛阳陷落；中原控制破碎，州制仍按西晋十九州框架示意。'}
};

/* sourceName -> 当期所属郡。由行政沿革事件在目标年份推导；未列者沿用几何底稿名称。 */
if(!window.ADMINISTRATIVE_EVENT_MODEL) throw new Error('缺少行政沿革事件模型');
window.ADMINISTRATIVE_COMMANDERY_MERGES = window.ADMINISTRATIVE_EVENT_MODEL.buildPeriodMerges();

window.ADMINISTRATIVE_NAME_OVERRIDES = {
  'Guiji / Kuaiji':'会稽郡',Jianwei:'犍为郡'
};

window.ADMINISTRATIVE_PERIOD_NAME_OVERRIDES = {
  han194:{Jianning:'益州郡',Huainan:'九江郡',Fanyang:'涿郡',Henan:'河南尹',Jingzhao:'京兆尹',Pingyi:'左冯翊',Fufeng:'右扶风',Tianshui:'汉阳郡'},
  han199:{Jianning:'益州郡',Huainan:'九江郡',Fanyang:'涿郡',Henan:'河南尹',Jingzhao:'京兆尹',Pingyi:'左冯翊',Fufeng:'右扶风',Tianshui:'汉阳郡'},
  han200:{Jianning:'益州郡',Huainan:'九江郡',Fanyang:'涿郡',Henan:'河南尹',Jingzhao:'京兆尹',Pingyi:'左冯翊',Fufeng:'右扶风',Tianshui:'汉阳郡'},
  han208:{Jianning:'益州郡',Huainan:'九江郡',Fanyang:'涿郡',Henan:'河南尹',Jingzhao:'京兆尹',Pingyi:'左冯翊',Fufeng:'右扶风',Tianshui:'汉阳郡'},
  han219:{Jianning:'益州郡',Huainan:'九江郡',Fanyang:'涿郡',Henan:'河南尹',Jingzhao:'京兆尹',Pingyi:'左冯翊',Fufeng:'右扶风',Tianshui:'汉阳郡'},
  three220:{Jianning:'益州郡',Fanyang:'涿郡'}
};

/* 个别郡的标签位置因几何底稿或合并后质心偏移需要人工校正（[lat, lng]）。 */
window.ADMINISTRATIVE_PERIOD_LABEL_OVERRIDES = {
  guijin:{Tianmen:[29.45,110.90],Wuling:[29.00,111.50],Jianping:[31.05,110.05]},
  hanwang:{Tianmen:[29.45,110.90],Wuling:[29.00,111.50],Jianping:[31.05,110.05]},
  jinchu:{Tianmen:[29.45,110.90],Wuling:[29.00,111.50],Jianping:[31.05,110.05]},
  taikang:{Tianmen:[29.45,110.90],Wuling:[29.00,111.50],Jianping:[31.05,110.05]}
};

/* 供自动审计：年份早于 notBefore 时，该 sourceName 必须已经归回 parent。 */
window.ADMINISTRATIVE_AUDIT_RULES = window.ADMINISTRATIVE_EVENT_MODEL.events.map(function(event){
  return {sourceName:event.subject,notBefore:event.year,parent:event.parentBefore,label:event.label,eventId:event.id};
});
