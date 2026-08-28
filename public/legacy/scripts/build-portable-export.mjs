import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const sourcePath = path.join(root, 'index.html');
const registryPath = path.join(root, 'data', 'map-period-registry.js');
const wuRecordsPath = path.join(root, 'data', 'wu-fangzhen-records.js');
const shuRecordsPath = path.join(root, 'data', 'shu-fangzhen-records.js');
const fangzhenSupplementPath = path.join(root, 'data', 'fangzhen-term-supplement.js');
const personNameNormalizationPath = path.join(root, 'data', 'person-name-normalization.js');
const personIdentitiesPath = path.join(root, 'data', 'person-identities.js');
const researchModelPath = path.join(root, 'data', 'research-model.js');
const historyEvidencePath = path.join(root, 'data', 'history-evidence.js');
const battleRecordsPath = path.join(root, 'data', 'battle-records.js');
const shihuoRecordsPath = path.join(root, 'data', 'shihuo-records.js');
const personBiographiesPath = path.join(root, 'data', 'person-biographies.js');
const personEraRostersPath = path.join(root, 'data', 'person-era-rosters.js');
const personPortraitsPath = path.join(root, 'data', 'person-portraits.js');
const portraitManifestPath = path.join(root, 'data', 'portrait-manifest.js');
const epigraphicRecordsPath = path.join(root, 'data', 'epigraphic-records.js');
const epigraphicV46JinPath = path.join(root, 'data', 'epigraphic-v46-jin.js');
const jinshiSchemaPath = path.join(root, 'data', 'jinshi-schema.js');
const administrativeIndexPath = path.join(root, 'data', 'administrative-index.js');
const researchCandidatesPath = path.join(root, 'data', 'research-candidates.js');
const hanBaiGuanZhiPath = path.join(root, 'data', 'han-bai-guan-zhi.js');
const generalTitlesPath = path.join(root, 'data', 'general-titles.js');
const officeOrderPoliciesPath = path.join(root, 'data', 'office-order-policies.js');
const kaifuPoliciesPath = path.join(root, 'data', 'kaifu-policies.js');
const seatPoliciesPath = path.join(root, 'data', 'office-seat-policies.js');
const officeResidencesPath = path.join(root, 'data', 'office-residences.js');
const fangzhenSeatSupplementPath = path.join(root, 'data', 'fangzhen-seat-supplement.js');
const personSourceIndexPath = path.join(root, 'data', 'person-source-index.js');
const v60PersonWorkbookImportJsonPath = path.join(root, 'data', 'v60-person-workbook-import.json');
const v61PersonSupplementsPath = path.join(root, 'data', 'v61-person-supplements.js');
const v60ResearchLedgerPath = path.join(root, 'data', 'v60-research-ledger.js');
const v61EpigraphyResearchPath = path.join(root, 'data', 'v61-epigraphy-research.js');
const personEntityAuditPath = path.join(root, 'data', 'person-entity-audit.js');
const personV57RuntimeRulesPath = path.join(root, 'data', 'person-v57-runtime-rules.js');
const personZiSupplementPath = path.join(root, 'data', 'person-zi-supplement.js');
const portraitBoardPath = path.join(root, 'data', 'v48-portrait-board.js');
const v58PortraitBoardPath = path.join(root, 'data', 'v58-portrait-board.js');
const hydronymAuditPath = path.join(root, 'assets', 'map', 'data', 'hydronym-audit.js');
const portraitDir = path.join(root, 'assets', 'portraits');
const courtBackgroundPath = path.join(root, 'assets', 'ui', 'court-ink-palace.png');
const v55CssPath = path.join(root, 'assets', 'ui', 'v55.css');
const v56CssPath = path.join(root, 'assets', 'ui', 'v56.css');
const v57CssPath = path.join(root, 'assets', 'ui', 'v57.css');
const v58CssPath = path.join(root, 'assets', 'ui', 'v58.css');
const v60CssPath = path.join(root, 'assets', 'ui', 'v60.css');
const v61CssPath = path.join(root, 'assets', 'ui', 'v61.css');
const exportPath = path.join(root, 'exports', '三国职官谱-单文件版.html');
const rootCopyPath = path.resolve(root, '..', '三国职官谱 .html');
const downloadsCopyPath = process.env.HOME ? path.join(process.env.HOME, 'Downloads', '三国职官谱 .html') : null;
const downloadsBackupPath = process.env.HOME ? path.join(process.env.HOME, 'Downloads', '三国职官谱-本轮迭代前备份.html') : null;

