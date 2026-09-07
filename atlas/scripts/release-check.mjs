import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readReleaseConfig } from './release-config.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const includeHistorical = process.argv.includes('--include-historical');
const deterministicFiles = [
  '../README.md',
  '../release-metadata/current-release.json',
  'assets/app/release-version.js',
  'data/release-config.json',
  'data/reviewed-office-succession.json',
  'data/reviewed-office-succession.js',
  'sources.lock.json',
  'data/v60-person-workbook-import.json',
  'data/v60-person-workbook-import.js',
  'data/v61-person-supplements.json',
  'data/v61-person-supplements.js',
  'data/map-period-registry.js',
  'data/history-evidence.js',
  'assets/map/data/all-provinces-local.js',
  'assets/map/data/history-evidence.js',
  'data/v63-person-registry.json',
  'data/v63-person-registry.js',
  'data/v63-reader-people.json',
  'data/v63-reader-people.js',
  'data/v62-reader-scope.json',
  'data/v63-reader-person-relations.json',
  'data/v71-appointment-review.json',
  'data/v71-epigraphy-transcription-review.json',
  'data/v63-reader-person-relations.js',
  'data/v66-peerage-stages.json',
  'data/v66-peerage-stages.js',
  'data/v66-administrative-seat-periods.json',
  'data/v66-administrative-seat-periods.js',
  'data/v66-fangzhen-seat-audit.json',
  'data/v66-fangzhen-reader.json',
  'data/v66-fangzhen-reader.js',
  'data/v69-person-profiles.json',
  'data/v69-person-profiles.js',
  'data/v69-person-profile-audit.json',
  'data/v69-person-profile-audit.js',
  'data/v69-portrait-production.json',
  'data/v69-portrait-candidates.json',
  'data/v70-portrait-candidates.json',
  'data/v74-appointment-supplements.json',
  'data/v76-chancellery-evidence.json',
  'data/v76-appointment-source-review.json',
  'data/v76-appointment-supplements.json',
  'data/v76-person-biography-review.json',
  'data/v76-person-biography-corrections.json',
  'data/v75-chancellery-evidence.json',
  'data/v75-appointment-source-review.json',
  'data/v75-appointment-supplements.json',
  'data/v75-person-identity-suppressions.json',
  'data/v75-person-biography-review.json',

  'data/v74-appointment-source-review.json',
  'data/v74-chancellery-evidence.json',
  'data/v74-person-biography-review.json',
  'data/v73-portrait-candidates.json',
  'data/v73-figma-mapping.json',
  'data/v73-person-identity-suppressions.json',
  'data/v73-review-status-ledger.json',
  'data/v73-review-status-ledger.js',
  'data/portrait-manifest.json',
  'data/portrait-manifest.js',
  'data/v69-portrait-candidates.js',
  'data/v69-battle-person-links.json',
  'data/v69-battle-person-links.js',
  'data/v69-fangzhen-reader.json',
  'data/v69-fangzhen-reader.js',
  'data/v69-epigraphic-records.json',
  'data/v69-epigraphic-records.js',
  'data/v69-epigraphy-audit.json',
  'data/v69-epigraphy-audit.js',
  'data/v69-epigraphy-removals.json',
  'data/v69-epigraphy-search-cache.json',
  'data/asset-manifest.json',
  'exports/三国职官谱-单文件版.html',
  'exports/观史台-轻量单文件版.html',
  'exports/观史台-离线版.zip',
  'exports/deployment-manifest.json'
];
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function run(scriptName, args = []) {
  console.log(`\n▶ ${scriptName}${args.length ? ` ${args.join(' ')}` : ''}`);
  execFileSync(process.execPath, [path.join(scriptDir, scriptName), ...args], { cwd: root, stdio: 'inherit' });
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
  if (fs.existsSync(directory)) visit(directory);
  return result;
}

