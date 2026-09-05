import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const fullPath = relative => path.join(root, relative);
const read = relative => fs.readFileSync(fullPath(relative), 'utf8');
const json = relative => JSON.parse(read(relative));

function pngSize(relative) {
  const file = fullPath(String(relative || '').replace(/^\.\//, ''));
  if (!fs.existsSync(file)) return null;
  const bytes = fs.readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const candidates = json('data/v70-portrait-candidates.json');
const manifest = json('data/portrait-manifest.json');
const registry = json('data/v63-person-registry.json');
const reader = json('data/v63-reader-people.json');
const fangzhen = json('data/v69-fangzhen-reader.json');
const fangzhenRuntime = read('assets/app/fangzhen.js');
const html = read('index.html');
const candidateRows = candidates.records || [];
const assets = Object.values(manifest.assetsById || {});
const v70Assets = assets.filter(row => row.portraitKind === 'ui-illustration-v70');
const peopleById = new Map((reader.people || []).map(row => [row.personId, row]));

assert(candidates.schemaVersion === 'V70', 'V70 立绘候选 schemaVersion 错误');
assert(candidateRows.length === 50, `V70 立绘候选应为 50 人，实际 ${candidateRows.length}`);
assert(new Set(candidateRows.map(row => row.personId)).size === 50, 'V70 候选 personId 不唯一');
assert(new Set(candidateRows.map(row => row.name)).size === 50, 'V70 候选姓名不唯一');
assert(candidateRows.every(row => row.dynasty === '魏'), 'V70 候选混入魏以外人物');
assert(candidateRows.every(row => /^person:(?!unresolved:)/.test(row.personId || '')), 'V70 候选含不稳定或 unresolved personId');
assert(v70Assets.length === 50, `V70 manifest 资源应为 50 项，实际 ${v70Assets.length}`);
assert(manifest.summary?.v70PortraitRecords === 50, 'manifest 未登记 50 项 V70 资源');
assert(assets.length === 425, `V70 追加后总立绘应为 425 项，实际 ${assets.length}`);
assert((registry.summary?.portraitAssets || 0) === 425, '人物注册表立绘总数未同步为 425');
assert((registry.portraitResolutions || []).length === 425, '人物注册表立绘解析数未同步为 425');

const candidateIds = new Set();
const candidateNames = new Set();
for (const candidate of candidateRows) {
  candidateIds.add(candidate.personId);
  candidateNames.add(candidate.name);
  const row = peopleById.get(candidate.personId);
  assert(row && row.name === candidate.name, `${candidate.name} 未在读者人物注册表中定位`);
  const portraitId = `portrait:v70:${String(candidate.order).padStart(2, '0')}`;
  const asset = manifest.assetsById?.[portraitId];
  assert(asset?.personId === candidate.personId && asset?.name === candidate.name, `${portraitId} 未与候选人物稳定绑定`);
  assert(asset?.assetPath === candidate.assetPath && asset?.status === 'ready', `${portraitId} 资源路径或 ready 状态不一致`);
  assert(asset?.interfaceOnly === true && asset?.portraitKind === 'ui-illustration-v70', `${portraitId} 缺少界面资产边界`);
  assert(['pending-figma-upload', 'figma-design'].includes(asset?.designStatus), `${portraitId} 缺少真实 Figma 写入状态`);
  assert(asset?.designRef?.fileKey === 'gvWRC5GHHSgd8QX9b2VJgo' && asset?.designRef?.version === 'V70', `${portraitId} Figma 文件或版本不一致`);
  assert(asset?.designRef?.pageName === 'V70 / Portraits' && asset?.designRef?.nodeId === null && asset?.designRef?.componentId === null, `${portraitId} 生成了伪造 Figma 节点`);
  const size = pngSize(asset?.assetPath);
  assert(size?.width === 512 && size?.height === 512, `${portraitId} 不是 512×512 PNG`);
  const samePersonAssets = assets.filter(row => row.personId === candidate.personId);
  assert(samePersonAssets.length === 1 && samePersonAssets[0].portraitId === portraitId, `${candidate.name} 存在既有立绘冲突`);
}
assert(candidateIds.size === 50 && candidateNames.size === 50, 'V70 候选唯一性校验失败');
assert(v70Assets.every(asset => candidateIds.has(asset.personId)), 'manifest 含未登记的 V70 人物');

/* V70 人物界面回归：非人物词条不可重新进入读者包，寿命与标签不重复显示。 */
assert(reader.people?.length === 2096, `读者人物数量应保持 2096，实际 ${reader.people?.length || 0}`);
for (const excluded of ['安西', '安南', '安东大', '喬安北', '丁中', '陈王刘宠']) {
  assert(!reader.people.some(row => row.name === excluded || (row.aliases || []).includes(excluded)), `错误人物值仍在读者包：${excluded}`);
}
assert(!html.includes('所历朝代：'), '人物界面仍显示“所历朝代”重复叙述');
assert(!html.includes('生卒：') && !html.includes('生年：') && !html.includes('卒年：'), '人物界面仍显示生卒字段标签');
assert(html.includes('personLifespanLabel') && fs.readFileSync(path.join(root,'assets/app/reader-components.js'),'utf8').includes('v69-person-lifespan'), '人物界面未使用统一寿命显示');
assert(html.includes('<p>{{peoplePrimaryDetail.bio}}</p>') && html.includes('<p>{{activePeopleDetail.bio}}</p>'), '人物小传必须显示正文，不能被身份拼接句替代');

/* 州镇职任字段统一归一；来源叙述可保留原文，但标题和委任字段不得回到“郡太守”。 */
for (const row of fangzhen.records || []) {
  assert(!/郡太守/.test(String(row.title || '')) && !/郡太守/.test(String(row.commission || '')), `${row.id} 的职任标题仍含“郡太守”`);
}
assert(fangzhenRuntime.includes('normalizeFangzhenOfficeTitle') && html.includes("const normalizeOfficeTitle=value=>String(value==null?'':value).trim().replace(/(?:[\\u4e00-\\u9fff]{1,8})?郡太守/g,'太守')"), '州镇职任归一根因未固定在运行时');
assert(!html.includes('州／郡／方镇索引'), '州镇前台仍显示已删除的辖区索引');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, version: 'V70', failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    version: 'V70',
    readerPeople: reader.people.length,
    portraits: { baseline: 375, addedV70: v70Assets.length, total: assets.length },
    v70: { dynasty: '魏', candidates: candidateRows.length, readyAssets: v70Assets.length, figma: v70Assets.every(asset => asset.designStatus === 'figma-design') ? 'complete' : 'pending-figma-upload' },
    fangzhenTitlesNormalized: true,
  }, null, 2));
}
