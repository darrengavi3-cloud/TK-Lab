import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => { if (!condition) throw new Error(`V55 校验失败：${message}`); };
const sha256 = relative => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

const context = { window: {}, console };
context.globalThis = context;
vm.createContext(context);
[
  'data/research-model.js',
  'data/person-identities.js',
  'data/person-source-index.js',
  'data/person-zi-supplement.js',
  'data/portrait-manifest.js',
  'data/office-order-policies.js',
  'data/general-titles.js',
  'data/battle-records.js',
  'data/shihuo-records.js',
  'data/epigraphic-records.js',
  'data/jinshi-schema.js',
  'data/epigraphic-v46-jin.js',
].forEach(file => vm.runInContext(read(file), context, { filename: file }));

const html = read('index.html');
const css = read('assets/ui/v55.css');
const audit = json('data/v55-audit.json');
const personIdentityAudit = json('data/v55-person-identity-audit.json');
const release = json('data/v55-release-manifest.json');
const jinshiAudit = json('data/v46-jinshi-audit.json');
const model = context.window.SGZResearchModel;
const identities = context.window.SGZ_PERSON_IDENTITIES;
const source = context.window.SGZ_PERSON_SOURCE_INDEX;
const ziRows = context.window.SGZ_PERSON_ZI_SUPPLEMENT;
const ziAudit = context.window.SGZ_PERSON_ZI_AUDIT;
const portraits = context.window.SGZ_PERSON_PORTRAIT_MANIFEST;
const policy = context.window.SGZ_OFFICE_ORDER_POLICIES;
const titles = context.window.SGZ_GENERAL_TITLES;
const battles = context.window.SGZ_BATTLE_RECORDS;
const shihuo = context.window.SGZ_SHIHUO_DATA;
const jinshiBase = context.window.SGZ_EPIGRAPHIC_RECORDS;
const jinshiSchema = context.window.SGZ_JINSHI_SCHEMA;
const jinshi = context.window.SGZ_EPIGRAPHIC_V46_JIN;

// 1. 原始记录、读者摘要与证据必须并存，阅读投影不得删掉证据字段。
const projectionSource = {
  id: 'projection-test',
  rawRecord: { title: '原始题名', text: '原始记录' },
  readerSummary: '读者摘要',
  evidence: { sourceTitle: '《测试史料》', sourceLocator: '卷一', confidence: '存疑' },
  researchStatus: '存疑',
  sourceTitle: '《测试史料》',
};
const projection = model.projectForReading(projectionSource);
assert(projection.rawRecord?.text === '原始记录', '阅读投影丢失 rawRecord');
assert(projection.readerSummary === '读者摘要', '阅读投影丢失 readerSummary');
assert(projection.evidence?.sourceLocator === '卷一' && projection.researchStatus === '存疑', '阅读投影丢失证据或审校状态');
assert(Array.isArray(model.readingMetaFields) && model.readingMetaFields.includes('rawRecord') && model.readingMetaFields.includes('evidence'), '研究模型未登记阅读／证据分层字段');

