import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const lockPath = path.join(root, 'sources.lock.json');
const refreshLock = process.argv.includes('--refresh-lock');
const skipPortable = process.argv.includes('--skip-portable');
const defaultSourceDateEpoch = 1788019200; // 2026-08-30T00:00:00+08:00
function cliOption(name) {
  const exact = process.argv.find(argument => argument.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}
const workbookInputs = [
  {
    logicalPath: 'external-inputs/v60-people-workbook.xlsx',
    filePath: cliOption('--v60-workbook') || process.env.SGZ_V60_WORKBOOK || ''
  },
  {
    logicalPath: 'external-inputs/v61-snapshot-260.xlsx',
    filePath: cliOption('--v61-snapshot-workbook') || process.env.SGZ_V61_SNAPSHOT_WORKBOOK || ''
  },
  {
    logicalPath: 'external-inputs/v61-wei-peerage.xlsx',
    filePath: cliOption('--v61-peerage-workbook') || process.env.SGZ_V61_PEERAGE_WORKBOOK || ''
  }
];
const generatedInputs = new Set([
  'data/asset-manifest.json',
  'data/map-period-registry.js',
  'data/history-evidence.js',
  'assets/map/data/all-provinces-local.js',
  'assets/map/data/history-evidence.js'
]);
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function listSourceInputs() {
  const files = [];
  const roots = ['assets', 'data', 'scripts'];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => compareText(a.name, b.name))) {
      if (entry.name === '.DS_Store' || entry.name === 'node_modules') continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  }
  for (const relative of roots) visit(path.join(root, relative));
  for (const relative of ['index.html', 'DESIGN.md', 'UX-CONTRACT.md']) {
    const fullPath = path.join(root, relative);
    if (fs.existsSync(fullPath)) files.push(fullPath);
  }
  return files
    .map(fullPath => path.relative(root, fullPath).split(path.sep).join('/'))
    .filter(relative => !generatedInputs.has(relative))
    .sort(compareText);
}

function buildLock(sourceDateEpoch, previousLock = null) {
  const files = listSourceInputs().map(relative => {
    const buffer = fs.readFileSync(path.join(root, relative));
    return { path: relative, bytes: buffer.length, sha256: sha256(buffer) };
  });
  for (const input of workbookInputs) {
    if (fs.existsSync(input.filePath)) {
      const buffer = fs.readFileSync(input.filePath);
      files.push({ path: input.logicalPath, bytes: buffer.length, sha256: sha256(buffer) });
      continue;
    }
    const locked = (previousLock?.files || []).find(file => file.path === input.logicalPath);
    if (!locked) {
      throw new Error(`外部工作簿不可用，且 sources.lock.json 未登记 ${input.logicalPath}`);
    }
    files.push({ path: locked.path, bytes: locked.bytes, sha256: locked.sha256 });
  }
  files.sort((a, b) => compareText(a.path, b.path));
  return {
    schemaVersion: 1,
    modelId: 'sgz-deterministic-source-lock-v64',
    sourceDateEpoch,
    sourceDate: new Date(sourceDateEpoch * 1000).toISOString(),
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    aggregateSha256: sha256(files.map(file => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join('')),
    files
  };
}

function compareLock(expected, actual) {
  const expectedByPath = new Map((expected.files || []).map(file => [file.path, file]));
  const actualByPath = new Map((actual.files || []).map(file => [file.path, file]));
  const changes = [];
  for (const filePath of new Set([...expectedByPath.keys(), ...actualByPath.keys()])) {
    const before = expectedByPath.get(filePath);
    const after = actualByPath.get(filePath);
    if (!before) changes.push(`+ ${filePath}`);
    else if (!after) changes.push(`- ${filePath}`);
    else if (before.sha256 !== after.sha256 || before.bytes !== after.bytes) changes.push(`~ ${filePath}`);
  }
  return changes.sort();
}

function run(scriptName, args = []) {
  console.log(`\n▶ ${scriptName}${args.length ? ` ${args.join(' ')}` : ''}`);
  execFileSync(process.execPath, [path.join(scriptDir, scriptName), ...args], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, SOURCE_DATE_EPOCH: String(sourceDateEpoch) }
  });
}

let existingLock = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, 'utf8')) : null;
const sourceDateEpoch = Number(existingLock?.sourceDateEpoch || process.env.SOURCE_DATE_EPOCH || defaultSourceDateEpoch);
if (!Number.isFinite(sourceDateEpoch) || sourceDateEpoch <= 0) throw new Error('sources.lock.json 的 sourceDateEpoch 无效');

