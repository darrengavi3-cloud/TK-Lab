import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const context = { console };
context.window = context;
vm.createContext(context);
for (const relative of ['data/kaifu-policies.js', 'data/office-residences.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), context, { filename: relative, timeout: 10000 });
}

const policies = context.SGZ_KAIFU_POLICIES || [];
const residences = context.SGZ_OFFICE_RESIDENCES || [];
const audit = JSON.parse(fs.readFileSync(path.join(root, 'data/v59-office-evidence-audit.json'), 'utf8'));
const policyById = new Map(policies.map(item => [item.id, item]));
const residenceById = new Map(residences.map(item => [item.id, item]));
const resolvedResidenceIds = [
  'residence:han:public-office',
  'residence:han:heavy-general',
  'residence:han:east-palace',
  'residence:jin:public-office',
  'residence:jin:military-kaifu',
  'residence:jin:east-palace'
];

assert(audit.version === 'V59', 'V59 考证台账版本不正确');
assert(audit.sources.length === 3, 'V59 一手史料来源未完整登记');
assert(audit.resolved.length === 6, 'V59 已闭合的府署考证条目数量不正确');
assert(audit.reviewQueue.length === 3, 'V59 待复核队列未显式登记');
assert(audit.reviewQueue.every(item => item.status === '待复核' && item.reason && item.sourceBoundary), 'V59 待复核项缺少原因或下一步证据边界');

for (const id of resolvedResidenceIds) {
  const item = residenceById.get(id);
  assert(item, `缺少已闭合府署：${id}`);
  if (!item) continue;
  assert(item.researchStatus === '确定', `${id} 未标记为确定`);
  assert(item.evidence?.sourceLevel === '一手史料', `${id} 缺少一手史料证据等级`);
  assert(item.evidence?.sourceLocator && item.evidence?.sourceUrl, `${id} 缺少 sourceLocator/sourceUrl`);
  assert(item.roles?.length > 0, `${id} 缺少府属角色`);
  assert(item.roles.every(role => role.officeName && role.institutionType), `${id} 存在无官名或机构类型的府属角色`);
}

const hanPublic = policies.filter(item => item.id.startsWith('kaifu:han:public-office:'));
const hanHeavy = policies.filter(item => item.id.startsWith('kaifu:han:heavy-general:'));
assert(hanPublic.length === 3 && hanPublic.every(item => item.qualificationType === '事实见府属' && item.researchStatus === '确定'), '东汉公府资格记录不完整或误标开府类型');
assert(hanHeavy.length === 4 && hanHeavy.every(item => item.qualificationType === '事实见府属' && item.researchStatus === '确定'), '东汉比公重号将军记录不完整或误标开府类型');
assert(hanHeavy.map(item => item.officeName).join('、') === '大将军、骠骑将军、车骑将军、卫将军', '东汉比公重号将军名单不完整');

const jinMilitary = residenceById.get('residence:jin:military-kaifu');
assert(jinMilitary?.ownerOfficeNames?.includes('骠骑将军') && jinMilitary.ownerOfficeNames.includes('车骑将军') && jinMilitary.ownerOfficeNames.includes('卫将军'), '晋开府将军府未显式覆盖骠骑、车骑、卫将军');
assert(jinMilitary?.note?.includes('不自动等同开府'), '晋开府将军府缺少个别开府条件说明');
assert(policies.filter(item => item.polity === '晋' && item.qualificationType === '加号开府').every(item => item.note?.includes('具体开府') || item.note?.includes('官名本身不等于人人开府')), '晋重号将军制度政策缺少条件性说明');

assert(residenceById.has('residence:han:east-palace') && residenceById.has('residence:jin:east-palace'), '汉、晋东宫府署未同时建立');
assert(!residenceById.has('residence:royal:east-palace'), '未删除无政权范围的笼统东宫府署');
assert(residenceById.get('residence:han:east-palace')?.roles.some(role => role.sourceText?.includes('悉主太子官属')), '汉东宫未保留太子少傅主官属的原文口径');
assert(residenceById.get('residence:jin:east-palace')?.roles.some(role => role.officeName === '太子詹事' && role.sourceText?.includes('咸宁元年')), '晋东宫未保留詹事沿革定位');

const sourceIds = new Set(audit.sources.map(source => source.id));
for (const row of audit.resolved) {
  assert(row.status === '确定', `${row.id} 未闭合为确定`);
  assert(row.sourceIds.every(id => sourceIds.has(id)), `${row.id} 引用了不存在的来源 ID`);
  assert(row.runtimeIds.length > 0, `${row.id} 缺少运行时映射`);
}
assert(policyById.get('kaifu:han:heavy-general:2')?.evidence?.sourceLocator?.includes('将军'), '开府政策缺少原文定位');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, resolvedResidences: resolvedResidenceIds.length, hanPublicPolicies: hanPublic.length, hanHeavyPolicies: hanHeavy.length, reviewQueue: audit.reviewQueue.length }, null, 2));
}
