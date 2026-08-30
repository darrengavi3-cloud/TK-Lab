import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const includeRoots = ['assets', 'data'];
const excluded = new Set(['data/asset-manifest.json']);
const files = [];
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function stableGeneratedAt() {
  const lockPath = path.join(root, 'sources.lock.json');
  const fromEnvironment = Number(process.env.SOURCE_DATE_EPOCH);
  if (Number.isFinite(fromEnvironment) && fromEnvironment > 0) {
    return new Date(fromEnvironment * 1000).toISOString();
  }
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const lockedEpoch = Number(lock.sourceDateEpoch);
    if (Number.isFinite(lockedEpoch) && lockedEpoch > 0) {
      return new Date(lockedEpoch * 1000).toISOString();
    }
  }
  throw new Error('缺少确定性时间基准：请先生成 sources.lock.json，或设置 SOURCE_DATE_EPOCH。');
}

function walk(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => compareText(a.name, b.name)).forEach(entry => {
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
files.sort((a, b) => compareText(a.path, b.path));

const manifest = {
  schemaVersion: 2,
  generatedAt: stableGeneratedAt(),
  offlineRuntime: true,
  fileCount: files.length,
  totalBytes: files.reduce((total, file) => total + file.bytes, 0),
  aggregateSha256: crypto.createHash('sha256').update(files.map(file => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join('')).digest('hex'),
  files
};

fs.writeFileSync(
  path.join(root, 'data', 'asset-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
);

console.log(`已生成资源清单：${manifest.fileCount} 个文件，${manifest.totalBytes} 字节`);
