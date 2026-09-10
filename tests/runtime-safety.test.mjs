import assert from 'node:assert/strict';
import test from 'node:test';
import { readerRequestGuard } from '../worker/reader-request-guard.ts';
import { transform, transformSync } from '@esbuild-kit/core-utils';

test('patched esbuild remains compatible with the Drizzle TypeScript loader', async () => {
  const source = 'const value: number = 41; export default value + 1;';
  const sync = transformSync(source, '/tmp/tk-lab-loader.cjs.ts');
  assert.ok(sync.code && sync.map);
  const result = await transform(source, '/tmp/tk-lab-loader.mts');
  const transformed = await import('data:text/javascript;base64,' + Buffer.from(result.code).toString('base64'));
  assert.equal(transformed.default, 42);
});

test('read-only Worker rejects unused image and action endpoints before consuming a body', () => {
  for (const path of ['/_vinext/image', '/_vinext/image/', '/_next/image', '/%5Fvinext/image', '/_next//image']) {
    const request = new Request('https://reader.test' + path + '?url=https://example.invalid/input.avif&w=640');
    assert.equal(readerRequestGuard(request)?.status, 404, path);
  }
  for (const header of ['next-action', 'x-rsc-action']) {
    assert.equal(readerRequestGuard(new Request('https://reader.test/', { headers: { [header]: 'unknown' } }))?.status, 405);
  }
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const request = new Request('https://reader.test/', { method, body: 'untrusted request body' });
    const response = readerRequestGuard(request);
    assert.equal(response?.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
    assert.equal(request.bodyUsed, false);
  }
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/', '/legacy/index.html', '/legacy/assets/portraits/person.png']) {
      assert.equal(readerRequestGuard(new Request('https://reader.test' + path, { method })), null);
    }
  }
});
