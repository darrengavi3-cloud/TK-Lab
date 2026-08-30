import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => {
  if (!condition) throw new Error(`V47 百官志审计失败：${message}`);
};

const sourceIndex = json('data/baiguanzhi-source-index.json');
const audit = json('data/v47-baiguanzhi-diff-audit.json');
const claims = json('data/v47-baiguanzhi-source-claims.json');
const approvalList = json('data/v47-baiguanzhi-approval-list.json');

assert(sourceIndex.schemaVersion === 1, '来源索引 schemaVersion 异常');
assert(sourceIndex.modelId === 'sgz-baiguanzhi-source-index-v1', '来源索引 modelId 异常');
assert(sourceIndex.scope.default === '汉末至西晋（168—316）', '默认历史范围被改变');
assert(sourceIndex.sourcePackages.length === 3, '三书来源包数量不是 3');
const expectedThreads = new Set([
  '6a8321b5-af24-83e8-9c29-ae6054772cdd',
  '6a831a7f-6ff0-83e8-8ead-3aa703cef670',
  '6a832528-6b0c-83e8-a7f1-9457b5cc9af0'
]);
assert(new Set(sourceIndex.sourcePackages.map(item => item.conversationId)).size === 3, '来源对话 ID 重复');
assert(sourceIndex.sourcePackages.every(item => expectedThreads.has(item.conversationId)), '来源包含未确认的对话 ID');
assert(sourceIndex.sourcePackages.every(item => item.primaryTextRequired === true), '来源包未声明必须回查原文');

assert(sourceIndex.candidateFamilies.length >= 7, '候选制度族覆盖不足');
assert(sourceIndex.candidateFamilies.every(item => item.runtimeDefault === false), '候选制度族不得直接进入默认运行数据');
assert(sourceIndex.candidateFamilies.every(item => item.requiredReview), '候选制度族缺少复核门槛');
assert(sourceIndex.integrationRules.length >= 5, '来源索引缺少防误导入规则');
assert(sourceIndex.nextStageClaims === 'data/v47-baiguanzhi-source-claims.json', '来源索引未指向 V47-B sourceClaim');
const song = sourceIndex.candidateFamilies.find(item => item.id === 'song-comparative-layer');
assert(song && song.integrationMode.includes('比较层') && song.runtimeDefault === false, '宋书比较层边界缺失');

assert(audit.version === 'V47', '差异审计版本异常');
assert(audit.sourceIndex === 'data/baiguanzhi-source-index.json', '差异审计未指向来源索引');
assert(audit.items.length === 6, '差异审计项目数量异常');
assert(audit.items.every(item => item.status && item.decision && item.nextAction), '差异审计项目缺少状态、决定或后续动作');
assert(audit.items.every(item => item.defaultRuntimeImport === false), '差异审计出现直接运行时导入');
assert(audit.items.some(item => item.id === 'audit-song-out-of-scope' && item.decision.includes('不进入默认')), '宋书越界规则未记录');
assert(audit.summary.directRuntimeImports === 0, 'V47 第一阶段不应有运行时批量导入');

assert(claims.schemaVersion === 1 && claims.version === 'V47-B', 'V47-B sourceClaim 版本异常');
assert(claims.sourceRecords.length === 6, 'V47-B 一手史料来源数量异常');
assert(claims.claims.length === 13, 'V47-B sourceClaim 数量异常');
assert(new Set(claims.claims.map(item => item.id)).size === claims.claims.length, 'V47-B sourceClaim ID 重复');
const sourceIds = new Set(claims.sourceRecords.map(item => item.id));
assert(claims.claims.every(item => sourceIds.has(item.sourceId)), 'V47-B sourceClaim 引用了不存在的来源');
assert(claims.sourceRecords.every(item => item.url && item.retrievedHash && /^[a-f0-9]{64}$/.test(item.retrievedHash)), 'V47-B 来源缺少 URL 或页面哈希');
assert(claims.claims.every(item => item.quote && item.claim && item.evidence && item.reviewStatus), 'V47-B sourceClaim 缺少原文摘录、断言或证据状态');
assert(claims.claims.every(item => item.runtimeImport === false), 'V47-B sourceClaim 不得直接进入运行时');
assert(claims.claims.some(item => item.id === 'claim:han:sili:bijia-review' && item.reviewStatus.includes('存疑')), '司隶别驾从事矛盾未进入待审项');
assert(claims.claims.filter(item => item.sourceId.startsWith('src:songshu')).every(item => item.runtimeImport === false), '宋书比较 claim 越界导入');

