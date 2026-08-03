/* 十一期政治势力审校：州域填色表达主要控制，文字与实际郡块填充表达年度变局。 */
window.POLITICAL_SNAPSHOT_AUDIT = {
  huangjin:{year:184,expected:['han','huangjin'],displayNames:{han:'汉',huangjin:'黄巾军'},note:'黄巾军为跨州流动作战的起事军，不绘作统一领土政权；斜线只覆盖起义活动较集中的实际郡块，边界沿用当期州郡区划。',influenceAreas:[
    {faction:'huangjin',pattern:'diagonal',commanderySourceNames:['Julu','Yingchuan','Runan','Chen','Chenliu State','Dong','Jinan State','Beihai State','Taishan','Jibei State','Donghai State','Xiapi','Nanyang','Henei']}
  ],annotations:[
    {faction:'huangjin',name:'张角',detail:'钜鹿·太平道起事',pos:[37.55,115.35]},
    {faction:'huangjin',name:'波才',detail:'颍川黄巾',pos:[34.05,113.85]}
  ]},
  shaodi:{year:189,expected:['han','dongzhuo'],displayNames:{han:'汉廷',dongzhuo:'董卓'},note:'189年少帝即位期仍属东汉；何进、袁绍等掌中枢，董卓于九月入京并废少帝立献帝。中央百官与州郡长吏依少帝、献帝之际名录注记，不把董卓标作新国家。',annotations:[
    {faction:'han',name:'何进',detail:'大将军·录尚书事',pos:[34.62,112.45]},
    {faction:'han',name:'袁绍',detail:'司隶校尉·中军校尉',pos:[34.75,112.85]},
    {faction:'dongzhuo',name:'董卓军',detail:'前将军·并州牧',pos:[34.58,108.85]},
    {faction:'han',name:'刘虞',detail:'幽州牧',pos:[39.6,116.2]},
    {faction:'han',name:'王允',detail:'河南尹',pos:[34.8,113.5]},
    {faction:'han',name:'韩馥',detail:'尚书·冀州刺史',pos:[36.1,114.5]},
    {faction:'han',name:'刘焉',detail:'益州牧',pos:[30.6,105.5]},
    {faction:'han',name:'士燮',detail:'交阯太守',pos:[22.2,108.5]}
  ]},
  dongzhuo:{year:190,expected:['han','dongzhuo','hanfu','liudai','kongzhou','zhangmiao','qiaomao','baoxin','wangkuang','zhangchao','yuanyi','liubiao','liuzhang','hansui','mateng','shikie'],
    displayNames:{han:'汉廷州郡',liuzhang:'刘焉',liangzhou:'凉州诸将',taoqian:'陶谦'},
    note:'讨董实际发生于190—191年；关东诸军由各州郡分别起兵，并非统一领土政权。冀州按州牧韩馥控制区着色；颍川、河内、陈留、东郡、济北、广陵、山阳及金城、汉阳按对应军势分郡着色。',
    commanderyFactions:{
      Donghai:'taoqian',Langya:'taoqian',Xiapi:'taoqian',Guangling:'taoqian',Pengcheng:'taoqian'
    },
    commanderyFactions:{
      Yingchuan:'kongzhou',Henei:'wangkuang','Chenliu State':'zhangmiao',Dong:'qiaomao',
      'Jibei State':'baoxin',Guangling:'zhangchao',Shanyang:'yuanyi',Jincheng:'hansui',Tianshui:'mateng'
    },
    annotations:[
      {faction:'yuan_shao',name:'袁绍',detail:'渤海举兵',pos:[38.05,117.05]},
      {faction:'wangkuang',name:'王匡',detail:'河内',pos:[35.25,113.55]},
      {faction:'zhangmiao',name:'张邈',detail:'陈留·酸枣',pos:[34.82,114.72]},
      {faction:'qiaomao',name:'桥瑁',detail:'东郡',pos:[35.55,115.08]},
      {faction:'baoxin',name:'鲍信',detail:'济北',pos:[36.02,116.02]},
      {faction:'yuanyi',name:'袁遗',detail:'山阳',pos:[35.05,116.32]},
      {faction:'zhangchao',name:'张超',detail:'广陵',pos:[32.42,119.15]},
      {faction:'kongzhou',name:'孔伷',detail:'颍川',pos:[34.02,113.82]},
      {faction:'yuan_shao',name:'袁术·孙坚',detail:'鲁阳',pos:[33.72,112.90]},
      {faction:'hansui',name:'韩遂',detail:'金城',pos:[36.20,103.80]},
      {faction:'mateng',name:'马腾',detail:'汉阳',pos:[35.05,105.70]}
    ]},
  xingping:{year:194,expected:['liguo','caocao','lubu','liubei','yuan_shao','gongsunzan','liubiao','liuzhang','sunce','liangzhou','shikie','zhanglu','gongsundu'],
    displayNames:{liguo:'李傕郭汜',liuzhang:'刘璋',liangzhou:'韩遂·马腾等'},
    note:'兴平元年吕布袭兖州、曹操失兖州大部；陶谦卒后刘备领徐州；刘焉卒、刘璋继任益州牧；孙策仍依袁术，尚未渡江。河西雍州已分置，按凉州诸将控制表达。',
    commanderyFactions:{
      Hanzhong:'zhanglu',Liaodong:'gongsundu',
      Wuwei:'liangzhou',Zhangye:'liangzhou',Jiuquan:'liangzhou',Dunhuang:'liangzhou'
    },
    annotations:[
      {faction:'lubu',name:'吕布',detail:'兖州',pos:[35.70,114.90]},
      {faction:'liubei',name:'刘备',detail:'徐州',pos:[34.20,117.20]},
      {faction:'gongsunzan',name:'公孙瓒',detail:'幽州',pos:[39.90,116.40]},
      {faction:'zhanglu',name:'张鲁',detail:'汉中',pos:[33.08,106.98]},
      {faction:'gongsundu',name:'公孙度',detail:'辽东',pos:[41.25,122.90]},
      {faction:'liangzhou',name:'韩遂·马腾',detail:'河西雍州',pos:[38.6,102.0]},
      {faction:'sunce',name:'孙策',detail:'袁术帐下',pos:[31.90,118.60]}
    ]},
  jianbing:{year:199,expected:['yuan_shao','caocao','liubiao','liuzhang','sunce','liangzhou','shikie','zhanglu','gongsundu'],
    displayNames:{liuzhang:'刘璋',liangzhou:'韩遂·马腾等'},
    note:'199 年袁绍灭公孙瓒、统一河北；曹操据兖豫徐并接管淮南，孙策定江东。张鲁汉中、公孙度辽东以郡级着色；河西雍州按凉州诸将控制表达，不归曹操。',
    commanderyFactions:{
      Hanzhong:'zhanglu',Liaodong:'gongsundu',
      Wuwei:'liangzhou',Zhangye:'liangzhou',Jiuquan:'liangzhou',Dunhuang:'liangzhou'
    },
    annotations:[
      {faction:'zhanglu',name:'张鲁',detail:'汉中',pos:[33.08,106.98]},
      {faction:'gongsundu',name:'公孙度',detail:'辽东',pos:[41.25,122.90]},
      {faction:'liubei',name:'刘备',detail:'徐州',pos:[34.3,117.2]},
      {faction:'liangzhou',name:'韩遂·马腾',detail:'河西雍州',pos:[38.6,102.0]}
    ]},
  guandu:{year:200,expected:['yuan_shao','caocao','liubiao','liuzhang','sunquan','liangzhou','shikie'],
    displayNames:{liuzhang:'刘璋',liangzhou:'韩遂·马腾等',gongsundu:'公孙氏'},note:'按官渡战前后主要控制区概括；曹操据淮南，孙权据江东，河西雍州按凉州诸将控制表达。辽东公孙氏为名义属汉、实际自立的地方势力。州内边界不等于稳定国界。',
    commanderyFactions:{
      Wuwei:'liangzhou',Zhangye:'liangzhou',Jiuquan:'liangzhou',Dunhuang:'liangzhou',Liaodong:'gongsundu'
    },
    annotations:[
      {faction:'zhanglu',name:'张鲁',detail:'汉中',pos:[33.08,106.98]},
      {faction:'liangzhou',name:'韩遂·马腾',detail:'河西雍州',pos:[38.6,102.0]}
    ]},
  chibi:{year:208,expected:['caocao','liubiao','liubei','sunquan','liuzhang','liangzhou','shikie'],
    displayNames:{liubiao:'刘琮',liuzhang:'刘璋',liangzhou:'韩遂·马氏诸部',gongsundu:'公孙氏'},
    note:'208 年是年度变局：刘表卒、刘琮降曹，刘备退至夏口并与孙权结盟。州域色显示主要控制与荆州旧部过渡，小型虚线范围表示刘备等非完整州域势力；河西雍州按凉州诸将控制表达。',
    commanderyFactions:{
      Wuwei:'liangzhou',Zhangye:'liangzhou',Jiuquan:'liangzhou',Dunhuang:'liangzhou',Liaodong:'gongsundu'
    },
    annotations:[
      {faction:'liubiao',name:'刘琦',detail:'江陵 · 刘表长子',pos:[30.35,112.24],radius:60000},
      {faction:'zhanglu',name:'张鲁',detail:'汉中',pos:[33.08,106.98]},
      {faction:'liubei',name:'刘备',detail:'夏口—樊口联军',pos:[30.45,114.48],radius:72000},
      {faction:'liangzhou',name:'韩遂·马氏',detail:'河西雍州',pos:[38.6,102.0]}
    ]},
  xiangfan:{year:219,expected:['caocao','liubei','sunquan','shikie','gongsundu'],
    displayNames:{caocao:'曹操',liubei:'刘备',sunquan:'孙权',shikie:'士燮',gongsundu:'公孙氏'},
    note:'219 年刘备取汉中称汉中王；关羽北伐襄樊，孙权袭取荆州，是年度变局。公孙氏仍据辽东。',
    commanderyFactions:{
      Hanzhong:'liubei',Liaodong:'gongsundu',Jiangxia:'sunquan'
    },
    annotations:[
      {faction:'caocao',name:'关羽',detail:'围襄樊',pos:[32.04,112.15],radius:70000},
      {faction:'sunquan',name:'吕蒙',detail:'袭江陵',pos:[30.35,112.24],radius:60000}
    ]},
  sanguo:{year:220,expected:['wei','shu','wu'],displayNames:{wei:'魏',shu:'刘备',wu:'孙权',gongsundu:'公孙渊'},note:'220 年仅魏已经建国；刘备、孙权以人物势力名显示。辽东公孙渊名义附魏、实际自立。',
    commanderyFactions:{Liaodong:'gongsundu'},
    annotations:[]},
  beifa:{year:228,expected:['wei','shu','wu'],displayNames:{wei:'魏',shu:'汉',wu:'吴',gongsundu:'公孙渊'},note:'魏、汉、吴并立；辽东公孙渊仍据地自立，为魏名义属地。',
    commanderyFactions:{Liaodong:'gongsundu'},
    annotations:[]},
  guijin:{year:263,expected:['wei','shu','wu'],displayNames:{wei:'魏',shu:'汉',wu:'吴'},note:'以景元四年魏军伐汉、刘禅投降前的年度主态势表达，魏、汉、吴仍并存。'},
  hanwang:{year:264,expected:['wei','wu'],displayNames:{wei:'魏',wu:'吴'},note:'汉亡后的次年稳定截面：原汉境已由魏接收，仍不能提前显示晋。'},
  jinchu:{year:266,expected:['jin','wu'],displayNames:{jin:'晋',wu:'吴'},note:'晋受魏禅，吴仍存。'},
  taikang:{year:280,expected:['jin'],displayNames:{jin:'晋'},note:'晋灭吴后统一。'}
  ,hui_di:{year:290,expected:['jin'],displayNames:{jin:'晋'},note:'惠帝嗣位，西晋仍统一；八王之乱属权力斗争，未改变州郡版图。'}
  ,yongjia:{year:311,expected:['jin','hantuo','shile'],displayNames:{jin:'晋',hantuo:'汉赵',shile:'石勒'},note:'永嘉五年洛阳陷落，汉赵据并州、石勒纵横河北，晋室控制区残破；州制按西晋十九州框架示意。'}
};

window.PROVINCE_COLOR_PALETTE = {
  sili:'#D8C6A1',yongzhou:'#D8B58A',liangzhou:'#C8B68D',qinzhou:'#C99275',
  bingzhou:'#AFC2A8',jizhou:'#AFC2D1',youzhou:'#9DBFC2',pingzhou:'#A7B8C7',
  qingzhou:'#A9C9BD',yanzhou:'#C0B5CA',yuzhou:'#D3B2AE',xuzhou:'#B3C9A9',
  yangzhou:'#D6B5BC',jingzhou:'#C9C89E',yizhou:'#AFC59A',liang_state:'#B5BD8E',
  ningzhou:'#C7B78C',jiaozhou:'#9FC2B4',guangzhou:'#D0AA91'
};
