import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { applyFrontalPortraits } from '../atlas/scripts/portrait-additions.mjs';

test('frontal replacement preserves identity and original reference; incomplete or altered review is rejected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'frontal-review-'));
  try {
    fs.mkdirSync(path.join(root, 'data'));
    fs.mkdirSync(path.join(root, 'assets/portraits/20261004/frontal'), { recursive: true });
    const source = fs.readFileSync(new URL('../atlas/assets/portraits/20261004/001-2eff13255f25.png', import.meta.url));
    const sourcePath = './assets/portraits/original.png';
    const outputPath = './assets/portraits/20261004/frontal/revised.png';
    fs.writeFileSync(path.join(root, sourcePath), source);
    fs.writeFileSync(path.join(root, outputPath), source);
    const hash = crypto.createHash('sha256').update(source).digest('hex');
    const assets = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`portrait:${i}`, {
      portraitId: `portrait:${i}`, personId: `person:${i}`, src: sourcePath, assetPath: sourcePath,
      designRef: { nodeId: `${i}:1` }, portraitKind: 'original',
    }]));
    const records = Object.values(assets).map(asset => ({
      portraitId: asset.portraitId, personId: asset.personId, originalSrc: sourcePath, originalSha256: hash,
      action: 'replace', assetPath: outputPath, sha256: hash, bytes: source.length,
      width: source.readUInt32BE(16), height: source.readUInt32BE(20), designAge: 40,
      ageBasis: 'Art depicts an adult stage; no biographical age assertion.',
      visualReview: { frontal: true, directGaze: true, shouldersFrontal: true, ageAppropriate: true },
    }));
    const ledger = { status: 'complete', expectedCount: 500, records };
    const file = path.join(root, 'data/portrait-frontal-production-20261004.json');
    const run = data => {
      fs.writeFileSync(file, JSON.stringify(data));
      const clone = structuredClone(assets); applyFrontalPortraits(root, clone); return clone;
    };
    const revised = run(ledger);
    assert.equal(revised['portrait:0'].personId, 'person:0');
    assert.equal(revised['portrait:0'].src, outputPath);
    assert.equal(revised['portrait:0'].originalSrc, sourcePath);
    assert.equal(revised['portrait:0'].assetPath, sourcePath);
    assert.deepEqual(revised['portrait:0'].designRef, assets['portrait:0'].designRef);
    assert.equal(revised['portrait:0'].frontalArtwork.designRef, null);
    assert.throws(() => run({ ...ledger, records: records.slice(1) }), /full 500/);
    for (const alteration of [
      { personId: 'person:wrong' }, { originalSha256: '0'.repeat(64) },
      { visualReview: { frontal: false, directGaze: true, ageAppropriate: true } },
      { visualReview: { frontal: true, directGaze: true, shouldersFrontal: false, ageAppropriate: true } },
      { action: 'retain', visualReview: { frontal: true, directGaze: true, ageAppropriate: false } },
    ]) {
      assert.throws(() => run({ ...ledger, records: [{ ...records[0], ...alteration }, ...records.slice(1)] }));
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
