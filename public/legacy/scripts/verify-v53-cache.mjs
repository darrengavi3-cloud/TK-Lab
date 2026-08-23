import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(`V53 缓存校验失败：${message}`); };

const html = read('index.html');
const portable = read('exports/三国职官谱-单文件版.html');

assert(html.includes("CACHE_DB_NAME='sgz_zhiguanpu_cache_v2'"), '主站未声明 IndexedDB 缓存库');
assert(html.includes('initializeLocalCache') && html.includes('cachePut') && html.includes('cacheGet'), '主站缺少 IndexedDB 读写与迁移逻辑');
assert(html.includes('CACHE_CURRENT_ID') && html.includes('CACHE_SNAPSHOT_ID') && html.includes('CACHE_ARCHIVES_ID'), '缓存对象未分离为主工程、快照和存档');
assert(html.includes('removeLegacyCacheCopies') && html.includes('verified && verified.hash===hashPayload(legacyCurrent)'), '旧缓存未经过校验后清理');
assert(!html.includes('localStorage.setItem(SNAPSHOT_KEY,JSON.stringify({savedAt:Date.now(),hash:hashPayload(prev),payload:prev}))'), '仍将完整旧工程快照重复写入 localStorage');
assert(!html.includes('localStorage.setItem(SAVE_RING_KEY,JSON.stringify(ring.slice(0,20)))'), '仍将保存环写入 localStorage');
assert(html.includes('本地缓存空间不足') && html.includes('工程未丢失'), '配额异常缺少可恢复提示');
assert(html.includes('clearLegacyCacheCopies') && html.includes('清理旧缓存副本'), '缺少用户可控的旧缓存清理入口');
assert(html.includes('async function loadLocal') && html.includes('async function restoreSnapshot'), '恢复入口未适配异步缓存');
assert(html.includes('async function persistArchives') && html.includes('CACHE_ARCHIVES_ID'), '独立存档未迁移到统一缓存后端');
assert(portable.includes("CACHE_DB_NAME='sgz_zhiguanpu_cache_v2'") && portable.includes('initializeLocalCache'), '便携版未同步缓存修复');

console.log(JSON.stringify({
  version: 'V53',
  backend: 'IndexedDB with localStorage pointer fallback',
  migration: 'legacy localStorage -> verified IndexedDB -> legacy cleanup',
  redundantLocalStorageCopies: false,
  portable: 'synced',
  checks: 'passed'
}, null, 2));
