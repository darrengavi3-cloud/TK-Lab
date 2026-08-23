import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const html = read('index.html');
const portable = read('exports/三国职官谱-单文件版.html');

const context = { window: {} }; context.window.window = context.window; vm.createContext(context);
const run = relative => new vm.Script(read(relative), { filename: relative }).runInContext(context);
run('data/person-identities.js');
run('data/person-source-index.js');
run('data/battle-records.js');
const identities = context.window.SGZ_PERSON_IDENTITIES;
const sourceIndex = context.window.SGZ_PERSON_SOURCE_INDEX;
const battles = context.window.SGZ_BATTLE_RECORDS;

const attachment = JSON.parse(read('data/v45-attachment-candidates.json'));
const generalTitlesSource = read('data/general-titles.js');
const shihuoGap = JSON.parse(read('data/v45-shihuo-gap.json'));
const fangzhenReview = JSON.parse(read('data/v45-fangzhen-review.json'));
const coverage = JSON.parse(read('data/person-volume-coverage.json'));
const ziSupplement = JSON.parse(read('data/person-zi-supplement.json'));

// 1. 朝堂/府署误入
assert(html.includes('courtResidenceReason') && html.includes('府署定义：'), '府署入口依据函数未接入');
assert(html.includes('!item.isFallback&&policyPolityMatches'), '兼容府署不得参与显式府署匹配');
assert(html.includes("if(!courtResidenceAvailable(owner)) return 'plain';"), '无显式府署的官位不得套用丞相三公府样式');
assert(html.includes("categoryRoleMatches") && html.includes('储君|皇太子|太子$'), '东宫/王府/将军府类别匹配未限定府主角色');
assert(html.includes('courtResidenceReason(node)'), '府署误入审计项未接入审校中心');
assert(!html.includes('else score+=10;') && html.includes('else return {item,score:-1};'), '指定府主姓名的府署不得在无匹配人物时加分');
assert(html.includes('policy.personName && !figures.some(person=>String(person.name||\'\')===policy.personName)'), '指定人物的开府政策必须匹配目标人物');

// 2. 人物跨卷合并与同名消歧
assert(identities.version >= 2, '人物身份表未升级');
assert(identities.candidateCount('马忠') === 2, '马忠同名异人消歧表缺失');
assert(identities.resolve('马忠', {polity:'蜀汉'})?.personId !== identities.resolve('马忠', {polity:'吴'})?.personId, '马忠按政权消歧失败');
const zhongYao = sourceIndex.people.filter(item => item.name === '钟繇');
assert(zhongYao.length > 0 && zhongYao.every(item => item.personId === 'person:wei:zhong-yao'), '钟繇跨卷未合并为同一稳定 ID');
assert(!sourceIndex.people.some(item => ['白衣','蒙逊'].includes(item.name)), '误识别人物未清除');
const mislabeled = sourceIndex.appointments.filter(item => ['司徒','司空','太尉','丞相','相国','太傅','太保'].includes(item.officeName) && item.institutionType !== '朝廷机关');
assert(mislabeled.length === 0, '诸公本人仍被误标为府署');
assert(coverage.coverage.every(item => ['已处理','待复核'].includes(item.processedStatus)), '正史卷存在未处理状态');
assert(coverage.coverage.filter(item => item.processedStatus === '待复核').length <= 60, '待复核卷过多');
assert(Number.isInteger(sourceIndex.summary.appointments) && Number.isInteger(sourceIndex.summary.defaultAppointments), '人物任官统计缺少结构化数量');
assert(html.includes('sourceVolumes') && html.includes('含 <b>{{p.sourceVolumes.length}}</b> 卷来源'), '人物卡片未显示卷次来源数');
assert(html.includes('people-source-note') && html.includes('来源卷次：'), '人物详情未显示来源卷次列表');

// 3. 附件候选与状态
assert(attachment.sheets.length === 4, '《三国职官表》应为 4 张表');
assert(attachment.summary.xlsxCandidates >= 100, '《三国职官表》候选数不足');
assert(attachment.summary.docxCandidates >= 100, '《晋人官职》候选数不足');
assert(attachment.summary.allPending, '附件候选必须全部标记存疑/待考');
assert(attachment.xlsxCandidates.every(item => item.verification.includes('正史')), '附件候选缺少正史复核说明');

