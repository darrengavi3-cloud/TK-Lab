import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const projectRoot = process.cwd();
const legacyRoot = path.join(projectRoot, 'dist', 'client', 'legacy');
const portraitsRoot = path.join(legacyRoot, 'assets', 'portraits');

if (!fs.existsSync(legacyRoot)) {
  throw new Error(`Sites build output missing: ${legacyRoot}`);
}

const manifestPath = path.join(legacyRoot, 'data', 'portrait-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const runtimePortraits = new Set();
const registerPortrait = (src) => {
  if (typeof src !== 'string' || !src.startsWith('./assets/portraits/')) return;
  runtimePortraits.add(path.normalize(src.slice(2)));
};

for (const personId of manifest.defaultPersonIds || []) {
  registerPortrait(manifest.byPersonId?.[personId]?.src);
}
registerPortrait(manifest.summary?.dengAiSrc);
for (const portrait of Object.values(manifest.assetsById || {})) {
  if (portrait?.status === 'ready') registerPortrait(portrait.assetPath || portrait.src);
}

const missingBeforePrune = [...runtimePortraits].filter(
  (relativePath) => !fs.existsSync(path.join(legacyRoot, relativePath)),
);
if (missingBeforePrune.length) {
  throw new Error(`Runtime portraits missing before prune: ${missingBeforePrune.join(', ')}`);
}

let removedFiles = 0;
let removedBytes = 0;
const removeFile = (filePath) => {
  const stat = fs.statSync(filePath);
  removedBytes += stat.size;
  removedFiles += 1;
  fs.rmSync(filePath);
};

const walkFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];
  if (!fs.statSync(directory).isDirectory()) return [directory];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(target) : [target];
  });
};

for (const filePath of walkFiles(portraitsRoot)) {
  const relativePath = path.normalize(path.relative(legacyRoot, filePath));
  if (!runtimePortraits.has(relativePath)) removeFile(filePath);
}

const deploymentOnlyExclusions = [
  'backups',
  'docs',
  'scripts',
  'templates',
  'DESIGN.md',
  'DEV_STATE.md',
  'README.md',
  'UX-CONTRACT.md',
  'wk-repro.html',
];
for (const relativePath of deploymentOnlyExclusions) {
  const target = path.join(legacyRoot, relativePath);
  if (!fs.existsSync(target)) continue;
  for (const filePath of walkFiles(target)) {
    const stat = fs.statSync(filePath);
    removedBytes += stat.size;
    removedFiles += 1;
  }
  fs.rmSync(target, { recursive: true, force: true });
}

const siteClientRoot = path.join(projectRoot, 'dist', 'client');
const publicOnlyExclusions = [
  path.join(siteClientRoot, '三国职官谱 .html'),
  path.join(legacyRoot, 'exports'),
];
for (const target of publicOnlyExclusions) {
  if (!fs.existsSync(target)) continue;
  for (const filePath of walkFiles(target)) {
    const stat = fs.statSync(filePath);
    removedBytes += stat.size;
    removedFiles += 1;
  }
  fs.rmSync(target, { recursive: true, force: true });
}

const missingAfterPrune = [...runtimePortraits].filter(
  (relativePath) => !fs.existsSync(path.join(legacyRoot, relativePath)),
);
if (missingAfterPrune.length) {
  throw new Error(`Runtime portraits missing after prune: ${missingAfterPrune.join(', ')}`);
}

let optimizedPortraits = 0;
let optimizedBytes = 0;
for (const relativePath of runtimePortraits) {
  const filePath = path.join(legacyRoot, relativePath);
  const extension = path.extname(filePath).toLowerCase();
  if (extension !== '.png') {
    throw new Error(`Unsupported runtime portrait format: ${relativePath}`);
  }

  const input = fs.readFileSync(filePath);
  const metadata = await sharp(input, { failOn: 'error' }).metadata();
  const maxDimension = Math.max(metadata.width || 0, metadata.height || 0);
  if (maxDimension <= 192) continue;

  const output = await sharp(input, { failOn: 'error' })
    .resize({ width: 192, height: 192, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  fs.writeFileSync(filePath, output);
  optimizedPortraits += 1;
  optimizedBytes += Math.max(0, input.length - output.length);
}

const deploymentRoot = path.join(projectRoot, 'dist');
const deploymentManifestPath = path.join(deploymentRoot, 'deployment-manifest.json');
const releaseMetadataRoot = path.join(projectRoot, 'release-metadata');
const deploymentFiles = walkFiles(deploymentRoot)
  .filter((filePath) => filePath !== deploymentManifestPath)
  .map((filePath) => {
    const bytes = fs.statSync(filePath).size;
    const sha256 = createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    return {
      path: path.relative(deploymentRoot, filePath).split(path.sep).join('/'),
      bytes,
      sha256,
    };
  })
  .sort((left, right) => left.path.localeCompare(right.path, 'en'));
const aggregateSha256 = createHash('sha256')
  .update(deploymentFiles.map((item) => `${item.path}\0${item.bytes}\0${item.sha256}\n`).join(''))
  .digest('hex');
const deploymentManifest = {
  schemaVersion: 2,
  manifestKind: 'post-prune-deployment',
  files: deploymentFiles,
  aggregateSha256,
  summary: {
    fileCount: deploymentFiles.length,
    totalBytes: deploymentFiles.reduce((sum, item) => sum + item.bytes, 0),
  },
};
fs.writeFileSync(deploymentManifestPath, `${JSON.stringify(deploymentManifest, null, 2)}\n`);
fs.mkdirSync(releaseMetadataRoot, { recursive: true });
fs.copyFileSync(deploymentManifestPath, path.join(releaseMetadataRoot, 'deployment-manifest.json'));

console.log(
  `Sites build pruned: kept ${runtimePortraits.size} runtime portraits; removed ${removedFiles} files (${removedBytes} bytes); optimized ${optimizedPortraits} portraits (${optimizedBytes} bytes); deployment manifest ${deploymentFiles.length} files (${aggregateSha256}).`,
);
