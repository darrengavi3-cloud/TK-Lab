import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const readerDir = path.join(root, 'exports', '观史台-读者版');
const lightHtmlPath = path.join(root, 'exports', '观史台-轻量单文件版.html');
const legacyHtmlPath = path.join(root, 'exports', '三国职官谱-单文件版.html');
const offlineZipPath = path.join(root, 'exports', '观史台-离线版.zip');
const deploymentManifestPath = path.join(root, 'exports', 'deployment-manifest.json');

function assert(condition, message) {
  if (!condition) throw new Error(`V64 验证失败：${message}`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function evaluateWindow(relative) {
  return evaluateWindowFile(path.join(root, relative), relative);
}

function evaluateWindowFile(filePath, label = filePath) {
  const context = { window: {} };
  context.globalThis = context.window;
  vm.createContext(context);
  new vm.Script(fs.readFileSync(filePath, 'utf8'), { filename: label }).runInContext(context);
  return context.window;
}

function listFiles(directory) {
  const result = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) result.push(fullPath);
    }
  }
  visit(directory);
  return result;
}

function verifyBundleManifest(directory) {
  const manifestPath = path.join(directory, 'reader-bundle.json');
  assert(fs.existsSync(manifestPath), `缺少 ${path.relative(root, manifestPath)}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const actualFiles = listFiles(directory)
    .map(filePath => path.relative(directory, filePath).split(path.sep).join('/'))
    .filter(relative => relative !== 'reader-bundle.json')
    .sort();
  const manifestPaths = (manifest.files || []).map(item => item.path).sort();
  assert(manifest.fileCount === manifest.files.length, 'reader-bundle 文件数不闭合');
  assert(JSON.stringify(actualFiles) === JSON.stringify(manifestPaths), 'reader-bundle 清单与目录不精确等价');
  for (const item of manifest.files) {
    const filePath = path.join(directory, item.path);
    const buffer = fs.readFileSync(filePath);
    assert(buffer.length === item.bytes && sha256(buffer) === item.sha256, `reader-bundle 哈希不匹配 ${item.path}`);
  }
  const aggregate = sha256(manifest.files.map(file => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join(''));
  assert(aggregate === manifest.aggregateSha256, 'reader-bundle 聚合哈希不匹配');
  return manifest;
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

function readZipEntries(zipPath) {
  const archive = fs.readFileSync(zipPath);
  let eocd = -1;
  for (let offset = archive.length - 22; offset >= Math.max(0, archive.length - 65557); offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  assert(eocd >= 0, '离线 ZIP 缺少中央目录结束记录');
  const entryCount = archive.readUInt16LE(eocd + 10);
  let centralOffset = archive.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let index = 0; index < entryCount; index += 1) {
    assert(archive.readUInt32LE(centralOffset) === 0x02014b50, `离线 ZIP 中央目录第 ${index + 1} 项无效`);
    const flags = archive.readUInt16LE(centralOffset + 8);
    const method = archive.readUInt16LE(centralOffset + 10);
    const compressedBytes = archive.readUInt32LE(centralOffset + 20);
    const bytes = archive.readUInt32LE(centralOffset + 24);
    const nameBytes = archive.readUInt16LE(centralOffset + 28);
    const extraBytes = archive.readUInt16LE(centralOffset + 30);
    const commentBytes = archive.readUInt16LE(centralOffset + 32);
    const localOffset = archive.readUInt32LE(centralOffset + 42);
    assert((flags & 0x0800) !== 0, '离线 ZIP 文件名未标记为 UTF-8');
    const archiveName = archive.subarray(centralOffset + 46, centralOffset + 46 + nameBytes).toString('utf8');
    assert(archive.readUInt32LE(localOffset) === 0x04034b50, `离线 ZIP 本地文件头无效 ${archiveName}`);
    const localNameBytes = archive.readUInt16LE(localOffset + 26);
    const localExtraBytes = archive.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameBytes + localExtraBytes;
    const compressed = archive.subarray(dataOffset, dataOffset + compressedBytes);
    const data = method === 0 ? compressed : method === 8 ? zlib.inflateRawSync(compressed) : null;
    assert(data && data.length === bytes, `离线 ZIP 条目无法解压 ${archiveName}`);
    assert(archiveName.startsWith('观史台-离线版/'), `离线 ZIP 条目超出固定根目录 ${archiveName}`);
    const relative = archiveName.slice('观史台-离线版/'.length);
    assert(relative && !relative.split('/').includes('..') && !entries.has(relative), `离线 ZIP 路径非法或重复 ${archiveName}`);
    entries.set(relative, data);
    centralOffset += 46 + nameBytes + extraBytes + commentBytes;
  }
  return entries;
}

function verifyBundleEntries(entries) {
  assert(entries.has('reader-bundle.json'), '离线 ZIP 缺少 reader-bundle.json');
  const manifest = JSON.parse(entries.get('reader-bundle.json').toString('utf8'));
  const actualPaths = [...entries.keys()].filter(relative => relative !== 'reader-bundle.json').sort();
  const manifestPaths = (manifest.files || []).map(item => item.path).sort();
  assert(manifest.fileCount === manifest.files.length, '离线 reader-bundle 文件数不闭合');
  assert(JSON.stringify(actualPaths) === JSON.stringify(manifestPaths), '离线 reader-bundle 清单与 ZIP 条目不精确等价');
  for (const item of manifest.files) {
    const buffer = entries.get(item.path);
    assert(buffer && buffer.length === item.bytes && sha256(buffer) === item.sha256, `离线 reader-bundle 哈希不匹配 ${item.path}`);
  }
  const aggregate = sha256(manifest.files.map(file => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join(''));
  assert(aggregate === manifest.aggregateSha256, '离线 reader-bundle 聚合哈希不匹配');
  return manifest;
}

for (const required of [readerDir, lightHtmlPath, legacyHtmlPath, offlineZipPath, deploymentManifestPath, path.join(root, 'sources.lock.json')]) {
  assert(fs.existsSync(required), `缺少产物 ${path.relative(root, required)}`);
}

const registryJson = readJson('data/v63-person-registry.json');
const readerJson = readJson('data/v63-reader-people.json');
const registryRuntime = evaluateWindow('data/v63-person-registry.js').SGZ_V63_PERSON_REGISTRY;
const readerRuntime = evaluateWindow('data/v63-reader-people.js').SGZ_V63_READER_PEOPLE;
assert(JSON.stringify(registryJson) === JSON.stringify(registryRuntime), 'V63 person-registry JSON/JS 不等价');
assert(JSON.stringify(readerJson) === JSON.stringify(readerRuntime), 'V63 reader-people JSON/JS 不等价');

const mapRegistryJson = readJson('data/map-period-registry.json');
const mapRegistryRuntime = evaluateWindow('data/map-period-registry.js').HISTORY_MAP_REGISTRY;
assert(JSON.stringify(mapRegistryJson) === JSON.stringify(mapRegistryRuntime), '地图注册表 JSON/JS 不等价');
assert(JSON.stringify((mapRegistryJson.periods || []).map(period => period.year)) === JSON.stringify([184,189,190,194,199,200,208,219,220,228,263,264,266,280,290,311]), '十六期地图年份不变量已改变');
assert(JSON.stringify(mapRegistryJson.requiredPeriodIds) === JSON.stringify((mapRegistryJson.periods || []).map(period => period.id)), '十六期地图 ID 不变量已改变');

const bannedReaderFiles = [
  'data/person-source-index.js', 'data/person-zi-supplement.js', 'data/v60-person-workbook-import.js', 'data/v61-person-supplements.js',
  'data/v62-people-offices.js', 'data/v60-research-ledger.js', 'data/v61-epigraphy-research.js',
  'data/person-entity-audit.js', 'data/v48-portrait-board.js', 'data/v58-portrait-board.js',
  'data/v63-person-registry.js', 'data/v65-battle-coordinate-audit.js', 'data/v65-epigraphy-audit.js',
  'data/v65-fangzhen-audit.js', 'data/v65-general-title-research.js', 'data/v65-general-title-research.json',
  'data/v65-shihuo-metrics-audit.js', 'data/v65-volume-review.js',
  'assets/map/data/hydronym-audit.js'
];
for (const relative of bannedReaderFiles) assert(!fs.existsSync(path.join(readerDir, relative)), `读者包误带 ${relative}`);
const readerFiles = listFiles(readerDir);
const readerManifest = verifyBundleManifest(readerDir);
const serializedSensitiveKeys = [
  'workbookSource','workbookSources','workbookHash','sheet','row','sourceRecordId','rowAudit',
  'searchLog','externalSearchLog','searchState','historicalDisposition','researchDisposition',
  'publicationStatus','sourceLocator','sourceExcerpt','evidence','sourceRefs','reviewQueue','candidateAudit','researchQueue','auditTrail'
];
const serializedSensitivePattern = new RegExp(`"(?:${serializedSensitiveKeys.join('|')})"\\s*:`, 'g');
const sensitiveObjectKeyPattern = new RegExp(`(?:^|[,{;])\\s*(?:["'](?:${serializedSensitiveKeys.join('|')})["']|(?:${serializedSensitiveKeys.join('|')}))\\s*:`, 'gm');
const sensitiveKeyLiteralPattern = new RegExp(`["'](?:${serializedSensitiveKeys.join('|')})["']`, 'g');
const codeIdentifierExceptions = new Set(readerManifest.readerProjection?.codeIdentifierExceptions || []);
const thirdPartyCodePrefixes = readerManifest.readerProjection?.thirdPartyCodePrefixes || [];
const mapAuditIdentifiers = ['HISTORY_MAP_AUDIT','auditDate','fixedIssues','periodReview','remainingCaveat'];
const identifierExceptionHits = new Set();
for (const filePath of readerFiles) {
  if (!/\.(?:html|js|json|css|txt|md)$/i.test(filePath)) continue;
  const relative = path.relative(readerDir, filePath).split(path.sep).join('/');
  const contents = fs.readFileSync(filePath, 'utf8');
  assert(!/\/Users\//.test(contents), `读者包泄露本机绝对路径 ${relative}`);
  if (/\.(?:html|js|json)$/i.test(relative)) {
    const thirdPartyCode = thirdPartyCodePrefixes.some(prefix => relative.startsWith(prefix));
    serializedSensitivePattern.lastIndex = 0;
    sensitiveObjectKeyPattern.lastIndex = 0;
    sensitiveKeyLiteralPattern.lastIndex = 0;
    const hasSensitiveKey = serializedSensitivePattern.test(contents) || sensitiveObjectKeyPattern.test(contents) || sensitiveKeyLiteralPattern.test(contents);
    if (hasSensitiveKey && !thirdPartyCode) {
      assert(codeIdentifierExceptions.has(relative), `读者文件包含未登记审校键 ${relative}`);
      identifierExceptionHits.add(relative);
      assert(!/window\.SGZ_(?:V60_PERSON_WORKBOOK_IMPORT|V61_PERSON_SUPPLEMENTS|V60_RESEARCH_LEDGER|V61_EPIGRAPHY_RESEARCH|V63_PERSON_REGISTRY|PERSON_SOURCE_INDEX)\s*=/.test(contents), `例外文件内嵌审校全局对象 ${relative}`);
    }
    if (!thirdPartyCode && !codeIdentifierExceptions.has(relative)) {
      assert(!/["'](?:audit-only|review-only)["']/.test(contents), `读者文件包含审校状态 ${relative}`);
    }
    if (!thirdPartyCode) {
      for (const identifier of mapAuditIdentifiers) assert(!contents.includes(identifier), `读者文件泄露地图审校标识 ${identifier}: ${relative}`);
    }
  }
}
for (const relative of codeIdentifierExceptions) {
  assert(fs.existsSync(path.join(readerDir, relative)), `审校键代码例外文件不存在 ${relative}`);
  assert(identifierExceptionHits.has(relative), `代码例外已无命中，应删除 ${relative}`);
}
const readerHtml = fs.readFileSync(path.join(readerDir, 'index.html'), 'utf8');
const readerHead = readerHtml.slice(0, readerHtml.indexOf('</head>') + 7);
assert(!/<script\s+[^>]*src=["'][^"']*assets\/vendor\/xlsx\/xlsx\.full\.min\.js/.test(readerHead), '读者首屏仍加载 SheetJS');
assert(!readerHead.includes('v69-fangzhen-reader.js'), '读者首屏仍同步阻塞加载州镇读者投影');
assert(readerHtml.includes("loadSgzDataScript('v69-fangzhen-reader','./data/v69-fangzhen-reader.js?v=69','SGZ_V69_FANGZHEN_READER')"), '当前州镇读者投影未接入共享按需／预取加载器');
assert(!readerHtml.includes('v65-fangzhen-reader.js'), '读者 HTML 仍加载已被 V66 替代的旧州镇发布登记');
assert(!/window\.SGZ_(?:V60_PERSON_WORKBOOK_IMPORT|V61_PERSON_SUPPLEMENTS|V60_RESEARCH_LEDGER|V61_EPIGRAPHY_RESEARCH|PERSON_SOURCE_INDEX)\s*=/.test(readerHtml), '读者 HTML 内嵌审校数据');
assert(!/"(?:workbookSource|workbookSources|workbookHash|sheet|row|sourceRecordId|rowAudit|externalSearchLog|searchLog|searchState|historicalDisposition|researchDisposition|publicationStatus|sourceLocator|sourceExcerpt|evidence)"\s*:/.test(readerHtml), '读者 HTML 内嵌审校字段负载');
assert(readerHtml.includes('SGZ_READER_BUILD') && readerHtml.includes('v63-reader-people.js'), '读者 HTML 未启用 V63 纯净投影');
assert(readerHtml.includes('v63-reader-people.js?v=66'), 'V66 人物读者包缺少缓存版本标记，旧浏览器可能继续读取过期专题关联');
const headHtml = readerHtml.slice(0, readerHtml.indexOf('</head>') + 7);
const firstScreenFiles = new Set(['index.html']);
for (const match of headHtml.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/g)) {
  const reference = String(match[1] || '').split(/[?#]/, 1)[0].replace(/^\.\//, '');
  if (!reference || /^(?:https?:|data:|#)/.test(reference)) continue;
  firstScreenFiles.add(reference);
}
// shell and persistence are deliberately started by SGZ_UI_CORE_READY even
// though they use dynamic import() syntax.  They are therefore first-screen
// bytes and must be counted by the 800 KiB gate.
for (const relative of ['assets/app/shell.js', 'assets/app/persistence.js']) {
  if (readerHtml.includes(`import('./${relative}')`)) firstScreenFiles.add(relative);
}
let firstScreenCompressedBytes = 0;
for (const relative of firstScreenFiles) {
  const filePath = path.join(readerDir, relative);
  assert(fs.existsSync(filePath), `首屏依赖不存在 ${relative}`);
  firstScreenCompressedBytes += zlib.gzipSync(fs.readFileSync(filePath), { level: 9 }).length;
}
assert(firstScreenCompressedBytes <= 800 * 1024, `首屏压缩依赖为 ${firstScreenCompressedBytes} 字节，超过 800 KiB`);

const actualMapPaths = readerFiles
  .map(filePath => path.relative(readerDir, filePath).split(path.sep).join('/'))
  .filter(relative => relative.startsWith('assets/map/'))
  .sort();
assert(JSON.stringify(actualMapPaths) === JSON.stringify((readerManifest.readerProjection?.mapRuntimeFiles || []).slice().sort()), '地图运行目录超出 reader 白名单');
assert(fs.existsSync(path.join(readerDir, 'assets/map/data/hydronym-reader.js')), '读者包缺少古水名纯净投影');
const v69EpigraphyPath = path.join(readerDir, 'data/v69-epigraphic-records.js');
assert(fs.existsSync(v69EpigraphyPath), '读者包缺少 V69 金石最终投影');
const epigraphyRecords = evaluateWindowFile(v69EpigraphyPath, 'reader:data/v69-epigraphic-records.js').SGZ_V69_EPIGRAPHIC_RECORDS?.records || [];
const epigraphyIds = new Set(epigraphyRecords.map(row => String(row.id || '')));
const epigraphyInscribed = epigraphyRecords.filter(row => String(row.inscription || '').trim()).length;
assert(epigraphyRecords.length === 166 && epigraphyIds.size === 166, `V69 金石读者投影应为 166 个稳定 ID，实际 ${epigraphyRecords.length}/${epigraphyIds.size}`);
assert(epigraphyInscribed === 44 && epigraphyRecords.length - epigraphyInscribed === 122, `V69 金石读者投影应为 44 有释文 / 122 空释文，实际 ${epigraphyInscribed}/${epigraphyRecords.length - epigraphyInscribed}`);
assert(readerManifest.readerProjection?.epigraphicRecordCount === epigraphyRecords.length, '金石读者投影数量与清单不一致');
assert(readerManifest.readerProjection?.mapPeriodCount === 16 && readerManifest.readerProjection?.mapAuditGlobals === 0, '地图注册表读者投影不闭合');

const readerMapRegistry = evaluateWindowFile(path.join(readerDir, 'data/map-period-registry.js'), 'reader:data/map-period-registry.js');
assert(JSON.stringify(readerMapRegistry.HISTORY_MAP_REGISTRY) === JSON.stringify(mapRegistryJson), '读者地图注册表与规范十六期不等价');
assert(readerMapRegistry.HISTORY_MAP_AUDIT === undefined, '读者地图注册表仍发布 HISTORY_MAP_AUDIT');

const readerMapHtml = fs.readFileSync(path.join(readerDir, 'assets/map/history-embed.html'), 'utf8');
const mapScriptOrder = [...readerMapHtml.matchAll(/<script\s+src=["']([^"']+)["'][^>]*><\/script>/g)].map(match => match[1].split('?', 1)[0]);
const safeHtmlIndex = mapScriptOrder.indexOf('js/safe-html.js');
assert(safeHtmlIndex >= 0, '读者地图缺少 safe-html.js');
for (const businessScript of ['js/config.js','js/base-layer.js','js/territories.js','js/wu-commanderies.js','js/commanderies.js','js/counties.js','js/markers.js','js/routes.js','js/strategic-layers.js','js/hydronyms.js','js/panel.js','js/timeline.js','js/app.js']) {
  const scriptIndex = mapScriptOrder.indexOf(businessScript);
  assert(scriptIndex > safeHtmlIndex, `safe-html.js 未在地图业务脚本前加载：${businessScript}`);
}
const safeRuntime = evaluateWindowFile(path.join(readerDir, 'assets/map/js/safe-html.js'), 'reader:assets/map/js/safe-html.js');
const maliciousHtml = '<img src=x onerror="globalThis.__xss=1">&\'"';
const escapedHtml = safeRuntime.MapSafeHtml.escapeHtml(maliciousHtml);
assert(!escapedHtml.includes('<') && escapedHtml.includes('&lt;img') && escapedHtml.includes('&#39;') && escapedHtml.includes('&quot;'), '地图恶意 HTML 没有被纯文本转义');
for (const relative of actualMapPaths.filter(item => item.startsWith('assets/map/js/') && item.endsWith('.js'))) {
  if (relative.endsWith('/safe-html.js') || relative.includes('/vendor/')) continue;
  const source = fs.readFileSync(path.join(readerDir, relative), 'utf8');
  assert(!/\b(?:innerHTML|insertAdjacentHTML)\b|\bv-html\b/.test(source), `地图运行脚本仍使用 HTML 注入 sink：${relative}`);
}

const canonicalGeneralTitles = evaluateWindow('data/general-titles.js').SGZ_GENERAL_TITLES;
const readerGeneralTitles = evaluateWindowFile(path.join(readerDir, 'data/general-titles.js'), 'reader:data/general-titles.js').SGZ_GENERAL_TITLES;
const v65GeneralResearch = readJson('data/v65-general-title-research.json');
const generalKey = (polity, row) => `${polity}:${row.sortOrder}:${row.title}`;
const expectedGeneralKeys = new Set([
  ...(canonicalGeneralTitles.groups || []).flatMap(group => (group.titles || []).filter(row => row.evidence === '确定').map(row => generalKey(group.polity, row))),
  ...(v65GeneralResearch.records || []).filter(row => row.publicationStatus === 'verified' && row.historicalDisposition === '确定').map(row => String(row.sourceRecordKey || ''))
]);
const actualGeneralKeys = new Set((readerGeneralTitles.groups || []).flatMap(group => (group.titles || []).map(row => generalKey(group.polity, row))));
assert(expectedGeneralKeys.size === actualGeneralKeys.size && [...expectedGeneralKeys].every(key => actualGeneralKeys.has(key)), 'V65 将军名号读者投影数量、去重或发布边界不闭合');
assert(readerManifest.readerProjection?.generalTitleReaderCount === actualGeneralKeys.size, '将军名号读者数与清单不一致');

const readerRelations = evaluateWindowFile(path.join(readerDir, 'data/v63-reader-person-relations.js'), 'reader:data/v63-reader-person-relations.js').SGZ_V63_READER_PERSON_RELATIONS;
assert(readerRelations?.modelId === 'sgz-v63-reader-person-relations-v64', 'V63 读者人物关联投影未注册');
const canonicalRelationJsPath = path.join(root, 'data', 'v63-reader-person-relations.js');
const canonicalRelationJsonPath = path.join(root, 'data', 'v63-reader-person-relations.json');
assert(fs.existsSync(canonicalRelationJsPath) && fs.existsSync(canonicalRelationJsonPath), '规范目录缺少 V63 纯净读者人物关联 JS/JSON');
const canonicalRelations = evaluateWindowFile(canonicalRelationJsPath, 'data/v63-reader-person-relations.js').SGZ_V63_READER_PERSON_RELATIONS;
const canonicalRelationJson = JSON.parse(fs.readFileSync(canonicalRelationJsonPath, 'utf8'));
const relationPayload = value => ({
  schemaVersion: value.schemaVersion,
  modelId: value.modelId,
  appointments: value.appointments,
  peerageEvents: value.peerageEvents
});
assert(JSON.stringify(relationPayload(canonicalRelations)) === JSON.stringify(canonicalRelationJson), '规范目录人物关联 JS/JSON 不等价');
assert(JSON.stringify(relationPayload(readerRelations)) === JSON.stringify(canonicalRelationJson), '导出读者人物关联与规范纯净投影不等价');
const expectedAppointmentRelations = new Set();
const expectedPeerageRelations = new Set();
const readerPersonIds = new Set((readerJson.people || []).map(person => String(person.personId || '')));
for (const person of readerJson.people || []) {
  for (const id of person.appointmentIds || []) expectedAppointmentRelations.add(`${id}@${person.personId}`);
  for (const id of person.peerageEventIds || []) expectedPeerageRelations.add(`${id}@${person.personId}`);
}
const actualAppointmentRelations = new Set((readerRelations.appointments || []).map(row => `${row.appointmentId}@${row.personId}`));
const actualPeerageRelations = new Set((readerRelations.peerageEvents || []).map(row => `${row.eventId}@${row.personId}`));
assert(expectedAppointmentRelations.size === 149 && expectedPeerageRelations.size === 535, `V63 读者允许关系基线应为任官 149 / 封爵 535，实际 ${expectedAppointmentRelations.size}/${expectedPeerageRelations.size}`);
assert(actualAppointmentRelations.size === (readerRelations.appointments || []).length, 'V63 读者任官 personId+appointmentId 复合键不唯一');
assert(actualPeerageRelations.size === (readerRelations.peerageEvents || []).length, 'V63 读者封爵 personId+eventId 复合键不唯一');
assert(expectedAppointmentRelations.size === actualAppointmentRelations.size && [...expectedAppointmentRelations].every(key => actualAppointmentRelations.has(key)), 'V63 读者任官允许 ID 与关联投影不闭合');
assert(expectedPeerageRelations.size === actualPeerageRelations.size && [...expectedPeerageRelations].every(key => actualPeerageRelations.has(key)), 'V63 读者封爵允许 ID 与人物关联投影不闭合');
for (const row of readerRelations.appointments || []) {
  assert(readerPersonIds.has(String(row.personId || '')), `任官关系指向不存在的读者人物 ${row.personId || '(空)'}`);
  for (const key of ['title','sourceCategory','serviceDomain','institutionType']) {
    assert(!Object.hasOwn(row, key), `任官读者投影仍包含非展示字段 ${key}`);
  }
}
for (const row of readerRelations.peerageEvents || []) {
  assert(readerPersonIds.has(String(row.personId || '')), `封爵关系指向不存在的读者人物 ${row.personId || '(空)'}`);
  for (const key of ['fiefHouseholds','succession']) {
    assert(!Object.hasOwn(row, key), `封爵读者投影仍包含占位或非必要字段 ${key}`);
  }
  for (const key of ['place','fief']) {
    assert(row[key] === undefined || !/^[0-9０-９]+$/u.test(String(row[key]).trim()), `封爵 ${row.relationId} 的 ${key} 为异常纯数字地名`);
  }
}
const relationPayloadText = JSON.stringify({
  appointments: readerRelations.appointments || [],
  peerageEvents: readerRelations.peerageEvents || []
});
assert(!/(?:待考|待校|存疑|未详|不详|未载|缺载|对照表补|推算)/u.test(relationPayloadText), 'V63 读者人物关联仍包含审校状态或占位说明');
assert(Object.keys(readerRelations.appointmentsById || {}).length === actualAppointmentRelations.size, '任官 appointmentsById 索引不闭合');
assert(Object.keys(readerRelations.peerageEventsByRelationId || {}).length === actualPeerageRelations.size, '封爵 relationId 索引不闭合');
assert(Object.values(readerRelations.peerageEventsById || {}).flat().length === actualPeerageRelations.size, '封爵 eventId 分组索引不闭合');
assert(readerManifest.readerProjection?.personAppointmentReferenceCount === actualAppointmentRelations.size && readerManifest.readerProjection?.personAppointmentRelationCount === actualAppointmentRelations.size, '任官关联清单计数不闭合');
assert(readerManifest.readerProjection?.personPeerageReferenceCount === actualPeerageRelations.size && readerManifest.readerProjection?.personPeerageRelationCount === actualPeerageRelations.size, '封爵关联清单计数不闭合');

const sourceIndexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const persistenceModule = [
  fs.readFileSync(path.join(root, 'assets/app/persistence-core.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'assets/app/persistence.js'), 'utf8')
].join('\n');
const canonicalRelationLoader = "loadSgzDataScript('v63-reader-person-relations','./data/v63-reader-person-relations.js?v=64','SGZ_V63_READER_PERSON_RELATIONS')";
const canonicalPeopleRefresh = "if(section==='people')refreshLazyPeopleData()";
assert(sourceIndexHtml.includes(canonicalRelationLoader), '规范入口未加载 V63 纯净读者人物关联');
assert(sourceIndexHtml.indexOf(canonicalRelationLoader) < sourceIndexHtml.indexOf(canonicalPeopleRefresh), '规范入口人物关联没有在人物数据刷新前加载');
assert(!/snapshotAll/.test(sourceIndexHtml + persistenceModule), '仍存在 snapshotAll 整库快照模式');
assert(sourceIndexHtml.includes('<script src="./assets/app/persistence-core.js?v=66.2"></script>'), '持久化核心未作为同步首屏依赖加载');
assert(/SGZ_UI_MODULES\.persistence=Object\.freeze\(\{createDirtyState,createPatchEngine\}\)/.test(persistenceModule), '持久化核心未注册稳定全局接口');
assert(sourceIndexHtml.includes("if(!persistence?.createDirtyState||!persistence?.createPatchEngine)"), '界面启动前未验证持久化核心接口');
assert(/autosaveInterval=setInterval\(\(\)=>\{if\(pendingPersistencePatches\.length\)saveLocal\(true\);\},30000\)/.test(sourceIndexHtml), '30 秒周期未限定为增量补丁刷新');
assert(/checkpointInterval=setInterval\([\s\S]*?saveLocalNow\(true,true\)[\s\S]*?,600000\)/.test(sourceIndexHtml), '完整检查点未限定为 10 分钟');
const beforeUnloadBody = sourceIndexHtml.match(/function beforeUnload\(\)\{([\s\S]*?)\n\s*\}\n\s*function syncViewport/)?.[1] || '';
assert(beforeUnloadBody.includes('patchLogPayload') && !beforeUnloadBody.includes('projectPayload()'), 'beforeunload 仍尝试保存整库');

const lightBytes = fs.statSync(lightHtmlPath).size;
assert(lightBytes > 0 && lightBytes <= 80 * 1024 * 1024, `轻量单 HTML 为 ${lightBytes} 字节，超过 80 MiB`);
const lightHtml = fs.readFileSync(lightHtmlPath, 'utf8');
assert(lightHtml.includes('SGZ_READER_BUILD') && lightHtml.includes('SGZ_V63_READER_PEOPLE'), '轻量单 HTML 未使用读者投影');
assert(!/window\.SGZ_(?:V60_PERSON_WORKBOOK_IMPORT|V61_PERSON_SUPPLEMENTS|V60_RESEARCH_LEDGER|V61_EPIGRAPHY_RESEARCH|PERSON_SOURCE_INDEX)\s*=/.test(lightHtml), '轻量单 HTML 内嵌审校负载');
assert(!/\/Users\//.test(lightHtml), '轻量单 HTML 泄露本机绝对路径');
serializedSensitivePattern.lastIndex = 0;
assert(!serializedSensitivePattern.test(lightHtml), '轻量单 HTML 内嵌审校字段负载');
for (const identifier of mapAuditIdentifiers) assert(!lightHtml.includes(identifier), `轻量单 HTML 泄露地图审校标识 ${identifier}`);
const zipHeader = fs.readFileSync(offlineZipPath).subarray(0, 4).toString('hex');
assert(zipHeader === '504b0304', '离线 ZIP 文件头无效');
assert(fs.existsSync('/usr/bin/unzip'), '当前环境缺少 unzip，无法验证离线包内容');
execFileSync('/usr/bin/unzip', ['-tqq', offlineZipPath], { stdio: 'ignore' });
const offlineEntries = readZipEntries(offlineZipPath);
assert(offlineEntries.has('index.html'), '离线 ZIP 缺少根入口 index.html');
const offlineManifest = verifyBundleEntries(offlineEntries);
assert(offlineManifest.offline?.runtimeNetworkDependencies === 0, '离线 ZIP 清单未声明运行网络依赖为 0');
for (const [relative, buffer] of offlineEntries) {
  if (!/\.(?:html|css|js)$/i.test(relative)) continue;
  const matches = offlineRuntimeResourceMatches(relative, buffer.toString('utf8'));
  assert(matches.length === 0, `离线 ZIP 仍含远程运行资源 ${relative}: ${matches[0] || ''}`);
}
const offlineMapConfig = offlineEntries.get('assets/map/js/config.js').toString('utf8');
assert(!/https:\/\/(?:server\.arcgisonline\.com|s3\.amazonaws\.com)|https:\/\/\{s\}\.tile\.openstreetmap\.org/.test(offlineMapConfig), '离线 ZIP 底图配置仍指向远程瓦片');
assert((offlineMapConfig.match(/data:image\/png;base64/g) || []).length >= 5, '离线 ZIP 未为全部地图瓦片提供本地降级');

const assetManifest = readJson('data/asset-manifest.json');
assert(assetManifest.schemaVersion >= 2 && assetManifest.aggregateSha256, '资源清单尚未升级为确定性 V64 格式');
for (const item of assetManifest.files) {
  const filePath = path.join(root, item.path);
  assert(fs.existsSync(filePath), `规范资源清单缺失 ${item.path}`);
  const buffer = fs.readFileSync(filePath);
  assert(buffer.length === item.bytes && sha256(buffer) === item.sha256, `规范资源清单不匹配 ${item.path}`);
}

const deployment = JSON.parse(fs.readFileSync(deploymentManifestPath, 'utf8'));
assert(deployment.fileCount === deployment.files.length && deployment.aggregateSha256, '部署清单未闭合');
assert(deployment.canonicalInputRoot === '.' && deployment.deploymentRoot === 'exports/观史台-读者版', '部署清单的规范源/读者产物边界不明确');
assert(deployment.readerBundleManifest === 'exports/观史台-读者版/reader-bundle.json' && deployment.syncDirection === 'canonical-to-generated-site-only', '站点镜像未声明 reader-bundle 单向生成契约');
for (const item of deployment.files) {
  const filePath = path.join(root, item.path);
  assert(fs.existsSync(filePath), `部署清单缺失 ${item.path}`);
  const buffer = fs.readFileSync(filePath);
  assert(buffer.length === item.bytes && sha256(buffer) === item.sha256, `部署清单不匹配 ${item.path}`);
}
assert(sha256(deployment.files.map(file => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join('')) === deployment.aggregateSha256, '部署聚合哈希不匹配');

console.log(JSON.stringify({
  ok: true,
  v63: {
    registryPeople: Object.keys(registryJson.byPersonId || {}).length,
    readerPeople: Object.keys(readerJson.byPersonId || readerJson.peopleById || {}).length || (readerJson.people || []).length
  },
  readerBundle: { files: readerManifest.fileCount + 1, bytes: readerManifest.totalBytes, aggregateSha256: readerManifest.aggregateSha256 },
  firstScreen: { files: firstScreenFiles.size, gzipBytes: firstScreenCompressedBytes, limit: 800 * 1024 },
  lightHtml: { bytes: lightBytes, limit: 80 * 1024 * 1024 },
  offlineZip: { bytes: fs.statSync(offlineZipPath).size },
  deployment: { files: deployment.fileCount, aggregateSha256: deployment.aggregateSha256 },
  leakScan: 'ok',
  jsonJsEquivalence: 'ok',
  mapInvariant: mapRegistryJson.requiredPeriodIds
}, null, 2));
