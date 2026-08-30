(function(global){
  'use strict';
  const records=[
  {
    "name": "卞壼",
    "zi": "望之",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋70",
    "confidence": "确定",
    "personId": "person:source:64f2e2b96361",
    "normalizationNote": ""
  },
  {
    "name": "蔡謨",
    "zi": "道明",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋77",
    "confidence": "确定",
    "personId": "person:source:ef9ef54bd399",
    "normalizationNote": ""
  },
  {
    "name": "曹仁",
    "zi": "子孝",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三9",
    "confidence": "确定",
    "personId": "person:wei:cao-ren",
    "normalizationNote": ""
  },
  {
    "name": "曹休",
    "zi": "文烈",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三9",
    "confidence": "确定",
    "personId": "person:source:2f17731f8af3",
    "normalizationNote": ""
  },
  {
    "name": "曹真",
    "zi": "子丹",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三9",
    "confidence": "确定",
    "personId": "person:wei:cao-zhen",
    "normalizationNote": ""
  },
  {
    "name": "褚裒",
    "zi": "季野",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋93",
    "confidence": "确定",
    "personId": "person:source:f9cc919688a5",
    "normalizationNote": ""
  },
  {
    "name": "崔林",
    "zi": "德儒",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三24",
    "confidence": "确定",
    "personId": "person:wei:cui-lin",
    "normalizationNote": ""
  },
  {
    "name": "董旻",
    "zi": "叔穎",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三6",
    "confidence": "确定",
    "personId": "person:han:dong-min",
    "normalizationNote": ""
  },
  {
    "name": "董允",
    "zi": "休昭",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三39",
    "confidence": "确定",
    "personId": "person:shu:dong-yun",
    "normalizationNote": ""
  },
  {
    "name": "董昭",
    "zi": "公仁",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三14",
    "confidence": "确定",
    "personId": "person:source:6d19a25fbe7e",
    "normalizationNote": ""
  },
  {
    "name": "杜預",
    "zi": "元凱",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋34",
    "confidence": "确定",
    "personId": "person:source:b948df238097",
    "normalizationNote": ""
  },
  {
    "name": "法正",
    "zi": "孝直",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三37",
    "confidence": "确定",
    "personId": "person:shu:fa-zheng",
    "normalizationNote": ""
  },
  {
    "name": "范汪",
    "zi": "玄平",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋75",
    "confidence": "确定",
    "personId": "person:source:e0405239f698",
    "normalizationNote": ""
  },
  {
    "name": "傅嘏",
    "zi": "蘭石",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三21",
    "confidence": "确定",
    "personId": "person:source:da1e6572be53",
    "normalizationNote": ""
  },
  {
    "name": "高光",
    "zi": "宣茂",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋41",
    "confidence": "确定",
    "personId": "person:source:f799c2308083",
    "normalizationNote": ""
  },
  {
    "name": "高柔",
    "zi": "文惠",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三24",
    "confidence": "确定",
    "personId": "person:source:c9646b99be7a",
    "normalizationNote": ""
  },
  {
    "name": "何曾",
    "zi": "穎考",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋33",
    "confidence": "确定",
    "personId": "person:jin:he-zeng",
    "normalizationNote": ""
  },
  {
    "name": "何充",
    "zi": "次道",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋77",
    "confidence": "确定",
    "personId": "person:source:80a7e11ec03b",
    "normalizationNote": ""
  },
  {
    "name": "何夔",
    "zi": "叔龍",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三12",
    "confidence": "确定",
    "personId": "person:source:b2dc15c2b1f2",
    "normalizationNote": ""
  },
  {
    "name": "和嶠",
    "zi": "長輿",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三23",
    "confidence": "确定",
    "personId": "person:source:3615e33dea42",
    "normalizationNote": ""
  },
  {
    "name": "和洽",
    "zi": "陽士",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三23",
    "confidence": "确定",
    "personId": "person:source:72237d3083d5",
    "normalizationNote": ""
  },
  {
    "name": "賀循",
    "zi": "彥先",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋68",
    "confidence": "确定",
    "personId": "person:source:aff8e9dbd7af",
    "normalizationNote": ""
  },
  {
    "name": "桓玄",
    "zi": "敬道",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋99",
    "confidence": "确定",
    "personId": "person:source:8d09fe027b7b",
    "normalizationNote": ""
  },
  {
    "name": "皇甫真",
    "zi": "楚季",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋111",
    "confidence": "确定",
    "personId": "person:source:8af1e59d3707",
    "normalizationNote": ""
  },
  {
    "name": "紀瞻",
    "zi": "思遠",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋68",
    "confidence": "确定",
    "personId": "person:source:15d17df7bcc9",
    "normalizationNote": ""
  },
  {
    "name": "姜維",
    "zi": "伯約",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三44",
    "confidence": "确定",
    "personId": "person:shu:jiang-wei",
    "normalizationNote": ""
  },
  {
    "name": "李矩",
    "zi": "世回",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋63",
    "confidence": "确定",
    "personId": "person:source:95e06758fcde",
    "normalizationNote": ""
  },
  {
    "name": "李憙",
    "zi": "季和",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋41",
    "confidence": "确定",
    "personId": "person:jin:li-xi",
    "normalizationNote": ""
  },
  {
    "name": "李胤",
    "zi": "宣伯",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋44",
    "confidence": "确定",
    "personId": "person:jin:li-yin",
    "normalizationNote": ""
  },
  {
    "name": "柳隐",
    "zi": "休然",
    "sourceTitle": "《华阳国志》卷十一（三国志相关传记裴注互见）",
    "sourceLocator": "柳隐字休然",
    "confidence": "确定",
    "personId": "person:shu:liu-yin",
    "normalizationNote": ""
  },
  {
    "name": "呂岱",
    "zi": "定公",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三60",
    "confidence": "确定",
    "personId": "person:source:74484c7b8050",
    "normalizationNote": ""
  },
  {
    "name": "慕容垂",
    "zi": "道明",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋123",
    "confidence": "确定",
    "personId": "person:source:539c41a163fa",
    "normalizationNote": ""
  },
  {
    "name": "慕容德",
    "zi": "玄明",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋127",
    "confidence": "确定",
    "personId": "person:source:61ee2bcedd6e",
    "normalizationNote": ""
  },
  {
    "name": "慕容皝",
    "zi": "元真",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋109",
    "confidence": "确定",
    "personId": "person:source:35e0ed3bb2e7",
    "normalizationNote": ""
  },
  {
    "name": "慕容恪",
    "zi": "玄恭",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋111",
    "confidence": "确定",
    "personId": "person:tribal:murong-ke",
    "normalizationNote": ""
  },
  {
    "name": "慕容廆",
    "zi": "弈洛瑰",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋108",
    "confidence": "确定",
    "personId": "person:source:f61973e58f4d",
    "normalizationNote": ""
  },
  {
    "name": "慕容鐘",
    "zi": "道明",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋128",
    "confidence": "确定",
    "personId": "person:source:0aaa573fc795",
    "normalizationNote": ""
  },
  {
    "name": "裴秀",
    "zi": "季彥",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋35",
    "confidence": "确定",
    "personId": "person:jin:pei-xiu",
    "normalizationNote": ""
  },
  {
    "name": "秦宓",
    "zi": "子敕",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三38",
    "confidence": "确定",
    "personId": "person:source:c2d2b4c0325c",
    "normalizationNote": ""
  },
  {
    "name": "全琮",
    "zi": "子璜",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三60",
    "confidence": "确定",
    "personId": "person:wu:quan-cong",
    "normalizationNote": ""
  },
  {
    "name": "石苞",
    "zi": "仲容",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋33",
    "confidence": "确定",
    "personId": "person:jin:shi-bao",
    "normalizationNote": ""
  },
  {
    "name": "陶侃",
    "zi": "士行",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋66",
    "confidence": "确定",
    "personId": "person:source:db4e298fa01f",
    "normalizationNote": ""
  },
  {
    "name": "滕胤",
    "zi": "承嗣",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三64",
    "confidence": "确定",
    "personId": "person:wu:teng-yin",
    "normalizationNote": ""
  },
  {
    "name": "王敦",
    "zi": "處仲",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋98",
    "confidence": "确定",
    "personId": "person:source:1cfba8ff9f76",
    "normalizationNote": ""
  },
  {
    "name": "王機",
    "zi": "令明",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋100",
    "confidence": "确定",
    "personId": "person:source:992565532be2",
    "normalizationNote": ""
  },
  {
    "name": "王亮",
    "zi": "子翼",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋59",
    "confidence": "确定",
    "personId": "person:source:5bfbaa698ea4",
    "normalizationNote": ""
  },
  {
    "name": "王猛",
    "zi": "景略",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋114",
    "confidence": "确定",
    "personId": "person:source:ac182f69e880",
    "normalizationNote": ""
  },
  {
    "name": "王戎",
    "zi": "濬沖",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋43",
    "confidence": "确定",
    "personId": "person:source:a36f88a1f10c",
    "normalizationNote": ""
  },
  {
    "name": "王舒",
    "zi": "處明",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋76",
    "confidence": "确定",
    "personId": "person:source:4f59556f3359",
    "normalizationNote": ""
  },
  {
    "name": "王騰",
    "zi": "元邁",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋37",
    "confidence": "确定",
    "personId": "person:source:8e8af96dd199",
    "normalizationNote": ""
  },
  {
    "name": "王育",
    "zi": "伯春",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋89",
    "confidence": "确定",
    "personId": "person:source:9ad348dcf597",
    "normalizationNote": ""
  },
  {
    "name": "卫臻",
    "zi": "公振",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三22",
    "confidence": "确定",
    "personId": "person:wei:wei-zhen",
    "normalizationNote": ""
  },
  {
    "name": "魏舒",
    "zi": "陽元",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋41",
    "confidence": "确定",
    "personId": "person:source:07cd999ab056",
    "normalizationNote": ""
  },
  {
    "name": "夏侯惇",
    "zi": "元讓",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三9",
    "confidence": "确定",
    "personId": "person:source:2a7e68aa7262",
    "normalizationNote": ""
  },
  {
    "name": "徐邈",
    "zi": "景山",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三27",
    "confidence": "确定",
    "personId": "person:wei:xu-miao",
    "normalizationNote": ""
  },
  {
    "name": "荀崧",
    "zi": "景猷",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋75",
    "confidence": "确定",
    "personId": "person:source:1e1314b23ae6",
    "normalizationNote": ""
  },
  {
    "name": "荀顗",
    "zi": "景倩",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋39",
    "confidence": "确定",
    "personId": "person:jin:xun-yi",
    "normalizationNote": ""
  },
  {
    "name": "荀攸",
    "zi": "公達",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三10",
    "confidence": "确定",
    "personId": "person:source:9f7272bc767c",
    "normalizationNote": ""
  },
  {
    "name": "荀彧",
    "zi": "文若",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷三10",
    "confidence": "确定",
    "personId": "person:source:035be51454ba",
    "normalizationNote": ""
  },
  {
    "name": "羊祜",
    "zi": "叔子",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋34",
    "confidence": "确定",
    "personId": "person:jin:yang-hu",
    "normalizationNote": ""
  },
  {
    "name": "尹緯",
    "zi": "景亮",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋118",
    "confidence": "确定",
    "personId": "person:source:8a9dec96321d",
    "normalizationNote": ""
  },
  {
    "name": "虞潭",
    "zi": "思奧",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋76",
    "confidence": "确定",
    "personId": "person:source:2bf24c482249",
    "normalizationNote": ""
  },
  {
    "name": "庾亮",
    "zi": "元規",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋73",
    "confidence": "确定",
    "personId": "person:source:10037d08b004",
    "normalizationNote": ""
  },
  {
    "name": "周浚",
    "zi": "開林",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋61",
    "confidence": "确定",
    "personId": "person:source:606af2600791",
    "normalizationNote": ""
  },
  {
    "name": "周顗",
    "zi": "伯仁",
    "sourceTitle": "《三国志》《晋书》语料扫描",
    "sourceLocator": "卷晋69",
    "confidence": "确定",
    "personId": "person:source:678ebb47b0fb",
    "normalizationNote": ""
  }
];
  const byPersonId=Object.fromEntries(records.filter(item=>item.personId).map(item=>[item.personId,item]));
  global.SGZ_PERSON_ZI_SUPPLEMENT=Object.freeze(records.map(Object.freeze));
  global.SGZ_PERSON_ZI_BY_ID=Object.freeze(byPersonId);
  global.SGZ_PERSON_ZI_AUDIT=Object.freeze({
  "schemaVersion": "V55",
  "total": 65,
  "resolvedByPersonId": 65,
  "unresolved": [],
  "stalePublicNamesRemoved": [
    "卓弟旻"
  ],
  "policy": "表字优先按 personId 关联；姓名只用于构建期唯一匹配，误读名称不进入公开别名。"
});
})(window);