// 4. 食货对照与战事字段
assert(shihuoGap.status.includes('审计通过') && shihuoGap.findings.every(item => item.coveredBy || item.note), '食货对照结论未完整记录');
const supplemented = battles.battles.filter(item => item.participants || item.strengthNote);
assert(supplemented.length >= 10, '战事纪补充字段覆盖不足');
assert(supplemented.every(item => Array.isArray(item.participants) || item.strengthNote.includes('待考')), '战事补充字段缺少出处限定');
assert(html.includes('activeBattleDetail.participants') && html.includes('activeBattleDetail.strengthNote'), '战事详情未显示参战方/兵力说明');

// 5. 州镇复核清单与审校中心
assert(fangzhenReview.summary.total >= 60, '州镇存疑复核清单不足');
assert(html.includes('showAuditCenter') && html.includes('exportAuditWorkbook') && html.includes('audit-issue-list'), '审校中心或复核工作簿导出未接入');
assert(html.includes("courtResidenceAvailable(node)&&!residenceDefinitionFor(node)"), '无显式府署入口审计项未接入');
assert(portable.includes('courtResidenceReason') && portable.includes('exportAuditWorkbook'), '便携版未同步 V45 审校交互');
assert(fs.existsSync(path.join(root, 'docs/V45史实审核与数据补充.md')), '缺少 V45 版本文档');
assert(fs.existsSync(path.join(root, 'data/v45-release-manifest.json')), '缺少 V45 发布清单');

// 6. 本轮四项修复回归
assert(!html.includes('（见州镇表）') && !html.includes('（录尚书事）') && !html.includes('（或录尚书事）'), '官位名称仍含“见州镇表/录尚书事”括号描述');
assert(!html.includes('都督职任（见州镇表）') && !html.includes('都督与都护职任（见州镇表）'), '职任关联占位节点未删除');
assert(html.includes('mergePersonEntries') && html.includes('所历朝代：'), '人物记去重或跨朝代标签未接入');
assert(html.includes('同名重复人物'), '同名重复人物审计项未接入');
assert(!html.includes('蜀汉与西南') && html.includes('BATTLE_CAMPS') && html.includes('政权沿革与内政'), '战事纪地域分组未改为国家间');
assert(html.includes('<strong>国家间</strong>'), '战事纪“时间支线”未改名为“国家间”');
assert(portable.includes('mergePersonEntries') && portable.includes('BATTLE_CAMPS'), '便携版未同步本轮四项修复');

// 7. 人物记本轮专项回归
const badNames = ['康立','贲九江','賁九江','东部','别部','别驾','曹爽请','曹爽引','郎中令','武陵','吴郡','张掖','司隶','池令','费祎命','王导引','越引','罗引','白衣','蒙逊','常侍大','牧辽东','车骑','伏波','平北','平狄','扶风','桂林','贵阳','江阳'];
const defaultAppointments = sourceIndex.appointments.filter(item => item.includeInDefault === true && item.visibilityStatus === 'visible');
assert(!defaultAppointments.some(item => badNames.includes(item.name)), '误识别人物仍进入默认人物记');
const feiYi = sourceIndex.appointments.filter(item => /费祎|費禕/.test(item.name));
assert(feiYi.length > 0 && new Set(feiYi.map(item => item.personId)).size === 1, '费祎跨卷/跨证据层未合并为单一 personId');
assert(feiYi.every(item => item.personId === 'person:shu:fei-yi'), '费祎未归入显式身份 person:shu:fei-yi');
assert(ziSupplement.supplements.some(item => item.name === '柳隐' && item.zi === '休然'), '柳隐表字补充缺失');
assert(ziSupplement.unresolved.every(item => item.reason.includes('未检出') || item.reason.includes('帝王')), '未补表字必须说明理由，不得臆造');
assert(html.includes('peopleView') && html.includes('people-view-nav') && html.includes('时期快照'), '人物记快照/人物双按钮未接入');
assert(html.includes('openPeopleDetailFromSnapshot'), '快照条目跳转人物档案未接入');
assert(read('data/person-biographies.js').includes("'柳隐':{zi:'休然'"), '柳隐表字未写入人物传记数据');
assert(portable.includes('people-view-nav') && portable.includes('peopleView==='), '便携版未同步人物记双按钮');

