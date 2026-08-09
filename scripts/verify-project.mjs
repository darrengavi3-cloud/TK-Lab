import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const registry = JSON.parse(read('data/map-period-registry.json'));
const audit = JSON.parse(read('data/historical-audit.json'));
const html = read('index.html');
const portable = read('exports/三国职官谱-单文件版.html');
const expectedIds = [
  'huangjin', 'shaodi', 'dongzhuo', 'xingping', 'jianbing', 'guandu', 'chibi', 'xiangfan', 'sanguo',
  'beifa', 'guijin', 'hanwang', 'jinchu', 'taikang', 'hui_di', 'yongjia'
];

assert(
  registry.periods.map(period => period.id).join('|') === expectedIds.join('|'),
  '十六期地图缺失、重复或顺序错误'
);
assert(new Set(registry.periods.map(period => period.year)).size === expectedIds.length, '十六期年份必须互不重复');
assert(registry.periods.find(period => period.year === 184)?.expectedProvinceCount === 13, '184 年必须锁定十三州部');
assert(registry.periods.find(period => period.year === 189)?.name === '少帝即位', '189 年少帝即位节点未接入');
assert(registry.periods.find(period => period.year === 190)?.expectedProvinceCount === 13, '190 年必须锁定十三州部');
assert(registry.periods.find(period => period.year === 194)?.name === '兴平割据' && registry.periods.find(period => period.year === 194)?.expectedProvinceCount === 14, '194 年兴平节点或河西雍州未接入');
assert(registry.periods.find(period => period.year === 199)?.name === '群雄兼并', '199 年群雄兼并节点未接入');
assert(registry.periods.find(period => period.year === 219)?.name === '襄樊之战', '219 年襄樊之战节点未接入');
assert(registry.periods.find(period => period.year === 263)?.polities.join('、') === '魏、汉、吴', '263 年投降前必须保留魏、汉、吴');
assert(registry.periods.find(period => period.year === 264)?.polities.join('、') === '魏、吴', '264 年必须是魏、吴');
assert(registry.periods.find(period => period.year === 266)?.polities.join('、') === '晋、吴', '266 年必须是晋、吴');
assert(registry.periods.find(period => period.year === 280)?.expectedProvinceCount === 19, '280 年必须锁定十九州');
assert(registry.periods.find(period => period.year === 290)?.name === '惠帝嗣位', '290 年惠帝节点未接入');
assert(registry.periods.find(period => period.year === 311)?.name === '永嘉之乱', '311 年永嘉节点未接入');
assert(registry.periods.find(period => period.year === 220)?.name === '曹魏代汉', '220 年节点名称未完成史实修订');
assert(registry.periods.find(period => period.year === 220)?.polities.join('、') === '魏、刘备、孙权', '220 年不得把刘备、孙权提前标作已建国的汉、吴');
assert(audit.periodReview.length === expectedIds.length, '逐期史实审校必须覆盖十六期');
assert(html.includes('>职官谱</strong>') && html.includes('>州镇录</strong>') && html.includes('>形势图</strong>'), '三模块“谱、录、图”命名缺失');
assert(html.includes('>食货志</strong>') && html.includes('SHIHUO_RECORDS') && html.includes('shihuo-workbench'), '食货志模块未接入');
assert(html.includes('>人物记</strong>') && html.includes('>战事纪</strong>'), '人物记或战事纪模块命名缺失');
assert(html.includes("sub:['诸公','列卿','大夫','尚书台','中书台','御史台','常伯','将军','太子官属','诸王官属']"), '职官谱中央细分类未接入');
assert(html.includes('data/battle-records.js') && html.includes('SGZ_BATTLE_RECORDS'), '战事纪统一档案未接入');
assert(html.includes('battle-workbench') && html.includes('battle-card-grid'), '战事纪页面结构未接入');
assert(read('data/battle-records.js').includes('title:titles[ev.id]') && read('data/battle-records.js').includes('ev_dongxing_252') && read('data/battle-records.js').includes('ev_jieqiao_191'), '战事纪编年标题或补充条目未接入');
assert(html.includes('官制对照') && html.includes('office-compare-card'), '跨势力官制对照未接入');
assert(html.includes('沿革事件（结构化）') && html.includes('EVOLUTION_TYPES'), '结构化沿革事件未接入');
assert(html.includes('draft-banner') && html.includes('restoreCurrentDraft'), '编辑草稿暂存未接入');
assert(html.includes('bulk-edit-grid') && html.includes('applyBulkEdit'), '批量字段编辑未接入');
assert(html.includes('searchGroupedResults') && html.includes('searchFilters.year'), '检索升级未接入');
assert(html.includes('tableColumns') && html.includes('officeGroupColor(scope.row)'), '表格列显隐或内联编辑未接入');
assert(html.includes('office-group-nav') && html.includes('OFFICE_GROUP_DEFS') && html.includes('诸公') && html.includes('常伯'), '职官谱中央细分类导航未接入');
assert(html.includes('officeSubOptions') && html.includes('setOfficeSub'), '归类子分类筛选未接入');
assert(html.includes("key:'central'") && html.includes("label:'中央'") && html.includes('officeSub2'), '中央/地方两级归类未接入');
assert(html.includes("name:'季汉官制'"), '季汉官制更名未接入');
assert(html.includes('地方政区总览（州—郡国—县邑）') && html.includes('BAIGUANZHI_STAFF') && html.includes("'州郡属官'"), '职官谱地方政区树或百官志属官未接入');
assert(html.includes('WIKI_OFFICE_SUPPLEMENTS') && html.includes('mergePresetSupplement'), '维基百科官制补充数据未接入');
assert(html.includes("name:'安汉将军'") && html.includes("name:'中书侍郎'") && html.includes("name:'左丞相'"), '维基补充关键官职缺失');
assert(html.includes('官品秩俸三轨对照') && html.includes('HAN_RANK_FAMILIES'), '官品秩俸三轨对照未接入');
assert(html.includes('官署模板库') && html.includes('OFFICE_TEMPLATE_LIBRARY'), '官署模板库未接入');
assert(html.includes('子节点晚于父节点存续') && html.includes('设立年早于势力存续'), '审计中心扩展未接入');
assert(html.includes("name:'西晋官制'"), '晋模块必须明确为西晋核心范围');
assert(html.includes('东晋扩展档案'), '317 年后资料必须保留在东晋扩展档案');
assert(html.includes('const CATEGORY_RANK9_MAP = {};'), '官品按类别自动推定功能仍未停用');
assert(!html.includes("names:['吏部尚书','度支尚书','左民尚书','客曹尚书','五兵尚书','刑部尚书']"), '批量模板仍含时代错置的刑部尚书');
assert(
  html.includes("typeof window.HISTORY_MAP_REGISTRY === 'undefined'"),
  '启动检查必须通过 window 读取注册表，避免与后置 const 声明形成暂时性死区'
);
assert(
  !html.includes("typeof HISTORY_MAP_REGISTRY === 'undefined'"),
  '检测到会导致页面空白的注册表暂时性死区写法'
);
assert(html.includes("const HISTORY_MAP_BASE = './assets/map/';"), '地图资源尚未切换为本地路径');
assert(html.includes('data/all-provinces-local.js'), '本地州郡几何脚本未接入');
assert(html.includes('层级谱牒') && html.includes('catalog-workbench'), '职官谱左层级、右官爵人物的谱牒视图未接入');
assert(html.includes('data/wu-fangzhen-records.js'), '孙吴州郡长官文档数据未接入');
assert(html.includes('fangzhenStateOptions') && html.includes('fangzhenState') && html.includes('吴州镇档案按规范只填写时间年份'), '州镇录州筛选或吴档案任期规范未接入');
assert(html.includes('data/shu-fangzhen-records.js') && html.includes('SHU_COMMANDERY_FANGZHEN_PRESETS'), '蜀汉郡守考据档案未接入');
assert(html.includes('data/fangzhen-term-supplement.js') && html.includes('FANGZHEN_TERM_SUPPLEMENTS'), 'V28 州镇录任期待补数据未接入');
assert(html.includes('沿革年代已标注待考') && html.includes('任期待考'), 'V28 审计待补清单未接入');
assert(html.includes("root.key, '太宰'") && html.includes('《晋书》卷二十四·职官志'), 'V29 西晋官制树未按《晋书·职官志》展开');
assert(html.includes('泰始六曹／太康六曹') && html.includes('中书侍郎（员四人）') && html.includes('太子太傅·少傅'), 'V29 晋官制中央分类未补齐');
assert(html.includes("['wei','shu','wu','jin']") && html.includes('魏 · 汉 · 吴 · 晋官制对比'), 'V29 官制对比未纳入西晋');
assert(html.includes('卷三十七晋泰始官品'), 'V29 泰始官品未标注');
assert(html.includes('data/research-model.js') && html.includes('schemaVersion:7'), '统一研究数据模型或 v7 迁移层未接入');
assert(html.includes('data/history-evidence.js') && html.includes('SGZ_HISTORY_EVIDENCE'), 'V7历史证据索引或证据面板未接入');
assert(html.includes('showHistoryAudit') && html.includes('openMapSelectionAudit'), 'V7时期审计面板或地图辖区证据联动未接入');
assert(html.includes('mapLinkSelection') && html.includes('jumpFangzhenToMap'), '地图、州镇与人物核心联动未接入');
assert(html.includes('data/political-snapshots.js') && html.includes('POLITICAL_SNAPSHOT_AUDIT'), '十六期政治势力审校未接入');
assert(html.includes(".zoom-lte-5 .faction-label,.zoom-lte-4 .faction-label,.zoom-lte-3 .faction-label{font-size:27px"), '势力标签仍会随缩放改变字号');
assert(!/FACTIONS\.(han|wei|shu|wu|jin)\.labelCenter/.test(html), '主要政权标签仍使用固定坐标，无法按版图自动居中');
assert(html.includes('lyr-province-tint') && html.includes('lyr-frontier-route') && html.includes('lyr-battlefield'), '地图分色、边界通道或重要战场开关缺失');
assert(html.includes('lyr-minorities') && html.includes('repeat(16,minmax(0,1fr))'), 'V11周边族群图层或十六期单行时间轴缺失');
assert(html.includes('map-display-mode') && html.includes('map-state-filter') && html.includes('map-clear-filter'), 'V8地图显示模式或州级聚焦控件缺失');
assert(html.includes('map-filter-status') && html.includes('国家／势力归属') && html.includes('郡级淡色层'), 'V8地图语义图例未接入');
const mapConfig = read('assets/map/js/config.js');
const mapApp = read('assets/map/js/app.js');
const mapBaseLayer = read('assets/map/js/base-layer.js');
const mapNarrative = read('assets/map/data/three-kingdoms.js');
const mapTerritories = read('assets/map/js/territories.js');
const mapStrategic = read('assets/map/data/strategic-geography.js');
const mapStrategicLayers = read('assets/map/js/strategic-layers.js');
const mapPanel = read('assets/map/js/panel.js');
const mapBridge = read('assets/map/js/bridge.js');
const mapCommanderies = read('assets/map/js/commanderies.js');
const mapWuCommanderies = read('assets/map/js/wu-commanderies.js');
const mapStyle = read('assets/map/css/style.css');
const politicalSnapshots = read('assets/map/data/political-snapshots.js');
assert(mapNarrative.includes('"id": "shaodi"') && mapNarrative.includes('"year": 189'), '189 年地图叙事节点未接入');
assert(mapNarrative.includes('"officialRoster"') && mapNarrative.includes('"name":"何进"'), '189 年官员名录未接入时期详情');
assert(mapNarrative.includes('"section":"诸公"') && mapNarrative.includes('"status":"存疑"') && mapNarrative.includes('"status":"待考"'), '189 年官员名录状态与细分类未接入');
assert(mapNarrative.includes('"name":"司马防"') && mapNarrative.includes('"name":"第五儁"') && mapNarrative.includes('"name":"樊敏"'), '189 年官员名录未按知乎文章补全');
const rosterStart = mapNarrative.indexOf('"officialRoster"');
const rosterEnd = mapNarrative.indexOf('"routes"', rosterStart);
const rosterItems = (mapNarrative.slice(rosterStart, rosterEnd).match(/\{"group"/g) || []).length;
assert(rosterItems > 180, '189 年官员名录条目数不足，未完成少帝、献帝之际补录');
assert(politicalSnapshots.includes('shaodi:{year:189') && politicalSnapshots.includes("name:'何进'") && politicalSnapshots.includes("name:'董卓军'"), '189 年中央百官与董卓入京注记未接入');
assert(mapTerritories.includes('ringAreaCentroid') && mapTerritories.includes('faction-annotation') && politicalSnapshots.includes('夏口—樊口联军'), '势力中心标签或年度军势注记未接入');
assert(mapTerritories.includes('ensureHatchPattern') && mapTerritories.includes('commanderySourceNames') && politicalSnapshots.includes('commanderySourceNames'), '黄巾郡块斜线图层未接入');
assert(politicalSnapshots.includes("Yingchuan:'kongzhou'") && politicalSnapshots.includes("Jincheng:'hansui'") && politicalSnapshots.includes("Tianshui:'mateng'"), '190 年分郡势力着色未接入');
assert(!html.includes('border:1px dashed var(--annotation-color)'), '人物势力注记仍使用遮挡地图的方框');
assert(mapApp.includes("const fullCommanderyIds = ['guijin', 'hanwang', 'jinchu', 'hui_di', 'yongjia']"), '263—311 年全境郡色层未启用');
assert(mapConfig.includes('window.YIZHOU_LABEL = YIZHOU_LABEL'), '夷洲数据未导出到地图运行时');
assert(mapConfig.includes('outline:') && mapApp.includes('__YIZHOU_PERMANENT_LAYER'), '夷洲缺少常驻岛屿轮廓');
assert(mapConfig.includes('[25.30,121.56]') && mapConfig.includes('[22.02,120.78]'), '夷洲真实海岸轮廓未更新');
assert(mapApp.includes('YizhouIsland') && mapApp.includes('sgz-map-selection'), '夷洲点击证据联动未接入');
assert(mapPanel.includes('periodView') && mapPanel.includes('faction-filter'), '地图内层详情或势力图例筛选未接入');
assert(mapApp.includes('displayMode') && mapApp.includes('mapFilters') && mapApp.includes('updateStateFilterOptions'), 'V8地图筛选与显示模式逻辑未接入');
assert(mapTerritories.includes('setFilters') && mapTerritories.includes('historical-influence'), 'V8州级图层筛选或研究示意图层未接入');
assert(mapConfig.includes('window.FACTION_LABEL_OVERRIDES') && mapConfig.includes('xiangfan: { caocao'), '219—263 年曹操／魏标签未固定到洛阳附近');
assert(html.includes('lyr-county') && html.includes('data/county-registry.js') && html.includes('county-label') && html.includes('js/counties.js'), '县政区图层或郡县索引未接入');
assert(read('assets/map/data/county-registry.js').includes('window.COUNTY_REGISTRY') && read('assets/map/js/counties.js').includes('window.Counties'), '县政区数据或图层脚本未生成');
assert(mapBridge.includes('clearSelection') && mapBridge.includes('selected'), 'V8地图选择高亮清理未接入');
assert(mapStyle.includes('faction-filter') && mapStyle.includes('map-filter-status') && mapStyle.includes('zoom-gte-7'), 'V8地图控件或标签样式未接入');
assert(html.includes('lg-group-title') && html.includes('lg-county-swatch') && html.includes('lg-hint'), '形势图图例分组或县政区图例未接入');
assert(mapStrategic.includes('MINORITY_REGIONS') && mapStrategic.includes("name:'匈奴'") && mapStrategic.includes("name:'高句丽'"), '周边少数民族政权与活动范围未接入');
assert(mapStrategic.includes("vectorKind:'activity-zone'") && mapStrategic.includes("status:'推定'"), '周边族群矢量边界缺少研究状态标记');
assert(mapStrategicLayers.includes('renderMinorities') && mapStrategicLayers.includes('setMinoritiesVisible') && mapStrategicLayers.includes('L.polygon(item.pts') && !mapStrategicLayers.includes("dashArray:'5 4'"), '周边族群矢量图层渲染或实线边界未接入');
assert(mapStrategicLayers.includes('minorityLayer.addLayer(region)') && mapStrategicLayers.includes('minorityLayer.addLayer(label)'), '周边族群矢量区域或标签未接入');
assert(mapStyle.includes('world-context-country') && mapStyle.includes('world-context-label'), '素色底图域外世界背景样式未接入');
assert(mapBaseLayer.includes('GEO_WORLD_CONTEXT') && mapBaseLayer.includes('setWorldContextVisible'), '素色底图域外世界背景图层未接入');
assert(html.includes('data/geo-world-context.js') && !html.includes('minority-region{stroke:none!important'), '单文件地图未同步域外背景或仍强制隐藏族群边界');
assert(!mapApp.includes('initPeninsulaOutlines') && !mapConfig.includes('PENINSULA_OUTLINES'), '手绘半岛轮廓未移除');
assert(mapBaseLayer.includes("let currentKey = 'terrain'") && html.includes('id="bm-terrain" name="basemap" value="terrain" type="radio" checked'), '素色底图未设为默认');
assert(mapBaseLayer.includes('buildCoastlineLayer') && html.includes('data/geo-coastline.js') && mapBaseLayer.includes('GEO_COASTLINES'), '真实海岸轮廓图层未接入');
assert(html.includes('lyr-cmd-label') && html.includes('郡名标签'), 'V9郡名独立图层开关未接入');
assert(mapApp.includes('cmdLabel') && mapApp.includes('setLabelsVisible'), 'V9郡名图层开关逻辑未接入');
assert(mapCommanderies.includes('labelPosition') && mapCommanderies.includes('setLabelsVisible'), 'V9通用郡名锚点或显示控制未接入');
assert(mapWuCommanderies.includes('labelPosition') && mapWuCommanderies.includes('setLabelsVisible'), 'V9孙吴郡名锚点或显示控制未接入');
assert(html.includes('V10：郡名是行政信息本身') && !html.includes("label.style.visibility='hidden'"), 'V10郡名仍会被碰撞逻辑隐藏');
assert(html.includes('cmd-label-compact') && html.includes('--cmd-shift-y'), 'V10缩略郡名错位布局未接入');
assert(!mapBaseLayer.includes('今黄河') && !mapBaseLayer.includes('今长江'), '河水、江水仍附有现代名称');
[mapConfig,mapBaseLayer,mapNarrative].forEach(source => assert(!source.includes('（今') && !source.includes('(今'), '地图可见文字仍含“今××”现代地名括注'));
assert(!html.includes('cdnjs.cloudflare.com/ajax/libs'), '本地项目仍依赖 cdnjs');
assert(!html.includes('workbuddy-space-static.codebuddy.work/page/'), '本地项目仍依赖 WorkBuddy 运行资源');
assert(!html.includes('raw.githubusercontent.com/Heliog3nesis'), '本地项目仍依赖 GitHub 原始几何文件');
assert(portable.includes('中华三国志 · 职官谱｜州镇录｜形势图'), '联网便携版尚未同步新界面标题');
assert(portable.includes('window.HISTORY_MAP_REGISTRY='), '联网便携版未内嵌十六期地图注册表');
assert(portable.includes('"id":"shaodi"') && portable.includes('"year":189'), '联网便携版未同步189年地图');
assert(portable.includes('"id":"hanwang"') && portable.includes('"year":264'), '联网便携版未同步 264 年地图');
assert(portable.includes('SGZResearchModel') && portable.includes('HistoryMapBridge'), '联网便携版未内嵌统一模型或地图联动桥');
assert(portable.includes('SGZ_HISTORY_EVIDENCE'), '联网便携版未内嵌 V7 历史证据索引');
assert(portable.includes('SGZ_BATTLE_RECORDS') && portable.includes('战事纪'), '联网便携版未同步战事纪档案');
assert(portable.includes('官制对照') && portable.includes('沿革事件（结构化）') && portable.includes('bulk-edit-grid'), '联网便携版未同步职官谱第一阶段增强');
assert(portable.includes('官品秩俸三轨对照') && portable.includes('官署模板库') && portable.includes('OFFICE_TEMPLATE_LIBRARY'), '联网便携版未同步职官谱第二阶段增强');
assert(portable.includes('季汉官制') && portable.includes('WIKI_OFFICE_SUPPLEMENTS'), '联网便携版未同步季汉官制或维基补充');
assert(portable.includes('FANGZHEN_TERM_SUPPLEMENTS') && portable.includes('沿革年代已标注待考'), '联网便携版未同步 V28 州镇录补全');
assert(portable.includes("root.key, '太宰'") && portable.includes('泰始六曹／太康六曹'), '联网便携版未同步 V29 西晋官制');
assert(portable.includes('曹魏代汉'), '联网便携版未同步 220 年节点改名');
assert(!portable.includes('州郡边界与水系 © Zhou Dadudu'), '联网便携版仍保留左侧署名');
assert(!portable.includes('<strong>V7证据快照</strong>') && !portable.includes('<strong>考据说明</strong>'), '联网便携版右侧面板仍保留考据或证据快照');
assert(portable.includes('POLITICAL_SNAPSHOT_AUDIT') && portable.includes('PROVINCE_COLOR_PALETTE'), '联网便携版未内嵌势力审校或州级配色');
assert(portable.includes('map-display-mode') && portable.includes('map-state-filter') && portable.includes('faction-filter'), '联网便携版未同步 V8 地图交互');
assert(portable.includes('lyr-cmd-label') && portable.includes('labelPosition'), '联网便携版未同步 V9 全郡名显示');
assert(portable.includes('lyr-minorities') && portable.includes('MINORITY_REGIONS') && portable.includes('ensureHatchPattern'), '联网便携版未同步 V11 地图图层');
assert(!portable.includes('./assets/vendor/'), '联网便携版仍错误引用项目内 vendor 路径');

const requiredFiles = [
  'data/map-period-registry.js',
  'data/research-model.js',
  'data/research-schema.json',
  'data/migration-v6.json',
  'data/migration-v7.json',
  'data/history-evidence.json',
  'data/history-evidence.js',
  'data/battle-records.js',
  'data/wu-fangzhen-records.js',
  'data/shu-fangzhen-records.js',
  'data/wu-import-audit.json',
  'data/wikipedia-commandery-audit.json',
  'docs/职官方镇史实整合说明.md',
  'docs/研究数据模型与联动说明.md',
  'docs/V7史料溯源与时期快照.md',
  'docs/V8地图图层与聚焦交互.md',
  'docs/V9全郡名显示与地图标签.md',
  'docs/九期势力与标签审校.md',
  'docs/V11地图行政归并与周边图层.md',
  'docs/V12前期郡界与活动范围.md',
  'docs/V13人物志自动保存与数据审计.md',
  'docs/V14战事纪板块.md',
  'docs/V15职官谱第一阶段增强.md',
  'docs/V16职官谱第二阶段增强.md',
  'docs/V17职官谱归类与界面简化.md',
  'docs/V18维基补充季汉官制与分类重构.md',
  'docs/V19地图十三期与诸侯标注.md',
  'docs/V25时间轴精简与食货志.md',
  'docs/V26食货志札记补充.md',
  'docs/V27人物记十六期与中央分类.md',
  'assets/vendor/element-plus/index.css',
  'assets/vendor/vue/vue.global.min.js',
  'assets/vendor/element-plus/index.full.min.js',
  'assets/vendor/gojs/go.js',
  'assets/vendor/xlsx/xlsx.full.min.js',
  'assets/map/vendor/leaflet/leaflet.css',
  'assets/map/vendor/leaflet/leaflet.js',
  'assets/map/data/geo-water.js',
  'assets/map/data/three-kingdoms.js',
  'assets/map/data/all-provinces-local.js',
  'assets/map/data/administrative-snapshots.js',
  'assets/map/data/administrative-events.js',
  'assets/map/data/county-registry.js',
  'assets/map/data/history-evidence.js',
  'assets/map/js/panel.js',
  'assets/map/css/style.css',
  'assets/map/data/political-snapshots.js',
  'assets/map/data/strategic-geography.js',
  'assets/map/data/geo-world-context.js',
  'assets/map/js/base-layer.js',
  'assets/map/js/bridge.js',
  'assets/map/js/config.js',
  'assets/map/js/territories.js',
  'assets/map/js/wu-commanderies.js',
  'assets/map/js/commanderies.js',
  'assets/map/js/counties.js',
  'assets/map/js/markers.js',
  'assets/map/js/routes.js',
  'assets/map/js/strategic-layers.js',
  'assets/map/js/timeline.js',
  'assets/map/js/app.js'
];
requiredFiles.forEach(relative => {
  const fullPath = path.join(root, relative);
  assert(fs.existsSync(fullPath), `缺失资源：${relative}`);
  assert(fs.statSync(fullPath).size > 0, `空资源：${relative}`);
});

const scriptMatches = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
scriptMatches.forEach((match, index) => {
  const code = match[1].trim();
  if (!code) return;
  try {
    new vm.Script(code, { filename: `index-inline-${index + 1}.js` });
  } catch (error) {
    throw new Error(`index.html 内联脚本语法错误：${error.message}`);
  }
});
const portableScriptMatches = [...portable.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
portableScriptMatches.forEach((match, index) => {
  const code = match[1].trim();
  if (!code) return;
  try {
    new vm.Script(code, { filename: `portable-inline-${index + 1}.js` });
  } catch (error) {
    throw new Error(`便携版内联脚本语法错误：${error.message}`);
  }
});

const portableSrcdocStart = portable.indexOf('const HISTORY_MAP_SRCDOC = `');
const portableSrcdocEnd = portable.indexOf('\nconst RANK9_OPTIONS', portableSrcdocStart);
assert(portableSrcdocStart >= 0 && portableSrcdocEnd > portableSrcdocStart, '便携版缺少地图 srcdoc');
const portableMapContext = { HISTORY_MAP_BASE:'./', HISTORY_MAP_PERIODS:registry.periods };
vm.createContext(portableMapContext);
new vm.Script(
  `${portable.slice(portableSrcdocStart, portableSrcdocEnd)}\nglobalThis.__mapSrcdoc=HISTORY_MAP_SRCDOC;`,
  { filename:'portable-map-srcdoc.js' }
).runInContext(portableMapContext);
assert(portableMapContext.__mapSrcdoc.includes('window.YIZHOU_LABEL = YIZHOU_LABEL'), '便携版未内嵌夷洲常驻数据');
assert(portableMapContext.__mapSrcdoc.includes('__YIZHOU_PERMANENT_LAYER'), '便携版未内嵌夷洲常驻图层');
assert(!portableMapContext.__mapSrcdoc.includes('（今') && !portableMapContext.__mapSrcdoc.includes('(今'), '便携版地图仍含现代地名括注');
[...portableMapContext.__mapSrcdoc.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .forEach((match,index)=>new vm.Script(match[1],{filename:`portable-map-inline-${index+1}.js`}));

console.log('项目验证通过');
console.log(`十六期：${registry.periods.map(period => period.year).join('、')}`);
console.log('184/189/190 十三州、194/200 河西雍州、263 魏汉吴、264 魏吴、266 晋吴、280 十九州均已锁定');
console.log('职官谱｜州镇录｜形势图命名、官品规则与东晋扩展边界已锁定');
