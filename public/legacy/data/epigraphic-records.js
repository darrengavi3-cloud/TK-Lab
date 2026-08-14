/*
 * 金石录：汉末至西晋（168—316）材料目录。
 *
 * 三份用户提供的金石录文档作为“文档考据”来源导入。polity 只使用项目
 * 统一国名“汉、魏、吴、晋”；原题中的蜀汉、曹魏、孙吴等称呼保留在
 * sourceDocument、yearText 或 note 中。材料归属不确定时保留记录并降级
 * 为“推定、存疑、争议”，不把出土墓葬年代直接等同于器物政权归属。
 */
(function(global){
  'use strict';

  const sourceDoc = Object.freeze({
    shu: '蜀汉金石录.docx',
    wu: '孙吴金石录.docx',
    wei: '魏金石录.docx'
  });

  function record(id, name, type, year, yearText, polity, extra){
    return Object.assign({
      id, name, type, year: Number.isFinite(year) ? year : null, yearText, polity,
      sourceLevel:'文档考据', confidence:'推定', researchStatus:'待补',
      sourceUrl:'', sourceLocator:'用户提供金石录文档',
      inscription:'', bibliography:'', media:'', people:'', offices:'',
      place:'', region:'', scriptStyle:'隶书', form:'', disputeNote:'', note:'',
      archiveKind:'核心', sourceDocument:''
    }, extra||{});
  }

  const records = [
    // 汉政权在益州的金石材料（文档题名为“蜀汉”，项目国名统一为“汉”）。
    record('shu-huanglong-ganlu-stele','黄龙甘露碑残碑','碑刻',null,'建安二十六年（纪年归属争议）','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'争议', confidence:'争议', place:'益州（出土地未详）',
      people:'许慈、孟光、费诗、刘琰、李严、阴化', offices:'侍中、司徒、安汉将军、五官中郎将、太中大夫、博士、议郎、镇东将军、太守、武阳令',
      bibliography:'《隶释》；《华阳国志》；《三国志》',
      disputeNote:'残碑所见建安年号与刘备政权承继、建安二十五/二十六年换算存在争议；官员名录应视为碑文释读材料，不等同于同日完整官表。',
      note:'保留文档长释文及官员名录的索引价值，待逐字拓本复核。'
    }),
    record('shu-zhangwu-mirror','章武元年铜镜铭','器物铭',221,'章武元年','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'确定', confidence:'确定', place:'出土地未详',
      inscription:'章武元年二月作镜……', form:'铜镜铭文', bibliography:'《蜀汉金石录》',
      note:'纪年与汉政权年号相合，作为器物铭文收录。'
    }),
    record('shu-zhangwu-cliff','章武三年摩崖石刻','摩崖',223,'章武三年','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'推定', confidence:'推定', place:'习水县三岔河乡',
      people:'姚立从、曾意、曾孝梁', bibliography:'《贵博论丛》；《蜀汉金石录》',
      note:'文档记作章武三年，释文与著录需结合原石或拓本复核。'
    }),
    record('shu-jianxing-brick','建兴五年砖铭','砖瓦题记',227,'建兴五年','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'推定', confidence:'推定', place:'凉山西昌', form:'墓砖题记',
      bibliography:'《蜀汉金石录》', note:'蜀汉墓葬纪年砖，出土地与释文按文档暂录。'
    }),
    record('shu-yanxi-two-cliff','延熙二年残刻','摩崖',239,'延熙二年','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'待补', place:'未详', form:'残刻', bibliography:'《蜀汉金石录》'
    }),
    record('shu-zhaojun-tomb','赵君墓刻题','墓志',246,'延熙九年','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'存疑', confidence:'存疑', place:'新津',
      inscription:'直危造神墓……延熙九年', bibliography:'《沙邨题跋》；《蜀汉金石录》',
      disputeNote:'1935年发现后毁失，今据后人题跋或转录；原石不可复核，不能按一手原刻确定释文。'
    }),
    record('shu-xizhou-xi-nian-tomb','大理喜洲弘圭山纪年墓','墓志',247,'延熙十年','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'推定', confidence:'推定', place:'大理喜洲弘圭山',
      form:'墓葬纪年材料', bibliography:'《蜀汉金石录》'
    }),
    record('shu-yanxi-crossbow','铜弩机铭文','器物铭',253,'延熙十六年','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'推定', confidence:'推定', place:'保山坝', form:'铜弩机',
      bibliography:'《蜀汉金石录》', note:'器物年代与出土地按文档收录，尚需和馆藏、考古报告核对。'
    }),
    record('shu-baoci-cliff','新津宝资山崖墓纪年材料','墓志',246,'延熙九年','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'存疑', confidence:'存疑', place:'新津宝资山',
      form:'崖墓题记', bibliography:'《蜀汉金石录》', note:'与赵君墓刻题可能存在同地材料关联，暂不合并。'
    }),
    record('shu-jingyao-crossbow','景耀四年铜弩机铭文','器物铭',261,'景耀四年','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'争议', confidence:'争议', place:'郫县（文档称晋墓出土）',
      form:'铜弩机', bibliography:'《蜀汉金石录》',
      disputeNote:'出土墓葬被记作晋墓，不能仅凭蜀汉年号把墓葬、器物制造者和政权归属全部确定为汉。'
    }),
    record('shu-yang-gengbei','杨耿伯碑','碑刻',null,'年代未详·后主时期材料','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'待补', confidence:'存疑', place:'未详', bibliography:'《蜀汉金石录》'
    }),
    record('shu-zhangjun-stele','故府张君之碑','碑刻',null,'后主世','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'存疑', confidence:'存疑', place:'未详', bibliography:'《蜀汉金石录》'
    }),
    record('shu-panghong-stele','涪陵太守庞肱神道','碑刻',null,'年代未详·后主时期材料','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'待补', confidence:'存疑', place:'涪陵', people:'庞肱', offices:'涪陵太守', bibliography:'《蜀汉金石录》'
    }),
    record('shu-dengzhi-que','邓芝阙','碑刻',null,'年代未详','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'存疑', confidence:'存疑', place:'未详', people:'邓芝', bibliography:'《蜀汉金石录》'
    }),
    record('shu-jiangwei-stela','姜维碑','碑刻',null,'年代未详','汉',{
      sourceDocument:sourceDoc.shu, researchStatus:'存疑', confidence:'存疑', place:'未详', people:'姜维', bibliography:'《蜀汉金石录》'
    }),

    // 孙吴核心材料与承吴地扩展材料。
    record('wu-zhu-ran-tomb','朱然墓木牍与砖铭','砖瓦题记',249,'赤乌十二年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'推定', confidence:'推定', place:'朱然墓', people:'朱然', form:'墓葬木牍、砖铭',
      bibliography:'《孙吴金石录》', note:'材料类型跨木牍与砖铭，先以墓葬材料目录收录。'
    }),
    record('wu-ch-wu-tomb-brick','赤乌七年吴冢砖铭','砖瓦题记',244,'赤乌七年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'推定', confidence:'推定', form:'墓砖', inscription:'赤乌七年造作吴冢……', bibliography:'《孙吴金石录》'
    }),
    record('wu-ch-wu-mirror','赤乌十四年会稽师袁宜镜铭','器物铭',251,'赤乌十四年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'推定', confidence:'推定', place:'会稽上虞', people:'师袁宜', form:'铜镜', bibliography:'《孙吴金石录》'
    }),
    record('wu-dingfeng-contract','丁奉墓地券','地券',269,'建衡三年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'推定', confidence:'推定', place:'丁奉墓', people:'丁奉',
      offices:'使持节、左军师、右大司马、徐州牧、左护军、无难右部都督、大将军、安丰侯', form:'墓地契券', bibliography:'《孙吴金石录》'
    }),
    record('wu-yongan-brick','永安元年砖铭','砖瓦题记',258,'永安元年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'待补', form:'墓砖', bibliography:'《孙吴金石录》'
    }),
    record('wu-liangxiu-stele','司徒掾梁休碑','碑刻',null,'建安二十七年／黄武前一年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'争议', confidence:'争议', people:'梁休', offices:'司徒掾', bibliography:'《孙吴金石录》',
      disputeNote:'文档并列建安二十七年与黄武前一年两种纪年，年代和政权归属暂不折算为单一年份。'
    }),
    record('wu-gulang-stele','谷朗碑','碑刻',272,'凤凰元年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'确定', confidence:'确定', place:'九真', people:'谷朗', offices:'九真太守',
      form:'墓碑', bibliography:'《孙吴金石录》', note:'碑额题“吴故九真太守谷府君之碑”，保留官职履历索引。'
    }),
    record('wu-yongning-marquis','永宁侯相碑','碑刻',null,'年代未详','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'存疑', confidence:'存疑', form:'墓碑', bibliography:'《孙吴金石录》',
      disputeNote:'碑主、年代及是否属于孙吴时期，仍需结合原石与著录判断。'
    }),
    record('wu-liulishan','六里山石刻','摩崖',275,'天册元年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'推定', confidence:'推定', place:'六里山', bibliography:'《孙吴金石录》'
    }),
    record('wu-changuoshan','禅国山碑','碑刻',276,'天玺元年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'争议', confidence:'争议', place:'国山', bibliography:'《孙吴金石录》',
      disputeNote:'碑文、立碑背景与后世考释需区分；原文与考序不混为同一层证据。'
    }),
    record('wu-tianfa-shenchan','天发神谶碑','碑刻',276,'天玺元年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'争议', confidence:'争议', form:'碑刻', bibliography:'《孙吴金石录》',
      disputeNote:'保留文档所录碑文与后世考释，但不将后世传拓、书体判断直接当作原刻事实。'
    }),
    record('wu-yumiao-bianshi','会稽禹庙窆石遗字','其他',null,'年代与归属待考','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'争议', confidence:'争议', place:'会稽禹庙', form:'窆石残字', bibliography:'《孙吴金石录》',
      disputeNote:'文档载有汉、吴不同归属意见，暂列吴档案的争议材料，不作为确定孙吴碑刻。'
    }),
    record('wu-huangwu-four-contract','黄武四年墓地券','地券',225,'黄武四年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'推定', confidence:'推定', place:'豫章', form:'墓地契券', bibliography:'《孙吴金石录》'
    }),
    record('wu-huangwu-six-brick','黄武六年砖铭','砖瓦题记',227,'黄武六年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'存疑', confidence:'存疑', form:'墓砖', bibliography:'《孙吴金石录》',
      disputeNote:'部分材料出自后世墓葬或重出环境，器物年号与墓葬政权需分开判断。'
    }),
    record('wu-jiahe-crossbow','嘉禾六年弩铭','器物铭',237,'嘉禾六年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'存疑', confidence:'存疑', form:'弩机铭文', bibliography:'《孙吴金石录》',
      disputeNote:'文档注明出自东晋墓，先保留年号器物记录，暂不作为吴墓葬材料。'
    }),
    record('wu-taiping-mirror','太平二年镜铭','器物铭',257,'太平二年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'推定', confidence:'推定', form:'铜镜', bibliography:'《孙吴金石录》'
    }),
    record('wu-yong-an-seven-tomb','穴湖虞氏墓','墓志',264,'永安七年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'推定', confidence:'推定', place:'穴湖', form:'墓葬纪年材料', bibliography:'《孙吴金石录》'
    }),
    record('wu-bao-ding-brick','干君砖','砖瓦题记',266,'宝鼎元年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'推定', confidence:'推定', form:'墓砖', bibliography:'《孙吴金石录》'
    }),
    record('wu-sheyu-vessel','薛珝墓魂瓶','器物铭',274,'凤凰三年','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'推定', confidence:'推定', place:'薛珝墓', people:'薛珝', form:'魂瓶', bibliography:'《孙吴金石录》'
    }),
    record('wu-wuqiu-slip','哇丘州吏吴军简牍','简牍',null,'年代未详·吴地材料','吴',{
      sourceDocument:sourceDoc.wu, researchStatus:'存疑', confidence:'存疑', form:'简牍、田租材料', bibliography:'《孙吴金石录》',
      disputeNote:'材料性质偏行政与经济简牍，非严格意义上的石刻；保留在金石录扩展类型，待确认是否转入食货志。'
    }),
    record('wu-yuchan-tomb','喻襜墓','墓志',332,'咸和七年','晋',{
      sourceDocument:sourceDoc.wu, researchStatus:'存疑', confidence:'存疑', place:'吴地', people:'喻襜', form:'东晋墓葬材料', archiveKind:'扩展',
      bibliography:'《孙吴金石录》', disputeNote:'咸和为东晋年号，材料不纳入孙吴核心，只保留为承吴地扩展档案。'
    }),

    // 曹魏材料；建安、延康时期按政权过渡单独记注。
    record('wei-jianan-weixiang','建安二十五年慰项石铭','碑刻',220,'建安二十五年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', place:'出土地未详', form:'慰项石、碑阴题名',
      bibliography:'《魏金石录》', note:'建安年号属于汉末过渡期，项目按魏王府/曹魏前身材料归档，不等同于黄初以后帝国官制。'
    }),
    record('wei-daxiang-yan_kang','大飨碑并序','碑刻',220,'延康元年八月','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'争议', confidence:'争议', place:'谯县', form:'碑刻',
      people:'魏王及卿校将守', bibliography:'《隶释》十九；《魏金石录》',
      disputeNote:'文档记有卫觊、曹植等作者及书者异说，立碑与文辞需按著录层级分别标注。'
    }),
    record('wei-shouchan-tablet','受禅表','碑刻',220,'黄初元年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'确定', confidence:'确定', place:'繁昌受禅坛', form:'受禅表',
      bibliography:'《隶释》十九；《魏金石录》', note:'受禅表正文与后世关于王朗/卫觊、梁鹄/钟繇的书撰异说分开保存。'
    }),
    record('wei-laozi-temple-edict','下豫州刺史修老子庙诏','碑刻',222,'黄初三年十月十五日','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', place:'豫州', offices:'豫州刺史', form:'诏告刻石', bibliography:'《魏金石录》'
    }),
    record('wei-kongxian-stele','孔羡碑','碑刻',221,'黄初二年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'确定', confidence:'确定', place:'鲁县孔庙', people:'孔羡', offices:'奉议郎、宗圣侯', form:'庙碑',
      bibliography:'《隶释》十九；《魏金石录》'
    }),
    record('wei-luoyang-north-boundary','魏洛阳北界碑','碑刻',221,'黄初二年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', place:'洛阳县北', form:'界碑', bibliography:'《水经注》；《魏金石录》'
    }),
    record('wei-zhongdu-west-boundary','魏中都西界表','碑刻',221,'黄初二年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', place:'宜阳', form:'界表', bibliography:'《魏略》；《三国志·文帝纪》裴注；《魏金石录》'
    }),
    record('wei-henghai-lu-lang','横海将军吕君碑铭','碑刻',221,'黄初二年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', people:'吕朗', offices:'横海将军、平狄将军、厉节中郎将', form:'墓碑', bibliography:'《隶释》十九；《魏金石录》'
    }),
    record('wei-yique-cliff','伊阙左壁摩崖','摩崖',223,'黄初四年六月二十四日','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'确定', confidence:'确定', place:'伊阙', form:'水位刻记', inscription:'黄初四年六月二十四日辛巳，大出水……', bibliography:'《水经·伊水注》；《魏金石录》'
    }),
    record('wei-jia-kui-stele','贾逵碑','碑刻',228,'太和二年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', people:'贾逵', offices:'建威将军、豫州刺史', form:'墓碑', bibliography:'《集古录目》；《魏金石录》'
    }),
    record('wei-liubiao-stele','刘镇南碑','碑刻',228,'太和二年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'存疑', confidence:'存疑', people:'刘表', offices:'荆州刺史、镇南将军', form:'墓碑', bibliography:'《魏金石录》',
      disputeNote:'碑文颂辞涉及刘表任职和开府情况，需与《三国志》《后汉书》履历逐段核对，不能把碑文修辞直接当作行政边界。'
    }),
    record('wei-moqiu-jian-stela','毌丘俭纪功碑','碑刻',242,'正始三年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', place:'集安', people:'毌丘俭', offices:'督军讨高句丽', form:'纪功碑', bibliography:'《魏金石录》', note:'文档记载清光绪年间出土，原碑与残文需按博物馆资料复核。'
    }),
    record('wei-xun-shao-stele','荀绍碑','碑刻',244,'正始五年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', people:'荀绍', offices:'太仆、大将军长史、始平太守', form:'墓碑', bibliography:'《荀氏家传》；《魏金石录》'
    }),
    record('wei-shimen-cliff','石门残铭','摩崖',244,'正始五年十月二十五日','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'确定', confidence:'确定', place:'石门', offices:'督治道郎中、监作吏、都匠木工', form:'通治步道刻石', bibliography:'《魏金石录》'
    }),
    record('wei-left-arsenal-crossbow','正始二年左尚方弩机','器物铭',241,'正始二年五月十日','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'确定', confidence:'确定', place:'新乡等地出土', offices:'左尚方、监作吏、牙匠、臂匠', form:'弩机铭文', bibliography:'《魏金石录》'
    }),
    record('wei-jingyuan-zhangpu-brick','魏张普先君墓砖','砖瓦题记',260,'景元元年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', people:'张普', offices:'护乌丸校尉、幽州刺史、左将军', form:'墓砖', bibliography:'《魏金石录》'
    }),
    record('wei-wangji-stele','赠司空征南将军王基碑','碑刻',261,'景元二年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', people:'王基', offices:'征南将军、荆州刺史、扬武将军、司空（追赠）', form:'神道碑', bibliography:'《魏金石录》'
    }),
    record('wei-libao-passage','李苞通阁道刻石','摩崖',263,'景元四年十二月十日','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'确定', confidence:'确定', place:'石门北口', people:'李苞', offices:'荡寇将军', form:'阁道题刻', bibliography:'《魏金石录》'
    }),
    record('wei-jia-ping-brick','嘉平元年砖铭','砖瓦题记',249,'嘉平元年十月','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'待补', confidence:'存疑', form:'墓砖', bibliography:'《魏金石录》'
    }),
    record('wei-ganlu-brick','甘露二年砖铭','砖瓦题记',257,'甘露二年九月','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', place:'山东潍县', form:'墓砖', bibliography:'《魏金石录》'
    }),
    record('wei-xianxi-brick','咸熙二年砖铭','砖瓦题记',265,'咸熙二年九月','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', form:'墓砖', bibliography:'《魏金石录》', note:'咸熙仍属魏代末期，勿提前标作晋泰始。'
    }),
    record('wei-xunyu-house','魏荀彧宅铭','碑刻',265,'咸熙二年','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'存疑', confidence:'存疑', people:'荀彧', form:'宅铭', bibliography:'《洛阳伽蓝记》；《魏金石录》',
      disputeNote:'文档据赠谥和后世记载推测刻年，原石及确切刻立时间待考。'
    }),
    record('wei-fang-sheng-contract','焦兴胜买地券','地券',265,'咸熙二年十二月十五日','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'推定', confidence:'推定', place:'酒泉乐涫', form:'墓地券', bibliography:'《魏金石录》',
      note:'咸熙为魏末年号，保留与西晋泰始的年代边界说明。'
    }),
    record('wei-chengzhong-stele','魏隐士程仲碑','碑刻',null,'魏明帝至西晋时期著录','魏',{
      sourceDocument:sourceDoc.wei, researchStatus:'争议', confidence:'争议', people:'程仲', form:'墓碑', archiveKind:'争议', bibliography:'《魏金石录》',
      disputeNote:'文档同时记魏明帝征召与晋武帝泰始二年卒，碑刻年代和是否为魏碑不能据人物生平直接确定。'
    })
  ];

  records.forEach(item=>{ item.sourceTitle=item.sourceDocument; });
  records.sort((a,b)=>{
    const ay=Number.isFinite(a.year)?a.year:Infinity;
    const by=Number.isFinite(b.year)?b.year:Infinity;
    return ay-by || String(a.yearText||'').localeCompare(String(b.yearText||''),'zh-CN') || a.name.localeCompare(b.name,'zh-CN');
  });

  global.SGZ_EPIGRAPHIC_RECORDS = Object.freeze({
    schemaVersion: 3,
    scope: '汉末至西晋金石材料（168—316）',
    note: '首批材料据《蜀汉金石录》《孙吴金石录》《魏金石录》整理；异族材料不纳入核心金石录，后世承吴地或归属争议材料保留在扩展/争议状态。',
    types: Object.freeze(['碑刻','墓志','摩崖','砖瓦题记','简牍','器物铭','地券','印章','其他']),
    researchStatuses: Object.freeze(['待补','确定','推定','存疑','争议']),
    archiveKinds: Object.freeze(['核心','扩展','争议']),
    fields: Object.freeze([
      'id','name','type','year','yearText','polity','place','region','scriptStyle','form',
      'inscription','bibliography','media','people','offices','sourceTitle','sourceDocument','sourceUrl',
      'sourceLevel','sourceLocator','confidence','researchStatus','archiveKind','disputeNote','note'
    ]),
    sourceDocuments: Object.freeze(sourceDoc),
    records: Object.freeze(records)
  });
})(window);
