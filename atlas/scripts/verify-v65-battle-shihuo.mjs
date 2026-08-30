import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const assert = (condition, message) => {
  if (!condition) throw new Error(`V65 战场／食货校验失败：${message}`);
};

const context = { window: {}, console };
context.globalThis = context;
vm.createContext(context);
for (const relative of [
  'data/battle-records.js',
  'data/v65-battle-coordinate-audit.js',
  'data/shihuo-records.js',
  'data/v65-shihuo-metrics-audit.js',
]) vm.runInContext(read(relative), context, { filename: relative, timeout: 20_000 });

const battles = context.window.SGZ_BATTLE_RECORDS;
const battleAuditRuntime = context.window.SGZ_V65_BATTLE_COORDINATE_AUDIT;
const battleAudit = json('data/v65-battle-coordinate-audit.json');
const shihuo = context.window.SGZ_SHIHUO_DATA;
const shihuoAuditRuntime = context.window.SGZ_V65_SHIHUO_METRICS_AUDIT;
const shihuoAudit = json('data/v65-shihuo-metrics-audit.json');

const expectedCoordinates = Object.freeze({
  'guandu-field':[34.74,113.96],
  'chibi-field':[29.72,113.90],
  'xiangfan-field':[32.04,112.15],
  'hefei-field':[31.82,117.23],
  'ruxu-field':[31.15,117.72],
  'yiling-field':[30.69,111.29],
  'jieting-field':[34.85,105.95],
  'qishan-field':[34.05,105.05],
  'wuzhang-field':[34.25,107.63],
  'tongguan-field':[34.62,110.22],
  'shouchun-field':[32.56,116.78],
  'dongxing-field':[31.15,117.72],
});

assert(battles && battles.battlefields.length === 12, '战场记录必须保持 12 条');
assert(battleAudit.schemaVersion === 'V65' && battleAudit.records.length === 12, '战场 JSON 台账版本或数量异常');
assert(battleAuditRuntime.schemaVersion === 'V65' && battleAuditRuntime.records.length === 12, '战场运行时台账版本或数量异常');
assert(new Set(battles.battlefields.map(row => row.id)).size === 12, '战场稳定 ID 重复');

