import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const source = read('data/person-source-index.js');
const manifest = json('data/portrait-manifest.json');
const html = read('index.html');
const portablePath = path.join(root, 'exports', '三国职官谱-单文件版.html');
const portable = fs.existsSync(portablePath) ? fs.readFileSync(portablePath, 'utf8') : '';
const defaults = manifest.defaultPersonIds || [];
const defaultItems = defaults.map(id => manifest.byPersonId?.[id]).filter(Boolean);

assert(!source.includes('defaultAppointments >= 230'), 'V51 仍保留 230 条最低数量门禁');
assert(defaults.length > 0 && defaults.length <= 171, `V52 之后默认人物数量异常：${defaults.length}`);
assert(new Set(defaults).size === defaults.length, '默认人物 personId 重复');
assert(defaultItems.length === defaults.length, '默认人物存在缺失的稳定 ID 索引');
assert(defaultItems.every(item => item.status === 'ready'), '默认人物仍存在未完成立绘');
assert(defaultItems.every(item => item.interfaceOnly === true), '默认立绘缺少 interfaceOnly 标记');
assert(defaultItems.every(item => item.src && !item.src.includes('person-placeholder-v46')), '默认人物仍引用占位图');
assert(defaultItems.every(item => fs.existsSync(path.join(root, item.src.replace(/^\.\//, '')))), '默认人物存在缺失的立绘文件');
assert(!html.includes('people-design-status') && !html.includes('有人脸生产资源') && !html.includes('设计待同步') && !html.includes('V50 人设计板'), '人物记仍残留 V50 设计板或立绘状态文案');
assert(!portable || (!portable.includes('people-design-status') && !portable.includes('有人脸生产资源') && !portable.includes('设计待同步') && !portable.includes('V50 人设计板')), '便携版仍残留 V50 设计板或立绘状态文案');
assert(html.includes('v51-editorial-workbench') && html.includes('观史台'), 'V51 史料工作台视觉层未接入主站');
assert(portable.includes('观史台'), '便携版未同步观史台品牌');

const v51Assets = fs.readdirSync(path.join(root, 'assets', 'portraits', 'v51')).filter(name => name.endsWith('.png'));
assert(v51Assets.length >= 159, `V51 新增立绘资源不足：${v51Assets.length}`);

console.log(JSON.stringify({
  version: 'V51',
  defaultPeople: defaults.length,
  portraits: { ready: defaultItems.length, v51Assets: v51Assets.length, placeholderFree: true },
  ui: { brand: '观史台', designStatusRemoved: true, editorialWorkbench: true },
  threshold230Removed: true,
  checks: 'passed'
}, null, 2));
