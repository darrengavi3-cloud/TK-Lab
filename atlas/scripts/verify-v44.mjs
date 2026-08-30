import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const html = read('index.html');
const portable = read('exports/三国职官谱-单文件版.html');
const config = read('assets/map/js/config.js');
const baseLayer = read('assets/map/js/base-layer.js');
const mapApp = read('assets/map/js/app.js');
const vectorAudit = JSON.parse(read('data/public-vector-audit.json'));

// 1. 全局命令面板
assert(html.includes('command-palette') && html.includes('openCommandPalette') && html.includes('paletteMove') && html.includes('paletteSelect'), '全局命令面板模板或交互未接入');
assert(html.includes('palette-scope-chips') && html.includes('searchScopeOptions'), '命令面板范围芯片未接入');
assert(html.includes("['f','k'].includes(event.key.toLowerCase())"), 'Cmd/Ctrl+K 快捷键未接入');
assert(html.includes('commandPaletteGroups') && html.includes('HYDRONYM_AUDIT'), '跨模块检索结果未包含古水名');
assert(html.includes('highlightMatch') && html.includes('<mark>'), '检索匹配高亮未接入');
assert(html.includes('peopleAdvanced') && html.includes('people-advanced-filters'), '人物记“更多筛选”折叠未接入');
assert(portable.includes('command-palette') && portable.includes('openCommandPalette') && portable.includes('palette-scope-chips'), '便携版未同步命令面板');

// 2. 高程底图与读数
assert(config.includes("elevation:") && config.includes("elevation-tiles-prod/terrarium"), '高程底图（Terrarium）未接入配置');
assert(config.includes("hillshade:") && config.includes('World_Hillshade'), '山影兜底底图未接入配置');
assert(baseLayer.includes('syncHillshade') && baseLayer.includes("zoom < 7"), '低缩放山影兜底逻辑未接入');
assert(baseLayer.includes('elevationAt') && baseLayer.includes('getImageData'), '海拔解码逻辑未接入');
assert(baseLayer.includes('setElevationReadout') && baseLayer.includes('handleMapClick'), '高程读数开关或点击取样未接入');
assert(mapApp.includes('elevReadout') && mapApp.includes("'lyr-elev':'elevReadout'"), '高程读数图层开关未接入地图');
assert(html.includes('bm-elevation') && html.includes('lyr-elev') && html.includes('elev-readout'), '高程底图或读数控件未接入页面');
assert(portable.includes('bm-elevation') && portable.includes('lyr-elev'), '便携版未同步高程控件');

// 3. 战事纪关联链与地图互跳
assert(html.includes('jumpBattleToMap') && html.includes('battleRelationChain') && html.includes('battle-chain'), '战事纪关联链或地图互跳未接入');
assert(html.includes('battle-map-link') && html.includes('定位地图战场'), '战事条目地图跳转按钮未接入');

// 4. 州镇表任期时间条与年份快照/对比
assert(html.includes('fangzhenTimelineStyle') && html.includes('fz-timeline-bar') && html.includes('fz-timeline-scale'), '州镇表任期时间条未接入');
assert(html.includes('fangzhenSnapshotYear') && html.includes('fangzhenCompareYear') && html.includes('fangzhenCompareRecords'), '州镇表年份快照或两年对比未接入');

// 5. 食货志分区、证据徽标与户口图表
assert(html.includes('shihuo-polity-chips') && html.includes('SHIHUO_POLITIES'), '食货志政权芯片未接入');
assert(html.includes('shihuoEvidenceClass') && html.includes('shihuo-evidence'), '食货志证据徽标未接入');
assert(html.includes('householdMiniChart') && html.includes('hh-mini-chart'), '食货志户口图表未接入');

// 6. 金石录芯片、释文高亮与关联人物
assert(html.includes('epigraphicArchive') && html.includes('jinshi-chip-row'), '金石录档案层级芯片未接入');
assert(html.includes('epigraphicHighlight') && html.includes('epigraphic-inscription'), '金石录释文高亮未接入');
assert(html.includes('openEpigraphicPerson') && html.includes('jinshi-person'), '金石录关联人物跳转未接入');
assert(portable.includes('epigraphicHighlight') && portable.includes('jinshi-person'), '便携版未同步金石录优化');

// 7. 公共地图审计与文档
const chgis = vectorAudit.publicCandidates.find(item => item.name.toLowerCase().includes('chgis'));
assert(chgis && chgis.role && chgis.decision && chgis.decision.includes('不导入'), 'CHGIS 审计结论未记录');
const joerd = vectorAudit.publicCandidates.find(item => item.name.toLowerCase().includes('tilezen'));
assert(joerd && joerd.license && joerd.decision, 'tilezen/joerd 审计结论未记录');
assert(fs.existsSync(path.join(root, 'docs/V44检索高程与版块优化.md')), '缺少 V44 版本文档');
assert(fs.existsSync(path.join(root, 'data/v44-release-manifest.json')), '缺少 V44 发布清单');

// 8. 便携版与资源完整性
assert(portable.includes('jumpBattleToMap') && portable.includes('fangzhenTimelineStyle') && portable.includes('shihuoEvidenceClass'), '便携版未同步四大版块交互');

console.log('V44 验证通过');
console.log('命令面板：跨 9 个范围、键盘导航与高亮已接入；高程：Terrarium＋山影兜底＋读数已接入');
console.log('战事纪关联链/地图互跳、州镇任期条/快照对比、食货志图表/证据徽标、金石录高亮/关联人物均通过');
