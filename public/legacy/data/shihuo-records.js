(function(global){
  'use strict';
  const SHIHUO_POLITIES = ['魏','汉','吴','晋'];
const SHIHUO_CATEGORIES = ['户口与人口','劳动与役制','土地与屯田','农业水利','赋役制度','货币','物价','盐铁官营','漕运仓储','交通与都市','工商业','人民生活','财政收支'];
const SHIHUO_RECORDS = [
  { id:'sh_196_tuntian', year:196, polity:'魏', category:'土地与屯田', title:'许下屯田', detail:'曹操用枣祗、任峻议，募民屯田许下，得谷百万斛，为北方经济恢复奠定基础。', sourceTitle:'《三国志》卷一·武帝纪；卷十六·任峻传', confidence:'确定' },
  { id:'sh_200_mintun', year:200, polity:'魏', category:'土地与屯田', title:'屯田推行于州郡', detail:'许下屯田成效显著后，州郡例置田官，典农中郎将、典农校尉、典农都尉分理民屯。', sourceTitle:'《三国志》卷十六·国渊传', confidence:'确定' },
  { id:'sh_208_juntun', year:208, polity:'魏', category:'土地与屯田', title:'军屯兴办', detail:'赤壁战后曹操在淮南、淮北及荆州北境经营军屯，以兵士屯田自给。', sourceTitle:'《三国志》卷十六·任峻传；《晋书》卷二十六·食货志', confidence:'较高' },
  { id:'sh_211_yantie', year:211, polity:'魏', category:'盐铁官营', title:'盐铁专营', detail:'曹操设监卖盐官以补军资，关中及河东盐利入官，用于购买耕牛农具。', sourceTitle:'《三国志》卷二十一·卫觊传', confidence:'确定' },
  { id:'sh_221_salt', year:null, yearText:'建安十九年后，年代未详', polity:'汉', category:'盐铁官营', title:'司盐校尉', detail:'刘备平定益州后，王连由地方令长迁司盐校尉，主管盐铁之利；本传未载确切授任年份。', sourceTitle:'《三国志》卷四十一·王连传', confidence:'确定' },
  { id:'sh_222_wu_tuntian', year:222, polity:'吴', category:'土地与屯田', title:'吴置典农校尉', detail:'孙权在江东推行屯田，毗陵典农校尉领民屯，另设督农、监农御史等职。', sourceTitle:'《三国志》卷四十七·吴主传；《晋书》卷二十六·食货志', confidence:'较高' },
  { id:'sh_mingdi_wubi', year:null, yearText:'魏明帝时，年代未详', polity:'魏', category:'货币', title:'明帝复五铢', detail:'魏明帝从司马芝议，更立五铢钱，延续至晋；《晋书·食货志》未载确切年份。', sourceTitle:'《晋书》卷二十六·食货志', confidence:'确定' },
  { id:'sh_228_kongming', year:228, polity:'汉', category:'土地与屯田', title:'诸葛亮休士劝农', detail:'诸葛亮治蜀务农殖谷，闭关息民，汉中、成都皆有农政经营。', sourceTitle:'《三国志》卷三十五·诸葛亮传', confidence:'确定' },
  { id:'sh_234_wuzhang', year:234, polity:'汉', category:'土地与屯田', title:'五丈原分兵屯田', detail:'诸葛亮出屯五丈原，分兵屯田，耕者杂于渭滨居民之间，示久驻之意。', sourceTitle:'《三国志》卷三十五·诸葛亮传', confidence:'确定' },
  { id:'sh_245_wu_hu', year:245, polity:'吴', category:'赋役制度', title:'吴赋役与世袭领兵', detail:'孙吴以世袭领兵与复客制供养豪族部曲，赋役征调多倚州郡与屯田。', sourceTitle:'《三国志》卷四十七·吴主传；《晋书》卷二十六·食货志', confidence:'较高' },
  { id:'sh_266_jin_chu', year:266, polity:'晋', category:'赋役制度', title:'晋初承魏户调', detail:'西晋初年沿用曹魏田租户调制，行五等爵与占田令之前暂仍魏制。', sourceTitle:'《晋书》卷二十六·食货志', confidence:'较高' },
  { id:'sh_taishi_zhantian_yi', year:null, yearText:'泰始年间，年代未详', polity:'晋', category:'土地与屯田', title:'占田课田之议', detail:'晋初已有占田课田制度之议；现存《晋书·食货志》将成制叙于平吴之后，不能系于泰始四年。', sourceTitle:'《晋书》卷二十六·食货志', confidence:'推定' },
  { id:'sh_268_changping', year:268, polity:'晋', category:'漕运仓储', title:'立常平仓', detail:'泰始四年，晋立常平仓，丰年购粮、歉年出售，以平衡谷价并备荒。', sourceTitle:'《晋书》卷二十六·食货志', confidence:'确定' },
  { id:'sh_280_zhantian', year:280, polity:'晋', category:'土地与屯田', title:'占田课田制', detail:'平吴后颁占田课田令：男子占田七十亩、女子三十亩，课田五十亩等；同时定户调绢绵之数。', sourceTitle:'《晋书》卷二十六·食货志', confidence:'确定' },
  { id:'sh_280_hu', year:280, polity:'晋', category:'赋役制度', title:'户调式', detail:'户调按丁男之户岁输绢三匹、绵三斤，女子及次丁男减半；并定诸王公侯食邑。', sourceTitle:'《晋书》卷二十六·食货志', confidence:'确定' },
  { id:'sh_157_hukou', year:157, polity:'汉', category:'户口与人口', title:'永寿户口', detail:'汉桓帝永寿三年，天下户 10,677,960，口 56,486,856，为汉末战乱前户口基准。', sourceTitle:'《晋书·地理志》《通典·食货典》《通志·食货志》', confidence:'确定' },
  { id:'sh_221_hukou', year:null, yearText:'年代未详（后世回顾）', polity:'汉', category:'户口与人口', title:'汉户口回顾值', detail:'后世汇总表常列汉约 200,000 户、900,000 口；现有引文不能把该数定位到章武元年，故不纳入精确编年。', sourceTitle:'《晋书·地理志》《通典·食货典》检索线索', confidence:'存疑' },
  { id:'sh_242_hukou', year:null, yearText:'年代未详（后世回顾）', polity:'吴', category:'户口与人口', title:'吴户口回顾值', detail:'后世汇总表常列吴约 523,000 户、2,400,000 口；现有引文不能把该数定位到赤乌五年，故不纳入精确编年。', sourceTitle:'《晋书·地理志》检索线索', confidence:'存疑' },
  { id:'sh_263_hukou_wei', year:null, yearText:'年代未详（后世推算）', polity:'魏', category:'户口与人口', title:'魏户口推算值', detail:'约 663,423 户、4,432,881 口为以后世总数减汉、吴数所得，并非景元四年直接户籍记载。', sourceTitle:'《通典·食货典》总数的后世推算', confidence:'存疑' },
  { id:'sh_263_hukou_shu', year:263, polity:'汉', category:'户口与人口', title:'炎兴户口', detail:'汉后主炎兴元年，汉有 280,000 户、940,000 口，为亡国时见存户口。', sourceTitle:'《三国志》卷三十三《后主传》注引王隐《蜀记》', confidence:'确定' },
  { id:'sh_263_hukou_wu', year:null, yearText:'年代未详（后世推算）', polity:'吴', category:'户口与人口', title:'吴中期户口推算值', detail:'约 530,000 户、3,240,000 口未能定位为永安六年的直接户籍记载，作为后世推算值保留。', sourceTitle:'《通典·食货典》检索线索', confidence:'存疑' },
  { id:'sh_280_hukou_wu', year:280, polity:'吴', category:'户口与人口', title:'吴亡时户口', detail:'太康元年孙皓出降，所上图籍载吴有 523,000 户、2,300,000 口。', sourceTitle:'《三国志》卷四十八·孙皓传注引《晋阳秋》', confidence:'确定' },
  { id:'sh_280_hukou', year:280, polity:'晋', category:'户口与人口', title:'太康户口', detail:'晋武帝太康元年，天下 2,459,804 户、16,163,863 口；《晋书》作 2,459,840 户。', sourceTitle:'《通典·食货典》《晋书·地理志》', confidence:'确定' },
  { id:'sh_190_hukou_shuai', year:190, polity:'汉', category:'户口与人口', title:'户口减耗总论', detail:'中国户口减耗盖在三国初期（汉献帝 189—220），主因杀戮、饥饿、瘟疫；北部减少率较高，南部及东北部较低。', sourceTitle:'《三国志札记》据《魏志》《晋书》汇证', confidence:'较高' },
  { id:'sh_205_zhangxiu', year:205, polity:'魏', category:'户口与人口', title:'张绣增邑', detail:'建安十年张绣复增邑凡二千户，诸将封千户者而绣特多，可见战乱后封户之少。', sourceTitle:'《魏志·张绣传》', confidence:'确定' },
  { id:'sh_xuzhou_caocao', year:null, yearText:'初平四年至兴平元年（193—194）', polity:'魏', category:'户口与人口', title:'曹操攻徐州造成户口损失', detail:'曹操两度攻徐州期间，记载称泗水一带死者甚众，虑、睢陵、夏丘等县遭屠；具体发生于哪次进军，现存引文未能精确区分。', sourceTitle:'《三国志》卷十《荀彧传》注引《曹瞒传》；卷一《武帝纪》', confidence:'推定' },
  { id:'sh_217_dayi', year:217, polity:'魏', category:'户口与人口', title:'建安大疫', detail:'建安二十二年居巢大疫，司马朗遇疫卒，徐干、陈琳、刘桢一时俱逝；建安末人口因瘟疫再减。', sourceTitle:'《魏志·司马朗传》《魏志·王粲传》', confidence:'确定' },
  { id:'sh_231_shibing', year:231, polity:'汉', category:'劳动与役制', title:'蜀汉将士规模', detail:'建兴九年诸葛亮在祁山者八万人，合留守者不下十万人。', sourceTitle:'《蜀志·诸葛亮传》注引郭冲五事', confidence:'较高' },
  { id:'sh_253_wu_bing', year:253, polity:'吴', category:'劳动与役制', title:'吴发兵二十万', detail:'建兴二年合肥新城之战发兵二十万人，合留守者不下三十万人，民力负担极重。', sourceTitle:'《吴志·诸葛恪传》', confidence:'确定' },
  { id:'sh_257_wei_bing', year:257, polity:'魏', category:'劳动与役制', title:'诸葛诞可发五十万', detail:'甘露二年诸葛诞作乱时魏国可发兵五十万人，合其余将士不下六七十万。', sourceTitle:'《晋书·文帝纪》', confidence:'较高' },
  { id:'sh_263_shu_bing', year:263, polity:'汉', category:'劳动与役制', title:'炎兴兵额', detail:'汉后主炎兴元年，蜀汉见兵 102,000 人。', sourceTitle:'《蜀志·后主传》注引王隐《蜀记》', confidence:'确定' },
  { id:'sh_280_wu_bing', year:280, polity:'吴', category:'劳动与役制', title:'天纪兵额', detail:'吴末帝天纪四年，孙吴见兵 230,000 人。', sourceTitle:'《吴志·孙皓传》注引《晋阳秋》', confidence:'确定' },
  { id:'sh_235_shijia', year:235, polity:'魏', category:'劳动与役制', title:'士家制度', detail:'魏士家世为兵，士女必嫁士家，诸士女嫁非士者录夺配战士；士家常被迁徙实边。', sourceTitle:'《魏志·明帝纪》青龙三年注引《魏略》', confidence:'确定' },
  { id:'sh_263_shu_li', year:263, polity:'汉', category:'劳动与役制', title:'蜀汉吏额', detail:'汉后主炎兴元年，蜀汉吏 40,000 人。', sourceTitle:'《蜀志·后主传》注引王隐《蜀记》', confidence:'确定' },
  { id:'sh_280_wu_li', year:280, polity:'吴', category:'劳动与役制', title:'吴吏额', detail:'吴末帝天纪四年，孙吴吏 32,000 人；吴文武众职数拟魏晋。', sourceTitle:'《吴志·孙皓传》注引《晋阳秋》《晋书·刘颂传》', confidence:'确定' },
  { id:'sh_196_nubi', year:196, polity:'汉', category:'劳动与役制', title:'奴客制度', detail:'建安元年糜竺有奴客二千，客以家计，世代为客；吴以复客制赐臣下（潘璋妻复客五十家、陈武子复客二百家）。', sourceTitle:'《蜀志·糜竺传》《吴志·潘璋传》《吴志·陈武传》', confidence:'确定' },
  { id:'sh_221_shengkou', year:221, polity:'魏', category:'劳动与役制', title:'生口与俘虏', detail:'黄初二年曹真破叛胡获生口十万、羊百一十万、牛八万，生口地位略同牲口；政府没入罪人妻子为官奴婢并斥卖于市。', sourceTitle:'《魏志·文帝纪》注引《魏书》《魏志·三少帝纪》', confidence:'确定' },
  { id:'sh_146_kentian', year:146, polity:'汉', category:'土地与屯田', title:'本初垦田', detail:'汉质帝本初元年垦田 6,930,123 顷 38 亩，为东汉垦田面积基准；三国时垦田远不及此。', sourceTitle:'《续汉书·郡国志》注引伏无忌记', confidence:'确定' },
  { id:'sh_227_cangci', year:227, polity:'魏', category:'土地与屯田', title:'敦煌割田与民', detail:'仓慈太和中任敦煌太守，割大姓田地以赋与小民，魏对既存地主阶级显加压迫。', sourceTitle:'《魏志·仓慈传》', confidence:'确定' },
  { id:'sh_214_zhaoyun', year:214, polity:'汉', category:'土地与屯田', title:'蜀不夺民田', detail:'刘备定益州，时议以民田分赐将士，赵云以为不可，刘备从之，蜀地田业多仍归原主。', sourceTitle:'《蜀志·赵云传》注引《赵云别传》', confidence:'确定' },
  { id:'sh_264_ba_diannong', year:264, polity:'魏', category:'土地与屯田', title:'罢典农官', detail:'咸熙元年诏罢屯田官以均政役，诸典农皆为太守、都尉皆为令长，民屯制度结束。', sourceTitle:'《晋书·宣帝纪》《魏志·三少帝纪》', confidence:'确定' },
  { id:'sh_233_chengguoqu', year:233, polity:'魏', category:'农业水利', title:'成国渠与临晋陂', detail:'青龙元年修成国渠自陈仓至槐里，溉田三千余顷；又引汧洛溉舄卤之地三千余顷。', sourceTitle:'《晋书·宣帝纪》《晋书·食货志》', confidence:'确定' },
  { id:'sh_243_dengai_qu', year:243, polity:'魏', category:'农业水利', title:'淮阳百尺渠', detail:'正始四年邓艾开淮阳渠、百尺渠及颍水南北诸陂，配合淮上屯田。', sourceTitle:'《晋书·宣帝纪》', confidence:'确定' },
  { id:'sh_250_lulingye', year:250, polity:'魏', category:'农业水利', title:'戾陵堨车箱渠', detail:'嘉平二年丁鸿导高粱河修戾陵堨、车箱渠，灌田岁二千顷，所润合四五百里、灌田万余顷。', sourceTitle:'《水经·鲍丘水注》载《刘靖碑文》', confidence:'较高' },
  { id:'sh_260_pulitang', year:260, polity:'吴', category:'农业水利', title:'浦里塘', detail:'永安三年都尉严密建丹阳湖田作浦里塘，毫无功绩而功佣之费不可胜数，士卒死亡百姓大怨。', sourceTitle:'《吴志·濮阳兴传》《吴志·陆凯传》', confidence:'确定' },
  { id:'sh_243_dengai_tuntian', year:243, polity:'魏', category:'农业水利', title:'淮上屯田规模', detail:'正始四年伐吴后，邓艾受命考察陈、项以东至寿春地区，建议开河渠并以淮北二万人、淮南三万人分休屯守；预计岁得军粮五百万斛。', sourceTitle:'《晋书》卷二十六·食货志；《三国志》卷二十八·邓艾传', confidence:'确定' },
  { id:'sh_277_duyu_po', year:277, polity:'晋', category:'农业水利', title:'杜预论陂害', detail:'咸宁三年杜预疏论诸陂之害：修治弗坚常虞溃决，积水封掩广土，良田变生蒲苇，水陆失业。', sourceTitle:'《晋书·食货志》', confidence:'确定' },
  { id:'sh_214_zhizhi', year:214, polity:'汉', category:'货币', title:'直百五铢铸造', detail:'建安十九年刘备在益州复铸直百钱，径一寸一分、重八铢；犍为郡所铸背有“为”字。', sourceTitle:'《蜀志·刘巴传》注引《零陵先贤传》《三国志旁证》', confidence:'确定' },
  { id:'sh_221_wei_wubi', year:221, polity:'魏', category:'货币', title:'黄初二币', detail:'黄初二年春三月魏复五铢钱，冬十月以谷贵复罢五铢，使民以谷帛为市。', sourceTitle:'《魏志·文帝纪》《晋书·食货志》', confidence:'确定' },
  { id:'sh_236_daquan', year:236, polity:'吴', category:'货币', title:'大泉五百', detail:'嘉禾五年春吴铸大钱一当五百，文曰“大泉五百”，径一寸三分、重十二铢。', sourceTitle:'《吴志·孙权传》《通典·食货志》', confidence:'确定' },
  { id:'sh_238_daquan', year:238, polity:'吴', category:'货币', title:'大泉当千', detail:'赤乌元年春吴复铸当千大钱“大泉当千”，径一寸四分、重十六铢，另有当两千、当五千钱。', sourceTitle:'《吴志·孙权传》《通典·食货志》', confidence:'确定' },
  { id:'sh_246_ba_daqian', year:246, polity:'吴', category:'货币', title:'罢大钱', detail:'赤乌九年吴以民多不以大钱为便，下诏罢大钱；然孙氏旧钱至东晋元帝时尚被通用。', sourceTitle:'《吴志·孙权传》注引《江表传》《晋书·食货志》', confidence:'确定' },
  { id:'sh_190_dongzhuo_qian', year:190, polity:'汉', category:'货币', title:'董卓小钱', detail:'初平元年董卓毁五铢并铸小钱，钱制粗恶，谷一斛涨至数十万，钱货不行。', sourceTitle:'《后汉书·孝献帝纪》《魏志·董卓传》', confidence:'确定' },
  { id:'sh_208_caocao_qian', year:208, polity:'魏', category:'货币', title:'建安罢小钱', detail:'建安十三年曹操为相，罢小钱还用五铢，惟少所增铸，仍不足济用，谷贱无已，疑后更废。', sourceTitle:'《晋书·食货志》', confidence:'确定' },
  { id:'sh_272_wu_juan', year:272, polity:'吴', category:'物价', title:'吴物价', detail:'凤皇元年一犬至值数千匹绢，御犬率具缨值钱一万；谷帛绢布为日常交换媒介。', sourceTitle:'《吴志·孙皓传》注引《江表传》', confidence:'确定' },
  { id:'sh_194_jia', year:194, polity:'汉', category:'物价', title:'兴平谷价', detail:'兴平元年谷一斛五十万钱，豆麦一斛二十万钱；幽州谷一石十万钱。', sourceTitle:'《后汉书·献帝纪》《魏志·武帝纪》', confidence:'确定' },
  { id:'sh_221_wu_jiaoyi', year:221, polity:'魏', category:'交通与都市', title:'魏吴互市', detail:'黄初二年魏文帝遣使向孙权求雀头香、大贝、明珠、象牙等物；嘉禾四年魏以马求吴珠玑、翡翠、玳瑁。', sourceTitle:'《吴志·孙权传》注引《江表传》', confidence:'确定' },
  { id:'sh_230_yizhou', year:230, polity:'吴', category:'交通与都市', title:'夷洲远征', detail:'黄龙二年孙权遣卫温、诸葛直将兵万人浮海求夷洲、亶洲，得夷洲数千人还，海上交通迈轶东汉。', sourceTitle:'《吴志·孙权传》', confidence:'确定' },
  { id:'sh_245_pogandu', year:245, polity:'吴', category:'交通与都市', title:'破岗渎', detail:'赤乌八年校尉陈勋作屯田，发屯兵三万人凿句容中道，自小其至云阳西城通会市、作邸阁，以通吴会船舰。', sourceTitle:'《吴志·孙权传》', confidence:'确定' },
  { id:'sh_206_pingluqu', year:206, polity:'魏', category:'交通与都市', title:'平虏泉州渠', detail:'建安十一年董昭建平虏渠（自呼沲入泒水）与泉州渠（自泃河口入潞河），后晋宣帝更修治。', sourceTitle:'《魏志·武帝纪》《魏志·董昭传》《水经注》', confidence:'确定' },
  { id:'sh_231_muniu', year:231, polity:'汉', category:'交通与都市', title:'木牛流马', detail:'建兴九年诸葛亮第四次北伐以木牛运；十年休士劝农于黄沙作流马；十二年第五次北伐以流马运。', sourceTitle:'《蜀志·后主传》《蜀志·诸葛亮传》', confidence:'确定' },
  { id:'sh_263_shu_fukong', year:263, polity:'汉', category:'工商业', title:'蜀府库锦帛', detail:'蜀汉亡时府库藏锦、绮、彩、绢各二十万匹，金银各二千斤，米四十万斛以上。', sourceTitle:'《蜀志·后主传》注引王隐《蜀记》', confidence:'确定' },
  { id:'sh_280_wu_chuan', year:280, polity:'吴', category:'工商业', title:'吴官船五千艘', detail:'吴亡时官有舟船五千余艘；建安郡有大船厂，罪人辄谪至建安造船。', sourceTitle:'《吴志·孙皓传》注引《晋阳秋》', confidence:'确定' },
  { id:'sh_211_yan', year:211, polity:'魏', category:'盐铁官营', title:'盐专卖', detail:'魏、蜀、吴皆置盐官，以专卖盐为主；蜀井盐、魏解池盐、沿海海盐各有特产。', sourceTitle:'《魏志·卫觊传》《蜀志·王连传》《蜀志·吕乂传》《吴志·孙休传》', confidence:'确定' },
  { id:'sh_245_wu_zhu', year:245, polity:'吴', category:'工商业', title:'吴珠禁', detail:'合浦百姓唯以采珠为业，吴珠禁甚严；陶璜请上珠三分输二、次珠输一、粗者蠲除。', sourceTitle:'《晋书·陶璜传》', confidence:'确定' },
  { id:'sh_204_hu_diao', year:204, polity:'魏', category:'财政收支', title:'田租户调令', detail:'建安九年曹操定田租亩四升、户出绢二匹绵二斤，罢汉算赋口钱；另有关税、罚金等收入。', sourceTitle:'《魏志·武帝纪》注引《魏书》《魏志·赵俨传》《魏志·何夔传》', confidence:'确定' },
  { id:'sh_220_jin_ci', year:220, polity:'魏', category:'财政收支', title:'延康复除', detail:'延康元年以谯为曹氏祖籍，复谯租税二年；景元四年特赦益州士民复除租税之半五年。', sourceTitle:'《魏志·文帝纪》注引《魏书》《魏志·三少帝纪》', confidence:'确定' },
  { id:'sh_217_zhenxu', year:217, polity:'魏', category:'财政收支', title:'魏赈恤之制', detail:'建安二十二年大疫后，令吏民男女年七十以上无夫子、十二岁以下无父母兄弟及残疾无产业者廪食终身。', sourceTitle:'《魏志·武帝纪》注引《魏书》', confidence:'确定' },
  { id:'sh_240_wu_zhen', year:240, polity:'吴', category:'财政收支', title:'吴开仓赈贫', detail:'赤乌三年民饥诏开仓廪赈贫穷；十三年丹阳山崩水溢，诏原逋责、给贷种食；嘉禾三年宽诸逋无复督课。', sourceTitle:'《吴志·孙权传》', confidence:'确定' },
  { id:'sh_263_liu_chan', year:263, polity:'魏', category:'财政收支', title:'魏府藏与赐予', detail:'魏明帝大兴土木府藏渐耗，司马氏节用兴利以济；后主至洛阳赐绢万匹、奴婢百人。', sourceTitle:'《魏志·卫觊传》《蜀志·后主传》', confidence:'较高' },
  { id:'sh_281_feng', year:281, polity:'晋', category:'财政收支', title:'晋官俸与赐物', detail:'晋太康二年起于百官正俸外加给春绢秋绢绵；太康元年平吴后奖将吏渡江复十年、百姓百工复二十年。', sourceTitle:'《晋书·职官志》《晋书·武帝纪》', confidence:'确定' }
];
const SHIHUO_EVENTS = [
  { id:'se_196', year:196, polity:'魏', title:'许下屯田', detail:'枣祗、任峻主持许下民屯，岁收谷百万斛。' },
  { id:'se_202', year:202, polity:'魏', title:'睢阳渠', detail:'建安七年曹操治睢阳渠，沟通睢水漕运。' },
  { id:'se_204', year:204, polity:'魏', title:'淇水新道', detail:'建安九年引淇水入白沟以通运道，为邺城漕运基础。' },
  { id:'se_204_tax', recordId:'sh_204_hu_diao', year:204, polity:'魏', title:'定田租户调', detail:'建安九年颁田租亩四升、户调绢绵之令，废汉算赋口钱。' },
  { id:'se_206', year:206, polity:'魏', title:'平虏泉州渠', detail:'董昭开平虏渠、泉州渠，沟通河北水运。' },
  { id:'se_208', year:208, polity:'魏', title:'罢小钱用五铢', detail:'曹操为相罢董卓小钱，还用五铢。' },
  { id:'se_221', year:221, polity:'汉', title:'铸直百钱', detail:'刘备从刘巴议铸直百五铢，平抑市价、充实府库。' },
  { id:'se_221b', year:221, polity:'魏', title:'罢五铢', detail:'黄初二年冬以谷贵罢五铢钱，谷帛为市。' },
  { id:'se_mingdi_wubi', year:null, yearText:'魏明帝时，年代未详', polity:'魏', title:'复五铢', detail:'魏明帝从司马芝议更立五铢钱；现存记载未系确切年份。' },
  { id:'se_233', year:233, polity:'魏', title:'成国渠临晋陂', detail:'青龙元年兴修，各溉田三千余顷。' },
  { id:'se_234', year:234, polity:'汉', title:'五丈原屯田', detail:'诸葛亮分兵屯田于渭滨。' },
  { id:'se_236', year:236, polity:'吴', title:'铸大泉五百', detail:'嘉禾五年铸一当五百大钱。' },
  { id:'se_238', year:238, polity:'吴', title:'铸大泉当千', detail:'赤乌元年铸当千大钱，另有当两千、五千。' },
  { id:'se_243', year:243, polity:'魏', title:'淮南屯田', detail:'正始四年伐吴后，邓艾建议兴军屯于淮南、淮北，积谷备战。' },
  { id:'se_245', year:245, polity:'吴', title:'破岗渎', detail:'凿句容中道通吴会船舰，作邸阁。' },
  { id:'se_246', year:246, polity:'吴', title:'罢大钱', detail:'赤乌九年以民不便下诏罢大钱。' },
  { id:'se_264b', year:264, polity:'魏', title:'罢典农官', detail:'咸熙元年罢屯田官，典农皆为太守、都尉皆为令长。' },
  { id:'se_268', recordId:'sh_268_changping', year:268, polity:'晋', title:'立常平仓', detail:'泰始四年立常平仓，丰年购粮、歉年出售，以平谷价并备荒。' },
  { id:'se_280', year:280, polity:'晋', title:'占田课田制', detail:'平吴后颁占田、课田、户调之令。' }
];
const SHIHUO_HOUSEHOLD = [
  { id:'hh_157', recordId:'sh_157_hukou', year:157, polity:'汉', label:'汉桓帝永寿三年', households:'10,677,960 户', population:'56,486,856 口', note:'战乱前户口基准。' },
  { id:'hh_221', recordId:'sh_221_hukou', year:null, yearText:'年代未详', polity:'汉', label:'汉户口回顾值', households:'约 200,000 户', population:'约 900,000 口', note:'后世汇总值，不能定位为章武元年户籍。' },
  { id:'hh_242', recordId:'sh_242_hukou', year:null, yearText:'年代未详', polity:'吴', label:'吴户口回顾值', households:'约 523,000 户', population:'约 2,400,000 口', note:'后世汇总值，不能定位为赤乌五年户籍。' },
  { id:'hh_263_wei', recordId:'sh_263_hukou_wei', year:null, yearText:'年代未详', polity:'魏', label:'魏户口推算值', households:'约 663,423 户', population:'约 4,432,881 口', note:'以后世总数减去汉、吴数字所得。' },
  { id:'hh_263_shu', recordId:'sh_263_hukou_shu', year:263, polity:'汉', label:'汉后主炎兴元年', households:'280,000 户', population:'940,000 口', note:'亡国时见存户口。' },
  { id:'hh_263_wu', recordId:'sh_263_hukou_wu', year:null, yearText:'年代未详', polity:'吴', label:'吴中期户口推算值', households:'约 530,000 户', population:'约 3,240,000 口', note:'未能定位到永安六年的直接记载。' },
  { id:'hh_280_wu', recordId:'sh_280_hukou_wu', year:280, polity:'吴', label:'吴末帝天纪四年', households:'523,000 户', population:'2,300,000 口', note:'孙皓出降时所上图籍。' },
  { id:'hh_280_jin', recordId:'sh_280_hukou', year:280, polity:'晋', label:'晋武帝太康元年', households:'2,459,804 户', population:'16,163,863 口', note:'《晋书》另作 2,459,840 户。' }
];

  function recordKind(row){
    if(['户口与人口','物价'].includes(row.category)) return 'quantitative';
    if(/制度|令$|户调|田租|官营|专营|复除|赈恤|常平仓|罢/.test(String(row.title||''))) return 'institution';
    return 'event';
  }
  function evidence(row){
    return {sourceTitle:row.sourceTitle||'',sourceLevel:row.sourceLevel||'史料整理',confidence:row.confidence||'待考',sourceLocator:row.sourceLocator||''};
  }
  function scopeFor(row){ return row.year!=null&&Number.isFinite(Number(row.year))&&Number(row.year)<168?'baseline':'core'; }
  const records=SHIHUO_RECORDS.map(row=>Object.freeze({...row,recordKind:recordKind(row),scope:scopeFor(row),rawRecord:{title:row.title,year:row.year??null,yearText:row.yearText||'',detail:row.detail||''},readerSummary:row.detail||'',evidence:evidence(row)}));
  const recordsById=new Map(records.map(row=>[row.id,row]));
  const events=SHIHUO_EVENTS.map(row=>{const linked=recordsById.get(row.recordId);return Object.freeze({...row,recordKind:'event',scope:scopeFor(row),rawRecord:{title:row.title,year:row.year??null,yearText:row.yearText||'',detail:row.detail||''},readerSummary:row.detail||'',evidence:evidence(linked||row)});});
  const household=SHIHUO_HOUSEHOLD.map(row=>{const linked=recordsById.get(row.recordId);return Object.freeze({...row,recordKind:'quantitative',scope:scopeFor(row),comparable:row.year!=null&&Number.isFinite(Number(row.year))&&!/约|推算|回顾/.test([row.households,row.population,row.note].join('')),evidence:evidence(linked||row)});});
  global.SGZ_SHIHUO_DATA=Object.freeze({schemaVersion:'V55',polities:Object.freeze(SHIHUO_POLITIES),categories:Object.freeze(SHIHUO_CATEGORIES),records:Object.freeze(records),events:Object.freeze(events),household:Object.freeze(household),policy:'146、157 年资料仅作战乱前基线；168—316 年为主体。图表仅比较有确定年份且非约数、非推算值的记录。'});
})(window);
