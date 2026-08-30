import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const sourcePath = path.join(root, 'index.html');
const registryPath = path.join(root, 'data', 'map-period-registry.js');
const wuRecordsPath = path.join(root, 'data', 'wu-fangzhen-records.js');
const shuRecordsPath = path.join(root, 'data', 'shu-fangzhen-records.js');
const fangzhenSupplementPath = path.join(root, 'data', 'fangzhen-term-supplement.js');
const v62JinFangzhenPath = path.join(root, 'data', 'v62-jin-fangzhen.js');
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
const v66PeerageStagesPath = path.join(root, 'data', 'v66-peerage-stages.js');
const v66AdministrativeSeatPeriodsPath = path.join(root, 'data', 'v66-administrative-seat-periods.js');
const v66FangzhenReaderPath = path.join(root, 'data', 'v66-fangzhen-reader.js');
const personSourceIndexPath = path.join(root, 'data', 'person-source-index.js');
const v60PersonWorkbookImportJsonPath = path.join(root, 'data', 'v60-person-workbook-import.json');
const v61PersonSupplementsPath = path.join(root, 'data', 'v61-person-supplements.js');
const v62PeopleOfficesPath = path.join(root, 'data', 'v62-people-offices.js');
const v63ReaderPeoplePath = path.join(root, 'data', 'v63-reader-people.js');
const v60ResearchLedgerPath = path.join(root, 'data', 'v60-research-ledger.js');
const v61EpigraphyResearchPath = path.join(root, 'data', 'v61-epigraphy-research.js');
const v62JinshiDisplayPath = path.join(root, 'data', 'v62-jinshi-display.js');
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
const v62CssPath = path.join(root, 'assets', 'ui', 'v62.css');
const consolidatedCssPaths = [
  'tokens.css', 'base.css', 'components.css', 'modules.css', 'responsive.css'
].map(fileName => path.join(root, 'assets', 'ui', fileName));
const uiModulePaths = ['shell', 'persistence', 'people', 'fangzhen', 'jinshi']
  .map(moduleName => ({ moduleName, filePath: path.join(root, 'assets', 'app', `${moduleName}.js`) }));
const persistenceCorePath = path.join(root, 'assets', 'app', 'persistence-core.js');
const exportPath = path.join(root, 'exports', '三国职官谱-单文件版.html');
const lightExportPath = path.join(root, 'exports', '观史台-轻量单文件版.html');
const readerBundlePath = path.join(root, 'exports', '观史台-读者版');
const offlineZipPath = path.join(root, 'exports', '观史台-离线版.zip');
const rootCopyPath = path.resolve(root, '..', '三国职官谱 .html');
const downloadsCopyPath = process.env.HOME ? path.join(process.env.HOME, 'Downloads', '三国职官谱 .html') : null;
const downloadsBackupPath = process.env.HOME ? path.join(process.env.HOME, 'Downloads', '三国职官谱-本轮迭代前备份.html') : null;
const syncRootCopy = process.argv.includes('--sync-root');
const syncDownloadsCopy = process.argv.includes('--sync-downloads');
const maxLightBytes = Number(process.env.SGZ_LIGHT_HTML_MAX_BYTES || 80 * 1024 * 1024);
const portraitByteBudget = Number(process.env.SGZ_LIGHT_PORTRAIT_BUDGET || 18 * 1024 * 1024);
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

