/* 县政区索引：以维基百科及郡县沿革资料整理的县名考据层。
 * 坐标只标注郡治和重要县，非完整县级测绘；点击县名可打开维基百科检索。
 */
window.COUNTY_REGISTRY = {
  meta: {
    title: '县政区索引',
    source: '维基百科及各郡沿革条目',
    note: '县名单为考据索引；未列坐标的县不在图上打点，仍可在郡级面板检索。',
  },
  commanderies: {
    Henan: {
      label: '河南尹', url: 'https://zh.wikipedia.org/wiki/河南尹', seat: '洛阳',
      counties: [
        { name: '洛阳', pos: [34.62, 112.45], seat: true },
        { name: '荥阳', pos: [34.79, 113.35] },
        { name: '中牟', pos: [34.72, 113.97] },
        { name: '开封', pos: [34.79, 114.30] },
        { name: '成皋', pos: [34.87, 113.15] },
        { name: '偃师' }, { name: '缑氏' }, { name: '巩' }, { name: '新城' },
        { name: '阳武' }, { name: '卷' }, { name: '原武' }, { name: '平阴' },
        { name: '谷城' }, { name: '密' }
      ]
    },
    Jingzhao: {
      label: '京兆尹', url: 'https://zh.wikipedia.org/wiki/京兆尹', seat: '长安',
      counties: [
        { name: '长安', pos: [34.27, 108.95], seat: true },
        { name: '蓝田', pos: [34.15, 109.32] },
        { name: '新丰', pos: [34.40, 109.22] },
        { name: '郑', pos: [34.50, 109.95] },
        { name: '上雒', pos: [33.87, 109.94] },
        { name: '商', pos: [33.76, 109.97] },
        { name: '下邽', pos: [34.75, 109.67] },
        { name: '杜陵', pos: [34.17, 109.03] },
        { name: '霸陵', pos: [34.31, 109.13] },
        { name: '长陵' }, { name: '阳陵' }, { name: '阴盘' }
      ]
    },
    Pingyi: {
      label: '左冯翊', url: 'https://zh.wikipedia.org/wiki/左馮翊', seat: '高陵',
      counties: [
        { name: '高陵', pos: [34.53, 109.09], seat: true },
        { name: '栎阳', pos: [34.62, 109.14] },
        { name: '临晋', pos: [34.80, 110.05] },
        { name: '郃阳', pos: [35.16, 110.16] },
        { name: '夏阳', pos: [35.33, 110.43] },
        { name: '云阳', pos: [34.85, 108.90] },
        { name: '万年' }, { name: '重泉' }, { name: '莲勺' }, { name: '衙' },
        { name: '粟邑' }, { name: '频阳' }
      ]
    },
    Fufeng: {
      label: '右扶风', url: 'https://zh.wikipedia.org/wiki/右扶風', seat: '槐里',
      counties: [
        { name: '槐里', pos: [34.27, 108.58], seat: true },
        { name: '茂陵', pos: [34.32, 108.70] },
        { name: '平陵', pos: [34.34, 108.65] },
        { name: '郿', pos: [34.28, 107.75] },
        { name: '武功', pos: [34.25, 108.00] },
        { name: '美阳', pos: [34.40, 107.80] },
        { name: '雍', pos: [34.65, 107.40] },
        { name: '陈仓', pos: [34.37, 107.13] },
        { name: '安陵' }, { name: '鄠' }, { name: '盩厔' }, { name: '汧' },
        { name: '漆' }, { name: '杜阳' }, { name: '渝麋' }
      ]
    },
    Hongnong: {
      label: '弘农郡', url: 'https://zh.wikipedia.org/wiki/弘農郡', seat: '弘农',
      counties: [
        { name: '弘农', pos: [34.52, 110.95], seat: true },
        { name: '陕', pos: [34.73, 111.10] },
        { name: '渑池', pos: [34.76, 111.76] },
        { name: '新安', pos: [34.70, 112.13] },
        { name: '宜阳', pos: [34.50, 112.17] },
        { name: '陆浑', pos: [34.25, 111.90] },
        { name: '卢氏', pos: [34.05, 111.05] },
        { name: '华阴', pos: [34.56, 110.11] }
      ]
    },
    Henei: {
      label: '河内郡', url: 'https://zh.wikipedia.org/wiki/河內郡', seat: '怀',
      counties: [
        { name: '怀', pos: [35.10, 113.00], seat: true },
        { name: '河阳', pos: [34.93, 112.86] },
        { name: '野王', pos: [35.14, 112.95] },
        { name: '温', pos: [34.95, 112.97] },
        { name: '山阳', pos: [35.20, 113.30] },
        { name: '修武', pos: [35.23, 113.45] },
        { name: '获嘉', pos: [35.28, 113.70] },
        { name: '共', pos: [35.35, 113.70] },
        { name: '朝歌', pos: [35.62, 114.15] },
        { name: '林虑', pos: [36.08, 113.80] },
        { name: '荡阴', pos: [35.92, 114.33] },
        { name: '汲', pos: [35.48, 114.10] },
        { name: '州' }, { name: '平皋' }, { name: '武德' }
      ]
    },
    Hedong: {
      label: '河东郡', url: 'https://zh.wikipedia.org/wiki/河東郡', seat: '安邑',
      counties: [
        { name: '安邑', pos: [35.08, 111.00], seat: true },
        { name: '闻喜', pos: [35.35, 111.20] },
        { name: '猗氏', pos: [35.17, 110.60] },
        { name: '平阳', pos: [36.08, 111.52] },
        { name: '蒲坂', pos: [34.85, 110.30] },
        { name: '解', pos: [34.90, 110.90] },
        { name: '杨', pos: [35.65, 110.90] },
        { name: '临汾', pos: [35.90, 111.20] },
        { name: '绛', pos: [35.70, 111.50] },
        { name: '河北', pos: [34.85, 110.60] },
        { name: '皮氏' }, { name: '襄陵' }, { name: '永安' }, { name: '东垣' }, { name: '北屈' }
      ]
    },
    Wei: {
      label: '魏郡', url: 'https://zh.wikipedia.org/wiki/魏郡', seat: '邺',
      counties: [
        { name: '邺', pos: [36.07, 114.62], seat: true },
        { name: '安阳', pos: [36.10, 114.35] },
        { name: '荡阴', pos: [35.92, 114.33] },
        { name: '内黄', pos: [35.97, 114.90] },
        { name: '黎阳', pos: [35.67, 114.55] },
        { name: '馆陶', pos: [36.55, 115.25] },
        { name: '武安', pos: [36.70, 114.20] },
        { name: '繁阳' }, { name: '阴安' }, { name: '魏' }, { name: '元城' },
        { name: '清渊' }, { name: '平恩' }, { name: '斥丘' }, { name: '曲梁' },
        { name: '梁期' }, { name: '涉' }, { name: '邯会' }, { name: '即裴' }
      ]
    },
    Yingchuan: {
      label: '颍川郡', url: 'https://zh.wikipedia.org/wiki/潁川郡', seat: '阳翟',
      counties: [
        { name: '阳翟', pos: [34.15, 113.45], seat: true },
        { name: '襄城', pos: [33.85, 113.40] },
        { name: '昆阳', pos: [33.65, 113.55] },
        { name: '舞阳', pos: [33.50, 113.60] },
        { name: '临颍', pos: [33.90, 113.95] },
        { name: '许', pos: [34.04, 113.85] },
        { name: '鄢陵', pos: [34.10, 114.20] },
        { name: '长社', pos: [34.20, 113.80] },
        { name: '阳城', pos: [34.45, 112.80] },
        { name: '定陵' }, { name: '郾' }, { name: '颍阳' }, { name: '颍阴' },
        { name: '父城' }, { name: '郏' }, { name: '密' }, { name: '新汲' }
      ]
    },
    Nanyang: {
      label: '南阳郡', url: 'https://zh.wikipedia.org/wiki/南陽郡', seat: '宛',
      counties: [
        { name: '宛', pos: [32.99, 112.53], seat: true },
        { name: '冠军', pos: [32.75, 112.20] },
        { name: '叶', pos: [33.60, 113.30] },
        { name: '新野', pos: [32.52, 112.36] },
        { name: '鲁阳', pos: [33.72, 112.90] },
        { name: '博望', pos: [33.20, 112.60] },
        { name: '舞阴', pos: [33.00, 113.20] },
        { name: '湖阳', pos: [32.50, 112.60] },
        { name: '穰', pos: [32.70, 112.10] },
        { name: '邓', pos: [32.65, 112.05] },
        { name: '章陵' }, { name: '西鄂' }, { name: '雉' }, { name: '犨' },
        { name: '堵阳' }, { name: '比阳' }, { name: '育阳' }, { name: '平氏' },
        { name: '棘阳' }, { name: '山都' }, { name: '南乡' }, { name: '顺阳' },
        { name: '涅阳' }, { name: '阴' }, { name: '酂' }, { name: '蔡阳' }, { name: '安众' }
      ]
    },
    Nan: {
      label: '南郡', url: 'https://zh.wikipedia.org/wiki/南郡', seat: '江陵',
      counties: [
        { name: '江陵', pos: [30.35, 112.24], seat: true },
        { name: '秭归', pos: [30.82, 110.98] },
        { name: '宜城', pos: [31.72, 112.26] },
        { name: '当阳', pos: [30.82, 111.79] },
        { name: '襄阳', pos: [32.01, 112.13] },
        { name: '枝江', pos: [30.40, 111.80] },
        { name: '夷道', pos: [30.40, 111.50] },
        { name: '华容', pos: [29.90, 112.50] },
        { name: '中卢' }, { name: '编' }, { name: '邔' }, { name: '临沮' },
        { name: '州陵' }, { name: '假山' }, { name: '佷山' }
      ]
    },
    Changsha: {
      label: '长沙郡', url: 'https://zh.wikipedia.org/wiki/長沙郡', seat: '临湘',
      counties: [
        { name: '临湘', pos: [28.20, 112.95], seat: true },
        { name: '攸', pos: [27.40, 113.30] },
        { name: '茶陵', pos: [26.80, 113.50] },
        { name: '益阳', pos: [28.55, 112.35] },
        { name: '罗', pos: [28.70, 112.90] },
        { name: '醴陵', pos: [27.65, 113.50] },
        { name: '安城' }, { name: '酃' }, { name: '湘南' }, { name: '连道' },
        { name: '昭陵' }, { name: '容陵' }, { name: '下隽' }
      ]
    },
    'Guiji / Kuaiji': {
      label: '会稽郡', url: 'https://zh.wikipedia.org/wiki/會稽郡', seat: '山阴',
      counties: [
        { name: '山阴', pos: [30.00, 120.60], seat: true },
        { name: '余姚', pos: [30.05, 121.15] },
        { name: '上虞', pos: [30.00, 120.85] },
        { name: '句章', pos: [29.90, 121.50] },
        { name: '乌伤', pos: [29.30, 120.00] },
        { name: '太末', pos: [29.00, 119.20] },
        { name: '章安', pos: [28.80, 121.40] },
        { name: '东冶', pos: [26.10, 119.30] },
        { name: '剡', pos: [29.60, 120.80] },
        { name: '诸暨', pos: [29.70, 120.20] },
        { name: '鄞' }, { name: '鄮' }, { name: '永宁' }
      ]
    },
    Wu: {
      label: '吴郡', url: 'https://zh.wikipedia.org/wiki/吳郡', seat: '吴',
      counties: [
        { name: '吴', pos: [31.30, 120.60], seat: true },
        { name: '海盐', pos: [30.50, 120.90] },
        { name: '乌程', pos: [30.87, 120.10] },
        { name: '余杭', pos: [30.40, 119.95] },
        { name: '毗陵', pos: [31.78, 119.97] },
        { name: '阳羡', pos: [31.30, 119.70] },
        { name: '由拳', pos: [30.60, 120.70] },
        { name: '富春', pos: [30.05, 119.95] },
        { name: '无锡', pos: [31.60, 120.30] },
        { name: '曲阿', pos: [32.00, 119.50] },
        { name: '丹徒', pos: [32.20, 119.40] },
        { name: '娄' }
      ]
    },
    Shu: {
      label: '蜀郡', url: 'https://zh.wikipedia.org/wiki/蜀郡', seat: '成都',
      counties: [
        { name: '成都', pos: [30.66, 104.07], seat: true },
        { name: '广都', pos: [30.40, 103.90] },
        { name: '江原', pos: [30.60, 103.60] },
        { name: '郫', pos: [30.85, 103.90] },
        { name: '临邛', pos: [30.40, 103.40] },
        { name: '汶江', pos: [31.50, 103.60] },
        { name: '绵虒', pos: [31.40, 103.50] },
        { name: '繁' }, { name: '广柔' }, { name: '蚕陵' }, { name: '湔氐道' }, { name: '严道' }
      ]
    },
    Hanzhong: {
      label: '汉中郡', url: 'https://zh.wikipedia.org/wiki/漢中郡', seat: '南郑',
      counties: [
        { name: '南郑', pos: [33.07, 107.02], seat: true },
        { name: '成固', pos: [33.16, 107.33] },
        { name: '褒中', pos: [33.25, 106.90] },
        { name: '沔阳', pos: [33.23, 106.75] },
        { name: '西城', pos: [32.78, 109.02] },
        { name: '上庸', pos: [32.40, 110.10] },
        { name: '房陵', pos: [32.00, 110.70] },
        { name: '安阳' }, { name: '锡' }
      ]
    },
    Liaodong: {
      label: '辽东郡', url: 'https://zh.wikipedia.org/wiki/遼東郡', seat: '襄平',
      counties: [
        { name: '襄平', pos: [41.80, 123.30], seat: true },
        { name: '平郭', pos: [40.20, 122.20] },
        { name: '安市', pos: [40.60, 122.50] },
        { name: '西安平', pos: [40.10, 124.30] },
        { name: '沓氏', pos: [39.20, 121.70] },
        { name: '候城', pos: [41.80, 123.40] },
        { name: '汶' }, { name: '文县' }, { name: '番汗' }, { name: '辽队' },
        { name: '房' }, { name: '无虑' }, { name: '望平' }, { name: '险渎' }, { name: '居就' }
      ]
    },
    Huainan: {
      label: '九江郡', url: 'https://zh.wikipedia.org/wiki/九江郡', seat: '寿春',
      counties: [
        { name: '寿春', pos: [32.56, 116.78], seat: true },
        { name: '合肥', pos: [31.82, 117.23] },
        { name: '历阳', pos: [31.72, 118.36] },
        { name: '当涂', pos: [31.60, 118.50] },
        { name: '全椒', pos: [32.10, 118.20] },
        { name: '钟离', pos: [32.90, 117.80] },
        { name: '下蔡', pos: [32.80, 116.70] },
        { name: '浚遒' }, { name: '成德' }, { name: '西曲阳' }, { name: '阜陵' },
        { name: '平阿' }, { name: '义成' }, { name: '阴陵' }
      ]
    },
    Lujiang: {
      label: '庐江郡', url: 'https://zh.wikipedia.org/wiki/廬江郡', seat: '舒',
      counties: [
        { name: '舒', pos: [31.30, 116.90], seat: true },
        { name: '皖', pos: [30.60, 116.80] },
        { name: '居巢', pos: [31.60, 117.70] },
        { name: '六', pos: [31.70, 116.50] },
        { name: '潜', pos: [30.60, 116.50] },
        { name: '寻阳', pos: [29.60, 116.00] },
        { name: '临湖' }, { name: '襄安' }, { name: '龙舒' }, { name: '安丰' }
      ]
    },
    Ba: {
      label: '巴郡', url: 'https://zh.wikipedia.org/wiki/巴郡', seat: '江州',
      counties: [
        { name: '江州', pos: [29.60, 106.60], seat: true },
        { name: '阆中', pos: [31.55, 105.96] },
        { name: '垫江', pos: [30.30, 107.40] },
        { name: '临江', pos: [30.40, 108.00] },
        { name: '涪陵', pos: [29.70, 107.40] },
        { name: '安汉', pos: [30.80, 106.10] },
        { name: '朐忍', pos: [30.90, 108.60] },
        { name: '鱼复', pos: [31.04, 109.46] },
        { name: '宕渠', pos: [31.00, 106.90] },
        { name: '平都' }, { name: '充国' }, { name: '宣汉' }, { name: '汉昌' }
      ]
    },
    Julu: {
      label: '巨鹿郡', url: 'https://zh.wikipedia.org/wiki/鉅鹿郡', seat: '瘿陶',
      counties: [
        { name: '瘿陶', pos: [37.60, 114.90], seat: true },
        { name: '巨鹿', pos: [37.20, 115.00] },
        { name: '广宗', pos: [37.10, 115.20] },
        { name: '曲周', pos: [36.80, 114.90] },
        { name: '列人', pos: [36.70, 114.80] },
        { name: '任', pos: [37.00, 114.70] },
        { name: '柏人' }, { name: '广平' }, { name: '斥章' }, { name: '南和' },
        { name: '平乡' }, { name: '宋子' }, { name: '杨氏' }, { name: '堂阳' }
      ]
    },
    Dong: {
      label: '东郡', url: 'https://zh.wikipedia.org/wiki/東郡', seat: '濮阳',
      counties: [
        { name: '濮阳', pos: [35.70, 115.03], seat: true },
        { name: '白马', pos: [35.55, 114.80] },
        { name: '顿丘', pos: [35.80, 115.10] },
        { name: '东阿', pos: [36.30, 116.20] },
        { name: '东武阳', pos: [36.00, 115.50] },
        { name: '范', pos: [35.90, 115.90] },
        { name: '临邑', pos: [37.20, 116.90] },
        { name: '乐平', pos: [35.60, 115.70] },
        { name: '燕' }, { name: '卫国' }
      ]
    },
    Wuling: {
      label: '武陵郡', url: 'https://zh.wikipedia.org/wiki/武陵郡', seat: '临沅',
      counties: [
        { name: '临沅', pos: [28.90, 111.70], seat: true },
        { name: '汉寿', pos: [28.90, 111.90] },
        { name: '孱陵', pos: [29.90, 111.90] },
        { name: '零阳', pos: [29.40, 111.10] },
        { name: '充', pos: [29.50, 110.50] },
        { name: '酉阳', pos: [28.80, 110.50] },
        { name: '沅陵', pos: [28.45, 110.40] },
        { name: '辰阳', pos: [28.00, 110.20] }
      ]
    },
    Yuzhang: {
      label: '豫章郡', url: 'https://zh.wikipedia.org/wiki/豫章郡', seat: '南昌',
      counties: [
        { name: '南昌', pos: [28.68, 115.85], seat: true },
        { name: '新淦', pos: [27.80, 115.40] },
        { name: '宜春', pos: [27.80, 114.40] },
        { name: '庐陵', pos: [27.10, 114.90] },
        { name: '赣', pos: [25.85, 114.90] },
        { name: '雩都', pos: [25.90, 115.40] },
        { name: '彭泽', pos: [29.90, 116.50] },
        { name: '柴桑', pos: [29.70, 115.90] },
        { name: '建城' }, { name: '艾' }, { name: '历陵' }, { name: '南野' }
      ]
    },
    Danyang: {
      label: '丹阳郡', url: 'https://zh.wikipedia.org/wiki/丹楊郡', seat: '宛陵',
      counties: [
        { name: '宛陵', pos: [30.95, 118.75], seat: true },
        { name: '芜湖', pos: [31.35, 118.38] },
        { name: '春谷', pos: [31.10, 118.40] },
        { name: '秣陵', pos: [32.05, 118.80] },
        { name: '江乘', pos: [32.20, 118.90] },
        { name: '丹阳', pos: [31.50, 118.90] },
        { name: '句容', pos: [31.95, 119.15] },
        { name: '泾', pos: [30.70, 118.40] },
        { name: '歙', pos: [29.90, 118.40] },
        { name: '黟', pos: [29.90, 117.90] },
        { name: '陵阳' }, { name: '石城' }
      ]
    },
    Tianshui: {
      label: '汉阳郡', url: 'https://zh.wikipedia.org/wiki/漢陽郡', seat: '冀',
      counties: [
        { name: '冀', pos: [34.70, 105.70], seat: true },
        { name: '上邽', pos: [34.58, 105.72] },
        { name: '西', pos: [34.40, 105.20] },
        { name: '陇', pos: [34.90, 106.20] },
        { name: '略阳', pos: [34.60, 105.70] },
        { name: '望垣', pos: [34.60, 105.50] },
        { name: '显亲', pos: [34.90, 105.80] },
        { name: '勇士' }
      ]
    },
    Jincheng: {
      label: '金城郡', url: 'https://zh.wikipedia.org/wiki/金城郡', seat: '允吾',
      counties: [
        { name: '允吾', pos: [36.20, 103.20], seat: true },
        { name: '浩亹', pos: [36.50, 103.00] },
        { name: '令居', pos: [36.40, 103.30] },
        { name: '枝阳', pos: [36.10, 103.40] },
        { name: '金城', pos: [36.10, 103.70] },
        { name: '榆中', pos: [35.80, 104.10] },
        { name: '临羌', pos: [36.40, 101.70] },
        { name: '安夷', pos: [36.50, 102.00] }
      ]
    },
    Dunhuang: {
      label: '敦煌郡', url: 'https://zh.wikipedia.org/wiki/敦煌郡', seat: '敦煌',
      counties: [
        { name: '敦煌', pos: [40.14, 94.66], seat: true },
        { name: '冥安', pos: [40.00, 95.80] },
        { name: '效谷', pos: [40.10, 94.70] },
        { name: '渊泉', pos: [40.00, 96.00] },
        { name: '广至', pos: [40.00, 95.80] },
        { name: '龙勒', pos: [40.00, 94.50] }
      ]
    }
  },
  cityFallbacks: [
    { name: '洛阳', sourceName: 'Henan', pos: [34.62, 112.45] },
    { name: '长安', sourceName: 'Jingzhao', pos: [34.27, 108.95] },
    { name: '许昌', sourceName: 'Yingchuan', pos: [34.04, 113.85] },
    { name: '邺城', sourceName: 'Wei', pos: [36.07, 114.62] },
    { name: '成都', sourceName: 'Shu', pos: [30.66, 104.07] },
    { name: '建业', sourceName: 'Danyang', pos: [32.06, 118.80] },
    { name: '襄阳', sourceName: 'Xiangyang', pos: [32.01, 112.13] },
    { name: '江陵', sourceName: 'Nan', pos: [30.35, 112.24] },
    { name: '汉中', sourceName: 'Hanzhong', pos: [33.07, 107.02] },
    { name: '合肥', sourceName: 'Huainan', pos: [31.82, 117.23] },
    { name: '下邳', sourceName: 'Xiapi', pos: [34.07, 117.94] },
    { name: '寿春', sourceName: 'Huainan', pos: [32.56, 116.78] },
    { name: '襄平', sourceName: 'Liaodong', pos: [41.80, 123.30] },
    { name: '武威', sourceName: 'Wuwei', pos: [37.93, 102.63] },
    { name: '天水', sourceName: 'Tianshui', pos: [34.58, 105.72] },
    { name: '宛城', sourceName: 'Nanyang', pos: [32.99, 112.53] },
    { name: '蓟', sourceName: 'Yan State', pos: [39.90, 116.40] },
    { name: '白帝城', sourceName: 'Badong', pos: [31.04, 109.46] },
    { name: '绵竹', sourceName: 'Guanghan', pos: [31.40, 104.90] }
  ]
};
