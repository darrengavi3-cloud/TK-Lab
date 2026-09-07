import { reviewedReaderScope } from './person-identity-publication.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadAppointmentPublication } from './appointment-supplements.mjs';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const readerScopeRows = reviewedReaderScope(...['v62-reader-scope.json', 'v71-person-identity-review.json', 'v73-person-identity-suppressions.json', 'v75-person-identity-suppressions.json'].map(name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'))));
const expectedReaderCount = readerScopeRows.length;
const sourceHtmlPath = path.join(root, 'index.html');
const registryJsonPath = path.join(root, 'data', 'v63-person-registry.json');
const registryJsPath = path.join(root, 'data', 'v63-person-registry.js');
const readerPeopleJsonPath = path.join(root, 'data', 'v63-reader-people.json');
const readerPeopleJsPath = path.join(root, 'data', 'v63-reader-people.js');
const outputPath = path.join(root, 'exports', '观史台-读者版');
const stagingPath = path.join(root, 'exports', `.观史台-读者版.tmp-${process.pid}`);
const relationsOnly = process.argv.includes('--relations-only');

const bannedRuntimeFiles = new Set([
  'data/person-source-index.js',
  'data/v71-appointment-review.json',
  'data/v74-appointment-supplements.json',
  'data/v76-chancellery-evidence.json',
  'data/v76-appointment-source-review.json',
  'data/v76-appointment-supplements.json',
  'data/v76-person-biography-review.json',
  'data/v76-person-biography-corrections.json',
  'data/v75-chancellery-evidence.json',
  'data/v75-appointment-source-review.json',
  'data/v75-appointment-supplements.json',
  'data/v75-person-identity-suppressions.json',
  'data/v75-person-biography-review.json',

  'data/v74-appointment-source-review.json',
  'data/v74-chancellery-evidence.json',
  'data/v74-person-biography-review.json',

  'data/v71-person-identity-review.json',
  'data/person-zi-supplement.js',
  'data/v60-person-workbook-import.js',
  'data/v61-person-supplements.js',
  'data/v62-people-offices.js',
  'data/v60-research-ledger.js',
  'data/v61-epigraphy-research.js',
  'data/person-entity-audit.js',
  'data/v48-portrait-board.js',
  'data/v58-portrait-board.js',
  'data/v63-person-registry.js',
  'data/v65-battle-coordinate-audit.js',
  'data/v65-epigraphy-audit.js',
  'data/v65-fangzhen-audit.js',
  'data/v65-general-title-research.js',
  'data/v65-general-title-research.json',
  'data/v65-shihuo-metrics-audit.js',
  'data/v65-volume-review.js',
  'data/v66-administrative-seat-periods.js',
  'data/fangzhen-seat-supplement.js',
  'data/v69-person-profile-audit.js',
  'data/v69-epigraphy-audit.js',
  'assets/map/data/hydronym-audit.js'
]);
const bannedPayloadKeys = new Set([
  'workbookSource', 'workbookSources', 'rowAudit', 'sourcePath', 'externalSearchLog',
  'searchLog', 'reviewQueue', 'candidateAudit', 'researchQueue', 'auditTrail',
  'searchState', 'historicalDisposition', 'publicationStatus', 'sourceLocator',
  'sourceExcerpt', 'workbookHash', 'sheet', 'row', 'sourceRecordId',
  'researchDisposition', 'evidence', 'sourceRefs'
]);
const serializedSensitiveKeys = [
  'workbookSource', 'workbookSources', 'rowAudit', 'externalSearchLog', 'searchLog',
  'reviewQueue', 'candidateAudit', 'researchQueue', 'auditTrail', 'searchState',
  'historicalDisposition', 'publicationStatus', 'sourceLocator', 'sourceExcerpt',
  'workbookHash', 'sheet', 'row', 'sourceRecordId', 'researchDisposition', 'evidence', 'sourceRefs'
];
const mapAuditIdentifiers = [
  'HISTORY_MAP_AUDIT', 'auditDate', 'fixedIssues', 'periodReview', 'remainingCaveat'
];
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

// These files contain reader-side compatibility code that knows how to ignore
// review fields when opening an older local project.  The identifiers are code,
// not serialized review data.  Every exception is still checked below for
// object-literal payloads, audit globals, absolute paths and review status
// values.  Keeping this list explicit makes a new exception a reviewable build
// change rather than a silent hole in the leak scan.
const readerCodeIdentifierExceptions = new Set([
  'index.html',
  'data/jinshi-schema.js',
  'data/research-model.js'
]);
const readerThirdPartyCodePrefixes = ['assets/vendor/', 'assets/map/vendor/'];

function fail(message) {
  throw new Error(`V66 读者包构建失败：${message}`);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function evaluateWindowScript(filePath) {
  const context = { window: {} };
  context.globalThis = context.window;
  vm.createContext(context);
  new vm.Script(fs.readFileSync(filePath, 'utf8'), { filename: filePath }).runInContext(context);
  return context.window;
}

function runtimeGlobal(relative, globalName) {
  const runtime = evaluateWindowScript(path.join(root, relative));
  if (!(globalName in runtime)) fail(`${relative} 未注册 ${globalName}`);
  return runtime[globalName];
}

function pickFields(value, fields) {
  if (!value || typeof value !== 'object') return value;
  const output = {};
  for (const field of fields) {
    if (value[field] !== undefined) output[field] = value[field];
  }
  return output;
}

function assignment(globalName, value, aliases = []) {
  const lines = [`global.${globalName}=Object.freeze(payload);`];
  for (const [alias, expression] of aliases) lines.push(`global.${alias}=Object.freeze(${expression});`);
  return `(function(global){'use strict';const payload=${JSON.stringify(value)};${lines.join('')}})(window);\n`;
}

const fangzhenFields = [
  'id','entityType','eraGroup','archiveScope','polity','recordType','commander','personId','title',
  'commission','relation','appointmentStatus','jurisdiction','seat','birthplace','startYear','endYear',
  'tenureText','sourceTenureText','confirmedRange','note','seatName','seatType','seatPeriodId',
  'administrativeUnitId','seatValidFromYear','seatValidToYear','readerDisplayStatus','dynastyLabel','jurisdictionKind'
];
const battleEventFields = ['title','battleId','id','year','era','emperor','text','sideA','sideB','result','front','provinceKeys'];
const battleFields = ['id','name','year','a','b','result','desc','lat','lng','participants','strengthNote','provinceKeys'];
const battlefieldFields = ['id','name','placeLabel','lat','lng','from','to','note','provinceKeys'];
const epigraphicFields = [
  'id','entityType','name','title','displayTitle','titleAliases','variantLabel','type','materialType','year',
  'yearText','dateText','polity','dynasty','period','inscription','inscriptionStatus','inscriptionVariants',
  'transcriptionSections','transcriptionReferences','transcriptionNote','people','offices','place','region','findspot','scriptStyle','form','archiveKind',
  'media','mediaAssets','bibliography','readerSummary','note','readerDisplayStatus'
];
const personLifeEventFields = ['eventId','personId','eventType','startYear','endYear','title','detail','relatedRecordId','citations'];
const battlePersonLinkFields = ['linkId','recordId','personId','name','side','role'];
const shihuoRecordFields = ['id','year','polity','category','title','detail','recordKind','scope','readerSummary'];
const shihuoHouseholdFields = [
  'id','recordId','year','polity','label','households','population','note','statisticalUnit','regionScope',
  'populationDefinition','dataNature','comparability','recordKind','scope','comparable'
];

const portraitFields = [
  'portraitId','personId','name','aliases','zi','src','polity','color','portraitKind','status',
  'interfaceOnly','catalogOrder','legacyPersonIds','primaryPortraitId','portraitIds','portraitCount'
];
const hydronymFields = [
  'id','ancientName','aliases','geometryRefs','geometryFeatureCount','labelAnchor','priority','minZoom'
];
const countyFields = ['name','pos','seat'];
const countyCommanderyFields = ['label','seat','counties'];
const kaifuPolicyFields = [
  'id','polity','officeName','personName','qualificationType','validFrom','validTo'
];
const residenceFields = [
  'id','ownerOfficeId','ownerOfficeName','ownerOfficeNames','ownerCategories','polity','ownerPersonName',
  'kaifuPolicyId','name','residenceType','backgroundStyle','validFrom','validTo'
];
const residenceRoleFields = ['officeName','serviceDomain','institutionType'];
const seatPolicyFields = [
  'id','officeId','polity','ownerOfficeName','officeName','validFrom','validTo','authorizedCount','displayCapacity'
];
const hanOfficeFields = [
  'id','parent','name','category','rank9','hanRank','sortOrder','duty','relationType','hidden','customTags'
];
const generalTitleFields = [
  'title','grade','rankGroup','sortOrder','kind','note','generatedPattern','serviceDomain','institutionType'
];
const eraRosterFields = [
  'id','source','polity','officePolity','phase','person','role','rawRole','roleRelation','holder','office',
  'startYear','endYear','appointmentNature','recordGroupId','jurisdiction','sortOrder'
];
const readerAppointmentFields = [
  'appointmentId','personId','nodeName','startYear','endYear','polity','jurisdiction',
  'appointmentNature','treeType','factionName','citations'
];
const readerPeerageFields = [
  'relationId','eventId','personId','title','rank','year','grantDate','place','fief',
  'changeText','titleEvolution'
];
const readerRelationPlaceholderPattern = /(?:待考|待校|存疑|未详|不详|未载|缺载|对照表补|推算)/u;

function cleanReaderRelationText(value, { rejectNumeric = false } = {}) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text || readerRelationPlaceholderPattern.test(text)) return undefined;
  if (rejectNumeric && /^[0-9０-９]+$/u.test(text)) return undefined;
  return text;
}