let html = fs.readFileSync(sourcePath, 'utf8');
const registryScript = fs.readFileSync(registryPath, 'utf8').trim();
const wuRecordsScript = fs.readFileSync(wuRecordsPath, 'utf8').trim();
const shuRecordsScript = fs.readFileSync(shuRecordsPath, 'utf8').trim();
const fangzhenSupplementScript = fs.readFileSync(fangzhenSupplementPath, 'utf8').trim();
const v62JinFangzhenScript = fs.readFileSync(v62JinFangzhenPath, 'utf8').trim();
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
const v66PeerageStagesScript = fs.readFileSync(v66PeerageStagesPath, 'utf8').trim();
const v66AdministrativeSeatPeriodsScript = fs.readFileSync(v66AdministrativeSeatPeriodsPath, 'utf8').trim();
const v66FangzhenReaderScript = fs.readFileSync(v66FangzhenReaderPath, 'utf8').trim();
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
const v62PeopleOfficesScript = fs.readFileSync(v62PeopleOfficesPath, 'utf8').trim();
if (!fs.existsSync(v63ReaderPeoplePath)) throw new Error('便携导出缺少 data/v63-reader-people.js，请先运行 V63 人物注册表构建。');
const v63ReaderPeopleScript = fs.readFileSync(v63ReaderPeoplePath, 'utf8').trim();
const v60ResearchLedgerScript = fs.readFileSync(v60ResearchLedgerPath, 'utf8').trim();
const v61EpigraphyResearchScript = fs.readFileSync(v61EpigraphyResearchPath, 'utf8').trim();
const v62JinshiDisplayScript = fs.readFileSync(v62JinshiDisplayPath, 'utf8').trim();
const personEntityAuditScript = fs.readFileSync(personEntityAuditPath, 'utf8').trim();
const personV57RuntimeRulesScript = fs.readFileSync(personV57RuntimeRulesPath, 'utf8').trim();
const personZiSupplementScript = fs.readFileSync(personZiSupplementPath, 'utf8').trim();
const portraitBoardScript = fs.readFileSync(portraitBoardPath, 'utf8').trim();
const v58PortraitBoardScript = fs.readFileSync(v58PortraitBoardPath, 'utf8').trim();
const hydronymAuditScript = fs.readFileSync(hydronymAuditPath, 'utf8').trim();
const v55Css = fs.readFileSync(v55CssPath, 'utf8').trim();
const v56Css = fs.readFileSync(v56CssPath, 'utf8').trim();
const v57Css = fs.readFileSync(v57CssPath, 'utf8').trim();
const v62Css = fs.readFileSync(v62CssPath, 'utf8').trim();
const consolidatedCss = consolidatedCssPaths.map(filePath => ({
  fileName: path.basename(filePath),
  source: fs.readFileSync(filePath, 'utf8').trim()
}));
const portablePortraitAssets = {};
const portraitManifestJson = portraitManifestScript
  .replace(/^\s*window\.SGZ_PERSON_PORTRAIT_MANIFEST\s*=\s*/, '')
  .replace(/;\s*$/, '');
const portraitManifestData = JSON.parse(portraitManifestJson);
const readyPortraitItems = Object.values(portraitManifestData.byPersonId || {})
  .filter(item => item?.status === 'ready' && /^\.\/assets\/portraits\/.+\.(png|jpe?g|webp)$/i.test(String(item.src || '')));
