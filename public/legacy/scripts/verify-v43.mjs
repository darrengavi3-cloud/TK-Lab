import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const context = { window: {} };
context.window.window = context.window;
vm.createContext(context);
const run = relative => new vm.Script(read(relative), { filename: relative }).runInContext(context);
run('data/research-model.js');
run('data/kaifu-policies.js');
run('data/office-residences.js');
run('data/office-seat-policies.js');
run('data/person-source-index.js');
run('assets/map/data/hydronym-audit.js');
run('data/battle-records.js');
run('assets/map/data/strategic-geography.js');

const model = context.window.SGZResearchModel;
const kaifu = context.window.SGZ_KAIFU_POLICIES || [];
const residences = context.window.SGZ_OFFICE_RESIDENCES || [];
const seats = context.window.SGZ_SEAT_POLICIES || [];
const personIndex = context.window.SGZ_PERSON_SOURCE_INDEX || { coverage: [], people: [], appointments: [] };
const hydronymAudit = context.window.HYDRONYM_AUDIT || { hydronyms: [], sources: [] };
const battles = context.window.SGZ_BATTLE_RECORDS || { battlefields: [] };
const strategicFields = context.window.STRATEGIC_BATTLEFIELDS || [];

const html = read('index.html');
const portable = read('exports/三国职官谱-单文件版.html');
const coverageJson = JSON.parse(read('data/person-volume-coverage.json'));
const vectorAudit = JSON.parse(read('data/public-vector-audit.json'));
const strategicLayers = read('assets/map/js/strategic-layers.js');
const mapApp = read('assets/map/js/app.js');
const mapPanel = read('assets/map/js/panel.js');
const hydronymLayer = read('assets/map/js/hydronyms.js');
const battleRecordsSource = read('data/battle-records.js');
const strategicSource = read('assets/map/data/strategic-geography.js');

// 1. 研究模型 V9 与兼容迁移
assert(model.schemaVersion === 9, '研究模型必须为 schemaVersion 9');
const migratedV7 = model.migrate({ schemaVersion: 7, trees: {}, seatPolicies: [], residences: [], kaifuPolicies: [{ officeName: '丞相', qualificationType: '特诏开府' }] });
const migratedV8 = model.migrate({ schemaVersion: 8, trees: {}, seatPolicies: [], residences: [], kaifuPolicies: [] });
assert(migratedV7.schemaVersion === 9 && migratedV7.kaifuPolicies[0].entityType === 'kaifuPolicy', 'V7 存档未迁移到 V9 开府模型');
assert(migratedV8.schemaVersion === 9 && Array.isArray(migratedV8.hydronyms) && Array.isArray(migratedV8.personRecords), 'V8 存档未迁移到 V9 水系/人物模型');

// 2. 开府资格
const kaifuTypes = new Set(kaifu.map(item => item.qualificationType));
['法定开府', '加号开府', '特诏开府', '事实见府属', '待考'].forEach(type => assert(kaifuTypes.has(type), `开府资格缺少：${type}`));
assert(kaifu.some(item => item.researchStatus === '确定'), '开府政策缺少确定条目');
assert(kaifu.some(item => item.researchStatus === '存疑'), '开府政策缺少存疑条目');
kaifu.forEach(item => assert(item.evidence && (item.evidence.sourceTitle || item.evidence.sourceLocator), `开府政策缺少出处：${item.id}`));
const simaZhao = kaifu.find(item => item.id === 'kaifu:wei:xiangguo:sima-zhao');
assert(simaZhao && simaZhao.sourceTenureText && simaZhao.qualificationType === '事实见府属', '司马昭相国府开府依据未保留原始任期表述');

// 3. 府署与属官分类
const residenceTypes = new Set(residences.map(item => item.residenceType));
['丞相府', '三公府', '将军府', '都督府', '州府', '郡府', '东宫', '王府'].forEach(type => assert(residenceTypes.has(type), `府署类型缺少：${type}`));
const domainSet = new Set(model.serviceDomains);
const institutionSet = new Set(model.institutionTypes);
residences.forEach(residence => {
  if (!residence.isFallback) assert(residence.evidence, `府署缺少出处：${residence.id}`);
  if (residence.isFallback) assert(residence.researchStatus === '存疑', `兼容府署必须标记存疑：${residence.id}`);
  (residence.roles || []).forEach(role => {
    assert(domainSet.has(role.serviceDomain), `府属文武分类非法：${residence.id}·${role.officeName}->${role.serviceDomain}`);
    assert(institutionSet.has(role.institutionType), `府属府署分类非法：${residence.id}·${role.officeName}->${role.institutionType}`);
    if (residence.residenceType === '将军府' || residence.residenceType === '都督府' || residence.residenceType === '三公府' || residence.residenceType === '丞相府') {
      assert(!['州府', '郡府'].includes(role.institutionType), `军府/公府混入州郡属官：${residence.id}·${role.officeName}`);
    }
  });
});
assert(html.includes("'州郡属官'") && html.includes("'太子官属'") && html.includes("'诸王官属'") && html.includes("'幕府属官'"), '府署属官四类拆分未接入页面');

