import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const sourcePath = path.join(root, 'index.html');
const registryPath = path.join(root, 'data', 'map-period-registry.js');
const wuRecordsPath = path.join(root, 'data', 'wu-fangzhen-records.js');
const shuRecordsPath = path.join(root, 'data', 'shu-fangzhen-records.js');
const fangzhenSupplementPath = path.join(root, 'data', 'fangzhen-term-supplement.js');
const researchModelPath = path.join(root, 'data', 'research-model.js');
const historyEvidencePath = path.join(root, 'data', 'history-evidence.js');
const battleRecordsPath = path.join(root, 'data', 'battle-records.js');
const personBiographiesPath = path.join(root, 'data', 'person-biographies.js');
const personPortraitsPath = path.join(root, 'data', 'person-portraits.js');
const epigraphicRecordsPath = path.join(root, 'data', 'epigraphic-records.js');
const portraitDir = path.join(root, 'assets', 'portraits');
const courtBackgroundPath = path.join(root, 'assets', 'ui', 'court-ink-palace.png');
const exportPath = path.join(root, 'exports', '三国职官谱-单文件版.html');
const rootCopyPath = path.resolve(root, '..', '三国职官谱 .html');
const downloadsCopyPath = process.env.HOME ? path.join(process.env.HOME, 'Downloads', '三国职官谱 .html') : null;
const downloadsBackupPath = process.env.HOME ? path.join(process.env.HOME, 'Downloads', '三国职官谱-本轮迭代前备份.html') : null;

let html = fs.readFileSync(sourcePath, 'utf8');
const registryScript = fs.readFileSync(registryPath, 'utf8').trim();
const wuRecordsScript = fs.readFileSync(wuRecordsPath, 'utf8').trim();
const shuRecordsScript = fs.readFileSync(shuRecordsPath, 'utf8').trim();
const fangzhenSupplementScript = fs.readFileSync(fangzhenSupplementPath, 'utf8').trim();
const researchModelScript = fs.readFileSync(researchModelPath, 'utf8').trim();
const historyEvidenceScript = fs.readFileSync(historyEvidencePath, 'utf8').trim();
const battleRecordsScript = fs.readFileSync(battleRecordsPath, 'utf8').trim();
const personBiographiesScript = fs.readFileSync(personBiographiesPath, 'utf8').trim();
let personPortraitsScript = fs.readFileSync(personPortraitsPath, 'utf8').trim();
const epigraphicRecordsScript = fs.readFileSync(epigraphicRecordsPath, 'utf8').trim();
for (const polityDir of fs.readdirSync(portraitDir)) {
  const fullDir = path.join(portraitDir, polityDir);
  if (!fs.statSync(fullDir).isDirectory()) continue;
  for (const file of fs.readdirSync(fullDir).filter(name => /\.(png|jpe?g|webp)$/i.test(name))) {
    const relative = `./assets/portraits/${polityDir}/${file}`;
    const mime = file.toLowerCase().endsWith('.png') ? 'image/png' : (file.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg');
    const data = `data:${mime};base64,${fs.readFileSync(path.join(fullDir, file)).toString('base64')}`;
    personPortraitsScript = personPortraitsScript.split(relative).join(data);
  }
}
const courtBackgroundData = `data:image/png;base64,${fs.readFileSync(courtBackgroundPath).toString('base64')}`;

const replacements = [
  [
    '<title>职官谱 · 三国官职爵位管理系统</title>',
    '<title>中华三国志 · 职官谱｜州镇表｜形势图</title>'
  ],
  [
    '<link rel="stylesheet" href="./assets/vendor/element-plus/index.css" />',
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/element-plus/2.11.4/index.css" crossorigin="anonymous" />'
  ],
  [
    '<script src="./assets/vendor/vue/vue.global.min.js"></script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/vue/3.5.39/vue.global.min.js" crossorigin="anonymous"></script>'
  ],
  [
    '<script src="./assets/vendor/element-plus/index.full.min.js"></script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/element-plus/2.11.4/index.full.min.js" crossorigin="anonymous"></script>'
  ],
  [
    '<script src="./assets/vendor/gojs/go.js"></script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/gojs/3.1.10/go.js" crossorigin="anonymous"></script>'
  ],
  [
    '<script src="./assets/vendor/xlsx/xlsx.full.min.js"></script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" crossorigin="anonymous"></script>'
  ],
  [
    '<script src="./data/map-period-registry.js"></script>',
    `<script>\n${registryScript}\n</script>`
  ],
  [
    '<script src="./data/wu-fangzhen-records.js"></script>',
    `<script>\n${wuRecordsScript}\n</script>`
  ],
  [
    '<script src="./data/shu-fangzhen-records.js"></script>',
    `<script>\n${shuRecordsScript}\n</script>`
  ],
  [
    '<script src="./data/fangzhen-term-supplement.js"></script>',
    `<script>\n${fangzhenSupplementScript}\n</script>`
  ],
  [
    '<script src="./data/research-model.js"></script>',
    `<script>\n${researchModelScript}\n</script>`
  ],
  [
    '<script src="./data/history-evidence.js"></script>',
    `<script>\n${historyEvidenceScript}\n</script>`
  ],
  [
    '<script src="./data/battle-records.js"></script>',
    `<script>\n${battleRecordsScript}\n</script>`
  ],
  [
    '<script src="./data/person-biographies.js"></script>',
    `<script>\n${personBiographiesScript}\n</script>`
  ],
  [
    '<script src="./data/person-portraits.js"></script>',
    `<script>\n${personPortraitsScript}\n</script>`
  ],
  [
    '<script src="./data/epigraphic-records.js"></script>',
    `<script>\n${epigraphicRecordsScript}\n</script>`
  ],
  [
    "url('./assets/ui/court-ink-palace.png')",
    `url('${courtBackgroundData}')`
  ],
  [
    "const HISTORY_MAP_BASE = './assets/map/';",
    "const HISTORY_MAP_BASE = 'https://workbuddy-space-static.codebuddy.work/page/q71T7ZIe9O6xmZrTj3ldoy/1/';"
  ],
  [
    '<div>本地项目缺少或未能读取以下组件：<b>',
    '<div>联网导出版未能载入以下组件：<b>'
  ],
  [
    '<div style="margin-top:10px;">请确认没有单独移动 index.html，并保持 assets、data 目录与本文件处于同一项目文件夹。</div>',
    '<div style="margin-top:10px;">请检查网络是否能访问 cdnjs.cloudflare.com 与地图资源服务器。</div>'
  ],
  [
    '<div style="margin-top:10px;">如文件齐全仍无法打开，请运行 scripts/verify-project.mjs 检查资源完整性。</div>',
    '<div style="margin-top:10px;">离线使用请打开完整项目文件夹中的 index.html。</div>'
  ]
];

replacements.forEach(([from, to]) => {
  if (!html.includes(from)) throw new Error(`便携导出构建失败，未找到替换标记：${from.slice(0, 80)}`);
  html = html.replace(from, to);
});

// 新增地图图层与行政快照尚未部署到历史远端包；便携版把这些小型运行脚本
// 内嵌进 srcdoc，同时继续复用远端 Leaflet、州郡几何与其余稳定模块。
function escapeForOuterTemplate(source) {
  return source
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/<\/script>/gi, '<\\/script>');
}