for (const input of workbookInputs.filter(item => fs.existsSync(item.filePath))) {
  const locked = (existingLock?.files || []).find(file => file.path === input.logicalPath);
  if (locked && !refreshLock) {
    const buffer = fs.readFileSync(input.filePath);
    if (buffer.length !== locked.bytes || sha256(buffer) !== locked.sha256) {
      throw new Error(`外部工作簿与输入锁不一致：${input.logicalPath}。请先审查，再使用 --refresh-lock。`);
    }
  }
}
const v60BuilderAvailable = fs.existsSync(path.join(scriptDir, 'build-v60-workbook-import.mjs'));
const v61BuilderAvailable = fs.existsSync(path.join(scriptDir, 'build-v61-person-supplements.mjs'));
if (fs.existsSync(workbookInputs[0].filePath) && v60BuilderAvailable) {
  run('build-v60-workbook-import.mjs', [workbookInputs[0].filePath]);
} else if (!fs.existsSync(path.join(root, 'data/v60-person-workbook-import.json'))) {
  throw new Error('缺少 V60 外部工作簿与已提交生成结果 data/v60-person-workbook-import.json');
} else {
  console.log('V60 工作簿未提供；使用已提交且受 sources.lock.json 保护的生成结果。');
}
if (fs.existsSync(workbookInputs[1].filePath) && fs.existsSync(workbookInputs[2].filePath) && v61BuilderAvailable) {
  run('build-v61-person-supplements.mjs', [workbookInputs[1].filePath, workbookInputs[2].filePath]);
} else if (!fs.existsSync(path.join(root, 'data/v61-person-supplements.json'))) {
  throw new Error('缺少 V61 外部工作簿与已提交生成结果 data/v61-person-supplements.json');
} else {
  console.log('V61 工作簿未全部提供；使用已提交且受 sources.lock.json 保护的生成结果。');
}
const optionalV63Builder = ['build-v63-person-registry.mjs', 'build-v63-person-data.mjs']
  .find(fileName => fs.existsSync(path.join(scriptDir, fileName)));
if (!optionalV63Builder) throw new Error('缺少 V63 person-registry 生成器；未登记字段不得静默放行。');
run(optionalV63Builder);
// V66 derives the public Cao Wei peerage links and time-scoped administrative
// seats before the source lock is evaluated. Both builders are deterministic,
// so their committed JSON/JS projections participate in the same input lock as
// the rest of the canonical data.
run('build-v66-peerage-stages.mjs');
run('build-v66-fangzhen-seats.mjs');
// Generate the public relation projection before the source lock is evaluated.
// This makes the canonical local reader and the exported reader consume the
// same committed, deterministic 179/535 fact payload.
run('build-reader-bundle.mjs', ['--relations-only']);
run('build-v69-data.mjs');
// Register any V69 portrait rows that have both a verified local 512x512
// asset and real Figma node IDs.  Frozen candidates remain excluded.
run('build-v46-portrait-manifest.mjs');

const currentLock = buildLock(sourceDateEpoch, existingLock);
if (refreshLock) {
  fs.writeFileSync(lockPath, `${JSON.stringify(currentLock, null, 2)}\n`, 'utf8');
  existingLock = currentLock;
  console.log(`已更新确定性输入锁：${currentLock.fileCount} 个文件，${currentLock.aggregateSha256}`);
} else {
  if (!existingLock) throw new Error('缺少 sources.lock.json。审核输入后运行 node scripts/build-all.mjs --refresh-lock。');
  const changes = compareLock(existingLock, currentLock);
  if (changes.length) {
    throw new Error(`规范源与 sources.lock.json 不一致：\n${changes.slice(0, 40).join('\n')}${changes.length > 40 ? `\n…共 ${changes.length} 项` : ''}\n请先审查变更，再显式执行 --refresh-lock。`);
  }
}

run('build-local-data.mjs');
run('build-reader-bundle.mjs');
if (!skipPortable) run('build-portable-export.mjs');
run('build-asset-manifest.mjs');
run('build-deployment-manifest.mjs');

console.log('\nV69 build-all 已完成。');
console.log(`输入锁：${existingLock.aggregateSha256}`);
console.log('产物：读者 Web 包／轻量单 HTML／离线 ZIP／本地资源清单／部署清单');