for (const row of battles.battlefields) {
  const expected = expectedCoordinates[row.id];
  assert(expected, `${row.id} 不在冻结坐标清单`);
  assert(row.lat === expected[0] && row.lng === expected[1], `${row.id} 坐标被改动`);
  const evidence = row.coordinateEvidence;
  assert(evidence && evidence.coordinateUnchanged === true, `${row.id} 缺少坐标不变声明`);
  assert(typeof evidence.coordinateType === 'string' && evidence.coordinateType, `${row.id} 缺少坐标类型`);
  assert(Number.isFinite(evidence.errorRadiusKm) && evidence.errorRadiusKm > 0, `${row.id} 缺少正数误差半径`);
  assert(typeof evidence.localizationScope === 'string' && evidence.localizationScope, `${row.id} 缺少定位范围`);
  assert(['推定','存疑'].includes(evidence.confidence), `${row.id} 坐标可信度越界`);
  assert(/^https:\/\//.test(evidence.sourceUrl), `${row.id} 缺少来源 URL`);
  assert(evidence.sourceLocator && evidence.accessedAt === '2026-08-30', `${row.id} 缺少来源定位或访问日期`);
  assert(evidence.searchState && evidence.historicalDisposition, `${row.id} 缺少检索状态或史实处置`);
  assert(row.sourceTitle !== '来源待补' && row.researchStatus === '已核', `${row.id} 仍处于来源待补状态`);
}

const battleRuntimeProjection = JSON.parse(JSON.stringify(battleAuditRuntime.records));
assert(JSON.stringify(battleRuntimeProjection) === JSON.stringify(battleAudit.records), '战场 JSON 与运行时台账不一致');

assert(shihuo && shihuo.schemaVersion === 'V55' && shihuo.metricsSchemaVersion === 'V65', '食货兼容版本或 V65 口径版本异常');
assert(shihuo.household.length === 8, '食货户口记录必须保持 8 条');
assert(shihuoAudit.schemaVersion === 'V65' && shihuoAudit.records.length === 8, '食货 JSON 台账版本或数量异常');
assert(shihuoAuditRuntime.schemaVersion === 'V65' && shihuoAuditRuntime.records.length === 8, '食货运行时台账版本或数量异常');
assert(new Set(shihuo.household.map(row => row.id)).size === 8, '食货户口稳定 ID 重复');

for (const row of shihuo.household) {
  assert(row.statisticalUnit?.households === '户' && row.statisticalUnit?.population === '口', `${row.id} 统计单位不完整`);
  assert(row.regionScope && row.populationDefinition && row.dataNature, `${row.id} 缺少地区范围、人口口径或数据性质`);
  assert(row.comparability && typeof row.comparability.chartEligible === 'boolean', `${row.id} 缺少显式可比性`);
  assert(row.comparable === row.comparability.chartEligible, `${row.id} 旧 comparable 与 V65 口径不一致`);
  assert(/^https:\/\//.test(row.sourceUrl) && row.sourceLocator, `${row.id} 缺少来源 URL 或 locator`);
  assert(row.accessedAt === '2026-08-30' && row.searchState && row.historicalDisposition, `${row.id} 缺少访问日期、检索状态或史实处置`);
}

const comparable = shihuo.household.filter(row => row.comparable);
assert(comparable.length === 4, '图表可比记录应保持 4 条');
assert(new Set(comparable.map(row => row.id)).size === 4, '图表可比记录 ID 重复');
assert(['hh_157','hh_263_shu','hh_280_wu','hh_280_jin'].every(id => comparable.some(row => row.id === id)), '图表可比记录清单异常');
const unresolvedWu = shihuo.household.find(row => row.id === 'hh_263_wu');
assert(unresolvedWu.searchState === '明确无候选' && unresolvedWu.historicalDisposition === '明确无候选' && !unresolvedWu.comparable, '吴中期旧推算值未以明确无候选收口');
const derivedWei = shihuo.household.find(row => row.id === 'hh_263_wei');
const derivedWeiRecord = shihuo.records.find(row => row.id === 'sh_263_hukou_wei');
assert(/魏平蜀后合计数/.test(derivedWei?.note || '') && /蜀亡国簿户口/.test(derivedWei?.note || '') && !/吴/.test(derivedWei?.note || ''), '魏户口读者注释必须只说明“魏平蜀后合计减蜀亡国簿”，不得扣减吴');
assert(/魏平蜀后合计数/.test(derivedWeiRecord?.detail || '') && /蜀亡国簿户口/.test(derivedWeiRecord?.detail || '') && !/减[^，。]*吴/.test(derivedWeiRecord?.detail || ''), '魏户口记录说明仍错误包含吴国扣减');
const taikang = shihuo.household.find(row => row.id === 'hh_280_jin');
assert(taikang.households === '2,459,840 户' && taikang.population === '16,163,863 口', '太康户口未按《晋书》《通典》同载数字校正');

const shihuoRuntimeProjection = JSON.parse(JSON.stringify(shihuoAuditRuntime.records));
assert(JSON.stringify(shihuoRuntimeProjection) === JSON.stringify(shihuoAudit.records), '食货 JSON 与运行时台账不一致');
assert(fs.existsSync(path.join(root, 'docs/V65战场坐标与食货口径.md')), '专项说明文档缺失');

console.log(JSON.stringify({
  version:'V65',
  battlefields:{total:battles.battlefields.length,coordinatesUnchanged:true,sourceClosed:battles.battlefields.filter(row=>row.researchStatus==='已核').length},
  shihuo:{total:shihuo.household.length,chartEligible:comparable.length,notComparable:shihuo.household.length-comparable.length,explicitNoCandidate:1},
  checks:'passed',
}, null, 2));
