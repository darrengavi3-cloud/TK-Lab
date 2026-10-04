import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { portraitAdditionKind, portraitAdditionId } from './portrait-additions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.dirname(root);
const input = process.argv[2];
if (!input) throw new Error('Supply the completed portrait production directory');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const candidates = read(path.join(project, 'research/portrait-additions-20261004/candidates.json')).records;
const acceptance = read(path.join(project, 'research/portrait-additions-20261004/visual-review-progress.json')).accepted;
const reviewed = new Map(acceptance.map(row => [`${row.kind}:${row.order}`, row]));
const newImages = read(path.join(input, 'production.json'));
const oldImages = read(path.join(input, 'frontal-production.json')).records;
const manifest = read(path.join(root, 'data/portrait-manifest.json'));
const oldAssets = Object.values(manifest.assetsById).filter(row => row.portraitKind !== portraitAdditionKind);
if (newImages.length !== 100 || oldImages.length !== 500 || oldAssets.length !== 500 || reviewed.size !== 600) {
  throw new Error('Finalization requires100 new images,500 original revisions, and600 visual acceptances');
}
const byOrder = new Map(newImages.map(row => [row.order, row]));
const byPortrait = new Map(oldImages.map(row => [row.portraitId, row]));
if (byOrder.size !== 100 || byPortrait.size !== 500) throw new Error('Duplicate production identity');
const copies = [];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function prepared(row, kind, order, expectedPersonId, assetPath, copy = true) {
  if (!row || row.personId !== expectedPersonId || !['ready', 'complete'].includes(row.status)) throw new Error('Production identity/status mismatch');
  const bytes = fs.readFileSync(row.path);
  const sha256 = hash(bytes);
  const review = reviewed.get(`${kind}:${order}`);
  if (sha256 !== row.sha256 || review?.sha256 !== sha256 || review.personId !== expectedPersonId) throw new Error('Review does not match actual image/identity');
  if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Expected PNG image');
  const visualReview = review.visualReview;
  if (['frontal','directGaze','shouldersFrontal','ageAppropriate'].some(key => visualReview?.[key] !== true)) throw new Error('Missing visual acceptance');
  if (copy) copies.push({ source: row.path, target: path.join(root, assetPath) });
  return { assetPath, sha256, bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), status: 'ready', visualReview };
}
const additions = candidates.map(candidate => {
  const row = byOrder.get(candidate.order);
  if (row?.name !== candidate.name) throw new Error('New portrait name mismatch');
  return { ...prepared(row, 'new', candidate.order, candidate.personId, `./assets/portraits/20261004/${candidate.outputStem}.png`),
    order: candidate.order, portraitId: portraitAdditionId(candidate.order), personId: candidate.personId,
    name: candidate.name, polity: candidate.polity, designAge: candidate.designAge, ageBasis: candidate.ageBasis };
});
const revisions = oldAssets.map(asset => {
  const row = byPortrait.get(asset.portraitId);
  if (row?.name !== asset.name || !Number.isInteger(row.designAge) || !row.ageBasis) throw new Error('Original portrait name/age mismatch');
  const originalSrc = asset.originalSrc || asset.src;
  const originalSha256 = hash(fs.readFileSync(path.join(root, originalSrc)));
  if (originalSha256 !== row.originalSha256) throw new Error('Original source image changed');
  const filename = `${asset.portraitId.replace(/:/g, '-')}.png`;
  if (!/^[a-z0-9-]+\.png$/.test(filename)) throw new Error('Unsafe portrait identity');
  const retain = row.action === 'retain';
  if (retain && row.sha256 !== originalSha256) throw new Error('Retained image differs from original');
  return { ...prepared(row, 'existing', row.order, asset.personId, retain ? originalSrc : `./assets/portraits/20261004/frontal/${filename}`, !retain),
    order: row.order, portraitId: asset.portraitId, personId: asset.personId, name: asset.name,
    action: retain ? 'retain' : 'replace', originalSrc, originalSha256, designAge: row.designAge, ageBasis: row.ageBasis };
});
// Validate every record before writing either completed ledger.
for (const copy of copies) {
  fs.mkdirSync(path.dirname(copy.target), { recursive: true });
  fs.copyFileSync(copy.source, copy.target);
}
for (const [filename, expectedCount, records] of [
  ['portrait-production-20261004.json', 100, additions],
  ['portrait-frontal-production-20261004.json', 500, revisions],
]) {
  const target = path.join(root, 'data', filename);
  const staging = `${target}.tmp`;
  fs.writeFileSync(staging, JSON.stringify({ status: 'complete', expectedCount, records }, null, 2) + '\n');
  fs.renameSync(staging, target);
}
console.log('Finalized100 independent illustrations and500 frontal portrait revisions; original assets preserved.');