function snapshotOutputs() {
  const paths = [
    ...deterministicFiles.map(relative => path.join(root, relative)),
    ...listFiles(path.join(root, 'exports', '观史台-读者版'))
  ];
  const entries = paths.map(filePath => {
    if (!fs.existsSync(filePath)) throw new Error(`确定性快照缺少 ${path.relative(root, filePath)}`);
    const buffer = fs.readFileSync(filePath);
    return { path: path.relative(root, filePath).split(path.sep).join('/'), bytes: buffer.length, sha256: sha256(buffer) };
  }).sort((a, b) => compareText(a.path, b.path));
  return {
    entries,
    aggregateSha256: sha256(entries.map(item => `${item.path}\0${item.bytes}\0${item.sha256}\n`).join(''))
  };
}

run('build-all.mjs');
const first = snapshotOutputs();
run('build-all.mjs');
const second = snapshotOutputs();
if (first.aggregateSha256 !== second.aggregateSha256 || JSON.stringify(first.entries) !== JSON.stringify(second.entries)) {
  const firstByPath = new Map(first.entries.map(item => [item.path, item]));
  const changed = second.entries.filter(item => firstByPath.get(item.path)?.sha256 !== item.sha256).map(item => item.path);
  throw new Error(`连续两次构建不确定：${changed.join('、') || '产物清单变化'}`);
}
console.log(`\n✓ 连续两次构建哈希一致：${second.aggregateSha256}`);

const currentValidators = Array.from(new Set([
  'verify-project.mjs',
  'verify-v71.mjs',
  'verify-map-data.mjs',
  'verify-historical-model.mjs',
  'verify-research-model.mjs',
  'verify-v63.mjs',
  ...fs.readdirSync(scriptDir).filter(fileName => /^verify-v64(?:[-.].*)?\.mjs$/.test(fileName)).sort(),
  ...fs.readdirSync(scriptDir).filter(fileName => /^verify-v65(?:[-.].*)?\.mjs$/.test(fileName)).sort(),
  ...fs.readdirSync(scriptDir).filter(fileName => /^verify-v66(?:[-.].*)?\.mjs$/.test(fileName)).sort(),
  ...fs.readdirSync(scriptDir).filter(fileName => /^verify-v67(?:[-.].*)?\.mjs$/.test(fileName)).sort(),
  ...fs.readdirSync(scriptDir).filter(fileName => /^verify-v68(?:[-.].*)?\.mjs$/.test(fileName)).sort(),
  ...fs.readdirSync(scriptDir).filter(fileName => /^verify-v69(?:[-.].*)?\.mjs$/.test(fileName)).sort(),
  ...fs.readdirSync(scriptDir).filter(fileName => /^verify-v70(?:[-.].*)?\.mjs$/.test(fileName)).sort()
  ,...fs.readdirSync(scriptDir).filter(fileName => /^verify-v73(?:[-.].*)?\.mjs$/.test(fileName)).sort()
])).filter(fileName => fs.existsSync(path.join(scriptDir, fileName)));
for (const validator of currentValidators) run(validator);

if (includeHistorical) {
  const historicalValidators = Array.from({ length: 22 }, (_, index) => `verify-v${41 + index}.mjs`)
    .filter(fileName => fs.existsSync(path.join(scriptDir, fileName)));
  console.log('\n历史快照审计已显式启用；V41—V62 的旧规则不作为当前发布门禁。');
  const driftedSnapshots = [];
  for (const validator of historicalValidators) {
    try {
      run(validator);
    } catch (error) {
      driftedSnapshots.push(validator);
      console.error(`历史快照漂移：${validator}`);
    }
  }
  if (driftedSnapshots.length) {
    throw new Error(`历史快照审计发现 ${driftedSnapshots.length} 项漂移（不属于默认发布门禁）：${driftedSnapshots.join('、')}`);
  }
}

console.log(`\n${readReleaseConfig(root).version} release:check 全部通过。`);
console.log(`双重构建哈希：${second.aggregateSha256}`);
console.log(`当前不变量验证：${currentValidators.length} 项`);
console.log(`历史快照验证：${includeHistorical ? '已显式执行' : '未执行（使用 --include-historical 单独审计）'}`);
console.log('注意：本命令不调用 Sites，也不修改站点权限。');