function plain(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function cleanTranscriptionVariants(rows) {
  return (rows || []).map(row => pickFields(row, ['type','label','text','raw','note','source','textRef']));
}

function cleanTranscriptionSections(rows) {
  return (rows || []).map(row => pickFields(row, ['type','label','text','raw','startLine','endLine']));
}

function cleanEpigraphicRecord(row) {
  const record = pickFields(row, epigraphicFields);
  if (Array.isArray(record.inscriptionVariants)) record.inscriptionVariants = cleanTranscriptionVariants(record.inscriptionVariants);
  if (Array.isArray(record.transcriptionSections)) record.transcriptionSections = cleanTranscriptionSections(record.transcriptionSections);
  if (Array.isArray(record.transcriptionReferences)) record.transcriptionReferences = record.transcriptionReferences.map(item => pickFields(item, ['title','url','note']));
  if (Array.isArray(record.media)) record.media = record.media.map(item => pickFields(item, ['type','src','alt','label']));
  if (Array.isArray(record.mediaAssets)) record.mediaAssets = record.mediaAssets.map(item => pickFields(item, ['assetId','localPath','altText','width','height','sourceTitle','sourceUrl','rightsStatus']));
  return record;
}

function buildHistoryEvidenceReaderScript(source) {
  const periods = (source.periods || []).map(period => {
    const output = pickFields(period, [
      'periodId','year','eraId','controlMode','administration','polities','claims','caveats'
    ]);
    output.claims = (output.claims || []).map(claim => pickFields(claim, ['id','subjectType','subject','status','statement']));
    return output;
  });
  const jurisdictions = (source.jurisdictions || []).map(item => {
    const output = pickFields(item, ['id','name','level','aliases','defaultClaim','claims']);
    if (output.defaultClaim) output.defaultClaim = pickFields(output.defaultClaim, ['status','statement','note']);
    if (output.claims && typeof output.claims === 'object') {
      output.claims = Object.fromEntries(Object.entries(output.claims).map(([id, claim]) => [id, pickFields(claim, ['status','statement','note'])]));
    }
    return output;
  });
  const payload = {
    schemaVersion: source.schemaVersion,
    modelId: 'sgz-history-facts-reader-v64',
    scope: source.scope,
    periods,
    jurisdictions
  };
  return `(function(global){'use strict';const data=${JSON.stringify(payload)};\n`+
    `function text(value){return String(value==null?'':value).trim();}\n`+
    `function variants(value){const raw=text(value);if(!raw)return[];const compact=raw.replace(/[\\s·・]/g,'');const stripped=compact.replace(/[（(].*?[）)]/g,'').replace(/州|郡|国|部$/,'');return Array.from(new Set([raw,compact,stripped].filter(Boolean)));}\n`+
    `function source(id){return{id:String(id||''),title:'',level:'',role:'',url:''};}\n`+
    `function sourcesFor(){return[];}\n`+
    `function getPeriod(periodId){return(data.periods||[]).find(period=>period.periodId===periodId)||null;}\n`+
    `function getClaim(periodId,claim){return Object.assign({periodId,status:'推定',statement:'当前采用本期历史快照与地图几何底稿。'},claim||{});}\n`+
    `function findJurisdiction(selection,periodId){const names=Array.from(new Set([selection&&selection.name,selection&&selection.state,selection&&selection.sourceName].flatMap(variants)));const item=(data.jurisdictions||[]).find(jurisdiction=>{const candidates=Array.from(new Set([jurisdiction.name].concat(jurisdiction.aliases||[]).flatMap(variants)));return candidates.some(name=>names.includes(name));});if(!item)return{id:'period-default:'+periodId+':'+(selection&&selection.name||selection&&selection.state||'unknown'),name:text(selection&&selection.name||selection&&selection.state||'当前辖区'),level:text(selection&&selection.level)||'辖区',status:'推定',statement:'尚未建立单独的辖区断言。',periodId,fallback:true,sourceTitles:[]};const claim=getClaim(periodId,(item.claims||{})[periodId]||item.defaultClaim);return Object.assign({id:item.id,name:item.name,level:item.level,aliases:item.aliases||[],fallback:false},claim,{sourceTitles:[]});}\n`+
    `function validate(){const periodIds=new Set((data.periods||[]).map(period=>period.periodId));return{periodCount:periodIds.size,sourceCount:0,missingSources:[],valid:periodIds.size===16};}\n`+
    `global.SGZ_HISTORY_EVIDENCE=Object.freeze({schemaVersion:data.schemaVersion,modelId:data.modelId,scope:data.scope,sources:[],periods:data.periods,jurisdictions:data.jurisdictions,source,sourcesFor,getPeriod,findJurisdiction,validate});})(window);\n`;
}

function buildCountyRegistryReaderScript(source) {
  const commanderies = Object.fromEntries(Object.entries(source.commanderies || {}).map(([key, item]) => {
    const projected = pickFields(item, countyCommanderyFields);
    projected.counties = (projected.counties || []).map(county => pickFields(county, countyFields));
    return [key, projected];
  }));
  const cityFallbacks = (source.cityFallbacks || []).map(item => pickFields(item, ['name','sourceName','pos']));
  return `window.COUNTY_REGISTRY=${JSON.stringify({ commanderies, cityFallbacks })};\n`;
}

function buildAdministrativeEventReaderScript(source) {
  const events = (source.events || []).map(item => pickFields(item, [
    'id','entityType','operation','subject','year','parentBefore','label'
  ]));
  const snapshotYears = plain(source.snapshotYears || {});
  return `(function(global){'use strict';const events=${JSON.stringify(events)};const snapshotYears=${JSON.stringify(snapshotYears)};`+
    `const snapshotExceptions={han184:{Beidi:'Beidi'},han190:{Beidi:'Beidi'},han194:{Beidi:'Beidi'},han200:{Beidi:'Beidi'},han208:{Beidi:'Beidi'},three220:{Beidi:'Beidi'},three228:{Beidi:'Beidi'},han219:{"Nan'an":'Longxi'},wei264:{Dongguanghan:'Guanghan'},jin266:{Dongguanghan:'Guanghan'}};`+
    `function mergesAtYear(year){const direct=Object.fromEntries(events.filter(event=>Number(year)<event.year).map(event=>[event.subject,event.parentBefore]));const resolved={};Object.keys(direct).forEach(subject=>{let target=subject;const seen={};while(direct[target]&&direct[target]!==target&&!seen[target]){seen[target]=true;target=direct[target];}resolved[subject]=target;});return resolved;}`+
    `function buildPeriodMerges(){const out={};Object.keys(snapshotYears).forEach(key=>{out[key]=Object.assign(mergesAtYear(snapshotYears[key]),snapshotExceptions[key]||{});});return out;}`+
    `global.ADMINISTRATIVE_EVENT_MODEL={schemaVersion:1,events,snapshotYears,mergesAtYear,buildPeriodMerges};})(window);\n`;
}

function projectPortraitManifest(source) {
  const assetsById = Object.fromEntries(Object.entries(source.assetsById || {}).map(([id, item]) => [id, pickFields(item, portraitFields)]));
  const byPersonId = Object.fromEntries(Object.entries(source.byPersonId || {}).map(([id, item]) => [id, pickFields(item, portraitFields)]));
  const byName = Object.fromEntries(Object.entries(source.byName || {}).map(([name, item]) => [name, pickFields(item, portraitFields)]));
  return {
    schemaVersion: source.schemaVersion,
    scope: '读者立绘索引；界面识别立绘非史实肖像。',
    fallbackSrc: source.fallbackSrc,
    defaultPersonIds: source.defaultPersonIds || [],
    assetsById,
    byPersonId,
    byName,
    legacyPersonIdAliases: source.legacyPersonIdAliases || {},
    summary: pickFields(source.summary || {}, ['total','ready','missing','byPolity'])
  };
}

function assertNoBannedPayloadKeys(value, location = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoBannedPayloadKeys(item, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (bannedPayloadKeys.has(key)) fail(`读者投影仍包含审校字段 ${location}.${key}`);
    assertNoBannedPayloadKeys(child, `${location}.${key}`);
  }
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyTree(source, target) {
  if (!fs.existsSync(source)) return;
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(sourcePath, targetPath);
    else if (entry.isFile()) copyFile(sourcePath, targetPath);
  }
}

function normalizeLocalReference(reference) {
  return String(reference || '').split(/[?#]/, 1)[0].replace(/^\.\//, '');
}

function sanitizeLocalPaths(text) {
  return text.replace(/\/Users\/[^"'<>\\\n\r]*/g, '[local-source-redacted]');
}

function writeText(target, text) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, sanitizeLocalPaths(text), 'utf8');
  const relative = path.relative(stagingPath, target).split(path.sep).join('/');
  if (projectionOverrides.has(relative)) projectedDataFiles.add(relative);
}

function rewriteCssRootAssetUrls(text, cssRelativePath) {
  const baseDirectory = path.posix.dirname(cssRelativePath);
  return text.replace(/url\(\s*(["']?)(\.\/assets\/[^"')]+)\1\s*\)/g, (whole, quote, raw) => {
    const rootRelative = normalizeLocalReference(raw);
    if (!fs.existsSync(path.join(root, rootRelative))) return whole;
    let cssRelative = path.posix.relative(baseDirectory, rootRelative);
    if (!cssRelative.startsWith('.')) cssRelative = `./${cssRelative}`;
    const wrapper = quote || "'";
    return `url(${wrapper}${cssRelative}${wrapper})`;
  });
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

for (const required of [sourceHtmlPath, registryJsonPath, registryJsPath, readerPeopleJsonPath, readerPeopleJsPath]) {
  if (!fs.existsSync(required)) {
    fail(`缺少 ${path.relative(root, required)}。请先生成 V63 person-registry 与 reader-people；未登记字段不得静默放行。`);
  }
}

const registryJson = readJson(registryJsonPath);
const readerPeopleJson = readJson(readerPeopleJsonPath);
const registryRuntime = evaluateWindowScript(registryJsPath).SGZ_V63_PERSON_REGISTRY;
const readerRuntime = evaluateWindowScript(readerPeopleJsPath).SGZ_V63_READER_PEOPLE;
if (JSON.stringify(registryRuntime) !== JSON.stringify(registryJson)) fail('v63-person-registry.json/js 不等价');
if (JSON.stringify(readerRuntime) !== JSON.stringify(readerPeopleJson)) fail('v63-reader-people.json/js 不等价');
if (!registryJson.publicationByPersonId || !registryJson.byPersonId || !registryJson.legacyToCanonical) {
  fail('v63-person-registry 缺少 byPersonId、legacyToCanonical 或 publicationByPersonId');
}
assertNoBannedPayloadKeys(readerPeopleJson);

// V63 people deliberately carries only relation IDs. Build a separate,
// reader-only fact projection so those published IDs resolve without shipping
// person-source-index or the V61 workbook/audit payload.
const readerPeopleRows = readerPeopleJson.people || [];
const v61RelationSource = runtimeGlobal('data/v61-person-supplements.js', 'SGZ_V61_PERSON_SUPPLEMENTS');
const reviewedRows = loadAppointmentPublication(root, readerScopeRows, id => registryJson.legacyToCanonical[id] || id).published;
const sourceAppointmentsById = new Map(reviewedRows.map(row => [String(row.id || ''), row]));
const sourcePeerageById = new Map((v61RelationSource.peerageEvents || []).map(row => [String(row.eventId || ''), row]));
const appointmentRelations = [];
const peerageRelations = [];
let appointmentReferenceCount = 0;
let peerageReferenceCount = 0;
for (const person of readerPeopleRows) {
  const personId = String(person.personId || '');
  for (const rawId of person.appointmentIds || []) {
    appointmentReferenceCount += 1;
    const appointmentId = String(rawId || '');
    const source = sourceAppointmentsById.get(appointmentId);
    if (!source) fail(`V63 读者任官 ID 无法回定位规范源：${appointmentId}`);
    if (source.personId !== personId) fail(`任官事实与受任人物不符：${appointmentId}`);
    appointmentRelations.push(pickFields({
      appointmentId,
      personId,
      nodeName: cleanReaderRelationText(source.officeName),
      citations: source.citations,
      startYear: source.startYear,
      endYear: source.endYear,
      polity: cleanReaderRelationText(source.polity),
      jurisdiction: cleanReaderRelationText(source.jurisdiction),
      appointmentNature: cleanReaderRelationText(source.relationshipType),
      treeType: source.relationshipType === '爵位' ? 'noble' : 'source',
      factionName: cleanReaderRelationText(source.polity)
    }, readerAppointmentFields));
  }
  for (const rawId of person.peerageEventIds || []) {
    peerageReferenceCount += 1;
    const eventId = String(rawId || '');
    const source = sourcePeerageById.get(eventId);
    if (!source) fail(`V63 读者封爵 ID 无法回定位规范源：${eventId}`);
    const verified = field => source.publicationStatus?.[field] === 'verified';
    const cleanFief = verified('fief') ? cleanReaderRelationText(source.fief, { rejectNumeric: true }) : undefined;
    const cleanEvolution = verified('titleEvolution') ? cleanReaderRelationText(source.titleEvolution) : undefined;
    const cleanSuccession = verified('succession') ? cleanReaderRelationText(source.succession) : undefined;
    const cleanChange = cleanEvolution || cleanSuccession;
    peerageRelations.push(pickFields({
      relationId: `${eventId}@${personId}`,
      eventId,
      personId,
      title: verified('title') ? cleanReaderRelationText(source.title) : undefined,
      rank: verified('rank') ? cleanReaderRelationText(source.rank) : undefined,
      year: verified('year') ? source.year : undefined,
      grantDate: verified('grantDate') ? cleanReaderRelationText(source.grantDate) : undefined,
      place: cleanFief,
      // Keep the legacy aliases only for the existing reader template. They
      // carry the same sanitized display fact and never the workbook fields.
      fief: cleanFief,
      changeText: cleanChange,
      titleEvolution: cleanChange
    }, readerPeerageFields));
  }
}
if (new Set(appointmentRelations.map(row => `${row.appointmentId}@${row.personId}`)).size !== appointmentReferenceCount) {
  fail('V63 读者任官关联存在重复 ID/人物组合');
}
if (new Set(peerageRelations.map(row => row.relationId)).size !== peerageReferenceCount) {
  fail('V63 读者封爵关联存在重复 ID/人物组合');
}
const readerPersonRelations = {
  schemaVersion: 1,
  modelId: 'sgz-v63-reader-person-relations-v64',
  appointments: appointmentRelations,
  peerageEvents: peerageRelations
};
assertNoBannedPayloadKeys(readerPersonRelations);
const readerPersonRelationsJson = `${JSON.stringify(readerPersonRelations, null, 2)}\n`;
const readerPersonRelationsScript =
  `(function(global){'use strict';const payload=${JSON.stringify(readerPersonRelations)};`+
  `const appointmentsById=Object.freeze(Object.fromEntries(payload.appointments.map(row=>[row.appointmentId,Object.freeze(row)])));`+
  `const peerageEventsById=Object.freeze(payload.peerageEvents.reduce((out,row)=>{(out[row.eventId]||(out[row.eventId]=[])).push(Object.freeze(row));return out;},{}));`+
  `const peerageEventsByRelationId=Object.freeze(Object.fromEntries(payload.peerageEvents.map(row=>[row.relationId,Object.freeze(row)])));`+
  `global.SGZ_V63_READER_PERSON_RELATIONS=Object.freeze({...payload,appointmentsById,peerageEventsById,peerageEventsByRelationId});})(window);\n`;
for (const [fileName, contents] of [
  ['v63-reader-person-relations.json', readerPersonRelationsJson],
  ['v63-reader-person-relations.js', readerPersonRelationsScript]
]) {
  const target = path.join(root, 'data', fileName);
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  if (current !== contents) fs.writeFileSync(target, contents, 'utf8');
}
if (relationsOnly) {
  console.log(`已生成 V63 纯净读者人物关联：任官 ${appointmentRelations.length}，封爵关系 ${peerageRelations.length}`);
  process.exit(0);
}

const projectionOverrides = new Map();
const projectedDataFiles = new Set();
function registerProjection(relative, contents) {
  projectionOverrides.set(relative, contents);
}
registerProjection(
  'data/v63-reader-person-relations.js',
  readerPersonRelationsScript
);
registerProjection('data/v63-reader-person-relations.json', readerPersonRelationsJson);

// V66 peerage links are derived from the full 525-row review ledger. The
// reader receives only events with at least one verified Cao Wei rank stage,
// plus recomputed node counts. Source citations, record-row identifiers,
// review dispositions and unresolved events remain outside the reader bundle.
const v66PeeragePath = path.join(root, 'data', 'v66-peerage-stages.json');
if (!fs.existsSync(v66PeeragePath)) fail('缺少 data/v66-peerage-stages.json，不能生成曹魏爵制读者投影');
const v66PeerageSource = readJson(v66PeeragePath);
const v66PeerageEventFields = [
  'eventId','recipientPersonIds','rawRecipient','year','grantDate','rank','title','category',
  'peeragePhase','disposition','linkDisposition','rankStages','titleStages','rankLevelNodeIds','peerageNodeIds','peerageNodeId'
];
const v66PeerageStageFields = [
  'stageIndex','year','rawRank','normalizedRank','rankLevel','marquisType','rankLevelNodeId',
  'candidatePeerageNodeId','title','peerageNodeId'
];
const v66PeerageEvents = (v66PeerageSource.events || [])
  .filter(event => event.publicationStatus === 'verified' && event.disposition === 'linked')
  .map(event => {
    const projected = pickFields(event, v66PeerageEventFields);
    projected.recipientPersonIds = [...(event.recipientPersonIds || [])];
    projected.rankStages = (event.rankStages || [])
      .filter(stage => stage.publicationStatus === 'verified' && stage.peerageNodeId)
      .map(stage => pickFields(stage, v66PeerageStageFields));
    const verifiedStageIndexes = new Set(projected.rankStages.map(stage => Number(stage.stageIndex)));
    projected.titleStages = (event.titleStages || [])
      .filter(stage => verifiedStageIndexes.has(Number(stage.stageIndex)))
      .map(stage => pickFields(stage, ['stageIndex','year','title']));
    return projected;
  });
const v66PeerageEventsById = new Map(v66PeerageEvents.map(event => [String(event.eventId || ''), event]));
if (v66PeerageEventsById.size !== Number(v66PeerageSource.summary?.linkedEvents || 0)) {
  fail('V66 曹魏爵制已核事件与汇总数不一致');
}
const v66PeerageNodes = (v66PeerageSource.nodes || []).map(node => {
  const directEventIds = (node.directEventIds || []).filter(eventId => v66PeerageEventsById.has(String(eventId)));
  const aggregateEventIds = (node.aggregateEventIds || []).filter(eventId => v66PeerageEventsById.has(String(eventId)));
  const recipientIds = eventIds => [...new Set(eventIds.flatMap(eventId => v66PeerageEventsById.get(String(eventId))?.recipientPersonIds || []))].sort(compareText);
  const directRecipientPersonIds = recipientIds(directEventIds);
  const aggregateRecipientPersonIds = recipientIds(aggregateEventIds);
  return {
    ...pickFields(node, ['nodeId','label','rankLevel','marquisType','order','parentId']),
    directEventIds,
    directRecipientPersonIds,
    directEventCount: directEventIds.length,
    directRecipientCount: directRecipientPersonIds.length,
    aggregateEventIds,
    aggregateRecipientPersonIds,
    eventCount: aggregateEventIds.length,
    recipientCount: aggregateRecipientPersonIds.length
  };
});
const v66PeerageReader = {
  schemaVersion: 'V66-reader',
  modelId: 'sgz-v66-wei-peerage-stages-reader',
  summary: {
    linkedEvents: v66PeerageEvents.length,
    linkedPeople: new Set(v66PeerageEvents.flatMap(event => event.recipientPersonIds || [])).size,
    nodes: v66PeerageNodes.length
  },
  nodes: v66PeerageNodes,
  events: v66PeerageEvents
};
assertNoBannedPayloadKeys(v66PeerageReader);
registerProjection('data/v66-peerage-stages.js', assignment('SGZ_V66_PEERAGE_STAGES', v66PeerageReader));

// Office-policy sources are review workbooks.  The reader gets only rows whose
// historical disposition is already “确定”, and only the fields required to
// render the institution.  Source locators, excerpts, evidence notes and
// unresolved display capacities remain in the canonical workbench.
const kaifuPolicies = runtimeGlobal('data/kaifu-policies.js', 'SGZ_KAIFU_POLICIES');
registerProjection('data/kaifu-policies.js', assignment('SGZ_KAIFU_POLICIES', (kaifuPolicies || [])
  .filter(row => row.researchStatus === '确定')
  .map(row => pickFields(row, kaifuPolicyFields))));

const officeResidences = runtimeGlobal('data/office-residences.js', 'SGZ_OFFICE_RESIDENCES');
registerProjection('data/office-residences.js', assignment('SGZ_OFFICE_RESIDENCES', (officeResidences || [])
  .filter(row => row.researchStatus === '确定' || ['residence:local:province', 'residence:local:commandery'].includes(row.id))
  .map(row => {
    const projected = pickFields(row, residenceFields);
    projected.roles = (row.roles || []).map(role => pickFields(role, residenceRoleFields));
    return projected;
  })));

const seatPolicies = runtimeGlobal('data/office-seat-policies.js', 'SGZ_SEAT_POLICIES');
registerProjection('data/office-seat-policies.js', assignment('SGZ_SEAT_POLICIES', (seatPolicies || [])
  .filter(row => row.countStatus === '确定')
  .map(row => pickFields(row, seatPolicyFields))));

const hanBaiGuan = runtimeGlobal('data/han-bai-guan-zhi.js', 'SGZ_HAN_BAI_GUAN_ZHI');
registerProjection('data/han-bai-guan-zhi.js', assignment('SGZ_HAN_BAI_GUAN_ZHI', {
  schemaVersion: hanBaiGuan.schemaVersion,
  source: {},
  records: (hanBaiGuan.records || [])
    .filter(row => row.researchStatus === '确定')
    .map(row => pickFields(row, hanOfficeFields))
}));

const generalTitles = runtimeGlobal('data/general-titles.js', 'SGZ_GENERAL_TITLES');
const v65GeneralResearchPath = path.join(root, 'data', 'v65-general-title-research.json');
if (!fs.existsSync(v65GeneralResearchPath)) fail('缺少 data/v65-general-title-research.json，不能判定待考将军名号的发布边界');
const v65GeneralResearch = readJson(v65GeneralResearchPath);
const v65GeneralRows = Array.isArray(v65GeneralResearch.records) ? v65GeneralResearch.records : [];
if (v65GeneralRows.length !== 154 || v65GeneralRows.some(row => row.searchState !== 'completed')) {
  fail('V65 将军名号台账必须 154 条逐条检索闭合');
}
const v65GeneralByKey = new Map(v65GeneralRows.map(row => [String(row.sourceRecordKey || ''), row]));
const v65VerifiedGeneralKeys = new Set(v65GeneralRows
  .filter(row => row.publicationStatus === 'verified' && row.historicalDisposition === '确定')
  .map(row => String(row.sourceRecordKey || '')));
const canonicalGeneralKey = (polity, row) => `${polity}:${row.sortOrder}:${row.title}`;
const generalTitleGroups = (generalTitles.groups || []).map(group => {
  const projected = pickFields(group, ['polity','label','period','ordering']);
  projected.titles = (group.titles || [])
    .filter(row => row.evidence === '确定' || v65VerifiedGeneralKeys.has(canonicalGeneralKey(group.polity, row)))
    .map(row => pickFields(row, generalTitleFields));
  return projected;
});
for (const key of v65VerifiedGeneralKeys) {
  if (!v65GeneralByKey.has(key) || !generalTitleGroups.some(group => group.titles.some(row => canonicalGeneralKey(group.polity, row) === key))) {
    fail(`V65 已核定将军名号无法回定位规范记录：${key}`);
  }
}
const oldVerifiedGeneralKeys = new Set((generalTitles.groups || []).flatMap(group => (group.titles || [])
  .filter(row => row.evidence === '确定')
  .map(row => canonicalGeneralKey(group.polity, row))));
const expectedReaderGeneralKeys = new Set([...oldVerifiedGeneralKeys, ...v65VerifiedGeneralKeys]);
const actualReaderGeneralKeys = new Set(generalTitleGroups.flatMap(group => group.titles.map(row => canonicalGeneralKey(group.polity, row))));
if (expectedReaderGeneralKeys.size !== actualReaderGeneralKeys.size || [...expectedReaderGeneralKeys].some(key => !actualReaderGeneralKeys.has(key))) {
  fail('V65 将军名号读者投影数量或去重结果不闭合');
}
const legacyGeneralTitles = group => (group?.titles || []).map(item => [item.title, item.grade, item.kind + (item.note ? `；${item.note}` : '')]);
registerProjection('data/general-titles.js', assignment('SGZ_GENERAL_TITLES', {
  schemaVersion: generalTitles.schemaVersion,
  source: {},
  groups: generalTitleGroups,
  wei: legacyGeneralTitles(generalTitleGroups[0]),
  han: legacyGeneralTitles(generalTitleGroups[1]),
  wu: legacyGeneralTitles(generalTitleGroups[2]),
  jin: legacyGeneralTitles(generalTitleGroups[3]),
  policy: '读者版仅列已核定的将军名号。'
}));

const eraRosters = runtimeGlobal('data/person-era-rosters.js', 'SGZ_PERSON_ERA_ROSTERS');
const verifiedEraRow = row => row.status === '确定' && row.confidence === '确定';
registerProjection('data/person-era-rosters.js', assignment('SGZ_PERSON_ERA_ROSTERS', {
  schemaVersion: eraRosters.schemaVersion,
  sources: {},
  officeSnapshots: (eraRosters.officeSnapshots || [])
    .filter(verifiedEraRow)
    .map(row => pickFields(row, eraRosterFields)),
  records: (eraRosters.records || [])
    .filter(verifiedEraRow)
    .map(row => pickFields(row, eraRosterFields))
}));

const v66FangzhenReaderPath = path.join(root, 'data', 'v66-fangzhen-reader.json');
if (!fs.existsSync(v66FangzhenReaderPath)) fail('缺少 data/v66-fangzhen-reader.json，不能判定分期治所发布边界');
const v66FangzhenSource = readJson(v66FangzhenReaderPath);
const v66FangzhenRecords = (v66FangzhenSource.records || []).map(row => pickFields(row, fangzhenFields));
const fangzhenReaderIds = new Set(v66FangzhenRecords.map(row => String(row.id || '')));
const v65FangzhenAudit = readJson(path.join(root, 'data', 'v65-fangzhen-audit.json'));
const expectedFangzhenReaderIds = new Set((v65FangzhenAudit.records || [])
  .filter(row => row.readerVisible === true && row.publicationStatus === 'reader-visible')
  .map(row => String(row.recordId || '')));
if (v66FangzhenRecords.length !== 45 || fangzhenReaderIds.size !== 45 || expectedFangzhenReaderIds.size !== 45) {
  fail(`V66 州镇任职读者投影应继承 V65 的 45 条唯一记录，当前 ${v66FangzhenRecords.length}/${fangzhenReaderIds.size}/${expectedFangzhenReaderIds.size}`);
}
if ([...expectedFangzhenReaderIds].some(id => !fangzhenReaderIds.has(id))) {
  fail('V66 州镇任职读者投影与 V65 reader-visible ID 集合不一致');
}
const verifiedSeatRecordIds = new Set((v66FangzhenSource.verifiedSeatRecordIds || []).map(String));
const rowsWithSeat = v66FangzhenRecords.filter(row => row.seat !== undefined);
if (verifiedSeatRecordIds.size !== 27 || rowsWithSeat.length !== 27) {
  fail(`V66 读者州镇已核治所应为 27 条，当前 ${verifiedSeatRecordIds.size}/${rowsWithSeat.length}`);
}
const seatFields = ['seat','seatName','seatType','seatPeriodId','administrativeUnitId','seatValidFromYear','seatValidToYear'];
if (v66FangzhenRecords.some(row => {
  const present = seatFields.filter(field => row[field] !== undefined);
  return (present.length !== 0 && present.length !== seatFields.length)
    || (present.length === seatFields.length && !verifiedSeatRecordIds.has(String(row.id || '')));
})) {
  fail('V66 读者州镇治所字段不是全有或全无，或与已核 ID 集合不一致');
}
const fangzhenReaderPayload = {
  schemaVersion: 'V66-reader',
  modelId: 'sgz-v66-fangzhen-reader',
  summary: { records: v66FangzhenRecords.length, verifiedSeats: verifiedSeatRecordIds.size },
  recordIds: [...fangzhenReaderIds].sort(compareText),
  verifiedSeatRecordIds: [...verifiedSeatRecordIds].sort(compareText),
  records: v66FangzhenRecords
};
assertNoBannedPayloadKeys(fangzhenReaderPayload);
registerProjection(
  'data/v66-fangzhen-reader.js',
  assignment('SGZ_V66_FANGZHEN_READER', fangzhenReaderPayload, [['SGZ_V66_FANGZHEN_READER_RECORDS', 'payload.records']])
);

const v69FangzhenSource = readJson(path.join(root, 'data', 'v69-fangzhen-reader.json'));
const v69FangzhenRecords = (v69FangzhenSource.records || []).map(row => pickFields(row, fangzhenFields));
const v69FangzhenIds = new Set(v69FangzhenRecords.map(row => String(row.id || '')));
if (v69FangzhenRecords.length !== 523 || v69FangzhenIds.size !== 523) {
  fail(`V69 州镇读者投影应为 523 条唯一记录，当前 ${v69FangzhenRecords.length}/${v69FangzhenIds.size}`);
}
if (v69FangzhenRecords.filter(row => row.readerDisplayStatus === 'verified').length !== 45
  || v69FangzhenRecords.filter(row => row.readerDisplayStatus === 'candidate').length !== 478) {
  fail('V69 州镇读者投影的已核／待审闭合不为 45／478');
}
const v69FangzhenPayload = {
  schemaVersion: 'V69-reader',
  modelId: 'sgz-v69-fangzhen-reader',
  summary: { records: 523, verified: 45, candidate: 478 },
  records: v69FangzhenRecords
};
assertNoBannedPayloadKeys(v69FangzhenPayload);
registerProjection('data/v69-fangzhen-reader.js', assignment('SGZ_V69_FANGZHEN_READER', v69FangzhenPayload));

const v69PersonProfileSource = readJson(path.join(root, 'data', 'v69-person-profiles.json'));
const v69PersonProfilePayload = {
  schemaVersion: 'V69-reader',
  modelId: 'sgz-v69-person-profiles',
  summary: pickFields(v69PersonProfileSource.summary || {}, ['people','rulers','peopleWithLifeEvents','lifeEvents']),
  profiles: (v69PersonProfileSource.profiles || []).map(profile => ({
    ...pickFields(profile, ['personId','isRuler','templeName','posthumousTitle']),
    ...(Array.isArray(profile.lifeEvents) ? { lifeEvents: profile.lifeEvents.map(event => pickFields(event, personLifeEventFields)) } : {})
  }))
};
if (v69PersonProfilePayload.profiles.length !== expectedReaderCount) fail('人物档案读者投影未覆盖审定范围');
assertNoBannedPayloadKeys(v69PersonProfilePayload);
registerProjection('data/v69-person-profiles.js', assignment('SGZ_V69_PERSON_PROFILES', v69PersonProfilePayload));

function readerFangzhenRows(relative, globalName) {
  return (runtimeGlobal(relative, globalName) || [])
    .filter(row => fangzhenReaderIds.has(String(row.id || '')))
    .map(row => pickFields(row, fangzhenFields));
}
registerProjection('data/wu-fangzhen-records.js', assignment('WU_FANGZHEN_RECORDS', readerFangzhenRows('data/wu-fangzhen-records.js', 'WU_FANGZHEN_RECORDS')));
registerProjection('data/shu-fangzhen-records.js', assignment('SHU_COMMANDERY_FANGZHEN_PRESETS', readerFangzhenRows('data/shu-fangzhen-records.js', 'SHU_COMMANDERY_FANGZHEN_PRESETS')));
registerProjection(
  'data/fangzhen-term-supplement.js',
  assignment('FANGZHEN_TERM_SUPPLEMENTS', (runtimeGlobal('data/fangzhen-term-supplement.js', 'FANGZHEN_TERM_SUPPLEMENTS') || [])
    .filter(row => fangzhenReaderIds.has(String(row.id || '')))
    .map(row => pickFields(row, ['id','startYear','endYear','tenureText','appointmentStatus','note'])))
);
const v62Jin = runtimeGlobal('data/v62-jin-fangzhen.js', 'SGZ_V62_JIN_FANGZHEN');
const v62JinReaderPayload = {
  schemaVersion: v62Jin.schemaVersion,
  modelId: `${v62Jin.modelId || 'sgz-v62-jin-fangzhen'}-reader`,
  scope: pickFields(v62Jin.scope || {}, ['startYear','endYear','polity']),
  records: (v62Jin.records || []).filter(row => fangzhenReaderIds.has(String(row.id || ''))).map(row => pickFields(row, fangzhenFields))
};
registerProjection(
  'data/v62-jin-fangzhen-reader.js',
  assignment('SGZ_V62_JIN_FANGZHEN', v62JinReaderPayload, [['SGZ_V62_JIN_FANGZHEN_RECORDS', 'payload.records']])
);
const administrativeIndex = runtimeGlobal('data/administrative-index.js', 'SGZ_ADMINISTRATIVE_INDEX');
registerProjection('data/administrative-index.js', assignment('SGZ_ADMINISTRATIVE_INDEX', {
  schemaVersion: administrativeIndex.schemaVersion,
  scope: administrativeIndex.scope,
  states: (administrativeIndex.states || []).map(row => pickFields(row, ['name','aliases','polities','periods'])),
  commanderies: (administrativeIndex.commanderies || []).map(row => pickFields(row, ['name','aliases','seats','states','periods'])),
  seatAliases: plain(administrativeIndex.seatAliases || {})
}));
const battleSource = runtimeGlobal('data/battle-records.js', 'SGZ_BATTLE_RECORDS');
registerProjection('data/battle-records.js', assignment('SGZ_BATTLE_RECORDS', {
  schemaVersion: battleSource.schemaVersion,
  scope: battleSource.scope,
  events: (battleSource.events || []).map(row => pickFields(row, battleEventFields)),
  battles: (battleSource.battles || []).map(row => pickFields(row, battleFields)),
  battlefields: (battleSource.battlefields || []).map(row => pickFields(row, battlefieldFields)),
  provinceIndex: plain(battleSource.provinceIndex || {})
}));
const v69BattleLinkSource = readJson(path.join(root, 'data', 'v69-battle-person-links.json'));
const v69BattleLinkPayload = {
  schemaVersion: 'V69-reader',
  modelId: 'sgz-v69-battle-person-links',
  summary: pickFields(v69BattleLinkSource.summary || {}, ['records','linkedRecords','noExplicitPersonRecords','ambiguousRecords','links']),
  links: (v69BattleLinkSource.links || []).map(row => pickFields(row, battlePersonLinkFields))
};
if (Number(v69BattleLinkPayload.summary.records) !== 62) fail('V69 战事人物处置未覆盖 62 条读者战事');
assertNoBannedPayloadKeys(v69BattleLinkPayload);
registerProjection('data/v69-battle-person-links.js', assignment('SGZ_V69_BATTLE_PERSON_LINKS', v69BattleLinkPayload));

const shihuoSource = runtimeGlobal('data/shihuo-records.js', 'SGZ_SHIHUO_DATA');
registerProjection('data/shihuo-records.js', assignment('SGZ_SHIHUO_DATA', {
  schemaVersion: shihuoSource.schemaVersion,
  metricsSchemaVersion: shihuoSource.metricsSchemaVersion,
  polities: plain(shihuoSource.polities || []),
  categories: plain(shihuoSource.categories || []),
  records: (shihuoSource.records || []).map(row => pickFields(row, shihuoRecordFields)),
  events: (shihuoSource.events || []).map(row => pickFields(row, shihuoRecordFields)),
  household: (shihuoSource.household || []).map(row => pickFields(row, shihuoHouseholdFields))
}));

const epigraphicSource = runtimeGlobal('data/epigraphic-records.js', 'SGZ_EPIGRAPHIC_RECORDS');
registerProjection('data/epigraphic-records.js', assignment('SGZ_EPIGRAPHIC_RECORDS', {
  schemaVersion: epigraphicSource.schemaVersion,
  scope: epigraphicSource.scope,
  types: plain(epigraphicSource.types || []),
  archiveKinds: plain(epigraphicSource.archiveKinds || []),
  records: (epigraphicSource.records || []).map(cleanEpigraphicRecord)
}));
const jinEpigraphic = runtimeGlobal('data/epigraphic-v46-jin.js', 'SGZ_EPIGRAPHIC_V46_JIN');
registerProjection('data/epigraphic-v46-jin.js', assignment('SGZ_EPIGRAPHIC_V46_JIN', {
  schemaVersion: jinEpigraphic.schemaVersion,
  records: (jinEpigraphic.records || []).map(cleanEpigraphicRecord)
}));
const jinshiDisplay = runtimeGlobal('data/v62-jinshi-display.js', 'SGZ_V62_JINSHI_DISPLAY');
registerProjection('data/v62-jinshi-display.js', assignment('SGZ_V62_JINSHI_DISPLAY', {
  schemaVersion: jinshiDisplay.schemaVersion,
  modelId: `${jinshiDisplay.modelId || 'sgz-v62-jinshi-display'}-reader`,
  records: (jinshiDisplay.records || []).map(row => pickFields(row, ['id','displayTitle','titleAliases','variantLabel']))
}));
const epigraphyReaderOverlayPath = path.join(root, 'data', 'v65-epigraphy-reader-overlays.js');
if (fs.existsSync(epigraphyReaderOverlayPath)) {
  const overlay = runtimeGlobal('data/v65-epigraphy-reader-overlays.js', 'SGZ_V65_EPIGRAPHY_READER_OVERLAYS');
  const records = (overlay.records || []).map(row => {
    const projected = pickFields(row, ['recordId','inscription','inscriptionStatus','inscriptionVariants','transcriptionSections']);
    if (projected.inscriptionVariants) projected.inscriptionVariants = cleanTranscriptionVariants(projected.inscriptionVariants);
    if (projected.transcriptionSections) projected.transcriptionSections = cleanTranscriptionSections(projected.transcriptionSections);
    return projected;
  });
  registerProjection('data/v65-epigraphy-reader-overlays.js', `(function(global){'use strict';const payload=${JSON.stringify({schemaVersion:overlay.schemaVersion,modelId:overlay.modelId,records})};const byId=Object.freeze(Object.fromEntries(payload.records.map(row=>[row.recordId,Object.freeze(row)])));global.SGZ_V65_EPIGRAPHY_READER_OVERLAYS=Object.freeze({...payload,byId});})(window);\n`);
}
const v69EpigraphicSource = readJson(path.join(root, 'data', 'v69-epigraphic-records.json'));
const v69EpigraphicRecords = (v69EpigraphicSource.records || []).map(cleanEpigraphicRecord);
if (v69EpigraphicRecords.length !== 166
  || v69EpigraphicRecords.filter(row => String(row.inscription || '').trim()).length !== 59) {
  fail('金石读者投影不为 166 条／59 条有释文（含十五条已核补文）');
}
const v69EpigraphicPayload = {
  schemaVersion: 'V69-reader',
  modelId: 'sgz-v69-epigraphic-records',
  summary: { records: 166, withInscription: 59, withoutInscription: 107 },
  records: v69EpigraphicRecords
};
assertNoBannedPayloadKeys(v69EpigraphicPayload);
registerProjection('data/v69-epigraphic-records.js', assignment('SGZ_V69_EPIGRAPHIC_RECORDS', v69EpigraphicPayload));

const historyEvidenceSource = runtimeGlobal('data/history-evidence.js', 'SGZ_HISTORY_EVIDENCE');
const historyEvidenceReaderScript = buildHistoryEvidenceReaderScript(historyEvidenceSource);
registerProjection('data/history-evidence.js', historyEvidenceReaderScript);
registerProjection('assets/map/data/history-evidence.js', historyEvidenceReaderScript);
// map-period-registry.js also exposes HISTORY_MAP_AUDIT in the workbench.
// The reader only needs the sixteen public period definitions; never copy the
// second global merely because the two payloads share one source file.
const mapPeriodRegistry = runtimeGlobal('data/map-period-registry.js', 'HISTORY_MAP_REGISTRY');
registerProjection('data/map-period-registry.js', assignment('HISTORY_MAP_REGISTRY', plain(mapPeriodRegistry)));
const hydronymSource = runtimeGlobal('assets/map/data/hydronym-audit.js', 'HYDRONYM_AUDIT');
registerProjection('assets/map/data/hydronym-reader.js', assignment('HYDRONYM_AUDIT', {
  schemaVersion: hydronymSource.schemaVersion,
  modelId: 'sgz-hydronym-reader-v64',
  hydronyms: (hydronymSource.hydronyms || []).map(row => pickFields(row, hydronymFields))
}));
registerProjection('assets/map/data/county-registry.js', buildCountyRegistryReaderScript(runtimeGlobal('assets/map/data/county-registry.js', 'COUNTY_REGISTRY')));
registerProjection('assets/map/data/administrative-events.js', buildAdministrativeEventReaderScript(runtimeGlobal('assets/map/data/administrative-events.js', 'ADMINISTRATIVE_EVENT_MODEL')));

const fullPortraitManifest = readJson(path.join(root, 'data', 'portrait-manifest.json'));
const readerPortraitManifest = projectPortraitManifest(fullPortraitManifest);
registerProjection('data/portrait-manifest.js', assignment('SGZ_PERSON_PORTRAIT_MANIFEST', readerPortraitManifest));
registerProjection('data/portrait-manifest.json', `${JSON.stringify(readerPortraitManifest, null, 2)}\n`);

for (const [relative, contents] of projectionOverrides) {
  if (/\.(?:js|json)$/i.test(relative)) {
    const sensitivePattern = new RegExp(`"(?:${serializedSensitiveKeys.join('|')})"\\s*:`, 'g');
    if (sensitivePattern.test(contents) || /"(?:audit-only|review-only)"/.test(contents)) fail(`读者投影 ${relative} 仍包含审校键或审校状态`);
  }
}

const mapRuntimeSourceFiles = [
  'assets/map/history-embed.html',
  'assets/map/css/style.css',
  'assets/map/vendor/leaflet/leaflet.css',
  'assets/map/vendor/leaflet/leaflet.js',
  'assets/map/vendor/leaflet/images/layers-2x.png',
  'assets/map/vendor/leaflet/images/layers.png',
  'assets/map/vendor/leaflet/images/marker-icon-2x.png',
  'assets/map/vendor/leaflet/images/marker-icon.png',
  'assets/map/vendor/leaflet/images/marker-shadow.png',
  'assets/map/data/geo-water.js',
  'assets/map/data/geo-coastline.js',
  'assets/map/data/three-kingdoms.js',
  'assets/map/data/political-snapshots.js',
  'assets/map/data/administrative-events.js',
  'assets/map/data/administrative-snapshots.js',
  'assets/map/data/county-registry.js',
  'assets/map/data/history-evidence.js',
  'assets/map/data/hydronym-reader.js',
  'assets/map/data/strategic-geography.js',
  'assets/map/data/all-provinces-local.js',
  'assets/map/js/safe-html.js',
  'assets/map/js/config.js',
  'assets/map/js/bridge.js',
  'assets/map/js/base-layer.js',
  'assets/map/js/territories.js',
  'assets/map/js/wu-commanderies.js',
  'assets/map/js/commanderies.js',
  'assets/map/js/counties.js',
  'assets/map/js/markers.js',
  'assets/map/js/routes.js',
  'assets/map/js/strategic-layers.js',
  'assets/map/js/hydronyms.js',
  'assets/map/js/panel.js',
  'assets/map/js/timeline.js',
  'assets/map/js/app.js'
];

fs.rmSync(stagingPath, { recursive: true, force: true });
fs.mkdirSync(stagingPath, { recursive: true });

let html = fs.readFileSync(sourceHtmlPath, 'utf8');
html = html.replace(/<script\s+src=["']([^"']+)["']\s*><\/script>/g, (tag, rawReference) => {
  const reference = normalizeLocalReference(rawReference);
  if (reference === 'data/v62-jin-fangzhen.js') return '<script src="./data/v62-jin-fangzhen-reader.js"></script>';
  if (reference === 'assets/map/data/hydronym-audit.js') return '';
  if (bannedRuntimeFiles.has(reference)) return '';
  return tag;
});
// The canonical workbench can lazy-load the full registry when review mode is
// enabled.  The reader projection has no review mode and must not retain even
// the URL of that private payload: keeping the URL would both leak the module
// name and create a predictable 404 when an old local preference says review.
html = html.replace(
  /^\s*if\(reviewMode\)requests\.push\(loadSgzDataScript\('v63-person-registry',[^\n]+\);\s*$/m,
  ''
);
html = html.replace(/^\s*if\(reviewMode\)requests\.push\([\s\S]*?^\s*\);\s*$/gm, '');
html = html.replace(
  /function prepareSgzReviewData\(\)\{[\s\S]*?\n\}\nconst SGZ_UI_CORE_READY=/,
  'function prepareSgzReviewData(){return Promise.resolve([]);}\nconst SGZ_UI_CORE_READY='
);
// The canonical workbench may still know the old generic seat patch for local
// migration, but the V66 reader is driven exclusively by the verified,
// time-scoped projection. Remove both the loader and any review-only seat
// registry loader before dependency discovery.
html = html.replace(/^\s*loadSgzDataScript\('fangzhen-seat-supplement',[^\n]+\n?/gm, '');
html = html.replace(/^\s*loadSgzDataScript\('v66-administrative-seat-periods',[^\n]+\n?/gm, '');
html = html.replace('./data/v62-jin-fangzhen.js?v=62', './data/v62-jin-fangzhen-reader.js');
html = html.replace(/\.\/data\/v63-reader-people\.js\?v=\d+(?:\.\d+)?/g, './data/v63-reader-people.js?v=66');
html = html.replace(/\.\/data\/v63-reader-person-relations\.js\?v=\d+(?:\.\d+)?/g, './data/v63-reader-person-relations.js?v=66');
html = html.replace("&&event.publicationStatus==='verified'", '');
html = html.replace(
  "      workspaceMode.value=value==='review'?'review':'reader';",
  "      workspaceMode.value=window.SGZ_READER_BUILD?'reader':(value==='review'?'review':'reader');"
);
html = html.replace(
  "        if(['reader','review'].includes(saved.workspaceMode)) workspaceMode.value=saved.workspaceMode;",
  "        if(!window.SGZ_READER_BUILD&&['reader','review'].includes(saved.workspaceMode)) workspaceMode.value=saved.workspaceMode;"
);
// Remove the only canonical inline source records. Runtime compatibility code
// may still mention source-field identifiers (see the explicit exception
// list), but no locator or excerpt value is embedded in the reader document.
html = html.replace(/,sourceRefs:\[\{[^\n]*?\}\]/g, '');
html = html.replace(
  "      sourceExcerpt:'本文为来源文章所列府属研究；具体任职与任期按 status/confidence 保留。'",
  "      sourceExcerpt:''"
);
html = html.replace(/'audit-only'/g, "'eligible'");
html = html.replace(
  /^\s*<button type="button" :class="\{active:workspaceMode==='review'\}" @click="setWorkspaceMode\('review'\)">\u5ba1\u6821<\/button>\s*$/m,
  ''
);
html = html.replace(
  "  return Promise.resolve([]);\n}\nconst SGZ_UI_CORE_READY=Promise.all([",
  "  if(section==='map')return loadSgzDataScript('hydronym-reader','./assets/map/data/hydronym-reader.js','HYDRONYM_AUDIT').then(value=>[value]);\n  return Promise.resolve([]);\n}\nconst SGZ_UI_CORE_READY=Promise.all(["
);
html = html.replace(
  "  return Promise.resolve([]);\n}\nfunction prepareSgzReviewData(){",
  "  if(section==='map')return loadSgzDataScript('hydronym-reader','./assets/map/data/hydronym-reader.js','HYDRONYM_AUDIT').then(value=>[value]);\n  return Promise.resolve([]);\n}\nfunction prepareSgzReviewData(){"
);
if (!html.includes('data/v63-reader-people.js')) {
  html = html.replace('</head>', '<script src="./data/v63-reader-people.js"></script>\n</head>');
}
if (!html.includes('v63-reader-person-relations')) {
  const peopleReaderLoader = html.match(/^\s*loadSgzDataScript\('v63-reader-people','\.\/data\/v63-reader-people\.js\?v=\d+(?:\.\d+)?','SGZ_V63_READER_PEOPLE'\),\s*$/m)?.[0];
  if (!peopleReaderLoader) fail('无法注册 V63 读者人物关联按需脚本：人物数据加载锚点已变更');
  html = html.replace(
    peopleReaderLoader,
    `${peopleReaderLoader}\n      loadSgzDataScript('v63-reader-person-relations','./data/v63-reader-person-relations.js?v=66','SGZ_V63_READER_PERSON_RELATIONS'),`
  );
}
if (!html.includes('v69-fangzhen-reader')) fail('index.html 未引用 V69 州镇读者投影');
if (!html.includes('v69-person-profiles')) fail('index.html 未引用 V69 人物档案读者投影');
if (!html.includes('v69-battle-person-links')) fail('index.html 未引用 V69 战事人物读者投影');
if (!html.includes('v69-epigraphic-records')) fail('index.html 未引用 V69 金石读者投影');
const fangzhenPresetTerminator = '];\n// V28：把州镇表任期待补表合并进预置档案；原文仍保留在 sourceTenureText。';
if (!html.includes(fangzhenPresetTerminator)) fail('无法为读者包应用 V66 州镇可见登记：预置表锚点已变更');
const fangzhenPresetStart = 'const FANGZHEN_PRESETS = [';
const fangzhenPresetStartIndex = html.indexOf(fangzhenPresetStart);
const fangzhenPresetEndIndex = html.indexOf(fangzhenPresetTerminator, fangzhenPresetStartIndex);
if (fangzhenPresetStartIndex < 0 || fangzhenPresetEndIndex < 0) fail('无法隔离读者州镇预置记录');
const fangzhenPresetBlock = html.slice(fangzhenPresetStartIndex, fangzhenPresetEndIndex)
  .split('\n')
  .filter(line => {
    const inlineId = line.match(/^\s*\{id:'([^']+)'/)?.[1];
    return !inlineId || fangzhenReaderIds.has(inlineId);
  })
  .map(line => line.replace(/,(?:sourceLevel|confidence|sourceTitle|sourceUrl):'[^']*'/g, ''))
  .join('\n');
html = html.slice(0, fangzhenPresetStartIndex) + fangzhenPresetBlock + html.slice(fangzhenPresetEndIndex);
html = html.replace(
  fangzhenPresetTerminator,
  `];\n// V28：把州镇表任期待补表合并进预置档案；原文仍保留在 sourceTenureText。`
);
const readerBootstrap = `<script>
(function(global){
  'use strict';
  Object.defineProperty(global,'SGZ_READER_BUILD',{value:true,enumerable:true});
})(window);
</script>`;
html = html.replace('</head>', `${readerBootstrap}\n<meta name="sgz-build" content="reader" />\n</head>`);
html = html.replace("  if (typeof XLSX === 'undefined') missing.push('SheetJS(xlsx)');\n", '');
html = html.replace(/<script\s+src=["']\.\/assets\/vendor\/xlsx\/xlsx\.full\.min\.js["']\s*><\/script>\s*/g, '');
writeText(path.join(stagingPath, 'index.html'), html);

for (const relative of mapRuntimeSourceFiles) {
  let contents = projectionOverrides.get(relative);
  const source = path.join(root, relative);
  if (contents === undefined) {
    if (!fs.existsSync(source)) fail(`地图运行白名单缺少文件 ${relative}`);
    if (/\.(?:html|js|css)$/i.test(relative)) contents = fs.readFileSync(source, 'utf8');
  }
  if (relative === 'assets/map/history-embed.html') {
    contents = contents
      .replace('data/hydronym-audit.js', 'data/hydronym-reader.js')
      .replace(
        '<script src="js/config.js?v=41"></script>\n<script src="js/safe-html.js"></script>',
        '<script src="js/safe-html.js"></script>\n<script src="js/config.js?v=41"></script>'
      )
      .replace('古水名（《水经注》卷次标注）', '古水名')
      .replace('<label><input id="lyr-hydronym" type="checkbox" checked> 古水名标注</label>', '<label><input id="lyr-hydronym" type="checkbox" checked> 古水名</label>');
  } else if (relative === 'assets/map/data/administrative-snapshots.js') {
    contents = contents.replace(/\n\/\* 供自动审计：[\s\S]*?window\.ADMINISTRATIVE_AUDIT_RULES[\s\S]*?\);\s*$/m, '\n');
  }
  const target = path.join(stagingPath, relative);
  if (contents !== undefined) writeText(target, contents);
  else copyFile(source, target);
}

const portraitManifest = fullPortraitManifest;
const portraitPaths = new Set(
  [...Object.values(portraitManifest.assetsById || {}), ...Object.values(portraitManifest.byPersonId || {})]
    .filter(item => item?.status === 'ready')
    .map(item => normalizeLocalReference(item.src))
    .filter(item => item.startsWith('assets/portraits/'))
);
for (const relative of [...portraitPaths].sort()) {
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) fail(`立绘清单引用不存在的文件 ${relative}`);
  copyFile(source, path.join(stagingPath, relative));
}

const localReferences = new Set();
for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/g)) {
  const reference = normalizeLocalReference(match[1]);
  if (!reference || /^(?:https?:|data:|#)/.test(reference)) continue;
  localReferences.add(reference);
}
for (const match of html.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
  const reference = normalizeLocalReference(match[1]);
  if (reference && !/^(?:https?:|data:|#)/.test(reference)) localReferences.add(reference);
}
// Data modules use a small script loader rather than import().  Resolve its
// literal sources as build dependencies so the reader directory is complete
// without copying the whole data tree.
for (const match of html.matchAll(/\bloadSgzDataScript\(\s*[^,]+,\s*["']([^"']+)["']/g)) {
  const reference = normalizeLocalReference(match[1]);
  if (!reference || /^(?:https?:|data:|#)/.test(reference)) continue;
  if (bannedRuntimeFiles.has(reference)) fail(`\u8bfb\u8005 HTML \u4ecd\u5f15\u7528\u5ba1\u6821\u6570\u636e ${reference}`);
  localReferences.add(reference);
}
for (const relative of localReferences) {
  if (!relative.startsWith('assets/app/') || !relative.endsWith('.js')) continue;
  const moduleSource = fs.readFileSync(path.join(root, relative), 'utf8');
  for (const match of moduleSource.matchAll(/(?:import|export)\s[\s\S]*?from\s*['"](\.[^'"]+)['"]/g)) {
    const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1]));
    if (!dependency.startsWith('assets/app/')) fail(`Unexpected UI module dependency: ${dependency}`);
    localReferences.add(dependency);
  }
}
for (const relative of [...localReferences].sort()) {
  const projected = projectionOverrides.get(relative);
  if (projected !== undefined) {
    writeText(path.join(stagingPath, relative), projected);
    continue;
  }
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) fail(`index.html 引用不存在的本地文件 ${relative}`);
  if (bannedRuntimeFiles.has(relative)) fail(`index.html 仍引用审校数据 ${relative}`);
  if (relative.endsWith('.css')) {
    writeText(path.join(stagingPath, relative), rewriteCssRootAssetUrls(fs.readFileSync(source, 'utf8'), relative));
  } else if (/\.(?:js|json|html)$/i.test(relative)) writeText(path.join(stagingPath, relative), fs.readFileSync(source, 'utf8'));
  else copyFile(source, path.join(stagingPath, relative));
}
const referencedAssets = new Set();
function collectCssUrls(text, baseDirectory = '') {
  for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    const raw = String(match[1] || '').trim();
    if (!raw || /^(?:data:|https?:|#)/.test(raw)) continue;
    const resolved = path.posix.normalize(path.posix.join(baseDirectory, normalizeLocalReference(raw)));
    if (!resolved.startsWith('../')) referencedAssets.add(resolved);
  }
}
collectCssUrls(html);
for (const relative of [...localReferences].filter(item => item.endsWith('.css'))) {
  collectCssUrls(fs.readFileSync(path.join(stagingPath, relative), 'utf8'), path.posix.dirname(relative));
}
for (const relative of [...referencedAssets].sort()) {
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) fail(`样式引用不存在的资源 ${relative}`);
  copyFile(source, path.join(stagingPath, relative));
}
writeText(path.join(stagingPath, 'data', 'v63-reader-people.js'), fs.readFileSync(readerPeopleJsPath, 'utf8'));
writeText(path.join(stagingPath, 'data', 'v63-reader-people.json'), `${JSON.stringify(readerPeopleJson, null, 2)}\n`);
writeText(path.join(stagingPath, 'data', 'v63-reader-person-relations.json'), readerPersonRelationsJson);
writeText(path.join(stagingPath, 'data', 'portrait-manifest.js'), projectionOverrides.get('data/portrait-manifest.js'));
writeText(path.join(stagingPath, 'data', 'portrait-manifest.json'), projectionOverrides.get('data/portrait-manifest.json'));

const sensitiveSerializedPattern = new RegExp(`"(?:${serializedSensitiveKeys.join('|')})"\\s*:`, 'g');
const sensitiveObjectKeyPattern = new RegExp(`(?:^|[,{;])\\s*(?:["'](?:${serializedSensitiveKeys.join('|')})["']|(?:${serializedSensitiveKeys.join('|')}))\\s*:`, 'gm');
const sensitiveKeyLiteralPattern = new RegExp(`["'](?:${serializedSensitiveKeys.join('|')})["']`, 'g');
const identifierExceptionHits = new Set();
for (const filePath of listFiles(stagingPath)) {
  if (!/\.(?:html|js|json|css|md|txt)$/i.test(filePath)) continue;
  const contents = fs.readFileSync(filePath, 'utf8');
  const relative = path.relative(stagingPath, filePath).split(path.sep).join('/');
  if (/\/Users\//.test(contents)) fail(`读者包泄露本机绝对路径：${relative}`);
  if (/\.(?:html|js|json)$/i.test(relative)) {
    const thirdPartyCode = readerThirdPartyCodePrefixes.some(prefix => relative.startsWith(prefix));
    sensitiveSerializedPattern.lastIndex = 0;
    sensitiveObjectKeyPattern.lastIndex = 0;
    sensitiveKeyLiteralPattern.lastIndex = 0;
    const hasSensitiveKey = sensitiveSerializedPattern.test(contents) || sensitiveObjectKeyPattern.test(contents) || sensitiveKeyLiteralPattern.test(contents);
    if (hasSensitiveKey && !thirdPartyCode) {
      if (!readerCodeIdentifierExceptions.has(relative)) fail(`读者文件仍包含审校键或字面量：${relative}`);
      identifierExceptionHits.add(relative);
      if (/window\.SGZ_(?:V60_PERSON_WORKBOOK_IMPORT|V61_PERSON_SUPPLEMENTS|V60_RESEARCH_LEDGER|V61_EPIGRAPHY_RESEARCH|V63_PERSON_REGISTRY|PERSON_SOURCE_INDEX)\s*=/.test(contents)) {
        fail(`代码例外文件内嵌了审校全局对象：${relative}`);
      }
    }
    if (!thirdPartyCode && !readerCodeIdentifierExceptions.has(relative) && /["'](?:audit-only|review-only)["']/.test(contents)) {
      fail(`读者文件仍包含审校状态值：${relative}`);
    }
    if (!thirdPartyCode && mapAuditIdentifiers.some(identifier => contents.includes(identifier))) {
      fail(`读者文件仍包含地图审校台账标识：${relative}`);
    }
  }
}
for (const relative of readerCodeIdentifierExceptions) {
  if (!fs.existsSync(path.join(stagingPath, relative))) fail(`审校键代码例外文件不存在：${relative}`);
  if (!identifierExceptionHits.has(relative)) fail(`审校键代码例外已无命中，应删除例外：${relative}`);
}
const builtHtml = fs.readFileSync(path.join(stagingPath, 'index.html'), 'utf8');
const builtHead = builtHtml.slice(0, builtHtml.indexOf('</head>') + 7);
if (/<script\s+[^>]*src=["'][^"']*assets\/vendor\/xlsx\/xlsx\.full\.min\.js/.test(builtHead)) fail('读者 HTML 仍在首屏加载 SheetJS');
if ([...bannedRuntimeFiles].some(relative => builtHtml.includes(relative))) fail('读者 HTML 仍引用审校运行模块');
if (/window\.SGZ_(?:V60_PERSON_WORKBOOK_IMPORT|V61_PERSON_SUPPLEMENTS|V60_RESEARCH_LEDGER|V61_EPIGRAPHY_RESEARCH|PERSON_SOURCE_INDEX)\s*=/.test(builtHtml)) {
  fail('读者 HTML 内嵌了审校数据对象');
}
if (/"(?:workbookSource|workbookSources|workbookHash|sheet|row|sourceRecordId|rowAudit|externalSearchLog|searchLog|searchState|historicalDisposition|researchDisposition|publicationStatus|sourceLocator|sourceExcerpt|evidence|reviewQueue|researchQueue)"\s*:/.test(builtHtml)) {
  fail('读者 HTML 内嵌了禁止的审校负载');
}
for (const banned of bannedRuntimeFiles) {
  if (fs.existsSync(path.join(stagingPath, banned))) fail(`读者包误带审校模块 ${banned}`);
}

const filesBeforeManifest = listFiles(stagingPath).map(filePath => {
  const buffer = fs.readFileSync(filePath);
  return { path: path.relative(stagingPath, filePath).split(path.sep).join('/'), bytes: buffer.length, sha256: sha256(buffer) };
}).sort((a, b) => compareText(a.path, b.path));
const bundleManifest = {
  schemaVersion: 1,
  build: 'reader',
  sourceRegistryModelId: registryJson.modelId,
  sourceReaderModelId: readerPeopleJson.modelId,
  personCount: Object.keys(readerPeopleJson.byPersonId || readerPeopleJson.peopleById || {}).length || (readerPeopleJson.people || []).length,
  portraitCount: portraitPaths.size,
  readerProjection: {
    mapRuntimeFiles: mapRuntimeSourceFiles.slice().sort(),
    projectedDataFiles: [...projectedDataFiles].sort(),
    codeIdentifierExceptions: [...readerCodeIdentifierExceptions].sort(),
    thirdPartyCodePrefixes: readerThirdPartyCodePrefixes.slice(),
    fangzhenReaderRecordCount: v69FangzhenIds.size,
    fangzhenVerifiedRecordCount: v69FangzhenRecords.filter(row => row.readerDisplayStatus === 'verified').length,
    fangzhenCandidateRecordCount: v69FangzhenRecords.filter(row => row.readerDisplayStatus === 'candidate').length,
    personProfileCount: v69PersonProfilePayload.profiles.length,
    battlePersonLinkCount: v69BattleLinkPayload.links.length,
    epigraphicRecordCount: v69EpigraphicRecords.length,
    peerageNodeCount: v66PeerageNodes.length,
    peerageLinkedEventCount: v66PeerageEvents.length,
    generalTitleReaderCount: actualReaderGeneralKeys.size,
    generalTitleLegacyVerifiedCount: oldVerifiedGeneralKeys.size,
    generalTitleV65VerifiedCount: v65VerifiedGeneralKeys.size,
    personAppointmentReferenceCount: appointmentReferenceCount,
    personAppointmentRelationCount: appointmentRelations.length,
    personPeerageReferenceCount: peerageReferenceCount,
    personPeerageRelationCount: peerageRelations.length,
    personPeerageUniqueEventCount: new Set(peerageRelations.map(row => row.eventId)).size,
    epigraphyReaderOverlayCount: fs.existsSync(epigraphyReaderOverlayPath)
      ? (runtimeGlobal('data/v65-epigraphy-reader-overlays.js', 'SGZ_V65_EPIGRAPHY_READER_OVERLAYS').records || []).length
      : 0,
    mapPeriodCount: (mapPeriodRegistry.periods || []).length,
    mapAuditGlobals: 0
  },
  leakScan: { absolutePaths: 0, bannedRuntimeFiles: 0, bannedReaderPayloadKeys: 0, sensitiveSerializedKeys: 0, auditStatusValues: 0, embeddedAuditPayloads: 0, firstScreenSheetJs: 0, explicitCodeIdentifierExceptions: identifierExceptionHits.size },
  fileCount: filesBeforeManifest.length,
  totalBytes: filesBeforeManifest.reduce((sum, file) => sum + file.bytes, 0),
  aggregateSha256: sha256(filesBeforeManifest.map(file => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join('')),
  files: filesBeforeManifest
};
writeText(path.join(stagingPath, 'reader-bundle.json'), `${JSON.stringify(bundleManifest, null, 2)}\n`);

for (const item of bundleManifest.files) {
  const filePath = path.join(stagingPath, item.path);
  const buffer = fs.readFileSync(filePath);
  if (buffer.length !== item.bytes || sha256(buffer) !== item.sha256) fail(`reader-bundle.json 写入后校验不匹配：${item.path}`);
}

fs.rmSync(outputPath, { recursive: true, force: true });
fs.renameSync(stagingPath, outputPath);
console.log(`已生成 V69 读者 Web 包：${outputPath}`);
console.log(`读者包：${bundleManifest.fileCount + 1} 文件，${bundleManifest.totalBytes} 字节，${bundleManifest.personCount} 人，${bundleManifest.portraitCount} 张立绘`);
console.log('泄露扫描：本机绝对路径0，审校运行文件0，禁止投影字段0');
