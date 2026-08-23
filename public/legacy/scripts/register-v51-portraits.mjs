import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/portrait-manifest.json'), 'utf8'));
const portraitsPath = path.join(root, 'data/person-portraits.js');
let source = fs.readFileSync(portraitsPath, 'utf8');
const existingNames = new Set(Array.from(source.matchAll(/^\s*['"]([^'"]+)['"]\s*:/gm), match => match[1]));
const entries = [];

for (const personId of manifest.defaultPersonIds || []) {
  const item = manifest.byPersonId?.[personId];
  if (!item || item.status === 'ready' || existingNames.has(item.name)) continue;
  const safeId = String(personId).replace(/^person:/, '').replace(/[^a-zA-Z0-9_-]+/g, '-');
  const assetPath = `./assets/portraits/v51/person-${safeId}.png`;
  if (!fs.existsSync(path.join(root, assetPath.slice(2)))) continue;
  const color = item.color || '#8D948A';
  entries.push(`  ${JSON.stringify(item.name)}: { src:${JSON.stringify(assetPath)}, polity:${JSON.stringify(item.polity || '未详')}, color:${JSON.stringify(color)}, sourceTitle:'V51 内置生图界面识别立绘（非史实肖像）', sourceUrl:'', portraitKind:'ai-illustration-v51' },`);
}

if (entries.length) {
  const marker = '\n};';
  const index = source.lastIndexOf(marker);
  if (index < 0) throw new Error('person-portraits.js 缺少对象结束标记');
  source = `${source.slice(0, index)}\n\n  // V51 内置生图立绘索引\n${entries.join('\n')}${source.slice(index)}`;
  fs.writeFileSync(portraitsPath, source, 'utf8');
}

console.log(JSON.stringify({ registered: entries.length, names: entries.map(entry => entry.match(/JSON.stringify\(item.name\)/)?.[0] || '') }));