// 8. 人物记第二轮专项回归
assert(sourceIndex.appointments.filter(a=>a.name==='蒋琬').length>=3 && new Set(sourceIndex.appointments.filter(a=>a.name==='蒋琬').map(a=>a.personId)).size===1, '蒋琬跨卷历官未合并为单一 personId');
assert(new Set(sourceIndex.appointments.filter(a=>a.name==='费祎').map(a=>a.personId)).size===1, '费祎历官未合并');
assert(!sourceIndex.appointments.some(a=>a.name==='曹爽'&&a.officeName==='掾'), '曹爽仍被误列为属官');
assert(!sourceIndex.appointments.some(a=>/^司马(桓温|曹真|刁暢)$/.test(a.name)), '大司马/司马官职前缀仍被误当复姓');
assert(ziSupplement.supplements.some(item=>item.name==='姜維'||item.name==='姜维'), '姜维表字未补充');
assert(html.includes('personZiFor') && html.includes('SGZ_PERSON_ZI_SUPPLEMENT'), '表字补充未接入人物档案');
assert(html.includes('mergedByOffice') && html.includes('sourceLocators.length>1'), '人物详情多段历官未去重或未标注多处出处');
assert(!html.includes('赵王伦') && !html.includes('梁王肜') && !html.includes('成都王颖') && !html.includes('南阳王保') && !html.includes('东莞王伷') && !html.includes('高阳王珪') && !html.includes('汝阴王骏'), '西晋王爵人物名未更正为司马＋名');
assert(html.includes('司马伦') && html.includes('司马颖') && html.includes('司马骏'), '西晋宗室未使用司马＋名');
assert(portable.includes('personZiFor') && portable.includes('SGZ_PERSON_ZI_SUPPLEMENT'), '便携版未同步表字补充');

// 9. 人物重复/司隶校尉/跨朝注释/将军名号/战事纪 专项回归
assert(!html.includes('州刺史与司隶校尉'), '司隶校尉与州刺史仍混为同一分组');
assert(html.includes("parent:'司隶校尉（魏）'") && html.includes('都官从事'), '司隶校尉都官从事未接入');
assert(html.includes("parent:'州刺史（制度分组）'") && html.includes('别驾从事'), '州刺史别驾从事未接入');
assert(!html.includes('由同一职任的曹魏段续接') && !html.includes('曹魏段截至咸熙二年'), '跨朝整理话术未删除');
assert(html.includes('司隶校尉（魏）') && html.includes('州刺史（制度分组）'), '魏司隶校尉/州刺史分组节点未接入');
assert(generalTitlesSource.includes('wei:Object.freeze') && generalTitlesSource.includes('han:Object.freeze') && generalTitlesSource.includes('wu:Object.freeze'), '将军名号数据未完整生成');
assert(generalTitlesSource.includes("['大将军','一品'") && generalTitlesSource.includes("['上大将军','—'"), '将军名号附件数据缺失');
assert(html.includes('general-titles.js') && generalTitlesSource.includes('SGZ_GENERAL_TITLES'), '将军名号未接入页面');
assert(html.includes('屯田中郎将') && html.includes('典农校尉') && html.includes('典农都尉'), '魏武官列中郎将/校尉/都尉未接入');
assert(html.includes('虎贲中郎将') && html.includes('射声校尉') && html.includes('驸马都尉'), '朝堂武官列中郎将/校尉/都尉缺失');
assert(read('data/battle-records.js').includes('xingshi') && read('data/battle-records.js').includes('longcao') && read('data/battle-records.js').includes('jumashui'), '战事纪兴势/龙凑/巨马水补充缺失');
assert(portable.includes('SGZ_GENERAL_TITLES'), '便携版未同步将军名号');
assert(portable.includes('都官从事') && portable.includes('xingshi'), '便携版未同步司隶校尉修正或战事补充');

console.log('V45 审计验证通过');
console.log(`人物候选 ${sourceIndex.summary.appointments} 条 / 默认范围 ${sourceIndex.summary.defaultAppointments} 条；同名误识别已清除`);
console.log(`附件候选 xlsx ${attachment.summary.xlsxCandidates} + docx ${attachment.summary.docxCandidates}；州镇待复核 ${fangzhenReview.summary.total} 条`);
console.log(`战事补充 ${supplemented.length} 场；正史待复核卷 ${coverage.coverage.filter(item=>item.processedStatus==='待复核').length} 卷`);
