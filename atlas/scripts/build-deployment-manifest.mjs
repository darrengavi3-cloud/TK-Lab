import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const exportsDir = path.join(root, 'exports');
const readerDir = path.join(exportsDir, '观史台-读者版');
const manifestPath = path.join(exportsDir, 'deployment-manifest.json');
const sourceLockPath = path.join(root, 'sources.lock.json');
const requiredStandalone = [
  path.join(exportsDir, '观史台-轻量单文件版.html'),
  path.join(exportsDir, '观史台-离线版.zip')
];
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function listFiles(directory) {
  const result = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => compareText(a.name, b.name))) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) result.push(fullPath);
    }
  }
  visit(directory);
  return result;
}

if (!fs.existsSync(sourceLockPath)) throw new Error('缺少 sources.lock.json，不得生成无输入锁的部署清单');
if (!fs.existsSync(readerDir)) throw new Error('缺少 exports/观史台-读者版，请先运行 build-reader-bundle.mjs');
for (const required of requiredStandalone) {
  if (!fs.existsSync(required)) throw new Error(`缺少发布产物 ${path.relative(root, required)}`);
}

const filePaths = [
  ...listFiles(readerDir),
  ...requiredStandalone
];
const files = filePaths.map(filePath => {
  const buffer = fs.readFileSync(filePath);
  return {
    path: path.relative(root, filePath).split(path.sep).join('/'),
    bytes: buffer.length,
    sha256: sha256(buffer)
  };
}).sort((a, b) => compareText(a.path, b.path));
const sourceLockBuffer = fs.readFileSync(sourceLockPath);
const manifest = {
  schemaVersion: 1,
  modelId: 'sgz-deployment-manifest-v64',
  canonicalInputRoot: '.',
  deploymentRoot: 'exports/观史台-读者版',
  readerBundleManifest: 'exports/观史台-读者版/reader-bundle.json',
  syncDirection: 'canonical-to-generated-site-only',
  syncPolicy: '站点只按 reader-bundle.json 单向同步读者包；public/legacy 与站点镜像是可重建产物，不得人工编辑或反向覆盖规范源。',
  sourceLockSha256: sha256(sourceLockBuffer),
  fileCount: files.length,
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  aggregateSha256: sha256(files.map(file => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join('')),
  files
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const roundTrip = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const item of roundTrip.files) {
  const filePath = path.join(root, item.path);
  if (!fs.existsSync(filePath)) throw new Error(`部署清单记录已缺失：${item.path}`);
  const buffer = fs.readFileSync(filePath);
  if (buffer.length !== item.bytes || sha256(buffer) !== item.sha256) throw new Error(`部署清单不匹配：${item.path}`);
}
console.log(`已生成部署清单：${manifest.fileCount} 个文件，${manifest.totalBytes} 字节`);
console.log(`部署聚合哈希：${manifest.aggregateSha256}`);
