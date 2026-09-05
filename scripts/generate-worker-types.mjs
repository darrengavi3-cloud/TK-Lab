import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Use the actual built Worker compatibility settings and Wrangler's bundled
// workerd generator. No Cloudflare account or remote API request is needed.
const config = 'dist/server/wrangler.json';
await readFile(config, 'utf8').catch(() => {
  throw new Error('Run npm run build before regenerating Worker runtime types.');
});
process.env.WRANGLER_SEND_METRICS = 'false';
process.env.WRANGLER_WRITE_LOGS = 'false';
const { experimental_generateTypes } = await import('wrangler');
const result = await experimental_generateTypes({
  config,
  includeEnv: false,
  path: 'types/cloudflare.d.ts',
});
await mkdir('types', { recursive: true });
await writeFile(result.path, result.content.replace(/[ \t]+$/gm, ''));
console.log('Generated Worker runtime types from the built compatibility settings.');
