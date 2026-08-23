import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const projectRoot = process.cwd();
const legacyRoot = path.join(projectRoot, 'dist', 'client', 'legacy');
const portraitsRoot = path.join(legacyRoot, 'assets', 'portraits');

if (!fs.existsSync(legacyRoot)) {
  throw new Error(`Sites build output missing: ${legacyRoot}`);
}

const manifestPath = path.join(legacyRoot, 'data', 'portrait-manifest.json');
const portraitsIndexPath = path.join(legacyRoot, 'data', 'person-portraits.js');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(portraitsIndexPath, 'utf8'), context, {
  filename: portraitsIndexPath,
});

const runtimePortraits = new Set();
const registerPortrait = (src) => {
  if (typeof src !== 'string' || !src.startsWith('./assets/portraits/')) return;
  runtimePortraits.add(path.normalize(src.slice(2)));
};

for (const portrait of Object.values(context.window.SGZ_PERSON_PORTRAITS || {})) {
  registerPortrait(portrait?.src);
}
for (const personId of manifest.defaultPersonIds || []) {
  registerPortrait(manifest.byPersonId?.[personId]?.src);
}
registerPortrait(manifest.summary?.dengAiSrc);

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

const missingAfterPrune = [...runtimePortraits].filter(
  (relativePath) => !fs.existsSync(path.join(legacyRoot, relativePath)),
);
if (missingAfterPrune.length) {
  throw new Error(`Runtime portraits missing after prune: ${missingAfterPrune.join(', ')}`);
}

console.log(
  `Sites build pruned: kept ${runtimePortraits.size} runtime portraits, removed ${removedFiles} files (${removedBytes} bytes).`,
);