[
  'data/three-kingdoms.js',
  'data/political-snapshots.js',
  'data/administrative-events.js',
  'data/administrative-snapshots.js',
  'data/county-registry.js',
  'data/history-evidence.js',
  'data/strategic-geography.js',
  'data/geo-coastline.js',
  'data/all-provinces-local.js',
  'js/config.js',
  'js/base-layer.js',
  'js/bridge.js',
  'js/panel.js',
  'js/territories.js',
  'js/wu-commanderies.js',
  'js/commanderies.js',
  'js/counties.js',
  'js/strategic-layers.js',
  'js/app.js',
].forEach(relative => {
  const marker = `<script src="${relative}"><\\/script>`;
  const escapedRelative = relative.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  const versionedMarker = html.match(new RegExp(`<script src="${escapedRelative}\\?v=[0-9]+"><\\\\/script>`))?.[0];
  const activeMarker = html.includes(marker) ? marker : versionedMarker;
  if (!html.includes(activeMarker)) throw new Error(`便携导出构建失败，未找到地图脚本：${relative}`);
  const source = fs.readFileSync(path.join(root, 'assets', 'map', relative), 'utf8');
  html = html.replace(activeMarker, `<script>\n${escapeForOuterTemplate(source)}\n<\\/script>`);
});

// 战事纪档案同时供主页面与地图 iframe 使用；便携版统一内嵌进 srcdoc。
const battleSrcdocMarker = `<script src="data/battle-records.js"><\\/script>`;
if (!html.includes(battleSrcdocMarker)) throw new Error('便携导出构建失败，未找到地图内 battle-records 脚本标记');
html = html.replace(battleSrcdocMarker, `<script>\n${escapeForOuterTemplate(battleRecordsScript)}\n<\\/script>`);

fs.mkdirSync(path.dirname(exportPath), { recursive: true });
fs.writeFileSync(exportPath, html, 'utf8');
fs.writeFileSync(rootCopyPath, html, 'utf8');
if (downloadsCopyPath && fs.existsSync(path.dirname(downloadsCopyPath))) {
  if (fs.existsSync(downloadsCopyPath) && downloadsBackupPath && !fs.existsSync(downloadsBackupPath)) {
    fs.copyFileSync(downloadsCopyPath, downloadsBackupPath);
  }
  fs.writeFileSync(downloadsCopyPath, html, 'utf8');
}

console.log(`已生成联网便携版：${exportPath}`);
console.log(`已同步工作区根目录副本：${rootCopyPath}`);
if (downloadsCopyPath) console.log(`已同步下载目录使用副本：${downloadsCopyPath}`);