let html = fs.readFileSync(sourcePath, 'utf8');
const registryScript = fs.readFileSync(registryPath, 'utf8').trim();
const wuRecordsScript = fs.readFileSync(wuRecordsPath, 'utf8').trim();
const shuRecordsScript = fs.readFileSync(shuRecordsPath, 'utf8').trim();
const fangzhenSupplementScript = fs.readFileSync(fangzhenSupplementPath, 'utf8').trim();
const personNameNormalizationScript = fs.readFileSync(personNameNormalizationPath, 'utf8').trim();
const personIdentitiesScript = fs.readFileSync(personIdentitiesPath, 'utf8').trim();
const researchModelScript = fs.readFileSync(researchModelPath, 'utf8').trim();
const historyEvidenceScript = fs.readFileSync(historyEvidencePath, 'utf8').trim();
const battleRecordsScript = fs.readFileSync(battleRecordsPath, 'utf8').trim();
const shihuoRecordsScript = fs.readFileSync(shihuoRecordsPath, 'utf8').trim();
const personBiographiesScript = fs.readFileSync(personBiographiesPath, 'utf8').trim();
const personEraRostersScript = fs.readFileSync(personEraRostersPath, 'utf8').trim();
let personPortraitsScript = fs.readFileSync(personPortraitsPath, 'utf8').trim();
let portraitManifestScript = fs.readFileSync(portraitManifestPath, 'utf8').trim();
const epigraphicRecordsScript = fs.readFileSync(epigraphicRecordsPath, 'utf8').trim();
const epigraphicV46JinScript = fs.readFileSync(epigraphicV46JinPath, 'utf8').trim();
const jinshiSchemaScript = fs.readFileSync(jinshiSchemaPath, 'utf8').trim();
const administrativeIndexScript = fs.readFileSync(administrativeIndexPath, 'utf8').trim();
const researchCandidatesScript = fs.readFileSync(researchCandidatesPath, 'utf8').trim();
const hanBaiGuanZhiScript = fs.readFileSync(hanBaiGuanZhiPath, 'utf8').trim();
const generalTitlesScript = fs.readFileSync(generalTitlesPath, 'utf8').trim();
const officeOrderPoliciesScript = fs.readFileSync(officeOrderPoliciesPath, 'utf8').trim();
const kaifuPoliciesScript = fs.readFileSync(kaifuPoliciesPath, 'utf8').trim();
const seatPoliciesScript = fs.readFileSync(seatPoliciesPath, 'utf8').trim();
const officeResidencesScript = fs.readFileSync(officeResidencesPath, 'utf8').trim();
const fangzhenSeatSupplementScript = fs.readFileSync(fangzhenSeatSupplementPath, 'utf8').trim();
const personSourceIndexScript = fs.readFileSync(personSourceIndexPath, 'utf8').trim();
const v60PersonWorkbookImportData = JSON.parse(fs.readFileSync(v60PersonWorkbookImportJsonPath, 'utf8'));
const v60WorkbookKeys = ['personId','name','rawName','normalizedName','zi','birthplace','birthYearRaw','birthYear','deathYearRaw','deathYear','polityRaw','polity','officeRaw','titleRaw','ordinal','workbookSource','homonymGroupId','homonymStatus','readerVisible','readerEligibility','researchDisposition','candidateReason'];
const v60WorkbookTuples = v60PersonWorkbookImportData.people.map(person => v60WorkbookKeys.map(key => person[key] ?? null));
const portableV60PersonWorkbookImportScript = `(function(global){
  var keys=${JSON.stringify(v60WorkbookKeys)}, tuples=${JSON.stringify(v60WorkbookTuples)};
  var people=tuples.map(function(row){var item={};keys.forEach(function(key,index){item[key]=row[index];});return item;});
  global.SGZ_V60_PERSON_WORKBOOK_IMPORT=${JSON.stringify({schemaVersion:v60PersonWorkbookImportData.schemaVersion,modelId:v60PersonWorkbookImportData.modelId,scope:v60PersonWorkbookImportData.scope,workbook:v60PersonWorkbookImportData.workbook,policy:v60PersonWorkbookImportData.policy,summary:v60PersonWorkbookImportData.summary})};
  global.SGZ_V60_PERSON_WORKBOOK_IMPORT.people=people;
})(window);`;
const v61PersonSupplementsScript = fs.readFileSync(v61PersonSupplementsPath, 'utf8').trim();
const v60ResearchLedgerScript = fs.readFileSync(v60ResearchLedgerPath, 'utf8').trim();
const v61EpigraphyResearchScript = fs.readFileSync(v61EpigraphyResearchPath, 'utf8').trim();
const personEntityAuditScript = fs.readFileSync(personEntityAuditPath, 'utf8').trim();
const personV57RuntimeRulesScript = fs.readFileSync(personV57RuntimeRulesPath, 'utf8').trim();
const personZiSupplementScript = fs.readFileSync(personZiSupplementPath, 'utf8').trim();
const portraitBoardScript = fs.readFileSync(portraitBoardPath, 'utf8').trim();
const v58PortraitBoardScript = fs.readFileSync(v58PortraitBoardPath, 'utf8').trim();
const hydronymAuditScript = fs.readFileSync(hydronymAuditPath, 'utf8').trim();
const v55Css = fs.readFileSync(v55CssPath, 'utf8').trim();
const v56Css = fs.readFileSync(v56CssPath, 'utf8').trim();
const v57Css = fs.readFileSync(v57CssPath, 'utf8').trim();
const portablePortraitAssets = {};
const portraitManifestJson = portraitManifestScript
  .replace(/^\s*window\.SGZ_PERSON_PORTRAIT_MANIFEST\s*=\s*/, '')
  .replace(/;\s*$/, '');
