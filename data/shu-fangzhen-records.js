/*
 * 用户提供的《蜀汉郡守考》截图整理稿。
 *
 * 这是州镇录的“文档考据”批次：年份和疑问号按截图原样保留，
 * 不把表中“？”、“未知”解释成确定任期。武都、兴古等截图中没有
 * 明确列出任职人物的辖区不擅自补录，留待后续以一手史料核对。
 */
(function (global) {
  'use strict';

  const sourceTitle = '用户提供：蜀汉郡守考（截图表）';
  const sourceLocator = '图2·蜀汉郡守考';

  function yearRange(tenure) {
    const years = String(tenure || '').match(/(?:1[89]\d{2}|[2-4]\d{2})/g) || [];
    return {
      startYear: years.length ? Number(years[0]) : null,
      endYear: years.length ? Number(years[years.length - 1]) : null,
    };
  }

  function isUncertain(tenure) {
    return /[?？]|未知|不详|待考/.test(String(tenure || ''));
  }

  function makeRecord(row, index) {
    const tenure = row.tenure;
    const years = yearRange(tenure);
    const uncertain = isUncertain(tenure);
    return {
      id: `fz_shu_shou_${String(index + 1).padStart(3, '0')}`,
      eraGroup: 'three',
      archiveScope: '核心：汉末—西晋',
      polity: '汉',
      recordType: 'taishou',
      commander: row.commander,
      title: '郡太守',
      commission: '郡守职任',
      relation: '郡守职任',
      appointmentStatus: uncertain ? '存疑' : '实授',
      jurisdiction: row.jurisdiction,
      seat: '',
      birthplace: row.birthplace || '',
      startYear: years.startYear,
      endYear: years.endYear,
      tenureText: tenure,
      sourceTenureText: tenure,
      note: [
        '按用户提供“蜀汉郡守考”表录入。',
        uncertain ? '原表含疑问或未知标记，任期待考。' : '',
      ].filter(Boolean).join(''),
      sourceLevel: '文档考据',
      confidence: uncertain ? '待考' : '中',
      sourceTitle,
      sourceUrl: '',
      sourceLocator,
      sourceExcerpt: `截图表条目：${row.jurisdiction} · ${row.commander} · ${tenure}`,
      importBatch: 'shu-commandery-prefects-screenshot-20260802',
    };
  }

  const rows = [
    // 巴郡
    {jurisdiction:'巴郡', commander:'张裔', tenure:'建安十九年（214年）—建安二十年（215年）间', birthplace:'蜀郡'},
    {jurisdiction:'巴郡', commander:'辅匡', tenure:'建安十九年（214年）—建安二十年（215年）间', birthplace:'襄阳'},
    {jurisdiction:'巴郡', commander:'廖立', tenure:'建安二十年（215年）由长沙太守转—建安二十四年（219年）迁侍中', birthplace:'武陵'},
    {jurisdiction:'巴郡', commander:'费观', tenure:'章武三年（223年）先主薨前—建兴初', birthplace:'江夏'},
    {jurisdiction:'巴郡', commander:'杨颙', tenure:'建兴初—？', birthplace:'襄阳'},
    {jurisdiction:'巴郡', commander:'董恢', tenure:'建兴十二年（234年）前—？', birthplace:'襄阳'},
    {jurisdiction:'巴郡', commander:'柳隐', tenure:'？—？'},
    {jurisdiction:'巴郡', commander:'薛齐', tenure:'延熙末？—景耀年间？', birthplace:'淮阳'},
    {jurisdiction:'巴郡', commander:'王彭', tenure:'未知', birthplace:'广汉'},

    // 巴东郡（含固陵郡）
    {jurisdiction:'巴东郡（含固陵郡）', commander:'康立', tenure:'建安二十一年（216年）—？'},
    {jurisdiction:'巴东郡（含固陵郡）', commander:'刘琰', tenure:'建安二十一年（216年）后—章武元年（221年）前'},
    {jurisdiction:'巴东郡（含固陵郡）', commander:'辅匡', tenure:'章武元年（221年）—？'},
    {jurisdiction:'巴东郡（含固陵郡）', commander:'罗宪', tenure:'景耀初年—景耀六年（263年）', birthplace:'襄阳'},

    // 巴西郡
    {jurisdiction:'巴西郡', commander:'张飞', tenure:'建安十九年（214年）—建安二十二年（217年）前', birthplace:'涿郡'},
    {jurisdiction:'巴西郡', commander:'向朗', tenure:'建安二十二年（217年）？—章武二年（222年）前', birthplace:'襄阳'},
    {jurisdiction:'巴西郡', commander:'阎芝', tenure:'章武二年（222年）？—？'},
    {jurisdiction:'巴西郡', commander:'李福', tenure:'建兴元年（223年）—建兴九年（231年）', birthplace:'梓潼'},
    {jurisdiction:'巴西郡', commander:'吕义', tenure:'建兴九年（231年）—建兴十二年（234年）前', birthplace:'广汉'},
    {jurisdiction:'巴西郡', commander:'刘干', tenure:'建兴末、延熙初—？'},
    {jurisdiction:'巴西郡', commander:'费揖', tenure:'蜀汉末？—晋初？'},

    {jurisdiction:'涪陵郡', commander:'庞宏', tenure:'延熙十四年（251年）—景耀元年（258年）之间'},
    {jurisdiction:'宕渠郡', commander:'王士', tenure:'建安末、章武初—章武三年（223年）前'},

    // 汉中郡
    {jurisdiction:'汉中郡', commander:'魏延', tenure:'建安二十四年（219年）—建兴五年（227年）', birthplace:'义阳'},
    {jurisdiction:'汉中郡', commander:'吕义', tenure:'建兴九年（231年）—建兴十二年（234年）', birthplace:'广汉'},
    {jurisdiction:'汉中郡', commander:'王平', tenure:'建兴十二年（234年）—建兴十五年（237年）？', birthplace:'巴西'},
    {jurisdiction:'汉中郡', commander:'常闳', tenure:'延熙末？—景耀年间？'},

    // 梓潼郡、阴平郡
    {jurisdiction:'梓潼郡', commander:'霍峻', tenure:'建安二十二年（217年）—建安二十五年（220年）', birthplace:'南郡'},
    {jurisdiction:'梓潼郡', commander:'张翼', tenure:'建兴七年（229年）—建兴八年（230年）之间', birthplace:'犍为'},
    {jurisdiction:'梓潼郡', commander:'杨戏', tenure:'延熙末？—景耀年间？', birthplace:'犍为'},
    {jurisdiction:'阴平郡', commander:'廖化', tenure:'延熙元年（238年）—延熙十一年（248年）', birthplace:'襄阳'},

    // 蜀郡
    {jurisdiction:'蜀郡', commander:'法正', tenure:'建安二十五年（220年）—章武初？', birthplace:'扶风'},
    {jurisdiction:'蜀郡', commander:'杨洪', tenure:'建安末、章武初—建兴元年（223年）', birthplace:'犍为'},
    {jurisdiction:'蜀郡', commander:'射坚', tenure:'建安二十五年（220年）—章武初？'},
    {jurisdiction:'蜀郡', commander:'王连', tenure:'建安末、章武初—建兴元年（223年）', birthplace:'南阳'},
    {jurisdiction:'蜀郡', commander:'杨洪', tenure:'建兴元年（223年）—建兴六年（228年）', birthplace:'犍为'},
    {jurisdiction:'蜀郡', commander:'张翼', tenure:'建兴六年（228年）—建兴九年（231年）前', birthplace:'犍为'},
    {jurisdiction:'蜀郡', commander:'薛齐', tenure:'建兴末、延熙初—延熙九年（246年）'},
    {jurisdiction:'蜀郡', commander:'张？', tenure:'延熙末、景耀初？—景耀？年'},

    // 广汉郡
    {jurisdiction:'广汉郡', commander:'薛永', tenure:'景耀？年—景耀末'},
    {jurisdiction:'广汉郡', commander:'张存', tenure:'建安十八年（213年）', birthplace:'南阳'},
    {jurisdiction:'广汉郡', commander:'夏侯纂', tenure:'建安末'},
    {jurisdiction:'广汉郡', commander:'射坚', tenure:'建安？年—建安二十五年（220年）'},
    {jurisdiction:'广汉郡', commander:'邓芝', tenure:'建安末—章武元年（221年）？', birthplace:'义阳'},
    {jurisdiction:'广汉郡', commander:'习祯', tenure:'建安末？—？', birthplace:'襄阳'},
    {jurisdiction:'广汉郡', commander:'姚伷', tenure:'建兴元年（223年）—建兴五年（227年）'},
    {jurisdiction:'广汉郡', commander:'何祇', tenure:'建兴五年（227年）—？', birthplace:'蜀郡'},
    {jurisdiction:'广汉郡', commander:'张翼', tenure:'建兴中—建兴九年（231年）前', birthplace:'犍为'},
    {jurisdiction:'广汉郡', commander:'马齐', tenure:'建兴中'},
    {jurisdiction:'广汉郡', commander:'吕乂', tenure:'建兴十二年（234年）—建兴末、延熙初', birthplace:'广汉'},
    {jurisdiction:'广汉郡', commander:'常闳', tenure:'延熙以后'},
    {jurisdiction:'广汉郡', commander:'罗蒙', tenure:'未知'},

    // 犍为郡
    {jurisdiction:'犍为郡', commander:'李严', tenure:'建安十九年（214年）—章武二年（222年）', birthplace:'南阳'},
    {jurisdiction:'犍为郡', commander:'龚谌', tenure:'章武二年（222年）'},
    {jurisdiction:'犍为郡', commander:'王士', tenure:'章武二年（222年）—建兴三年（225年）'},
    {jurisdiction:'犍为郡', commander:'李邈', tenure:'建兴初—建兴五年（227年）', birthplace:'巴西'},
    {jurisdiction:'犍为郡', commander:'何祇', tenure:'建兴五年（227年）后—建兴？年', birthplace:'蜀郡'},
    {jurisdiction:'犍为郡', commander:'王离', tenure:'建兴中'},
    {jurisdiction:'犍为郡', commander:'寿良父亲', tenure:'建兴末、延熙初—？'},

    // 江阳郡、汶山郡、汉嘉郡
    {jurisdiction:'江阳郡', commander:'刘邕', tenure:'建安十九年（214年）—建安末', birthplace:'南阳'},
    {jurisdiction:'江阳郡', commander:'彭羕', tenure:'建安末—？', birthplace:'广汉'},
    {jurisdiction:'江阳郡', commander:'王山', tenure:'后主时期，未知在建兴、延熙？年间'},
    {jurisdiction:'汶山郡（含蜀郡北部都尉）', commander:'陈震', tenure:'建安末—建兴三年（225年）', birthplace:'南阳'},
    {jurisdiction:'汶山郡（含蜀郡北部都尉）', commander:'何祇', tenure:'建兴初—建兴五年（227年）', birthplace:'蜀郡'},
    {jurisdiction:'汶山郡（含蜀郡北部都尉）', commander:'何祇族人', tenure:'建兴五年（227年）—建兴六年（228年）之间'},
    {jurisdiction:'汶山郡（含蜀郡北部都尉）', commander:'王闳', tenure:'延熙末？—景耀年间？'},
    {jurisdiction:'汉嘉郡', commander:'黄元', tenure:'章武年间'},

    // 越巂郡
    {jurisdiction:'越巂郡', commander:'马谡', tenure:'建安末—建兴初', birthplace:'襄阳'},
    {jurisdiction:'越巂郡', commander:'焦璜', tenure:'建安末、章武年间—章武三年（223年）'},
    {jurisdiction:'越巂郡', commander:'龚禄', tenure:'建兴元年（223年）—建兴三年（225年）'},
    {jurisdiction:'越巂郡', commander:'张嶷', tenure:'延熙三年（240年）—延熙十七年（254年）', birthplace:'巴郡'},
    {jurisdiction:'越巂郡', commander:'费诗', tenure:'建安末—建安二十四年（219年）前', birthplace:'犍为'},
    {jurisdiction:'越巂郡', commander:'向朗', tenure:'建安二十四年（219年）后—章武元年（221年）', birthplace:'襄阳'},

    // 牂牁郡
    {jurisdiction:'牂牁郡', commander:'朱褒', tenure:'章武三年（223年）—建兴元年（223年）'},
    {jurisdiction:'牂牁郡', commander:'马忠', tenure:'建兴三年（225年）—建兴八年（230年）', birthplace:'巴西'},
    {jurisdiction:'牂牁郡', commander:'罗式', tenure:'延熙末、景耀年间'},

    // 益州郡（含建宁郡）
    {jurisdiction:'益州郡（含建宁郡）', commander:'正昂', tenure:'章武初'},
    {jurisdiction:'益州郡（含建宁郡）', commander:'张裔', tenure:'建兴三年（225年）', birthplace:'蜀郡'},
    {jurisdiction:'益州郡（含建宁郡）', commander:'王士', tenure:'建兴三年（225年）'},
    {jurisdiction:'益州郡（含建宁郡）', commander:'李恢', tenure:'建兴七年（229年）—建兴九年（231年）', birthplace:'建宁'},
    {jurisdiction:'益州郡（含建宁郡）', commander:'杨戏', tenure:'延熙十二年（249年）', birthplace:'犍为'},
    {jurisdiction:'益州郡（含建宁郡）', commander:'霍弋', tenure:'延熙二十年（257年）—景耀六年（263年）', birthplace:'南郡'},

    // 朱提、云南、永昌、南广
    {jurisdiction:'朱提郡', commander:'邓方', tenure:'建安十九年（214年）、建安二十年（215年）—章武元年（221年）或二年（222年）', birthplace:'南郡'},
    {jurisdiction:'朱提郡', commander:'李丰', tenure:'建兴十二年（234年）后'},
    {jurisdiction:'朱提郡', commander:'李光', tenure:'章武年间、建兴初年'},
    {jurisdiction:'云南郡', commander:'吕凯', tenure:'建兴三年（225年）—建兴四年（226年）之间', birthplace:'永昌'},
    {jurisdiction:'云南郡', commander:'张休', tenure:'建兴末、延熙年间'},
    {jurisdiction:'永昌郡', commander:'王伉', tenure:'建兴三年（225年）—？'},
    {jurisdiction:'永昌郡', commander:'霍弋', tenure:'延熙末—延熙二十年（257年）', birthplace:'南郡'},
    {jurisdiction:'南广郡', commander:'常竺', tenure:'延熙中'},
    {jurisdiction:'南广郡', commander:'令狐衷', tenure:'延熙中、晚期'},

    // 截图中未能确定郡名的条目
    {jurisdiction:'不详', commander:'杜祺', tenure:'建兴末、延熙年间'},
    {jurisdiction:'不详', commander:'谯承', tenure:'建兴末、延熙初', birthplace:'巴西'},
    {jurisdiction:'不详', commander:'张髦', tenure:'后主后期'},
  ];

  global.SHU_COMMANDERY_FANGZHEN_PRESETS = Object.freeze(rows.map(makeRecord));
})(window);