// 2. 人物只能按稳定 ID 合并；旧 ID 显式迁移，表字与立绘同步到规范 ID。
assert(identities.version >= 5, '人物身份表版本不足');
assert(identities.legacyPersonIdMap['person:source:51390b3cd295'] === 'person:shu:dong-yun', '董允旧 ID 兼容映射缺失');
const defaultPeople = source.people.filter(person => person.includeInDefault === true);
const canonicalPersonId = person => identities.resolve(person.name)?.personId || identities.canonicalPersonId(person.personId);
const canonicalDefaultIds = defaultPeople.map(canonicalPersonId);
assert(defaultPeople.length === 123 && source.summary.defaultAppointments === 177, '人物默认范围或任官统计偏离已审计基线');
assert(new Set(canonicalDefaultIds).size === canonicalDefaultIds.length, '默认人物规范 personId 重复');
assert(portraits.defaultPersonIds.length === canonicalDefaultIds.length && new Set(portraits.defaultPersonIds).size === canonicalDefaultIds.length, '默认立绘 ID 清单重复或数量不符');
assert(canonicalDefaultIds.every(id => portraits.byPersonId?.[id]?.status === 'ready'), '存在未按规范 personId 接入 ready 立绘的默认人物');
assert(portraits.byPersonId['person:shu:dong-yun']?.name === '董允' && !portraits.byPersonId['person:source:51390b3cd295'], '董允立绘仍保留双 ID');
assert(Array.isArray(ziRows) && ziRows.length === 65 && new Set(ziRows.map(row => identities.canonicalPersonId(row.personId))).size === ziRows.length, '表字记录未按 personId 唯一关联');
assert(ziAudit.resolvedByPersonId === 65 && ziAudit.unresolved.length === 0, '表字 ID 解析仍有未解决项');
const knownBadNames = [
  '安定','安豐','安南','安平','安遠','巴东','巴西','东大','东莞','东羌','东属国','东阳','和世','扶風','乐安','平寇','平南','平虜','平魏','平原','平子雖','曲梁','平戎','时擢','史大夫','通振威','文观','文学','聞弟','烏丸','武都','武平','相大','吴曆','谢服','宣信','严裨','燕平難','阳安','阳平','有军功','章陵','章西安','左大','左度辽','常侍大','牧辽东','曹爽请','曹爽引','賁九江','康代','鲁镇南','时孚','时蒋济','虞子和','卓弟旻'
];
assert(knownBadNames.every(name => !defaultPeople.some(person => person.name === name || (person.aliases || []).includes(name))), '已知地名、官名、族名或句法残片仍进入默认人物');
assert(html.includes("function personKeyOf(name){ return String(name||'').replace(/\\s+/g,' ').trim(); }"), '人物键仍可能删除括号后按姓名合并');
assert(html.includes("const key=String(e.personId||'');") && html.includes('function mergePersonEntries(entries)'), '人物合并未严格使用 personId');
assert(html.includes("const identity=window.SGZ_PERSON_IDENTITIES?.resolve(name,context||{});") && html.indexOf('if(identity?.personId) return identity.personId;') < html.indexOf('if(context?.personId)'), '显式身份没有优先于旧来源 ID');
assert(html.includes('mergedByOffice') && html.includes('return [...mergedByOffice.values()].sort'), '人物详情履历未合并并排序');
assert(html.includes('viewportWidth.value<=760?20:48') && html.includes('pagedPeople'), '人物分页未按桌面 48／移动端 20 接入');
assert(personIdentityAudit.schemaVersion === 'V55' && personIdentityAudit.before.cards === 621 && personIdentityAudit.after.cards === 545, '人物运行时全分页审计基线异常');
assert(personIdentityAudit.mergedSamePersons.length === 56 && personIdentityAudit.after.unresolvedDuplicateGroups === 0, '人物重复归并数量或未解决组异常');
assert(personIdentityAudit.mergedSamePersons.every(name => identities.candidateCount(name) === 1), '已归并人物仍存在多个显式身份候选');
assert(identities.candidateCount('李丰') === 2, '李丰同名异人未保留两个稳定身份');
assert(identities.resolve('李丰', { polity:'季汉' })?.personId === 'person:shu:li-feng', '季汉李丰消歧失败');
assert(identities.resolve('李丰', { polity:'魏' })?.personId === 'person:wei:li-feng', '曹魏李丰消歧失败');
assert(identities.resolve('李丰', { personId:'person:source:c2c2cfbd720b' })?.personId === 'person:wei:li-feng', '曹魏李丰旧 ID 消歧失败');
assert(html.includes(':data-person-id="p.personId"') && (html.includes('person-homonym-tag') || html.includes('同名消歧：{{peoplePrimaryDetail.homonymStatus}}')) && html.includes("`已消歧：${identity.homonymDiscriminator}`"), '人物名录缺少稳定 ID 或显式同名消歧标签');

// 3. 阅读／审校模式与统一检索。
assert(html.includes("const workspaceMode = ref('reader')") && html.includes("setWorkspaceMode('review')"), '阅读／审校双模式未接入');
assert(html.includes('sgz_ui_preferences') && html.includes('workspaceMode:workspaceMode.value'), '工作模式偏好未使用独立小型存储');
assert(html.includes('paletteIsLanding') && html.includes("push('shortcut','常用入口'") && html.includes("push('review','审校任务'"), '空检索落地页不完整');
assert(html.includes('paletteMatchReason') && html.includes('matchReason:') && html.includes('const seen=new Set()'), '检索结果缺少命中原因或稳定去重');
assert(!/v-model="(peopleQuery|battleQuery|fangzhenQuery|epigraphicQuery|shihuoQuery)"/.test(html), '模块页重新出现平行检索输入框');

// 4. 朝堂点击职责分离，只有精确府署定义才开放“府”入口。
assert(html.includes('function courtSlotClick(node)') && html.includes('selectCourtSlot(node);'), '官位点击未限定为选择官位');
assert(html.includes('@click.stop="openCourtPerson(') && html.includes('@click.stop="openCourtResidence(node)"'), '人物与府署缺少独立点击动作');
assert(html.includes("return Boolean(residenceDefinitionFor(node));") && !html.includes('return Boolean(courtResidenceReason(node));'), '府署入口仍使用通用说明兜底');
assert(html.includes("return mayHaveResidence?'府署未建档':''") && html.includes("courtResidenceStatus(node)==='府署未建档'"), '无精确府署定义的状态未显式标注');

