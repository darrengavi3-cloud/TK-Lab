import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const rawGeo = JSON.parse(fs.readFileSync(path.join(root, 'assets/map/data/All_Provinces.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data/map-period-registry.json'), 'utf8'));

const srcdocStart = html.indexOf('const HISTORY_MAP_SRCDOC = `');
const srcdocEnd = html.indexOf('\nconst RANK9_OPTIONS', srcdocStart);
if (srcdocStart < 0 || srcdocEnd < 0) throw new Error('无法提取地图 srcdoc 模板');
const srcdocDeclaration = html.slice(srcdocStart, srcdocEnd);
const srcdocContext = {
  HISTORY_MAP_BASE: './assets/map/',
  HISTORY_MAP_PERIODS: registry.periods
};
vm.createContext(srcdocContext);
new vm.Script(`${srcdocDeclaration}\nglobalThis.__srcdoc=HISTORY_MAP_SRCDOC;`).runInContext(srcdocContext);
const srcdoc = srcdocContext.__srcdoc;
if (!srcdoc.includes('data/history-evidence.js')) throw new Error('地图 srcdoc 未接入 V7 历史证据索引');
const inlineScripts = [...srcdoc.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
inlineScripts.forEach((match, index) => {
  const code = match[1].trim();
  if (!code) return;
  new vm.Script(code, { filename: `map-srcdoc-inline-${index + 1}.js` });
});

const start = srcdoc.indexOf("(function(){\n  var GEO_SOURCE='data/All_Provinces.json';");
const endMarker = '})();\n</script>\n<script src="js/base-layer.js';
const end = srcdoc.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('无法提取州郡转换脚本');

const transformScript = srcdoc.slice(start, end + 5);
const context = {
  console,
  Promise,
  fetch: () => Promise.reject(new Error('校验时禁止远程读取')),
  document: {
    head: {
      appendChild(node) {
        return node;
      }
    },
    querySelector() {
      return null;
    }
  },
  window: {
    ALL_PROVINCES_LOCAL: rawGeo
  }
};
context.window.window = context.window;
context.window.document = context.document;

vm.createContext(context);
new vm.Script(
  fs.readFileSync(path.join(root, 'assets/map/data/political-snapshots.js'), 'utf8'),
  { filename:'political-snapshots.js' }
).runInContext(context);
new vm.Script(
  `${fs.readFileSync(path.join(root, 'assets/map/js/config.js'), 'utf8')}\nglobalThis.__politicalConfig={factions:FACTIONS,periods:PROVINCE_PERIODS};`,
  { filename:'config.js' }
).runInContext(context);
new vm.Script(
  fs.readFileSync(path.join(root, 'assets/map/data/administrative-events.js'), 'utf8'),
  { filename:'administrative-events.js' }
).runInContext(context);
new vm.Script(
  fs.readFileSync(path.join(root, 'assets/map/data/administrative-snapshots.js'), 'utf8'),
  { filename:'administrative-snapshots.js' }
).runInContext(context);
new vm.Script(transformScript, { filename: 'history-map-geo-transform.js' }).runInContext(context);
const data = await context.window.__historyMapGeoReady;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
assert(html.includes('dissolvePolygonParts') && html.includes('共享线段') && html.includes('convertGeometryExact'), '早期郡界缺少原始共享边溶解逻辑');
const uniqueKeys = features => new Set(features.map(feature => feature.key));
const names = features => features.map(feature => feature.name);

assert(uniqueKeys(data.provinces.han184).size === 13, `184 年州数错误：${uniqueKeys(data.provinces.han184).size}`);
assert(uniqueKeys(data.commanderyByPeriod.shaodi).size === uniqueKeys(data.commanderyByPeriod.huangjin).size + 1, '189 年少帝节点应在东汉十三州部基础上新增南安郡');
assert(uniqueKeys(data.provinces.han199).size === 16, `199 年州数错误：${uniqueKeys(data.provinces.han199).size}`);
assert(uniqueKeys(data.provinces.han199).has('jing_wei') && uniqueKeys(data.provinces.han199).has('yang_wu'), '199 年州级应分魏吴键');
assert(uniqueKeys(data.provinces.han194).size === 14, `194 年州数错误：${uniqueKeys(data.provinces.han194).size}`);
assert(uniqueKeys(data.provinces.han194).has('yongzhou') && !uniqueKeys(data.provinces.han194).has('jing_wei'), '194 年应只含河西雍州、仍为整州荆州');
assert(data.commanderyByPeriod.xingping.filter(feature=>feature.state==='雍州').map(feature=>feature.sourceName).sort().join('|')===['Dunhuang','Jiuquan','Wuwei','Zhangye'].sort().join('|'), '194 年雍州必须只含河西四郡');
assert(data.commanderyByPeriod.xingping.some(feature=>feature.sourceName==='Xinping'), '194 年应显示兴平元年分置的新平郡');
['han199','han200','han208','han219'].forEach(key => {
  assert(data.provinces[key].some(feature => feature.key === 'sili' && feature.name === '司隶'), `${key} 司隶应保留东汉名称`);
});
assert(uniqueKeys(data.provinces.han219).size >= 16, `219 年州数错误：${uniqueKeys(data.provinces.han219).size}`);
assert(!uniqueKeys(data.provinces.han184).has('yongzhou'), '184/190 年底图不得包含雍州');
assert(uniqueKeys(data.provinces.han200).has('yongzhou'), '200 年必须显示 194 年由凉州河西郡分置的雍州');
assert(uniqueKeys(data.provinces.han200).has('liangzhou'), '200 年雍州设置后仍须保留凉州其余区域');
assert(uniqueKeys(data.provinces.three220).has('qinzhou'), '220 年必须显示魏文帝分陇右设置的秦州');
assert(!uniqueKeys(data.provinces.three228).has('qinzhou'), '228 年魏初秦州已暂废，应归回雍州');
assert(uniqueKeys(data.provinces.jin).size === 19, `280 年州数错误：${uniqueKeys(data.provinces.jin).size}`);
[
  'sili', 'jizhou', 'yanzhou', 'yuzhou', 'jingzhou', 'xuzhou', 'yangzhou',
  'qingzhou', 'youzhou', 'pingzhou', 'bingzhou', 'yongzhou', 'liangzhou',
  'qinzhou', 'liang_state', 'yizhou', 'ningzhou', 'jiaozhou', 'guangzhou'
].forEach(key => assert(uniqueKeys(data.provinces.jin).has(key), `280 年十九州缺少：${key}`));
assert(data.three263.every(feature => ['wei','shu','wu'].includes(feature.kingdom)), '263 年出现魏、汉、吴以外政权');
assert(data.three263.some(feature => feature.kingdom === 'shu'), '263 年投降前快照缺少汉郡');
assert(data.wei264.every(feature => feature.kingdom === 'wei' || feature.kingdom === 'wu'), '264 年出现魏、吴以外政权');
assert(data.jin266.every(feature => feature.kingdom === 'jin' || feature.kingdom === 'wu'), '266 年出现晋、吴以外政权');
assert(data.jin290.length > 0 && data.jin311.length > 0, '290/311 年晋代郡级数据未生成');
assert(
  [...data.commanderies, ...data.shu, ...data.wei263, ...data.jin266, ...data.jin]
    .some(feature => String(feature.name || '').includes('犍为')),
  '州郡数据缺少犍为'
);
const periodNames = id => data.commanderyByPeriod[id].map(feature => feature.name);
const periodSourceNames = id => new Set(data.commanderyByPeriod[id].map(feature => feature.sourceName));
const politicalAudit=context.window.POLITICAL_SNAPSHOT_AUDIT;
const provincePalette=context.window.PROVINCE_COLOR_PALETTE;
const politicalConfig=context.__politicalConfig;
const earlyCommanderySources = new Set(data.commanderyByPeriod.huangjin.map(feature => feature.sourceName));
const yellowHatchSources = (politicalAudit.huangjin.influenceAreas || []).flatMap(area => area.commanderySourceNames || []);
assert(yellowHatchSources.length > 0 && yellowHatchSources.every(sourceName => earlyCommanderySources.has(sourceName)), '黄巾斜线范围未完全贴合184年实际郡块');
assert(context.window.ADMINISTRATIVE_EVENT_MODEL.events.length >= 40, '行政沿革事件模型未完整载入');
Object.entries(politicalAudit).forEach(([periodId,snapshot])=>{
  const mapped=periodId==='jinchu'?['jin','wu']:(periodId==='taikang'?['jin']:Object.values(politicalConfig.periods[periodId]?.provinces||{}));
  const annotated=(snapshot.annotations||[]).map(item=>item.faction);
  const commanderyMapped=Object.values(snapshot.commanderyFactions||{});
  const visible=new Set([...mapped,...annotated,...commanderyMapped]);
  snapshot.expected.forEach(faction=>assert(visible.has(faction),`${snapshot.year} 年缺少势力：${faction}`));
  const displayNames=Object.entries(snapshot.displayNames||{});
  displayNames.forEach(([faction,name])=>{
    const dup=(snapshot.annotations||[]).some(item=>item.name===name&&item.faction===faction);
    assert(!dup,`${snapshot.year} 年势力「${name}」大字与注记重复出现`);
  });
});
assert(politicalConfig.periods.chibi.provinces.jing_wu==='liubiao','208 年荆州刘氏过渡州域未恢复');
const periodByName = id => data.commanderyByPeriod[id];
const findIn = (id, sourceName) => periodByName(id).filter(feature => feature.sourceName === sourceName);
const nameOf = (id, sourceName) => (findIn(id, sourceName)[0] || {}).name;
const assertNoDuplicate = (id, sourceNames) => {
  const seen = [];
  periodByName(id).forEach(feature => {
    if (!sourceNames.includes(feature.sourceName)) return;
    const key = `${feature.sourceName}|${feature.state}`;
    if (seen.includes(key)) throw new Error(`${id} 郡块重复：${key}`);
    seen.push(key);
  });
};
assert(findIn('huangjin', "Nan'an").length === 0, '184 年不得提前显示南安郡');
assert(findIn('shaodi', "Nan'an").length === 1, '189 年应显示中平五年分置的南安郡');
assert(findIn('xiangfan', "Nan'an").length === 0, '219 年南安郡已废入陇西');
assert(findIn('sanguo', "Nan'an").length === 1 && findIn('beifa', "Nan'an").length === 1, '220/228 年曹魏应复置南安郡');
assertNoDuplicate('xiangfan', ['Hanzhong','Jiangxia','Lujiang']);
[
  ['jianbing','Jianning','益州郡'],['jianbing','Fanyang','涿郡'],['jianbing','Tianshui','汉阳郡'],
  ['jianbing','Huainan','九江郡'],['jianbing','Jingzhao','京兆尹'],['jianbing','Pingyi','左冯翊'],
  ['jianbing','Fufeng','右扶风'],['jianbing','Henan','河南尹'],
  ['xiangfan','Jianning','益州郡'],['xiangfan','Fanyang','涿郡'],['xiangfan','Tianshui','汉阳郡'],
  ['xiangfan','Huainan','九江郡'],['xiangfan','Jingzhao','京兆尹'],['xiangfan','Pingyi','左冯翊'],
  ['xiangfan','Fufeng','右扶风'],['xiangfan','Henan','河南尹']
].forEach(([id, sourceName, expected]) => {
  assert(nameOf(id, sourceName) === expected, `${id} 郡名应为 ${expected}，实际 ${nameOf(id, sourceName)}`);
});
assert(findIn('xiangfan','Shangyong').length === 0 && findIn('xiangfan','Xincheng').length === 0, '219 年上庸、新城应归并汉中');
assert(findIn('sanguo','Shangyong').length === 1 && findIn('sanguo','Xincheng').length === 1, '220 年应同时显示上庸郡与新城郡');
assert(findIn('sanguo','Lujiang').length === 2, '220 年庐江应只保留魏吴两块，安丰归并块不得另立');
assert(findIn('sanguo','Jianping').length === 0 && findIn('beifa','Jianping').length === 0, '220/228 年建平郡尚未设置');
assert(findIn('guijin','Jianping').length === 1, '263 年应显示建平郡');
const liangMembers = ['Hanzhong','Zitong','Ba','Badong','Baxi','Fuling','Weixing','Shangyong','Xincheng'];
const guangMembers = ['Nanhai','Cangwu','Yulin','Gaoliang','Hepu'];
['hanwang','jinchu'].forEach(id => {
  assert(findIn(id,'Dongguanghan').length === 0, `${id} 不应再显示咸熙初省并的东广汉郡`);
  liangMembers.forEach(sourceName => {
    assert(findIn(id, sourceName).length === 1 && findIn(id, sourceName)[0].state === '梁州', `${id} ${sourceName} 应归梁州`);
  });
  guangMembers.forEach(sourceName => {
    assert(findIn(id, sourceName).length === 1 && findIn(id, sourceName)[0].state === '广州', `${id} ${sourceName} 应归广州`);
  });
});
const wei264ProvinceKeys = data.provinces.wei264.map(feature => feature.key);
assert(wei264ProvinceKeys.includes('liang_state') && wei264ProvinceKeys.includes('guangzhou') && wei264ProvinceKeys.includes('jiaozhou'), '264 年州级应含梁州、广州、交州');
assert(data.provinces.jin266.map(feature => feature.key).includes('liang_state'), '266 年州级应含梁州');
assert(data.provinces.jin290.map(feature => feature.key).length === 19, '290 年应延续十九州');
assert(data.provinces.jin311.map(feature => feature.key).length === 19, '311 年应延续十九州框架');
assert(politicalConfig.periods.jianbing.provinces.yang_wei === 'caocao' && politicalConfig.periods.jianbing.provinces.yang_wu === 'sunce', '199 年淮南、江东分治着色未启用');
assert(politicalConfig.periods.guandu.provinces.yang_wei === 'caocao' && politicalConfig.periods.guandu.provinces.yang_wu === 'sunquan', '200 年淮南、江东分治着色未启用');
['jianbing','guandu','chibi'].forEach(id => assert(politicalConfig.periods[id].provinces.yongzhou === 'liangzhou', `${id} 河西雍州未按凉州诸将着色`));
['guandu','chibi','sanguo','beifa'].forEach(id => {
  assert(politicalAudit[id].commanderyFactions?.Liaodong === 'gongsundu', `${id} 辽东公孙氏未按割据势力着色`);
  const bigName = politicalAudit[id].displayNames?.gongsundu;
  assert(bigName && (bigName === '公孙度' || bigName === '公孙氏' || bigName === '公孙渊'), `${id} 辽东公孙氏大字缺失`);
  assert(!(politicalAudit[id].annotations || []).some(item => item.faction === 'gongsundu'), `${id} 辽东公孙氏大字与注记重复`);
});
assert(politicalConfig.periods.shaodi && politicalConfig.periods.shaodi.provinces.sili==='han','189 年少帝节点未保持东汉行政州域');
assert(politicalAudit.shaodi.annotations.some(item=>item.name==='何进'),'189 年缺少何进中央注记');
assert(politicalAudit.shaodi.annotations.some(item=>item.name==='董卓军'),'189 年缺少董卓入京注记');
assert(politicalAudit.chibi.annotations.some(item=>item.faction==='liubei'&&/夏口/.test(item.detail)),'208 年缺少刘备夏口军势');
assert(politicalConfig.periods.chibi.provinces.yang_wu==='sunquan','208 年缺少孙权江东州域');
['bingzhou','qingzhou','yangzhou','youzhou'].forEach(key=>assert(politicalConfig.periods.dongzhuo.provinces[key]==='han',`190 年${key}被误绘为统一关东联盟领土`));
assert(politicalConfig.periods.dongzhuo.provinces.xuzhou==='taoqian','190 年徐州未按陶谦控制区着色');
assert(politicalAudit.dongzhuo.annotations.filter(item=>['yuan_shao','wangkuang','zhangmiao','kongzhou'].includes(item.faction)).length>=4,'关东讨董诸军缺少分区注记');
assert(politicalAudit.dongzhuo.annotations.filter(item=>['hansui','mateng'].includes(item.faction)).length>=2,'凉州韩遂、马腾缺少分区注记');
assert(politicalConfig.periods.dongzhuo.provinces.jizhou==='hanfu','190 年冀州未按韩馥控制区着色');
assert(politicalAudit.dongzhuo.commanderyFactions.Yingchuan==='kongzhou','190 年颍川郡未标注孔伷');
assert(politicalAudit.dongzhuo.commanderyFactions.Jincheng==='hansui'&&politicalAudit.dongzhuo.commanderyFactions.Tianshui==='mateng','190 年金城、汉阳军势分色缺失');
uniqueKeys(data.provinces.jin).forEach(key=>assert(provincePalette[key],`州级配色缺少：${key}`));
assert(periodNames('guandu').filter(name => name === '巴郡').length === 1, '200 年巴郡尚未完成巴、巴西、巴东三分');
assert(periodNames('chibi').includes('巴西郡') && !periodNames('chibi').includes('巴东郡'), '208 年应有巴西郡而尚不显示巴东郡');
assert(periodNames('sanguo').includes('巴东郡'), '220 年应显示已定名的巴东郡');
assert(periodNames('jianbing').includes('汉中郡'), '199 年应显示汉中郡');
assert(periodNames('jianbing').includes('辽东郡'), '199 年应显示辽东郡');
assert(periodNames('xiangfan').includes('汉中郡') && periodNames('xiangfan').includes('巴东郡'), '219 年应显示汉中郡与巴东郡');
assert(new Set(data.commanderyByPeriod.guandu.map(feature => feature.key)).size !== new Set(data.commanderyByPeriod.chibi.map(feature => feature.key)).size, '200 与 208 年郡级快照不应完全相同');
Object.entries(context.window.ADMINISTRATIVE_SNAPSHOTS).forEach(([periodId,snapshot]) => {
  (context.window.ADMINISTRATIVE_AUDIT_RULES || []).forEach(rule => {
    if (Number(snapshot.year) < Number(rule.notBefore)) {
      assert(!periodSourceNames(periodId).has(rule.sourceName), `${snapshot.year} 年提前显示${rule.label}`);
    }
  });
});
assert(periodNames('sanguo').includes('益州郡') && !periodNames('sanguo').includes('建宁郡'), '220 年益州郡尚未更名建宁郡');
assert(periodNames('beifa').includes('建宁郡') && !periodNames('beifa').includes('益州郡'), '228 年应显示建宁郡，不应沿用益州郡旧名');
assert(![...data.commanderyByPeriod.taikang].some(feature => /护军郡/.test(feature.name)), '护军辖区被误绘为郡');
const polygonParts = features => features.reduce((count,feature)=>count+(feature.geometry.type==='Polygon'?1:feature.geometry.coordinates.length),0);
const sourcePartCount=polygonParts(data.shu);
['huangjin','shaodi','dongzhuo','guandu','chibi'].forEach(periodId=>{
  const periodPartCount=polygonParts(data.commanderyByPeriod[periodId]);
  assert(periodPartCount>0,`${periodId} 郡界溶解后出现空几何：${periodPartCount}/${sourcePartCount}`);
});
const yongzhou200=data.commanderyByPeriod.guandu.filter(feature=>feature.state==='雍州').map(feature=>feature.sourceName).sort();
assert(yongzhou200.join('|')===['Dunhuang','Jiuquan','Wuwei','Zhangye'].sort().join('|'),`200 年雍州必须只含河西四郡，当前为：${yongzhou200.join('、')}`);
assert(data.commanderyByPeriod.guijin.filter(feature=>feature.kingdom==='shu').length===22,'263 年汉应保留二十二郡');
assert(['巴郡','巴西郡'].every(name=>data.commanderyByPeriod.guijin.some(feature=>feature.kingdom==='shu'&&feature.name===name)), '263 年汉缺少巴郡或巴西郡郡色数据');
assert(data.commanderyByPeriod.guijin.some(feature=>feature.kingdom==='wu'&&feature.sourceName==='Tianmen'&&feature.name==='天门郡'), '263 年吴缺少天门郡');
assert(JSON.stringify(data.commanderyByPeriod.guijin.find(feature=>feature.sourceName==='Tianmen')?.label)===JSON.stringify([29.45,110.90]), '263 年天门郡标签位置未校正');
assert(JSON.stringify(data.commanderyByPeriod.guijin.find(feature=>feature.sourceName==='Wuling')?.label)===JSON.stringify([29.00,111.50]), '263 年武陵郡标签位置未校正');
assert(JSON.stringify(data.commanderyByPeriod.guijin.find(feature=>feature.sourceName==='Jianping')?.label)===JSON.stringify([31.05,110.05]), '263 年建平郡标签位置未校正');
assert(!data.commanderyByPeriod.hanwang.some(feature=>feature.kingdom==='shu'),'264 年稳定截面不应继续显示汉');
Object.entries(data.commanderyByPeriod).forEach(([periodId, features]) => {
  assert(features.every(feature => Array.isArray(feature.label) && feature.label.length >= 2), `${periodId} 存在缺少郡名锚点的郡块`);
});

console.log('地图几何验证通过');
console.log(`184/190 州级结构：${names(data.provinces.han184).join('、')}`);
console.log(`263 郡级政权：${[...new Set(data.three263.map(feature => feature.kingdom))].join('、')}`);
console.log(`264 郡级政权：${[...new Set(data.wei264.map(feature => feature.kingdom))].join('、')}`);
console.log(`266 郡级政权：${[...new Set(data.jin266.map(feature => feature.kingdom))].join('、')}`);
console.log(`郡级快照：200 年 ${data.commanderyByPeriod.guandu.length} 郡；208 年 ${data.commanderyByPeriod.chibi.length} 郡；220 年 ${data.commanderyByPeriod.sanguo.length} 郡`);
console.log('V10 郡名锚点：十四期全部郡块均已生成');
console.log(`280 十九州：${names(data.provinces.jin).join('、')}`);
console.log('十四期势力完整性、189 年官员注记、190 年分郡势力、194 兴平节点与 263/264 年状态已通过审计');
if (process.env.MAP_AUDIT_VERBOSE === '1') {
  Object.entries(data.commanderyByPeriod).forEach(([periodId, features]) => {
    const counts = features.reduce((out, feature) => {
      out[feature.state] = (out[feature.state] || 0) + 1;
      return out;
    }, {});
    console.log(`${periodId} 郡数：${JSON.stringify(counts)}`);
  });
}
if (process.env.MAP_AUDIT_NAMES === '1') {
  ['huangjin','shaodi','dongzhuo','guandu','chibi'].forEach(periodId => {
    const byState = Object.groupBy(data.commanderyByPeriod[periodId], feature => feature.state);
    Object.entries(byState).forEach(([state, features]) => console.log(`${periodId} ${state}：${features.map(feature => feature.name).sort().join('、')}`));
  });
}
