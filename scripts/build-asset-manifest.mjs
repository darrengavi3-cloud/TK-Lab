import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const includeRoots = ['assets', 'data'];
const excluded = new Set(['data/asset-manifest.json']);
const files = [];

function walk(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      return;
    }
    const relative = path.relative(root, fullPath).split(path.sep).join('/');
    if (excluded.has(relative)) return;
    const buffer = fs.readFileSync(fullPath);
    files.push({
      path: relative,
      bytes: buffer.length,
      sha256: crypto.createHash('sha256').update(buffer).digest('hex')
    });
  });
}

includeRoots.forEach(relative => walk(path.join(root, relative)));
files.sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'));

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  offlineRuntime: true,
  fileCount: files.length,
  totalBytes: files.reduce((total, file) => total + file.bytes, 0),
  files
};

fs.writeFileSync(
  path.join(root, 'data', 'asset-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
);

console.log(`已生成资源清单：${manifest.fileCount} 个文件，${manifest.totalBytes} 字节`);