// 5. 官职分类与政权专属序位。
assert(html.includes('normalizeOfficeClassifications('), '官职树未进入统一分类规范化流程');
assert(policy.schemaVersion === 2 && Object.keys(policy.commonCourtOrder.wei).length === 4, '曹魏常伯显式顺序缺失');
assert(['han','shu','wu','jin'].every(key => Object.keys(policy.commonCourtOrder[key] || {}).length === 0), '曹魏常伯顺序被错误复制到其他政权');
for (const group of titles.groups) {
  assert(group.titles.every(item => item.serviceDomain === '武官' && item.institutionType === '朝廷机关'), `${group.label}存在未列为武官的将军名号`);
  assert(group.titles.every((item, index, rows) => index === 0 || Number(rows[index - 1].sortOrder) <= Number(item.sortOrder)), `${group.label}将军名号未按 sortOrder 排列`);
  assert(new Set(group.titles.map(item => item.title)).size === group.titles.length, `${group.label}将军名号重复`);
}

// 6. 战事纪、州镇表、食货志与金石录。
assert(battles.events.length === 47 && battles.battles.length === 25 && battles.battlefields.length === 12, '战事纪基线数量异常');
assert([...battles.events, ...battles.battles, ...battles.battlefields].every(row => row.id && row.sourceTitle && row.confidence && row.evidence?.confidence), '战事记录缺少稳定 ID、来源或可信状态');
assert(html.includes("const battleView = ref('chronology')") && html.includes("battleView==='belligerent'") && html.includes("battleView==='campaign'"), '战事纪三种视图未接入');
assert(!html.includes('battleProvinceGroups') && !html.includes('蜀汉与西南'), '战事纪仍以州或“蜀汉与西南”作为主分类');
assert(html.includes("const fangzhenView = ref('records')") && html.includes("fangzhenView==='snapshot'") && html.includes("fangzhenView==='compare'"), '州镇表职任／快照／对比视图不完整');
assert(html.includes('fangzhenOverlapIssues') && html.includes('fangzhen-mobile-cards'), '州镇任期重叠审校或移动端卡片缺失');
assert(html.includes('normalizeFangzhen') && read('data/research-model.js').includes('administrativeUnit'), '州镇记录未规范为行政单位与治所投影');
assert(shihuo.schemaVersion === 'V55' && shihuo.records.length === 71 && shihuo.events.length === 19 && shihuo.household.length === 8, '食货志外置数据数量异常');
assert(shihuo.household.filter(row => row.comparable).length === 4, '户口图可比记录范围异常');
assert(new Set(shihuo.records.filter(row => row.scope === 'baseline').map(row => row.id)).size === 2 && ['sh_146_kentian','sh_157_hukou'].every(id => shihuo.records.some(row => row.id === id && row.scope === 'baseline')), '146／157 基线未与主体分开');
assert(shihuo.records.every(row => row.rawRecord && row.readerSummary && row.evidence), '食货志记录缺少原始／摘要／证据分层');
assert(html.includes('./data/shihuo-records.js') && html.includes('const SHIHUO_DATA = window.SGZ_SHIHUO_DATA'), '食货志外置数据未接入');
assert(read('scripts/extract-v55-shihuo.mjs').includes("status:'already-extracted'"), '食货志抽取脚本不可幂等复跑');

