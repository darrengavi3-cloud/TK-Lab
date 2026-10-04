import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadReviewedReaderScope } from './person-identity-publication.mjs';

export const portraitAdditionKind = 'ui-illustration-20261004';
export const portraitAdditionId = order => `portrait:20261004:${String(order).padStart(3, '0')}`;
function checkImage(root, row) {
  if (!/^\.\/assets\/portraits\/20261004\/(?:frontal\/)?[a-z0-9-]+\.png$/.test(row.assetPath)) throw new Error('Unsafe portrait path');
  const bytes = fs.readFileSync(path.join(root, row.assetPath));
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== row.sha256 || bytes.length !== row.bytes) throw new Error('Portrait integrity mismatch');
  if (bytes.length < 24 || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.readUInt32BE(16) !== row.width || bytes.readUInt32BE(20) !== row.height) throw new Error('Invalid portrait PNG');
  if (row.visualReview?.frontal !== true || row.visualReview?.directGaze !== true || row.visualReview?.shouldersFrontal !== true || row.visualReview?.ageAppropriate !== true) throw new Error('Portrait visual acceptance missing');
}
export function loadPortraitAdditions(root) {
  const file = path.join(root,'data/portrait-production-20261004.json');
  if (!fs.existsSync(file)) return [];
  const ledger = JSON.parse(fs.readFileSync(file,'utf8'));
  if (ledger.status !== 'complete' || ledger.expectedCount !== 100 || ledger.records?.length !== 100) throw new Error('Requires 100 completed independent illustrations');
  const people = new Map(loadReviewedReaderScope(root).map(row => [row.personId,row.name]));
  const ids = new Set(), hashes = new Set();
  ledger.records.forEach((row,index) => {
    if (row.order !== index+1 || row.status !== 'ready' || people.get(row.personId) !== row.name || ids.has(row.personId) || hashes.has(row.sha256)) throw new Error('Invalid new portrait identity/order');
    checkImage(root,row);
    if (row.height <= row.width || row.width < 512 || !Number.isInteger(row.designAge) || !row.ageBasis) throw new Error('New portrait composition/age missing');
    ids.add(row.personId); hashes.add(row.sha256);
  });
  return ledger.records;
}
export function applyFrontalPortraits(root, assetsById) {
  const file = path.join(root,'data/portrait-frontal-production-20261004.json');
  if (!fs.existsSync(file)) return;
  const ledger = JSON.parse(fs.readFileSync(file,'utf8'));
  const old = Object.values(assetsById).filter(row => row.portraitKind !== portraitAdditionKind);
  if (ledger.status !== 'complete' || ledger.expectedCount !== 500 || ledger.records?.length !== 500 || old.length !== 500) throw new Error('Requires full 500-portrait frontal review');
  const redrawPlan = JSON.parse(fs.readFileSync(path.join(root, 'data/portrait-independent-redraw-20261004.json'), 'utf8'));
  const redrawIds = new Set(redrawPlan.records.map(row => row.portraitId));
  if (redrawPlan.expectedCount !== 150 || redrawIds.size !== 150 || [...redrawIds].some(id => !assetsById[id])) throw new Error('Invalid independent redraw scope');
  const ids = new Set();
  for (const row of ledger.records) {
    const asset = assetsById[row.portraitId];
    if (!asset || asset.portraitKind === portraitAdditionKind || row.personId !== asset.personId || row.originalSrc !== asset.src || ids.has(row.portraitId)) throw new Error('Frontal portrait identity/source mismatch');
    const sourcePath = path.resolve(root, row.originalSrc);
    if (!sourcePath.startsWith(path.resolve(root, 'assets/portraits') + path.sep)) throw new Error('Unsafe original portrait path');
    const original = fs.readFileSync(sourcePath);
    if (crypto.createHash('sha256').update(original).digest('hex') !== row.originalSha256) throw new Error('Original portrait integrity mismatch');
    if (!Number.isInteger(row.designAge) || row.designAge < 1 || !row.ageBasis || row.visualReview?.ageAppropriate !== true) throw new Error('Frontal portrait age review missing');
    if (redrawIds.has(row.portraitId) && (row.action !== 'replace' || row.productionMethod !== 'independent-redraw' || row.width < 512 || Math.abs(row.width / row.height - 9 / 16) > 0.03 || row.visualReview?.independentSinglePerson !== true || row.visualReview?.completeCrown !== true || row.visualReview?.completeHands !== true || row.visualReview?.standingComposition !== true)) throw new Error('Early cropped portrait requires independent standing redraw');
    if (row.action === 'replace') {
      checkImage(root,row);
      asset.originalSrc = asset.src;
      asset.src = row.assetPath;
      asset.frontalArtwork = { interfaceOnly:true, sourceSha256:row.sha256, originalSha256:row.originalSha256, designRef:null };
    } else if (row.action !== 'retain' || row.visualReview?.frontal !== true || row.visualReview?.directGaze !== true || row.visualReview?.shouldersFrontal !== true) throw new Error('Invalid retained frontal portrait');
    ids.add(row.portraitId);
  }
}
