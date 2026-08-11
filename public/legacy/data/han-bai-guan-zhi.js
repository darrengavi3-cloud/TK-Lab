/*
 * 东汉中央官署补录：以《后汉书》卷114—118《百官志》为一手来源入口。
 * 隐藏的台府节点只承担树形归属和证据分组；朝堂界面只展示具体官职。
 */
(function(global){
  'use strict';
  const source = Object.freeze({
    title:'《后汉书·百官志》',
    level:'一手史料',
    locator:'卷114—118（百官一—五）',
    url:'https://zh.wikisource.org/zh-hans/後漢書/卷114'
  });
  const common = {
    sourceTitle:source.title,
    sourceLevel:source.level,
    sourceLocator:source.locator,
    sourceUrl:source.url,
    sourceExcerpt:'制度节点据《后汉书》卷114—118《百官志》整理；将军号、曹名和员额存在时期差异时，保留具体说明与研究状态。',
    researchStatus:'确定',
    confidence:'高',
    customTags:['东汉百官志补录']
  };
  function row(id,parent,name,category,extra){
    return Object.assign({id,parent,name,category},common,extra||{});
  }
  const records = [
    // 台府锚点只用于树形归属，不作为朝堂席位。
    row('han_bgz_shangshu_tai','__root__','尚书台','尚书台省',{hidden:true,relationType:'制度并列',duty:'承受章奏、总领机要；属官与曹名随时期有损益。',note:'隐藏制度分组节点；具体席位见尚书令、尚书仆射、尚书郎等。'}),
    row('han_bgz_shangshu_ling','尚书台','尚书令','尚书台省',{hanRank:'千石',sortOrder:210,duty:'总领纲纪，承受章奏，掌机要政务。',relationType:'固定直属'}),
    row('han_bgz_shangshu_pushe','尚书台','尚书仆射','尚书台省',{hanRank:'六百石',sortOrder:220,duty:'尚书台副贰，令缺时行台事。',relationType:'固定直属'}),
    row('han_bgz_shangshu_li','尚书台','吏曹尚书','尚书台省',{hanRank:'六百石',sortOrder:221,duty:'分掌吏曹事务。',relationType:'分曹属官',researchStatus:'存疑',confidence:'中',note:'《后汉书》明载尚书六人六百石；曹名因时期有变，本名作为晚汉分曹索引，不前移后世吏部尚书。'}),
    row('han_bgz_shangshu_sangong','尚书台','三公曹尚书','尚书台省',{hanRank:'六百石',sortOrder:222,duty:'分掌三公曹事务。',relationType:'分曹属官',researchStatus:'存疑',confidence:'中',note:'曹名按晚汉分曹传统整理，具体置废与人员仍须逐年核对。'}),
    row('han_bgz_shangshu_min','尚书台','民曹尚书','尚书台省',{hanRank:'六百石',sortOrder:223,duty:'分掌民曹事务。',relationType:'分曹属官',researchStatus:'存疑',confidence:'中',note:'曹名按晚汉分曹传统整理，具体置废与人员仍须逐年核对。'}),
    row('han_bgz_shangshu_erqianshi','尚书台','二千石曹尚书','尚书台省',{hanRank:'六百石',sortOrder:224,duty:'分掌二千石曹事务。',relationType:'分曹属官',researchStatus:'存疑',confidence:'中',note:'曹名按晚汉分曹传统整理，具体置废与人员仍须逐年核对。'}),
    row('han_bgz_shangshu_nanzhuke','尚书台','南主客曹尚书','尚书台省',{hanRank:'六百石',sortOrder:225,duty:'分掌南主客曹事务。',relationType:'分曹属官',researchStatus:'存疑',confidence:'中',note:'曹名按晚汉分曹传统整理，具体置废与人员仍须逐年核对。'}),
    row('han_bgz_shangshu_beizhuke','尚书台','北主客曹尚书','尚书台省',{hanRank:'六百石',sortOrder:226,duty:'分掌北主客曹事务。',relationType:'分曹属官',researchStatus:'存疑',confidence:'中',note:'曹名按晚汉分曹传统整理，具体置废与人员仍须逐年核对。'}),
    row('han_bgz_shangshu_leftcheng','尚书台','尚书左丞','尚书台省',{hanRank:'四百石',sortOrder:230,duty:'掌台内禁令、文书与诸曹稽核。',relationType:'固定直属'}),
    row('han_bgz_shangshu_rightcheng','尚书台','尚书右丞','尚书台省',{hanRank:'四百石',sortOrder:231,duty:'掌台内文书、库藏及诸曹分案。',relationType:'固定直属'}),
    row('han_bgz_shangshu_lang','尚书台','尚书郎','尚书台省',{hanRank:'四百石',sortOrder:232,duty:'分曹掌章奏文书。',relationType:'固定直属',note:'《后汉书》卷115载侍郎三十六人、四百石；“尚书郎”作为项目展示名，避免与后世郎官体系混同。'}),
    row('han_bgz_shangshu_lingshi','尚书台','尚书令史','尚书台省',{hanRank:'二百石',sortOrder:240,duty:'掌诸曹文书案牍。',relationType:'固定直属',researchStatus:'确定',confidence:'高',note:'具体秩俸按《后汉书》卷115令史条核对。'}),

    row('han_bgz_yushi_tai','__root__','御史台','御史台',{hidden:true,relationType:'制度并列',duty:'中央监察系统的制度分组节点；东汉以御史中丞领台务。',note:'隐藏制度分组节点；具体席位见御史中丞、治书侍御史、侍御史。'}),
    row('han_bgz_yushi_zhongcheng','御史台','御史中丞','御史台',{hanRank:'千石',sortOrder:310,duty:'内领侍御史，外督部刺史，受公卿奏事并纠察百官。',relationType:'固定直属'}),
    row('han_bgz_zhishu_shiyushi','御史台','治书侍御史','御史台',{hanRank:'六百石',sortOrder:320,duty:'掌治书、按劾等监察事务。',relationType:'固定直属',researchStatus:'确定',confidence:'高'}),
    row('han_bgz_shiyushi','御史台','侍御史','御史台',{hanRank:'六百石',sortOrder:321,duty:'奉使察举、按劾；《后汉书》卷115载员十五人。',relationType:'固定直属',researchStatus:'确定',confidence:'高'}),

    row('han_bgz_jiangjunfu','__root__','将军府','将军武职',{hidden:true,relationType:'制度并列',duty:'统摄中央与方面军职的展示分组；具体将军号多为授任而非固定常设官署。',note:'隐藏制度分组节点；朝堂界面只展示具体将军号。'}),
    row('han_bgz_dajiangjun','将军府','大将军','将军武职',{hanRank:'比公、位在三公上',sortOrder:100,duty:'统领诸军，位在三公上；设置与权力随时期和任命变化。',relationType:'重号将军'}),
    row('han_bgz_piaoqi','将军府','骠骑将军','将军武职',{hanRank:'比公',sortOrder:110,duty:'重号统兵将军，位次大将军。',relationType:'重号将军'}),
    row('han_bgz_juqi','将军府','车骑将军','将军武职',{hanRank:'比公',sortOrder:120,duty:'重号统兵将军，位次骠骑将军。',relationType:'重号将军'}),
    row('han_bgz_weijiangjun','将军府','卫将军','将军武职',{hanRank:'比公',sortOrder:130,duty:'重号将军，位次车骑将军。',relationType:'重号将军'}),
    row('han_bgz_qianjiangjun','将军府','前将军','将军武职',{hanRank:'位次上卿',sortOrder:140,duty:'前、后、左、右将军之一，具体设置随时期和任命变化。',relationType:'重号将军'}),
    row('han_bgz_houjiangjun','将军府','后将军','将军武职',{hanRank:'位次上卿',sortOrder:141,duty:'前、后、左、右将军之一，具体设置随时期和任命变化。',relationType:'重号将军'}),
    row('han_bgz_zuojiangjun','将军府','左将军','将军武职',{hanRank:'位次上卿',sortOrder:142,duty:'前、后、左、右将军之一，具体设置随时期和任命变化。',relationType:'重号将军'}),
    row('han_bgz_youjiangjun','将军府','右将军','将军武职',{hanRank:'位次上卿',sortOrder:143,duty:'前、后、左、右将军之一，具体设置随时期和任命变化。',relationType:'重号将军'}),
    row('han_bgz_zhengdong','将军府','征东将军','将军武职',{hanRank:'中二千石',sortOrder:150,duty:'东方方面军职，具体任命与置年按人物传记核对。',relationType:'方面将军',researchStatus:'推定',confidence:'中',note:'《后汉书》卷114列前后左右将军，而征四方将军号为后汉军职沿革中的方面任命，非卷114固定常置。'}),
    row('han_bgz_zhengxi','将军府','征西将军','将军武职',{hanRank:'中二千石',sortOrder:151,duty:'西方方面军职，具体任命与置年按人物传记核对。',relationType:'方面将军',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_zhengnan','将军府','征南将军','将军武职',{hanRank:'中二千石',sortOrder:152,duty:'南方方面军职，具体任命与置年按人物传记核对。',relationType:'方面将军',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_zhengbei','将军府','征北将军','将军武职',{hanRank:'中二千石',sortOrder:153,duty:'北方方面军职，具体任命与置年按人物传记核对。',relationType:'方面将军',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_zhendong','将军府','镇东将军','将军武职',{hanRank:'中二千石',sortOrder:160,duty:'东方方面军职，具体任命与置年按人物传记核对。',relationType:'方面将军',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_zhenxi','将军府','镇西将军','将军武职',{hanRank:'中二千石',sortOrder:161,duty:'西方方面军职，具体任命与置年按人物传记核对。',relationType:'方面将军',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_zhennan','将军府','镇南将军','将军武职',{hanRank:'中二千石',sortOrder:162,duty:'南方方面军职，具体任命与置年按人物传记核对。',relationType:'方面将军',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_zhenbei','将军府','镇北将军','将军武职',{hanRank:'中二千石',sortOrder:163,duty:'北方方面军职，具体任命与置年按人物传记核对。',relationType:'方面将军',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_andong','将军府','安东将军','将军武职',{sortOrder:170,duty:'东方方面军职，具体设置年代与秩次待逐条核对。',relationType:'方面将军',researchStatus:'存疑',confidence:'低'}),
    row('han_bgz_anxi','将军府','安西将军','将军武职',{sortOrder:171,duty:'西方方面军职，具体设置年代与秩次待逐条核对。',relationType:'方面将军',researchStatus:'存疑',confidence:'低'}),
    row('han_bgz_annan','将军府','安南将军','将军武职',{sortOrder:172,duty:'南方方面军职，具体设置年代与秩次待逐条核对。',relationType:'方面将军',researchStatus:'存疑',confidence:'低'}),
    row('han_bgz_北安','将军府','安北将军','将军武职',{sortOrder:173,duty:'北方方面军职，具体设置年代与秩次待逐条核对。',relationType:'方面将军',researchStatus:'存疑',confidence:'低'}),
    row('han_bgz_pingdong','将军府','平东将军','将军武职',{sortOrder:180,duty:'东方方面军职，具体设置年代与秩次待逐条核对。',relationType:'方面将军',researchStatus:'存疑',confidence:'低'}),
    row('han_bgz_pingxi','将军府','平西将军','将军武职',{sortOrder:181,duty:'西方方面军职，具体设置年代与秩次待逐条核对。',relationType:'方面将军',researchStatus:'存疑',confidence:'低'}),
    row('han_bgz_pingnan','将军府','平南将军','将军武职',{sortOrder:182,duty:'南方方面军职，具体设置年代与秩次待逐条核对。',relationType:'方面将军',researchStatus:'存疑',confidence:'低'}),
    row('han_bgz_pingbei','将军府','平北将军','将军武职',{sortOrder:183,duty:'北方方面军职，具体设置年代与秩次待逐条核对。',relationType:'方面将军',researchStatus:'存疑',confidence:'低'}),
    row('han_bgz_wuguan','将军府','五官中郎将','将军武职',{hanRank:'比二千石',sortOrder:190,duty:'主五官郎。',relationType:'中郎将',sourceLocator:'《后汉书》卷115·光禄勋'}),
    row('han_bgz_zuozhonglang','将军府','左中郎将','将军武职',{hanRank:'比二千石',sortOrder:191,duty:'统领左部中郎。',relationType:'中郎将',sourceLocator:'《后汉书》卷115·光禄勋'}),
    row('han_bgz_youzhonglang','将军府','右中郎将','将军武职',{hanRank:'比二千石',sortOrder:192,duty:'统领右部中郎。',relationType:'中郎将',sourceLocator:'《后汉书》卷115·光禄勋'}),
    row('han_bgz_huben','将军府','虎贲中郎将','将军武职',{hanRank:'比二千石',sortOrder:193,duty:'掌虎贲郎宿卫。',relationType:'中郎将',sourceLocator:'《后汉书》卷115·光禄勋'}),
    row('han_bgz_yulin','将军府','羽林中郎将','将军武职',{hanRank:'比二千石',sortOrder:194,duty:'掌羽林郎宿卫。',relationType:'中郎将',sourceLocator:'《后汉书》卷115·光禄勋'}),
    row('han_bgz_tunqi','将军府','屯骑校尉','将军武职',{hanRank:'比二千石',sortOrder:200,duty:'领屯骑。',relationType:'五校尉',sourceLocator:'《后汉书》卷117·百官四'}),
    row('han_bgz_yueqi','将军府','越骑校尉','将军武职',{hanRank:'比二千石',sortOrder:201,duty:'领越骑。',relationType:'五校尉',sourceLocator:'《后汉书》卷117·百官四'}),
    row('han_bgz_bubing','将军府','步兵校尉','将军武职',{hanRank:'比二千石',sortOrder:202,duty:'领步兵。',relationType:'五校尉',sourceLocator:'《后汉书》卷117·百官四'}),
    row('han_bgz_changshui','将军府','长水校尉','将军武职',{hanRank:'比二千石',sortOrder:203,duty:'领长水胡骑。',relationType:'五校尉',sourceLocator:'《后汉书》卷117·百官四'}),
    row('han_bgz_shesheng','将军府','射声校尉','将军武职',{hanRank:'比二千石',sortOrder:204,duty:'领射声士。',relationType:'五校尉',sourceLocator:'《后汉书》卷117·百官四'})
  ];
  global.SGZ_HAN_BAI_GUAN_ZHI = Object.freeze({schemaVersion:2,source:Object.freeze(source),records:Object.freeze(records)});
})(window);