// 4. 三类人数：制度员额、展示席位、实际任官
assert(seats.length > 0 && seats.every(item => item.authorizedCount !== undefined && item.displayCapacity !== undefined && item.countStatus), '员额规则缺少制度员额/展示席位/状态');
assert(html.includes('制度员额') && html.includes('展示席位') && html.includes('实任人数'), '三类人数分列未接入府署页');
assert(html.includes('countStatus') && html.includes("'待考'"), '员额缺载状态未保留');

// 5. 人物逐卷覆盖
assert(coverageJson.summary.volumes === 195 && coverageJson.coverage.length === 195, '人物卷覆盖必须为 195 卷');
const sgzVolumes = coverageJson.coverage.filter(item => item.work === '《三国志》');
const jinshuVolumes = coverageJson.coverage.filter(item => item.work === '《晋书》');
assert(sgzVolumes.length === 65 && jinshuVolumes.length === 130, '三国志/晋书卷数应为 65/130');
assert(coverageJson.coverage.every(item => ['已处理','待复核'].includes(item.processedStatus)), '存在未处理的正史卷次');
assert(coverageJson.coverage.filter(item => item.processedStatus === '待复核').length <= 60, '待复核卷过多，需继续改进抽取规则');
assert(personIndex.people.length >= 200 && personIndex.appointments.length >= 200, '人物与任官候选数量不足');
assert(personIndex.people.every(item => String(item.personId).startsWith('person:')), '人物必须使用稳定 personId');
assert(personIndex.appointments.every(item => String(item.personId).startsWith('person:') && item.officeName && item.sourceLocator), '任官候选缺少稳定人物/官职/出处');
assert(personIndex.summary.peiAnnotations >= 6, '裴松之注候选未单独分层');
assert(personIndex.appointments.every(item => item.evidenceLayer === '正文' || item.evidenceLayer === '裴松之注'), '正文与裴注证据层未分离');
assert(personIndex.appointments.filter(item => ['司徒','司空','太尉','丞相','相国','太傅','太保'].includes(item.officeName) && item.institutionType !== '朝廷机关').length === 0, '诸公本人被误标为府署');
assert(!personIndex.people.some(item => ['白衣','蒙逊'].includes(item.name)), '误识别人物未清除');
assert(personIndex.people.filter(item => item.name === '钟繇').every(item => item.personId === 'person:wei:zhong-yao'), '显式跨卷同人未合并');
const identityContext={window:{}}; identityContext.window.window=identityContext.window; vm.createContext(identityContext);
new vm.Script(read('data/person-identities.js'),{filename:'person-identities.js'}).runInContext(identityContext);
const identities=identityContext.window.SGZ_PERSON_IDENTITIES;
assert(identities.candidateCount('马忠')===2 && identities.resolve('马忠',{polity:'蜀汉'})?.personId !== identities.resolve('马忠',{polity:'吴'})?.personId, '同名异人显式消歧表异常');
assert(html.includes('peopleSource') && html.includes('peopleEvidence') && html.includes('peopleServiceDomain') && html.includes('peopleInstitutionType'), '人物记筛选条件未接入');
assert(html.includes('pagedPeople') && html.includes('peoplePageSize'), '人物记分页未接入');
assert(html.includes('homonymStatus') || html.includes('homonymGroupId'), '同名消歧字段未接入人物记');

