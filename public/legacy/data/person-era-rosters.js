/*
 * 时期官员录：用于人物记的来源型履历，不直接改写职官谱的制度节点。
 * 文章本身注明有推定、疑是与未详条目；status/confidence 必须随记录保留。
 */
(function(global){
  'use strict';
  const sourceWu = {
    title:'知乎：吴亡前夕官员录',
    url:'https://zhuanlan.zhihu.com/p/581659534',
    level:'文档考据'
  };
  const sourceShu = {
    title:'知乎：蜀亡前夕官员录',
    url:'https://zhuanlan.zhihu.com/p/585750316',
    level:'文档考据'
  };
  const sourceWeiDuke213 = {
    title:'知乎：汉献帝建安十八年魏公国肇建，汉朝廷百官梳理',
    url:'https://zhuanlan.zhihu.com/p/586247272',
    level:'文档考据',
    primarySources:['《三国志·武帝纪》','《三国志·华歆传》','《三国志·卫臻传》','《三国志·刘璋传》','《献帝起居注》'],
    note:'以建安十八年魏公国肇建为断面；魏公国官署与汉廷残余官署分列，转任、行兼与撤并时点保留原文状态。'
  };
  const sourceHanEnd220 = {
    title:'知乎：汉献帝延康元年曹丕践祚前，汉廷末代公卿百官梳理',
    url:'https://zhuanlan.zhihu.com/p/586525188',
    level:'文档考据',
    primarySources:['《三国志·文帝纪》','《三国志·卫觊传》','《文心雕龙·诏策篇》','《三国志·吴主传》'],
    note:'以延康元年曹丕受禅前的汉廷为断面；九卿中无人名的官职保留“未详”，不将疑为魏官的条目强行归入汉廷。'
  };
  function row(id, source, polity, phase, person, role, extra){
    return Object.assign({
      id, source:'eraRoster', polity, phase, person, role,
      status:'确定', confidence:'推定', sourceTitle:source.title,
      sourceUrl:source.url, sourceLevel:source.level,
      sourceExcerpt:source.note||'文章为时期官员整理，作者明确提示部分任期、职名或人物存在待考。'
    }, extra||{});
  }
  function officeSnapshot(id, source, polity, phase, office, holder, extra){
    return Object.assign({
      id, source:'officeSnapshot', polity, phase, office, holder,
      status:'未详', confidence:'存疑', sourceTitle:source.title,
      sourceUrl:source.url, sourceLevel:source.level,
      sourceExcerpt:source.note||'官职见于时期名录，但未具名或任期尚待考。'
    }, extra||{});
  }
  const officeSnapshots = [
    officeSnapshot('wei_duke_213_chancellor',sourceWeiDuke213,'魏','建安十八年·魏公国','丞相','曹操',{status:'确定',confidence:'确定',sortOrder:10,sourceExcerpt:'《三国志·武帝纪》载：魏国置丞相已下群卿百寮。魏公国丞相为曹操。'}),
    officeSnapshot('wei_duke_213_wuguan',sourceWeiDuke213,'魏','建安十八年·魏公国','五官中郎将','曹丕',{status:'确定',confidence:'确定',sortOrder:20,sourceExcerpt:'曹丕自建安十六年为五官中郎将，官属为丞相副。'}),
    officeSnapshot('wei_duke_213_shangshu',sourceWeiDuke213,'魏','建安十八年·魏公国','尚书令','华歆',{status:'确定',confidence:'推定',sortOrder:30}),
    officeSnapshot('wei_duke_213_shangshu_youcheng',sourceWeiDuke213,'魏','建安十八年·魏公国','尚书右丞','潘勖',{status:'推定',confidence:'推定',sortOrder:31}),
    officeSnapshot('wei_duke_213_taizhong',sourceWeiDuke213,'魏','建安十八年·魏公国','太中大夫','贾诩',{status:'推定',confidence:'推定',sortOrder:40,note:'《贾诩传》明确记曹操以魏郡太守召为太中大夫；是否已完全改属魏公国官署，文章按转魏处理。'}),
    officeSnapshot('wei_duke_213_yilang_tianchou',sourceWeiDuke213,'魏','建安十八年·魏公国','议郎','田畴',{status:'推定',confidence:'推定',sortOrder:50}),
    officeSnapshot('wei_duke_213_yilang_xinpi',sourceWeiDuke213,'魏','建安十八年·魏公国','议郎','辛毗',{status:'推定',confidence:'推定',sortOrder:50}),
    officeSnapshot('wei_duke_213_zhenwei',sourceWeiDuke213,'魏','建安十八年·魏公国','振威将军','刘璋',{status:'确定',confidence:'推定',sortOrder:60}),
    officeSnapshot('wei_duke_213_pingkou',sourceWeiDuke213,'魏','建安十八年·魏公国','平寇将军','刘瑁',{status:'推定',confidence:'推定',sortOrder:60}),
    officeSnapshot('han_213_yushi',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','御史大夫','郗虑',{status:'确定',confidence:'确定',sortOrder:10}),
    officeSnapshot('han_213_huangmen',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','黄门侍郎','卫臻',{status:'推定',confidence:'推定',sortOrder:30}),
    officeSnapshot('han_213_jishihuangmen',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','给事黄门侍郎兼侍中','刘瞻',{status:'确定',confidence:'推定',sortOrder:30}),
    officeSnapshot('han_213_taichang',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','行太常','王邑',{status:'确定',confidence:'推定',sortOrder:40}),
    officeSnapshot('han_213_dasinong',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','大司农','王邑',{status:'确定',confidence:'推定',sortOrder:40}),
    officeSnapshot('han_213_guangluxun',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','光禄勋','蒯越',{status:'推定',confidence:'推定',sortOrder:40}),
    officeSnapshot('han_213_zongzheng',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','宗正','刘艾',{status:'确定',confidence:'推定',sortOrder:40}),
    officeSnapshot('han_213_taipu',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','太仆','韦端',{status:'存疑',confidence:'存疑',sortOrder:40,note:'文章注明入任时点未详。'}),
    officeSnapshot('han_213_sili',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','司隶校尉','钟繇',{status:'待考',confidence:'存疑',sortOrder:20,note:'建安十八年省幽州、并州及司隶校尉，钟繇的迁转与撤并时点不能视为稳定任职。'}),
    officeSnapshot('han_220_chancellor',sourceHanEnd220,'汉','延康元年·曹丕践祚前','丞相','曹丕',{status:'推定',confidence:'推定',sortOrder:10,note:'曹操薨后由曹丕承丞相职，旋即受禅；具体衔接时点按文章处理。'}),
    officeSnapshot('han_220_yushi',sourceHanEnd220,'汉','延康元年·曹丕践祚前','兼御史大夫','张音',{status:'确定',confidence:'确定',sortOrder:20}),
    officeSnapshot('han_220_taichang',sourceHanEnd220,'汉','延康元年·曹丕践祚前','太常','张音',{status:'确定',confidence:'确定',sortOrder:40}),
    officeSnapshot('han_220_shangshuling',sourceHanEnd220,'汉','延康元年·曹丕践祚前','守尚书令','卫觊',{status:'确定',confidence:'确定',sortOrder:30}),
    officeSnapshot('han_220_shangshulang',sourceHanEnd220,'汉','延康元年·曹丕践祚前','侍郎','卫觊',{status:'确定',confidence:'推定',sortOrder:31}),
    officeSnapshot('han_220_shizhong',sourceHanEnd220,'汉','延康元年·曹丕践祚前','侍中','卫觊',{status:'确定',confidence:'推定',sortOrder:32}),
    officeSnapshot('han_220_huangmen',sourceHanEnd220,'汉','延康元年·曹丕践祚前','黄门侍郎','卫臻',{status:'推定',confidence:'存疑',sortOrder:33,note:'文章援引建安中卫臻任黄门侍郎，延康元年具体是否仍在任需回查。'}),
    officeSnapshot('han_220_guangluxun_unknown',sourceHanEnd220,'汉','延康元年·曹丕践祚前','光禄勋','未详',{sortOrder:40}),
    officeSnapshot('han_220_weiyu_unknown',sourceHanEnd220,'汉','延康元年·曹丕践祚前','卫尉','未详',{sortOrder:40}),
    officeSnapshot('han_220_taipu_unknown',sourceHanEnd220,'汉','延康元年·曹丕践祚前','太仆','未详',{sortOrder:40}),
    officeSnapshot('han_220_tingwei_unknown',sourceHanEnd220,'汉','延康元年·曹丕践祚前','廷尉','未详',{sortOrder:40}),
    officeSnapshot('han_220_dahonglu_unknown',sourceHanEnd220,'汉','延康元年·曹丕践祚前','大鸿胪','未详',{sortOrder:40}),
    officeSnapshot('han_220_zongzheng_unknown',sourceHanEnd220,'汉','延康元年·曹丕践祚前','宗正','未详',{sortOrder:40}),
    officeSnapshot('han_220_dasinong_unknown',sourceHanEnd220,'汉','延康元年·曹丕践祚前','大司农','未详',{sortOrder:40}),
    officeSnapshot('han_220_shaofu_unknown',sourceHanEnd220,'汉','延康元年·曹丕践祚前','少府','未详',{sortOrder:40}),
    officeSnapshot('han_220_zhijinwu_unknown',sourceHanEnd220,'汉','延康元年·曹丕践祚前','执金吾','未详',{sortOrder:40})
  ];
  const records = [
    row('wei_213_cao_cao',sourceWeiDuke213,'魏','建安十八年·魏公国','曹操','丞相',{startYear:213,endYear:220,confidence:'确定',sourceExcerpt:'《三国志·武帝纪》：魏国置丞相已下群卿百寮；魏公国丞相为曹操。'}),
    row('wei_213_cao_pi',sourceWeiDuke213,'魏','建安十八年·魏公国','曹丕','五官中郎将（丞相副）',{startYear:211,endYear:220,confidence:'确定',sourceExcerpt:'《三国志·武帝纪》载曹丕为五官中郎将，官属为丞相副。'}),
    row('wei_213_hua_xin',sourceWeiDuke213,'魏','建安十八年·魏公国肇建后','华歆','御史大夫',{startYear:213,endYear:220,confidence:'推定',sourceExcerpt:'《三国志·华歆传》：魏国既建，拜御史大夫。'}),
    row('wei_213_pan_xu',sourceWeiDuke213,'魏','建安十八年·魏公国','潘勖','尚书右丞',{startYear:213,endYear:214,confidence:'推定',status:'推定',sourceExcerpt:'《文章志》所见潘勖由尚书郎迁右丞，并为魏公国策命文书执笔者。'}),
    row('wei_213_jia_xu',sourceWeiDuke213,'魏','建安十八年·魏公国','贾诩','太中大夫',{startYear:213,endYear:220,confidence:'推定',status:'推定',note:'《三国志·贾诩传》明确记曹操以魏郡太守召为太中大夫；转魏公国官署的制度归属保留推定。'}),
    row('wei_213_tian_chou',sourceWeiDuke213,'魏','建安十八年·魏公国','田畴','议郎',{startYear:213,endYear:220,confidence:'推定',status:'推定'}),
    row('wei_213_xin_pi',sourceWeiDuke213,'魏','建安十八年·魏公国','辛毗','议郎',{startYear:213,endYear:220,confidence:'推定',status:'推定'}),
    row('wei_213_liu_zhang',sourceWeiDuke213,'魏','建安十八年·魏公国','刘璋','振威将军',{startYear:213,endYear:214,confidence:'推定',sourceExcerpt:'《三国志·刘璋传》：曹操加刘璋振威将军，其弟刘瑁平寇将军。'}),
    row('wei_213_liu_mao',sourceWeiDuke213,'魏','建安十八年·魏公国','刘瑁','平寇将军',{startYear:213,endYear:214,confidence:'推定',status:'推定'}),
    row('han_213_xi_lv',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','郗虑','御史大夫',{startYear:213,endYear:213,confidence:'确定',sourceExcerpt:'《三国志·武帝纪》：汉使御史大夫郗虑持节策命曹操为魏公。'}),
    row('han_213_wei_zhen',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','卫臻','黄门侍郎',{startYear:213,endYear:213,confidence:'推定',status:'推定'}),
    row('han_213_liu_zhan',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','刘瞻','给事黄门侍郎兼侍中',{startYear:213,endYear:213,confidence:'推定',sourceExcerpt:'《献帝起居注》载建安十八年正月刘瞻以给事黄门侍郎兼侍中。'}),
    row('han_213_wang_yi_taichang',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','王邑','行太常',{startYear:213,endYear:213,confidence:'推定',status:'推定'}),
    row('han_213_wang_yi_dasinong',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','王邑','大司农',{startYear:213,endYear:213,confidence:'推定',status:'推定',note:'与行太常并见，保留兼行性质。'}),
    row('han_213_kuai_yue',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','蒯越','光禄勋',{startYear:213,endYear:214,confidence:'推定',status:'推定',note:'蒯越建安十九年卒，具体入任与任期按文章保留推定。'}),
    row('han_213_liu_ai',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','刘艾','宗正',{startYear:213,endYear:216,confidence:'推定',status:'推定'}),
    row('han_213_wei_duan',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','韦端','太仆',{startYear:213,endYear:213,confidence:'存疑',status:'待考',note:'文章明确提示韦端入任时点未详。'}),
    row('han_213_zhong_you',sourceWeiDuke213,'汉','建安十八年·汉廷残余官署','钟繇','司隶校尉',{startYear:213,endYear:213,confidence:'存疑',status:'待考',note:'建安十八年省司隶校尉，钟繇迁转与撤并时点不能视为稳定任职。'}),
    row('han_220_cao_cao',sourceHanEnd220,'汉','延康元年·曹丕践祚前','曹操','丞相（薨）',{startYear:220,endYear:220,confidence:'确定',sourceExcerpt:'《三国志·文帝纪》以曹操薨后曹丕承继政治权力，旋即受汉禅。'}),
    row('han_220_cao_pi',sourceHanEnd220,'汉','延康元年·曹丕践祚前','曹丕','丞相',{startYear:220,endYear:220,confidence:'推定',status:'推定',note:'曹操薨后至受禅前的衔接职任，按文章保留推定。'}),
    row('han_220_zhang_yin_yushi',sourceHanEnd220,'汉','延康元年·曹丕践祚前','张音','兼御史大夫',{startYear:220,endYear:220,confidence:'确定',sourceExcerpt:'《三国志·文帝纪》载张音兼御史大夫。'}),
    row('han_220_zhang_yin_taichang',sourceHanEnd220,'汉','延康元年·曹丕践祚前','张音','太常',{startYear:220,endYear:220,confidence:'确定'}),
    row('han_220_wei_ji_shangshu',sourceHanEnd220,'汉','延康元年·曹丕践祚前','卫觊','守尚书令',{startYear:220,endYear:220,confidence:'确定',sourceExcerpt:'《三国志·卫觊传》及《文心雕龙·诏策篇》可互证卫觊在禅代前后掌尚书文书。'}),
    row('han_220_wei_ji_shilang',sourceHanEnd220,'汉','延康元年·曹丕践祚前','卫觊','侍郎',{startYear:220,endYear:220,confidence:'推定',status:'推定'}),
    row('han_220_wei_ji_shizhong',sourceHanEnd220,'汉','延康元年·曹丕践祚前','卫觊','侍中',{startYear:220,endYear:220,confidence:'推定',status:'推定'}),
    row('han_220_wei_zhen',sourceHanEnd220,'汉','延康元年·曹丕践祚前','卫臻','黄门侍郎',{startYear:220,endYear:220,confidence:'存疑',status:'待考',note:'文章仅据建安中任职推及延康元年，是否仍在任需回查。'}),
    row('wu_220_sun_quan',sourceHanEnd220,'吴','延康元年·汉廷授官（吴将）','孙权','汉骠骑将军',{startYear:219,endYear:220,confidence:'确定',officePolity:'汉',sourceExcerpt:'《三国志·吴主传》：建安二十四年十二月，汉廷拜孙权为骠骑将军。'}),
    row('wu_end_zhangti',sourceWu,'吴','吴亡前夕','张悌','丞相',{startYear:280,endYear:280,confidence:'确定'}),
    row('wu_end_zhugejing',sourceWu,'吴','吴亡前夕','诸葛靓','大司马',{startYear:280,endYear:280,confidence:'推定',status:'存疑'}),
    row('wu_end_he_zhi',sourceWu,'吴','吴亡前夕','何植','司徒',{startYear:280,endYear:280,confidence:'推定'}),
    row('wu_end_daichang',sourceWu,'吴','吴亡前夕','戴昌','太尉',{startYear:280,endYear:280,confidence:'存疑',status:'待考'}),
    row('wu_end_zhangkui',sourceWu,'吴','吴亡前夕','张夔','太常',{startYear:280,endYear:280}),
    row('wu_end_cenhung',sourceWu,'吴','吴亡前夕','岑昏','卫尉',{startYear:280,endYear:280}),
    row('wu_end_xueying',sourceWu,'吴','吴亡前夕','薛莹','光禄勋',{startYear:280,endYear:280}),
    row('wu_end_luwei',sourceWu,'吴','吴亡前夕','陆隗','谏议大夫',{startYear:280,endYear:280}),
    row('wu_end_hanjian',sourceWu,'吴','吴亡前夕','韩建','大鸿胪',{startYear:280,endYear:280}),
    row('wu_end_yubing',sourceWu,'吴','吴亡前夕','虞昺','廷尉',{startYear:280,endYear:280}),
    row('wu_end_ludan',sourceWu,'吴','吴亡前夕','陆澹','御史中丞',{startYear:280,endYear:280}),
    row('wu_end_huchong',sourceWu,'吴','吴亡前夕','胡冲','中书令',{startYear:280,endYear:280}),
    row('wu_end_niushu',sourceWu,'吴','吴亡前夕','纽淑','尚书令',{startYear:280,endYear:280}),
    row('wu_end_quxu',sourceWu,'吴','吴亡前夕','屈绪','尚书仆射',{startYear:280,endYear:280}),
    row('wu_end_xuejian',sourceWu,'吴','吴亡前夕','薛兼','选曹尚书',{startYear:280,endYear:280}),
    row('wu_end_zhouchu',sourceWu,'吴','吴亡前夕','周处','兰台东观令',{startYear:280,endYear:280}),
    row('wu_end_chentuo',sourceWu,'吴','吴亡前夕','陈卓','太史令',{startYear:280,endYear:280}),
    row('wu_end_gurong',sourceWu,'吴','吴亡前夕','顾荣','黄门侍郎',{startYear:280,endYear:280}),
    row('wu_end_wuzhan',sourceWu,'吴','吴亡前夕','吴展','吴郡太守',{startYear:280,endYear:280,jurisdiction:'吴郡'}),
    row('wu_end_shenying',sourceWu,'吴','吴亡前夕','沈莹','丹阳太守',{startYear:280,endYear:280,jurisdiction:'丹阳郡'}),
    row('wu_end_taojun',sourceWu,'吴','吴亡前夕','陶濬','徐陵督',{startYear:280,endYear:280,jurisdiction:'徐陵'}),
    row('wu_end_luyi',sourceWu,'吴','吴亡前夕','陆祎','丞相',{startYear:279,endYear:279,confidence:'存疑',status:'待考',note:'碑刻材料所见，文章认为年代与官职仍需校核。'}),

    row('shu_end_zhangjun',sourceShu,'汉','蜀亡前夕','张峻','太常',{startYear:263,endYear:263}),
    row('shu_end_yinzong',sourceShu,'汉','蜀亡前夕','尹宗','太常博士',{startYear:263,endYear:263}),
    row('shu_end_jiangxian',sourceShu,'汉','蜀亡前夕','蒋显','太仆',{startYear:263,endYear:263,confidence:'存疑',status:'待考'}),
    row('shu_end_xiangtiao',sourceShu,'汉','蜀亡前夕','向条','御史中丞',{startYear:263,endYear:263}),
    row('shu_end_qiaozhou',sourceShu,'汉','蜀亡前夕','谯周','光禄大夫',{startYear:263,endYear:263}),
    row('shu_end_fanjian',sourceShu,'汉','蜀亡前夕','樊建','尚书令',{startYear:263,endYear:263}),
    row('shu_end_zhangshao',sourceShu,'汉','蜀亡前夕','张绍','尚书仆射',{startYear:263,endYear:263}),
    row('shu_end_weiji',sourceShu,'汉','蜀亡前夕','卫继','选部尚书',{startYear:263,endYear:263}),
    row('shu_end_huanghao',sourceShu,'汉','蜀亡前夕','黄皓','中常侍',{startYear:263,endYear:263}),
    row('shu_end_xiangchong',sourceShu,'汉','蜀亡前夕','向充','尚书',{startYear:263,endYear:263,confidence:'推定'}),
    row('shu_end_qiezheng',sourceShu,'汉','蜀亡前夕','郤正','秘书令',{startYear:263,endYear:263}),
    row('shu_end_jiangwei',sourceShu,'汉','蜀亡前夕','姜维','大将军、录尚书事',{startYear:263,endYear:263}),
    row('shu_end_liaohua',sourceShu,'汉','蜀亡前夕','廖化','右车骑将军',{startYear:263,endYear:263}),
    row('shu_end_zhangyi',sourceShu,'汉','蜀亡前夕','张翼','左车骑将军',{startYear:263,endYear:263}),
    row('shu_end_dongjue',sourceShu,'汉','蜀亡前夕','董厥','辅国大将军、录尚书事',{startYear:263,endYear:263}),
    row('shu_end_zhugezhan',sourceShu,'汉','蜀亡前夕','诸葛瞻','行都护卫将军',{startYear:263,endYear:263}),
    row('shu_end_zongyu',sourceShu,'汉','蜀亡前夕','宗预','镇军大将军',{startYear:263,endYear:263}),
    row('shu_end_yanyu',sourceShu,'汉','蜀亡前夕','阎宇','右大将军',{startYear:263,endYear:263,confidence:'存疑',status:'待考'}),
    row('shu_end_huo_yi',sourceShu,'汉','蜀亡前夕','霍弋','安南将军',{startYear:263,endYear:263,jurisdiction:'南中／交州边地'}),
    row('shu_end_luoyin',sourceShu,'汉','蜀亡前夕','柳隐','黄金督',{startYear:263,endYear:263,jurisdiction:'黄金'}),
    row('shu_end_fu_qian',sourceShu,'汉','蜀亡前夕','傅佥','阳平关督',{startYear:263,endYear:263,jurisdiction:'阳平关'}),
    row('shu_end_jiangbin',sourceShu,'汉','蜀亡前夕','蒋斌','汉城督',{startYear:263,endYear:263,jurisdiction:'汉城'}),
    row('shu_end_luo_xian',sourceShu,'汉','蜀亡前夕','罗宪','巴东太守',{startYear:263,endYear:263,jurisdiction:'巴东郡'}),
    row('shu_end_yangzong',sourceShu,'汉','蜀亡前夕','杨宗','巴东参军',{startYear:263,endYear:263,jurisdiction:'巴东郡'}),
    row('shu_end_lixiang',sourceShu,'汉','蜀亡前夕','李骧','广汉太守',{startYear:263,endYear:263,jurisdiction:'广汉郡'}),
    row('shu_end_luya',sourceShu,'汉','蜀亡前夕','吕雅','谒者',{startYear:263,endYear:263}),
    row('shu_end_chenshou',sourceShu,'汉','蜀亡前夕','陈寿','观阁令史',{startYear:263,endYear:263})
  ];
  global.SGZ_PERSON_ERA_ROSTERS=Object.freeze({
    schemaVersion:2,
    sources:Object.freeze({wu:sourceWu,shu:sourceShu,weiDuke213:sourceWeiDuke213,hanEnd220:sourceHanEnd220}),
    officeSnapshots:Object.freeze(officeSnapshots),
    records:Object.freeze(records)
  });
})(window);
