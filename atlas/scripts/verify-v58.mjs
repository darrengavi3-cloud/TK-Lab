import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(decodeURIComponent(new URL('..', import.meta.url).pathname));
const dataDir = path.join(root, 'data');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
function loadGlobal(file) {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dataDir, file), 'utf8'), context, { timeout: 10000, filename: file });
  return context;
}

const board = loadGlobal('v58-portrait-board.js').SGZ_V58_PORTRAIT_BOARD;
const source = loadGlobal('person-source-index.js').SGZ_PERSON_SOURCE_INDEX;
const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'portrait-manifest.json'), 'utf8'));
const boardRows = board?.records || [];
const sourcePeople = source?.people || [];
const sourceAppointments = source?.appointments || [];
const candidateIds = new Set(['person:jin:xi-jian','person:jin:huan-wen','person:jin:liu-shi','person:jin:liu-yu']);

assert(board?.version === 'V58', 'V58 立绘板版本不正确');
assert(board?.fileKey === 'gvWRC5GHHSgd8QX9b2VJgo', 'V58 立绘板 Figma fileKey 不正确');
assert(boardRows.length === 20, `V58 立绘板应有 20 条，实际 ${boardRows.length}`);
assert(new Set(boardRows.map(row => row.personId)).size === 20, 'V58 立绘板存在重复 personId');
assert(new Set(boardRows.map(row => row.name)).size === 20, 'V58 立绘板存在重复姓名');
assert(sourcePeople.length === 509, `活动源人物数改变：${sourcePeople.length}`);
assert(sourceAppointments.length === 766, `活动源任官数改变：${sourceAppointments.length}`);
assert(manifest.defaultPersonIds.length === 123, `默认人物档案数量改变：${manifest.defaultPersonIds.length}`);
assert(manifest.summary?.v58PortraitRecords === 20, 'manifest 未记录 20 个 V58 立绘资源');
assert(manifest.summary?.v58PortraitMapped === 20, 'manifest 未映射完整 V58 立绘资源');

for (const row of boardRows) {
  const canonicalPersonId = manifest.legacyPersonIdAliases?.[row.personId] || row.personId;
  const item = manifest.byPersonId?.[canonicalPersonId];
  assert(item, `manifest 缺少 ${row.name}（${row.personId}→${canonicalPersonId}）`);
  if (!item) continue;
  assert(item.status === 'ready', `${row.name} 未标记 ready`);
  assert(item.interfaceOnly === true, `${row.name} 缺少 interfaceOnly 边界`);
  assert(item.designStatus === 'figma-design', `${row.name} 缺少 figma-design 状态`);
  assert(item.designRef?.fileKey === board.fileKey, `${row.name} Figma fileKey 不一致`);
  assert(item.designRef?.version === 'V58', `${row.name} Figma 版本不一致`);
  assert(item.designRef?.order === row.order, `${row.name} Figma 顺序不一致`);
  assert(item.src === row.src, `${row.name} manifest 资源路径不一致`);
  const assetPath = path.join(root, String(item.src).replace(/^\.\//, ''));
  assert(fs.existsSync(assetPath), `${row.name} 资源文件不存在：${item.src}`);
  if (fs.existsSync(assetPath)) {
    const bytes = fs.readFileSync(assetPath);
    assert(bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `${row.name} 不是 PNG`);
    const width = bytes.readUInt32BE(16); const height = bytes.readUInt32BE(20);
    assert(width === height && width > 0, `${row.name} 资源不是方形：${width}x${height}`);
  }
}
for (const id of candidateIds) {
  const person = sourcePeople.find(row => row.personId === id);
  assert(person?.entityType === 'person' && person?.visibilityStatus === 'visible', `候选人物不可见或实体类型不符：${id}`);
  assert(person?.includeInDefault !== true, `候选人物意外进入默认档案：${id}`);
  assert(manifest.defaultPersonIds.includes(id) === false, `候选人物进入默认人物 ID：${id}`);
}
assert(boardRows.filter(row => candidateIds.has(row.personId)).length === 4, 'V58 候选人物不是 4 条');
assert(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('./assets/ui/v58.css'), 'index.html 未加载 v58.css');
assert(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('./data/v58-portrait-board.js'), 'index.html 未加载 V58 立绘板');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, v58Portraits: boardRows.length, sourcePeople: sourcePeople.length, sourceAppointments: sourceAppointments.length, defaultPeople: manifest.defaultPersonIds.length }, null, 2));
}
