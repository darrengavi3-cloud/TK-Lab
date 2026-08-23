import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url).pathname;
const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error(message); };

const context = { window: {} };
vm.createContext(context);
vm.runInContext(read('../data/general-titles.js'), context);
vm.runInContext(read('../data/v48-portrait-board.js'), context);
const titles = context.window.SGZ_GENERAL_TITLES;
const board = context.window.SGZ_V48_PORTRAIT_BOARD;
assert(titles.schemaVersion === 2, '将军名号 schemaVersion 必须为 2');
assert(titles.groups.length === 4, '必须有曹魏、季汉、孙吴、西晋四组名号');
assert(titles.groups.every(group => group.titles.length >= 50), '四组名号均应达到可审校的完整索引规模');
titles.groups.forEach(group => {
  const orders = group.titles.map(item => Number(item.sortOrder));
  assert(orders.every(Number.isFinite), `${group.label} 存在无 sortOrder 条目`);
  assert(orders.every((value, index) => index === 0 || value >= orders[index - 1]), `${group.label} 未按 sortOrder 升序排列`);
  assert(new Set(group.titles.map(item => item.title)).size === group.titles.length, `${group.label} 存在重复名号`);
  assert(group.titles.some(item => item.evidence === '待考'), `${group.label} 未保留待考边界`);
});
assert(board.count === 50, `V48 立绘设计板应为 50 人，实际 ${board.count}`);
assert(new Set(board.records.map(item => item.name)).size === 50, 'V48 立绘姓名重复');
assert(new Set(board.records.map(item => item.personId)).size === 50, 'V48 立绘 personId 重复');
assert(board.records.every(item => item.status === 'figma-design'), 'V48 立绘状态必须是 figma-design');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert(html.includes('./data/v48-portrait-board.js'), 'index.html 未加载 V48 立绘设计索引');
assert(html.includes('showGeneralTitles'), '将军名号抽屉未接入 UI 状态');
assert(html.includes('general-title-grid'), '将军名号分级卡片未接入 UI');
assert(html.includes('v48-premium-ui'), 'V48 UI 令牌样式未接入');
assert(fs.existsSync(new URL('../DESIGN.md', import.meta.url)), 'DESIGN.md 缺失');
assert(fs.existsSync(new URL('../UX-CONTRACT.md', import.meta.url)), 'UX-CONTRACT.md 缺失');
console.log(JSON.stringify({
  version:'V48',
  generalTitles:Object.fromEntries(titles.groups.map(group=>[group.polity,group.titles.length])),
  portraits:board.count,
  figmaFile:'gvWRC5GHHSgd8QX9b2VJgo',
  checks:'passed'
}, null, 2));