const portraitManifestData = JSON.parse(portraitManifestJson);
const portablePortraitPaths = new Set(
  (portraitManifestData.defaultPersonIds || [])
    .map(personId => portraitManifestData.byPersonId?.[personId]?.src)
    .filter(src => /^\.\/assets\/portraits\/.+\.(png|jpe?g|webp)$/i.test(String(src || '')))
);
Object.values(portraitManifestData.byPersonId || {})
  .filter(item => item.portraitKind === 'ui-illustration-v58')
  .map(item => item.src)
  .filter(src => /^\.\/assets\/portraits\/.+\.(png|jpe?g|webp)$/i.test(String(src || '')))
  .forEach(src => portablePortraitPaths.add(src));
const portableImageTempRoot = process.platform === 'darwin' && fs.existsSync('/usr/bin/sips')
  ? fs.mkdtempSync(path.join(os.tmpdir(), 'sgz-portable-portraits-'))
  : '';
let optimizedPortablePortraits = 0;
let optimizedPortableBytes = 0;
for (const relative of portablePortraitPaths) {
  const source = path.join(root, relative.replace(/^\.\//, ''));
  if (!fs.existsSync(source)) throw new Error(`便携导出缺少默认人物立绘：${relative}`);
  const mime = relative.toLowerCase().endsWith('.png') ? 'image/png' : (relative.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg');
  const original = fs.readFileSync(source);
  let selected = original;
  if (portableImageTempRoot) {
    const target = path.join(portableImageTempRoot, `${portablePortraitPaths.size}-${optimizedPortablePortraits}-${path.basename(relative)}`);
    try {
      execFileSync('/usr/bin/sips', ['--resampleHeightWidthMax', '384', source, '--out', target], { stdio: 'ignore' });
      const resized = fs.readFileSync(target);
      if (resized.length < original.length) {
        selected = resized;
        optimizedPortablePortraits += 1;
        optimizedPortableBytes += original.length - resized.length;
      }
    } catch (_) {
      selected = original;
    }
  }
  portablePortraitAssets[relative] = `data:${mime};base64,${selected.toString('base64')}`;
}
if (portableImageTempRoot) fs.rmSync(portableImageTempRoot, { recursive: true, force: true });
const portablePortraitManifestScript = `${portraitManifestScript}
(function(){
  var assets=${JSON.stringify(portablePortraitAssets)};
  function inlineDefaultPortrait(item){
    if(!item||!item.src) return;
    if(assets[item.src]) item.src=assets[item.src];
    else if(item.src.indexOf('./assets/portraits/')===0) item.src='';
  }
  Object.values(window.SGZ_PERSON_PORTRAITS||{}).forEach(inlineDefaultPortrait);
  var manifest=window.SGZ_PERSON_PORTRAIT_MANIFEST||{};
  Object.values(manifest.byPersonId||{}).concat(Object.values(manifest.byName||{})).forEach(function(item){
    inlineDefaultPortrait(item);
  });
  if(manifest.fallbackSrc&&assets[manifest.fallbackSrc]) manifest.fallbackSrc=assets[manifest.fallbackSrc];
  else manifest.fallbackSrc='';
})();`;
const courtBackgroundData = `data:image/png;base64,${fs.readFileSync(courtBackgroundPath).toString('base64')}`;

const replacements = [
  [
    '<title>观史台 · 汉末至西晋史制资料工作台</title>',
    '<title>观史台 · 职官谱｜人物记｜形势图</title>'
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
    '<script src="./data/person-name-normalization.js?v=61.2"></script>',
    `<script>\n${personNameNormalizationScript}\n</script>`
  ],
  [
    '<script src="./data/person-identities.js"></script>',
    `<script>\n${personIdentitiesScript}\n</script>`
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
    '<script src="./data/shihuo-records.js"></script>',
    `<script>\n${shihuoRecordsScript}\n</script>`
  ],
  [
    '<script src="./data/person-biographies.js"></script>',
    `<script>\n${personBiographiesScript}\n</script>`
  ],
  [
    '<script src="./data/person-era-rosters.js"></script>',
    `<script>\n${personEraRostersScript}\n</script>`
  ],
  [
    '<script src="./data/person-portraits.js"></script>',
    `<script>\n${personPortraitsScript}\n</script>`
  ],
  [
    '<script src="./data/portrait-manifest.js"></script>',
    `<script>\n${portablePortraitManifestScript}\n</script>`
  ],
  [
    '<script src="./data/epigraphic-records.js"></script>',
    `<script>\n${epigraphicRecordsScript}\n</script>`
  ],
  [
    '<script src="./data/epigraphic-v46-jin.js"></script>',
    `<script>\n${epigraphicV46JinScript}\n</script>`
  ],
  [
    '<script src="./data/jinshi-schema.js"></script>',
    `<script>\n${jinshiSchemaScript}\n</script>`
  ],
  [
    '<script src="./data/administrative-index.js"></script>',
    `<script>\n${administrativeIndexScript}\n</script>`
  ],
  [
    '<script src="./data/research-candidates.js"></script>',
    `<script>\n${researchCandidatesScript}\n</script>`
  ],
  [
    '<script src="./data/han-bai-guan-zhi.js"></script>',
    `<script>\n${hanBaiGuanZhiScript}\n</script>`
  ],
  [
    '<script src="./data/general-titles.js"></script>',
    `<script>\n${generalTitlesScript}\n</script>`
  ],
  [
    '<script src="./data/office-order-policies.js"></script>',
    `<script>\n${officeOrderPoliciesScript}\n</script>`
  ],
  [
    '<script src="./data/kaifu-policies.js?v=59"></script>',
    `<script>\n${kaifuPoliciesScript}\n</script>`
  ],
  [
    '<script src="./data/office-seat-policies.js"></script>',
    `<script>\n${seatPoliciesScript}\n</script>`
  ],
  [
    '<script src="./data/office-residences.js?v=59"></script>',
    `<script>\n${officeResidencesScript}\n</script>`
  ],
  [
    '<script src="./data/fangzhen-seat-supplement.js"></script>',
    `<script>\n${fangzhenSeatSupplementScript}\n</script>`
  ],
  [
    '<script src="./data/person-source-index.js"></script>',
    `<script>\n${personSourceIndexScript}\n</script>`
  ],
  [
    '<script src="./data/v60-person-workbook-import.js?v=61.2"></script>',
    `<script>\n${portableV60PersonWorkbookImportScript}\n</script>`
  ],
  [
    '<script src="./data/v61-person-supplements.js?v=61.2"></script>',
    `<script>\n${v61PersonSupplementsScript}\n</script>`
  ],
  [
    '<script src="./data/v60-research-ledger.js"></script>',
    `<script>\n${v60ResearchLedgerScript}\n</script>`
  ],
  [
    '<script src="./data/v61-epigraphy-research.js?v=61.2"></script>',
    `<script>\n${v61EpigraphyResearchScript}\n</script>`
  ],
  [
    '<script src="./data/person-entity-audit.js"></script>',
    `<script>\n${personEntityAuditScript}\n</script>`
  ],
  [
    '<script src="./data/person-v57-runtime-rules.js"></script>',
    `<script>\n${personV57RuntimeRulesScript}\n</script>`
  ],
  [
    '<script src="./data/person-zi-supplement.js"></script>',
    `<script>\n${personZiSupplementScript}\n</script>`
  ],
  [
    '<script src="./data/v48-portrait-board.js"></script>',
    `<script>\n${portraitBoardScript}\n</script>`
  ],
  [
    '<script src="./data/v58-portrait-board.js"></script>',
    `<script>\n${v58PortraitBoardScript}\n</script>`
  ],
  [
    '<script src="./assets/map/data/hydronym-audit.js"></script>',
    `<script>\n${hydronymAuditScript}\n</script>`
  ],
  [
    '<link rel="stylesheet" href="./assets/ui/v55.css" />',
    `<style>\n${v55Css}\n</style>`
  ],
  [
    '<link rel="stylesheet" href="./assets/ui/v56.css" />',
    `<style>\n${v56Css}\n</style>`
  ],
  [
    '<link rel="stylesheet" href="./assets/ui/v57.css" />',
    `<style>\n${v57Css}\n</style>`
  ],
  [
    '<link rel="stylesheet" href="./assets/ui/v58.css" />',
    `<style>\n${fs.readFileSync(v58CssPath, 'utf8').trim()}\n</style>`
  ],
  [
    '<link rel="stylesheet" href="./assets/ui/v60.css" />',
    `<style>\n${fs.readFileSync(v60CssPath, 'utf8').trim()}\n</style>`
  ],
  [
    '<link rel="stylesheet" href="./assets/ui/v61.css?v=61.2" />',
    `<style>\n${fs.readFileSync(v61CssPath, 'utf8').trim()}\n</style>`
  ],
  [
    /url\('\.\/assets\/ui\/court-ink-palace\.png'\)/g,
    `url('${courtBackgroundData}')`
  ],
  [
    "const HISTORY_MAP_BASE = window.location?.href\n  ? window.location.href.replace(/[?#].*$/,'').replace(/[^/]*$/,'')+'assets/map/'\n  : './assets/map/';",
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
  const pattern = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!pattern.test(html)) throw new Error(`便携导出构建失败，未找到替换标记：${String(from).slice(0, 80)}`);
  html = html.replace(pattern, to);
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
  'data/hydronym-audit.js',
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
  'js/hydronyms.js',
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
const battleSrcdocMarker = `<script src="../../data/battle-records.js"><\\/script>`;
if (!html.includes(battleSrcdocMarker)) throw new Error('便携导出构建失败，未找到地图内 battle-records 脚本标记');
html = html.replace(battleSrcdocMarker, `<script>\n${escapeForOuterTemplate(battleRecordsScript)}\n<\\/script>`);

fs.mkdirSync(path.dirname(exportPath), { recursive: true });
fs.writeFileSync(exportPath, html, 'utf8');
fs.writeFileSync(rootCopyPath, html, 'utf8');
if (downloadsCopyPath && fs.existsSync(path.dirname(downloadsCopyPath))) {
  try {
    if (fs.existsSync(downloadsCopyPath) && downloadsBackupPath && !fs.existsSync(downloadsBackupPath)) {
      fs.copyFileSync(downloadsCopyPath, downloadsBackupPath);
    }
    fs.writeFileSync(downloadsCopyPath, html, 'utf8');
    console.log(`已同步下载目录使用副本：${downloadsCopyPath}`);
  } catch (error) {
    if (!['EACCES', 'EPERM', 'EROFS'].includes(error?.code)) throw error;
    console.warn(`警告：无法写入下载目录，已保留项目内导出文件：${downloadsCopyPath}`);
  }
}

console.log(`已生成联网便携版：${exportPath}`);
console.log(`已同步工作区根目录副本：${rootCopyPath}`);
console.log(`便携立绘优化：${optimizedPortablePortraits} 张，减少 ${optimizedPortableBytes} 字节；规范源原图未改动`);
