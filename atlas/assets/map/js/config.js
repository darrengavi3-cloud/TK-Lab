/**
 * config.js — 全局配置：地图参数、势力定义、各时期州郡归属（按正史修正）
 *
 * 疆域边界采用 kongming.net / Threekingdoms_Archive 的手工精绘州界；
 * 各时期归属依据《三国志》及《中国历史地图集》所述势力范围修正，例如：
 *   · 官渡之战（200）：河北四州属袁绍，曹操据兖豫徐与关中司隶；
 *   · 讨董（190）：董卓控制司隶，关东各军分别起兵；联盟并非统一政权，不能把全部关东州域涂成同一领土；
 *   · 三国鼎立（220）后：魏据荆州北部（南阳、襄阳），吴据荆州大部——魏吴分置荆州，
 *     即史所载「魏荆州」「吴荆州」，非一地两名。
 */

// 地图基础配置（基于 WGS84 经纬度，使用 Leaflet 默认投影）
const MAP_CONFIG = {
  center: [33.5, 112],
  zoom: 5.6,
  minZoom: 4,
  maxZoom: 10,
  maxBounds: [[8, 90], [47, 132]],
};

// 底图（瓦片图层）：素色地形为默认
const BASE_MAPS = {
  terrain: {
    name: '素色地形',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 18,
  },
  topo: {
    name: '地形图',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 18,
  },
  elevation: {
    name: '高程山影',
    url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    attribution: 'Elevation tiles © Mapzen / AWS Terrain Tiles',
    maxZoom: 15,
  },
  hillshade: {
    name: '山影辅助',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Hillshade © Esri',
    maxZoom: 18,
  },
  osm: {
    name: '现代地图',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
};

// 势力 / 阵营定义
// color 取国风传统色：赭石、黛蓝、竹青、朱砂、藤黄、紫檀……与水墨主题协调。
// labelOffset: [latOffset, lngOffset] 用于微调国号大字在地图上的位置。
const FACTIONS = {
  han: {
    id: 'han', name: '大汉', color: '#8c6d3f', labelOffset: [0, 0],
    ruler: '汉献帝 刘协', capital: '洛阳',
    desc: '东汉延祚四百年，至桓灵而衰。黄巾乱起，州郡拥兵，天子播越，汉室名存实亡。',
  },
  huangjin: {
    id: 'huangjin', name: '黄巾军', color: '#9a4f3e', labelOffset: [0, 0],
    ruler: '张角、张宝、张梁', capital: '广宗／下曲阳',
    desc: '184年太平道起事军。黄巾是跨州流动的军事力量，不绘成一块稳定国家版图。',
  },
  dongzhuo: {
    id: 'dongzhuo', name: '董卓', color: '#4a3b2e', labelOffset: [0, 0],
    ruler: '董卓（相国）', capital: '长安',
    desc: '董卓率凉州兵入京，废少帝立献帝，焚洛阳而西迁。专断朝政，终为王允、吕布所诛。',
  },
  liguo: {
    id: 'liguo', name: '李傕郭汜', color: '#5A4438', labelOffset: [0, 0],
    ruler: '李傕 · 郭汜', capital: '长安',
    desc: '董卓死后李傕、郭汜反攻长安，把持汉廷，后又相互攻杀，献帝东归。',
  },
  lianjun: {
    id: 'lianjun', name: '关东诸侯', color: '#7a6a55', labelOffset: [0, 0],
    ruler: '袁绍 · 袁术 · 韩馥 · 陶谦 …', capital: '各据州郡',
    desc: '初平元年，关东州郡推袁绍为盟主起兵讨董。联盟旋解，群雄遂裂土相攻，中原板荡。',
  },
  lubu: {
    id: 'lubu', name: '吕布', color: '#A45D4B', labelOffset: [0, 0],
    ruler: '吕布（兖州牧）', capital: '濮阳',
    desc: '兴平元年吕布应张邈、陈宫之邀入据兖州，与曹操相持岁余，后东奔徐州。',
  },
  hanfu: {
    id:'hanfu', name:'韩馥', color:'#527C7A', labelOffset:[0,0],
    ruler:'韩馥（冀州牧）', capital:'邺', desc:'初平元年以冀州牧参加讨董，冀州供应关东诸军粮饷。',
  },
  kongzhou: {
    id:'kongzhou', name:'孔伷', color:'#9A7742', labelOffset:[0,0],
    ruler:'孔伷（豫州刺史）', capital:'颍川', desc:'初平元年屯兵颍川，参加关东讨董。',
  },
  liudai: {
    id:'liudai', name:'刘岱', color:'#76577A', labelOffset:[0,0],
    ruler:'刘岱（兖州刺史）', capital:'昌邑', desc:'以兖州刺史参加讨董，兖州境内另有张邈、桥瑁、鲍信等军。',
  },
  zhangmiao: {id:'zhangmiao',name:'张邈',color:'#A45D4B',labelOffset:[0,0],ruler:'张邈（陈留太守）',capital:'陈留',desc:'陈留太守，率军参加酸枣会盟。'},
  qiaomao: {id:'qiaomao',name:'桥瑁',color:'#66758A',labelOffset:[0,0],ruler:'桥瑁（东郡太守）',capital:'东郡',desc:'东郡太守，移书州郡并参加酸枣会盟。'},
  baoxin: {id:'baoxin',name:'鲍信',color:'#A0783C',labelOffset:[0,0],ruler:'鲍信（济北相）',capital:'济北',desc:'济北相，率军参加讨董。'},
  wangkuang: {id:'wangkuang',name:'王匡',color:'#875F4A',labelOffset:[0,0],ruler:'王匡（河内太守）',capital:'河内',desc:'河内太守，与袁绍屯河内。'},
  zhangchao: {id:'zhangchao',name:'张超',color:'#78824F',labelOffset:[0,0],ruler:'张超（广陵太守）',capital:'广陵',desc:'广陵太守，参加关东讨董。'},
  yuanyi: {id:'yuanyi',name:'袁遗',color:'#8A5C69',labelOffset:[0,0],ruler:'袁遗（山阳太守）',capital:'山阳',desc:'山阳太守，参加关东讨董。'},
  hansui: {id:'hansui',name:'韩遂',color:'#80624A',labelOffset:[0,0],ruler:'韩遂',capital:'金城',desc:'据金城一带的凉州军事实力。'},
  mateng: {id:'mateng',name:'马腾',color:'#687B55',labelOffset:[0,0],ruler:'马腾',capital:'汉阳',desc:'据汉阳一带的凉州军事实力。'},
  yuan_shao: {
    id: 'yuan_shao', name: '袁绍', color: '#6e4a5e', labelOffset: [0, 0],
    ruler: '袁绍（大将军）', capital: '邺城',
    desc: '袁绍四世三公，先据渤海，后兼冀青幽并四州，带甲数十万，雄踞河北。官渡一败，霸业成空。',
  },
  caocao: {
    id: 'caocao', name: '曹操', color: '#3a5068', labelOffset: [0, 0],
    ruler: '曹操（司空 · 魏王）', capital: '许昌 · 邺城',
    desc: '曹操迎献帝都许，挟天子以令诸侯。破吕布、败袁绍、平河北，三分天下有其二，终身汉臣而魏基已立。',
  },
  liubiao: {
    id: 'liubiao', name: '刘表', color: '#9c7c46', labelOffset: [0, 0],
    ruler: '刘表（荆州牧）', capital: '襄阳',
    desc: '刘表单骑入荆州，招抚宗贼，保境安民近二十年。荆州文教兴盛，然坐观成败，身后基业尽失。',
  },
  liuzhang: {
    id: 'liuzhang', name: '刘璋', color: '#6b8c5a', labelOffset: [0, 0],
    ruler: '刘焉 / 刘璋（益州牧）', capital: '成都',
    desc: '刘焉父子据益州，凭剑阁之险保境。刘璋暗弱，终迎刘备入川而失其国。',
  },
  gongsunzan: {
    id: 'gongsunzan', name: '公孙瓒', color: '#5E7C7A', labelOffset: [0, 0],
    ruler: '公孙瓒（幽州）', capital: '蓟',
    desc: '公孙瓒据幽州，与袁绍争河北，界桥后渐处下风，终为袁绍所灭。',
  },
  taoqian: {
    id: 'taoqian', name: '陶谦', color: '#A96E4B', labelOffset: [0, 0],
    ruler: '陶谦（徐州牧）', capital: '郯',
    desc: '陶谦据徐州，初平四年与曹操交兵，兴平元年卒，临终表刘备领徐州。',
  },
  liubei: {
    id: 'liubei', name: '刘备', color: '#4a7c59', labelOffset: [0, 0],
    ruler: '刘备（左将军 · 汉中王）', capital: '江陵 → 成都',
    desc: '刘备以宗室起兵，半生颠沛。赤壁后据荆州江南，借南郡，西取益州，终成鼎足之业。',
  },
  sunquan: {
    id: 'sunquan', name: '孙权', color: '#a63d2a', labelOffset: [0, 0],
    ruler: '孙策 / 孙权', capital: '建业',
    desc: '孙氏父子兄弟三世经营江东。赤壁联刘拒曹，袭荆州而全据长江，坐断东南。',
  },
  liangzhou: {
    id: 'liangzhou', name: '凉州诸将', color: '#8c7a5b', labelOffset: [0, 0],
    ruler: '马腾 · 韩遂 · 马超', capital: '武威',
    desc: '凉州骁勇，马腾韩遂起兵关西，割据陇右。后曹操离间破之，关中遂定。',
  },
  shikie: {
    id: 'shikie', name: '士燮', color: '#7c8c6b', labelOffset: [0, 0],
    ruler: '士燮（交趾太守）', capital: '龙编',
    desc: '士燮兄弟据交州，保境安民，中原士人多往归之。后归附孙吴，交广遂入吴。',
  },
  zhanglu: {
    id: 'zhanglu', name: '张鲁', color: '#8A6A3F', labelOffset: [0, 0],
    ruler: '张鲁（汉中）', capital: '汉中',
    desc: '张鲁据汉中，行五斗米道，保境近三十年，建安二十年降曹。',
  },
  gongsundu: {
    id: 'gongsundu', name: '公孙度', color: '#4E6E8A', labelOffset: [0, 0],
    ruler: '公孙度／公孙康', capital: '襄平',
    desc: '公孙度据辽东，东伐高句丽，西击乌桓，自立为辽东侯；子公孙康继其业。',
  },
  sunce: {
    id: 'sunce', name: '孙策', color: '#A8732E', labelOffset: [0, 0],
    ruler: '孙策', capital: '吴郡',
    desc: '孙策以父坚部曲渡江，平定江东，为孙吴基业开创者。',
  },
  wei: {
    id: 'wei', name: '魏', color: '#3a5068', labelOffset: [0, 0],
    ruler: '曹丕 / 曹叡', capital: '洛阳 · 邺城',
    desc: '曹丕代汉称帝，国号魏。据中原、关中、河北，以及荆州之南阳襄阳、扬州之淮南，三分天下有其二。',
  },
  shu: {
    id: 'shu', name: '汉', color: '#4a7c59', labelOffset: [0, 0],
    ruler: '刘备 / 刘禅', capital: '成都',
    desc: '刘备于成都称帝续汉祚，国号汉，史称蜀汉、季汉。诸葛亮治蜀，六出祁山，鞠躬尽瘁。',
  },
  wu: {
    id: 'wu', name: '吴', color: '#a63d2a', labelOffset: [0, 0],
    ruler: '孙权', capital: '建业',
    desc: '孙权称帝，国号吴。全据长江中下游，荆州江南、扬州、交广尽入其域，舟师甲于天下。',
  },
  jin: {
    id: 'jin', name: '晋', color: '#5a4a6e', labelOffset: [0, 0],
    ruler: '司马炎', capital: '洛阳',
    desc: '司马氏秉魏政，先灭蜀，后受禅建晋，再楼船下益州平吴，三分复归一统。',
  },
  hantuo: {
    id: 'hantuo', name: '汉赵', color: '#6E4A3A', labelOffset: [0, 0],
    ruler: '刘渊 · 刘聪', capital: '平阳',
    desc: '刘渊起兵据并州，国号汉；刘聪遣刘曜、石勒攻陷洛阳，中原板荡。',
  },
  shile: {
    id: 'shile', name: '石勒', color: '#7A5B3D', labelOffset: [0, 0],
    ruler: '石勒', capital: '襄国',
    desc: '石勒本为汉赵大将，纵横河北，后自立为后赵，为永嘉乱后北方最强势力之一。',
  },
};

// 大势力标签锚点（[lat, lng]），用于疆域之上的国号大字标注
const FACTION_LABELS = {
  han: [34.8, 111.5],
  huangjin: [37.0, 115.4],
  dongzhuo: [34.5, 108.8],
  liguo: [34.3, 108.9],
  lianjun: [35.6, 116.5],
  lubu: [35.7, 114.9],
  taoqian: [34.3, 117.4],
  yuan_shao: [37.6, 116.0],
  caocao: [34.9, 114.8],
  liubiao: [30.6, 112.2],
  liuzhang: [30.6, 105.5],
  gongsunzan: [39.9, 116.4],
  liubei: [29.5, 112.6],
  sunquan: [30.4, 118.5],
  liangzhou: [38.4, 101.5],
  shikie: [22.2, 108.5],
  zhanglu: [33.0, 106.8],
  gongsundu: [41.0, 123.0],
  sunce: [30.05, 119.55],
  wei: [36.2, 113.5],
  shu: [30.4, 105.0],
  wu: [30.2, 118.0],
  jin: [35.6, 112.5],
  hantuo: [37.1, 111.5],
  shile: [37.0, 114.5],
};

// 部分时期国号大字会因版图质心偏出地图范围，这里按时期固定到版图内侧。
const FACTION_LABEL_OVERRIDES = {
  guandu: {
    caocao: [35.2, 114.4],
    yuan_shao: [38.0, 115.8],
  },
  jianbing: {
    sunce: [30.05, 119.35],
  },
  // 219—263 年曹操／魏的国号大字统一贴近洛阳，避免因北方版图质心偏出而失去指向性。
  xiangfan: { caocao: [34.66, 112.62] },
  sanguo: { wei: [34.66, 112.62] },
  beifa: { wei: [34.66, 112.62] },
  guijin: { wei: [34.66, 112.62] },
};
window.FACTION_LABEL_OVERRIDES = FACTION_LABEL_OVERRIDES;

// ── 各时期州郡归属（按正史修正）────────────────────────────
// key 为时期 id；未列出的州回退到 GEO_PROVINCES 数据中的默认 kingdom。
//
// 为兼顾「220 年前荆州、扬州为完整一州」与「220 年后魏吴分治」两种呈现，
// 本项目维护两套州界几何：
//   · dataSource: 'early' — geo-provinces-early.js，荆州/扬州为合并整体；
//   · dataSource: 'late'  — geo-provinces-late.js， 荆州/扬州按魏吴拆分。
// 益州在两套数据中均为整体（yizhou），不作南北之分。
const PROVINCE_PERIODS = {
  // 184 黄巾之乱：天下仍属东汉，州郡皆汉土
  huangjin: {
    dataSource: 'early',
    provinces: {
      bingzhou: 'han', jiaozhou: 'han', jingzhou: 'han', jizhou: 'han',
      liangzhou: 'han', qingzhou: 'han', sili: 'han', xuzhou: 'han',
      yangzhou: 'han', yanzhou: 'han', yizhou: 'han', yongzhou: 'han',
  youzhou: 'han', yuzhou: 'han',
    },
  },
  // 189 少帝即位：行政州域仍按东汉十三州部，另以汉廷／董卓军势注记宫廷与入京路线。
  shaodi: {
    dataSource: 'early',
    provinces: {
      bingzhou: 'han', jiaozhou: 'han', jingzhou: 'han', jizhou: 'han',
      liangzhou: 'han', qingzhou: 'han', sili: 'han', xuzhou: 'han',
      yangzhou: 'han', yanzhou: 'han', yizhou: 'han', youzhou: 'han', yuzhou: 'han',
    },
  },
  // 190 讨董：关东诸军并非统一政权；冀、兖、豫是主要起兵与供军州域，其余仍以汉廷州郡表达
  dongzhuo: {
    dataSource: 'early',
    provinces: {
      bingzhou: 'han', jiaozhou: 'shikie', jingzhou: 'liubiao', jizhou: 'hanfu',
      liangzhou: 'liangzhou', qingzhou: 'han', sili: 'dongzhuo', xuzhou: 'taoqian',
      yangzhou: 'han', yanzhou: 'liudai', yizhou: 'liuzhang',
      youzhou: 'han', yuzhou: 'han',
    },
  },
  // 194 兴平：吕布袭兖州，曹操失兖州大部；刘备领徐州；袁绍据河北、公孙瓒据幽州；
  //          刘表荆州、刘璋益州（刘焉卒）；孙策仍依袁术，次年渡江；河西雍州已分置。
  xingping: {
    dataSource: 'han194',
    provinces: {
      bingzhou: 'yuan_shao', jiaozhou: 'shikie', jingzhou: 'liubiao', jizhou: 'yuan_shao',
      liangzhou: 'liangzhou', qingzhou: 'yuan_shao', sili: 'liguo', xuzhou: 'liubei',
      yangzhou: 'sunce', yanzhou: 'lubu', yizhou: 'liuzhang', yongzhou: 'liangzhou',
      youzhou: 'gongsunzan', yuzhou: 'caocao',
    },
  },
  // 199 群雄兼并：袁绍灭公孙瓒据河北；曹操据兖豫徐与淮南；刘表荆州、刘璋益州、
  //              孙策江东、士燮交州；张鲁汉中、公孙度辽东以郡级分色。
  //              河西雍州在 194—213 年不属曹操，按凉州诸将控制表达。
  jianbing: {
    dataSource: 'late',
    provinces: {
      bingzhou: 'yuan_shao', jiaozhou: 'shikie', jing_wei: 'liubiao', jing_wu: 'liubiao',
      jizhou: 'yuan_shao', liangzhou: 'liangzhou', qingzhou: 'yuan_shao', sili: 'caocao',
      xuzhou: 'caocao', yang_wei: 'caocao', yang_wu: 'sunce', yanzhou: 'caocao',
      yizhou: 'liuzhang', yongzhou: 'liangzhou', youzhou: 'yuan_shao', yuzhou: 'caocao',
    },
  },
  // 200 官渡：袁绍据冀青幽并；曹操据兖豫徐、司隶关中与淮南；刘表荆州；孙权江东；
  //          刘璋益州；马韩凉州；士燮交州。河西雍州仍按凉州诸将控制表达。
  guandu: {
    dataSource: 'late',
    provinces: {
      bingzhou: 'yuan_shao', jiaozhou: 'shikie', jing_wei: 'liubiao', jing_wu: 'liubiao',
      jizhou: 'yuan_shao', liangzhou: 'liangzhou', qingzhou: 'yuan_shao', sili: 'caocao',
      xuzhou: 'caocao', yang_wei: 'caocao', yang_wu: 'sunquan', yanzhou: 'caocao',
      yizhou: 'liuzhang', yongzhou: 'liangzhou', youzhou: 'yuan_shao', yuzhou: 'caocao',
    },
  },
  // 208 年度变局：刘表卒、刘琮降曹，刘备退驻夏口并与孙权合兵。
  // 州域着色保留“荆州刘氏”过渡层；刘备以夏口—樊口虚线范围表达，避免误画成已据荆南四郡。
  chibi: {
    dataSource: 'late',
    provinces: {
      bingzhou: 'caocao', jiaozhou: 'shikie', jing_wei: 'caocao', jing_wu: 'liubiao',
      jizhou: 'caocao', liangzhou: 'liangzhou', qingzhou: 'caocao', sili: 'caocao',
      xuzhou: 'caocao', yang_wei: 'caocao', yang_wu: 'sunquan', yanzhou: 'caocao',
      yizhou: 'liuzhang', yongzhou: 'liangzhou', youzhou: 'caocao', yuzhou: 'caocao',
    },
  },
  // 219 襄樊之战：曹操据北方与荆州北部；刘备据益州、汉中、荆南并称汉中王；
  //              孙权据江东与江夏，年底袭取江陵；公孙氏仍据辽东。
  xiangfan: {
    dataSource: 'late',
    provinces: {
      bingzhou: 'caocao', jiaozhou: 'shikie', jing_wei: 'caocao', jing_wu: 'liubei',
      jizhou: 'caocao', liangzhou: 'caocao', qingzhou: 'caocao', sili: 'caocao',
      xuzhou: 'caocao', yang_wei: 'caocao', yang_wu: 'sunquan', yanzhou: 'caocao',
      yizhou: 'liubei', yongzhou: 'caocao', youzhou: 'caocao', yuzhou: 'caocao',
    },
  },
  // 220 三国鼎立：魏据北方、荆州北部（南阳襄阳）、淮南；蜀汉据益州；
  //              吴据荆州江南（吕蒙袭荆州后荆南六郡尽归吴）、江东、交州
  sanguo: {
    dataSource: 'late',
    provinces: {
      bingzhou: 'wei', jiaozhou: 'wu', jing_wei: 'wei', jing_wu: 'wu',
      jizhou: 'wei', liangzhou: 'wei', qingzhou: 'wei', sili: 'wei',
      xuzhou: 'wei', yang_wei: 'wei', yang_wu: 'wu', yanzhou: 'wei',
      yizhou: 'shu', yongzhou: 'wei', youzhou: 'wei', yuzhou: 'wei',
    },
  },
  // 228 北伐时期：三分格局稳定，魏吴仍以江汉、江淮为界
  beifa: {
    dataSource: 'late',
    provinces: {
      bingzhou: 'wei', jiaozhou: 'wu', jing_wei: 'wei', jing_wu: 'wu',
      jizhou: 'wei', liangzhou: 'wei', qingzhou: 'wei', sili: 'wei',
      xuzhou: 'wei', yang_wei: 'wei', yang_wu: 'wu', yanzhou: 'wei',
      yizhou: 'shu', yongzhou: 'wei', youzhou: 'wei', yuzhou: 'wei',
    },
  },
  // 263 魏伐汉：以汉投降前的年度主态势表达，魏、汉、吴仍并存
  guijin: {
    dataSource: 'late',
    provinces: {
      bingzhou: 'wei', jiaozhou: 'wu', jing_wei: 'wei', jing_wu: 'wu',
      jizhou: 'wei', liangzhou: 'wei', qingzhou: 'wei', sili: 'wei',
      xuzhou: 'wei', yang_wei: 'wei', yang_wu: 'wu', yanzhou: 'wei',
      yizhou: 'shu', yongzhou: 'wei', youzhou: 'wei', yuzhou: 'wei',
    },
  },
  // 264 汉亡后的次年稳定截面：原汉境纳入魏，吴仍存
  hanwang: {
    dataSource: 'late',
    provinces: {
      bingzhou: 'wei', jiaozhou: 'wu', jing_wei: 'wei', jing_wu: 'wu',
      jizhou: 'wei', liangzhou: 'wei', qingzhou: 'wei', sili: 'wei',
      xuzhou: 'wei', yang_wei: 'wei', yang_wu: 'wu', yanzhou: 'wei',
      yizhou: 'wei', yongzhou: 'wei', youzhou: 'wei', yuzhou: 'wei',
    },
  },
  // 280 太康统一：晋灭吴，三分复归一统，天下十九州
  taikang: {
    dataSource: 'jin',
    provinces: {
      sili: 'jin', yuzhou: 'jin', yanzhou: 'jin', xuzhou: 'jin',
      qingzhou: 'jin', jizhou: 'jin', youzhou: 'jin', pingzhou: 'jin',
      bingzhou: 'jin', liangzhou: 'jin', qinzhou: 'jin', yongzhou: 'jin',
      liang_state: 'jin', yizhou: 'jin', ningzhou: 'jin',
      jingzhou: 'jin', yangzhou: 'jin', jiaozhou: 'jin', guangzhou: 'jin',
    },
  },
  // 290 惠帝嗣位：延续太康十九州，西晋仍统一
  hui_di: {
    dataSource: 'jin290',
    provinces: {
      sili: 'jin', yuzhou: 'jin', yanzhou: 'jin', xuzhou: 'jin',
      qingzhou: 'jin', jizhou: 'jin', youzhou: 'jin', pingzhou: 'jin',
      bingzhou: 'jin', liangzhou: 'jin', qinzhou: 'jin', yongzhou: 'jin',
      liang_state: 'jin', yizhou: 'jin', ningzhou: 'jin',
      jingzhou: 'jin', yangzhou: 'jin', jiaozhou: 'jin', guangzhou: 'jin',
    },
  },
  // 311 永嘉之乱：扬州已分江州；洛阳陷落，并州为汉赵、河北为石勒
  yongjia: {
    dataSource: 'jin311',
    provinces: {
      sili: 'hantuo', yuzhou: 'hantuo', yanzhou: 'hantuo', xuzhou: 'jin',
      qingzhou: 'jin', jizhou: 'shile', youzhou: 'jin', pingzhou: 'jin',
      bingzhou: 'hantuo', liangzhou: 'jin', qinzhou: 'jin', yongzhou: 'jin',
      liang_state: 'jin', yizhou: 'jin', ningzhou: 'jin',
      jingzhou: 'jin', yangzhou: 'jin', jiangzhou: 'jin', jiaozhou: 'jin', guangzhou: 'jin',
    },
  },
};

// 古典配色（供 UI 引用）
const THEME = {
  parchment: '#e9dcc0',
  ink: '#2b2118',
  sealRed: '#9e2b25',
  gold: '#b8860b',
  river: '#6b8fa3',
};

// 夷洲常驻轮廓与标注；独立于国家、州郡、城池等可关闭图层。
const YIZHOU_LABEL = {
  name: '夷洲',
  pos: [23.65, 121.0],
  desc: '《三国志·吴书》载孙权曾遣卫温、诸葛直率军至夷洲。',
  // 台湾本岛的简化 WGS84 海岸线：保留北岬、东岸弧线、南端与西岸平缓轮廓，
  // 不再使用上一版近似菱形的示意轮廓。
  outline: [
    [25.30,121.56],[25.25,121.65],[25.15,121.78],[25.09,121.91],
    [24.99,121.99],[24.86,121.99],[24.74,121.92],[24.62,121.90],
    [24.49,121.91],[24.35,121.89],[24.22,121.84],[24.09,121.81],
    [23.96,121.77],[23.83,121.72],[23.71,121.64],[23.59,121.61],
    [23.47,121.57],[23.34,121.55],[23.21,121.51],[23.08,121.47],
    [22.94,121.40],[22.81,121.36],[22.68,121.32],[22.54,121.27],
    [22.41,121.21],[22.29,121.13],[22.18,121.02],[22.08,120.90],
    [22.02,120.78],[22.13,120.68],[22.27,120.58],[22.42,120.48],
    [22.57,120.39],[22.72,120.30],[22.88,120.23],[23.03,120.19],
    [23.18,120.18],[23.33,120.21],[23.47,120.27],[23.61,120.34],
    [23.75,120.42],[23.89,120.50],[24.03,120.58],[24.18,120.66],
    [24.33,120.73],[24.48,120.81],[24.62,120.90],[24.75,121.00],
    [24.88,121.11],[25.00,121.22],[25.10,121.34],[25.20,121.46]
  ],
};
window.YIZHOU_LABEL = YIZHOU_LABEL;

// 数据来源署名
const ATTRIBUTION = {
  boundaries: '州郡边界 © Zhou Dadudu / kongming.net (CC BY-NC-SA 4.0)',
  towns: '城镇数据 © Zhou Dadudu / kongming.net (CC BY-NC-SA 4.0)',
};
