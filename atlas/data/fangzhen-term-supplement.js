/*
 * 州镇录任期待补（V28）
 *
 * 原档（孙吴州郡长官考、蜀汉郡守考）中“任期未详／？”类记录按以下规则补全：
 * 1. 原档所引史料或《三国志》《晋书》纪传能锚定年代者，填 startYear／endYear，
 *    并把年代依据写入 note；原文保留在 sourceTenureText，不丢失。
 * 2. 无可靠年代锚点者，tenureText 明确标注“待考”，confidence 置为“待考”，
 *    不做主观推定的年份区间。
 */
(function (global) {
  'use strict';

  global.FANGZHEN_TERM_SUPPLEMENTS = [
    {
      id: 'fz_wu_doc_006',
      startYear: 264, endYear: 280,
      tenureText: '约264—280年（吴后主时期）',
      confidence: '待考',
      appointmentStatus: '任职未详',
      note: '《晋书》称“吴荆州刺史”，原文标注“吴后主？”；《晋书·武帝纪》泰始四年（268）顾容尚为吴将，出任荆州刺史的准确年份未详，暂按孙皓在位期（264—280）框定，未详。'
    },
    {
      id: 'fz_wu_doc_014',
      startYear: 272, endYear: 272,
      tenureText: '约272年（凤凰元年）在任',
      confidence: '待考',
      note: '见出土东吴魂瓶“凤凰元年立长沙太守友作浃使宜子孙”；姓名仅存“友”，此为该年所见在任记录，任期起讫仍未详。'
    },
    {
      id: 'fz_wu_doc_059',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '原档仅见“修允”而无年代依据；其为合浦太守、交州刺史均在孙皓末年，始兴郡太守任期未详。'
    },
    {
      id: 'fz_wu_doc_079',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '《晋书·孔坦传》仅载“祖冲，丹杨太守”，无任职年代，未详。'
    },
    {
      id: 'fz_wu_doc_088',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '《水经注》载太守张景与黄门郎杨裒明事，无系年，未详。'
    },
    {
      id: 'fz_wu_doc_091',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '《晋故散骑常侍陆君诔》载其“爰守会稽”，无任职年代，未详。'
    },
    {
      id: 'fz_wu_doc_148',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '《临海县志》所载屈惠任临海太守，原档标“存疑”，无年代依据，未详。'
    },
    {
      id: 'fz_wu_doc_164',
      startYear: 210, endYear: 230,
      tenureText: '约210—230年',
      confidence: '推定',
      note: '《三国志·薛综传》：士燮既附孙权，召综除合浦、交阯太守；士燮附吴在建安十五年（210），吕岱征交州时综俱行，事毕还都在黄龙三年（231）前。'
    },
    {
      id: 'fz_wu_doc_168',
      startYear: null, endYear: 263,
      tenureText: '约263年（永安六年）被吕兴所杀',
      confidence: '确定',
      note: '《三国志·三嗣主传》：永安六年（263）交阯郡吏吕兴等反，杀太守孙谞；到任年份未详。'
    },
    {
      id: 'fz_wu_doc_169',
      startYear: 210, endYear: 226,
      tenureText: '约210—226年（士氏领交州时期）',
      confidence: '推定',
      note: '《三国志·士燮传》：燮表弟武领南海太守；士燮附吴在建安十五年（210），卒于黄武五年（226）。'
    },
    {
      id: 'fz_wu_doc_171',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '《晋书·任旭传》仅载“父访，吴南海太守”，无任职年代，未详。'
    },
    {
      id: 'fz_wu_doc_172',
      startYear: null, endYear: 279,
      tenureText: '约279年（天纪三年）郭马之乱中被杀',
      confidence: '确定',
      note: '《三国志·三嗣主传》：天纪三年（279）郭马反，杀南海太守刘略；到任年份未详。'
    },
    {
      id: 'fz_wu_doc_174',
      startYear: 210, endYear: 226,
      tenureText: '约210—226年（士氏领交州时期）',
      confidence: '推定',
      note: '《三国志·士燮传》：燮表次弟〈黄有〉领九真太守；士燮附吴在建安十五年（210），卒于黄武五年（226）。'
    },
    {
      id: 'fz_wu_doc_176',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '《浙江通志》仅载吴九真太守何英墓，无任职年代，未详。'
    },
    {
      id: 'fz_wu_doc_177',
      startYear: null, endYear: 272,
      tenureText: '约272年前后在任（《谷朗碑》）',
      confidence: '待考',
      note: '《谷朗碑》立于吴末，称九真太守；可证其在孙皓凤凰年间在任，具体到任年份未详。'
    },
    {
      id: 'fz_wu_doc_178',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '《交州记》载九真太守陶璜立郡筑城，无任职年代，未详。'
    },
    {
      id: 'fz_wu_doc_180',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '陶璜任苍梧太守无直接系年，约在吴交州任职期间，未详。'
    },
    {
      id: 'fz_wu_doc_181',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '《景定建康志》载史嵩仕吴为平越中郎将、苍梧鬰林二郡太守，无任职年代，未详。'
    },
    {
      id: 'fz_wu_doc_182',
      startYear: null, endYear: 280,
      tenureText: '约280年（天纪四年）晋灭吴时在任',
      confidence: '确定',
      note: '《晋书·滕修传》：王师伐吴时，广州刺史闾丰、苍梧太守王毅各送印绶；到任年份未详。'
    },
    {
      id: 'fz_wu_doc_183',
      startYear: 210, endYear: 226,
      tenureText: '约210—226年（士氏领交州时期）',
      confidence: '推定',
      note: '《三国志·士燮传》：燮表壹领合浦太守；士燮附吴在建安十五年（210），卒于黄武五年（226）。'
    },
    {
      id: 'fz_wu_doc_184',
      startYear: 210, endYear: 230,
      tenureText: '约210—230年',
      confidence: '推定',
      note: '《三国志·薛综传》：士燮既附孙权，除合浦、交阯太守；吕岱征交州时俱行，事毕还都。'
    },
    {
      id: 'fz_wu_doc_186',
      startYear: 210, endYear: 219,
      tenureText: '约210—219年',
      confidence: '较高',
      note: '《三国志·陆绩传》：孙权统事，辟为奏曹掾，出为郁林太守，加偏将军；卒年三十二，约建安二十四年（219）。'
    },
    {
      id: 'fz_wu_doc_187',
      startYear: null, endYear: 253,
      tenureText: '约252—253年（任命未上任）',
      confidence: '较高',
      appointmentStatus: '未上任',
      note: '《聂友传》：孙峻忌友，欲以为郁林太守，友发病忧死；孙峻辅政始于建兴元年（252）。'
    },
    {
      id: 'fz_wu_doc_188',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '《景定建康志》载史嵩仕吴为平越中郎将、苍梧鬰林二郡太守，无任职年代，未详。'
    },
    {
      id: 'fz_wu_doc_190',
      startYear: null, endYear: null,
      tenureText: '任期未详',
      confidence: '待考',
      note: '原档仅见“姚陶/旧”，无年代与出处依据，未详。'
    },
    {
      id: 'fz_wu_doc_191',
      startYear: 220, endYear: null,
      tenureText: '延康元年（220）任',
      confidence: '确定',
      note: '《三国志·吕岱传》：延康元年（220）吕岱为交州刺史，高凉贼帅钱博乞降，岱承制以博为高凉西部都尉。'
    },
    {
      id: 'fz_wu_doc_200',
      startYear: 263, endYear: 268,
      tenureText: '约263—268年',
      confidence: '推定',
      note: '泰始四年十月（268）晋军破古城，斩交州刺史刘俊；其接任约在永安六年（263）吕兴之乱后，原档亦作（？—268）。'
    },
    {
      id: 'fz_wu_doc_202',
      startYear: 271, endYear: 280,
      tenureText: '约271—280年',
      confidence: '较高',
      note: '《陶璜传》载孙皓以璜为使持节、都督交州诸军事、前将军、交州牧；原档作（271—？），吴亡于天纪四年（280）。'
    },
    {
      id: 'fz_wu_doc_203',
      startYear: 271, endYear: 280,
      tenureText: '约271—280年',
      confidence: '推定',
      note: '《陶璜传》以合浦太守脩允代之（交州刺史）；原档“（27？）”缺末位，按陶璜迁交州牧（271）至吴亡（280）推定。'
    },
    {
      id: 'fz_wu_doc_204',
      startYear: null, endYear: 280,
      tenureText: '？—280年（原档）',
      confidence: '待考',
      note: '原档作（？—280）；与修允代任交州刺史的记录并存，任期衔接仍未详。'
    },
    {
      id: 'fz_wu_doc_206',
      startYear: 264, endYear: 269,
      tenureText: '约264—269年（孙皓初）',
      confidence: '待考',
      note: '《襄阳耆旧记》称习温历长沙、武昌太守，选曹尚书，广州刺史；原文考据推断在264年置广州以后、薛莹代温理选曹（约269）之前。'
    },
    {
      id: 'fz_wu_doc_211',
      startYear: null, endYear: 280,
      tenureText: '约280年（天纪四年）在任',
      confidence: '确定',
      note: '《晋书·滕修传》：王师伐吴时，广州刺史闾丰、苍梧太守王毅各送印绶；到任年份未详。'
    }
  ];
})(window);
