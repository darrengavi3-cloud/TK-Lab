(function(global){
  'use strict';
  const source=global.SGZ_BATTLE_RECORDS;
  const records=source&&Array.isArray(source.battlefields)?source.battlefields.map(function(row){
    const evidence=row.coordinateEvidence||{};
    return Object.freeze({
      battlefieldId:row.id,
      name:row.name,
      lat:row.lat,
      lng:row.lng,
      coordinateType:evidence.coordinateType||'',
      errorRadiusKm:evidence.errorRadiusKm,
      localizationScope:evidence.localizationScope||'',
      confidence:evidence.confidence||row.confidence||'',
      sourceTitle:evidence.sourceTitle||row.sourceTitle||'',
      sourceUrl:evidence.sourceUrl||row.sourceUrl||'',
      sourceLocator:evidence.sourceLocator||row.sourceLocator||'',
      accessedAt:evidence.accessedAt||row.accessedAt||'',
      searchState:evidence.searchState||row.searchState||'',
      historicalDisposition:evidence.historicalDisposition||row.historicalDisposition||'',
      coordinateUnchanged:evidence.coordinateUnchanged===true
    });
  }):[];
  global.SGZ_V65_BATTLE_COORDINATE_AUDIT=Object.freeze({
    schemaVersion:'V65',
    generatedAt:'2026-08-30',
    policy:'史籍只能证明历史地名和战役范围；经纬度继续沿用既有地图点，不据本轮考证擅改。误差半径为地图表达尺度，不是测量精度。',
    records:Object.freeze(records)
  });
})(window);