// ---- V47-C 审批清单 ----
assert(approvalList.schemaVersion === 1, 'V47-C 审批清单 schemaVersion 异常');
assert(approvalList.modelId === 'sgz-baiguanzhi-approval-list-v1', 'V47-C 审批清单 modelId 异常');
assert(approvalList.version === 'V47-C', 'V47-C 审批清单版本异常');
assert(approvalList.items.length === 13, 'V47-C 审批清单条目数量异常');
assert(approvalList.summary.items === approvalList.items.length, 'V47-C 审批清单统计条数不一致');
assert(approvalList.summary.directRuntimeImports === 0, 'V47-C 出现直接运行时导入');
assert(approvalList.summary.nextBatch.includes('V47-D'), 'V47-C 未指向下一批 V47-D');
assert(approvalList.items.every(item => item.runtimeImport === false), 'V47-C 审批清单不应直接进入运行时');
assert(approvalList.items.every(item => !!(item.id && item.claimType && item.decision && item.status && item.gap && item.action)), 'V47-C 审批条目缺少必备字段');
assert(approvalList.items.every(item => typeof item.requiresApproval === 'boolean'), 'V47-C 审批条目 requiresApproval 非布尔');
assert(new Set(approvalList.items.map(item => item.id)).size === approvalList.items.length, 'V47-C 审批清单 ID 重复');
const claimIds = new Set(claims.claims.map(item => item.id));
assert(approvalList.items.every(item => claimIds.has(item.id)), 'V47-C 审批清单引用了不存在的 sourceClaim');
assert(approvalList.items.every(item => (item.classSourceClaim ? claimIds.has(item.classSourceClaim) : true)), 'V47-C 审批清单关联 claim 不存在');
assert(approvalList.summary.approvedForSourceOnly >= 0 && approvalList.summary.requiresApproval >= 0 && approvalList.summary.excludedComparative >= 0, 'V47-C 审批清单统计出现负数');
assert(approvalList.summary.approvedForSourceOnly + approvalList.summary.excludedComparative <= approvalList.items.length, 'V47-C 审批清单统计总数越界');
const comparativeCount = approvalList.items.filter(item => item.decision.includes('仅比较层') || item.decision.includes('比较层')).length;
assert(comparativeCount === approvalList.summary.excludedComparative, 'V47-C 比较层排除统计不一致');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(read('data/han-bai-guan-zhi.js'), context, { filename: 'data/han-bai-guan-zhi.js' });
const han = context.window.SGZ_HAN_BAI_GUAN_ZHI;
assert(han && han.records.length === audit.baseline.hanBaiGuanZhiRecords, '东汉百官志基线记录数漂移');
assert(han.records.filter(record => record.hidden).length === audit.baseline.hanBaiGuanZhiHiddenRecords, '东汉百官志隐藏节点基线漂移');
assert(han.records.filter(record => !record.hidden).length === audit.baseline.hanBaiGuanZhiVisibleRecords, '东汉百官志可见节点基线漂移');

// ---- V47-D：审批通过项的定向补录校验 ----
// 1) 尚书仆射员额 seat：已补《后汉书》卷116 来源，员额一人。
vm.runInContext(read('data/office-seat-policies.js'), context, { filename: 'data/office-seat-policies.js' });
const seats = context.window.SGZ_SEAT_POLICIES;
const pusheSeat = seats.find(s => s.id === 'seat:han:shangshu-pushe:bang');
assert(pusheSeat, 'V47-D 未补尚书仆射制度员额 seat');
assert(Number(pusheSeat.authorizedCount) === 1, 'V47-D 尚书仆射员额并非一人');
assert(pusheSeat.sourceId && /后汉书/.test(pusheSeat.sourceId), 'V47-D 尚书仆射 seat 缺少《后汉书》来源');
assert(/卷116/.test(pusheSeat.note || ''), 'V47-D 尚书仆射 seat 未标注卷116');

