import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const sha256 = relative => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

const v60 = json('data/v60-person-workbook-import.json');
const supplement = json('data/v61-person-supplements.json');
const epigraphy = json('data/v61-epigraphy-research.json');
const transcriptions = json('data/v61-epigraphy-transcriptions.json');
const sourceIndex = json('data/person-source-index.json');
const nameNormalization = json('data/person-name-normalization.json');
const html = read('index.html');
const css = read('assets/ui/v61.css');

assert(v60.workbook.sha256 === '3a124ac79d434eb6b60d9cde1af7b6085cfe3edc79da838875c484af73182101', 'V60 工作簿哈希不一致');
assert(v60.people.length === 1196 && v60.workbook.sheets?.人物總表?.rows === 1196 && v60.workbook.sheets?.来源索引?.rows === 1223, 'V60 1196／1223 行未闭合');
assert(v60.people.every(person => person.readerVisible === true), '存在未进入人物记的 V60 人物');
assert(new Set(v60.people.map(person => person.personId)).size === 1192 && v60.summary.mergedDuplicateRows === 4, 'V60 1196 条来源记录未归并为 1192 个稳定人物实体');
assert(sourceIndex.people.length === 509 && sourceIndex.appointments.length === 766, '既有活动源人物或任官数量改变');
assert(sourceIndex.people.filter(person => person.includeInDefault === true).length === 123, '精选档案不再是 123 人');

assert(nameNormalization.source?.sha256 === '737c21c66f55a419dd6956cb3089476cdefc5a36877452631617696df1e5d925', '姓名规范表来源哈希不一致');
assert(Array.from(nameNormalization.traditional).length === 394 && Array.from(nameNormalization.simplified).length === 394, '姓名规范表不是 394 组等长映射');
assert(JSON.stringify(nameNormalization.policy?.preservedAmbiguous) === JSON.stringify(['乾', '氾', '麴']), '一对多姓名字符未保持人工消歧边界');
const normalizationContext = { console };
normalizationContext.window = normalizationContext;
vm.createContext(normalizationContext);
vm.runInContext(read('data/person-name-normalization.js'), normalizationContext, { filename: 'data/person-name-normalization.js' });
vm.runInContext(read('data/person-identities.js'), normalizationContext, { filename: 'data/person-identities.js' });
assert(normalizationContext.SGZ_PERSON_NAME_NORMALIZATION.toSimplified('劉協 賈詡 陳騫 鍾繇 乾 氾 麴') === '刘协 贾诩 陈骞 钟繇 乾 氾 麴', '代表性姓名繁简归一结果错误');
assert(normalizationContext.SGZ_PERSON_IDENTITIES.resolve('劉備')?.personId === 'person:shu:liu-bei', '繁体别名未解析到既有稳定人物 ID');
assert(normalizationContext.SGZ_PERSON_IDENTITIES.canonicalPersonId('person:wei:1gry14g') === 'person:snapshot260:3e5f85f692368a6c' && normalizationContext.SGZ_PERSON_IDENTITIES.canonicalPersonId('person:wu:1rfsm7h') === 'person:snapshot260:d74daeb7bdfa21af' && normalizationContext.SGZ_PERSON_IDENTITIES.canonicalPersonId('person:han:1s4pu5j') === 'person:snapshot260:271aa92317b30c95', '王浑、左思或李骧的既有运行时档案未归入可消歧的快照人物');
const v60ByNormalizedName = new Map(v60.people.map(person => [person.normalizedName, person]));
assert(v60ByNormalizedName.get('刘备')?.personId === 'person:shu:liu-bei' && v60ByNormalizedName.get('贾诩')?.personId === 'person:wei:jia-xu' && v60ByNormalizedName.get('陈骞')?.personId === 'person:jin:chen-qian' && v60ByNormalizedName.get('钟繇')?.personId === 'person:wei:zhong-yao', '代表性导入人物未复用稳定 ID');
assert(v60.people.some(person => person.normalizedName === '刘协') && !v60.people.some(person => person.normalizedName === '劉協'), '刘协仍存在繁简分裂');