const defaultPersonIds = new Set(portraitManifestData.defaultPersonIds || []);
const portraitCandidates = Array.from(new Map(readyPortraitItems.map(item => [item.src, item])).values())
  .map(item => {
    const source = path.join(root, item.src.replace(/^\.\//, ''));
    if (!fs.existsSync(source)) throw new Error(`便携导出缺少人物立绘：${item.src}`);
    return { ...item, source, bytes: fs.statSync(source).size, preferred: defaultPersonIds.has(item.personId) };
  })
  .sort((a, b) => Number(b.preferred) - Number(a.preferred) || (a.catalogOrder ?? 9999) - (b.catalogOrder ?? 9999) || compareText(a.src, b.src));
const portablePortraitPaths = new Set();
let portablePortraitBytes = 0;
for (const item of portraitCandidates) {
  if (portablePortraitBytes + item.bytes > portraitByteBudget) continue;
  portablePortraitPaths.add(item.src);
  portablePortraitBytes += item.bytes;
}
for (const relative of portablePortraitPaths) {
  const source = path.join(root, relative.replace(/^\.\//, ''));
  const mime = relative.toLowerCase().endsWith('.png') ? 'image/png' : (relative.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg');
  portablePortraitAssets[relative] = `data:${mime};base64,${fs.readFileSync(source).toString('base64')}`;
}
const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xw4AAAAASUVORK5CYII=';
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
  Object.values(manifest.assetsById||{}).concat(Object.values(manifest.byPersonId||{}),Object.values(manifest.byName||{})).forEach(function(item){
    inlineDefaultPortrait(item);
  });
  if(manifest.fallbackSrc&&assets[manifest.fallbackSrc]) manifest.fallbackSrc=assets[manifest.fallbackSrc];
  else manifest.fallbackSrc=${JSON.stringify(transparentPixel)};
})();`;
const courtBackgroundData = `data:image/png;base64,${fs.readFileSync(courtBackgroundPath).toString('base64')}`;
const persistenceCoreScript = fs.readFileSync(persistenceCorePath, 'utf8').trim();

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
    "script.src='./assets/vendor/xlsx/xlsx.full.min.js';script.async=true;",
    "script.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';script.async=true;"
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
    '<script src="./data/v62-jin-fangzhen.js?v=62"></script>',
    `<script>\n${v62JinFangzhenScript}\n</script>`
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
    '<script src="./assets/app/persistence-core.js?v=66.2"></script>',
    `<script>\n${persistenceCoreScript}\n</script>`
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
    '<script src="./data/v62-people-offices.js?v=62"></script>',
    `<script>\n${v62PeopleOfficesScript}\n</script>`
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
    '<script src="./data/v62-jinshi-display.js?v=62"></script>',
    `<script>\n${v62JinshiDisplayScript}\n</script>`
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
    '<link rel="stylesheet" href="./assets/ui/v62.css?v=62" />',
    `<style>\n${v62Css}\n</style>`
  ],
  ...consolidatedCss.map(item => [
    `<link rel="stylesheet" href="./assets/ui/${item.fileName}" />`,
    `<style>\n${item.source}\n</style>`
  ]),
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

const optionalReplacementPrefixes = [
  'const HISTORY_MAP_BASE = window.location?.href',
  '<script src="./data/portrait-manifest.js"></script>',
  '<script src="./data/epigraphic-v46-jin.js"></script>',
  '<link rel="stylesheet" href="./assets/ui/v55.css" />',
  '<link rel="stylesheet" href="./assets/ui/v56.css" />',
  '<link rel="stylesheet" href="./assets/ui/v57.css" />',
  '<link rel="stylesheet" href="./assets/ui/v58.css" />',
  '<link rel="stylesheet" href="./assets/ui/v60.css" />',
  '<link rel="stylesheet" href="./assets/ui/v61.css?v=61.2" />',
  '<link rel="stylesheet" href="./assets/ui/v62.css?v=62" />',
  '<div>本地项目缺少或未能读取以下组件：<b>',
  '<div style="margin-top:10px;">请确认没有单独移动 index.html',
  '<div style="margin-top:10px;">如文件齐全仍无法打开'
];
replacements.forEach(([from, to]) => {
  const pattern = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!pattern.test(html)) {
    if (typeof from === 'string' && /^<script src="\.\/(?:data|assets\/map\/data)\//.test(from)) return;
    if (optionalReplacementPrefixes.some(prefix => String(from).startsWith(prefix))) return;
    throw new Error(`便携导出构建失败，未找到替换标记：${String(from).slice(0, 80)}`);
  }
  html = html.replace(pattern, to);
});
// V66 replaces the polity/jurisdiction-wide seat guess with a 30-record,
// time-scoped reader projection. Keep compatibility code if present, but never
// embed or lazy-load the obsolete generic patch in either portable artifact.
html = html.replace(/^\s*loadSgzDataScript\('fangzhen-seat-supplement',[^\n]+\n?/gm, '');
for (const marker of [
  '<script src="./data/v63-reader-people.js"></script>',
  '<script src="./data/v63-reader-people.js?v=63"></script>',
  '<script src="./data/v63-reader-people.js?v=65"></script>',
  '<script src="./data/v63-reader-people.js?v=66"></script>'
]) {
  if (html.includes(marker)) html = html.replace(marker, `<script>\n${v63ReaderPeopleScript}\n</script>`);
}
const portableLateData = Array.from(new Set([
  registryScript, wuRecordsScript, shuRecordsScript, fangzhenSupplementScript, v62JinFangzhenScript,
  personNameNormalizationScript, personIdentitiesScript, researchModelScript, historyEvidenceScript,
  battleRecordsScript, shihuoRecordsScript, personBiographiesScript, personEraRostersScript,
  personPortraitsScript, portablePortraitManifestScript, epigraphicRecordsScript, epigraphicV46JinScript,
  jinshiSchemaScript, administrativeIndexScript, researchCandidatesScript, hanBaiGuanZhiScript,
  generalTitlesScript, officeOrderPoliciesScript, kaifuPoliciesScript, seatPoliciesScript,
  officeResidencesScript, v66PeerageStagesScript, v66AdministrativeSeatPeriodsScript,
  v66FangzhenReaderScript, personSourceIndexScript,
  portableV60PersonWorkbookImportScript, v61PersonSupplementsScript, v62PeopleOfficesScript,
  v63ReaderPeopleScript, v60ResearchLedgerScript, v61EpigraphyResearchScript, v62JinshiDisplayScript,
  personEntityAuditScript, personV57RuntimeRulesScript, personZiSupplementScript,
  portraitBoardScript, v58PortraitBoardScript, hydronymAuditScript
])).filter(source => source && !html.includes(source));
if (portableLateData.length) {
  html = html.replace('</head>', `${portableLateData.map(source => `<script>\n${source}\n</script>`).join('\n')}\n</head>`);
}
if (html.includes('data/fangzhen-seat-supplement.js')) {
  throw new Error('便携导出仍引用旧通用治所补丁');
}

// 新增地图图层与行政快照尚未部署到历史远端包；便携版把这些小型运行脚本
// 内嵌进 srcdoc，同时继续复用远端 Leaflet、州郡几何与其余稳定模块。
const hasLegacyEmbeddedMap = html.includes('const HISTORY_MAP_SRCDOC = `');
function escapeForOuterTemplate(source) {
  return source
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/<\/script>/gi, '<\\/script>');
}

if (hasLegacyEmbeddedMap) [
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
if (hasLegacyEmbeddedMap) {
  const battleSrcdocMarker = `<script src="../../data/battle-records.js"><\\/script>`;
  if (!html.includes(battleSrcdocMarker)) throw new Error('便携导出构建失败，未找到地图内 battle-records 脚本标记');
  html = html.replace(battleSrcdocMarker, `<script>\n${escapeForOuterTemplate(battleRecordsScript)}\n<\\/script>`);
} else {
  html = html.replace(
    'const HISTORY_MAP_URL = "./assets/map/history-embed.html";',
    'const HISTORY_MAP_URL = "https://workbuddy-space-static.codebuddy.work/page/q71T7ZIe9O6xmZrTj3ldoy/1/index.html";'
  );
}

function scriptSafe(source) {
  return String(source).replace(/<\/script/gi, '<\\/script');
}

function classicUiModule(moduleName, source) {
  const exportNames = Array.from(new Set(
    [...String(source).matchAll(/\bexport\s+(?:const|function)\s+([A-Za-z_$][\w$]*)/g)].map(match => match[1])
  ));
  if (!exportNames.length) throw new Error(`轻量单 HTML 无法识别界面模块导出：${moduleName}`);
  const body = String(source).replace(/\bexport\s+(?=(?:const|function)\b)/g, '');
  return `(function(global){\n${body}\nglobal.SGZ_UI_MODULES=global.SGZ_UI_MODULES||{};global.SGZ_UI_MODULES[${JSON.stringify(moduleName)}]=Object.freeze({${exportNames.join(',')}});\n})(window);`;
}

function buildReaderLightHtml() {
  const readerIndexPath = path.join(readerBundlePath, 'index.html');
  if (!fs.existsSync(readerIndexPath)) throw new Error('轻量单 HTML 需要先生成 exports/观史台-读者版。');
  let result = fs.readFileSync(readerIndexPath, 'utf8');
  const lazyDataReferences = Array.from(new Set(
    [...result.matchAll(/\bloadSgzDataScript\(\s*[^,]+,\s*["']([^"']+)["']/g)]
      .map(match => String(match[1]).split(/[?#]/, 1)[0].replace(/^\.\//, ''))
      .filter(Boolean)
  ));
  result = result.replace(/<link\b([^>]*?)href=["']([^"']+)["']([^>]*)\/>/g, (tag, before, rawReference) => {
    const reference = String(rawReference).split(/[?#]/, 1)[0].replace(/^\.\//, '');
    if (!reference || /^(?:https?:|data:|#)/.test(reference) || !/\brel=["']stylesheet["']/.test(tag)) return tag;
    const filePath = path.join(readerBundlePath, reference);
    if (!fs.existsSync(filePath)) throw new Error(`轻量单 HTML 缺少读者样式：${reference}`);
    let css = fs.readFileSync(filePath, 'utf8');
    css = css.replace(/url\(\s*["']?\.\/court-ink-palace\.png["']?\s*\)/g, `url('${courtBackgroundData}')`);
    return `<style>\n${css}\n</style>`;
  });
  result = result.replace(/<script\b([^>]*?)src=["']([^"']+)["']([^>]*)><\/script>/g, (tag, before, rawReference) => {
    const reference = String(rawReference).split(/[?#]/, 1)[0].replace(/^\.\//, '');
    if (!reference || /^(?:https?:|data:|#)/.test(reference)) return tag;
    const filePath = path.join(readerBundlePath, reference);
    if (!fs.existsSync(filePath)) throw new Error(`轻量单 HTML 缺少读者脚本：${reference}`);
    return `<script>\n${scriptSafe(fs.readFileSync(filePath, 'utf8'))}\n</script>`;
  });
  const moduleScripts = uiModulePaths.map(({ moduleName, filePath }) => {
    if (!fs.existsSync(filePath)) throw new Error(`轻量单 HTML 缺少界面模块：${path.relative(root, filePath)}`);
    return `<script>\n${scriptSafe(classicUiModule(moduleName, fs.readFileSync(filePath, 'utf8')))}\n</script>`;
  });
  const lazyReaderPayloads = lazyDataReferences.map(reference => {
    let source;
    if (reference === 'data/portrait-manifest.js') source = portablePortraitManifestScript;
    else {
      const filePath = path.join(readerBundlePath, reference);
      if (!fs.existsSync(filePath)) throw new Error(`轻量单 HTML 缺少按需读者数据：${reference}`);
      source = fs.readFileSync(filePath, 'utf8');
    }
    return `<script>\n${scriptSafe(source)}\n</script>`;
  });
  result = result.replace('</head>', `${moduleScripts.concat(lazyReaderPayloads).join('\n')}\n<meta name="sgz-build" content="reader-light" />\n</head>`);
  result = result
    .replace("script.src='./assets/vendor/xlsx/xlsx.full.min.js';script.async=true;", "script.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';script.async=true;")
    .replace('const HISTORY_MAP_URL = "./assets/map/history-embed.html";', 'const HISTORY_MAP_URL = "https://workbuddy-space-static.codebuddy.work/page/q71T7ZIe9O6xmZrTj3ldoy/1/index.html";')
    .replace(/,"sourcePath":"[^"]*"/g, '')
    .replace(/\/Users\/[^"'<>\\\n\r]*/g, '[local-source-redacted]');
  return result;
}

// The deployable single HTML is derived from the already-sanitized reader
// projection.  The legacy audit-compatible export above remains a separate,
// non-deployable compatibility artifact.
let lightHtml = buildReaderLightHtml();
if (/window\.SGZ_(?:V60_PERSON_WORKBOOK_IMPORT|V61_PERSON_SUPPLEMENTS|V60_RESEARCH_LEDGER|V61_EPIGRAPHY_RESEARCH|PERSON_SOURCE_INDEX)\s*=/.test(lightHtml)) {
  throw new Error('轻量单 HTML 仍内嵌审校负载');
}
if (/\/Users\//.test(lightHtml)) throw new Error('轻量单 HTML 泄露本机绝对路径');

fs.mkdirSync(path.dirname(exportPath), { recursive: true });
fs.writeFileSync(exportPath, html, 'utf8');
fs.writeFileSync(lightExportPath, lightHtml, 'utf8');
const lightBytes = Buffer.byteLength(lightHtml);
if (lightBytes > maxLightBytes) {
  throw new Error(`轻量单 HTML 为 ${lightBytes} 字节，超过 ${maxLightBytes} 字节门禁。请降低 SGZ_LIGHT_PORTRAIT_BUDGET 后重建。`);
}
if (syncRootCopy) fs.writeFileSync(rootCopyPath, lightHtml, 'utf8');
if (syncDownloadsCopy && downloadsCopyPath && fs.existsSync(path.dirname(downloadsCopyPath))) {
  try {
    if (fs.existsSync(downloadsCopyPath) && downloadsBackupPath && !fs.existsSync(downloadsBackupPath)) {
      fs.copyFileSync(downloadsCopyPath, downloadsBackupPath);
    }
    fs.writeFileSync(downloadsCopyPath, lightHtml, 'utf8');
    console.log(`已同步下载目录使用副本：${downloadsCopyPath}`);
  } catch (error) {
    if (!['EACCES', 'EPERM', 'EROFS'].includes(error?.code)) throw error;
    console.warn(`警告：无法写入下载目录，已保留项目内导出文件：${downloadsCopyPath}`);
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function listFiles(directory) {
  const result = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => compareText(a.name, b.name))) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) result.push(fullPath);
    }
  }
  visit(directory);
  return result;
}

function dosDateTime() {
  // 归档时间固定为 2026-08-30 00:00:00，避免文件 mtime 导致 ZIP 每次重建变化。
  return { date: ((2026 - 1980) << 9) | (8 << 5) | 30, time: 0 };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function offlineRuntimeResourceMatches(relative, contents) {
  if (!/\.(?:html|css|js)$/i.test(relative)) return [];
  const patterns = relative.endsWith('.html')
    ? [
        /<(?:script|img|source|video|audio|iframe|embed)\b[^>]*\bsrc\s*=\s*["'](?:https?:)?\/\//gi,
        /<link\b[^>]*\bhref\s*=\s*["'](?:https?:)?\/\//gi,
        /<object\b[^>]*\bdata\s*=\s*["'](?:https?:)?\/\//gi
      ]
    : relative.endsWith('.css')
      ? [/@import\s+(?:url\()?\s*["']?(?:https?:)?\/\//gi, /url\(\s*["']?(?:https?:)?\/\//gi]
      : [
          /\b(?:fetch|import)\(\s*["'](?:https?:)?\/\//gi,
          /\bnew\s+(?:Worker|SharedWorker)\(\s*["'](?:https?:)?\/\//gi,
          /\.open\(\s*["'][A-Z]+["']\s*,\s*["'](?:https?:)?\/\//gi,
          /\b(?:src|url)\s*=\s*["'](?:https?:)?\/\//gi,
          /\bL\.(?:tileLayer|imageOverlay)\(\s*["'](?:https?:)?\/\//gi
        ];
  return patterns.flatMap(pattern => [...contents.matchAll(pattern)].map(match => match[0]));
}

function buildOfflineEntryBuffers(sourceDirectory) {
  const entries = new Map();
  for (const filePath of listFiles(sourceDirectory)) {
    const relative = path.relative(sourceDirectory, filePath).split(path.sep).join('/');
    entries.set(relative, fs.readFileSync(filePath));
  }
  const configRelative = 'assets/map/js/config.js';
  if (!entries.has(configRelative)) throw new Error(`离线 ZIP 缺少 ${configRelative}`);
  const originalConfig = entries.get(configRelative).toString('utf8');
  let replacedTileSources = 0;
  const offlineConfig = originalConfig.replace(
    /(\burl\s*:\s*)["']https:\/\/[^"']+["']/g,
    (whole, prefix) => {
      replacedTileSources += 1;
      return `${prefix}${JSON.stringify(transparentPixel)}`;
    }
  );
  if (replacedTileSources < 5) throw new Error(`离线 ZIP 底图源替换不完整：仅 ${replacedTileSources} 项`);
  entries.set(configRelative, Buffer.from(offlineConfig, 'utf8'));

  const bundleManifestRelative = 'reader-bundle.json';
  if (!entries.has(bundleManifestRelative)) throw new Error('离线 ZIP 缺少 reader-bundle.json');
  const manifest = JSON.parse(entries.get(bundleManifestRelative).toString('utf8'));
  const expectedPaths = [...entries.keys()].filter(relative => relative !== bundleManifestRelative).sort();
  const originalManifestPaths = (manifest.files || []).map(item => item.path).sort();
  if (JSON.stringify(expectedPaths) !== JSON.stringify(originalManifestPaths)) {
    throw new Error('离线 ZIP 输入与 reader-bundle.json 清单不一致');
  }
  manifest.files = expectedPaths.map(relative => {
    const buffer = entries.get(relative);
    return { path: relative, bytes: buffer.length, sha256: sha256(buffer) };
  });
  manifest.fileCount = manifest.files.length;
  manifest.totalBytes = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
  manifest.aggregateSha256 = sha256(manifest.files.map(file => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join(''));
  manifest.offline = {
    runtimeNetworkDependencies: 0,
    basemapFallback: 'bundled-transparent-tile',
    transformedFiles: [configRelative]
  };
  entries.set(bundleManifestRelative, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'));

  for (const [relative, buffer] of entries) {
    const matches = offlineRuntimeResourceMatches(relative, buffer.toString('utf8'));
    if (matches.length) throw new Error(`离线 ZIP 仍包含远程运行资源：${relative} -> ${matches[0]}`);
  }
  return { entries, replacedTileSources };
}

function buildDeterministicZip(sourceDirectory, targetPath) {
  if (!fs.existsSync(sourceDirectory)) {
    console.warn(`警告：读者包尚未构建，跳过离线 ZIP：${sourceDirectory}`);
    return null;
  }
  const offlineInput = buildOfflineEntryBuffers(sourceDirectory);
  const files = [...offlineInput.entries.keys()].sort();
  const fd = fs.openSync(targetPath, 'w');
  const centralEntries = [];
  let offset = 0;
  const fixed = dosDateTime();
  try {
    for (const relative of files) {
      const archiveName = `观史台-离线版/${relative}`;
      const nameBuffer = Buffer.from(archiveName, 'utf8');
      const input = offlineInput.entries.get(relative);
      const compressed = zlib.deflateRawSync(input, { level: 9 });
      const useDeflate = compressed.length < input.length;
      const payload = useDeflate ? compressed : input;
      const checksum = crc32(input);
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x0800, 6);
      local.writeUInt16LE(useDeflate ? 8 : 0, 8);
      local.writeUInt16LE(fixed.time, 10);
      local.writeUInt16LE(fixed.date, 12);
      local.writeUInt32LE(checksum, 14);
      local.writeUInt32LE(payload.length, 18);
      local.writeUInt32LE(input.length, 22);
      local.writeUInt16LE(nameBuffer.length, 26);
      local.writeUInt16LE(0, 28);
      fs.writeSync(fd, local);
      fs.writeSync(fd, nameBuffer);
      fs.writeSync(fd, payload);
      centralEntries.push({ nameBuffer, checksum, compressedBytes: payload.length, bytes: input.length, method: useDeflate ? 8 : 0, offset });
      offset += local.length + nameBuffer.length + payload.length;
    }
    const centralOffset = offset;
    for (const entry of centralEntries) {
      const central = Buffer.alloc(46);
      central.writeUInt32LE(0x02014b50, 0);
      central.writeUInt16LE(20, 4);
      central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0x0800, 8);
      central.writeUInt16LE(entry.method, 10);
      central.writeUInt16LE(fixed.time, 12);
      central.writeUInt16LE(fixed.date, 14);
      central.writeUInt32LE(entry.checksum, 16);
      central.writeUInt32LE(entry.compressedBytes, 20);
      central.writeUInt32LE(entry.bytes, 24);
      central.writeUInt16LE(entry.nameBuffer.length, 28);
      central.writeUInt16LE(0, 30);
      central.writeUInt16LE(0, 32);
      central.writeUInt16LE(0, 34);
      central.writeUInt16LE(0, 36);
      central.writeUInt32LE(0, 38);
      central.writeUInt32LE(entry.offset, 42);
      fs.writeSync(fd, central);
      fs.writeSync(fd, entry.nameBuffer);
      offset += central.length + entry.nameBuffer.length;
    }
    const centralBytes = offset - centralOffset;
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(centralEntries.length, 8);
    end.writeUInt16LE(centralEntries.length, 10);
    end.writeUInt32LE(centralBytes, 12);
    end.writeUInt32LE(centralOffset, 16);
    end.writeUInt16LE(0, 20);
    fs.writeSync(fd, end);
  } finally {
    fs.closeSync(fd);
  }
  return {
    files: centralEntries.length,
    bytes: fs.statSync(targetPath).size,
    remoteRuntimeResources: 0,
    replacedTileSources: offlineInput.replacedTileSources
  };
}

const offlineZip = buildDeterministicZip(readerBundlePath, offlineZipPath);
console.log(`已生成轻量联网单文件：${lightExportPath}（${lightBytes} 字节）`);
console.log(`已更新兼容便携路径：${exportPath}`);
console.log(`单文件立绘：内嵌 ${portablePortraitPaths.size}/${portraitCandidates.length} 张，原图预算 ${portablePortraitBytes}/${portraitByteBudget} 字节`);
if (offlineZip) console.log(`已生成真离线 ZIP：${offlineZipPath}（${offlineZip.files} 个文件，${offlineZip.bytes} 字节，远程运行依赖 0）`);
if (syncRootCopy) console.log(`已按 --sync-root 同步工作区根目录副本：${rootCopyPath}`);
