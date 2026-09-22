const yearValue = row => typeof row.year === 'number' && Number.isFinite(row.year) ? row.year : Infinity;

export function selectShihuoRecords(records, {polity='all',category='all',scope='core',query='',kind='all',discussion=false,sort='year'}={}) {
  const q=String(query).normalize('NFKC').trim().toLowerCase();
  return (records||[]).filter(row =>
    (discussion || row.readingClass !== 'discussion') &&
    (polity==='all'||row.polity===polity) &&
    (category==='all'||row.category===category) &&
    (scope==='all'||row.scope===scope) &&
    (kind==='all'||row.recordKind===kind) &&
    (!q||[row.title,row.detail,row.polity,row.category,row.yearText].some(value=>String(value||'').normalize('NFKC').toLowerCase().includes(q)))
  ).slice().sort((a,b)=> {
    const categoryOrder=sort==='category'?String(a.category||'').localeCompare(String(b.category||''),'zh-CN'):0;
    const ay=yearValue(a),by=yearValue(b);
    return categoryOrder||(ay===by?0:ay-by)||String(a.id).localeCompare(String(b.id));
  });
}

export function paginateShihuo(records,page,size=12) {
  const pages=Math.max(1,Math.ceil(records.length/size));
  const current=Math.max(1,Math.min(pages,Number(page)||1));
  return {page:current,pages,total:records.length,rows:records.slice((current-1)*size,current*size)};
}

/* 界面单元登记：模块被 loadSgzUiModule 载入后，本模块以 ui 字段暴露
 * 需要注册为全局组件的界面单元，由 registerSgzUiModuleComponents 统一登记。
 * 界面实现放在 ui/ 子目录，此处只做转发，保持「模块 → ui 单元」的单一入口。 */
export { ui } from './ui/shihuo-ui.js';