const normalizedJinshi = jinshi.records.map(row => jinshiSchema.normalize(row));
const runtimeJinshi = [...jinshiBase.records, ...jinshi.records].map(row => jinshiSchema.normalize(row));
assert(jinshiSchema.schemaVersion === 'V61' && normalizedJinshi.length === 128, '金石录 V61 字段契约或 V55 规范记录数量异常');
assert(new Set(normalizedJinshi.map(row => row.id)).size === normalizedJinshi.length, '金石录稳定 ID 重复');
assert(normalizedJinshi.every(row => row.rawRecord && row.readerSummary && row.evidence && typeof row.inscription === 'string'), '金石录记录缺少原始／摘要／证据／释文分栏');
assert(jinshiAudit.strikeParagraphCount === 31 && jinshiAudit.strikeCharCount === 778, '金石删除线审计基线异常');
assert(!normalizedJinshi.some(row => /伪刻|伪碑|鲁诠|张永昌|郗氏墓/.test(JSON.stringify(row))), '删除线或明确伪刻内容进入金石运行数据');
assert(normalizedJinshi.filter(row => row.inscription).length === 42 && normalizedJinshi.filter(row => !row.inscription).length === 86, '金石释文／缺载数量异常');
assert(runtimeJinshi.length === 188 && runtimeJinshi.filter(row => row.inscription).length === 46, '金石页面合并目录总量或释文总量异常');
assert((html.includes("scope.row.inscriptionStatus||'源文未见明确释文标识'") || html.includes("jinshiPrimaryDetail.inscriptionStatus||'源文未见明确释文标识'")) && html.includes('openEpigraphicDetail'), '金石录缺少明确缺载状态或详情入口');
assert((html.match(/epigraphicRecords\.value=cloneJSON\([^\n]*map\(normalizeEpigraphicRecord\)/g) || []).length === 3, '金石导入、缓存恢复或迁移路径未统一经过字段规范化');
assert(html.includes("const archiveKind=['核心','扩展','争议'].includes(raw.archiveKind)?raw.archiveKind:(disputed?'争议':'核心')"), '金石旧缓存缺少档案层级显示兜底');

// 7. V55 视觉层、文档、审计清单与地图冻结。
assert(html.includes('<link rel="stylesheet" href="./assets/ui/v55.css" />'), 'V55 最终视觉层未加载');
for (const token of ['--v55-paper','--v55-surface','--v55-ink','--v55-vermilion','--v55-gold','--v55-focus']) assert(css.includes(token), `V55 语义令牌 ${token} 缺失`);
assert(css.includes('@media (max-width: 760px)') && css.includes('prefers-reduced-motion'), 'V55 移动端或减少动效规则缺失');
assert(audit.schemaVersion === 'V55' && audit.people.defaultPeople === defaultPeople.length && audit.jinshi.records === normalizedJinshi.length, 'V55 审计统计与运行数据不一致');
assert(audit.jinshi.runtimeRecords === runtimeJinshi.length && audit.jinshi.runtimeWithInscription === runtimeJinshi.filter(row => row.inscription).length, '金石运行时审计统计与合并目录不一致');
assert(release.schemaVersion === 'V55' && release.externalDelivery.gitCommit === 'not-triggered' && release.externalDelivery.sitesDeploy === 'not-triggered', '发布清单越过本轮授权边界');
assert(Object.values(release.artifacts).every(status => String(status).startsWith('passed')), 'V55 本地构建、验证或浏览器验收仍有未通过项');
assert(fs.existsSync(path.join(root, 'docs/V55史实工作台与六版块优化.md')) && read('DESIGN.md').includes('## V55 紧凑史料工作台') && read('UX-CONTRACT.md').includes('## V55 阅读／审校模式'), 'V55 文档或设计／交互契约未保留');
for (const [file, expected] of Object.entries(audit.mapFreeze.sha256)) assert(sha256(file) === expected, `${file} 违反 V55 形势图冻结边界`);

// 8. 便携版必须内嵌本轮数据与样式，且不留下本地相对资源引用。
const portablePath = path.join(root, 'exports', '三国职官谱-单文件版.html');
assert(fs.existsSync(portablePath), '便携版尚未构建');
const portable = fs.readFileSync(portablePath, 'utf8');
const portableBytes = fs.statSync(portablePath).size;
assert(portable.includes('SGZ_SHIHUO_DATA') && portable.includes('SGZ_PERSON_IDENTITIES') && portable.includes('--v55-paper'), '便携版未内嵌 V55 数据或视觉层');
assert(!/<script[^>]+src=["']\.\/data\//.test(portable) && !/<link[^>]+href=["']\.\/assets\/ui\/v55\.css/.test(portable), '便携版仍引用本地 V55 数据或样式文件');
assert(portable.includes('paletteIsLanding') && portable.includes('府署未建档') && portable.includes("battleView==='campaign'"), '便携版未同步 V55 交互');
assert((portable.includes('person-homonym-tag') || portable.includes('同名消歧：{{peoplePrimaryDetail.homonymStatus}}')) && portable.includes('季汉李严之子') && portable.includes('曹魏中书令'), '便携版未同步人物同名消歧');
assert(portable.includes("const archiveKind=['核心','扩展','争议'].includes(raw.archiveKind)"), '便携版未同步金石旧缓存字段兜底');
assert(portableBytes > 0 && portableBytes < 100 * 1024 * 1024, `便携版体积 ${portableBytes} 字节超过 100 MiB 门禁`);

console.log(JSON.stringify({
  version: 'V55',
  people: { default: defaultPeople.length, canonicalIds: canonicalDefaultIds.length, appointments: source.summary.defaultAppointments, zi: ziRows.length, portraitsReady: canonicalDefaultIds.length },
  offices: { titleGroups: Object.fromEntries(titles.groups.map(group => [group.polity, group.titles.length])), explicitResidenceOnly: true },
  battles: { events: battles.events.length, battles: battles.battles.length, battlefields: battles.battlefields.length },
  shihuo: { records: shihuo.records.length, events: shihuo.events.length, household: shihuo.household.length, comparable: shihuo.household.filter(row => row.comparable).length },
  jinshi: { records: normalizedJinshi.length, withInscription: normalizedJinshi.filter(row => row.inscription).length, strikeParagraphs: jinshiAudit.strikeParagraphCount },
  portable: { bytes: portableBytes },
  map: 'frozen',
  checks: 'passed',
}, null, 2));
