import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = decodeURIComponent(new URL('../templates/三国职官谱_V42_统一导入模板.xlsx', import.meta.url).pathname);
const workbook = Workbook.create();

const sheets = [
  ['使用说明', [
    ['三国职官谱 V42 统一导入模板', '用于规范数据录入与后续无损回导。普通阅读界面不展示证据字段。'],
    ['填写原则', '每行一个实体；ID 稳定且不可复用；未知填写“未详”，不要臆测。'],
    ['争议标记', '有争议的记录在 disputed 填 TRUE，前台显示名称后加 *，争议说明填入 disputeNote。'],
    ['员额规则', 'authorizedCount 填史料明确员额；displayCapacity 填界面展示席位；两者不同须在 note 说明。'],
    ['府署规则', '州主簿归文官；能开府或有明确府署的官职填写 residenceType 与 backgroundStyle。'],
    ['金石释文', '有释文的材料完整填写 fullInscription；不得用墓葬年代替代器物年代。'],
    ['现代边界', '仅作活动区域裁剪和阅读参照，不作为古代政区边界定论。'],
  ]],
  ['枚举', [
    ['polity', '汉；魏；吴；晋；异族；未详'],
    ['civilMilitary', '文官；武官；中性'],
    ['officeCategory', '中央官；公位；九卿；州牧刺史；郡国守相；州郡属官；将军武职；都督军事；幕府属官；属国护官；其他'],
    ['residenceType', '丞相三公府；将军府；都督府；州府；郡府；太子王府；无；未详'],
    ['backgroundStyle', 'central-court；grand-minister；general；du督；province；commandery；prince；plain'],
    ['disputed', 'TRUE；FALSE'],
  ]],
  ['人物', [
    ['personId','姓名','别名','字','籍贯','生年','卒年','主要势力','首字母','生平','立绘文件名','disputed','disputeNote'],
    ['person:han:liu-bei','刘备','','玄德','涿郡涿县',161,223,'汉','L','汉末群雄，后建立蜀汉。','liu-bei.png',false,''],
  ]],
  ['官职', [
    ['officeId','势力','官职名称','上级officeId','分类','文武','秩俸/品级','可开府','府署类型','设立年','裁撤年','排序','disputed','disputeNote'],
    ['office:han:shi-zhong','汉','侍中','','中央官','文官','比二千石','FALSE','无','','',120,false,''],
    ['office:han:zhou-zhu-bu','汉','州主簿','','州郡属官','文官','未详','FALSE','州府','','',260,false,''],
  ]],
  ['员额', [
    ['seatPolicyId','officeId','validFrom','validTo','rule','authorizedCount','displayCapacity','sourceId','note','disputed'],
    ['seat:han:shi-zhong:end-han','office:han:shi-zhong',184,220,'末汉朝廷侍中员额按时期展示',6,6,'source:后汉书百官志','具体时期仍须结合编年核对',false],
  ]],
  ['任官', [
    ['appointmentId','personId','officeId','jurisdictionId','polity','startYear','endYear','appointmentStatus','disputed','disputeNote'],
    ['appointment:han:liu-bei:zuo-jiangjun','person:han:liu-bei','office:han:zuo-jiangjun','jurisdiction:han:jingzhou','汉',209,214,'已任',false,''],
  ]],
  ['府署', [
    ['residenceId','ownerOfficeId','name','residenceType','backgroundStyle','validFrom','validTo','note','disputed'],
    ['residence:han:丞相府','office:han:丞相','丞相府','丞相三公府','grand-minister',208,220,'点击官职或人物进入府属界面',false],
  ]],
  ['州镇职任', [
    ['appointmentId','personId','官名','州/镇','辖区','治所','任期起','任期止','polity','civilMilitary','disputed','disputeNote'],
    ['fangzhen:han:zhou-zhu-bu:example','person:han:example','州主簿','荆州','南郡','江陵','未详','未详','汉','文官',false,''],
  ]],
  ['战事编年', [
    ['eventId','battleId','dateText','year','州','支线','eventType','title','summary','disputed','disputeNote'],
    ['event:example','battle:example','建安二十四年',219,'荆州','襄樊线','战事','示例战事','填写单条编年，使用 battleId 关联战役详情。',false,''],
  ]],
  ['战役', [['battleId','name','startYear','endYear','州','战场','participants','result','disputed','disputeNote'], ['battle:example','示例战役',219,219,'荆州','襄阳','汉；魏','未详',false,'']]],
  ['战场', [['battlefieldId','name','州','位置','note','disputed','disputeNote'], ['battlefield:example','示例战场','荆州','未详','',false,'']]],
  ['金石', [
    ['epigraphicId','名称','类型','器物年代','年代文字','国名','出土地','释文','fullInscription','人物','官职','disputed','disputeNote','note'],
    ['epigraphic:example','示例碑刻','碑刻','','年代未详','汉','未详','释文示例','此处填写完整释文。','','',false,'',''],
  ]],
  ['食货制度', [['recordId','制度/统计名称','polity','year','yearText','category','value','unit','summary','disputed','disputeNote'], ['economy:example','示例户口统计','汉',219,'建安二十四年','户口','','户','',false,'']]],
  ['户口', [['recordId','polity','year','yearText','households','population','region','sourceId','disputed','disputeNote'], ['population:example','汉',219,'建安二十四年','','','全国','','',false,'']]],
  ['地图时期', [['periodId','year','yearText','snapshotMoment','capital','polities','note','disputed','disputeNote'], ['period:example',220,'建安二十五年','年末态势','洛阳','魏；吴；汉','',false,'']]],
  ['地图断言', [['claimId','periodId','subjectType','subject','statement','status','sourceId','disputed','disputeNote'], ['claim:example','period:example','政区','示例州','填写行政断言','推定','','',false,'']]],
  ['活动区域', [['regionId','name','polity','vectorKind','geometry','modernReference','note','disputed','disputeNote'], ['region:qiang','羌活动范围','异族','activity-zone','{...}','modern-administrative-boundary-reference','仅作裁剪参照，不等同古代边界',false,'']]],
  ['证据', [['sourceId','标题','层级','定位','摘录','URL','confidence','note'], ['source:后汉书百官志','《后汉书·百官志》','一手史料','百官志','原文定位','','确定','内部证据表，不投影到阅读界面。']]],
];

