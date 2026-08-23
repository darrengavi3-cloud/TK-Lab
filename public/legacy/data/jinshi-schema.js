(function(global){
  'use strict';

  const columns = Object.freeze([
    { key:'name', label:'名称', sourceField:'name', kind:'text' },
    { key:'materialType', label:'材料类型', sourceField:'materialType', kind:'text' },
    { key:'polity', label:'国别', sourceField:'polity', kind:'text' },
    { key:'archiveKind', label:'档案层级', sourceField:'archiveKind', kind:'status' },
    { key:'dateText', label:'年代', sourceField:'dateText', kind:'text' },
    { key:'findspot', label:'出土地', sourceField:'findspot', kind:'text' },
    { key:'people', label:'关联人物', sourceField:'people', kind:'text' },
    { key:'offices', label:'关联官职', sourceField:'offices', kind:'text' },
    { key:'form', label:'形制', sourceField:'form', kind:'text' },
    { key:'scriptStyle', label:'书体', sourceField:'scriptStyle', kind:'text' },
    { key:'inscription', label:'释文', sourceField:'inscription', kind:'longText' },
    { key:'note', label:'释读说明', sourceField:'note', kind:'longText' },
  ]);

  function text(value){ return String(value == null ? '' : value).trim(); }
  function normalize(raw){
    const row = { ...(raw || {}) };
    row.entityType = 'epigraphicRecord';
    row.name = text(row.name || row.title || row.displayName);
    row.materialType = text(row.materialType || row.type || '其他');
    row.type = row.materialType;
    row.polity = text(row.polity);
    row.archiveKind = text(row.archiveKind || (row.researchStatus === '争议' ? '争议' : '核心'));
    row.dateText = text(row.dateText || row.yearText || (row.year != null ? `${row.year}年` : '年代未详'));
    row.year = Number.isFinite(Number(row.year)) ? Number(row.year) : null;
    row.findspot = text(row.findspot || row.place || row.region);
    row.place = row.findspot;
    row.region = text(row.region || row.findspot);
    row.people = text(row.people);
    row.offices = text(row.offices);
    row.form = text(row.form);
    row.scriptStyle = text(row.scriptStyle);
    row.inscription = String(row.inscription == null ? '' : row.inscription);
    row.note = text(row.note);
    row.inscriptionStatus = text(row.inscriptionStatus || (row.inscription ? '已录入' : '待补释文'));
    row.researchStatus = text(row.researchStatus || row.evidenceStatus || '待考');
    row.sourceDocument = text(row.sourceDocument || row.source || row.sourceTitle);
    row.sourceLocator = text(row.sourceLocator);
    return row;
  }

  global.SGZ_JINSHI_SCHEMA = Object.freeze({
    schemaVersion:'V49',
    modelId:'sgz-jinshi-record-v49',
    policy:'页面表头只绑定规范字段；旧字段保留兼容读取，但不直接决定列语义。',
    columns,
    normalize,
  });
})(window);
