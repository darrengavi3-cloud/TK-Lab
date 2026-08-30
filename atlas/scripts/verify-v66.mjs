import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const fullPath = relative => path.join(root, relative);
const exists = relative => fs.existsSync(fullPath(relative));
const read = relative => exists(relative) ? fs.readFileSync(fullPath(relative), 'utf8') : '';
const sha256Value = value => crypto.createHash('sha256').update(value).digest('hex');
const sha256File = relative => exists(relative) ? sha256Value(fs.readFileSync(fullPath(relative))) : '';
const hashSortedLines = values => sha256Value([...values].sort().join('\n'));

function json(relative) {
  if (!exists(relative)) {
    failures.push(`缺少 V66 验收文件：${relative}`);
    return null;
  }
  try {
    return JSON.parse(read(relative));
  } catch (error) {
    failures.push(`${relative} 不是有效 JSON：${error.message}`);
    return null;
  }
}

function runtime(relative, globalName) {
  if (!exists(relative)) {
    failures.push(`缺少 V66 运行时文件：${relative}`);
    return null;
  }
  const context = { window: {} };
  context.globalThis = context.window;
  vm.createContext(context);
  try {
    new vm.Script(read(relative), { filename: relative }).runInContext(context, { timeout: 20_000 });
  } catch (error) {
    failures.push(`${relative} 无法载入：${error.message}`);
    return null;
  }
  if (!(globalName in context.window)) failures.push(`${relative} 未注册 ${globalName}`);
  return context.window[globalName] || null;
}

function initializeFreshOfficeTrees(sourceHtml = html, bundleRoot = root, readerBuild = false) {
  const context = {
    window: {}, URL, Blob, TextEncoder, TextDecoder, crypto:globalThis.crypto,
    console, setTimeout, clearTimeout, renderFatalPanel() {},
  };
  if (readerBuild) context.window.SGZ_READER_BUILD = true;
  context.globalThis = context.window;
  vm.createContext(context);
  for (const [, relative] of sourceHtml.matchAll(/<script[^>]+src="\.\/(data\/[^"?]+)(?:\?[^\"]*)?"/g)) {
    const filePath = path.join(bundleRoot, relative);
    if (!fs.existsSync(filePath)) continue;
    new vm.Script(fs.readFileSync(filePath, 'utf8'), { filename: relative }).runInContext(context, { timeout: 20_000 });
  }
  const start = sourceHtml.indexOf('const FACTIONS = [');
  const end = sourceHtml.indexOf('/* =========================================================================\n   Vue App', start);
  if (start < 0 || end <= start) throw new Error('无法定位职官谱真实初始化代码边界');
  const source = `${sourceHtml.slice(start, end)}\nthis.__freshTrees=(()=>{\n` +
    `const migrated=window.SGZResearchModel.migrate({schemaVersion:7,trees:buildPresets(),fangzhenRecords:FANGZHEN_PRESETS});\n` +
    `return normalizeAndValidateTrees(migrated.trees);\n})();`;
  new vm.Script(source, { filename: 'v66-office-real-initialization.js' }).runInContext(context, { timeout: 30_000 });
  return context.__freshTrees;
}

function mapDirectoryDigest() {
  const directory = fullPath('assets/map');
  const files = [];
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile()) files.push(target);
    }
  };
  visit(directory);
  const relative = file => path.relative(directory, file).split(path.sep).join('/');
  files.sort((left, right) => relative(left).localeCompare(relative(right), 'en'));
  const rows = files.map(file => {
    const contents = fs.readFileSync(file);
    return `${relative(file)}\0${contents.length}\0${sha256Value(contents)}\n`;
  }).join('');
  return {
    files: files.length,
    bytes: files.reduce((total, file) => total + fs.statSync(file).size, 0),
    sha256: sha256Value(rows),
  };
}