assert(supplement.workbooks.snapshot260.sha256 === '45b86f9ea4654dbb97e1822f2aeb2e767daf89a5504f2a02c5f82620623e2425', '260 年工作簿哈希不一致');
assert(supplement.summary.snapshotRows === 823 && supplement.summary.snapshotNamedRows === 821, '260 年 823／821 行未闭合');
assert(supplement.snapshots260.length === 823 && supplement.snapshotRowAudit.length === 823, '260 年快照或行审计不是 823 条');
assert(supplement.summary.snapshotVisibleRows + supplement.summary.snapshotAuditRows + supplement.summary.snapshotExcludedRows === 823, '260 年处置数量未闭合');
assert(supplement.snapshots260.filter(row => row.readerVisible).every(row => row.personId && row.name), '读者可见 260 年快照缺人物 ID 或姓名');
assert(supplement.snapshots260.filter(row => !row.readerVisible).every(row => row.disposition !== '采用'), '260 年非采用行进入读者态');
assert(!/["'](?:特技|关系|头像)["']\s*:/.test(JSON.stringify(supplement.snapshots260)), '260 年快照混入特技、关系或头像字段');
assert(!('appointments' in supplement), '260 年官职被写成正式任官模型');
assert(!supplement.people.some(person => ['王族', '外族', '景耀三年', '荀（岳）寓'].includes(person.name)), '非人物或复合歧义项建立了读者人物实体');

assert(supplement.workbooks.peerage.sha256 === 'dc1c18bca414e22ba6a01524ea081ff3b13c0aef8d98dbc6784ffa841f536b36', '曹魏封爵工作簿哈希不一致');
assert(supplement.summary.peerageRows === 590 && supplement.summary.peerageSourceRecordIds === 589 && supplement.summary.peerageMissingRecordIds === 1, '封爵 590／589＋1 行未闭合');
assert(supplement.peerageEvents.length === 590 && supplement.peerageRowAudit.length === 590, '封爵事件或行审计不是 590 条');
assert(supplement.summary.peerageVisibleEvents + supplement.summary.peerageAuditRows + supplement.summary.peerageExcludedRows === 590, '封爵处置数量未闭合');
assert(supplement.summary.peerageVisibleEvents === 525 && supplement.summary.peerageAuditRows === 52 && supplement.summary.peerageExcludedRows === 13 && supplement.summary.peerageLinkedPeople === 374, '封爵 525／52／13 处置或 374 人关联数量漂移');
assert(new Set(supplement.peerageEvents.map(event => event.eventId)).size === 590, '封爵 eventId 不唯一');
assert(supplement.peerageEvents.filter(event => event.readerVisible).every(event => event.recipientPersonIds.length > 0), '读者可见封爵事件存在匿名或群体受封者');
const supplementPersonIds = new Set(supplement.people.map(person => person.personId));
assert(supplement.peerageEvents.flatMap(event => event.recipientPersonIds).every(personId => supplementPersonIds.has(personId)), '封爵事件存在悬空人物 ID');
assert(!('kaifuPolicies' in supplement) && !('residences' in supplement), '封爵记录自动推导了开府或府署');
assert(supplement.peerageEvents.some(event => event.rawRecipient === '甄𩏧' && event.readerVisible), '扩展汉字具名受封者被错误排除');

const baseContext = { console };
baseContext.window = baseContext;
vm.createContext(baseContext);
for (const relative of ['data/epigraphic-records.js', 'data/epigraphic-v46-jin.js']) vm.runInContext(read(relative), baseContext, { filename: relative });
const baseEpigraphy = [...(baseContext.SGZ_EPIGRAPHIC_RECORDS?.records || []), ...(baseContext.SGZ_EPIGRAPHIC_V46_JIN?.records || [])];
const baseIds = new Set(baseEpigraphy.map(record => record.id));
const blankIds = new Set(baseEpigraphy.filter(record => !String(record.inscription || '').trim()).map(record => record.id));
assert(baseEpigraphy.length === 188 && baseIds.size === 188, '既有金石不是 188 条稳定 ID');
assert(blankIds.size === 142 && epigraphy.epigraphy.length === 142 && epigraphy.summary.searchedRecords === 142, '142 条空释文未逐条形成处置');
assert(epigraphy.epigraphy.every(record => blankIds.has(record.id)), 'V61 覆盖层改动了空释文范围之外的金石 ID');
assert(new Set(epigraphy.epigraphy.map(record => record.id)).size === 142, 'V61 金石覆盖 ID 重复');
assert(epigraphy.epigraphy.every(record => record.externalSearchLog?.length >= 3 && record.sourceVerification?.result && record.finalReview?.status === '已收口' && record.finalReview?.reason), '存在缺少检索日志、核验结果或结论的金石记录');
assert(epigraphy.summary.searchRequests === 284 && epigraphy.summary.completedSearches === 284 && epigraphy.summary.failedSearches === 0, '284 次逐条发现检索尚未全部成功完成');
assert(epigraphy.summary.adoptedTranscriptions > 0 && epigraphy.adoptedIds.length === epigraphy.summary.adoptedTranscriptions, '没有实际采用可追溯释文');
assert(epigraphy.summary.missingAfterResearch === 142 - epigraphy.summary.adoptedTranscriptions, '金石实补前后数量不闭合');
assert(epigraphy.epigraphy.filter(record => record.inscription).every(record => record.candidateDisposition === '采用' && record.sourceVerification.status === '已核' && record.sourceVerification.sources?.every(source => /^https:\/\//.test(source.url))), '已采用释文缺少可访问来源或核验状态');

const byId = new Map(epigraphy.epigraphy.map(record => [record.id, record]));
const gulang = byId.get('wu-gulang-stele');
assert(gulang?.inscription.length > 450 && gulang.inscription.includes('府君諱朗') && gulang.inscription.includes('永光無窮'), '《谷朗碑》正式释文未完整接入');
const tianfa = byId.get('wu-tianfa-shenchan');
assert(tianfa?.inscriptionStatus === '残缺' && tianfa.inscription.includes('□□□□') && !/胡宗師|翁方綱來觀/.test(tianfa.inscription), '《天发神谶碑》原碑正文与增刻未分离');
assert(['original', 'supplied', 'reading', 'laterAddition'].every(type => tianfa?.inscriptionVariants?.some(variant => variant.type === type)), '《天发神谶碑》四类释文层未齐');
assert(transcriptions.records.length === epigraphy.summary.adoptedTranscriptions, '手工核验释文源与采用数量不一致');

const modelContext = { console };
modelContext.window = modelContext;
vm.createContext(modelContext);
vm.runInContext(read('data/research-model.js'), modelContext, { filename: 'data/research-model.js' });
const projected = modelContext.SGZResearchModel.projectForReader({
  name: '测试', readerVisible: true, readerEligibility: 'audit-only', workbookSource: { row: 2 }, sourceVerification: { result: '审校' },
  externalSearchLog: [{ result: '审校' }], inscriptionVariants: [{ type: 'reading' }], sourceLocator: '卷次待补', evidence: { status: '待考' }, fact: '保留事实'
});
assert(projected.name === '测试' && projected.fact === '保留事实', '读者投影误删史实字段');
assert(!('readerEligibility' in projected) && !('workbookSource' in projected) && !('sourceVerification' in projected) && !('externalSearchLog' in projected) && !('inscriptionVariants' in projected) && !('sourceLocator' in projected) && !('evidence' in projected), '读者投影泄露审校字段');
const migrated = modelContext.SGZResearchModel.migrate({ schemaVersion: 10, personSnapshots: supplement.snapshots260, peerageEvents: supplement.peerageEvents });
assert(migrated.schemaVersion === 10 && migrated.personSnapshots.length === 823 && migrated.peerageEvents.length === 590, '研究模型未接入人物快照或封爵事件');

assert(html.includes('./data/person-name-normalization.js?v=61.2') && html.includes('./data/v61-person-supplements.js?v=61.2') && html.includes('./data/v61-epigraphy-research.js?v=61.2'), 'V61 姓名规范或数据未按当前版本挂入页面');
assert(html.includes('personRegistry') && !html.includes('V60 全量人物') && !html.includes('260 年人物纪') && !html.includes('曹魏封爵人物') && !html.includes('peopleDataset'), '人物记未归一为单一全量名录');
assert(html.includes('personSnapshots:cloneJSON') && html.includes('peerageEvents:cloneJSON'), '完整工程导出未包含 V61 人物数据');
assert(html.includes("v-if=\"workspaceMode==='review'&&jinshiPrimaryDetail.sourceVerification\"") && css.includes('.v61-jinshi-research'), '金石审校详情未接入或未受审校模式门禁');
assert(sha256('data/map-period-registry.json') === 'fe3894be8f88512a77431d3e2dc9b7242ca488b580e0341c306d97b8c04147a8', '地图时期注册表发生变化');
assert(sha256('assets/map/data/All_Provinces.json') === 'd146462ff2143a5351acb9bf6171950b874e8cac66a0d455a5aaf7579b13af3e', '地图几何发生变化');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    v60People: v60.people.length,
    snapshot260: supplement.summary,
    epigraphy: epigraphy.summary,
    defaultPeople: 123,
    appointments: 766,
  }, null, 2));
}
