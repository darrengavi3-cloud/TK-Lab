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
      ? reg.counties.map((c) => `<a class="county-chip" target="_blank" rel="noopener" href="${Counties.wikiSearchUrl(c.name + (reg ? ' ' + reg.label : ''))}">${c.name}${c.seat ? '<i>治</i>' : ''}</a>`).join('')
      : '';
    render(`
      <div class="pv-head">
        <div class="pv-kind">郡县</div>
        <h2 class="pv-title">${cmdName}</h2>
        <div class="pv-tag">${feature.state || ''} · ${feature.kingdom || ''}</div>
      </div>
      <p class="pv-summary">${reg ? '县名索引依据维基百科及郡县沿革资料整理；坐标仅标注郡治与重要县。' : '本郡暂未收入县名单，可通过维基百科检索郡名获取县属。'}</p>
      <div class="pv-section">
        <div class="pv-label">下辖县政区</div>
        <div class="county-grid">${countyChips || '<span class="pv-empty">暂无收录</span>'}</div>
      </div>
      <a class="pv-link" target="_blank" rel="noopener" href="${reg ? reg.url : Counties.wikiSearchUrl(cmdName)}">维基百科检索 · ${cmdName}</a>
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
      <p class="pv-summary">${county.fallback ? '该点为地图重要城邑回退标注，坐标仅供参考。' : '县名与治所信息依据维基百科及郡县沿革资料整理。'}</p>
      <div class="pv-section">
        <div class="pv-label">同郡县政区</div>
        <div class="county-grid">${reg ? reg.counties.map((c) => `<a class="county-chip" target="_blank" rel="noopener" href="${Counties.wikiSearchUrl(c.name + ' ' + reg.label)}">${c.name}${c.seat ? '<i>治</i>' : ''}</a>`).join('') : ''}</div>
      </div>
      <a class="pv-link" target="_blank" rel="noopener" href="${Counties.wikiSearchUrl(searchText)}">维基百科检索 · ${county.name}</a>
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

  let _onBack = function () {};
  function setBackHandler(fn) { _onBack = fn; }
  function back() { _onBack(); }

  const api = {
    periodView, cityView, battleView, factionView, commanderyView, countyView,
    renderLegend, setBackHandler, back, close,
  };
  window.Panel = api;
  return api;
})();
