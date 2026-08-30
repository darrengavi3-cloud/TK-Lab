import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = file => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  return context.window;
};
const source = load('data/person-source-index.js').SGZ_PERSON_SOURCE_INDEX;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/portrait-manifest.json'), 'utf8'));
const poolPath = path.join(root, 'data/portrait-unassigned-pool.json');
const pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
const assignmentPath = path.join(root, 'data/portrait-pool-assignments-v52.json');
const previousAssignments = fs.existsSync(assignmentPath) ? JSON.parse(fs.readFileSync(assignmentPath, 'utf8')).assignments || [] : [];
const portraitsPath = path.join(root, 'data/person-portraits.js');
const portraits = { ...(load('data/person-portraits.js').SGZ_PERSON_PORTRAITS || {}) };
const colors = { 汉:'#A54136', 魏:'#376B9E', 吴:'#3F7652', 晋:'#665483', 未详:'#8D948A' };
const missing = (manifest.defaultPersonIds || [])
  .map(id => manifest.byPersonId?.[id])
  .filter(item => item && item.status !== 'ready')
  .map(item => item.name);
const available = pool.assets.filter(item => item.reuseStatus === 'unassigned');
const previousByName = new Map(previousAssignments.map(item => [item.name, item]));
if (available.length + previousAssignments.length < missing.length) throw new Error(`V52 立绘资源不足：需要 ${missing.length}，实际 ${available.length + previousAssignments.length}`);
const assignments = [];
for (const name of missing) {
  const person = source.people.find(item => item.name === name);
  const prior = previousByName.get(name);
  const asset = (prior && pool.assets.find(item => item.src === prior.src)) || available.shift();
  const polity = (source.appointments || []).find(item => item.personId === person?.personId)?.polity || '未详';
  portraits[name] = {
    src: asset.src,
    polity,
    color: colors[polity] || colors.未详,
    sourceTitle: 'V52 误识别资源池重新分配的界面识别立绘（非史实肖像）',
    sourceUrl: '',
    portraitKind: 'ai-illustration-v52-reassigned',
    interfaceOnly: true,
    personId: person?.personId || '',
  };
  asset.reuseStatus = 'assigned';
  asset.assignedTo = name;
  asset.assignedPersonId = person?.personId || '';
  assignments.push({ name, personId: person?.personId || '', src: asset.src });
}
fs.writeFileSync(portraitsPath, `/* 人物立绘索引：用户参考图裁切与项目生成头像分列；未列人物由人物记使用势力色首字占位。 */\nwindow.SGZ_PERSON_PORTRAITS = ${JSON.stringify(portraits, null, 2)};\n`, 'utf8');
pool.assignmentSummary = {
  assigned: pool.assets.filter(item => item.reuseStatus === 'assigned').length,
  remaining: pool.assets.filter(item => item.reuseStatus === 'unassigned').length,
};
fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(root, 'data/portrait-pool-assignments-v52.json'), JSON.stringify({ schemaVersion:'V52', assignments }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ missingBefore: missing.length, assigned: assignments.length, remaining: available.length }, null, 2));