const headerFill = '#24312B';
const headerFont = '#FFFFFF';
const titleFill = '#E9EFE9';
const widths = [22, 22, 18, 18, 18, 18, 18, 18, 24, 16, 16, 16, 18, 22];

for (const [name, rows] of sheets) {
  const sheet = workbook.worksheets.add(name);
  const maxCols = Math.max(...rows.map(row => row.length));
  const normalized = rows.map(row => row.concat(Array(maxCols - row.length).fill('')));
  sheet.getRangeByIndexes(0, 0, normalized.length, maxCols).values = normalized;
  sheet.freezePanes.freezeRows(1);
  const header = sheet.getRangeByIndexes(0, 0, 1, maxCols);
  header.format = { fill: headerFill, font: { color: headerFont, bold: true }, wrapText: true, verticalAlignment: 'center' };
  sheet.getRangeByIndexes(0, 0, normalized.length, maxCols).format.wrapText = true;
  sheet.getRangeByIndexes(0, 0, normalized.length, maxCols).format.verticalAlignment = 'center';
  if (rows.length > 1) {
    const table = sheet.tables.add(`A1:${String.fromCharCode(64 + Math.min(maxCols, 26))}${normalized.length}`, true, `V42_${name.replace(/[^\w\u3400-\u9fff]/g,'')}`);
    table.showFilterButton = true;
    table.showBandedRows = true;
  }
  for (let i = 0; i < maxCols; i++) sheet.getRangeByIndexes(0, i, normalized.length, 1).format.columnWidth = widths[i] || 18;
  sheet.getRangeByIndexes(0, 0, 1, maxCols).format.rowHeight = 30;
  if (name === '使用说明' || name === '枚举') sheet.getRangeByIndexes(0, 0, normalized.length, maxCols).format.fill = titleFill;
}

const instructions = workbook.worksheets.getItem('使用说明');
instructions.getRange('A1:B1').format = { fill: '#B08D57', font: { color: '#FFFFFF', bold: true, size: 14 }, wrapText: true };
instructions.getRange('A1:B1').format.rowHeight = 36;

await fs.mkdir(new URL('../templates/', import.meta.url), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`created ${outputPath}`);
