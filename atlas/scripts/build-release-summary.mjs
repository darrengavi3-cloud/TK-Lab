import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readReleaseConfig } from './release-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const config = readReleaseConfig(root);
const people = json('v63-reader-people.json').people;
const portraits = json('portrait-manifest.json');
const ledger = json('v73-review-status-ledger.json');
const summary = {
  schemaVersion: 1, version: config.version, reviewBaseline: config.reviewBaseline,
  audience: config.audience,
  counts: {
    people: people.length,
    appointments: ledger.modules.find(row => row.key === 'appointments').counts,
    biographies: people.filter(row => row.bio?.trim()).length,
    portraitAssets: Object.values(portraits.assetsById).filter(row => row.status === 'ready').length,
    peopleWithPortraits: people.filter(row => row.portraitIds?.length).length,
    peopleWithEvents: json('v69-person-profiles.json').summary.peopleWithLifeEvents
  },
  evidencePolicy: 'Generated source summary only; deployment, access and visual acceptance require separate dated receipts.'
};
const metadataRoot = path.join(root, '..', 'release-metadata');
fs.mkdirSync(metadataRoot, { recursive: true });
fs.writeFileSync(path.join(metadataRoot, 'current-release.json'), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'assets/app/release-version.js'), `export const RELEASE_VERSION = ${JSON.stringify(config.version)};\n`);
const readmePath = path.join(root, '..', 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');
const start = '<!-- current-reviewed-counts:start -->';
const end = '<!-- current-reviewed-counts:end -->';
if (readme.split(start).length !== 2 || readme.split(end).length !== 2 || readme.indexOf(start) >= readme.indexOf(end)) {
  throw new Error('README current reviewed count markers are missing or ambiguous');
}
const c = summary.counts;
const table = [start, '| 项目 | 当前审定数量 |', '| --- | ---: |',
  `| 读者人物 | ${c.people} 人 |`, `| 任官已核 | ${c.appointments.verified} 条 |`,
  `| 任官待补核 | ${c.appointments.pending} 条 |`, `| 任官存疑 | ${c.appointments.disputed} 条 |`,
  `| 任官排除 | ${c.appointments.suppressed} 条 |`, `| 实质小传 | ${c.biographies} 篇 |`,
  `| 正式立绘 | ${c.portraitAssets} 项 |`, end].join('\n');
fs.writeFileSync(readmePath, readme.slice(0, readme.indexOf(start)) + table + readme.slice(readme.indexOf(end) + end.length));
console.log(JSON.stringify(summary.counts));