function rowsOf(payload) {
  for (const key of ['records', 'rows', 'dispositions', 'auditRows']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function seatOf(row) {
  return String(row?.seatName || row?.seat || row?.seatResolution?.seatName || row?.resolvedSeat?.seatName || row?.resolution?.seatName || '').trim();
}

const html = read('index.html');
const readerPeople = json('data/v63-reader-people.json');
const portraitManifest = json('data/portrait-manifest.json');
const mapRegistry = json('data/map-period-registry.json');
const peerage = json('data/v66-peerage-stages.json');
const seatPeriods = json('data/v66-administrative-seat-periods.json');
const v65FangzhenAudit = json('data/v65-fangzhen-audit.json');
const seatAudit = json('data/v66-fangzhen-seat-audit.json');
const fangzhenReader = json('data/v66-fangzhen-reader.json');

/* 人物与立绘稳定基线。 */
const people = readerPeople?.people || [];
assert(people.length === 2317, `统一人物名录不是 2317 人：${people.length}`);
assert(new Set(people.map(row => row.personId)).size === people.length, '人物读者包存在重复 personId');
assert(hashSortedLines(people.map(row => row.personId)) === '090b9e313851e2eb54875edb057825d8af3e839c1fd64f17bf1f8cf1c853a0f4', '人物稳定 ID 集合发生变化');
assert(people.every(row => !Object.prototype.hasOwnProperty.call(row, 'datasets')), '人物读者包仍泄露 datasets 来源标签');

const portraits = Object.values(portraitManifest?.assetsById || {});
const portraitBindings = portraits.map(row => `${row.portraitId}\0${row.personId}`);
assert(portraits.length === 275, `生产立绘不是 275 项：${portraits.length}`);
assert(new Set(portraits.map(row => row.portraitId)).size === portraits.length, '立绘 portraitId 不唯一');
assert(hashSortedLines(portraitBindings) === 'e51441f1bd0135fd70a488742d86c0c7f29bdebd33b410bd2e90babe2fddf833', '立绘与稳定 personId 映射发生变化');

/* 16 期地图与全量地图资产冻结。 */
const expectedMapIds = ['huangjin', 'shaodi', 'dongzhuo', 'xingping', 'jianbing', 'guandu', 'chibi', 'xiangfan', 'sanguo', 'beifa', 'guijin', 'hanwang', 'jinchu', 'taikang', 'hui_di', 'yongjia'];
assert((mapRegistry?.periods || []).map(row => row.id).join('|') === expectedMapIds.join('|'), '地图 16 期 ID 或顺序发生变化');
assert(sha256File('data/map-period-registry.json') === 'fe3894be8f88512a77431d3e2dc9b7242ca488b580e0341c306d97b8c04147a8', '地图时期注册表哈希发生变化');
const mapDigest = mapDirectoryDigest();
assert(mapDigest.files === 36 && mapDigest.bytes === 7_507_925, `地图资产文件数或字节数发生变化：${mapDigest.files}/${mapDigest.bytes}`);
assert(mapDigest.sha256 === 'c02967ffaf6e0e6b27c4f02119e6cfaf135d12e9930567a25e5f6d5448d50227', '地图资产聚合哈希发生变化');

/* 外观只能打开一个锚定浮层。 */
const appearancePopoverCount = (html.match(/<el-popover\b[^>]*v-model:visible="showTheme"/g) || []).length;
const appearanceDrawerCount = (html.match(/<el-drawer\b[^>]*v-model="showTheme"/g) || []).length;
assert(appearancePopoverCount === 1, `外观锚定浮层不是唯一实例：${appearancePopoverCount}`);
assert(appearanceDrawerCount === 0 && !html.includes('theme-drawer'), '旧外观抽屉仍残留在页面或样式契约中');

/* 职官谱语义 ID、中书台分列与武官分组。 */
const hanStart = html.indexOf('/* ---------------- 东汉官制 ---------------- */');
const hanEnd = html.indexOf('/* ---------------- 曹魏 ---------------- */', hanStart + 1);
const hanSection = hanStart >= 0 && hanEnd > hanStart ? html.slice(hanStart, hanEnd) : '';
assert(/O\('han_o',\s*null,\s*'皇帝'/.test(hanSection), '后汉根节点读者名未改为“皇帝”');
assert(!/O\('han_o',\s*null,\s*'东汉皇帝'/.test(hanSection), '后汉根节点仍显示“东汉皇帝”');
for (const [name, id, order] of [
  ['中书监', 'office:wei:zhongshu-jian', 10],
  ['中书令', 'office:wei:zhongshu-ling', 20],
  ['中书侍郎', 'office:wei:zhongshu-shilang', 30],
  ['通事郎', 'office:wei:tongshi-lang', 40],
]) {
  assert(html.includes(`name:'${name}'`) || html.includes(`'${name}', '中书门下'`), `曹魏中书台缺少${name}`);
  assert(html.includes(`entityId:'${id}'`) && html.includes(`courtOrder:${order}`), `${name}缺稳定语义 ID 或序位 ${order}`);
}
assert(/'中书监／中书令'[\s\S]{0,300}?hidden:true[\s\S]{0,160}?archived:true/.test(html), '旧中书监／中书令合并节点未隐藏归档');
const migrationStart = html.indexOf('/* V66_WEI_ZHONGSHU_MIGRATION_START */');
const migrationEnd = html.indexOf('/* V66_WEI_ZHONGSHU_MIGRATION_END */', migrationStart + 1);
assert(migrationStart >= 0 && migrationEnd > migrationStart, '缺少 V66 曹魏中书语义迁移边界');
if (migrationStart >= 0 && migrationEnd > migrationStart) {
  const migrationSource = html.slice(migrationStart, migrationEnd);
  const context = {
    O(prefix, parent, name, category, rank9, hanRank, extra = {}) {
      return Object.assign({ key: `${prefix}:generated`, kind: 'office', parent, name, category, rank9, hanRank, figures: [], legacyKeys: [] }, extra);
    },
  };
  vm.createContext(context);
  new vm.Script(`${migrationSource}\nthis.runMigration=migrateV66WeiZhongshuSemantics;`).runInContext(context);
  const fixture = { wei: { office: [
    { key: 'old-root', kind: 'root', name: '魏帝', figures: [] },
    { key: 'old-combined', kind: 'office', parent: 'old-root', name: '中书监／中书令', figures: [{ id: 'f1', personId: 'person:test:jia', name: '甲' }] },
    { key: 'old-shilang', kind: 'office', parent: 'old-combined', name: '中书侍郎', figures: [{ id: 'f2', personId: 'person:test:yi', name: '乙' }] },
  ] } };
  context.runMigration(fixture);
  const first = JSON.stringify(fixture);
  context.runMigration(fixture);
  assert(JSON.stringify(fixture) === first, '曹魏中书旧树迁移不幂等');
  const offices = fixture.wei.office;
  const semantic = offices.filter(node => /^office:wei:(?:zhongshu-(?:jian|ling|shilang)|tongshi-lang)$/.test(String(node.entityId || '')));
  assert(semantic.length === 4 && new Set(semantic.map(node => node.entityId)).size === 4, '旧树迁移未形成四个唯一中书语义节点');
  assert(semantic.map(node => `${node.name}:${node.courtOrder}:${node.parent}`).sort().join('|') === ['中书令:20:old-root','中书侍郎:30:old-root','中书监:10:old-root','通事郎:40:old-root'].sort().join('|'), '旧树迁移后的中书四官名称、序位或上级不正确');
  const legacy = offices.find(node => node.key === 'old-combined');
  assert(legacy?.hidden && legacy?.archived && legacy?.virtual && legacy.figures?.[0]?.personId === 'person:test:jia', '旧合并节点未隐藏保留或人物记录丢失');
  assert(offices.find(node => node.key === 'old-shilang')?.figures?.[0]?.personId === 'person:test:yi', '旧中书侍郎人物记录在迁移中丢失');
  assert(new Set(offices.map(node => node.key)).size === offices.length && offices.every(node => node.parent === undefined || offices.some(parent => parent.key === node.parent)), '旧树迁移后出现重复 key 或悬空 parent');
}
assert(html.includes('militaryGroupOrder') && html.includes('militaryClassOrder') && html.includes("branch==='military'?militaryGroupOrder:departmentOrder"), '各政权武官分组顺序未真正进入运行时排序');
assert(html.includes("if(value===null||value===undefined||value==='')return null"), '朝堂排序仍可能把空序位错误折算为 0');
assert(html.includes("const published=['确定','推定'].includes") && html.includes("officePublicationStatus:published?'verified':'review-only'") && html.includes("node.officePublicationStatus!=='verified'"), '武官制度节点的独立发布门禁未接入运行时');
const militaryOrderIndex = html.indexOf("const militaryOrder=explicitCourtOrder(node?.militaryClassOrder)");
const courtOrderIndex = html.indexOf("const courtOrder=explicitCourtOrder(node?.courtOrder)", militaryOrderIndex);
assert(militaryOrderIndex >= 0 && courtOrderIndex > militaryOrderIndex, '武官分类序位未优先于普通朝堂序位');
const generalTitles = runtime('data/general-titles.js', 'SGZ_GENERAL_TITLES');
const wuTitles = generalTitles?.groups?.find(row => row.polity === 'wu')?.titles || [];
assert(!wuTitles.some(row => row.title === '中领军／左右领军'), '孙吴仍保留合并的中领军／左右领军节点');
assert(['中领军', '左领军', '右领军'].every(name => wuTitles.some(row => row.title === name && row.evidence === '确定')), '孙吴中领军、左领军、右领军未分列并核定为可公开制度节点');
const wuLeaderMigrationStart = html.indexOf('/* V66_WU_LEADER_MIGRATION_START */');
const wuLeaderMigrationEnd = html.indexOf('/* V66_WU_LEADER_MIGRATION_END */', wuLeaderMigrationStart + 1);
assert(wuLeaderMigrationStart >= 0 && wuLeaderMigrationEnd > wuLeaderMigrationStart, '缺少 V66 孙吴领军语义迁移边界');
if (wuLeaderMigrationStart >= 0 && wuLeaderMigrationEnd > wuLeaderMigrationStart) {
  const migrationSource = html.slice(wuLeaderMigrationStart, wuLeaderMigrationEnd);
  let generated = 0;
  const context = {
    O(prefix, parent, name, category, rank9, hanRank, extra = {}) {
      generated += 1;
      return Object.assign({ key: `${prefix}:generated:${generated}`, kind: 'office', parent, name, category, rank9, hanRank, figures: [], legacyKeys: [] }, extra);
    },
    nextUniqueKey(prefix, occupied) {
      let key;
      do { generated += 1; key = `${prefix}:generated:${generated}`; } while (occupied.has(key));
      occupied.add(key);
      return key;
    },
  };
  vm.createContext(context);
  new vm.Script(`${migrationSource}\nthis.runMigration=migrateV66WuLeaderSemantics;`).runInContext(context);
  const fixture = { wu: { office: [
    { key: 'wu-root', kind: 'root', name: '吴帝', figures: [] },
    { key: 'wu-combined', kind: 'office', parent: 'wu-root', name: '中领军／左右领军', figures: [{ personId: 'person:test:legacy', name: '旧任官' }] },
    { key: 'wu-left', kind: 'office', parent: 'wu-root', name: '左领军', figures: [{ personId: 'person:test:left', name: '左任官' }] },
  ] } };
  context.runMigration(fixture);
  const first = JSON.stringify(fixture);
  context.runMigration(fixture);
  assert(JSON.stringify(fixture) === first, '孙吴领军旧树迁移不幂等');
  const offices = fixture.wu.office;
  const leaders = offices.filter(node => /^office:wu:(?:zhonglingjun|zuolingjun|youlingjun)$/.test(String(node.entityId || '')));
  assert(leaders.length === 3 && new Set(leaders.map(node => node.entityId)).size === 3, '孙吴旧树迁移未形成三个唯一领军语义节点');
  assert(leaders.map(node => `${node.name}:${node.courtOrder}:${node.militaryClass}:${node.officePublicationStatus}`).sort().join('|') === [
    '中领军:160:禁军:verified', '左领军:161:禁军:verified', '右领军:162:禁军:verified',
  ].sort().join('|'), '孙吴中、左、右领军的名称、禁军分组、顺序或制度发布状态不正确');
  const legacy = offices.find(node => node.key === 'wu-combined');
  assert(legacy?.hidden && legacy?.archived && legacy?.virtual && legacy.figures?.[0]?.personId === 'person:test:legacy', '孙吴旧合并节点未隐藏兼容或旧任官记录丢失');
  assert(offices.find(node => node.key === 'wu-left')?.figures?.[0]?.personId === 'person:test:left', '孙吴左领军既有人事记录在语义迁移中丢失');
  assert(new Set(offices.map(node => node.key)).size === offices.length, '孙吴领军旧树迁移后出现重复 key');
}
try {
  const freshTrees = initializeFreshOfficeTrees();
  const freshWuOffices = freshTrees?.wu?.office || [];
  const visibleLeaders = freshWuOffices
    .filter(node => ['中领军', '左领军', '右领军'].includes(String(node.name)) && !node.hidden && !node.archived && !node.virtual && node.officePublicationStatus === 'verified')
    .sort((left, right) => Number(left.militaryClassOrder) - Number(right.militaryClassOrder));
  assert(freshWuOffices.length > 210, `真实初始化仍停留在旧孙吴官署树：${freshWuOffices.length} 个节点`);
  assert(visibleLeaders.map(node => node.name).join('|') === '中领军|左领军|右领军', `真实初始化后的孙吴禁军未按中、左、右显示：${visibleLeaders.map(node => node.name).join('|') || '无'}`);
  assert(visibleLeaders.every(node => node.militaryClass === '禁军' && Number.isFinite(Number(node.militaryClassOrder))), '真实初始化后的孙吴三领军未完整进入禁军分组与运行时排序');
} catch (error) {
  failures.push(`孙吴官署真实初始化失败：${error.message}`);
}
assert(html.includes('const wuLeaderOffices = ['), '孙吴三领军未直接进入全新工程规范预设');
assert(html.includes('V66_POST_PATCH_NORMALIZATION'), '旧增量缓存应用后未再次执行 V66 语义迁移');
assert(html.includes("window.SGZ_READER_BUILD===true"), '读者包剥离 evidence 后缺少已发布名号的运行时边界');
const readerBundleRoot = fullPath('exports/观史台-读者版');
const readerHtmlPath = path.join(readerBundleRoot, 'index.html');
assert(fs.existsSync(readerHtmlPath), '缺少读者包 index.html，无法验证发布后孙吴三领军');
if (fs.existsSync(readerHtmlPath)) {
  try {
    const readerHtml = fs.readFileSync(readerHtmlPath, 'utf8');
    const readerTrees = initializeFreshOfficeTrees(readerHtml, readerBundleRoot, true);
    const readerWuOffices = readerTrees?.wu?.office || [];
    const readerLeaders = readerWuOffices
      .filter(node => ['中领军', '左领军', '右领军'].includes(String(node.name)) && !node.hidden && !node.archived && !node.virtual && node.officePublicationStatus === 'verified')
      .sort((left, right) => Number(left.militaryClassOrder) - Number(right.militaryClassOrder));
    assert(readerLeaders.map(node => node.name).join('|') === '中领军|左领军|右领军', `读者构建后的孙吴禁军未按中、左、右显示：${readerLeaders.map(node => node.name).join('|') || '无'}`);
  } catch (error) {
    failures.push(`孙吴官署读者构建初始化失败：${error.message}`);
  }
}
for (const text of ['全部时期 · 官署沿革全期 · 府署', '太子置于皇帝之下', '公位与中央官职按文官、武官分列', '同一官位只占一个位置', '点击开府官位进入府属']) {
  assert(!html.includes(text), `实施要求文案仍被当作读者内容显示：${text}`);
}

/* 曹魏 525 条读者封爵事件的分期与节点处置。 */
const expectedPeerageNodeIds = [
  'peerage:wei:rank:wang', 'peerage:wei:rank:gong', 'peerage:wei:rank:hou',
  'peerage:wei:rank:bo', 'peerage:wei:rank:zi', 'peerage:wei:rank:nan',
  'peerage:wei:rank:hou:xian', 'peerage:wei:rank:hou:xiang', 'peerage:wei:rank:hou:ting',
  'peerage:wei:rank:hou:guannei', 'peerage:wei:rank:hou:guanzhong',
  'peerage:wei:rank:hou:minghao', 'peerage:wei:rank:hou:unspecified',
];
const peerageEvents = peerage?.events || [];
assert(peerage?.schemaVersion === 'V66' && peerage?.modelId === 'sgz-v66-wei-peerage-stages', '曹魏爵制 V66 台账版本或 modelId 不正确');
assert(peerageEvents.length === 525 && peerage?.summary?.closedEvents === 525, `曹魏爵制台账未闭合 525 条：${peerageEvents.length}`);
assert(new Set(peerageEvents.map(row => row.eventId)).size === 525, '曹魏爵制台账 eventId 不唯一');
assert((peerage?.nodes || []).map(row => row.nodeId).join('|') === expectedPeerageNodeIds.join('|'), '曹魏爵制 13 个语义节点不完整或顺序错误');
const peerageDispositionTotal = Object.values(peerage?.summary?.dispositionCounts || {}).reduce((total, value) => total + Number(value || 0), 0);
assert(peerageDispositionTotal === 525, `曹魏爵制处置分类未闭合 525 条：${peerageDispositionTotal}`);
assert(peerageEvents.every(row => row.disposition && row.searchState === 'complete' && Array.isArray(row.rankStages) && Array.isArray(row.titleStages) && (row.disposition === 'linked' || row.reason)), '存在缺处置、检索状态、未关联理由或阶段数组的封爵事件');
assert(peerageEvents.filter(row => row.disposition === 'linked').every(row => row.peerageNodeIds?.length > 0 && row.publicationStatus === 'verified'), '已关联封爵事件缺语义节点或未标记为已核');
assert(peerageEvents.filter(row => row.disposition !== 'linked').every(row => row.publicationStatus === 'review-only' && !row.peerageNodeId), '未确定封爵事件被错误关联到读者爵位节点');
assert(peerage?.summary?.linkedEvents === 194 && peerage?.summary?.linkedPeople === 166, '曹魏本朝已关联事件／人物统计不是 194／166');
const peerage431 = peerageEvents.find(row => row.eventId === 'peerage:431');
assert(peerage431?.disposition === 'stage-misaligned' && peerage431?.publicationStatus === 'review-only' && peerage431?.peerageNodeIds?.length === 0, 'peerage:431 阶段错位仍被公开关联');
const peerage239 = peerageEvents.find(row => row.eventId === 'peerage:239');
assert(peerage239?.rankStages?.filter(stage => stage.publicationStatus === 'verified').map(stage => `${stage.year}:${stage.title}:${stage.rankLevel}`).join('|') === '221:齐公:公|222:平原王:王', '曹叡齐公、平原王分期未正确进入曹魏爵制');
assert(html.includes('peoplePrimaryPeerageTimeline') && html.includes('返回爵制节点') && html.includes("stage.publicationStatus!=='review-only'"), '人物封爵时间线未按 V66 已核阶段投影或缺少爵制节点返链');
assert(peerageEvents.every(row => row.rankStages.every(stage => stage.peeragePhase !== 'wei-xianxi-five-rank' || stage.rankLevel !== '侯' || !stage.peerageNodeId || stage.peerageNodeId === 'peerage:wei:rank:hou')), '咸熙五等侯被错误归入列侯子类型');
const v61Peerage = json('data/v61-person-supplements.json')?.peerageEvents?.filter(row => row.readerVisible) || [];
assert(v61Peerage.length === 525 && v61Peerage.reduce((total, row) => total + row.recipientPersonIds.length, 0) === 542 && new Set(v61Peerage.flatMap(row => row.recipientPersonIds)).size === 374, '封爵原有 525 事件／542 人次／374 人关系发生缩水');

/* 人物前台只保留统一名录，旧 dataset 参数自然忽略。 */
assert(html.includes('personRegistry') && !html.includes('V60 全量人物') && !html.includes('260 年人物纪') && !html.includes('曹魏封爵人物'), '人物记仍把后台来源拆成前台专题卡');
assert(!html.includes('peopleDataset') && !/\b(?:get|set|delete)\(['"]dataset['"]\)/.test(html), '人物记仍保留 dataset 筛选状态或 URL 契约');
assert(/peopleView==='snapshot'[^>]*>时期官署</.test(html) && !/peopleView==='snapshot'[^>]*>快照</.test(html), '人物记的原“快照”视图未改名为“时期官署”');

/* 533 条州镇的分期治所处置与纯净读者投影。 */
const seatRows = rowsOf(seatAudit);
const readerFangzhenRows = rowsOf(fangzhenReader);
const seatPeriodsRows = rowsOf(seatPeriods).length ? rowsOf(seatPeriods) : (seatPeriods?.periods || []);
assert(seatAudit?.schemaVersion === 'V66', '州镇治所审校台账 schemaVersion 不是 V66');
assert(seatRows.length === 533, `州镇治所处置不是 533 条：${seatRows.length}`);
assert(new Set(seatRows.map(row => row.recordId)).size === 533, '州镇治所处置 recordId 不唯一');
assert(seatRows.every(row => ['reader-visible', 'review-only'].includes(row.publicationStatus)), '州镇治所台账存在未处置的发布状态');
const upstreamReaderIds = new Set(rowsOf(v65FangzhenAudit)
  .filter(row => row.readerVisible === true && row.publicationStatus === 'reader-visible')
  .map(row => row.recordId));
const recordReaderRows = seatRows.filter(row => row.readerVisible === true && row.publicationStatus === 'reader-visible');
const publicSeatRows = seatRows.filter(row => row.seatReaderVisible === true && row.seatPublicationStatus === 'reader-visible');
assert(upstreamReaderIds.size === 45 && recordReaderRows.length === 45, '州镇任职读者门禁没有继承 V65 的 45 条记录');
assert(recordReaderRows.every(row => upstreamReaderIds.has(row.recordId)), 'V66 州镇任职读者 ID 与 V65 门禁不一致');
assert(publicSeatRows.length === 27, `V66 已核治所公开数不是 27 条：${publicSeatRows.length}`);
assert(publicSeatRows.every(row => {
  const resolution = row.seatResolution || row.resolution || row;
  const sources = resolution.sources || [];
  const sourceComplete = sources.length > 0 && sources.every(source => source.sourceLocator && source.sourceExcerpt && source.sourceUrl);
  return seatOf(row) && sourceComplete && resolution.validFromYear !== undefined && resolution.validToYear !== undefined;
}), '读者可见治所缺名称、来源定位、摘录或有效年代');
assert(recordReaderRows.filter(row => !row.seatReaderVisible).length === 18, '已公开任职但未公开治所的记录不是 18 条');
const v62JinSeatRows = seatRows.filter(row => row.dataset === 'v62-jin-primary' || row.sourceDataset === 'v62-jin-primary');
assert(v62JinSeatRows.length === 29, `V62 西晋州镇治所处置不是 29 条：${v62JinSeatRows.length}`);
assert(v62JinSeatRows.every(row => row.readerVisible) && v62JinSeatRows.filter(row => row.seatReaderVisible).length === 25 && v62JinSeatRows.filter(row => !row.seatReaderVisible).length === 4, '西晋 29 条任职未完整公开或治所未按 25 已核／4 暂缓闭合');
for (const recordId of ['fz-v62-jin-gaoguang-youzhou','fz-v62-jin-qianhong-liangzhou','fz-v62-jin-taokan-jingzhou','fz-v62-jin-zhangguang-liangzhou']) {
  assert(v62JinSeatRows.some(row => row.recordId === recordId && row.readerVisible && !row.seatReaderVisible && !seatOf(row)), `应隐藏治所但保留任职的西晋记录处置错误：${recordId}`);
}
assert(seatPeriods?.schemaVersion === 'V66' && seatPeriodsRows.length > 0, '缺少 V66 分期行政治所规范表');
assert(seatPeriodsRows.every(row => (row.administrativeUnitId || row.unitId) && seatOf(row) && (row.validFromYear !== undefined || row.validFrom !== undefined || row.startYear !== undefined) && (row.validToYear !== undefined || row.validTo !== undefined || row.endYear !== undefined)), '分期行政治所规范表缺稳定行政区 ID、治所或有效年代');
const readerFangzhenIds = new Set(readerFangzhenRows.map(row => row.id));
assert(fangzhenReader?.schemaVersion === 'V66-reader' && readerFangzhenRows.length === 45 && readerFangzhenIds.size === 45, '州镇读者投影不是 V65 门禁的 45 条唯一任职记录');
assert([...upstreamReaderIds].every(id => readerFangzhenIds.has(id)), '州镇读者投影与 V65 reader-visible ID 集合不一致');
const readerPolityCounts = readerFangzhenRows.reduce((counts, row) => ({ ...counts, [row.polity]: (counts[row.polity] || 0) + 1 }), {});
assert(readerPolityCounts['魏'] === 1 && readerPolityCounts['汉'] === 11 && readerPolityCounts['吴'] === 1 && readerPolityCounts['晋'] === 32, `州镇读者政权数量错误：${JSON.stringify(readerPolityCounts)}`);
const readerSeatRows = readerFangzhenRows.filter(row => seatOf(row));
assert(readerSeatRows.length === 27 && readerSeatRows.every(row => publicSeatRows.some(audit => audit.recordId === row.id)), '州镇读者投影已核治所不是 27 条或 ID 不闭合');
const seatFieldKeys = ['seat','seatName','seatType','seatPeriodId','administrativeUnitId','seatValidFromYear','seatValidToYear'];
assert(readerFangzhenRows.every(row => {
  const present = seatFieldKeys.filter(key => row[key] !== undefined);
  return row.id && (present.length === 0 || present.length === seatFieldKeys.length)
    && !Object.keys(row).some(key => /^(?:source|audit|review|publication)/i.test(key));
}), '州镇读者投影治所字段不是全有或全无，或泄露审校来源字段');
assert(!seatOf(readerFangzhenRows.find(row => row.id === 'fz_wei_cishi_5_0')) && !seatOf(readerFangzhenRows.find(row => row.id === 'fz_han_liuyan')), '邹岐或刘焉被错误附加未核治所');
assert(seatOf(readerFangzhenRows.find(row => row.id === 'fz_han_lvbu_yan')) && seatOf(readerFangzhenRows.find(row => row.id === 'fz_shu_lihui')), '吕布或李恢的已核治所未进入读者投影');
assert(!JSON.stringify(fangzhenReader || {}).includes('治所未详') && !html.includes('治所未详') && !html.includes('审校记录未发布'), '读者州镇页仍会显示治所占位文案');

/* 战事纪：84 条规范源、62 条去重读者编年记录。 */
const battles = runtime('data/battle-records.js', 'SGZ_BATTLE_RECORDS');
const canonicalBattleCount = (battles?.events?.length || 0) + (battles?.battles?.length || 0) + (battles?.battlefields?.length || 0);
const linkedBattleIds = new Set((battles?.events || []).map(row => row.battleId).filter(Boolean));
const battleReaderRows = [...(battles?.events || []), ...(battles?.battles || []).filter(row => !linkedBattleIds.has(row.id)), ...(battles?.battlefields || [])];
assert(sha256File('data/battle-records.js') === 'abab07b9be3b611095d2f59936d3101541aad89f3e84411da2dacdce776e2e05', '战事规范源哈希发生变化');
assert(canonicalBattleCount === 84, `战事规范源不是 84 条：${canonicalBattleCount}`);
assert(battleReaderRows.length === 62 && new Set(battleReaderRows.map(row => row.id)).size === 62, `战事读者去重集不是 62 条唯一记录：${battleReaderRows.length}`);
assert(hashSortedLines(battleReaderRows.map(row => row.id)) === '723c4d4a4a006d920240f48dc85208706beaf889872c6b5f47e4ef9b9cf3e9fb', '战事读者稳定 ID 集合发生变化');
const battleLogicStart = html.indexOf('const battleEntryList = computed');
const battleLogicEnd = html.indexOf('function officeClassOf', battleLogicStart + 1);
const battleLogic = battleLogicStart >= 0 && battleLogicEnd > battleLogicStart ? html.slice(battleLogicStart, battleLogicEnd) : '';
const battleTemplateStart = html.indexOf('<main v-if="activeModule===\'battle\'"');
const battleTemplateEnd = html.indexOf('<main v-if="activeModule===\'fangzhen\'"', battleTemplateStart + 1);
const battleTemplate = battleTemplateStart >= 0 && battleTemplateEnd > battleTemplateStart ? html.slice(battleTemplateStart, battleTemplateEnd) : '';
assert(battleLogic.includes('BATTLE_ERA_ANCHORS') && battleLogic.includes('battleChronologyRows') && battleTemplate.includes('battle-chronology-list'), '战事纪 V66 单根编年导线或三个时代锚点未接入');
assert(!/battle(?:BranchGroups|CampaignGroups|ProvinceGroups|PeriodId|Density|View|Query)/.test(battleLogic + battleTemplate), '战事纪仍保留类别／交战关系／时期／局部密度等旧控件');
assert(!/battleRelationChain|按交战方|按战役链|全部交战关系|伪战役链|前因|后续/.test(battleLogic + battleTemplate), '战事读者投影仍含字符串推断的交战关系、战役链或因果');
assert(!html.includes('battleRelatedPeople'), '战事详情仍按摘要字符串推测关联人物');
assert(html.includes("params.set('id',activeBattleDetail.value.id)") && /p\.get\('id'\)/.test(html), '战事详情未使用稳定战事 ID 写入／恢复 URL');
assert(html.includes('上一条 ·') && html.includes('下一条 ·'), '战事详情缺中性上一条／下一条导航');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, version: 'V66', failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    version: 'V66',
    people: people.length,
    portraits: portraits.length,
    map: { periods: mapRegistry.periods.length, files: mapDigest.files, bytes: mapDigest.bytes },
    peerage: { events: peerageEvents.length, nodes: peerage.nodes.length },
    fangzhen: { audit: seatRows.length, reader: readerFangzhenRows.length },
    battle: { canonical: canonicalBattleCount, reader: battleReaderRows.length },
  }, null, 2));
}
