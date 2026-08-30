(function(global){
  'use strict';
  const source=global.SGZ_SHIHUO_DATA;
  const records=source&&Array.isArray(source.household)?source.household.map(function(row){
    return Object.freeze({
      metricId:row.id,
      recordId:row.recordId,
      year:row.year==null?null:row.year,
      polity:row.polity,
      households:row.households,
      population:row.population,
      statisticalUnit:row.statisticalUnit,
      regionScope:row.regionScope||'',
      populationDefinition:row.populationDefinition||'',
      dataNature:row.dataNature||'',
      comparability:row.comparability,
      sourceTitle:row.sourceTitle||'',
      sourceUrl:row.sourceUrl||'',
      sourceLocator:row.sourceLocator||'',
      accessedAt:row.accessedAt||'',
      searchState:row.searchState||'',
      historicalDisposition:row.historicalDisposition||''
    });
  }):[];
  global.SGZ_V65_SHIHUO_METRICS_AUDIT=Object.freeze({
    schemaVersion:'V65',
    generatedAt:'2026-08-30',
    policy:'户、口、覆盖地区、人口定义、资料性质和可比性分别记录。只有 comparability.chartEligible 为 true 的记录进入图表；可比不等于疆域、时点完全相同。',
    records:Object.freeze(records)
  });
})(window);
