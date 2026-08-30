import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const sha256 = relative => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

const workbook = readJson('data/v60-person-workbook-import.json');
const sourceIndex = readJson('data/person-source-index.json');
const ledger = readJson('data/v60-research-ledger.json');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const handoff = readJson('data/v60-figma-handoff.json');
const identityContext = { console };
identityContext.window = identityContext;
vm.createContext(identityContext);
vm.runInContext(fs.readFileSync(path.join(root, 'data/person-identities.js'), 'utf8'), identityContext, { filename: 'data/person-identities.js' });
const canonicalSourcePersonIds = new Set(sourceIndex.people.map(person => identityContext.SGZ_PERSON_IDENTITIES.resolve(person.name, { ...person, personId: person.personId })?.personId || identityContext.SGZ_PERSON_IDENTITIES.canonicalPersonId(person.personId)));

assert(workbook.workbook.sha256 === '3a124ac79d434eb6b60d9cde1af7b6085cfe3edc79da838875c484af73182101', '工作簿哈希与登记值不一致');
assert(workbook.workbook.sheets?.人物總表?.rows === 1196, '人物總表不是 1196 条数据记录');
assert(workbook.workbook.sheets?.来源索引?.rows === 1223, '来源索引不是 1223 条数据记录');
assert(workbook.people.length === 1196, '导入人物候选数量不等于 1196');
const workbookPersonIds = new Set(workbook.people.map(person => person.personId));
assert(workbookPersonIds.size === 1192 && workbook.summary.uniquePersonEntities === 1192 && workbook.summary.mergedDuplicateRows === 4, '1196 条来源记录未正确归并为 1192 个稳定人物实体');
const mergedPersonGroups = new Map();
for (const person of workbook.people) {
  const rows = mergedPersonGroups.get(person.personId) || [];
  rows.push(person);
  mergedPersonGroups.set(person.personId, rows);
}
assert([...mergedPersonGroups.values()].filter(rows => rows.length > 1).every(rows => new Set(rows.map(person => person.normalizedName)).size === 1 && rows.every(person => /异体／重复行已归并/.test(person.homonymStatus))), '重复 personId 跨人物冲突或缺少归并说明');
assert(workbook.people.every(person => ['确定', '推定', '存疑', '争议', '明确无候选', '排除'].includes(person.researchDisposition)), '工作簿 researchDisposition 超出有限状态');
assert(sourceIndex.people.filter(person => person.includeInDefault === true).length === 123, '默认人物档案不再是 123 人');
assert(sourceIndex.people.length === 509 && sourceIndex.appointments.length === 766, '既有人物或任官数量发生变化');
assert(workbook.people.filter(person => person.readerEligibility === 'eligible').every(person => canonicalSourcePersonIds.has(person.personId)), '存在未完成核验却标记为 reader eligible 的新增人物');
assert(workbook.summary.linkedExistingPeople === 130 && workbook.summary.auditOnlyPeople === 1066 && workbook.summary.linkedExistingPeople + workbook.summary.auditOnlyPeople === 1196, '规范身份归并后的 130／1066 人物分层未闭合');

const modelContext = { console };
modelContext.window = modelContext;
vm.createContext(modelContext);
vm.runInContext(fs.readFileSync(path.join(root, 'data/research-model.js'), 'utf8'), modelContext, { filename: 'data/research-model.js' });
const projected = modelContext.SGZResearchModel.projectForReader({
  name: '测试人物', sourceLocator: '《晋书》卷17', evidence: { sourceLevel: '一手史料' }, archiveKind: '扩展',
  readerSummary: '简短摘要', readerEligibility: 'audit-only', workbookSource: { row: 2 }, officeRaw: '待考',
  nested: { sourceDocument: 'source', value: '保留' }
});
assert(projected.name === '测试人物' && projected.value === undefined && projected.nested.value === '保留', '读者投影未保留普通事实字段');
assert(!('sourceLocator' in projected) && !('evidence' in projected) && !('archiveKind' in projected) && !('readerEligibility' in projected), '读者投影泄露审校字段');

const epigraphicContext = { console };
epigraphicContext.window = epigraphicContext;
vm.createContext(epigraphicContext);
for (const relative of ['data/epigraphic-records.js', 'data/epigraphic-v46-jin.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), epigraphicContext, { filename: relative });
}
const epigraphic = [...(epigraphicContext.SGZ_EPIGRAPHIC_RECORDS?.records || []), ...(epigraphicContext.SGZ_EPIGRAPHIC_V46_JIN?.records || [])];
const epigraphicIds = new Set(epigraphic.map(record => record.id));
assert(epigraphic.length === 188 && epigraphicIds.size === 188, '金石运行时记录不是 188 条稳定 ID');
assert(ledger.epigraphy.length === 142, 'V60 金石缺释文台账不是 142 条');
assert(ledger.epigraphy.every(record => record.finalReview?.status === '已收口' && record.searchScope?.length && record.externalSearchLog?.length && record.sourceVerification?.result && record.finalReview?.reason), '存在缺少检索范围、日志或结论的金石记录');
assert(ledger.summary.epigraphicNewCandidatesAdopted === 0, '未经核验的新金石候选进入了读者数据');
assert(ledger.v59Closures.length === 3 && ledger.volumeClosures.length === 6, 'V59 队列或六卷复核未闭环');
assert([...ledger.v59Closures, ...ledger.legacyClosures, ...ledger.volumeClosures].every(item => item.sources?.length && item.sourceLocator && item.finalReview?.researchDisposition), '旧待考闭环缺少来源或结论');
assert(ledger.researchQueue.some(item => item.id === 'v60:general-title' && item.count === 154), '154 条待考将军名号未保留在审校台账');

assert(html.includes('./data/v60-person-workbook-import.js') && html.includes('./data/v60-research-ledger.js'), 'V60 运行时数据未挂入页面');
assert(html.includes('const projectForReader') && html.includes("v-if=\"workspaceMode==='review'\""), '读者投影或审校模式门禁未接入页面');
assert(sha256('data/map-period-registry.json') === 'fe3894be8f88512a77431d3e2dc9b7242ca488b580e0341c306d97b8c04147a8', '地图时期注册表发生变化');
assert(sha256('assets/map/data/All_Provinces.json') === 'd146462ff2143a5351acb9bf6171950b874e8cac66a0d455a5aaf7579b13af3e', '地图几何数据发生变化');

assert(handoff.status === 'pending' && handoff.fileKey === 'gvWRC5GHHSgd8QX9b2VJgo', 'Figma 未写入时未保持 pending 或文件映射错误');
assert(handoff.portraits?.length === 20 && handoff.portraits.every(item => item.interfaceOnly === true && item.personId && item.designStatus === 'figma-design'), 'Figma 20 个立绘映射不完整');
assert(handoff.portraits.every(item => !item.nodeId), 'Figma pending 映射包伪造了节点 ID');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, workbookPeople: workbook.people.length, sourceRows: workbook.workbook.sheets.来源索引.rows, defaultPeople: 123, appointments: 766, epigraphicRecords: epigraphic.length, missingInscription: ledger.epigraphy.length, v59Closures: ledger.v59Closures.length, booksClosed: ledger.volumeClosures.length, figma: handoff.status }, null, 2));
}
