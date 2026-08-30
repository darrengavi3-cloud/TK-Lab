import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = value => String(value == null ? '' : value).trim();
const context = { console };
context.window = context;
vm.createContext(context);
for (const relative of ['data/epigraphic-records.js', 'data/epigraphic-v46-jin.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), context, { filename: relative });
}
const records = [...new Map([
  ...(context.SGZ_EPIGRAPHIC_RECORDS?.records || []),
  ...(context.SGZ_EPIGRAPHIC_V46_JIN?.records || []),
].map(record => [record.id, record])).values()];
const missing = records.filter(record => !text(record.inscription));
const endpoints = [
  { key: 'wikipedia', label: '中文 Wikipedia', api: 'https://zh.wikipedia.org/w/api.php' },
  { key: 'wikisource', label: '维基文库', api: 'https://zh.wikisource.org/w/api.php' },
];
const cachePath = path.join(root, 'data', 'v61-epigraphy-search-cache.json');
const previousPayload = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : { records: [] };
const previousById = new Map((previousPayload.records || []).map(record => [record.id, record]));
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function normalized(value) {
  return text(value).toLowerCase().replace(/[\s·／/（）()“”‘’《》〈〉【】\[\]，。；：、—–-]/g, '');
}
function resultMatchesName(result, name) {
  const haystack = normalized(`${result.title} ${result.snippet}`);
  const exact = normalized(name);
  const core = exact.replace(/(?:碑并序|碑銘|碑铭|墓誌|墓志|磚銘|砖铭|石刻|殘刻|残刻|銘文|铭文|碑)$/g, '');
  return Boolean(exact && haystack.includes(exact)) || Boolean(core.length >= 2 && haystack.includes(core));
}

async function searchBatch(endpoint, records) {
  const names = records.map(record => record.name);
  const url = new URL(endpoint.api);
  url.search = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: names.map(name => `"${name}"`).join(' OR '),
    srnamespace: '0',
    srlimit: '50',
    format: 'json',
    formatversion: '2',
  }).toString();
  let error = '';
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'GuanShiTai-V61/1.0 (owner-only historical research)' } });
      if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get('retry-after') || 0);
        await wait(Math.min(30_000, Math.max(8_000, retryAfterSeconds * 1_000 || attempt * 4_000)));
        error = 'HTTP 429';
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const allResults = (payload.query?.search || []).map(item => ({
          title: text(item.title),
          pageid: item.pageid,
          snippet: text(item.snippet).replace(/<[^>]+>/g, ''),
          timestamp: text(item.timestamp),
        }));
      await wait(750);
      return records.map(record => {
        const results = allResults.filter(result => resultMatchesName(result, record.name));
        return {
          source: endpoint.label,
          url: url.toString(),
          status: 'completed',
          totalHits: results.length,
          results,
          batchTerms: names,
        };
      });
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      await wait(Math.min(8_000, attempt * 1_500));
    }
  }
  return records.map(() => ({ source: endpoint.label, url: url.toString(), status: 'failed', totalHits: 0, results: [], error, batchTerms: names }));
}

const output = missing.map(record => ({
  id: record.id,
  name: record.name,
  searches: [...(previousById.get(record.id)?.searches || [])],
}));
const outputById = new Map(output.map(record => [record.id, record]));

for (const endpoint of endpoints) {
  const pending = missing.filter(record => {
    const prior = outputById.get(record.id)?.searches.find(item => item.source === endpoint.label);
    return prior?.status !== 'completed';
  });
  const batchSize = 8;
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize);
    const results = await searchBatch(endpoint, batch);
    batch.forEach((record, index) => {
      const target = outputById.get(record.id);
      target.searches = target.searches.filter(item => item.source !== endpoint.label);
      target.searches.push(results[index]);
    });
    console.log(`V61 ${endpoint.label} 批量检索 ${Math.min(offset + batch.length, pending.length)}/${pending.length}`);
  }
}

const payload = {
  schemaVersion: 'V61',
  modelId: 'sgz-v61-epigraphy-search-cache',
  searchedAt: '2026-08-28',
  scope: '对 V60 仍为空的 142 条金石记录逐条执行 Wikipedia 与维基文库标题检索；发现结果不等于采用释文',
  totalRecords: records.length,
  missingBeforeResearch: missing.length,
  completedRecords: output.filter(Boolean).length,
  failedSearches: output.flatMap(item => item.searches).filter(item => item.status === 'failed').length,
  records: output,
};
fs.writeFileSync(cachePath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ completedRecords: payload.completedRecords, failedSearches: payload.failedSearches }, null, 2));
