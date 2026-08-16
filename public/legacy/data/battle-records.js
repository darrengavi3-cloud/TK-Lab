/* 战事纪统一档案：编年要事、重大战役、重要战场。
 * 战役与战场沿用现有地图图层（three-kingdoms.js / strategic-geography.js）的
 * 标识与坐标，避免同一战役在地图与战事纪出现两套数据。
 * 本文件同时供主页面战事纪模块与地图 iframe 使用。
 */
const BATTLE_PROVINCE_BY_ID = Object.freeze({
  ev_lingdi_168:['司隶'], ev_huangjin_184:['冀州','豫州','荆州'], ev_liuyan_188:['中央'],
  ev_hejin_189:['司隶'], ev_taodong_190:['司隶','豫州'], ev_wangyun_192:['司隶'],
  ev_dadou_195:['司隶'], ev_xuchang_196:['豫州'], ev_guandu_200:['豫州'],
  ev_ye_204:['冀州'], ev_guandu_yuan_202:['冀州'], ev_jianbing_199:['冀州','幽州','扬州','徐州'],
  ev_xiangfan_219:['益州','荆州','扬州'], ev_chibi_208:['荆州'], ev_jiangling_209:['荆州'],
  ev_yizhou_211:['益州'], ev_caopi_220:['司隶'], ev_liubei_221:['益州'],
  ev_yiling_222:['荆州','益州'], ev_sunquan_229:['荆州'], ev_jieting_228:['雍州'],
  ev_shiting_228:['扬州'], ev_wuzhang_234:['雍州'], ev_gaoping_249:['司隶'],
  ev_shouchun_251:['扬州'], ev_caomao_260:['司隶'], ev_weifa_263:['益州','雍州'],
  ev_jinchuan_266:['司隶'], ev_miewu_280:['益州','荆州','扬州'], ev_jieqiao_191:['冀州'],
  ev_taozhou_193:['徐州','兖州'], ev_puyang_194:['兖州','徐州'], ev_yuanshu_197:['扬州'],
  ev_wuhuan_207:['幽州'], ev_tongguan_211:['司隶','雍州'], ev_ruxu_213:['扬州'],
  ev_hantian_215:['益州'], ev_baidi_223:['益州'], ev_nanzheng_225:['益州'],
  ev_yizhou_expedition_230:['扬州'], ev_liaodong_238:['幽州'], ev_dongxing_252:['扬州'],
  ev_shouchun_257:['扬州'],
  huangjin:['冀州'], hulaoguan:['司隶'], xiapi:['徐州'], puyang:['兖州'], guandu:['豫州'],
  chibi:['荆州'], jiangling:['荆州'], dingjunshan:['益州'], xiangfan:['荆州'], hefei:['扬州'],
  yiling:['荆州'], jieting:['雍州'], shiting:['扬州'], wuzhangyuan:['雍州'], jieqiao:['冀州'],
  tongguan:['司隶'], ruxu:['扬州'], hanzhong_zhan:['益州'], dongxing:['扬州'], shouchun_257:['扬州'],
  jianwei:['益州'], miewu:['益州','荆州','扬州'],
  'guandu-field':['豫州'], 'chibi-field':['荆州'], 'xiangfan-field':['荆州'], 'hefei-field':['扬州'],
  'ruxu-field':['扬州'], 'yiling-field':['荆州'], 'jieting-field':['雍州'], 'qishan-field':['雍州'],
  'wuzhang-field':['雍州'], 'tongguan-field':['司隶'], 'shouchun-field':['扬州'], 'dongxing-field':['扬州']
});

const EVENT_BATTLE_LINKS = Object.freeze({
  ev_huangjin_184:'huangjin', ev_taodong_190:'hulaoguan', ev_jieqiao_191:'jieqiao',
  ev_puyang_194:'puyang', ev_guandu_200:'guandu', ev_chibi_208:'chibi', ev_jiangling_209:'jiangling',
  ev_tongguan_211:'tongguan', ev_ruxu_213:'ruxu', ev_hantian_215:'hanzhong_zhan',
  ev_xiangfan_219:'xiangfan', ev_yiling_222:'yiling', ev_jieting_228:'jieting', ev_shiting_228:'shiting',
  ev_wuzhang_234:'wuzhangyuan', ev_dongxing_252:'dongxing', ev_shouchun_257:'shouchun_257',
  ev_weifa_263:'jianwei', ev_miewu_280:'miewu'
});

const ADDITIONAL_BATTLE_SUPPLEMENT = Object.freeze({
  xingshi: { participants:['王平（汉）','曹爽（魏）'], strengthNote:'兴势之战：曹爽率魏军攻汉中，王平、刘敏据兴势拒守，费祎督军赴援，魏军粮尽退（《三国志》卷四十三·王平传）。' },
  longcao: { participants:['袁绍','公孙瓒'], strengthNote:'龙凑之战：袁绍与公孙瓒争冀州，互有胜负（《后汉书》卷七十三·公孙瓒列传）。' },
  jumashui: { participants:['公孙瓒','袁绍'], strengthNote:'巨马水之战：公孙瓒与袁绍相持于巨马水一带（《后汉书》卷七十三·公孙瓒列传）。' }
});

