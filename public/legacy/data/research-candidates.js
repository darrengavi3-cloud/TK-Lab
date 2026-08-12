/* 文章考据候选层：只保存来源、审计动作和待核记录，不直接进入朝堂确定席位。 */
(function(global){
  'use strict';
  const sources = [
    ['jin_taipu','西晋职官表·九卿·太仆','https://zhuanlan.zhihu.com/p/717341860'],
    ['jin_weiwei','西晋职官表·九卿·卫尉','https://zhuanlan.zhihu.com/p/716079250'],
    ['jin_zongzheng','西晋职官表·九卿·宗正','https://zhuanlan.zhihu.com/p/717125882'],
    ['jin_tingwei','西晋职官表·九卿·廷尉','https://zhuanlan.zhihu.com/p/711104505'],
    ['jin_dahonglu','西晋职官表·九卿·大鸿胪','https://zhuanlan.zhihu.com/p/1951142215'],
    ['jin_xirong','西晋西戎校尉考','https://zhuanlan.zhihu.com/p/1982939810978109032'],
    ['jin_xizheng','西晋征西、镇西、安西、平西将军','https://zhuanlan.zhihu.com/p/1983851413147768568'],
    ['jin_piaoqi','西晋职官表·骠骑将军','https://zhuanlan.zhihu.com/p/1991641394591327636']
  ].map(([id,title,url])=>({id,title,url,level:'文档考据',role:'线索与补充考据',verificationState:'待核'}));

  const officeCandidates = [
    {id:'candidate_jin_taipu',kind:'office',name:'太仆',faction:'jin',category:'九卿',rank9:'三品',sourceIds:['jin_taipu'],status:'待核',displayState:'正式官职候选',primarySources:['《晋书》卷二十四·职官志']},
    {id:'candidate_jin_weiwei',kind:'office',name:'卫尉',faction:'jin',category:'九卿',rank9:'三品',sourceIds:['jin_weiwei'],status:'待核',displayState:'正式官职候选',primarySources:['《晋书》卷二十四·职官志']},
    {id:'candidate_jin_zongzheng',kind:'office',name:'宗正',faction:'jin',category:'九卿',rank9:'三品',sourceIds:['jin_zongzheng'],status:'待核',displayState:'正式官职候选',primarySources:['《晋书》卷二十四·职官志']},
    {id:'candidate_jin_tingwei',kind:'office',name:'廷尉',faction:'jin',category:'九卿',rank9:'三品',sourceIds:['jin_tingwei'],status:'待核',displayState:'正式官职候选',primarySources:['《晋书》卷二十四·职官志']},
    {id:'candidate_jin_dahonglu',kind:'office',name:'大鸿胪',faction:'jin',category:'九卿',rank9:'三品',sourceIds:['jin_dahonglu'],status:'待核',displayState:'正式官职候选',primarySources:['《晋书》卷二十四·职官志']},
    {id:'candidate_jin_xirong',kind:'office',name:'西戎校尉',faction:'jin',category:'属国护官',rank9:'四品',sourceIds:['jin_xirong'],status:'待核',displayState:'边疆官职候选',primarySources:['《晋书》卷二十四·职官志'],note:'需将武帝置官与元康时期和雍州刺史的转换分时段记录。'},
    {id:'candidate_jin_xizheng',kind:'title',name:'征西／镇西／安西／平西将军',faction:'jin',category:'将军武职',rank9:'二品',sourceIds:['jin_xizheng'],status:'待核',displayState:'官号族候选',primarySources:['《晋书》卷二十四·职官志'],note:'不得作为一个固定席位；按具体官号、人物和任期拆分。'},
    {id:'candidate_jin_piaoqi',kind:'title',name:'骠骑将军',faction:'jin',category:'将军武职',rank9:'二品',sourceIds:['jin_piaoqi'],status:'待核',displayState:'公位武官候选',primarySources:['《晋书》卷二十四·职官志'],note:'与大司马、大将军同列公位视觉层级，但品秩仍单独显示。'}
  ];

  const audit = [
    {id:'audit_jin_jiuqing_split',action:'split',target:'九卿总节点',result:'保留九个具体卿名；总节点只作为模板和索引，不作为朝堂席位。',status:'执行中'},
    {id:'audit_jin_general_family_archive',action:'archive-aggregate',target:'四征·四镇·四安·四平将军',result:'转为官号族说明；实际任职改由具体官号、人物、时间记录。',status:'执行中'},
    {id:'audit_jin_xirong_periodize',action:'periodize',target:'西戎校尉',result:'保留边疆职官，分开记录设官、驻地和后续与雍州刺史的转换。',status:'待核'},
    {id:'audit_legacy_ui_aggregate',action:'hide-in-court',target:'尚书六曹、中郎将系统、校尉系统、中央将军系统',result:'保留研究树和来源，不进入朝堂确定席位。',status:'已执行'},
    {id:'audit_secondary_sources',action:'downgrade',target:'百科和搜索摘要',result:'仅作二手索引，不能单独支撑品秩、任期和任命。',status:'规则已执行'}
  ];

  global.SGZ_RESEARCH_CANDIDATES = Object.freeze({
    schemaVersion:1,
    extractionPolicy:Object.freeze({commentsImported:false,pageNoiseImported:false,autoPromotionToFact:false,evidenceNotesKept:true}),
    sources:Object.freeze(sources),
    officeCandidates:Object.freeze(officeCandidates),
    audit:Object.freeze(audit)
  });
})(window);
