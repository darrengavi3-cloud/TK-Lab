/* 边界通道与重要战场为考据示意，不等同于现代道路测绘。 */
window.FRONTIER_ROUTES = [
  {id:'baoxie',name:'褒斜道',frontier:'魏—汉',from:220,to:263,pts:[[34.30,107.05],[33.65,107.05],[33.10,107.02]],note:'关中经褒、斜谷通汉中。'},
  {id:'ziwu',name:'子午道',frontier:'魏—汉',from:220,to:263,pts:[[34.20,108.90],[33.55,108.65],[32.85,108.45]],note:'长安南越秦岭通汉中东部。'},
  {id:'tangluo',name:'傥骆道',frontier:'魏—汉',from:220,to:263,pts:[[34.25,108.15],[33.55,107.85],[33.08,107.45]],note:'骆谷、傥谷之间的秦岭通道。'},
  {id:'qishan',name:'祁山—陇右通道',frontier:'魏—汉',from:228,to:263,pts:[[33.35,104.95],[34.05,105.05],[34.58,105.72]],note:'汉军出祁山经营陇右的主要方向。'},
  {id:'huainan',name:'寿春—合肥—濡须口',frontier:'魏—吴',from:220,to:280,pts:[[32.56,116.78],[31.82,117.23],[31.15,117.72]],note:'江淮东线攻守通道。'},
  {id:'jingxiang',name:'襄阳—江陵',frontier:'魏—吴',from:220,to:280,pts:[[32.01,112.13],[31.15,112.25],[30.35,112.24]],note:'荆襄南北干道与水陆战线。'},
  {id:'xiawu',name:'夏口—武昌',frontier:'魏—吴',from:220,to:280,pts:[[30.58,114.30],[30.20,114.90],[30.02,115.10]],note:'长江中游吴国军镇联络线。'}
];

window.STRATEGIC_BATTLEFIELDS = [
  {id:'guandu-field',name:'官渡战场',lat:34.74,lng:113.96,from:200,to:208,note:'曹袁决战区域。'},
  {id:'chibi-field',name:'赤壁—乌林战场',lat:29.72,lng:113.90,from:208,to:220,note:'赤壁之战长江两岸战场。'},
  {id:'xiangfan-field',name:'襄樊战场',lat:32.04,lng:112.15,from:208,to:280,note:'汉水中游南北争夺枢纽。'},
  {id:'hefei-field',name:'合肥—逍遥津战场',lat:31.82,lng:117.23,from:208,to:280,note:'魏吴江淮争夺核心。'},
  {id:'ruxu-field',name:'濡须口战场',lat:31.15,lng:117.72,from:208,to:280,note:'魏吴长江北岸攻防前沿。'},
  {id:'yiling-field',name:'夷陵—猇亭战场',lat:30.69,lng:111.29,from:220,to:228,note:'章武二年吴汉大战区域。'},
  {id:'jieting-field',name:'街亭战场',lat:34.85,lng:105.95,from:228,to:263,note:'诸葛亮第一次北伐关键战场。'},
  {id:'qishan-field',name:'祁山战场',lat:34.05,lng:105.05,from:228,to:263,note:'魏汉陇右攻防前线。'},
  {id:'wuzhang-field',name:'五丈原战场',lat:34.25,lng:107.63,from:228,to:263,note:'诸葛亮第五次北伐驻军区域。'}
];

/*
 * 周边族群与古国的活动范围。它们不是汉、魏、吴、晋的行政州郡，
 * 因此单独作为研究矢量图层处理；pts 是示意边界，不能解释为正式行政界。
 * 颜色和边界只用于把参考图中的域外政区层次表达出来，史实状态统一保留为推定。
 */
window.MINORITY_REGIONS = [
  {id:'xiyu',name:'西域诸国',from:184,to:316,label:[40.65,94.5],color:'#c8b58c',labelColor:'#7a3e3e',status:'推定',vectorKind:'activity-zone',note:'西域诸国活动区；不等同于东汉常设州郡。',pts:[[38.4,88.5],[42.6,90.5],[43.4,95.5],[41.1,100.8],[37.0,99.0],[35.0,94.0]]},
  {id:'xiongnu',name:'匈奴',from:184,to:316,label:[41.55,105.5],color:'#c7839b',labelColor:'#7a1824',status:'推定',vectorKind:'activity-zone',note:'匈奴活动区；南北部众与附属关系随时期变化。',pts:[[39.2,97.2],[44.6,98.2],[45.4,108.8],[44.0,115.2],[40.5,114.6],[38.0,107.5]]},
  {id:'qiang',name:'羌',from:184,to:316,label:[35.35,101.3],color:'#bbaa8f',labelColor:'#4b372d',status:'推定',vectorKind:'activity-zone',note:'羌部活动区；边界仅表示大致范围。',pts:[[35.4,96.0],[38.2,100.3],[37.5,105.0],[34.6,107.4],[32.5,103.0],[33.0,99.2]]},
  {id:'di',name:'氐',from:184,to:316,label:[33.05,106.9],color:'#b7ba79',labelColor:'#514b20',status:'推定',vectorKind:'activity-zone',note:'氐部活动区；不替代汉地郡县归属。',pts:[[33.4,102.6],[35.4,106.2],[34.8,109.3],[32.4,110.0],[30.4,106.7],[30.8,103.8]]},
  {id:'xianbei',name:'鲜卑',from:184,to:316,label:[43.9,122.7],color:'#c4d0e7',labelColor:'#283950',status:'推定',vectorKind:'activity-zone',note:'鲜卑诸部活动区；部落联盟范围随时期变化。',pts:[[41.0,114.5],[45.8,115.4],[46.2,130.5],[43.0,132.0],[40.3,126.4],[39.6,120.0]]},
  {id:'wuhuan',name:'乌桓',from:184,to:207,label:[41.0,120.5],color:'#d1b79f',labelColor:'#75422f',status:'推定',vectorKind:'activity-zone',note:'乌桓活动区；207年后不再作为独立强势范围绘制。',pts:[[39.2,115.6],[42.6,117.0],[43.3,122.2],[40.8,124.2],[38.8,121.1]]},
  {id:'fuyu',name:'夫余',from:184,to:316,label:[43.0,128.4],color:'#bfd4cd',labelColor:'#31554b',status:'推定',vectorKind:'activity-zone',note:'夫余活动区；不表示同时期精确国界。',pts:[[42.0,124.0],[45.2,126.5],[44.5,131.4],[41.2,130.6],[40.0,126.2]]},
  {id:'gaogouli',name:'高句丽',from:184,to:316,label:[39.1,128.4],color:'#b9c9e6',labelColor:'#263b60',status:'推定',vectorKind:'activity-zone',note:'高句丽活动区；不绘制其与汉郡的精确国界。',pts:[[37.2,125.2],[42.0,126.2],[42.3,130.6],[38.4,130.8],[36.7,127.7]]},
  {id:'nanman',name:'南中诸部',from:184,to:316,label:[25.2,105.2],color:'#bda6cf',labelColor:'#583d62',status:'推定',vectorKind:'activity-zone',note:'南中诸部活动区；汉、蜀汉、晋的羁縻与郡县关系另行表达。',pts:[[21.7,99.4],[29.2,100.0],[29.4,107.6],[25.4,112.0],[21.0,108.3]]}
];
