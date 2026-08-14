/**
 * panel.js — 信息面板与图例
 */

const Panel = (function () {
  const el = () => document.getElementById('info-panel');

  function open() { el().classList.add('is-open'); }
  function close() { el().classList.remove('is-open'); }

  function render(html) {
    el().querySelector('.panel-body').innerHTML = html;
    open();
  }

  // 计算某时期实际出现的势力列表（去重，按 WEI/SHU/WU/HAN/JIN/WARLORDS 排序）
  function periodFactions(periodId) {
    const map = PROVINCE_PERIODS[periodId] || {};
    const order = ['han', 'wei', 'shu', 'wu', 'jin', 'warlords'];
    const ids = new Set(Object.values(map));
    return order.filter((id) => ids.has(id)).map((id) => FACTIONS[id]);
  }

  function periodView(p) {
    const events = (p.events || []).map(
      (e) => `<li>
        <span class="ev-year">${e.year}</span>
        <span class="ev-text">
          <span class="ev-era">${e.era || ''}</span>
          <span class="ev-emperor">${e.emperor ? ' · ' + e.emperor : ''}</span>
          <span class="ev-desc">${e.text}</span>
        </span>
      </li>`
    ).join('');
    const reigns = (p.reigns || []).map(
      (r) => `<div class="reign-row">
        <span class="reign-era">${r.era}</span>
        <span class="reign-emp">${r.emperor}</span>
        <span class="reign-yr">${r.years || ''}</span>
      </div>`
    ).join('');
    const factions = periodFactions(p.id).map((f) => {
      return `<span class="chip" style="--c:${f.color}">${f.name}</span>`;
    }).join('');
    render(`
      <div class="pv-head">
        <div class="pv-year">${p.dynasty || ''} · ${p.year} 年</div>
        <h2 class="pv-title">${p.name}</h2>
        <div class="pv-tag">${p.tagline}</div>
      </div>
      <p class="pv-summary">${p.summary}</p>
      <div class="pv-section">
        <div class="pv-label">当世势力</div>
        <div class="pv-chips">${factions}</div>
      </div>
      <div class="pv-section">
        <div class="pv-label">年号与皇帝</div>
        <div class="pv-reigns">${reigns}</div>
      </div>
      <div class="pv-section">
        <div class="pv-label">编年要事</div>
        <ul class="ev-list">${events}</ul>
      </div>
      <div class="pv-hint">点击地图上的城池、战役或州郡，以观其详。</div>
    `);
  }

  function cityView(c) {
    render(`
      <div class="pv-head">
        <div class="pv-kind">城池</div>
        <h2 class="pv-title">${c.name}</h2>
      </div>
      <p class="pv-summary">${c.desc}</p>
      <button class="pv-back" onclick="Panel.back()">‹ 返回本期概览</button>
    `);
  }

  function battleView(b) {
    render(`
      <div class="pv-head">
        <div class="pv-kind" style="color:${THEME.sealRed}">战役 · ${b.year} 年</div>
        <h2 class="pv-title">${b.name}</h2>
        <div class="pv-belligerents">${b.a} <span class="vs">vs</span> ${b.b}</div>
      </div>
      <p class="pv-summary">${b.desc}</p>
      <div class="pv-result"><span class="pv-label">战果</span> ${b.result}</div>
      <button class="pv-back" onclick="Panel.back()">‹ 返回本期概览</button>
    `);
  }

  function factionView(f) {
    render(`
      <div class="pv-head">
        <div class="pv-kind" style="color:${f.color}">势力</div>
        <h2 class="pv-title" style="color:${f.color}">${f.name}</h2>
        <div class="pv-tag">${f.ruler}</div>
      </div>
      <p class="pv-summary">${f.desc}</p>
      <div class="pv-result"><span class="pv-label">都城</span> ${f.capital}</div>
      <button class="pv-back" onclick="Panel.back()">‹ 返回本期概览</button>
    `);
  }

  function commanderyView(feature) {
    const reg = (window.COUNTY_REGISTRY || {}).commanderies && (window.COUNTY_REGISTRY.commanderies[feature.sourceName] || null);
    const cmdName = reg ? reg.label : (feature.name || feature.sourceName);
    const countyChips = reg
      ? reg.counties.map((c) => `<span class="county-chip">${c.name}${c.seat ? '<i>治</i>' : ''}</span>`).join('')
      : '';
    render(`
      <div class="pv-head">
        <div class="pv-kind">郡县</div>
        <h2 class="pv-title">${cmdName}</h2>
        <div class="pv-tag">${feature.state || ''} · ${feature.kingdom || ''}</div>
      </div>
      <p class="pv-summary">${reg ? '县名表列郡治与重要县，边界与坐标不表示精确测绘结果。' : '本郡县属未详。'}</p>
      <div class="pv-section">
        <div class="pv-label">下辖县政区</div>
        <div class="county-grid">${countyChips || '<span class="pv-empty">暂无收录</span>'}</div>
      </div>
      <button class="pv-back" onclick="Panel.back()">‹ 返回本期概览</button>
    `);
  }

  function countyView(county, commandery, reg) {
    const cmdName = reg ? reg.label : (commandery ? commandery.name : '');
    const searchText = county.name + (cmdName ? ' ' + cmdName : '');
    render(`
      <div class="pv-head">
        <div class="pv-kind">县政区</div>
        <h2 class="pv-title">${county.name}</h2>
        <div class="pv-tag">${cmdName}${county.seat ? ' · 郡治' : ''}</div>
      </div>
      <p class="pv-summary">${county.fallback ? '该点为重要城邑标注，坐标仅表示大致位置。' : '县名与治所按本期郡县表显示。'}</p>
      <div class="pv-section">
        <div class="pv-label">同郡县政区</div>
        <div class="county-grid">${reg ? reg.counties.map((c) => `<span class="county-chip">${c.name}${c.seat ? '<i>治</i>' : ''}</span>`).join('') : ''}</div>
      </div>
      <button class="pv-back" onclick="Panel.back()">‹ 返回本期概览</button>
    `);
  }

  // 图例：按当前时期实际出场的势力动态渲染
  function renderLegend(factions) {
    const box = document.getElementById('legend-factions');
    if (!box) return;
    const list = factions || Object.values(FACTIONS);
    box.innerHTML = list.map(
      (f) => `<button type="button" class="lg-item faction-filter" data-faction-id="${f.id}" aria-pressed="false" title="点击聚焦${f.name}版图"><span class="lg-swatch" style="background:${f.color}"></span><span>${f.name}</span></button>`
    ).join('');
  }

  function renderCapitalLegend(factions) {
    const box = document.getElementById('legend-capitals');
    if (!box) return;
    const list = (factions || Object.values(FACTIONS)).filter((f) => f && f.capital);
    box.innerHTML = list.map((f) => `<div class="lg-item capital-legend-row"><span class="lg-capital-icon" style="--capital-color:${f.color}"></span><span><b>${f.name}</b><small>${f.capital}</small></span></div>`).join('');
  }

  function hydronymList() {
    return (window.HYDRONYM_AUDIT && window.HYDRONYM_AUDIT.hydronyms || [])
      .slice()
      .sort((a, b) => String(a.ancientName).localeCompare(String(b.ancientName), 'zh-CN'));
  }

  function hydronymRows(rows, query) {
    const q = String(query || '').trim().toLowerCase();
    const filtered = rows.filter((item) => !q || (item.ancientName + ' ' + (item.aliases || []).join(' ')).toLowerCase().includes(q));
    if (!filtered.length) return '<span class="pv-empty">未检索到匹配水名</span>';
    return filtered.map((item) => {
      const hit = item.evidence && item.evidence.status === '原文命中';
      const volumes = Array.isArray(item.sourceLocators) && item.sourceLocators.length
        ? item.sourceLocators.map((s) => s.replace('《水经注》卷', '')).join('/')
        : '未详';
      return `<button type="button" class="hydronym-row ${hit ? 'is-evidenced' : 'is-pending'}" onclick="Panel.hydronymById('${item.id}')"><b>${item.ancientName}</b><small>${hit ? '原文命中' : '待考'} · 卷${volumes}</small></button>`;
    }).join('');
  }

  function hydronymView(item) {
    if (!item) return;
    const aliases = Array.isArray(item.aliases) && item.aliases.length ? '（' + item.aliases.join('、') + '）' : '';
    const locators = Array.isArray(item.sourceLocators) && item.sourceLocators.length ? item.sourceLocators.join('、') : '未见《水经注》原文直接命中';
    const hit = item.evidence && item.evidence.status === '原文命中';
    const geometry = item.geometrySource || {};
    render(`
      <div class="pv-head">
        <div class="pv-kind">古水名 · ${hit ? '原文命中' : '待考'}</div>
        <h2 class="pv-title">${item.ancientName}${aliases}</h2>
        <div class="pv-tag">缩放 ${item.minZoom} 级起显示 · 优先级 ${item.priority}</div>
      </div>
      <p class="pv-summary">《水经注》出处：${locators}。${item.evidence && item.evidence.note || ''}</p>
      <div class="pv-section"><div class="pv-label">几何来源</div><p class="pv-summary">${geometry.title || '未登记'}；坐标状态：${geometry.status || '推定'}。${geometry.note || ''}</p></div>
      <div class="pv-section"><div class="pv-label">关联水系几何段</div><span class="pv-empty">${item.geometryFeatureCount != null ? item.geometryFeatureCount + ' 段' : '未登记'}</span></div>
      <button class="pv-back" onclick="Panel.hydronymIndex()">‹ 水名索引</button>
      <button class="pv-back" onclick="Panel.back()">‹ 返回本期概览</button>
    `);
  }

  function hydronymById(id) {
    const item = hydronymList().find((row) => row.id === id);
    hydronymView(item);
  }

  function hydronymIndex() {
    const rows = hydronymList();
    render(`
      <div class="pv-head">
        <div class="pv-kind">古水名索引</div>
        <h2 class="pv-title">《水经注》水名</h2>
        <div class="pv-tag">共 ${rows.length} 条 · 含大河、支流、渠与湖泊</div>
      </div>
      <div class="pv-section">
        <div class="pv-label">检索</div>
        <input id="hydronym-search" class="pv-search" type="search" placeholder="输入古水名或异名" oninput="Panel.filterHydronyms(this.value)">
        <div id="hydronym-list" class="hydronym-list">${hydronymRows(rows, '')}</div>
      </div>
      <button class="pv-back" onclick="Panel.back()">‹ 返回本期概览</button>
    `);
  }

  function filterHydronyms(value) {
    const list = document.getElementById('hydronym-list');
    if (list) list.innerHTML = hydronymRows(hydronymList(), value);
  }

  let _onBack = function () {};
  function setBackHandler(fn) { _onBack = fn; }
  function back() { _onBack(); }

  const api = {
    periodView, cityView, battleView, factionView, commanderyView, countyView,
    hydronymView, hydronymIndex, hydronymById, filterHydronyms,
    renderLegend, renderCapitalLegend, setBackHandler, back, close,
  };
  window.Panel = api;
  return api;
})();
