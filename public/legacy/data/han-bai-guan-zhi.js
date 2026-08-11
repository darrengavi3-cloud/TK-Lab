/*
 * 东汉中央官署补录：以《后汉书·百官志》为一手来源入口。
 * 这里保存制度层节点，不把某一时期的任职人物直接写入官署定义。
 * 曹名、员额和具体任期存在阶段差异时，保留研究状态与说明。
 */
(function(global){
  'use strict';
  const source = Object.freeze({
    title:'《后汉书·百官志》',
    level:'一手史料',
    locator:'志·百官志（尚书台、御史台、将军及属官条）'
  });
  const common = {
    sourceTitle:source.title,
    sourceLevel:source.level,
    sourceLocator:source.locator,
    sourceExcerpt:'制度节点据《后汉书·百官志》整理；曹名、员额与任职沿革按时期另行核对。',
    researchStatus:'确定',
    confidence:'高',
    customTags:['东汉百官志补录']
  };
  function row(id,parent,name,category,extra){
    return Object.assign({id,parent,name,category},common,extra||{});
  }
  const records = [
    row('han_bgz_shangshu_tai','__root__','尚书台','尚书台省',{relationType:'制度并列',duty:'承受章奏、总领机要；属官与曹名随时期有损益。',note:'作为制度分组节点，不等同于单一任职席位。'}),
    row('han_bgz_shangshu_ling','尚书台','尚书令','尚书台省',{hanRank:'千石',duty:'总领纲纪，承受章奏，掌机要政务。',relationType:'固定直属'}),
    row('han_bgz_shangshu_pushe','尚书台','尚书仆射','尚书台省',{hanRank:'六百石',duty:'尚书台副贰，令缺时行台事。',relationType:'固定直属'}),
    row('han_bgz_shangshu_leftcheng','尚书台','尚书左丞','尚书台省',{hanRank:'四百石',duty:'掌台内禁令、文书与诸曹稽核。',relationType:'固定直属'}),
    row('han_bgz_shangshu_rightcheng','尚书台','尚书右丞','尚书台省',{hanRank:'四百石',duty:'掌台内文书、库藏及诸曹分案。',relationType:'固定直属'}),
    row('han_bgz_shangshu_sixcao','尚书台','尚书六曹','尚书台省',{hanRank:'六百石',duty:'分曹理事；曹名与员额按时期有损益。',relationType:'固定直属',note:'不把后世固定六部名称前移；具体曹名以同时期材料为准。'}),
    row('han_bgz_shangshu_lang','尚书台','尚书郎','尚书台省',{hanRank:'四百石',duty:'分曹掌章奏文书，员额与曹属随时期变化。',relationType:'固定直属'}),

    row('han_bgz_yushi_tai','__root__','御史台','御史台',{relationType:'制度并列',duty:'中央监察系统的制度分组节点；东汉以御史中丞领台务。',note:'不将御史台误写为后世固定台院编制。'}),
    row('han_bgz_yushi_zhongcheng','御史台','御史中丞','御史台',{hanRank:'千石',duty:'内领侍御史，外督部刺史，受公卿奏事并纠察百官。',relationType:'固定直属'}),
    row('han_bgz_shiyushi','御史台','侍御史','御史台',{duty:'奉使察举、按劾与治书；具体员额和分掌按时期核对。',relationType:'固定直属',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_zhishu_shiyushi','御史台','治书侍御史','御史台',{duty:'参与治书、按劾等监察事务。',relationType:'固定直属',researchStatus:'推定',confidence:'中',note:'名称与置废存在阶段差异，暂以制度条目保留。'}),

    row('han_bgz_jiangjunfu','__root__','中央将军系统','将军武职',{relationType:'制度并列',duty:'统摄中央与方面军职的展示分组；具体将军号多为授任而非固定常设官署。',note:'将军号、将军府属官和都督职任分层展示。'}),
    row('han_bgz_dajiangjun','中央将军系统','大将军','大将军／大司马',{hanRank:'万石',duty:'统领诸军，位次与职权随时期和加官变化。',relationType:'制度并列'}),
    row('han_bgz_piaoqi','中央将军系统','骠骑将军','将军武职',{hanRank:'万石',duty:'高级统兵将军号，是否常置依时期与任命而定。',relationType:'制度并列',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_juqi','中央将军系统','车骑将军','将军武职',{hanRank:'万石',duty:'高级统兵将军号，是否常置依时期与任命而定。',relationType:'制度并列',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_weijiangjun','中央将军系统','卫将军','将军武职',{hanRank:'万石',duty:'中央与方面军职，具体任命须按人物传记核对。',relationType:'制度并列',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_qianhouzuoyou','中央将军系统','前后左右将军','将军武职',{hanRank:'中二千石',duty:'重号将军序列；作为制度总括项，不代表同一时期四职同时设置。',relationType:'制度并列',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_sizheng','中央将军系统','四征将军','将军武职',{hanRank:'中二千石',duty:'征东、征西、征南、征北等方面军职，通常与具体战区任命相关。',relationType:'制度并列',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_sizhen','中央将军系统','四镇将军','将军武职',{hanRank:'中二千石',duty:'镇东、镇西、镇南、镇北等方面军职，设置与任命依时期核对。',relationType:'制度并列',researchStatus:'推定',confidence:'中'}),
    row('han_bgz_sian','中央将军系统','四安四平将军','将军武职',{duty:'安东、安西、安南、安北及平东、平西、平南、平北等号的制度索引。',relationType:'制度并列',researchStatus:'存疑',confidence:'低',note:'不同将军号的正式设置年代和是否常置，需逐条回查本纪、列传。'}),
    row('han_bgz_zhonglang','中央将军系统','中郎将系统','将军武职',{duty:'五官、左、右、虎贲、羽林及方面中郎将等，按任命与禁卫系统分列。',relationType:'制度并列',researchStatus:'确定'}),
    row('han_bgz_xiaowei','中央将军系统','校尉系统','将军武职',{duty:'禁卫、屯戍与专门军职校尉，具体名称与置废按时期核对。',relationType:'制度并列',researchStatus:'确定'})
  ];
  global.SGZ_HAN_BAI_GUAN_ZHI = Object.freeze({schemaVersion:1,source:Object.freeze(source),records:Object.freeze(records)});
})(window);