// 6. 古水名审计与地图层
assert(hydronymAudit.baseline.geometryFeatures === 285 && hydronymAudit.baseline.uniqueNames === 257 && hydronymAudit.baseline.shuijingzhuVolumes === 40, '水系审计基线必须保持 285/257/40');
assert(hydronymAudit.sources.length === 40, '《水经注》来源应为 40 卷');
assert(hydronymAudit.hydronyms.every(item => Number.isFinite(item.priority) && Number.isFinite(item.minZoom)), '水名缺少缩放分级或优先级');
const anchoredCount = hydronymAudit.hydronyms.filter(item => Array.isArray(item.labelAnchor) && item.labelAnchor.length === 2).length;
assert(anchoredCount >= 200, '水名标注锚点数量不足');
assert(hydronymAudit.hydronyms.some(item => item.evidence.status === '原文命中'), '缺少《水经注》原文命中的水名');
assert(hydronymAudit.hydronyms.some(item => item.researchStatus === '存疑'), '缺少标注“待考”的水名');
assert(hydronymAudit.policy.includes('《水经注》仅证明名称'), '水名证据与几何来源分离策略未记录');
assert(hydronymLayer.includes('minZoom') && hydronymLayer.includes('used'), '水名层缺少缩放分级或避让逻辑');
assert(mapApp.includes("hydronym:true") && mapApp.includes("'lyr-hydronym':'hydronym'"), '水名层开关未接入地图');
assert(html.includes('lyr-hydronym') && html.includes('古水名'), '古水名图层控件未接入页面');
assert(mapPanel.includes('hydronymView'), '水名详情未接入地图面板');

// 7. 战场地名标签
strategicFields.forEach(item => {
  assert(item.placeLabel && !item.placeLabel.endsWith('战场'), `战场缺少地名标签或仍带“战场”后缀：${item.name}`);
});
battles.battlefields.forEach(item => {
  assert(item.placeLabel && !item.placeLabel.endsWith('战场'), `战事纪档案战场缺少地名标签：${item.name}`);
});
assert(strategicLayers.includes('item.placeLabel || item.name') && strategicLayers.includes('⚔ ${placeLabel}'), '地图战场标记未使用“图例＋地名”');
assert(battleRecordsSource.includes('placeLabel') && strategicSource.includes('placeLabel'), '战场地名标签未写入数据文件');
assert(html.includes('data/strategic-geography.js') && html.includes('../../data/battle-records.js'), '战场数据脚本未接入地图页面');

// 8. 公共地图审计与许可
const archiveEntry = vectorAudit.publicCandidates.find(item => item.name === 'Heliog3nesis/Threekingdoms_Archive');
assert(archiveEntry && archiveEntry.license.includes('CC BY-NC-SA') && archiveEntry.decision === '继续作为参考，不直接替换现有几何', '公共仓库审计缺少署名或许可记录');
const noLicense = vectorAudit.publicCandidates.find(item => item.name === 'eSericaLab/eSerica-geojson-map');
assert(noLicense && noLicense.license === '未声明' && noLicense.decision.includes('不导入'), '无许可仓库不得导入');
assert(!html.includes('raw.githubusercontent.com/Heliog3nesis') && !portable.includes('raw.githubusercontent.com/Heliog3nesis'), '不得依赖 GitHub 原始几何文件');
assert(fs.existsSync(path.join(root, 'docs/V43府署古水系与人物记优化.md')), '缺少 V43 版本文档');

// 9. 便携版同步
assert(portable.includes('HYDRONYM_AUDIT') && portable.includes('SGZ_KAIFU_POLICIES') && portable.includes('SGZ_PERSON_SOURCE_INDEX') && portable.includes('SGZ_OFFICE_RESIDENCES') && portable.includes('SGZ_SEAT_POLICIES'), '便携版未内嵌 V43 数据模块');
assert(portable.includes('lyr-hydronym') && portable.includes('placeLabel'), '便携版未同步古水名图层或战场地名');

const notFound = [];
['data/kaifu-policies.js', 'data/office-seat-policies.js', 'data/office-residences.js', 'data/person-source-index.js', 'data/person-volume-coverage.json', 'assets/map/data/hydronym-audit.js', 'assets/map/js/hydronyms.js'].forEach(relative => {
  if (!fs.existsSync(path.join(root, relative))) notFound.push(relative);
});
assert(notFound.length === 0, `V43 数据文件缺失：${notFound.join('、')}`);

console.log('V43 验证通过');
console.log(`研究模型 v${model.schemaVersion}；开府资格 ${kaifuTypes.size} 类；府署 ${residences.length} 条、员额规则 ${seats.length} 条`);
console.log(`人物卷覆盖 ${coverageJson.summary.volumes}/195；人物 ${personIndex.people.length}；任官候选 ${personIndex.appointments.length}；裴注 ${personIndex.summary.peiAnnotations} 条`);
console.log(`水系几何 ${hydronymAudit.baseline.geometryFeatures}/285；唯一水名 ${hydronymAudit.baseline.uniqueNames}/257；《水经注》命中 ${hydronymAudit.hydronyms.filter(item => item.evidence.status === '原文命中').length}`);