const ADDITIONAL_BATTLE_PROVINCE = Object.freeze({
  ev_xingshi_244:['益州'], xingshi:['益州'], longcao:['冀州'], jumashui:['冀州']
});

const BATTLE_SUPPLEMENT = Object.freeze({
  guandu:{participants:['曹操','袁绍'],strengthNote:'袁绍众号十余万，曹操兵少，史料无一致实数（待考）。'},
  chibi:{participants:['孙刘联军','曹操'],strengthNote:'曹军号称八十万，实际南下兵力有争议（待考）；孙刘联军约五万。'},
  xiangfan:{participants:['关羽（汉）','曹仁、于禁（魏）','吕蒙（吴）'],strengthNote:'于禁所领七军见《三国志》本传，总兵力无一致实数（待考）。'},
  hefei:{participants:['张辽（魏）','孙权（吴）'],strengthNote:'孙权攻合肥众号十万，张辽以八百死士突阵（《三国志·张辽传》）。'},
  yiling:{participants:['陆逊（吴）','刘备（汉）'],strengthNote:'刘备连营数百里，吴军约五万，双方实数见注家分歧（待考）。'},
  jieting:{participants:['马谡（汉）','张郃（魏）'],strengthNote:'马谡违亮节度、舍水上山，张郃绝其汲道；双方兵力无一致实数（待考）。'},
  wuzhangyuan:{participants:['诸葛亮（汉）','司马懿（魏）'],strengthNote:'汉军分兵屯田示久驻，魏军坚壁不出；双方兵力无一致实数（待考）。'},
  tongguan:{participants:['曹操','韩遂、马超'],strengthNote:'关西诸将联军与曹军对阵，兵力无一致实数（待考）。'},
  ruxu:{participants:['孙权','曹操'],strengthNote:'曹操攻濡须，孙权率水军拒守；双方兵力无一致实数（待考）。'},
  dongxing:{participants:['丁奉（吴）','诸葛诞（魏）'],strengthNote:'丁奉雪中率三千人先至，魏军三路来攻（《三国志·丁奉传》）。'},
  shouchun_257:{participants:['司马昭（魏）','诸葛诞（魏）、吴'],strengthNote:'司马昭围寿春，吴军来援；城中粮尽而降（《三国志·诸葛诞传》）。'},
  miewu:{participants:['司马炎（晋）','孙皓（吴）'],strengthNote:'晋六路伐吴，王濬楼船顺江而下；双方总兵力无一致实数（待考）。'}
});

