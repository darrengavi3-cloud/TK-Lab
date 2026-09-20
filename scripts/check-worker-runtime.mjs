import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const root = path.resolve('dist/server');
const config = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.json'), 'utf8'));
const files = fs.readdirSync(root, { recursive: true }).filter(p => /\.m?js$/.test(p)).sort((a, b) => a === 'index.js' ? -1 : b === 'index.js' ? 1 : a.localeCompare(b));
const modules = files.map(p => ({ type: 'ESModule', path: path.join(root, p), contents: fs.readFileSync(path.join(root, p), 'utf8') }));
const mf = new Miniflare(convertV4MiniflareOptions({
  modules, modulesRoot: root, compatibilityDate: config.compatibility_date, compatibilityFlags: config.compatibility_flags,
  assets: { directory: path.resolve(root, config.assets.directory), ...(config.assets.binding ? { binding: config.assets.binding } : {}), run_worker_first: config.assets.run_worker_first ?? false, routerConfig: { has_user_worker: true } },
  host: '127.0.0.1', port: 0, d1Databases: ['DB'], r2Buckets: ['BUCKET'], bindings: { ADMIN_OWNER_ID: 'runtime-owner-fixture' },
}));
try {
  const db = await mf.getD1Database('DB');
  for (const file of fs.readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) for (const sql of fs.readFileSync('drizzle/' + file, 'utf8').split('--> statement-breakpoint').filter(s => s.trim())) await db.prepare(sql).run();
  for (const [url, init, expected] of [
    ['/', {}, 200],
    ['/admin', {}, 401],
    ['/api/admin/session', {}, 401],
    ['/api/admin/session', { headers: { 'oai-authenticated-user-id': 'other-fixture' } }, 403],
    ['/api/admin/session', { headers: { 'oai-authenticated-user-id': 'runtime-owner-fixture' } }, 200],
    ['/api/admin/bootstrap', { method: 'POST', headers: { 'oai-authenticated-user-id': 'runtime-owner-fixture', origin: 'http://localhost', 'x-catalogue-request': '1' }, body: '{}' }, 200],
    ['/api/admin/backup', { headers: { 'oai-authenticated-user-id': 'runtime-owner-fixture' } }, 200],
    ['/api/admin/records', { method: 'POST', headers: { 'oai-authenticated-user-id': 'runtime-owner-fixture', origin: 'https://foreign.example', 'x-catalogue-request': '1' }, body: '{}' }, 403],
    ['/reader/current', { method: 'POST', body: '{}' }, 405],
    ['/legacy/index.html', {}, 200],
    ['/_vinext/image?url=https://example.org/test', {}, 404],
    ['/_next/image?url=https://example.org/test', {}, 404],
    ['/%5Fvinext/image?url=https://example.org/test', {}, 404],
    ['/_next//image?url=https://example.org/test', {}, 404],
    ['/', { method: 'POST', body: 'invalid' }, 405],
    ['/legacy/index.html', { method: 'POST', body: 'invalid' }, 405],
    ['/', { headers: { 'next-action': 'test' } }, 405],
    ['/', { headers: { 'x-rsc-action': 'test' } }, 405],
  ]) {
    const response = await mf.dispatchFetch('http://localhost' + url, init);
    console.log(init.method || 'GET', url, response.status);
    const body = url === '/api/admin/backup' ? gunzipSync(new Uint8Array(await response.arrayBuffer())).toString('utf8') : await response.text();
    assert.equal(response.status, expected);
    if (url === '/api/admin/bootstrap') {
      const job = JSON.parse(body);
      assert.equal(job.total, 7155, 'the packaged private baseline must initialize through the owner API');
      assert.equal(job.state, 'staging');
    }
    if (url === '/api/admin/backup') {
      const lines = body.trimEnd().split('\n');
      assert.equal(JSON.parse(lines[0]).format, 'guanshitai-backup-3');
      assert.equal(JSON.parse(lines.at(-1)).type, 'complete', 'the built Worker must stream a complete compressed backup');
      assert.match(response.headers.get('content-disposition'), /attachment/);
    }
  }
} finally {
  await mf.dispose();
}