// 2) 府署 note：晋司隶"渡江乃罢"、东宫"泰始三年"、诸公府"加兵公"边界均已补。
vm.runInContext(read('data/office-residences.js'), context, { filename: 'data/office-residences.js' });
const residences = context.window.SGZ_OFFICE_RESIDENCES;
const siliJin = residences.find(r => r.id === 'residence:sili:jin');
assert(siliJin && /渡江乃罢/.test(siliJin.note || ''), 'V47-D 晋司隶府署未标注"渡江乃罢"东晋边界');
const eastPalace = residences.find(r => r.id === 'residence:royal:east-palace');
assert(eastPalace && /泰始三年/.test(eastPalace.note || ''), 'V47-D 东宫府署未标注泰始三年建置');
const jinPublic = residences.find(r => r.id === 'residence:jin:public-office');
assert(jinPublic && /加兵公/.test(jinPublic.note || ''), 'V47-D 诸公府署未区分加兵公增置');

// 3) 司隶(东汉)属官与别驾存疑：index.html 中 WIKI 条目带《后汉书》卷117 一手来源，司隶校尉节点记别驾存疑。
const html = read('index.html');
const hanSiliOfficers = ['都官从事','功曹从事','簿曹从事','兵曹从事','部郡从事','主簿'];
assert(html.includes('sourceRefs:[{sourceTitle:\'《后汉书》卷117·百官四\''), 'V47-D 司隶属官未引入《后汉书》卷117 来源');
assert(hanSiliOfficers.every(nm => html.includes(`司隶校尉（东汉）',name:'${nm}'`)), 'V47-D 司隶属官节点缺失');
assert(html.includes('sourceRefs:[{sourceTitle:\'《后汉书》卷117·百官四\''), 'V47-D 司隶属官一手来源结构异常');
assert(html.includes('另载"别驾从事"') && html.includes('存疑待考'), 'V47-D 司隶别驾从事存疑标注缺失');

assert(fs.existsSync(path.join(root, 'docs/V47三书百官志来源对照与魏晋官制审计.md')), 'V47 文档缺失');
assert(fs.existsSync(path.join(root, 'backups/20260821-pre-v47/han-bai-guan-zhi.js')), 'V47 定向备份缺失');

console.log(JSON.stringify({
  version: 'V47',
  sourcePackages: sourceIndex.sourcePackages.length,
  candidateFamilies: sourceIndex.candidateFamilies.length,
  auditItems: audit.items.length,
  sourceClaims: claims.claims.length,
  sourceRecords: claims.sourceRecords.length,
  directRuntimeImports: audit.summary.directRuntimeImports,
  approvalList: {
    items: approvalList.items.length,
    approvedForSourceOnly: approvalList.summary.approvedForSourceOnly,
    requiresApproval: approvalList.summary.requiresApproval,
    excludedComparative: approvalList.summary.excludedComparative,
    directRuntimeImports: approvalList.summary.directRuntimeImports
  },
  hanBaiGuanZhi: {
    total: han.records.length,
    hidden: han.records.filter(record => record.hidden).length,
    visible: han.records.filter(record => !record.hidden).length
  },
  v47d: {
    shangshuPusheSeat: pusheSeat ? Number(pusheSeat.authorizedCount) : null,
    siliJinNote: siliJin ? (siliJin.note || '').slice(0, 20) : null,
    eastPalaceNote: eastPalace ? (eastPalace.note || '').slice(0, 20) : null,
    jinPublicNote: jinPublic ? (jinPublic.note || '').slice(0, 20) : null,
    hanSiliSource: html.includes('《后汉书》卷117·百官四') ? '已补' : '缺失',
    bijiaMark: html.includes('存疑待考') ? '已标' : '缺失'
  },
  status: '来源索引、差异审计、V47-C 审批清单通过；V47-D 定向补录已写入并校验'
}, null, 2));