const battleData = {
  schemaVersion: 1,
  scope: '汉末至西晋（168—316）战事与军政沿革',
  note: '编年要事用于串联形势图时间轴；战役与战场字段沿用地图图层。史料出处优先原典，维基条目仅作检索索引。',
  events: [
    { id:'ev_sunce_jiangdong_195', year:195, era:'兴平二年', emperor:'汉献帝', text:'孙策渡江平定江东，逐刘繇、破严白虎等，奠定孙吴基业。', sideA:'孙策', sideB:'刘繇、严白虎等', result:'孙策定江东', front:'江东', sourceTitle:'《三国志》卷四十六·孙讨逆传', confidence:'确定' },
    { id:'ev_xingshi_244', year:244, era:'延熙七年／正始五年', emperor:'后主／魏齐王芳', text:'兴势之战：曹爽率魏军攻汉中，王平据兴势拒守，费祎督军往救，魏军粮尽退还。', sideA:'汉（王平、费祎）', sideB:'魏（曹爽）', result:'魏军退', front:'兴势', sourceTitle:'《三国志》卷四十三·王平传；卷四十四·费祎传', confidence:'确定', battleId:'xingshi' },
    { id:'ev_longcao_191', year:191, era:'初平二年', emperor:'汉献帝', text:'龙凑之战：袁绍与公孙瓒在龙凑一带交战，公孙瓒退兵。', sideA:'袁绍', sideB:'公孙瓒', result:'袁绍守成', front:'龙凑', sourceTitle:'《后汉书》卷七十三·公孙瓒列传', confidence:'推定', battleId:'longcao' },
    { id:'ev_jumashui_192', year:192, era:'初平三年', emperor:'汉献帝', text:'巨马水之战：公孙瓒复攻袁绍，战于巨马水，互有胜负。', sideA:'公孙瓒', sideB:'袁绍', result:'互有胜负', front:'巨马水', sourceTitle:'《后汉书》卷七十三·公孙瓒列传', confidence:'推定', battleId:'jumashui' },
    { id:'ev_lingdi_168', year:168, era:'建宁元年', emperor:'汉灵帝', text:'窦武、陈蕃谋诛宦官，事泄被杀，宦官势力进一步坐大。', sideA:'外戚士人集团', sideB:'宦官集团', result:'宦官获胜', front:'洛阳', sourceTitle:'《后汉书》卷六十六·陈蕃传', confidence:'确定' },
    { id:'ev_huangjin_184', year:184, era:'中平元年', emperor:'汉灵帝', text:'张角发动黄巾起义，三十六方同日并起，天下震动；皇甫嵩、朱儁等镇压。', sideA:'黄巾军', sideB:'东汉朝廷', result:'朝廷镇压，州郡兵起', front:'冀州、颍川、南阳等地', sourceTitle:'《后汉书》卷七十一·皇甫嵩传', confidence:'确定' },
    { id:'ev_liuyan_188', year:188, era:'中平五年', emperor:'汉灵帝', text:'刘焉建言选清名重臣出任州牧，以加强对地方的监察与控制；此后州牧逐渐成为地方军政长官。', sideA:'东汉朝廷', sideB:'—', result:'部分州改置州牧', front:'洛阳及诸州', sourceTitle:'《后汉书》卷七十五·刘焉传', confidence:'确定' },
    { id:'ev_hejin_189', year:189, era:'中平六年／光熹元年', emperor:'汉少帝／汉献帝', text:'灵帝崩，少帝即位；何进谋诛宦官反为所杀，董卓入京，废少帝立献帝。', sideA:'外戚宦官', sideB:'董卓', result:'董卓控制朝政', front:'洛阳', sourceTitle:'《后汉书》卷七十二·董卓列传', confidence:'确定' },
    { id:'ev_taodong_190', year:190, era:'初平元年', emperor:'汉献帝', text:'关东州郡推袁绍为盟主讨伐董卓；董卓焚洛阳，迁献帝于长安。', sideA:'关东联军', sideB:'董卓', result:'联军瓦解，董卓西迁', front:'洛阳、虎牢关一带', sourceTitle:'《后汉书》卷七十二·董卓列传', confidence:'确定' },
    { id:'ev_wangyun_192', year:192, era:'初平三年', emperor:'汉献帝', text:'王允、吕布诛董卓；李傕、郭汜旋攻入长安，王允死，东汉中枢进一步失控。', sideA:'王允吕布', sideB:'李傕郭汜', result:'李傕郭汜据长安', front:'长安', sourceTitle:'《后汉书》卷七十二·董卓列传', confidence:'确定' },
    { id:'ev_dadou_195', year:195, era:'兴平二年', emperor:'汉献帝', text:'李傕郭汜相攻，献帝东归，途遭饥困，局势残破。', sideA:'李傕', sideB:'郭汜', result:'献帝东归', front:'关中、弘农', sourceTitle:'《后汉书》卷九·孝献帝纪', confidence:'确定' },
    { id:'ev_xuchang_196', year:196, era:'建安元年', emperor:'汉献帝', text:'曹操迎献帝都许，开始“挟天子以令诸侯”。', sideA:'曹操', sideB:'—', result:'曹操控制朝政', front:'许县', sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'ev_guandu_200', year:200, era:'建安五年', emperor:'汉献帝', text:'官渡之战：曹操奇袭乌巢，大破袁绍，奠定统一北方之基。', sideA:'曹操', sideB:'袁绍', result:'曹操大胜', front:'官渡', sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'ev_ye_204', year:204, era:'建安九年', emperor:'汉献帝', text:'曹操攻取邺城，据有冀州，北疆渐归一统。', sideA:'曹操', sideB:'袁氏', result:'曹操取邺', front:'邺城', sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'ev_guandu_yuan_202', year:202, era:'建安七年', emperor:'汉献帝', text:'袁绍死后，诸子相攻，河北势力进一步削弱。', sideA:'袁氏诸子', sideB:'—', result:'袁氏内讧', front:'河北', sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'ev_jianbing_199', year:199, era:'建安四年', emperor:'汉献帝', text:'袁绍攻灭公孙瓒，据有河北四州；孙策平定江东；刘备据徐州。', sideA:'袁绍／孙策', sideB:'公孙瓒／刘繇等', result:'袁绍统河北、孙策定江东', front:'易京、江东', sourceTitle:'《三国志》卷六·袁绍传；卷四十六·孙讨逆传', confidence:'确定' },
    { id:'ev_xiangfan_219', year:219, era:'建安二十四年', emperor:'汉献帝', text:'刘备取汉中称汉中王；关羽围襄樊、水淹七军；吕蒙袭江陵，关羽败死。', sideA:'关羽（汉）', sideB:'曹仁、于禁（魏）／吕蒙（吴）', result:'孙权袭取荆州', front:'汉中、襄樊、江陵', sourceTitle:'《三国志》卷三十六·关羽传；卷三十二·先主传', confidence:'确定' },
    { id:'ev_chibi_208', year:208, era:'建安十三年', emperor:'汉献帝', text:'赤壁之战：孙刘联军火攻破曹，曹操北还，三分之局初具雏形。', sideA:'孙刘联军', sideB:'曹操', result:'孙刘胜', front:'赤壁、乌林', sourceTitle:'《三国志》卷五十四·周瑜传', confidence:'确定' },
    { id:'ev_jiangling_209', year:209, era:'建安十四年', emperor:'汉献帝', text:'周瑜攻取南郡，刘备请领荆州，据有江南四郡。', sideA:'周瑜', sideB:'曹仁', result:'吴取南郡', front:'江陵', sourceTitle:'《三国志》卷五十四·周瑜传', confidence:'确定' },
    { id:'ev_yizhou_211', year:211, era:'建安十六年', emperor:'汉献帝', text:'刘璋邀刘备入益州，次年刘备反攻，逐步取得益州。', sideA:'刘备', sideB:'刘璋', result:'刘备据益州', front:'益州', sourceTitle:'《三国志》卷三十二·先主传', confidence:'确定' },
    { id:'ev_caopi_220', year:220, era:'延康元年／黄初元年', emperor:'魏文帝', text:'曹丕代汉称帝，国号魏；东汉灭亡。', sideA:'曹丕', sideB:'东汉献帝', result:'魏代汉', front:'洛阳', sourceTitle:'《三国志》卷二·文帝纪', confidence:'确定' },
    { id:'ev_liubei_221', year:221, era:'章武元年', emperor:'汉昭烈帝', text:'刘备于成都即皇帝位，国号汉，史称季汉。', sideA:'刘备', sideB:'—', result:'汉建立', front:'成都', sourceTitle:'《三国志》卷三十二·先主传', confidence:'确定' },
    { id:'ev_yiling_222', year:222, era:'章武二年／黄武元年', emperor:'汉昭烈帝／吴大帝', text:'夷陵之战：陆逊火攻破刘备，刘备退守白帝城。', sideA:'陆逊', sideB:'刘备', result:'吴胜', front:'夷陵、猇亭', sourceTitle:'《三国志》卷五十八·陆逊传', confidence:'确定' },
    { id:'ev_sunquan_229', year:229, era:'黄龙元年', emperor:'吴大帝', text:'孙权于武昌称帝，国号吴，三国并立正式形成。', sideA:'孙权', sideB:'—', result:'吴建立', front:'武昌', sourceTitle:'《三国志》卷四十七·吴主传', confidence:'确定' },
    { id:'ev_jieting_228', year:228, era:'建兴六年／太和二年', emperor:'后主／魏明帝', text:'诸葛亮第一次北伐，街亭失守，陇右得而复失。', sideA:'汉诸葛亮', sideB:'魏张郃', result:'魏胜', front:'街亭、祁山', sourceTitle:'《三国志》卷三十五·诸葛亮传', confidence:'确定' },
    { id:'ev_shiting_228', year:228, era:'太和二年／黄武七年', emperor:'魏明帝／吴大帝', text:'石亭之战：陆逊大破曹休，魏吴淮南战线形势变化。', sideA:'吴陆逊', sideB:'魏曹休', result:'吴胜', front:'石亭', sourceTitle:'《三国志》卷五十六·朱桓传', confidence:'确定' },
    { id:'ev_wuzhang_234', year:234, era:'建兴十二年／青龙二年', emperor:'后主／魏明帝', text:'五丈原之战：诸葛亮与司马懿相持，亮病卒军中，汉退兵。', sideA:'汉诸葛亮', sideB:'魏司马懿', result:'魏守成，汉退', front:'五丈原', sourceTitle:'《三国志》卷三十五·诸葛亮传', confidence:'确定' },
    { id:'ev_gaoping_249', year:249, era:'正始十年／嘉平元年', emperor:'魏齐王芳', text:'高平陵之变：司马懿诛曹爽，曹魏政权转入司马氏。', sideA:'司马懿', sideB:'曹爽', result:'司马氏掌权', front:'洛阳', sourceTitle:'《晋书》卷一·宣帝纪', confidence:'确定' },
    { id:'ev_shouchun_251', year:251, era:'嘉平三年', emperor:'魏齐王芳', text:'王凌、令狐愚谋立楚王曹彪，事泄被杀，司马氏进一步清除异己。', sideA:'司马氏', sideB:'王凌', result:'司马氏胜', front:'寿春、洛阳', sourceTitle:'《三国志》卷二十八·王凌传', confidence:'确定' },
    { id:'ev_caomao_260', year:260, era:'甘露五年', emperor:'魏高贵乡公', text:'曹髦率众攻司马昭，被杀，司马氏代魏之势已不可逆转。', sideA:'曹髦', sideB:'司马昭', result:'司马昭胜', front:'洛阳', sourceTitle:'《三国志》卷四·三少帝纪', confidence:'确定' },
    { id:'ev_weifa_263', year:263, era:'景元四年／炎兴元年', emperor:'魏元帝／后主', text:'魏灭汉之战：钟会、邓艾分路入蜀，邓艾偷渡阴平，刘禅出降，汉亡。', sideA:'魏钟会邓艾', sideB:'汉刘禅', result:'魏灭汉', front:'汉中、阴平、成都', sourceTitle:'《三国志》卷二十八·邓艾传', confidence:'确定' },
    { id:'ev_jinchuan_266', year:266, era:'咸熙二年／泰始元年', emperor:'晋武帝', text:'司马炎受魏禅称帝，国号晋，西晋建立。', sideA:'司马炎', sideB:'魏元帝', result:'晋代魏', front:'洛阳', sourceTitle:'《晋书》卷三·武帝纪', confidence:'确定' },
    { id:'ev_miewu_280', year:280, era:'咸宁六年／太康元年', emperor:'晋武帝', text:'晋六路伐吴，王濬楼船下益州，孙皓出降，西晋统一。', sideA:'晋', sideB:'吴', result:'晋灭吴', front:'建业、江陵、武昌', sourceTitle:'《晋书》卷三·武帝纪', confidence:'确定' },
    { id:'ev_jieqiao_191', year:191, era:'初平二年', emperor:'汉献帝', text:'界桥之战：袁绍大破公孙瓒，巩固河北根本。', sideA:'袁绍', sideB:'公孙瓒', result:'袁绍胜', front:'界桥', sourceTitle:'《后汉书》卷七十三·公孙瓒列传', confidence:'确定' },
    { id:'ev_taozhou_193', year:193, era:'初平四年', emperor:'汉献帝', text:'曹操为父报仇东攻徐州，陶谦告急；次年吕布袭兖州，曹操回师。', sideA:'曹操', sideB:'陶谦／吕布', result:'徐州残破，兖州反复', front:'徐州、兖州', sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'ev_puyang_194', year:194, era:'兴平元年', emperor:'汉献帝', text:'吕布趁曹操东征入据兖州，与曹操争夺濮阳，双方相持岁余。', sideA:'曹操', sideB:'吕布', result:'吕布东走徐州', front:'濮阳', sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'ev_yuanshu_197', year:197, era:'建安二年', emperor:'汉献帝', text:'袁术于寿春僭号称帝，众叛亲离，旋为曹操所破。', sideA:'袁术', sideB:'曹操等', result:'袁术败亡，称帝不得人心', front:'寿春', sourceTitle:'《后汉书》卷七十五·袁术列传', confidence:'确定' },
    { id:'ev_wuhuan_207', year:207, era:'建安十二年', emperor:'汉献帝', text:'曹操北征乌桓，出卢龙塞，斩蹋顿于白狼山，北方归于一统。', sideA:'曹操', sideB:'乌桓／袁氏余部', result:'曹操定河北', front:'柳城', sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'ev_tongguan_211', year:211, era:'建安十六年', emperor:'汉献帝', text:'潼关之战：曹操离间韩遂、马超，平定关中诸将。', sideA:'曹操', sideB:'韩遂马超', result:'曹操定关中', front:'潼关', sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'ev_ruxu_213', year:213, era:'建安十八年', emperor:'汉献帝', text:'濡须口之战：曹操攻吴，孙权亲临拒守，曹操叹“生子当如孙仲谋”而还。', sideA:'孙权', sideB:'曹操', result:'相持，曹军退', front:'濡须口', sourceTitle:'《三国志》卷四十七·吴主传', confidence:'确定' },
    { id:'ev_hantian_215', year:215, era:'建安二十年', emperor:'汉献帝', text:'汉中争夺：曹操攻取汉中，张鲁降；刘备旋取益州，双方以汉中为焦点。', sideA:'曹操', sideB:'张鲁／刘备', result:'曹操取汉中，后为刘备所得', front:'汉中', sourceTitle:'《三国志》卷一·武帝纪；卷三十二·先主传', confidence:'确定' },
    { id:'ev_baidi_223', year:223, era:'章武三年／建兴元年', emperor:'汉昭烈帝／后主', text:'刘备病逝白帝城，托孤诸葛亮；诸葛亮开府治事，与吴修复盟好。', sideA:'汉', sideB:'—', result:'后主即位，诸葛亮辅政', front:'白帝城', sourceTitle:'《三国志》卷三十二·先主传；卷三十五·诸葛亮传', confidence:'确定' },
    { id:'ev_nanzheng_225', year:225, era:'建兴三年', emperor:'后主', text:'诸葛亮南征，七擒孟获，南中粗定。', sideA:'汉诸葛亮', sideB:'南中诸部', result:'南中平定', front:'南中', sourceTitle:'《三国志》卷三十五·诸葛亮传', confidence:'确定' },
    { id:'ev_yizhou_expedition_230', year:230, era:'黄龙二年', emperor:'吴大帝', text:'孙权遣卫温、诸葛直浮海求夷洲、亶洲，至夷洲而还。', sideA:'吴', sideB:'—', result:'抵夷洲，得数千人还', front:'夷洲', sourceTitle:'《三国志》卷四十七·吴主传', confidence:'确定' },
    { id:'ev_liaodong_238', year:238, era:'景初二年', emperor:'魏明帝', text:'司马懿征辽东，围襄平，斩公孙渊，辽东公孙氏割据结束。', sideA:'魏司马懿', sideB:'公孙渊', result:'魏灭公孙氏', front:'襄平', sourceTitle:'《三国志》卷二十八·公孙渊传；《晋书》卷一·宣帝纪', confidence:'确定' },
    { id:'ev_dongxing_252', year:252, era:'太元二年／建兴元年', emperor:'吴大帝／会稽王', text:'东兴之战：丁奉雪中奋短兵，大破魏军于东兴堤。', sideA:'吴丁奉', sideB:'魏诸葛诞等', result:'吴胜', front:'东兴', sourceTitle:'《三国志》卷五十五·丁奉传', confidence:'确定' },
    { id:'ev_shouchun_257', year:257, era:'甘露二年', emperor:'魏高贵乡公', text:'诸葛诞据寿春反司马昭，吴军来援；司马昭围城经年，城破诛诞。', sideA:'司马昭', sideB:'诸葛诞／吴', result:'司马昭平淮南', front:'寿春', sourceTitle:'《三国志》卷二十八·诸葛诞传', confidence:'确定' }
  ].map(function(ev){
    const titles={
      ev_lingdi_168:'党锢再起', ev_huangjin_184:'黄巾起义', ev_liuyan_188:'州牧之议', ev_hejin_189:'董卓入京',
      ev_taodong_190:'关东讨董', ev_wangyun_192:'长安之乱', ev_dadou_195:'献帝东归', ev_xuchang_196:'迎帝都许',
      ev_jianbing_199:'群雄兼并', ev_guandu_200:'官渡之战', ev_guandu_yuan_202:'袁氏内讧', ev_ye_204:'曹操取邺',
      ev_chibi_208:'赤壁之战', ev_jiangling_209:'南郡之争', ev_yizhou_211:'刘备入益州', ev_xiangfan_219:'襄樊之战',
      ev_caopi_220:'曹魏代汉', ev_liubei_221:'季汉建国', ev_yiling_222:'夷陵之战',
      ev_jieting_228:'街亭之失', ev_shiting_228:'石亭之战', ev_sunquan_229:'吴国称帝', ev_wuzhang_234:'五丈原之战',
      ev_gaoping_249:'高平陵之变', ev_shouchun_251:'王凌之乱', ev_caomao_260:'曹髦之变', ev_weifa_263:'魏灭汉',
      ev_jinchuan_266:'晋代魏', ev_miewu_280:'晋灭吴',
      ev_jieqiao_191:'界桥之战', ev_taozhou_193:'徐州之役', ev_puyang_194:'兖州之争', ev_yuanshu_197:'袁术称帝',
      ev_wuhuan_207:'北征乌桓', ev_tongguan_211:'潼关之战', ev_ruxu_213:'濡须之战', ev_hantian_215:'汉中争夺',
      ev_baidi_223:'白帝托孤', ev_nanzheng_225:'南征平叛', ev_yizhou_expedition_230:'夷洲远征', ev_liaodong_238:'辽东之灭',
      ev_dongxing_252:'东兴之战', ev_shouchun_257:'寿春之围'
    };
    return Object.assign({title:titles[ev.id]||String(ev.text||'').split(/[，。；]/)[0].slice(0,10),battleId:EVENT_BATTLE_LINKS[ev.id]||null},ev);
  }),
  battles: [
    { id:'xingshi', name:'兴势之战', year:244, a:'王平、费祎（汉）', b:'曹爽（魏）', result:'魏军粮尽退', desc:'曹爽率军攻汉中，王平据兴势拒守，刘敏等坚壁不战；费祎督军至，魏军粮尽退还。', lat:33.07, lng:107.02, sourceTitle:'《三国志》卷四十三·王平传；卷四十四·费祎传', confidence:'确定' },
    { id:'longcao', name:'龙凑之战', year:191, a:'袁绍', b:'公孙瓒', result:'公孙瓒退兵', desc:'袁绍与公孙瓒争冀州，战于龙凑，公孙瓒败退。', lat:37.6, lng:115.2, sourceTitle:'《后汉书》卷七十三·公孙瓒列传', confidence:'推定' },
    { id:'jumashui', name:'巨马水之战', year:192, a:'公孙瓒', b:'袁绍', result:'互有胜负', desc:'公孙瓒与袁绍在巨马水一带相持，互有胜负。', lat:39.2, lng:115.8, sourceTitle:'《后汉书》卷七十三·公孙瓒列传', confidence:'推定' },
    { id:'huangjin', name:'黄巾起义', year:184, a:'黄巾军', b:'东汉朝廷', result:'朝廷镇压，乱虽平而州郡兵起', desc:'张角以“苍天已死，黄天当立”号召，三十六方并起，席卷八州。乱平之后，地方割据之势已成。', lat:37.05, lng:115.4, sourceTitle:'《后汉书》卷七十一·皇甫嵩传', confidence:'确定' },
    { id:'hulaoguan', name:'诸侯讨董', year:190, a:'关东联军', b:'董卓', result:'联军瓦解，董卓挟帝西迁长安', desc:'关东州郡推袁绍为盟主讨董卓。曹操汴水战败，联盟各怀异志，不久散去。', lat:34.95, lng:113.05, sourceTitle:'《后汉书》卷七十二·董卓列传', confidence:'确定' },
    { id:'xiapi', name:'下邳之战', year:198, a:'曹操', b:'吕布', result:'曹操擒杀吕布，据徐州', desc:'曹操围下邳，决水灌城，吕布部将侯成等执布降，缢杀于白门楼。', lat:34.07, lng:117.94, sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'puyang', name:'濮阳之战', year:194, a:'曹操', b:'吕布', result:'相持岁余，曹操暂失兖州', desc:'吕布应张邈、陈宫之邀入据兖州，与曹操战于濮阳。曹操数败而后整军，吕布终东走徐州。', lat:35.70, lng:114.90, sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'guandu', name:'官渡之战', year:200, a:'曹操', b:'袁绍', result:'曹操火烧乌巢，大破袁绍', desc:'袁绍拥冀幽并青四州之众南下，曹操奇袭乌巢粮屯，以弱胜强，奠定统一北方之基。', lat:34.74, lng:113.96, sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'chibi', name:'赤壁之战', year:208, a:'孙刘联军', b:'曹操', result:'火攻破曹，曹操北还', desc:'曹操率大军南下，孙权刘备结盟。周瑜黄盖行火攻，火烧赤壁，曹军大败，三分雏形乃定。', lat:29.72, lng:113.9, sourceTitle:'《三国志》卷五十四·周瑜传', confidence:'确定' },
    { id:'jiangling', name:'南郡之争', year:209, a:'周瑜（吴）', b:'曹仁（魏）', result:'吴取南郡，刘备借荆州', desc:'周瑜与曹仁相持岁余，卒取南郡。刘备乘势请领荆州，据有江南四郡。', lat:30.35, lng:112.24, sourceTitle:'《三国志》卷五十四·周瑜传', confidence:'确定' },
    { id:'dingjunshan', name:'定军山之战', year:219, a:'刘备', b:'夏侯渊（魏）', result:'黄忠斩夏侯渊，刘备取汉中', desc:'刘备北攻汉中，老将黄忠居高临下，阵斩夏侯渊。曹操亲征无功，乃撤汉中之民。', lat:32.95, lng:106.95, sourceTitle:'《三国志》卷三十二·先主传', confidence:'确定' },
    { id:'xiangfan', name:'襄樊之战', year:219, a:'关羽（汉）', b:'曹仁、于禁（魏）', result:'关羽水淹七军，后失荆州败亡', desc:'关羽北伐襄阳樊城，水淹七军、威震华夏；孙权命吕蒙袭取江陵，关羽回师败死。', lat:32.04, lng:112.15, sourceTitle:'《三国志》卷三十六·关羽传', confidence:'确定' },
    { id:'hefei', name:'逍遥津之战', year:215, a:'张辽（魏）', b:'孙权（吴）', result:'张辽以少破众，孙权退走', desc:'孙权率十万攻合肥，张辽率八百死士晨袭，直冲麾下，江东惊破胆，“张辽止啼”传为佳话。', lat:31.87, lng:117.25, sourceTitle:'《三国志》卷十七·张辽传', confidence:'确定' },
    { id:'yiling', name:'夷陵之战', year:222, a:'陆逊（吴）', b:'刘备（汉）', result:'火攻破汉，刘备败退白帝', desc:'刘备倾国伐吴为关羽报仇。陆逊坚守待变，盛夏反攻，火烧连营，汉军溃败。', lat:30.69, lng:111.29, sourceTitle:'《三国志》卷五十八·陆逊传', confidence:'确定' },
    { id:'jieting', name:'街亭之失', year:228, a:'马谡（汉）', b:'张郃（魏）', result:'街亭失守，亮退兵', desc:'诸葛亮首出祁山，马谡违令舍水上山，为张郃所破，陇右得而复失。', lat:34.85, lng:105.95, sourceTitle:'《三国志》卷三十五·诸葛亮传', confidence:'确定' },
    { id:'shiting', name:'石亭之战', year:228, a:'陆逊（吴）', b:'曹休（魏）', result:'吴大破魏兵，曹休惭恨而亡', desc:'孙权佯降诱曹休深进，陆逊朱桓中路邀击，斩获万计。', lat:31.25, lng:118.8, sourceTitle:'《三国志》卷五十六·朱桓传', confidence:'确定' },
    { id:'wuzhangyuan', name:'五丈原之战', year:234, a:'诸葛亮（汉）', b:'司马懿（魏）', result:'亮病卒军中，汉退', desc:'诸葛亮出斜谷屯五丈原，分兵屯田，与司马懿相持。亮积劳成疾，殁于军。', lat:34.2, lng:107.65, sourceTitle:'《三国志》卷三十五·诸葛亮传', confidence:'确定' },
    { id:'jieqiao', name:'界桥之战', year:191, a:'袁绍', b:'公孙瓒', result:'袁绍以强弩破白马义从', desc:'公孙瓒精锐白马义从南下，袁绍部将麹义以弩阵迎击，斩其主将，河北形势自此逆转。', lat:37.8, lng:115.6, sourceTitle:'《后汉书》卷七十三·公孙瓒列传', confidence:'确定' },
    { id:'tongguan', name:'潼关之战', year:211, a:'曹操', b:'韩遂 · 马超', result:'曹操离间关西诸将，定关中', desc:'马超、韩遂联兵拒曹于潼关。曹操渡蒲坂，坚壁不战，又行离间，大破联军。', lat:34.62, lng:110.22, sourceTitle:'《三国志》卷一·武帝纪', confidence:'确定' },
    { id:'ruxu', name:'濡须口之战', year:213, a:'孙权', b:'曹操', result:'相持岁余，曹操引军还', desc:'曹操攻濡须，孙权率水军迎战。曹操见孙权舟船器仗整肃，叹“生子当如孙仲谋”，引军北还。', lat:31.15, lng:117.72, sourceTitle:'《三国志》卷四十七·吴主传', confidence:'确定' },
    { id:'hanzhong_zhan', name:'汉中争夺战', year:215, a:'曹操 · 刘备', b:'张鲁 · 夏侯渊', result:'刘备得汉中，曹操还军', desc:'曹操先取汉中，张鲁降；刘备乘机北进，经定军山一战斩夏侯渊，曹操知难而退，汉中归刘备。', lat:33.07, lng:107.02, sourceTitle:'《三国志》卷三十二·先主传', confidence:'确定' },
    { id:'dongxing', name:'东兴之战', year:252, a:'丁奉（吴）', b:'诸葛诞（魏）', result:'丁奉雪中奋短兵，吴胜', desc:'吴筑东兴堤，魏三路来攻。丁奉率三千人雪中先至，突袭魏军前营，大破之，缴获山积。', lat:31.15, lng:117.65, sourceTitle:'《三国志》卷五十五·丁奉传', confidence:'确定' },
    { id:'shouchun_257', name:'寿春之围', year:257, a:'司马昭（魏）', b:'诸葛诞（魏）· 吴', result:'司马昭破寿春，诛诸葛诞', desc:'诸葛诞据寿春反司马昭，联吴坚守。司马昭围城经年，城中粮尽，诞出降被杀。', lat:32.56, lng:116.78, sourceTitle:'《三国志》卷二十八·诸葛诞传', confidence:'确定' },
    { id:'jianwei', name:'魏灭汉之战', year:263, a:'邓艾 · 钟会（魏）', b:'刘禅（汉）', result:'邓艾入成都，汉亡', desc:'钟会牵制汉中，邓艾偷渡阴平，奇袭成都。刘禅出降，汉亡。', lat:31.4, lng:104.9, sourceTitle:'《三国志》卷二十八·邓艾传', confidence:'确定' },
    { id:'miewu', name:'晋灭吴之战', year:280, a:'司马炎（晋）', b:'孙皓（吴）', result:'王濬楼船下益州，孙皓降，吴亡', desc:'晋六路伐吴。王濬率巴蜀楼船顺江东下，直指建业；杜预、王浑等分道并进。孙皓出降，三国归晋。', lat:32.06, lng:118.8, sourceTitle:'《晋书》卷三·武帝纪', confidence:'确定' }
  ],
  battlefields: [
    { id:'guandu-field', name:'官渡战场', placeLabel:'官渡', lat:34.74, lng:113.96, from:200, to:208, note:'曹袁决战区域。' },
    { id:'chibi-field', name:'赤壁—乌林战场', placeLabel:'赤壁—乌林', lat:29.72, lng:113.90, from:208, to:220, note:'赤壁之战长江两岸战场。' },
    { id:'xiangfan-field', name:'襄樊战场', placeLabel:'襄樊', lat:32.04, lng:112.15, from:208, to:280, note:'汉水中游南北争夺枢纽。' },
    { id:'hefei-field', name:'合肥—逍遥津战场', placeLabel:'合肥—逍遥津', lat:31.82, lng:117.23, from:208, to:280, note:'魏吴江淮争夺核心。' },
    { id:'ruxu-field', name:'濡须口战场', placeLabel:'濡须口', lat:31.15, lng:117.72, from:208, to:280, note:'魏吴长江北岸攻防前沿。' },
    { id:'yiling-field', name:'夷陵—猇亭战场', placeLabel:'夷陵—猇亭', lat:30.69, lng:111.29, from:220, to:228, note:'章武二年吴汉大战区域。' },
    { id:'jieting-field', name:'街亭战场', placeLabel:'街亭', lat:34.85, lng:105.95, from:228, to:263, note:'诸葛亮第一次北伐关键战场。' },
    { id:'qishan-field', name:'祁山战场', placeLabel:'祁山', lat:34.05, lng:105.05, from:228, to:263, note:'魏汉陇右攻防前线。' },
    { id:'wuzhang-field', name:'五丈原战场', placeLabel:'五丈原', lat:34.25, lng:107.63, from:228, to:263, note:'诸葛亮第五次北伐驻军区域。' },
    { id:'tongguan-field', name:'潼关—关中战场', placeLabel:'潼关—关中', lat:34.62, lng:110.22, from:211, to:228, note:'曹操定关中后的关西攻防前沿。' },
    { id:'shouchun-field', name:'寿春—淮南战场', placeLabel:'寿春—淮南', lat:32.56, lng:116.78, from:249, to:280, note:'司马氏平淮南三叛与魏吴江淮拉锯核心。' },
    { id:'dongxing-field', name:'东兴—巢湖战场', placeLabel:'东兴—巢湖', lat:31.15, lng:117.72, from:213, to:280, note:'吴筑东兴堤后的江淮水战枢纽。' }
  ]
};

['events','battles','battlefields'].forEach(function(kind){
  battleData[kind]=battleData[kind].map(function(item){
    return Object.assign({},item,kind==='battles'?(BATTLE_SUPPLEMENT[item.id]||ADDITIONAL_BATTLE_SUPPLEMENT[item.id]||{}):{},{provinceKeys:Array.from(new Set(BATTLE_PROVINCE_BY_ID[item.id]||ADDITIONAL_BATTLE_PROVINCE[item.id]||['跨区域']))});
  });
});
battleData.provinceIndex=Object.freeze(['中央','司隶','冀州','兖州','豫州','青州','徐州','扬州','荆州','益州','凉州','雍州','幽州','并州','交州','广州','跨区域']);
window.SGZ_BATTLE_RECORDS = battleData;
