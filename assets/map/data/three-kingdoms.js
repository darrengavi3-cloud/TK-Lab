/**
 * data/three-kingdoms.js — 三国历史时空数据
 *
 * 疆域边界不再由本文件定义，而由 geo-provinces.js 中的真实州界多边形
 * 与 config.js 中的 PROVINCE_PERIODS 时期映射共同决定。
 *
 * 本文件保留：
 *   cities  — 静态地理：重要城池（始终存在于地图）
 *   battles — 事件地理：著名战役（按所属时期显示）
 *   periods — 时间节点：叙事、聚焦视角、战役与关键城池
 */

window.THREE_KINGDOMS = {
  "meta": {
    "title": "三国鼎立 · 历史地图",
    "subtitle": "公元 184 — 280 年 · 汉末至三国归晋",
    "note": "州郡边界取自 kongming.net 手工精绘历史地图；晋朝十九州与郡界由魏蜀吴数据合并、拆分生成。"
  },
  "cities": [
    {
      "id": "luoyang",
      "name": "洛阳",
      "lat": 34.62,
      "lng": 112.45,
      "desc": "天下之中，东汉都城。董卓焚掠后残破，曹魏定为五都之一，乃中原腹心。"
    },
    {
      "id": "changan",
      "name": "长安",
      "lat": 34.27,
      "lng": 108.95,
      "desc": "西汉旧都，关中之根。董卓挟献帝西迁于此，筑郿坞，后为李傕郭汜所乱。"
    },
    {
      "id": "xuchang",
      "name": "许昌",
      "lat": 34.04,
      "lng": 113.85,
      "desc": "曹操迎献帝都此，\"挟天子以令诸侯\"，屯田积谷，霸业所基，改称许都。"
    },
    {
      "id": "ye",
      "name": "邺城",
      "lat": 36.07,
      "lng": 114.62,
      "desc": "冀州治所，曹操封魏王之都。筑铜雀、金虎、冰井三台，邺下文人荟萃。"
    },
    {
      "id": "chengdu",
      "name": "成都",
      "lat": 30.66,
      "lng": 104.07,
      "desc": "益州首府，蜀汉都城。沃野千里，诸葛亮治蜀\"科教严明，赏罚必信\"。"
    },
    {
      "id": "jianye",
      "name": "建业",
      "lat": 32.06,
      "lng": 118.8,
      "desc": "孙吴都城。据长江之险，舟师之所出，江东根本。"
    },
    {
      "id": "xiangyang",
      "name": "襄阳",
      "lat": 32.01,
      "lng": 112.13,
      "desc": "荆襄要冲，南北枢机。关羽围城、羊祜陆抗对峙，兵家必争之地。"
    },
    {
      "id": "jiangling",
      "name": "江陵",
      "lat": 30.35,
      "lng": 112.24,
      "desc": "南郡治所，荆州中枢。周瑜取南郡，关羽失荆州，皆系于此。"
    },
    {
      "id": "chibi",
      "name": "赤壁",
      "lat": 29.72,
      "lng": 113.9,
      "desc": "长江南岸。赤壁一炬，奠定三分天下之势。"
    },
    {
      "id": "guandu",
      "name": "官渡",
      "lat": 34.74,
      "lng": 113.96,
      "desc": "中牟北。曹操以少胜多败袁绍，统一北方之关键。"
    },
    {
      "id": "hefei",
      "name": "合肥",
      "lat": 31.82,
      "lng": 117.23,
      "desc": "扬州西门户，魏吴数十年拉锯之地。张辽逍遥津以八百破十万，威震江东。"
    },
    {
      "id": "hanzhong",
      "name": "汉中",
      "lat": 33.07,
      "lng": 107.02,
      "desc": "益州北门，秦岭巴山之间的咽喉。刘备定军山斩夏侯渊而取之。"
    },
    {
      "id": "jieting",
      "name": "街亭",
      "lat": 34.85,
      "lng": 105.95,
      "desc": "陇右要隘。马谡违亮节度失之，第一次北伐功败垂成。"
    },
    {
      "id": "yiling",
      "name": "夷陵",
      "lat": 30.69,
      "lng": 111.29,
      "desc": "猇亭之战地。陆逊火烧连营七百里，大败刘备东征之师。"
    },
    {
      "id": "xiapi",
      "name": "下邳",
      "lat": 34.07,
      "lng": 117.94,
      "desc": "徐州重镇。吕布据此，为曹操所擒杀于白门楼。"
    },
    {
      "id": "shouchun",
      "name": "寿春",
      "lat": 32.56,
      "lng": 116.78,
      "desc": "淮南重镇。袁术称帝于此；后为诸葛诞淮南之乱、魏吴鏖兵之所。"
    },
    {
      "id": "youzhou",
      "name": "蓟",
      "lat": 39.9,
      "lng": 116.4,
      "desc": "幽州治所。公孙瓒据之，界桥败于袁绍，渐失河北。"
    },
    {
      "id": "liaodong",
      "name": "襄平",
      "lat": 41.8,
      "lng": 123.3,
      "desc": "辽东郡治。公孙度父子割据辽东，至公孙渊为司马懿所灭。"
    },
    {
      "id": "liangzhou",
      "name": "武威",
      "lat": 37.93,
      "lng": 102.63,
      "desc": "凉州治所。马超韩遂起兵反曹，关西骁勇之所出。"
    },
    {
      "id": "tianshui",
      "name": "天水",
      "lat": 34.58,
      "lng": 105.72,
      "desc": "陇右要郡。诸葛亮出祁山首攻之地，姜维之乡。"
    },
    {
      "id": "wan",
      "name": "宛城",
      "lat": 32.99,
      "lng": 112.53,
      "desc": "南阳郡治。张绣屯此，曾夜袭曹操，典韦战死。"
    },
    {
      "id": "xuzhou",
      "name": "徐州",
      "lat": 34.27,
      "lng": 117.18,
      "desc": "四战之地。陶谦、吕布、刘备、曹操数易其主，糜乱不休。"
    },
    {
      "id": "baidicheng",
      "name": "白帝城",
      "lat": 31.04,
      "lng": 109.46,
      "desc": "峡江之口。刘备夷陵败后托孤诸葛亮于此，改名永安。"
    },
    {
      "id": "wuzhangyuan",
      "name": "五丈原",
      "lat": 34.2,
      "lng": 107.65,
      "desc": "渭水南岸。诸葛亮最后一次北伐屯兵于此，病逝军中，年五十四。"
    },
    {
      "id": "mianzhu",
      "name": "绵竹",
      "lat": 31.4,
      "lng": 104.9,
      "desc": "蜀中北门。邓艾偷渡阴平后破诸葛瞻于此，直趋成都。"
    }
  ],
  "battles": [
    {
      "id": "huangjin",
      "name": "黄巾起义",
      "lat": 37.05,
      "lng": 115.4,
      "year": 184,
      "a": "黄巾军",
      "b": "东汉朝廷",
      "result": "朝廷镇压，乱虽平而州郡兵起",
      "desc": "张角以\"苍天已死，黄天当立\"号召，三十六方并起，席卷八州。乱平之后，地方割据之势已成。"
    },
    {
      "id": "hulaoguan",
      "name": "诸侯讨董",
      "lat": 34.95,
      "lng": 113.05,
      "year": 190,
      "a": "关东联军",
      "b": "董卓",
      "result": "联军瓦解，董卓挟帝西迁长安",
      "desc": "关东州郡推袁绍为盟主讨董卓。曹操汴水战败，联盟各怀异志，不久散去。"
    },
    {
      "id": "xiapi",
      "name": "下邳之战",
      "lat": 34.07,
      "lng": 117.94,
      "year": 198,
      "a": "曹操",
      "b": "吕布",
      "result": "曹操擒杀吕布，据徐州",
      "desc": "曹操围下邳，决水灌城，吕布部将侯成等执布降，缢杀于白门楼。"
    },
    {
      "id": "guandu",
      "name": "官渡之战",
      "lat": 34.74,
      "lng": 113.96,
      "year": 200,
      "a": "曹操",
      "b": "袁绍",
      "result": "曹操火烧乌巢，大破袁绍",
      "desc": "袁绍拥冀幽并青四州之众南下，曹操奇袭乌巢粮屯，以弱胜强，奠定统一北方之基。"
    },
    {
      "id": "chibi",
      "name": "赤壁之战",
      "lat": 29.72,
      "lng": 113.9,
      "year": 208,
      "a": "孙刘联军",
      "b": "曹操",
      "result": "火攻破曹，曹操北还",
      "desc": "曹操率大军南下，孙权刘备结盟。周瑜黄盖行苦肉计，火烧赤壁，曹军大败，三分雏形乃定。"
    },
    {
      "id": "jiangling",
      "name": "南郡之争",
      "lat": 30.35,
      "lng": 112.24,
      "year": 209,
      "a": "周瑜（吴）",
      "b": "曹仁（魏）",
      "result": "吴取南郡，刘备借荆州",
      "desc": "周瑜与曹仁相持岁余，卒取南郡。刘备乘势请领荆州，据有江南四郡。"
    },
    {
      "id": "dingjunshan",
      "name": "定军山之战",
      "lat": 32.95,
      "lng": 106.95,
      "year": 219,
      "a": "刘备",
      "b": "夏侯渊（魏）",
      "result": "黄忠斩夏侯渊，刘备取汉中",
      "desc": "刘备北攻汉中，老将黄忠居高临下，阵斩夏侯渊。曹操亲征无功，乃撤汉中之民。"
    },
    {
      "id": "xiangfan",
      "name": "襄樊之战",
      "lat": 32.04,
      "lng": 112.15,
      "year": 219,
      "a": "关羽（汉）",
      "b": "曹仁、于禁（魏）",
      "result": "关羽水淹七军，后失荆州败亡",
      "desc": "关羽北伐襄阳樊城，水淹七军、威震华夏；孙权命吕蒙袭取江陵，关羽回师败死。"
    },
    {
      "id": "hefei",
      "name": "逍遥津之战",
      "lat": 31.87,
      "lng": 117.25,
      "year": 215,
      "a": "张辽（魏）",
      "b": "孙权（吴）",
      "result": "张辽以少破众，孙权退走",
      "desc": "孙权率十万攻合肥，张辽率八百死士晨袭，直冲麾下，江东惊破胆，\"张辽止啼\"传为佳话。"
    },
    {
      "id": "yiling",
      "name": "夷陵之战",
      "lat": 30.69,
      "lng": 111.29,
      "year": 222,
      "a": "陆逊（吴）",
      "b": "刘备（蜀）",
      "result": "火攻破蜀，刘备败退白帝",
      "desc": "刘备倾国伐吴为关羽报仇。陆逊坚守待变，盛夏反攻，火烧连营，蜀军溃败。"
    },
    {
      "id": "jieting",
      "name": "街亭之失",
      "lat": 34.85,
      "lng": 105.95,
      "year": 228,
      "a": "马谡（蜀）",
      "b": "张郃（魏）",
      "result": "街亭失守，亮退兵",
      "desc": "诸葛亮首出祁山，马谡违令舍水上山，为张郃所破，陇右得而复失，亮挥泪斩马谡。"
    },
    {
      "id": "shiting",
      "name": "石亭之战",
      "lat": 31.25,
      "lng": 118.8,
      "year": 228,
      "a": "陆逊（吴）",
      "b": "曹休（魏）",
      "result": "吴大破魏兵，曹休惭恨而亡",
      "desc": "孙权佯降诱曹休深进，陆逊朱桓中路邀击，斩获万计，魏势稍敛于东。"
    },
    {
      "id": "wuzhangyuan",
      "name": "五丈原之战",
      "lat": 34.2,
      "lng": 107.65,
      "year": 234,
      "a": "诸葛亮（蜀）",
      "b": "司马懿（魏）",
      "result": "亮病卒军中，蜀退",
      "desc": "诸葛亮出斜谷屯五丈原，分兵屯田，与司马懿相持。亮积劳成疾，殁于军，谥忠武侯。"
    },
    {
      "id": "jianwei",
      "name": "魏灭蜀",
      "lat": 31.4,
      "lng": 104.9,
      "year": 263,
      "a": "邓艾 · 钟会（魏）",
      "b": "刘禅（蜀）",
      "result": "邓艾入成都，蜀汉亡",
      "desc": "钟会牵制汉中，邓艾偷渡阴平，奇袭成都。刘禅出降，立国四十三年的蜀汉就此终结。"
    },
    {
      "id": "miewu",
      "name": "晋灭吴",
      "lat": 32.06,
      "lng": 118.8,
      "year": 280,
      "a": "司马炎（晋）",
      "b": "孙皓（吴）",
      "result": "王濬楼船下益州，孙皓降，吴亡",
      "desc": "咸宁五年，晋六路伐吴。王濬率巴蜀楼船顺江东下，直指建业；杜预、王浑等分道并进。孙皓出降，三国归晋。"
    }
  ],
  "periods": [
    {
      "id": "huangjin",
      "year": 184,
      "eraLabel": "中平",
      "name": "黄巾之乱",
      "tagline": "汉室将倾 · 烽烟初燃",
      "summary": "桓灵昏庸，朝纲败坏。张角倡太平道，黄巾遍起八州，京师震动。虽旋被扑灭，然州郡拥兵、中央失控，乱世之幕由此拉开。",
      "focus": [
        34.5,
        113.5
      ],
      "zoom": 5.6,
      "battles": [
        "huangjin"
      ],
      "cities": [
        "luoyang",
        "changan",
        "ye",
        "xuchang",
        "wan",
        "youzhou",
        "liangzhou"
      ],
      "events": [
        {
          "year": 184,
          "era": "中平元年",
          "emperor": "汉灵帝",
          "text": "张角黄巾起义，天下响应"
        },
        {
          "year": 188,
          "era": "中平五年",
          "emperor": "汉灵帝",
          "text": "改刺史为州牧，地方兵权坐大"
        }
      ],
      "dynasty": "东汉",
      "reigns": [
        {
          "era": "中平",
          "emperor": "汉灵帝刘宏",
          "years": "184—189"
        }
      ]
    },
    {
      "id": "shaodi",
      "year": 189,
      "eraLabel": "光熹／昭宁／永汉",
      "name": "少帝即位",
      "tagline": "宫门流血 · 董卓入京",
      "summary": "灵帝崩，少帝刘辩即位；何进遇弑，董卓率兵入京，九月废少帝、立献帝。中央百官与州郡长吏仍属东汉官制，局势已由宫廷政变转入军阀入洛阳的过渡期。",
      "focus": [
        34.62,
        112.45
      ],
      "zoom": 5.8,
      "battles": [],
      "cities": [
        "luoyang",
        "changan",
        "ye",
        "youzhou",
        "liangzhou",
        "chengdu",
        "jianye"
      ],
      "officialRoster": [
        {"group":"中央百官","section":"诸公","period":"少帝期","name":"刘虞","office":"太尉","status":"推定"},
        {"group":"中央百官","section":"诸公","period":"少帝期","name":"丁宫","office":"司徒","status":"推定"},
        {"group":"中央百官","section":"诸公","period":"少帝期","name":"刘弘","office":"司空","status":"推定"},
        {"group":"中央百官","section":"诸公","period":"少帝期","name":"何进","office":"大将军·录尚书事","status":"推定"},
        {"group":"中央百官","section":"诸公","period":"少帝期／献帝初","name":"袁隗","office":"太傅·录尚书事","status":"推定"},
        {"group":"中央百官","section":"诸公","period":"献帝初","name":"董卓","office":"太尉·相国","status":"推定"},
        {"group":"中央百官","section":"诸公","period":"献帝初","name":"荀爽","office":"光禄勋·司空","status":"推定"},
        {"group":"中央百官","section":"诸公","period":"献帝初","name":"黄琬","office":"司徒·太尉","status":"推定"},
        {"group":"中央百官","section":"诸公","period":"献帝初","name":"赵谦","office":"光禄勋·太尉","status":"推定"},
        {"group":"中央百官","section":"诸公","period":"献帝初","name":"种拂","office":"光禄大夫·司空","status":"推定"},
        {"group":"中央百官","section":"尚书台","period":"少帝期","name":"朱隽","office":"尚书令","status":"存疑"},
        {"group":"中央百官","section":"尚书台","period":"献帝初","name":"王允","office":"尚书令","status":"推定"},
        {"group":"中央百官","section":"尚书台","period":"少帝期","name":"王允","office":"尚书仆射","status":"存疑"},
        {"group":"中央百官","section":"尚书台","period":"献帝初","name":"士孙瑞","office":"尚书仆射","status":"存疑"},
        {"group":"中央百官","section":"尚书台","period":"献帝初","name":"范馥","office":"尚书仆射","status":"存疑"},
        {"group":"中央百官","section":"尚书台","period":"少帝期","name":"梁鹄","office":"选部尚书","status":"存疑"},
        {"group":"中央百官","section":"尚书台","period":"献帝初","name":"全柔","office":"尚书右丞","status":"推定"},
        {"group":"中央百官","section":"尚书台","period":"少帝期／献帝初","name":"卢植","office":"尚书","status":"推定"},
        {"group":"中央百官","section":"尚书台","period":"少帝期","name":"韩馥","office":"尚书","status":"推定"},
        {"group":"中央百官","section":"尚书台","period":"少帝期／献帝初","name":"蔡邕","office":"尚书","status":"推定"},
        {"group":"中央百官","section":"尚书台","period":"献帝初","name":"郑泰","office":"尚书","status":"推定"},
        {"group":"中央百官","section":"尚书台","period":"献帝初","name":"韩融","office":"尚书","status":"推定"},
        {"group":"中央百官","section":"尚书台","period":"少帝期／献帝初","name":"许靖","office":"尚书郎","status":"推定"},
        {"group":"中央百官","section":"尚书台","period":"少帝期","name":"钟繇","office":"尚书郎","status":"存疑"},
        {"group":"中央百官","section":"尚书台","period":"少帝期／献帝初","name":"华歆","office":"尚书郎","status":"推定"},
        {"group":"中央百官","section":"尚书台","period":"少帝期","name":"郑泰","office":"尚书郎／侍御史","status":"推定"},
        {"group":"中央百官","section":"门下","period":"少帝期／献帝初","name":"刘繇","office":"侍中","status":"推定"},
        {"group":"中央百官","section":"门下","period":"少帝期","name":"郑玄","office":"侍中（父丧不行）","status":"存疑"},
        {"group":"中央百官","section":"门下","period":"少帝期","name":"伍孚","office":"侍中","status":"推定"},
        {"group":"中央百官","section":"门下","period":"少帝期","name":"金旋","office":"黄门侍郎","status":"存疑"},
        {"group":"中央百官","section":"门下","period":"少帝期","name":"张让、段圭、赵忠、宋典、段进","office":"中常侍","status":"推定"},
        {"group":"中央百官","section":"门下","period":"献帝初","name":"卢植","office":"侍中","status":"推定"},
        {"group":"中央百官","section":"门下","period":"献帝初","name":"周毖","office":"侍中","status":"推定"},
        {"group":"中央百官","section":"门下","period":"献帝初","name":"陈纪","office":"侍中","status":"推定"},
        {"group":"中央百官","section":"门下","period":"献帝初","name":"蔡邕","office":"侍中","status":"推定"},
        {"group":"中央百官","section":"门下","period":"献帝初","name":"鲁旭","office":"侍中","status":"推定"},
        {"group":"中央百官","section":"门下","period":"献帝初","name":"种辑","office":"侍中","status":"推定"},
        {"group":"中央百官","section":"门下","period":"献帝初","name":"种劭","office":"侍中","status":"推定"},
        {"group":"中央百官","section":"门下","period":"献帝初","name":"荀攸","office":"黄门侍郎","status":"推定"},
        {"group":"中央百官","section":"门下","period":"献帝初","name":"杨众","office":"谒者仆射","status":"推定"},
        {"group":"中央百官","section":"门下","period":"献帝初","name":"—","office":"中郎（失考）","status":"待考"},
        {"group":"中央百官","section":"列卿","period":"少帝期","name":"杨彪","office":"卫尉·太中大夫","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"少帝期","name":"丁原","office":"武猛都尉·执金吾","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"少帝期","name":"陈纪","office":"五官中郎将（征辟未到任）","status":"存疑"},
        {"group":"中央百官","section":"列卿","period":"少帝期","name":"赵舍","office":"御史中丞","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"少帝期","name":"韩馥","office":"御史中丞","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"献帝初","name":"马日䃅","office":"太常","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"献帝初","name":"韩融","office":"大鸿胪","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"献帝初","name":"阴修","office":"少府","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"献帝初","name":"王允","office":"太仆·司徒","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"献帝初","name":"袁基","office":"太仆","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"献帝初","name":"胡母班","office":"执金吾","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"少帝期／献帝初","name":"皇甫嵩","office":"城门校尉","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"献帝初","name":"伍琼","office":"城门校尉·督军校尉","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"献帝初","name":"李参","office":"城门校尉","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"献帝初","name":"吴修","office":"将作大匠","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"献帝初","name":"蔡邕","office":"左中郎将","status":"推定"},
        {"group":"中央百官","section":"列卿","period":"献帝初","name":"陈纪","office":"五官中郎将","status":"推定"},
        {"group":"中央百官","section":"大夫","period":"少帝期","name":"温毅","office":"光禄大夫","status":"推定"},
        {"group":"中央百官","section":"大夫","period":"少帝期","name":"种劭","office":"谏议大夫","status":"推定"},
        {"group":"中央百官","section":"大夫","period":"献帝初","name":"淳于嘉","office":"光禄大夫","status":"推定"},
        {"group":"中央百官","section":"御史台","period":"少帝期","name":"蔡邕","office":"侍御史·持书御史·尚书","status":"推定"},
        {"group":"中央百官","section":"御史台","period":"少帝期／献帝初","name":"司马防","office":"治书御史","status":"存疑"},
        {"group":"中央百官","section":"御史台","period":"少帝期","name":"刘诞","office":"治书御史","status":"存疑"},
        {"group":"中央百官","section":"御史台","period":"少帝期","name":"扰龙宗","office":"侍御史","status":"推定"},
        {"group":"中央百官","section":"御史台","period":"献帝初","name":"许靖","office":"御史中丞","status":"推定"},
        {"group":"中央百官","section":"御史台","period":"少帝期","name":"张昭","office":"议郎","status":"推定"},
        {"group":"中央百官","section":"御史台","period":"献帝初","name":"陈瑀","office":"议郎","status":"推定"},
        {"group":"中央百官","section":"御史台","period":"献帝初","name":"曹操","office":"议郎","status":"推定"},
        {"group":"中央百官","section":"御史台","period":"献帝初","name":"郑泰","office":"议郎","status":"推定"},
        {"group":"中央百官","section":"御史台","period":"少帝期","name":"缪斐","office":"博士","status":"存疑"},
        {"group":"中央军府","section":"军职","period":"少帝期","name":"何进","office":"大将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"少帝期","name":"董重","office":"骠骑将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"少帝期","name":"何苗","office":"车骑将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"少帝期","name":"皇甫嵩","office":"左将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"少帝期","name":"董卓","office":"前将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"少帝期","name":"袁隗","office":"后将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"少帝期","name":"贾琮","office":"度辽将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"刘虞","office":"太尉·大司马","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"袁绍","office":"车骑将军（自任）","status":"存疑"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"袁术","office":"后将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"董旻","office":"左将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"耿祉","office":"度辽将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"段猥","office":"宁辑将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"张杨","office":"建义将军·河内太守","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"曹操","office":"奋武将军（袁绍所任）","status":"存疑"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"孙坚","office":"破虏将军","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"牛辅","office":"中郎将","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"徐荣","office":"中郎将","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"董越","office":"东中郎将","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"贾诩","office":"讨虏校尉","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"李傕","office":"校尉","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"郭汜","office":"校尉","status":"推定"},
        {"group":"中央军府","section":"军职","period":"献帝初","name":"张济","office":"校尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"蹇硕","office":"上军校尉（不久被诛）","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期／献帝初","name":"桓典","office":"羽林中郎将","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"孔融","office":"虎贲中郎将（在职三日）","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"袁术","office":"虎贲中郎将·后将军","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"袁绍","office":"中军校尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期／献帝初","name":"刘表","office":"北军中候","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期／献帝初","name":"伍孚","office":"越骑校尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"曹操","office":"越骑校尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期／献帝初","name":"常洽","office":"长水校尉","status":"存疑"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"公孙瓒","office":"降虏校尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期／献帝初","name":"郑泰","office":"奉车都尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期／献帝初","name":"刘璋","office":"奉车都尉","status":"存疑"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"丁原","office":"武猛都尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"吕布","office":"武猛司马","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"士孙瑞","office":"鹰鹞都尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"魏杰","office":"破敌都尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"杜楷","office":"威虏都尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"杨儒","office":"鸟击都尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"少帝期","name":"第五儁","office":"清寇都尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"献帝初","name":"游殷","office":"羽林中郎将","status":"存疑"},
        {"group":"中央军府","section":"禁军","period":"献帝初","name":"董璜","office":"中军校尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"献帝初","name":"王瑰","office":"越骑校尉","status":"推定"},
        {"group":"中央军府","section":"禁军","period":"献帝初","name":"杨瓒","office":"护羌校尉","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"少帝期／献帝初","name":"袁绍","office":"司隶校尉","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"少帝期／献帝初","name":"盖勋","office":"京兆尹","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"少帝期","name":"杨黨","office":"长安令","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"少帝期","name":"王允","office":"河南尹","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"少帝期","name":"闵贡","office":"河南中部掾","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"少帝期","name":"杨原","office":"中牟令","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"少帝期","name":"杜阳","office":"河阴令","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"少帝期","name":"桓典","office":"平津都尉","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"少帝期","name":"贾诩","office":"平津都尉","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"少帝期／献帝初","name":"张承","office":"伊阙都尉","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"献帝初","name":"朱俊","office":"河南尹","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"献帝初","name":"许相","office":"伪河南尹","status":"存疑"},
        {"group":"州郡长吏","section":"司隶","period":"献帝初","name":"宋翼","office":"左冯翊","status":"存疑"},
        {"group":"州郡长吏","section":"司隶","period":"献帝初","name":"王宏","office":"右扶风","status":"存疑"},
        {"group":"州郡长吏","section":"司隶","period":"献帝初","name":"王匡","office":"河内太守","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"献帝初","name":"张杨","office":"河内太守","status":"推定"},
        {"group":"州郡长吏","section":"司隶","period":"献帝初","name":"樊陵","office":"伪司隶校尉","status":"存疑"},
        {"group":"州郡长吏","section":"司隶","period":"献帝初","name":"宣璠","office":"伪司隶校尉","status":"存疑"},
        {"group":"州郡长吏","section":"青州","period":"少帝期","name":"赵琰","office":"青州刺史","status":"推定"},
        {"group":"州郡长吏","section":"青州","period":"少帝期","name":"孔融","office":"北海太守","status":"推定"},
        {"group":"州郡长吏","section":"青州","period":"少帝期","name":"—","office":"平原相（阙）","status":"待考"},
        {"group":"州郡长吏","section":"青州","period":"献帝初","name":"焦和","office":"青州刺史","status":"推定"},
        {"group":"州郡长吏","section":"青州","period":"献帝初","name":"孔融","office":"北海相","status":"推定"},
        {"group":"州郡长吏","section":"并州","period":"少帝期／献帝初","name":"董卓","office":"并州牧","status":"推定"},
        {"group":"州郡长吏","section":"并州","period":"少帝期／献帝初","name":"崔钧","office":"西河太守","status":"推定"},
        {"group":"州郡长吏","section":"并州","period":"少帝期","name":"—","office":"上党太守（失考）","status":"待考"},
        {"group":"州郡长吏","section":"幽州","period":"少帝期／献帝初","name":"刘虞","office":"幽州牧","status":"推定"},
        {"group":"州郡长吏","section":"幽州","period":"少帝期／献帝初","name":"温恕","office":"涿郡太守","status":"存疑"},
        {"group":"州郡长吏","section":"幽州","period":"少帝期","name":"傅睿","office":"代郡太守","status":"存疑"},
        {"group":"州郡长吏","section":"幽州","period":"少帝期／献帝初","name":"公孙度","office":"辽东太守","status":"推定"},
        {"group":"州郡长吏","section":"幽州","period":"少帝期／献帝初","name":"公孙瓒","office":"辽东属国长史","status":"推定"},
        {"group":"州郡长吏","section":"幽州","period":"献帝初","name":"公孙昭","office":"襄平令","status":"推定"},
        {"group":"州郡长吏","section":"幽州","period":"献帝初","name":"高焉","office":"上谷太守","status":"存疑"},
        {"group":"州郡长吏","section":"幽州","period":"献帝初","name":"王泽","office":"代郡太守","status":"存疑"},
        {"group":"州郡长吏","section":"冀州","period":"少帝期","name":"公孙度","office":"冀州刺史","status":"存疑"},
        {"group":"州郡长吏","section":"冀州","period":"少帝期","name":"李邵","office":"钜鹿太守","status":"存疑"},
        {"group":"州郡长吏","section":"冀州","period":"少帝期","name":"—","office":"渤海太守（失考）","status":"待考"},
        {"group":"州郡长吏","section":"冀州","period":"少帝期","name":"董昭","office":"瘿陶长／柏人令","status":"存疑"},
        {"group":"州郡长吏","section":"冀州","period":"献帝初","name":"韩馥","office":"冀州刺史","status":"推定"},
        {"group":"州郡长吏","section":"冀州","period":"献帝初","name":"壶寿","office":"伪冀州牧","status":"存疑"},
        {"group":"州郡长吏","section":"冀州","period":"献帝初","name":"荀爽","office":"平原相（未行）","status":"存疑"},
        {"group":"州郡长吏","section":"冀州","period":"献帝初","name":"陈纪","office":"平原相（未行）","status":"存疑"},
        {"group":"州郡长吏","section":"冀州","period":"献帝初","name":"—","office":"中山相（失考）","status":"待考"},
        {"group":"州郡长吏","section":"冀州","period":"献帝初","name":"袁绍","office":"渤海太守","status":"推定"},
        {"group":"州郡长吏","section":"冀州","period":"献帝初","name":"姚贡","office":"甘陵相","status":"存疑"},
        {"group":"州郡长吏","section":"兖州","period":"少帝期","name":"—","office":"兖州刺史（未详）","status":"待考"},
        {"group":"州郡长吏","section":"兖州","period":"少帝期","name":"—","office":"东郡太守（阙）","status":"待考"},
        {"group":"州郡长吏","section":"兖州","period":"少帝期","name":"—","office":"济阴太守（阙）","status":"待考"},
        {"group":"州郡长吏","section":"兖州","period":"少帝期／献帝初","name":"张邈","office":"陈留太守","status":"推定"},
        {"group":"州郡长吏","section":"兖州","period":"少帝期／献帝初","name":"郑遂","office":"任城相","status":"存疑"},
        {"group":"州郡长吏","section":"兖州","period":"少帝期","name":"—","office":"东平相（阙）","status":"待考"},
        {"group":"州郡长吏","section":"兖州","period":"少帝期／献帝初","name":"袁遗","office":"山阳太守","status":"推定"},
        {"group":"州郡长吏","section":"兖州","period":"少帝期／献帝初","name":"应劭","office":"泰山太守","status":"推定"},
        {"group":"州郡长吏","section":"兖州","period":"少帝期","name":"—","office":"济北相（阙）","status":"待考"},
        {"group":"州郡长吏","section":"兖州","period":"献帝初","name":"刘岱","office":"兖州刺史","status":"推定"},
        {"group":"州郡长吏","section":"兖州","period":"献帝初","name":"桥瑁","office":"东郡太守","status":"推定"},
        {"group":"州郡长吏","section":"兖州","period":"献帝初","name":"王肱","office":"东郡太守（刘岱所任）","status":"存疑"},
        {"group":"州郡长吏","section":"兖州","period":"献帝初","name":"鲍信","office":"济北相","status":"推定"},
        {"group":"州郡长吏","section":"徐州","period":"少帝期／献帝初","name":"陶谦","office":"徐州刺史","status":"推定"},
        {"group":"州郡长吏","section":"徐州","period":"少帝期","name":"刘馗","office":"东海相","status":"存疑"},
        {"group":"州郡长吏","section":"徐州","period":"少帝期","name":"汲廉","office":"彭城相","status":"存疑"},
        {"group":"州郡长吏","section":"徐州","period":"少帝期／献帝初","name":"张超","office":"广陵太守","status":"推定"},
        {"group":"州郡长吏","section":"徐州","period":"少帝期","name":"臧洪","office":"广陵功曹","status":"推定"},
        {"group":"州郡长吏","section":"徐州","period":"少帝期／献帝初","name":"阴德","office":"琅琊相","status":"存疑"},
        {"group":"州郡长吏","section":"徐州","period":"少帝期","name":"赵昱","office":"莒长","status":"存疑"},
        {"group":"州郡长吏","section":"徐州","period":"少帝期","name":"—","office":"下邳相（失考）","status":"待考"},
        {"group":"州郡长吏","section":"荆州","period":"少帝期／献帝初","name":"王睿","office":"荆州刺史","status":"推定"},
        {"group":"州郡长吏","section":"荆州","period":"少帝期／献帝初","name":"张咨","office":"南阳太守","status":"推定"},
        {"group":"州郡长吏","section":"荆州","period":"少帝期／献帝初","name":"刘祥","office":"江夏太守","status":"推定"},
        {"group":"州郡长吏","section":"荆州","period":"少帝期／献帝初","name":"孙坚","office":"长沙太守","status":"推定"},
        {"group":"州郡长吏","section":"荆州","period":"少帝期","name":"韩说","office":"江夏太守","status":"存疑"},
        {"group":"州郡长吏","section":"荆州","period":"少帝期／献帝初","name":"张羡","office":"零陵／桂阳太守","status":"存疑"},
        {"group":"州郡长吏","section":"荆州","period":"少帝期／献帝初","name":"曹寅","office":"武陵太守","status":"推定"},
        {"group":"州郡长吏","section":"荆州","period":"献帝初","name":"刘表","office":"荆州刺史","status":"推定"},
        {"group":"州郡长吏","section":"荆州","period":"献帝初","name":"—","office":"南郡太守（失考）","status":"待考"},
        {"group":"州郡长吏","section":"荆州","period":"献帝初","name":"窦辅","office":"桂阳郡吏","status":"存疑"},
        {"group":"州郡长吏","section":"豫州","period":"少帝期","name":"黄琬","office":"豫州牧","status":"推定"},
        {"group":"州郡长吏","section":"豫州","period":"少帝期","name":"阴修","office":"颍川太守","status":"推定"},
        {"group":"州郡长吏","section":"豫州","period":"少帝期","name":"杨奇","office":"汝南太守","status":"推定"},
        {"group":"州郡长吏","section":"豫州","period":"少帝期","name":"蒯越","office":"汝阳令","status":"推定"},
        {"group":"州郡长吏","section":"豫州","period":"少帝期","name":"—","office":"梁相（失考）","status":"待考"},
        {"group":"州郡长吏","section":"豫州","period":"少帝期","name":"荀彧","office":"亢父令","status":"推定"},
        {"group":"州郡长吏","section":"豫州","period":"少帝期","name":"刘繇","office":"下邑长","status":"推定"},
        {"group":"州郡长吏","section":"豫州","period":"少帝期","name":"陈珪","office":"沛相","status":"存疑"},
        {"group":"州郡长吏","section":"豫州","period":"少帝期","name":"刘勋","office":"建平长","status":"推定"},
        {"group":"州郡长吏","section":"豫州","period":"少帝期／献帝初","name":"骆俊","office":"陈相","status":"推定"},
        {"group":"州郡长吏","section":"豫州","period":"献帝初","name":"孔胄","office":"豫州刺史","status":"推定"},
        {"group":"州郡长吏","section":"豫州","period":"献帝初","name":"李旻","office":"颍川太守","status":"存疑"},
        {"group":"州郡长吏","section":"豫州","period":"献帝初","name":"—","office":"汝南太守（失考）","status":"待考"},
        {"group":"州郡长吏","section":"豫州","period":"献帝初","name":"赵琰","office":"梁相","status":"推定"},
        {"group":"州郡长吏","section":"豫州","period":"献帝初","name":"袁忠","office":"沛相","status":"推定"},
        {"group":"州郡长吏","section":"豫州","period":"献帝初","name":"陈逸","office":"鲁相","status":"存疑"},
        {"group":"州郡长吏","section":"凉州","period":"少帝期","name":"张则","office":"凉州刺史","status":"推定"},
        {"group":"州郡长吏","section":"凉州","period":"少帝期","name":"杞匡","office":"安定太守","status":"推定"},
        {"group":"州郡长吏","section":"凉州","period":"少帝期","name":"赵岐","office":"敦煌太守","status":"存疑"},
        {"group":"州郡长吏","section":"凉州","period":"献帝初","name":"种劭","office":"凉州刺史（未就）","status":"存疑"},
        {"group":"州郡长吏","section":"益州","period":"少帝期／献帝初","name":"刘焉","office":"益州牧","status":"推定"},
        {"group":"州郡长吏","section":"益州","period":"少帝期","name":"张府君","office":"蜀郡太守","status":"推定"},
        {"group":"州郡长吏","section":"益州","period":"少帝期","name":"董扶","office":"蜀郡西部属国都尉","status":"推定"},
        {"group":"州郡长吏","section":"益州","period":"少帝期","name":"苏固","office":"汉中太守","status":"推定"},
        {"group":"州郡长吏","section":"益州","period":"少帝期","name":"杜畿","office":"汉中丞","status":"推定"},
        {"group":"州郡长吏","section":"益州","period":"少帝期","name":"赵部","office":"巴郡太守","status":"存疑"},
        {"group":"州郡长吏","section":"益州","period":"少帝期","name":"王咸","office":"巴郡太守","status":"存疑"},
        {"group":"州郡长吏","section":"益州","period":"少帝期","name":"李权","office":"临邛长","status":"推定"},
        {"group":"州郡长吏","section":"益州","period":"少帝期","name":"祝龟","office":"广汉郡葭萌长","status":"推定"},
        {"group":"州郡长吏","section":"益州","period":"少帝期","name":"任岐","office":"犍为太守","status":"存疑"},
        {"group":"州郡长吏","section":"益州","period":"少帝期","name":"刘宠","office":"牂柯太守","status":"推定"},
        {"group":"州郡长吏","section":"益州","period":"献帝初","name":"许靖","office":"巴郡太守（不行）","status":"存疑"},
        {"group":"州郡长吏","section":"益州","period":"献帝初","name":"樊敏","office":"巴郡太守","status":"推定"},
        {"group":"州郡长吏","section":"扬州","period":"少帝期／献帝初","name":"陈温","office":"扬州刺史","status":"存疑"},
        {"group":"州郡长吏","section":"扬州","period":"少帝期","name":"盛宪","office":"吴郡太守","status":"存疑"},
        {"group":"州郡长吏","section":"扬州","period":"少帝期","name":"许贡","office":"吴郡都尉","status":"存疑"},
        {"group":"州郡长吏","section":"扬州","period":"少帝期","name":"—","office":"丹阳太守（阙）","status":"待考"},
        {"group":"州郡长吏","section":"扬州","period":"少帝期／献帝初","name":"唐瑁","office":"会稽太守","status":"存疑"},
        {"group":"州郡长吏","section":"扬州","period":"少帝期","name":"陆康","office":"庐江太守","status":"推定"},
        {"group":"州郡长吏","section":"扬州","period":"少帝期","name":"服虔","office":"九江太守","status":"存疑"},
        {"group":"州郡长吏","section":"扬州","period":"少帝期","name":"周术","office":"豫章太守","status":"存疑"},
        {"group":"州郡长吏","section":"扬州","period":"少帝期","name":"陆康侄（疑陆骏）","office":"宜春长","status":"存疑"},
        {"group":"州郡长吏","section":"扬州","period":"献帝初","name":"陈瑀","office":"吴郡太守（不行）","status":"存疑"},
        {"group":"州郡长吏","section":"扬州","period":"献帝初","name":"芮祉","office":"吴郡太守（孙坚所任）","status":"存疑"},
        {"group":"州郡长吏","section":"扬州","period":"献帝初","name":"边让","office":"九江太守","status":"存疑"},
        {"group":"州郡长吏","section":"扬州","period":"献帝初","name":"周昂","office":"九江太守（袁绍所用）","status":"存疑"},
        {"group":"州郡长吏","section":"扬州","period":"献帝初","name":"周昕","office":"丹阳太守","status":"存疑"},
        {"group":"州郡长吏","section":"交州","period":"少帝期／献帝初","name":"—","office":"交州刺史（阙）","status":"待考"},
        {"group":"州郡长吏","section":"交州","period":"少帝期／献帝初","name":"士燮","office":"交阯太守","status":"推定"},
        {"group":"州郡长吏","section":"交州","period":"献帝初","name":"虞国","office":"日南太守","status":"存疑"}
      ],
      "routes": [
        {
          "faction": "dongzhuo",
          "name": "董卓入京",
          "pts": [
            [
              34.27,
              108.95
            ],
            [
              34.45,
              110.2
            ],
            [
              34.62,
              112.45
            ]
          ]
        }
      ],
      "events": [
        {
          "year": 189,
          "era": "中平六年／光熹、昭宁、永汉",
          "emperor": "汉少帝刘辩／汉献帝刘协",
          "text": "灵帝崩，少帝即位；何进遇弑，董卓入京，九月废少帝、立献帝"
        }
      ],
      "dynasty": "东汉",
      "reigns": [
        {
          "era": "光熹／昭宁／永汉",
          "emperor": "汉少帝刘辩／汉献帝刘协",
          "years": "189"
        },
        {
          "era": "中平",
          "emperor": "汉灵帝刘宏",
          "years": "184—189"
        }
      ]
    },
    {
      "id": "dongzhuo",
      "year": 190,
      "eraLabel": "初平",
      "name": "群雄讨董",
      "tagline": "群雄讨董 · 中原板荡",
      "summary": "190—191 年关东州郡推袁绍为盟主讨董；袁绍、曹操、袁术、孙坚等各有屯驻，董卓焚洛阳、迁献帝于长安，联盟随后瓦解。",
      "focus": [
        34.5,
        113.5
      ],
      "zoom": 5.6,
      "battles": [
        "hulaoguan",
        "xiapi"
      ],
      "cities": [
        "luoyang",
        "changan",
        "xuchang",
        "ye",
        "xiapi",
        "xuzhou",
        "youzhou",
        "liaodong",
        "liangzhou"
      ],
      "routes": [
        {
          "faction": "lianjun",
          "name": "关东联军进讨",
          "pts": [
            [
              35.15,
              114.35
            ],
            [
              34.95,
              113.6
            ],
            [
              34.95,
              113.05
            ]
          ]
        },
        {
          "faction": "dongzhuo",
          "name": "董卓迁都长安",
          "pts": [
            [
              34.62,
              112.45
            ],
            [
              34.55,
              110.9
            ],
            [
              34.27,
              108.95
            ]
          ]
        }
      ],
      "events": [
        {
          "year": 189,
          "era": "中平六年 / 永汉元年",
          "emperor": "汉献帝",
          "text": "董卓废少帝，立献帝"
        },
        {
          "year": 190,
          "era": "初平元年",
          "emperor": "汉献帝",
          "text": "关东联军讨董，董卓焚洛阳迁都"
        },
        {
          "year": 192,
          "era": "初平三年",
          "emperor": "汉献帝",
          "text": "王允吕布诛董卓"
        }
      ],
      "dynasty": "东汉",
      "reigns": [
        {
          "era": "初平",
          "emperor": "汉献帝刘协",
          "years": "190—193"
        }
      ]
    },
    {
      "id": "xingping",
      "year": 194,
      "eraLabel": "兴平",
      "name": "兴平割据",
      "tagline": "兖徐易主 · 群雄并峙",
      "summary": "兴平元年，吕布袭兖州，曹操失兖州大部；陶谦卒，刘备领徐州；刘焉卒，刘璋继任益州牧；孙策仍依袁术，次年方渡江。",
      "focus": [
        34.8,
        114.8
      ],
      "zoom": 5.6,
      "battles": [
        "puyang"
      ],
      "cities": [
        "luoyang",
        "changan",
        "xuchang",
        "ye",
        "xiapi",
        "xuzhou",
        "jiangling",
        "chengdu",
        "hanzhong",
        "liaodong",
        "youzhou",
        "liangzhou"
      ],
      "events": [
        {
          "year": 194,
          "era": "兴平元年",
          "emperor": "汉献帝",
          "text": "吕布袭兖州，与曹操争夺濮阳"
        },
        {
          "year": 194,
          "era": "兴平元年",
          "emperor": "汉献帝",
          "text": "陶谦卒，刘备领徐州牧"
        },
        {
          "year": 194,
          "era": "兴平元年",
          "emperor": "汉献帝",
          "text": "刘焉卒，刘璋继任益州牧；河西四郡置雍州"
        }
      ],
      "dynasty": "东汉",
      "reigns": [
        {
          "era": "兴平",
          "emperor": "汉献帝刘协",
          "years": "194—195"
        }
      ]
    },
    {
      "id": "jianbing",
      "year": 199,
      "eraLabel": "建安",
      "name": "群雄兼并",
      "tagline": "河北归一 · 江东初定",
      "summary": "袁绍破公孙瓒，据有河北四州；曹操挟天子于许，兖豫徐连成一片；孙策平定江东，刘表保荆州，刘璋据益州，张鲁据汉中，公孙度割辽东。",
      "focus": [
        34.5,
        114.5
      ],
      "zoom": 5.6,
      "battles": [],
      "cities": [
        "luoyang",
        "changan",
        "xuchang",
        "ye",
        "xiangyang",
        "jiangling",
        "jianye",
        "chengdu",
        "hanzhong",
        "liaodong",
        "youzhou",
        "xuzhou"
      ],
      "events": [
        {
          "year": 199,
          "era": "建安四年",
          "emperor": "汉献帝",
          "text": "袁绍攻灭公孙瓒，据有河北四州"
        },
        {
          "year": 199,
          "era": "建安四年",
          "emperor": "汉献帝",
          "text": "孙策平定江东，刘备受封左将军后叛据徐州"
        }
      ],
      "dynasty": "东汉",
      "reigns": [
        {
          "era": "建安",
          "emperor": "汉献帝刘协",
          "years": "196—220"
        }
      ]
    },
    {
      "id": "guandu",
      "year": 200,
      "eraLabel": "建安",
      "name": "官渡之战",
      "tagline": "曹操崛起 · 北疆一统",
      "summary": "袁绍据河北四州，拥众南下；曹操挟天子，兵力寡弱。官渡相持，曹操奇袭乌巢，焚其辎重，袁绍溃败。自此北方渐归一统。",
      "focus": [
        35.5,
        114
      ],
      "zoom": 6,
      "battles": [
        "xiapi",
        "guandu"
      ],
      "cities": [
        "ye",
        "xuchang",
        "luoyang",
        "guandu",
        "xiapi",
        "xuzhou",
        "youzhou",
        "liaodong",
        "liangzhou"
      ],
      "routes": [
        {
          "faction": "yuan_shao",
          "name": "袁绍南下",
          "pts": [
            [
              36.07,
              114.62
            ],
            [
              35.68,
              114.45
            ],
            [
              35.58,
              114.52
            ],
            [
              35.2,
              114.2
            ],
            [
              34.74,
              113.96
            ]
          ]
        },
        {
          "faction": "caocao",
          "name": "曹操拒官渡",
          "pts": [
            [
              34.04,
              113.85
            ],
            [
              34.5,
              113.9
            ],
            [
              34.74,
              113.96
            ]
          ]
        }
      ],
      "events": [
        {
          "year": 196,
          "era": "建安元年",
          "emperor": "汉献帝",
          "text": "曹操迎献帝都许，挟天子令诸侯"
        },
        {
          "year": 200,
          "era": "建安五年",
          "emperor": "汉献帝",
          "text": "官渡之战，曹操烧乌巢破袁绍"
        },
        {
          "year": 202,
          "era": "建安七年",
          "emperor": "汉献帝",
          "text": "袁绍死，诸子相攻"
        }
      ],
      "dynasty": "东汉",
      "reigns": [
        {
          "era": "建安",
          "emperor": "汉献帝刘协",
          "years": "196—220"
        }
      ]
    },
    {
      "id": "chibi",
      "year": 208,
      "eraLabel": "建安",
      "name": "赤壁之战",
      "tagline": "烈火长江 · 三分雏形",
      "summary": "曹操既平河北，南取荆州，顺流东下欲并江东。孙权决计联刘，周瑜黄盖行火攻，赤壁一炬，曹军北还。天下三分之势，于此而定。",
      "focus": [
        31.5,
        113
      ],
      "zoom": 5.6,
      "battles": [
        "chibi",
        "hefei",
        "jiangling"
      ],
      "cities": [
        "xuchang",
        "ye",
        "luoyang",
        "xiangyang",
        "jiangling",
        "chibi",
        "jianye",
        "chengdu",
        "hefei",
        "hanzhong"
      ],
      "routes": [
        {
          "faction": "caocao",
          "name": "曹操顺江东下",
          "pts": [
            [
              32.01,
              112.13
            ],
            [
              30.35,
              112.24
            ],
            [
              29.38,
              113.09
            ],
            [
              29.72,
              113.9
            ]
          ]
        },
        {
          "faction": "sunquan",
          "name": "周瑜逆江拒曹",
          "pts": [
            [
              29.7,
              115.85
            ],
            [
              30.42,
              114.85
            ],
            [
              29.72,
              113.9
            ]
          ]
        },
        {
          "faction": "liubei",
          "name": "刘备进驻樊口",
          "pts": [
            [
              30.55,
              114.28
            ],
            [
              30.42,
              114.85
            ]
          ]
        }
      ],
      "events": [
        {
          "year": 208,
          "era": "建安十三年",
          "emperor": "汉献帝",
          "text": "曹操取荆州，赤壁联营败北"
        },
        {
          "year": 209,
          "era": "建安十四年",
          "emperor": "汉献帝",
          "text": "周瑜取南郡，刘备领荆州"
        },
        {
          "year": 211,
          "era": "建安十六年",
          "emperor": "汉献帝",
          "text": "刘备入益州"
        }
      ],
      "dynasty": "东汉",
      "reigns": [
        {
          "era": "建安",
          "emperor": "汉献帝刘协",
          "years": "196—220"
        }
      ]
    },
    {
      "id": "xiangfan",
      "year": 219,
      "eraLabel": "建安",
      "name": "襄樊之战",
      "tagline": "荆益连横 · 水淹七军",
      "summary": "刘备取汉中称汉中王；关羽北伐襄樊，水淹七军，威震华夏。孙权旋袭荆州，关羽败亡，荆州转入孙吴，天下格局再变。",
      "focus": [
        31.5,
        111.5
      ],
      "zoom": 5.4,
      "battles": [
        "dingjunshan",
        "xiangfan"
      ],
      "cities": [
        "luoyang",
        "changan",
        "xuchang",
        "ye",
        "xiangyang",
        "jiangling",
        "jianye",
        "chengdu",
        "hanzhong",
        "hefei",
        "liaodong"
      ],
      "events": [
        {
          "year": 219,
          "era": "建安二十四年",
          "emperor": "汉献帝",
          "text": "刘备取汉中，自称汉中王"
        },
        {
          "year": 219,
          "era": "建安二十四年",
          "emperor": "汉献帝",
          "text": "关羽围襄樊，水淹七军；吕蒙袭江陵，关羽败死"
        }
      ],
      "dynasty": "东汉",
      "reigns": [
        {
          "era": "建安",
          "emperor": "汉献帝刘协",
          "years": "196—220"
        }
      ]
    },
    {
      "id": "sanguo",
      "year": 220,
      "eraLabel": "黄初",
      "name": "三国鼎立",
      "tagline": "魏蜀吴立 · 鼎足而立",
      "summary": "曹丕代汉称帝，国号魏；刘备继汉祚于成都；孙权受魏封吴王，后亦称帝。中原、巴蜀、江东三分之局正式确立，彼此攻守不已。",
      "focus": [
        32.5,
        112.5
      ],
      "zoom": 5.4,
      "battles": [
        "dingjunshan",
        "jiangling",
        "hefei"
      ],
      "cities": [
        "luoyang",
        "ye",
        "xuchang",
        "chengdu",
        "hanzhong",
        "jianye",
        "xiangyang",
        "jiangling",
        "hefei",
        "changan"
      ],
      "routes": [
        {
          "faction": "shu",
          "name": "刘备攻汉中",
          "pts": [
            [
              30.66,
              104.07
            ],
            [
              32.2,
              105.8
            ],
            [
              33.05,
              106.75
            ],
            [
              32.95,
              106.95
            ]
          ]
        },
        {
          "faction": "shu",
          "name": "关羽北伐襄樊",
          "pts": [
            [
              30.35,
              112.24
            ],
            [
              31.2,
              112.1
            ],
            [
              32.01,
              112.13
            ]
          ]
        },
        {
          "faction": "wu",
          "name": "吕蒙白衣渡江",
          "pts": [
            [
              29.83,
              113.87
            ],
            [
              30.1,
              112.9
            ],
            [
              30.35,
              112.24
            ]
          ]
        }
      ],
      "events": [
        {
          "year": 220,
          "era": "延康 / 黄初",
          "emperor": "汉献帝 / 魏文帝",
          "text": "曹丕受魏禅，代汉称帝"
        },
        {
          "year": 221,
          "era": "黄初 / 章武",
          "emperor": "魏文帝 / 汉昭烈帝",
          "text": "刘备称帝于成都，国号汉"
        },
        {
          "year": 222,
          "era": "黄武",
          "emperor": "吴大帝",
          "text": "夷陵之战，吴败蜀汉；孙权称吴王"
        },
        {
          "year": 229,
          "era": "黄龙",
          "emperor": "吴大帝",
          "text": "孙权称帝，国号吴"
        }
      ],
      "dynasty": "三国",
      "reigns": [
        {
          "era": "黄初",
          "emperor": "魏文帝曹丕",
          "years": "220—226"
        },
        {
          "era": "章武",
          "emperor": "汉昭烈帝刘备",
          "years": "221—223"
        },
        {
          "era": "黄武",
          "emperor": "吴大帝孙权",
          "years": "222—229"
        }
      ]
    },
    {
      "id": "beifa",
      "year": 228,
      "eraLabel": "太和／建兴／黄武",
      "name": "北伐夷陵",
      "tagline": "鞠躬尽瘁 · 祁山烟尘",
      "summary": "蜀汉诸葛亮秉遗志六出祁山，图复中原；吴魏石亭交锋；此前夷陵一败，蜀势受挫。武侯星陨五丈原，北伐之志未竟。",
      "focus": [
        33,
        107.5
      ],
      "zoom": 5.4,
      "battles": [
        "yiling",
        "jieting",
        "shiting",
        "wuzhangyuan"
      ],
      "cities": [
        "chengdu",
        "hanzhong",
        "tianshui",
        "jieting",
        "wuzhangyuan",
        "jianye",
        "hefei",
        "baidicheng",
        "luoyang",
        "ye"
      ],
      "routes": [
        {
          "faction": "shu",
          "name": "刘备东征伐吴",
          "pts": [
            [
              31.04,
              109.46
            ],
            [
              30.83,
              110.71
            ],
            [
              30.53,
              111.42
            ],
            [
              30.69,
              111.29
            ]
          ]
        },
        {
          "faction": "shu",
          "name": "诸葛亮一出祁山",
          "pts": [
            [
              33.07,
              107.02
            ],
            [
              33.6,
              106
            ],
            [
              34.19,
              105.3
            ],
            [
              34.85,
              105.95
            ]
          ]
        },
        {
          "faction": "shu",
          "name": "诸葛亮出斜谷",
          "pts": [
            [
              33.07,
              107.02
            ],
            [
              33.85,
              107.35
            ],
            [
              34.2,
              107.65
            ]
          ]
        }
      ],
      "events": [
        {
          "year": 222,
          "era": "黄武 / 章武",
          "emperor": "吴大帝 / 汉昭烈帝",
          "text": "夷陵之战，陆逊败刘备"
        },
        {
          "year": 228,
          "era": "太和 / 建兴",
          "emperor": "魏明帝 / 蜀汉后主",
          "text": "诸葛亮首出祁山，失街亭"
        },
        {
          "year": 234,
          "era": "青龙 / 建兴",
          "emperor": "魏明帝 / 蜀汉后主",
          "text": "武侯薨于五丈原"
        }
      ],
      "dynasty": "三国",
      "reigns": [
        {
          "era": "太和",
          "emperor": "魏明帝曹叡",
          "years": "227—233"
        },
        {
          "era": "建兴",
          "emperor": "蜀汉后主刘禅",
          "years": "223—237"
        },
        {
          "era": "黄龙",
          "emperor": "吴大帝孙权",
          "years": "229—231"
        }
      ]
    },
    {
      "id": "guijin",
      "year": 263,
      "eraLabel": "景元／炎兴／永安",
      "name": "三国归晋",
      "tagline": "金戈息影 · 天下复一",
      "summary": "魏室权归司马氏。景元四年，钟会邓艾伐蜀，偷渡阴平，刘禅出降。晋已并蜀汉之地，吴独存江南，南北对峙。",
      "focus": [
        32.5,
        110.5
      ],
      "zoom": 5.2,
      "battles": [
        "jianwei"
      ],
      "cities": [
        "luoyang",
        "ye",
        "chengdu",
        "mianzhu",
        "jianye",
        "xiangyang",
        "jiangling",
        "hefei",
        "hanzhong"
      ],
      "routes": [
        {
          "faction": "jin",
          "name": "钟会攻关中汉中",
          "pts": [
            [
              34.27,
              108.95
            ],
            [
              33.7,
              107.2
            ],
            [
              33.07,
              107.02
            ]
          ]
        },
        {
          "faction": "jin",
          "name": "邓艾偷渡阴平",
          "pts": [
            [
              32.95,
              104.68
            ],
            [
              31.78,
              104.75
            ],
            [
              31.4,
              104.9
            ],
            [
              30.66,
              104.07
            ]
          ]
        }
      ],
      "events": [
        {
          "year": 263,
          "era": "景元 / 炎兴",
          "emperor": "魏元帝 / 蜀汉后主",
          "text": "邓艾入成都，蜀汉亡"
        },
        {
          "year": 266,
          "era": "泰始",
          "emperor": "晋武帝",
          "text": "司马炎受魏禅，建西晋"
        },
        {
          "year": 280,
          "era": "咸宁 / 天纪",
          "emperor": "晋武帝 / 吴末帝",
          "text": "晋灭吴，天下复归一统"
        }
      ],
      "dynasty": "三国",
      "reigns": [
        {
          "era": "景元",
          "emperor": "魏元帝曹奂",
          "years": "260—264"
        },
        {
          "era": "炎兴",
          "emperor": "蜀汉后主刘禅",
          "years": "263"
        },
        {
          "era": "永安",
          "emperor": "吴景帝孙休",
          "years": "258—264"
        }
      ]
    },
    {
      "id": "taikang",
      "year": 280,
      "name": "太康一统",
      "tagline": "三分归晋 · 九州混一",
      "summary": "咸宁六年，晋六路伐吴，王濬楼船下益州，孙皓出降。自黄巾以来近百年的分裂暂告结束，天下复归一统。太康年间，晋置司、豫、兖、徐、青、冀、幽、平、并、凉、秦、梁、益、宁、荆、扬、交、广、雍十九州。",
      "focus": [
        33,
        112
      ],
      "zoom": 5,
      "battles": [
        "miewu"
      ],
      "cities": [
        "luoyang",
        "jianye",
        "chengdu",
        "ye",
        "xiangyang",
        "jiangling",
        "hefei",
        "changan"
      ],
      "routes": [
        {
          "faction": "jin",
          "name": "王濬楼船下益州",
          "pts": [
            [
              30.66,
              104.07
            ],
            [
              29.5,
              111.3
            ],
            [
              31,
              115.5
            ],
            [
              32.06,
              118.8
            ]
          ]
        },
        {
          "faction": "jin",
          "name": "杜预南征荆州",
          "pts": [
            [
              34.62,
              112.45
            ],
            [
              32.01,
              112.13
            ],
            [
              30.35,
              112.24
            ]
          ]
        }
      ],
      "events": [
        {
          "year": 266,
          "era": "泰始元年",
          "emperor": "晋武帝",
          "text": "司马炎受魏禅，建西晋"
        },
        {
          "year": 280,
          "era": "太康元年 / 天纪四年",
          "emperor": "晋武帝 / 吴末帝孙皓",
          "text": "晋灭吴，三分归于一统"
        },
        {
          "year": 280,
          "era": "太康元年",
          "emperor": "晋武帝",
          "text": "分天下为十九州"
        }
      ],
      "dynasty": "西晋",
      "reigns": [
        {
          "era": "太康",
          "emperor": "晋武帝司马炎",
          "years": "280—289"
        }
      ]
    },
    {
      "id": "hui_di",
      "year": 290,
      "eraLabel": "太熙／永熙",
      "name": "惠帝嗣位",
      "tagline": "武帝晏驾 · 乱端肇启",
      "summary": "太熙元年武帝崩，惠帝即位。贾后干政、八王之乱渐起，但西晋疆域仍大体维持统一，州制延续太康十九州。",
      "focus": [
        33,
        112
      ],
      "zoom": 5,
      "battles": [],
      "cities": [
        "luoyang",
        "changan",
        "ye",
        "jianye",
        "chengdu",
        "xiangyang"
      ],
      "events": [
        {
          "year": 290,
          "era": "太熙元年",
          "emperor": "晋武帝／晋惠帝",
          "text": "武帝崩，惠帝即位，八王之乱序幕开启"
        },
        {
          "year": 291,
          "era": "元康元年",
          "emperor": "晋惠帝",
          "text": "贾后诛杨骏，专擅朝政"
        }
      ],
      "dynasty": "西晋",
      "reigns": [
        {
          "era": "太熙",
          "emperor": "晋武帝司马炎",
          "years": "290"
        },
        {
          "era": "永熙",
          "emperor": "晋惠帝司马衷",
          "years": "290—291"
        }
      ]
    },
    {
      "id": "yongjia",
      "year": 311,
      "eraLabel": "永嘉",
      "name": "永嘉之乱",
      "tagline": "胡骑入洛 · 神州陆沉",
      "summary": "永嘉五年，刘聪遣刘曜、石勒等攻陷洛阳，俘怀帝。中原大乱，并州为汉赵、河北为石勒所据，琅邪王司马睿经营江东，西晋名存实亡。",
      "focus": [
        34.5,
        113
      ],
      "zoom": 5.2,
      "battles": [],
      "cities": [
        "luoyang",
        "changan",
        "jianye",
        "ye",
        "xiangyang",
        "chengdu"
      ],
      "events": [
        {
          "year": 308,
          "era": "永嘉二年",
          "emperor": "晋怀帝",
          "text": "刘渊称帝，国号汉，都平阳"
        },
        {
          "year": 311,
          "era": "永嘉五年",
          "emperor": "晋怀帝",
          "text": "刘曜、石勒攻陷洛阳，俘怀帝"
        },
        {
          "year": 311,
          "era": "永嘉五年",
          "emperor": "晋怀帝",
          "text": "琅邪王司马睿用王导策，经营江东"
        }
      ],
      "dynasty": "西晋",
      "reigns": [
        {
          "era": "永嘉",
          "emperor": "晋怀帝司马炽",
          "years": "307—311"
        }
      ]
    }
  ]
};
