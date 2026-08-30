#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const fullPath = relative => path.join(root, relative);
const read = relative => fs.readFileSync(fullPath(relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const sha256 = relative => crypto.createHash('sha256').update(fs.readFileSync(fullPath(relative))).digest('hex');

const generatedFiles = [
  'data/v63-person-registry.json',
  'data/v63-person-registry.js',
  'data/v63-reader-people.json',
  'data/v63-reader-people.js',
];
function runRegistryBuild() {
  const result = spawnSync(process.execPath, ['scripts/build-v63-person-registry.mjs'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  assert(result.status === 0, `V63 注册表重建失败：${String(result.stderr || result.stdout).trim()}`);
  return result.status === 0;
}

if (runRegistryBuild()) {
  const first = Object.fromEntries(generatedFiles.map(file => [file, sha256(file)]));
  if (runRegistryBuild()) {
    const second = Object.fromEntries(generatedFiles.map(file => [file, sha256(file)]));
    assert(JSON.stringify(first) === JSON.stringify(second), 'V63 连续两次重建未产生完全相同的数据哈希');
  }
}

const schema = json('data/research-schema.json');
const v60 = json('data/v60-person-workbook-import.json');
const v61 = json('data/v61-person-supplements.json');
const registry = json('data/v63-person-registry.json');
const reader = json('data/v63-reader-people.json');
const portraits = json('data/portrait-manifest.json');
const statusValues = new Set(['verified', 'review-only', 'suppressed']);

assert(schema.controlledVocabularies?.publicationStatus?.join('|') === 'verified|review-only|suppressed', 'research-schema 发布状态词表不完整');
assert(schema.controlledVocabularies?.searchState?.join('|') === 'not-started|in-progress|completed|blocked', 'research-schema 检索状态词表不完整');
assert(schema.controlledVocabularies?.historicalDisposition?.includes('明确无候选'), 'research-schema 缺少“明确无候选”历史结论');
assert(Array.isArray(schema.entities?.personRegistry) && Array.isArray(schema.entities?.researchTask), 'research-schema 未登记人物注册表或研究任务');

const modelContext = { console };
modelContext.window = modelContext;
modelContext.globalThis = modelContext;
vm.createContext(modelContext);
vm.runInContext(read('data/research-model.js'), modelContext, { filename: 'data/research-model.js' });
const model = modelContext.SGZResearchModel;
assert(model?.publicationStatuses?.join('|') === 'verified|review-only|suppressed', 'research-model 未公开发布状态词表');
assert(model?.entityTypes?.personRegistry && model?.entityTypes?.researchTask, 'research-model 未公开 V63 实体类型');
const normalizedTask = model?.normalizeResearchTask?.({ id: 'verify-v63-task', searchState: 'completed', historicalDisposition: '明确无候选' });
assert(normalizedTask?.searchState === 'completed' && normalizedTask?.historicalDisposition === '明确无候选', 'research-model 未正确区分检索状态与历史结论');

assert(v60.people?.length === 1196 && v60.sourceIndex?.length === 1223, 'V60 人物总表 1196 条或来源索引 1223 条未闭合');
assert(new Set(v60.people.map(row => row.sourceRecordId)).size === 1196, 'V60 人物 sourceRecordId 不唯一');
for (const row of v60.people || []) {
  assert(row.sourceRecordId === `source:v60:person:${String(row.ordinal).padStart(4, '0')}`, `${row.name} 未按附件显式序号登记 sourceRecordId`);
  assert(registry.sourceRecordToCanonical?.[row.sourceRecordId] === row.personId, `${row.sourceRecordId} 未解析到冻结 personId`);
  assert(row.canonicalPersonId === row.personId, `${row.sourceRecordId} 的 canonicalPersonId 与 personId 不一致`);
  assert(Object.values(row.publicationStatus || {}).every(status => statusValues.has(status)), `${row.sourceRecordId} 包含非法发布状态`);
}
assert(!('importedAt' in v60), 'V60 仍包含会使重建哈希漂移的 importedAt');
assert(!('generatedAt' in v61), 'V61 仍包含会使重建哈希漂移的 generatedAt');

assert(registry.schemaVersion === 'V63' && registry.modelId === 'sgz-v63-person-registry', 'V63 人物注册表版本错误');
assert(registry.people.length === Object.keys(registry.byPersonId || {}).length, 'V63 people 与 byPersonId 数量不一致');
assert(new Set(registry.people.map(row => row.personId)).size === registry.people.length, 'V63 注册表存在重复 personId');
for (const person of registry.people || []) {
  assert(registry.byPersonId[person.personId]?.personId === person.personId, `${person.personId} 缺少 byPersonId 索引`);
  assert(JSON.stringify(registry.publicationByPersonId[person.personId]) === JSON.stringify(person.publicationStatus), `${person.personId} 发布状态索引与人物记录不一致`);
  assert(Object.values(person.publicationStatus || {}).every(status => statusValues.has(status)), `${person.personId} 包含非法发布状态`);
  for (const field of Object.keys(person.values || {})) assert(person.publicationStatus[field] === 'verified', `${person.personId}.${field} 未验证却进入 values`);
}
for (const [legacyId, canonicalId] of Object.entries(registry.legacyToCanonical || {})) {
  assert(legacyId !== canonicalId, `${legacyId} 存在无意义的自映射`);
  assert(Boolean(registry.byPersonId[canonicalId]), `${legacyId} 映射到不存在的 ${canonicalId}`);
  assert(!registry.legacyToCanonical[canonicalId], `${legacyId} -> ${canonicalId} 仍形成链式别名，未压平`);
}
for (const [sourceRecordId, canonicalId] of Object.entries(registry.sourceRecordToCanonical || {})) {
  assert(Boolean(canonicalId) && Boolean(registry.byPersonId[canonicalId]), `${sourceRecordId} 映射到空值或不存在的人物`);
}

const originalConflictNames = ['王基','孙登','王沈','孔乂','刘弘','王嗣','阎宇','荀组','郭奕','孙楚','周玘','司马彪','嵇喜','丁固'];
const additionalConflictNames = ['左思','周浚','王浑'];
const conflictNames = new Set((registry.conflicts || []).map(row => row.name));
for (const name of originalConflictNames) assert(conflictNames.has(name), `审计初列表字冲突 ${name} 未隔离`);
for (const name of additionalConflictNames) assert(conflictNames.has(name), `全量重建新发现表字冲突 ${name} 未隔离`);
assert(registry.conflicts.length === 17, `V63 表字冲突应为初列 14 项＋新发现 3 项，实际 ${registry.conflicts.length}`);
for (const conflict of registry.conflicts || []) {
  assert(conflict.personId !== conflict.isolatedPersonId, `${conflict.name} 冲突候选仍与主人物共用 ID`);
  assert(registry.sourceRecordToCanonical[conflict.snapshotCandidate?.sourceRecordId] === conflict.isolatedPersonId, `${conflict.name} 来源记录未指向隔离人物`);
  assert(registry.byPersonId[conflict.personId]?.identityStatus === 'conflict', `${conflict.name} 主人物未标记身份冲突`);
  assert(registry.byPersonId[conflict.isolatedPersonId]?.identityStatus === 'conflict', `${conflict.name} 隔离人物未标记身份冲突`);
  assert(registry.publicationByPersonId[conflict.personId]?.zi === 'review-only', `${conflict.name} 主人物表字未被阻止发布`);
  assert(registry.publicationByPersonId[conflict.isolatedPersonId]?.zi === 'review-only', `${conflict.name} 隔离人物表字未被阻止发布`);
}
assert(v61.summary?.isolatedZiConflicts === 17, 'V61 重建未保留 17 项表字冲突隔离结果');
assert(registry.summary?.isolatedSnapshotRecords === 18, '17 项非空表字冲突与王嗣空表字来源未共同隔离');

assert(registry.identityMigrations?.length === 9, '应补齐的 person:source/person:jin 身份迁移不是 9 项');
assert(registry.protectedExistingPeople?.length === 10 && registry.protectedExistingPeople.every(row => row.resolved), '10 个验收指定的既有正式人物 ID 未全部解析');

const portraitAssets = Object.values(portraits.assetsById || {});
assert(portraitAssets.length === 275, `立绘资产不是 275 项，实际 ${portraitAssets.length}`);
assert(registry.portraitResolutions?.length === 275 && registry.summary?.unresolvedPortraits === 0, '275 项立绘未全部通过正式或兼容 ID 解析');
for (const row of registry.portraitResolutions || []) assert(Boolean(registry.byPersonId[row.personId]), `${row.portraitId} 解析到不存在的人物`);
const frozenPortraits = {
  'portrait:asset:12d23c4bb0e34a35af89': ['person:workbook:10602094ff4cb2ed', '68:18'],
  'portrait:asset:774eea78a498a031245f': ['person:jin:wang-chen', '68:7'],
  'portrait:v62:shuhan:07': ['person:workbook:c8aa56ee0f11b759', '80:63'],
  'portrait:v62:wu:02': ['person:workbook:f29d7e9d70a640ef', '80:78'],
};
for (const [portraitId, [personId, nodeId]] of Object.entries(frozenPortraits)) {
  const asset = portraits.assetsById?.[portraitId];
  assert(asset?.personId === personId && asset?.designRef?.nodeId === nodeId, `${portraitId} 冲突立绘绑定或 Figma 节点漂移`);
}

const readerText = read('data/v63-reader-people.json');
for (const token of ['workbookSource', 'workbookSources', 'sourcePath', 'sourceRecordId', 'reviewCandidates', 'externalSearchLog', 'audit-only', '/Users/', 'publicationStatus']) {
  assert(!readerText.includes(token), `V63 读者数据泄露审校字段或本机路径：${token}`);
}
const readerAllowedFields = new Set(['personId','name','aliases','zi','birthplace','birthYear','deathYear','bio','dynastyTags','historicalAffiliations','appointmentIds','peerageEventIds','portraitIds','datasets']);
const statusFieldForReaderField = { appointmentIds: 'appointments', peerageEventIds: 'peerage', portraitIds: 'portraits' };
for (const person of reader.people || []) {
  assert(Object.keys(person).every(field => readerAllowedFields.has(field)), `${person.personId} 读者投影包含未允许字段`);
  assert((person.datasets || []).every(dataset => ['v60','snapshot260','peerage'].includes(dataset)), `${person.personId} 读者数据集标识超出白名单`);
  for (const field of Object.keys(person).filter(field => !['personId','datasets'].includes(field))) {
    const statusField = statusFieldForReaderField[field] || field;
    assert(registry.publicationByPersonId[person.personId]?.[statusField] === 'verified', `${person.personId}.${field} 未验证却进入读者数据`);
  }
}
assert(reader.people.length === registry.people.filter(row => row.publicationStatus.name === 'verified').length, '读者人物数量与 name=verified 门禁不一致');
assert(reader.people.filter(person => person.datasets?.includes('v60')).length > 0, 'V60 人物专题关联未进入纯净读者投影');
assert(reader.people.filter(person => person.datasets?.includes('snapshot260')).length > 0, '260 年人物纪专题关联未进入纯净读者投影');
assert(reader.people.filter(person => person.datasets?.includes('peerage')).length > 0, '曹魏封爵人物专题关联未进入纯净读者投影');
const readerById = new Map((reader.people || []).map(row => [row.personId, row]));
const auditOnlyRows = (v60.people || []).filter(row => row.readerEligibility === 'audit-only');
assert(auditOnlyRows.length === 1066, `V60 audit-only 候选不是 1066 条，实际 ${auditOnlyRows.length}`);
const candidateFields = { zi: 'zi', birthplace: 'birthplace', birthYear: 'birthYear', deathYear: 'deathYear', dynastyTags: 'polity' };
for (const row of auditOnlyRows) {
  const registered = registry.byPersonId[row.personId];
  const projectedPerson = readerById.get(row.personId) || {};
  for (const [field, sourceField] of Object.entries(candidateFields)) {
    const rawValue = row[sourceField];
    const candidateValue = field === 'dynastyTags' ? (rawValue ? [rawValue] : []) : rawValue;
    if (rawValue === '' || rawValue === null || rawValue === undefined || (Array.isArray(candidateValue) && !candidateValue.length)) continue;
    if (JSON.stringify(projectedPerson[field]) !== JSON.stringify(candidateValue)) continue;
    const independentlyVerified = (registered?.reviewCandidates?.[field] || []).some(candidate => candidate.publicationStatus === 'verified' && JSON.stringify(candidate.value) === JSON.stringify(candidateValue));
    assert(independentlyVerified, `${row.sourceRecordId} 的未核 ${field} 未经独立来源却进入读者数据`);
  }
}

const runtimeContext = { console };
runtimeContext.window = runtimeContext;
runtimeContext.globalThis = runtimeContext;
vm.createContext(runtimeContext);
vm.runInContext(read('data/v63-person-registry.js'), runtimeContext, { filename: 'data/v63-person-registry.js' });
vm.runInContext(read('data/v63-reader-people.js'), runtimeContext, { filename: 'data/v63-reader-people.js' });
assert(JSON.stringify(runtimeContext.SGZ_V63_PERSON_REGISTRY) === JSON.stringify(registry), 'V63 注册表 JS 与 JSON 不一致');
assert(JSON.stringify(runtimeContext.SGZ_V63_READER_PEOPLE) === JSON.stringify(reader), 'V63 读者数据 JS 与 JSON 不一致');

const sample = registry.people.find(row => row.values?.zi && row.publicationStatus?.zi === 'verified');
const projected = sample && model?.projectPersonForReader(sample, registry);
assert(!sample || (projected?.name === sample.name && projected?.zi === sample.values.zi && !('publicationStatus' in projected)), 'projectPersonForReader 未按字段门禁生成纯净投影');
const portraitSample = registry.people.find(row => row.values?.portraits?.length && row.publicationStatus?.portraits === 'verified');
const portraitProjection = portraitSample && model?.projectPersonForReader(portraitSample, registry);
assert(!portraitSample || JSON.stringify(portraitProjection?.portraitIds) === JSON.stringify(portraitSample.values.portraits), 'projectPersonForReader 未将注册表 portraits 映射为读者 portraitIds');
const maliciousText = '<img src=x onerror="globalThis.__v63Injected=true">';
const auditProjection = model?.projectForReader({
  id: 'verify-v63-audit-projection',
  publicFact: maliciousText,
  searchState: 'completed',
  historicalDisposition: '存疑',
  searchScope: ['《三国志》'],
  finalReview: { status: '已收口' },
  conclusion: '审校结论',
  unresolvedReason: '证据不足',
  auditId: 'audit:verify-v63',
  taskId: 'task:verify-v63',
  sourceRow: 9,
  sourceRecordRow: 9,
  workbook: { sourcePath: '/Users/example/Desktop/audit.xlsx' },
  workbookFile: 'audit.xlsx',
  workbookSha256: 'deadbeef',
  sheet: '审校表',
  sheetName: '审校表',
  sheetRow: 9,
  rowAudit: [{ disposition: '存疑' }],
  snapshotRowAudit: [{ disposition: '存疑' }],
  peerageRowAudit: [{ disposition: '存疑' }],
  workbookSourceRecordId: 'source:audit:9',
  nested: { safeText: '保留', sourceRow: 10, finalReview: { status: '待核' } },
});
const forbiddenAuditFields = ['searchState','historicalDisposition','searchScope','finalReview','conclusion','unresolvedReason','auditId','taskId','sourceRow','sourceRecordRow','workbook','workbookFile','workbookSha256','sheet','sheetName','sheetRow','rowAudit','snapshotRowAudit','peerageRowAudit','workbookSourceRecordId'];
assert(auditProjection?.publicFact === maliciousText && auditProjection?.nested?.safeText === '保留', '读者投影改写了普通文本或丢失安全事实字段');
assert(forbiddenAuditFields.every(field => !(field in (auditProjection || {}))) && !('sourceRow' in (auditProjection?.nested || {})) && !('finalReview' in (auditProjection?.nested || {})), '读者投影泄露 V63/V65 审校字段');
assert(modelContext.__v63Injected !== true, '恶意 HTML 测试字符串在数据投影阶段被执行');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    registryPeople: registry.summary.people,
    readerPeople: registry.summary.readerPeople,
    legacyMappings: registry.summary.legacyMappings,
    sourceRecordMappings: registry.summary.sourceRecordMappings,
    originalZiConflicts: originalConflictNames.length,
    additionalZiConflicts: additionalConflictNames.length,
    isolatedSnapshotRecords: registry.summary.isolatedSnapshotRecords,
    addedJinLegacyMappings: registry.summary.addedJinLegacyMappings,
    protectedExistingPeople: registry.summary.protectedExistingPeople,
    portraitAssets: registry.summary.portraitAssets,
    unresolvedPortraits: registry.summary.unresolvedPortraits,
  }, null, 2));
}
