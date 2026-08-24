import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(decodeURIComponent(new URL('..', import.meta.url).pathname));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(`V46 校验失败：${message}`); };

function loadGlobal(file, name) {
  const context = { window: {} };
  vm.runInNewContext(read(file), context, { filename: file });
  return context.window[name];
}

const manifest = json('data/portrait-manifest.json');
const sourceIndex = loadGlobal('data/person-source-index.js', 'SGZ_PERSON_SOURCE_INDEX');
const defaultIds = manifest.defaultPersonIds || [];
const expectedDefaultPeople = manifest.schemaVersion >= 2 ? sourceIndex.people.filter(person => person.includeInDefault === true).length : 192;
assert(defaultIds.length === expectedDefaultPeople, `默认人物数量应与当前规范源一致，期望 ${expectedDefaultPeople} 人，实际 ${defaultIds.length}`);
assert(new Set(defaultIds).size === defaultIds.length, '默认人物 personId 重复');
assert(defaultIds.every(id => manifest.byPersonId?.[id]), '存在没有立绘索引的默认 personId');
assert(manifest.fallbackSrc.includes('person-placeholder-v46'), '缺少 V46 界面识别占位图');
assert(manifest.byName?.['邓艾']?.src.endsWith('deng-ai-v2.png'), '邓艾未接入 deng-ai-v2');
assert(Object.values(manifest.byPersonId).every(item => item.personId && item.src && item.interfaceOnly === true), '立绘索引缺稳定 ID 或界面识别声明');

const defaultSourceIds = sourceIndex.people.filter(person => person.includeInDefault === true).map(person => person.personId);
assert(defaultSourceIds.length === expectedDefaultPeople, `来源索引默认人物应为 ${expectedDefaultPeople} 人，实际 ${defaultSourceIds.length}`);
assert(sourceIndex.appointments.filter(record => record.includeInDefault === true).every(record => defaultSourceIds.includes(record.personId)), '默认任官记录指向非默认人物');

const audit = json('data/v46-jinshi-audit.json');
assert(audit.sourceHash && /^[a-f0-9]{64}$/.test(audit.sourceHash), '金石录源文件哈希缺失');
assert(audit.paragraphCount === 2050, `金石录段落数异常：${audit.paragraphCount}`);
assert(audit.strikeParagraphCount === 31, `删除线段落应为 31，实际 ${audit.strikeParagraphCount}`);
assert(audit.strikeCharCount === 778, `删除线字符应为 778，实际 ${audit.strikeCharCount}`);
assert(audit.output.recordCount > 0 && audit.output.coreCount > 0 && audit.output.extendedCount > 0, '晋金石记录核心／扩展层为空');
const jin = loadGlobal('data/epigraphic-v46-jin.js', 'SGZ_EPIGRAPHIC_V46_JIN');
assert(jin.sourceAudit.sourceHash === audit.sourceHash, '运行时金石记录源哈希与审计不一致');
assert(jin.records.length === audit.output.recordCount, '运行时金石记录数与审计不一致');
assert(jin.records.every(record => record.sourceHash === audit.sourceHash), '金石记录存在错误源哈希');
assert(!jin.records.some(record => /鲁诠|张永昌|郗氏|伪刻|伪碑|疑伪|后赵张宾|魏雏碑|吴故征北/.test(JSON.stringify(record))), '删除线或非晋材料进入运行时记录');
assert(jin.records.some(record => record.inscription), '新增金石记录没有释文');

const administrative = loadGlobal('data/administrative-index.js', 'SGZ_ADMINISTRATIVE_INDEX');
assert(administrative.states.length >= 18 && administrative.commanderies.length >= 15, '行政区划索引覆盖不足');
const indexHtml = read('index.html');
const tableStart = indexHtml.indexOf('fangzhen-desktop-table') >= 0 ? indexHtml.indexOf('fangzhen-desktop-table') : indexHtml.indexOf('<div class="fangzhen-table-card">');
const tableEnd = indexHtml.indexOf('</el-table>', tableStart);
const stateTable = indexHtml.slice(tableStart, tableEnd);
assert(tableStart >= 0 && tableEnd > tableStart, '州镇主表未找到');
assert(!stateTable.includes('scope.row.birthplace') && !stateTable.includes('沿革说明') && !stateTable.includes('任命性质'), '州镇主表仍显示被移除的史料字段');
assert(indexHtml.includes('administrativeSearchText') && (indexHtml.includes('州郡、治所、别名') || indexHtml.includes('administrative-index.js')), '州镇行政检索未接入');
assert(indexHtml.includes('SGZ_EPIGRAPHIC_V46_JIN?.records'), '两晋金石运行时数据未接入主页面');
assert(indexHtml.includes('map-hierarchy-status'), '地图层级状态提示未接入');

for (const file of ['assets/map/js/app.js', 'assets/map/js/territories.js', 'assets/map/js/commanderies.js', 'assets/map/js/wu-commanderies.js', 'assets/map/js/counties.js']) {
  const source = read(file);
  assert(source.includes('setHierarchyLevel'), `${file} 缺少层级切换接口`);
}
assert(read('assets/map/js/app.js').includes('hierarchyLevelForZoom'), '地图缺少缩放级别层级计算');
assert(indexHtml.includes('sgz-map-hierarchy') && indexHtml.includes("level==='commandery'"), '地图州色／郡浅色层级样式未接入');

const portable = read('exports/三国职官谱-单文件版.html');
assert(portable.includes('SGZ_PERSON_PORTRAIT_MANIFEST'), '便携版未内嵌立绘索引');
assert(portable.includes('SGZ_EPIGRAPHIC_V46_JIN'), '便携版未内嵌 V46 晋金石记录');
assert(portable.includes('SGZ_ADMINISTRATIVE_INDEX'), '便携版未内嵌行政检索索引');
assert(portable.includes('hierarchyLevelForZoom'), '便携版未内嵌地图层级逻辑');

console.log(JSON.stringify({
  version: 'V46',
  portraits: { defaultPeople: defaultIds.length, indexed: Object.keys(manifest.byPersonId).length, fallback: manifest.summary?.fallbackPortraits ?? null },
  jinshi: audit.output,
  strikeAudit: { paragraphs: audit.strikeParagraphCount, chars: audit.strikeCharCount },
  administrative: { states: administrative.states.length, commanderies: administrative.commanderies.length },
  portable: 'ok',
}));
