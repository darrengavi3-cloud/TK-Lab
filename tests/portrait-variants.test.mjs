import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import sharp from 'sharp';

test('deployed responsive portraits preserve source identity and actual dimensions', async () => {
  const root = new URL('../dist/client/legacy/', import.meta.url);
  const context = { window: {} };
  vm.runInNewContext(await readFile(new URL('data/portrait-variants.js', root), 'utf8'), context);
  const entries = Object.entries(context.window.SGZ_PORTRAIT_VARIANTS.bySrc);
  assert.equal(entries.length, 519);
  for (const [src, record] of entries) {
    const original = await readFile(new URL('../atlas/' + src.slice(2), import.meta.url));
    assert.equal(createHash('sha256').update(original).digest('hex'), record.sourceSha256, src);
    const dimensions = await sharp(original).metadata();
    assert.ok(record.variants.length >= 1);
    const expectedSrcset = [];
    for (const variant of record.variants) {
      const buffer = await readFile(new URL(variant.src, root));
      const actual = await sharp(buffer).metadata();
      assert.equal(actual.format, 'webp');
      assert.equal(actual.width, variant.width);
      assert.equal(actual.height, variant.height);
      assert.ok(actual.width <= dimensions.width);
      assert.equal(buffer.length, variant.bytes);
      assert.equal(createHash('sha256').update(buffer).digest('hex'), variant.sha256);
      expectedSrcset.push(`${variant.src} ${variant.width}w`);
    }
    assert.equal(record.srcset, expectedSrcset.join(', '));
    await readFile(new URL(src, root)); // Original PNG remains a valid fallback.
  }
});
