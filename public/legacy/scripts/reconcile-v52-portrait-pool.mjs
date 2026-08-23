import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const poolPath = path.join(root, 'data/portrait-unassigned-pool.json');
const auditPath = path.join(root, 'data/portrait-retirement-audit.json');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/portrait-manifest.json'), 'utf8'));
const pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
const referenced = new Set(Object.values(manifest.byPersonId || {}).map(item => item.src));
const v51Dir = path.join(root, 'assets', 'portraits', 'v51');
const existing = new Map((pool.assets || []).map(item => [item.src, item]));
for (const file of fs.readdirSync(v51Dir).filter(name => name.endsWith('.png'))) {
  const src = `./assets/portraits/v51/${file}`;
  if (referenced.has(src) || existing.has(src)) continue;
  existing.set(src, {
    src,
    sourceName: `V51撤出资源·${file.replace(/\.png$/, '')}`,
    reuseStatus: 'unassigned',
    assignedTo: '',
  });
}
pool.assets = [...existing.values()];
pool.assignmentSummary = {
  assigned: pool.assets.filter(item => item.reuseStatus === 'assigned').length,
  remaining: pool.assets.filter(item => item.reuseStatus === 'unassigned').length,
};
fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2) + '\n', 'utf8');
const retired = pool.assets.map(item => ({
  rawName: item.sourceName,
  src: item.src,
  oldPortraitKind: 'ai-illustration-v51',
  reuseStatus: item.reuseStatus,
  assignedTo: item.assignedTo || '',
  reason: '实体审校后撤出人物索引；资源保留在 V52 资源池，不作为史实肖像。',
}));
fs.writeFileSync(auditPath, JSON.stringify({
  schemaVersion: 'V52',
  policy: '误识别资源不再绑定人物；已确认有效人物的重新分配项与待分配项均保留审计。',
  retired,
  summary: { requestedNames: 52, retiredAssets: retired.length },
}, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ assets: pool.assets.length, assigned: pool.assignmentSummary.assigned, remaining: pool.assignmentSummary.remaining }, null, 2));
