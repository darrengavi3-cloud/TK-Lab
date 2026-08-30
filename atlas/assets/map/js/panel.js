/**
 * panel.js — 信息面板与图例
 * 所有史料字段均以 textContent 写入，不解析数据中的 HTML。
 */

const Panel = (function () {
  const readerBuild = window.SGZ_READER_BUILD === true
    || window.HYDRONYM_AUDIT?.modelId === 'sgz-hydronym-reader-v64';
  const el = () => document.getElementById('info-panel');
  const body = () => el().querySelector('.panel-body');
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const add = (parent, ...children) => {
    children.flat().filter(Boolean).forEach((child) => parent.appendChild(child));
    return parent;
  };

  function open() { el().classList.add('is-open'); }
  function close() { el().classList.remove('is-open'); }
  function render(content) { body().replaceChildren(content); open(); }
  function backButton(label, handler) {
    const button = make('button', 'pv-back', label);
    button.type = 'button';
    button.addEventListener('click', handler || back);
    return button;
  }
  function header(kind, title, tag, options = {}) {
    const root = make('div', 'pv-head');
    const kindNode = make('div', options.kindClass || 'pv-kind', kind);
    const titleNode = make('h2', 'pv-title', title);
    if (options.kindColor) kindNode.style.color = MapSafeHtml.safeHex(options.kindColor);
    if (options.titleColor) titleNode.style.color = MapSafeHtml.safeHex(options.titleColor);
    add(root, kindNode, titleNode);
    if (tag) add(root, make('div', 'pv-tag', tag));
    return root;
  }
  function section(label, content) { return add(make('div', 'pv-section'), make('div', 'pv-label', label), content); }

  function periodFactions(periodId) {
    const map = PROVINCE_PERIODS[periodId] || {};
    const order = ['han', 'wei', 'shu', 'wu', 'jin', 'warlords'];
    const ids = new Set(Object.values(map));
    return order.filter((id) => ids.has(id)).map((id) => FACTIONS[id]);
  }

  function periodView(p) {
    const root = document.createDocumentFragment();
    const head = make('div', 'pv-head');
    add(head, make('div', 'pv-year', `${p.dynasty || ''} · ${p.year} 年`), make('h2', 'pv-title', p.name), make('div', 'pv-tag', p.tagline));
    root.appendChild(head);
    root.appendChild(make('p', 'pv-summary', p.summary));
    const chips = make('div', 'pv-chips');
    periodFactions(p.id).forEach((f) => { const chip = make('span', 'chip', f.name); chip.style.setProperty('--c', MapSafeHtml.safeHex(f.color)); chips.appendChild(chip); });
    root.appendChild(section('当世势力', chips));
    const reigns = make('div', 'pv-reigns');
    (p.reigns || []).forEach((r) => add(reigns, add(make('div', 'reign-row'), make('span', 'reign-era', r.era), make('span', 'reign-emp', r.emperor), make('span', 'reign-yr', r.years || ''))));
    root.appendChild(section('年号与皇帝', reigns));
    const events = make('ul', 'ev-list');
    (p.events || []).forEach((event) => {
      const text = make('span', 'ev-text');
      add(text, make('span', 'ev-era', event.era || ''), make('span', 'ev-emperor', event.emperor ? ` · ${event.emperor}` : ''), make('span', 'ev-desc', event.text));
      add(events, add(make('li'), make('span', 'ev-year', event.year), text));
    });
    root.appendChild(section('编年要事', events));
    root.appendChild(make('div', 'pv-hint', '点击地图上的城池、战役或州郡，以观其详。'));
    render(root);
  }

  function cityView(c) {
    const root = document.createDocumentFragment();
    add(root, header('城池', c.name), make('p', 'pv-summary', c.desc), backButton('‹ 返回本期概览'));
    render(root);
  }

  function battleView(b) {
    const root = document.createDocumentFragment();
    const head = header(`战役 · ${b.year} 年`, b.name, '', { kindColor: THEME.sealRed });
    const sides = make('div', 'pv-belligerents');
    add(sides, document.createTextNode(String(b.a || '')), make('span', 'vs', 'vs'), document.createTextNode(String(b.b || '')));
    head.appendChild(sides);
    const result = make('div', 'pv-result');
    add(result, make('span', 'pv-label', '战果'), document.createTextNode(` ${b.result || ''}`));
    add(root, head, make('p', 'pv-summary', b.desc), result, backButton('‹ 返回本期概览'));
    render(root);
  }

  function factionView(f) {
    const root = document.createDocumentFragment();
    const head = header('势力', f.name, f.ruler, { kindColor: f.color, titleColor: f.color });
    const capital = make('div', 'pv-result');
    add(capital, make('span', 'pv-label', '都城'), document.createTextNode(` ${f.capital || ''}`));
    add(root, head, make('p', 'pv-summary', f.desc), capital, backButton('‹ 返回本期概览'));
    render(root);
  }

  function countyChip(county) { const chip = make('span', 'county-chip', county.name); if (county.seat) chip.appendChild(make('i', '', '治')); return chip; }
  function countyGrid(reg) {
    const grid = make('div', 'county-grid');
    if (reg && Array.isArray(reg.counties) && reg.counties.length) reg.counties.forEach((county) => grid.appendChild(countyChip(county)));
    else grid.appendChild(make('span', 'pv-empty', '暂无收录'));
    return grid;
  }
  function commanderyView(feature) {
    const reg = (window.COUNTY_REGISTRY || {}).commanderies && (window.COUNTY_REGISTRY.commanderies[feature.sourceName] || null);
    const cmdName = reg ? reg.label : (feature.name || feature.sourceName);
    const root = document.createDocumentFragment();
    add(root, header('郡县', cmdName, `${feature.state || ''} · ${feature.kingdom || ''}`), make('p', 'pv-summary', reg ? '县名表列郡治与重要县，边界与坐标不表示精确测绘结果。' : '本郡县属未详。'), section('下辖县政区', countyGrid(reg)), backButton('‹ 返回本期概览'));
    render(root);
  }
  function countyView(county, commandery, reg) {
    const cmdName = reg ? reg.label : (commandery ? commandery.name : '');
    const root = document.createDocumentFragment();
    add(root, header('县政区', county.name, `${cmdName}${county.seat ? ' · 郡治' : ''}`), make('p', 'pv-summary', county.fallback ? '该点为重要城邑标注，坐标仅表示大致位置。' : '县名与治所按本期郡县表显示。'), section('同郡县政区', countyGrid(reg)), backButton('‹ 返回本期概览'));
    render(root);
  }

  function renderLegend(factions) {
    const box = document.getElementById('legend-factions'); if (!box) return;
    const fragment = document.createDocumentFragment();
    (factions || Object.values(FACTIONS)).forEach((f) => {
      const button = make('button', 'lg-item faction-filter'); button.type = 'button'; button.dataset.factionId = f.id; button.setAttribute('aria-pressed', 'false'); button.title = `点击聚焦${f.name}版图`;
      const swatch = make('span', 'lg-swatch'); swatch.style.background = MapSafeHtml.safeHex(f.color);
      add(button, swatch, make('span', '', f.name)); fragment.appendChild(button);
    });
    box.replaceChildren(fragment);
  }
  function renderCapitalLegend(factions) {
    const box = document.getElementById('legend-capitals'); if (!box) return;
    const fragment = document.createDocumentFragment();
    (factions || Object.values(FACTIONS)).filter((f) => f && f.capital).forEach((f) => {
      const row = make('div', 'lg-item capital-legend-row');
      const icon = make('span', 'lg-capital-icon'); icon.style.setProperty('--capital-color', MapSafeHtml.safeHex(f.color));
      const text = make('span'); add(text, make('b', '', f.name), make('small', '', f.capital));
      add(row, icon, text); fragment.appendChild(row);
    });
    box.replaceChildren(fragment);
  }

  function hydronymList() { return (window.HYDRONYM_AUDIT && window.HYDRONYM_AUDIT.hydronyms || []).slice().sort((a, b) => String(a.ancientName).localeCompare(String(b.ancientName), 'zh-CN')); }
  function hydronymRows(rows, query) {
    const q = String(query || '').trim().toLowerCase();
    const filtered = rows.filter((item) => !q || `${item.ancientName} ${(item.aliases || []).join(' ')}`.toLowerCase().includes(q));
    const fragment = document.createDocumentFragment();
    if (!filtered.length) { fragment.appendChild(make('span', 'pv-empty', '未检索到匹配水名')); return fragment; }
    filtered.forEach((item) => {
      const hit = item.evidence && item.evidence.status === '原文命中';
      const volumes = Array.isArray(item.sourceLocators) && item.sourceLocators.length ? item.sourceLocators.map((s) => s.replace('《水经注》卷', '')).join('/') : '未详';
      const button = make('button', readerBuild ? 'hydronym-row' : `hydronym-row ${hit ? 'is-evidenced' : 'is-pending'}`); button.type = 'button'; button.addEventListener('click', () => hydronymById(item.id));
      add(button, make('b', '', item.ancientName), make('small', '', readerBuild ? `缩放 ${item.minZoom} 级起显示` : `${hit ? '原文命中' : '待考'} · 卷${volumes}`)); fragment.appendChild(button);
    });
    return fragment;
  }
  function hydronymView(item) {
    if (!item) return;
    const aliases = Array.isArray(item.aliases) && item.aliases.length ? `（${item.aliases.join('、')}）` : '';
    const locators = Array.isArray(item.sourceLocators) && item.sourceLocators.length ? item.sourceLocators.join('、') : '未见《水经注》原文直接命中';
    const hit = item.evidence && item.evidence.status === '原文命中'; const geometry = item.geometrySource || {};
    const root = document.createDocumentFragment();
    if(readerBuild){
      add(root, header('古水名', `${item.ancientName}${aliases}`, `缩放 ${item.minZoom} 级起显示`), section('关联水系几何段', make('span', 'pv-empty', item.geometryFeatureCount != null ? `${item.geometryFeatureCount} 段` : '未登记')), backButton('‹ 水名索引', hydronymIndex), backButton('‹ 返回本期概览'));
    }else{
      add(root, header(`古水名 · ${hit ? '原文命中' : '待考'}`, `${item.ancientName}${aliases}`, `缩放 ${item.minZoom} 级起显示 · 优先级 ${item.priority}`), make('p', 'pv-summary', `《水经注》出处：${locators}。${item.evidence && item.evidence.note || ''}`), section('几何来源', make('p', 'pv-summary', `${geometry.title || '未登记'}；坐标状态：${geometry.status || '推定'}。${geometry.note || ''}`)), section('关联水系几何段', make('span', 'pv-empty', item.geometryFeatureCount != null ? `${item.geometryFeatureCount} 段` : '未登记')), backButton('‹ 水名索引', hydronymIndex), backButton('‹ 返回本期概览'));
    }
    render(root);
  }
  function hydronymById(id) { hydronymView(hydronymList().find((row) => row.id === id)); }
  function hydronymIndex() {
    const rows = hydronymList(); const root = document.createDocumentFragment();
    const list = make('div', 'hydronym-list'); list.id = 'hydronym-list'; list.appendChild(hydronymRows(rows, ''));
    const search = make('input', 'pv-search'); search.id = 'hydronym-search'; search.type = 'search'; search.placeholder = '输入古水名或异名'; search.addEventListener('input', (event) => filterHydronyms(event.target.value));
    add(root, header('古水名索引', readerBuild ? '古水名' : '《水经注》水名', `共 ${rows.length} 条 · 含大河、支流、渠与湖泊`), add(make('div', 'pv-section'), make('div', 'pv-label', '检索'), search, list), backButton('‹ 返回本期概览'));
    render(root);
  }
  function filterHydronyms(value) { const list = document.getElementById('hydronym-list'); if (list) list.replaceChildren(hydronymRows(hydronymList(), value)); }

  let _onBack = function () {};
  function setBackHandler(fn) { _onBack = fn; }
  function back() { _onBack(); }

  // Legacy marker entry points remain as aliases while all rendering stays on
  // the textContent-only view functions above.
  const api = { periodView, cityView, battleView, showCity: cityView, showBattle: battleView, factionView, commanderyView, countyView, hydronymView, hydronymIndex, hydronymById, filterHydronyms, renderLegend, renderCapitalLegend, setBackHandler, back, close };
  window.Panel = api;
  return api;
})();
