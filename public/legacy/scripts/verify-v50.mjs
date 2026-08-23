import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function load(relative, name) {
  const context = { window: {}, console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read(relative), context, { filename: relative });
  return context.window[name];
}

const source = load('data/person-source-index.js', 'SGZ_PERSON_SOURCE_INDEX');
const audit = json('data/person-entity-audit.json');
const manifest = load('data/portrait-manifest.js', 'SGZ_PERSON_PORTRAIT_MANIFEST');
const board = load('data/v48-portrait-board.js', 'SGZ_V48_PORTRAIT_BOARD');
const html = read('index.html');
const portablePath = path.join(root, 'exports', '三国职官谱-单文件版.html');
const portable = fs.existsSync(portablePath) ? fs.readFileSync(portablePath, 'utf8') : '';

const badNames = ['賁九江', '公女曼', '康代', '常侍大', '牧辽东', '车骑', '左车骑', '右车骑', '车骑大', '伏波', '平北', '平狄', '安东', '安北', '平东', '越骑', '扶风', '桂林', '贵阳', '江阳'];
const defaults = source.people.filter(item => item.includeInDefault === true);
assert(defaults.every(item => item.entityType === 'person' && item.visibilityStatus === 'visible'), 'V50 默认人物实体门禁失败');
assert(!defaults.some(item => badNames.includes(item.name) || badNames.some(name => (item.aliases || []).includes(name))), 'V50 已知官号/地名/残片仍在默认人物中');
assert(audit.normalizations.some(item => item.rawName === '賁九江' && item.canonicalName === '孙贲'), '孙贲规范化缺失');
assert(audit.normalizations.some(item => item.rawName === '公女曼' && item.canonicalName === '曹曼'), '曹曼规范化缺失');
assert(audit.normalizations.some(item => item.rawName === '康代' && item.canonicalName === '韦康'), '韦康规范化缺失');
assert(defaults.some(item => item.name === '孙贲') && defaults.some(item => item.name === '曹曼') && defaults.some(item => item.name === '韦康'), '规范化人物未进入默认人物索引');
assert(board.count === 50 && manifest.summary.figmaBoardMapped === 50, '50 人设计板映射不完整');
assert(Object.values(manifest.byPersonId).filter(item => item.status === 'ready').every(item => item.src), 'ready 立绘缺少资源');
assert(html.includes('<title>观史台 · 汉末至西晋史制资料工作台</title>') && html.includes('<div class="t1">观史台</div>'), '观史台品牌未接入主站');
assert(html.includes("indexed.status==='ready' ? indexed.src : ''") && html.includes("portrait?.status==='ready'"), '无五官占位图仍可能进入人物头像');
assert(html.includes('grid-template-columns:repeat(7,minmax(0,1fr))'), '人物统计区未改为紧凑单行布局');
assert(portable.includes('观史台') && portable.includes("indexed.status==='ready' ? indexed.src : ''"), '便携版未同步 V50 品牌和立绘门禁');

console.log(JSON.stringify({
  version: 'V50',
  people: { source: source.people.length, default: defaults.length, normalized: audit.summary.normalizedAppointments, excluded: audit.summary.excludedAppointments },
  portraits: { board: board.count, mapped: manifest.summary.figmaBoardMapped, ready: manifest.summary.specificPortraits, designOnly: manifest.summary.designOnlyPortraits, fallback: manifest.summary.fallbackPortraits },
  ui: { brand: '观史台', compactMetrics: true, placeholderImagesHidden: true },
  checks: 'passed'
}, null, 2));
