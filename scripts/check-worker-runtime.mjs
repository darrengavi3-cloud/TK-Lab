import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const root = path.resolve('dist/server');
const config = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.json'), 'utf8'));
const files = fs.readdirSync(root, { recursive: true }).filter(p => /\.m?js$/.test(p)).sort((a, b) => a === 'index.js' ? -1 : b === 'index.js' ? 1 : a.localeCompare(b));
const modules = files.map(p => ({ type: 'ESModule', path: path.join(root, p), contents: fs.readFileSync(path.join(root, p), 'utf8') }));
const mf = new Miniflare(convertV4MiniflareOptions({
  modules, modulesRoot: root, compatibilityDate: config.compatibility_date, compatibilityFlags: config.compatibility_flags,
  assets: { directory: path.resolve(root, config.assets.directory), ...(config.assets.binding ? { binding: config.assets.binding } : {}), run_worker_first: config.assets.run_worker_first ?? false, routerConfig: { has_user_worker: true } },
  host: '127.0.0.1', port: 0,
}));
try {
  for (const [url, init, expected] of [
    ['/', {}, 200],
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
    await response.text();
    assert.equal(response.status, expected);
  }
} finally {
  await mf.dispose();
}
