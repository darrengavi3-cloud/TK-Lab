import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const portraitFile = path.join(dataDir, 'person-portraits.js');
const audit = JSON.parse(fs.readFileSync(path.join(dataDir, 'person-entity-audit.json'), 'utf8'));
const poolPath = path.join(dataDir, 'portrait-unassigned-pool.json');
const existingPool = fs.existsSync(poolPath) ? JSON.parse(fs.readFileSync(poolPath, 'utf8')) : { assets: [] };

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(portraitFile, 'utf8'), context, { filename: portraitFile });
const portraits = { ...(context.window.SGZ_PERSON_PORTRAITS || {}) };

const explicitNames = [
  '安定','安豐','安南','安平','安遠','巴东','巴西','东大','东莞','东羌','东属国','东阳','和世','扶風','乐安','平寇','平南','平虜','平魏','平原','平子雖','曲梁','平戎','时擢','史大夫','通振威','文观','文学','聞弟','烏丸','武都','武平','相大','吴曆','谢服','宣信','严裨','燕平難','阳安','阳平','有军功','章陵','章西安','左大','左度辽',
  '伯父鼎','匡师友','鲁镇南','时孚','时蒋济','虞子和','卓弟旻','南匈奴呼厨泉',
];
const auditedNames = [
  ...(audit.explicitExclusions || []).map(item => item.rawName),
  ...(audit.normalizations || []).filter(item => item.rawName !== item.canonicalName).map(item => item.rawName),
];
const retiredNames = new Set([...explicitNames, ...auditedNames]);
const retired = [];
for (const name of retiredNames) {
  const item = portraits[name];
  if (!item) continue;
  retired.push({
    rawName: name,
    src: item.src || '',
    oldPortraitKind: item.portraitKind || '',
    reuseStatus: 'unassigned',
    reason: '实体审校后确认不是人物或属于误切姓名；资源保留在未分配池，不直接冒充其他历史人物。',
  });
  delete portraits[name];
}

const mergedRetired = new Map();
for (const item of existingPool.assets || []) {
  mergedRetired.set(`${item.sourceName}|${item.src}`, {
    rawName: item.sourceName,
    src: item.src,
    oldPortraitKind: 'ai-illustration-v51',
    reuseStatus: item.reuseStatus || 'unassigned',
    assignedTo: item.assignedTo || '',
    reason: '实体审校后确认不是人物或属于误切姓名；资源保留在未分配池，不直接冒充其他历史人物。',
  });
}
for (const item of retired) mergedRetired.set(`${item.rawName}|${item.src}`, item);
const allRetired = [...mergedRetired.values()];
const js = `/* 人物立绘索引：用户参考图裁切与项目生成头像分列；未列人物由人物记使用势力色首字占位。 */\nwindow.SGZ_PERSON_PORTRAITS = ${JSON.stringify(portraits, null, 2)};\n`;
fs.writeFileSync(portraitFile, js, 'utf8');
fs.writeFileSync(path.join(dataDir, 'portrait-retirement-audit.json'), JSON.stringify({
  schemaVersion: 'V52',
  policy: '误识别资源不再绑定人物；保留原文件并进入未分配池，待后续按稳定 personId 重新分配。',
  retired: allRetired,
  summary: { requestedNames: retiredNames.size, retiredAssets: allRetired.length },
}, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(dataDir, 'portrait-unassigned-pool.json'), JSON.stringify({
  schemaVersion: 'V52',
  policy: '仅作界面资产复用，不作为历史肖像或人物身份依据。',
  assets: allRetired.map(item => ({ src: item.src, sourceName: item.rawName, reuseStatus: item.reuseStatus, assignedTo: item.assignedTo || '' })),
}, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ retired: retired.length, retainedPool: allRetired.length, requestedNames: retiredNames.size }, null, 2));
