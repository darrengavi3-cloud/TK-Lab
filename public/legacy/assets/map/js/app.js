/**
 * app.js — 应用编排：初始化地图与图层，串联时间轴、面板与渲染
 *
 * 关键设计：
 *   · 州界数据按时期动态加载（early / late），避免一次性载入两套边界；
 *   · 184–200 年使用合并版荆州/扬州；208–263 年使用拆分版，以呈现魏吴分治。
 */

(function () {
  const DATA = window.THREE_KINGDOMS;
  let map;

  // 图层可见性状态
  const view = {
    terr:true, city:true, battle:true, route:true, water:true, tint:true, wuCmd:true,
    provinceTint:true, frontierRoute:true, battlefield:true,
    cmdLabel:true, county:true, minorities:true,
    displayMode:'research',
  };
  const mapFilters = window.__MAP_FILTERS || (window.__MAP_FILTERS = {faction:'all',state:'all'});
  window.__MAP_DISPLAY_MODE = view.displayMode;

  // 州界 / 郡界数据缓存
  const provinceCache = {};
  let wuCmdLoaded = false;
  let jinCmdLoaded = false;
  let shuCmdLoaded = false;
  let cmdLoaded = false;

  function initMap() {
    map = L.map('map', {
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      maxBounds: MAP_CONFIG.maxBounds,
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.25,
    });
    L.control.zoom({ position: 'topleft' }).addTo(map);
    window.__HISTORY_MAP_INSTANCE = map;
    if (window.HistoryMapBridge) window.HistoryMapBridge.setMap(map);
  }

  // 动态加载 geo-provinces-{source}.js
  function loadProvinces(source) {
    if (provinceCache[source]) return Promise.resolve(provinceCache[source]);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'data/geo-provinces-' + source + '.js';
      script.onload = () => {
        provinceCache[source] = window.GEO_PROVINCES || [];
        resolve(provinceCache[source]);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 动态加载孙吴 263 年郡界（仅 guijin 时期使用）
  function loadWuCommanderies() {
    if (wuCmdLoaded) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'data/geo-wu-commanderies-263.js';
      script.onload = () => { wuCmdLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 动态加载晋朝郡界（仅 taikang 时期使用）
  function loadJinCommanderies() {
    if (jinCmdLoaded) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'data/geo-commanderies-jin.js';
      script.onload = () => { jinCmdLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 动态加载季汉郡界（仅 sanguo / beifa 时期使用）
  function loadShuCommanderies() {
    if (shuCmdLoaded) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'data/geo-shu-commanderies.js';
      script.onload = () => { shuCmdLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 动态加载东汉全部郡界（220 年前各时期使用）
  function loadCommanderies() {
    if (cmdLoaded) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'data/geo-commanderies.js';
      script.onload = () => { cmdLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 计算某时期实际出现的势力列表（按固定顺序）
  function periodFactions(periodId) {
    const def = PROVINCE_PERIODS[periodId] || {};
    const mapping = def.provinces || {};
    const order = ['han', 'huangjin', 'dongzhuo', 'liguo', 'hanfu', 'yuan_shao', 'kongzhou', 'liudai',
                   'zhangmiao', 'qiaomao', 'baoxin', 'wangkuang', 'zhangchao', 'yuanyi',
                   'lianjun', 'lubu', 'caocao', 'liubiao', 'liuzhang', 'liubei', 'sunquan', 'gongsunzan', 'gongsundu', 'liangzhou', 'hansui', 'mateng', 'shikie',
                   'wei', 'shu', 'wu', 'jin', 'hantuo', 'shile', 'sunce'];
    const ids = new Set(Object.values(mapping));
    const audited = window.POLITICAL_SNAPSHOT_AUDIT && window.POLITICAL_SNAPSHOT_AUDIT[periodId];
    Object.values(audited && audited.commanderyFactions || {}).forEach((id) => ids.add(id));
    (audited && audited.annotations || []).forEach((item) => ids.add(item.faction));
    (audited && audited.expected || []).forEach((id) => ids.add(id));
    return order.filter((id) => ids.has(id)).map((id) => FACTIONS[id]);
  }

  function filterStatusText(){
    const faction=mapFilters.faction==='all'?'全部势力':(FACTIONS[mapFilters.faction]?.name||mapFilters.faction);
    const state=mapFilters.state==='all'?'全部州':mapFilters.state;
    const mode=view.displayMode==='administrative'?'行政层':'研究示意';
    return `${mode} · ${faction} · ${state}`;
  }

  function syncMapFilterControls(){
    const stateSelect=document.getElementById('map-state-filter');
    if(stateSelect) stateSelect.value=mapFilters.state||'all';
    document.querySelectorAll('[data-faction-id]').forEach((item)=>{
      const active=(item.getAttribute('data-faction-id')||'')===(mapFilters.faction||'all');
      item.classList.toggle('active',active);
      item.setAttribute('aria-pressed',active?'true':'false');
    });
    const status=document.getElementById('map-filter-status');
    if(status) status.textContent=filterStatusText();
  }

  function applyMapFilters(){
    if(Territories.setFilters) Territories.setFilters(mapFilters);
    if(Commanderies.setFilters) Commanderies.setFilters(mapFilters);
    if(WuCommanderies.setFilters) WuCommanderies.setFilters(mapFilters);
    syncMapFilterControls();
  }

  function updateStateFilterOptions(features){
    const select=document.getElementById('map-state-filter');
    if(!select) return;
    const names=Array.from(new Set((features||[]).map((feature)=>feature.name).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'zh-CN'));
    const previous=mapFilters.state;
    select.innerHTML='<option value="all">全部州</option>'+names.map((name)=>`<option value="${name}">${name}</option>`).join('');
    if(previous!=='all'&&!names.includes(previous)) mapFilters.state='all';
    select.value=mapFilters.state||'all';
  }

  function setDisplayMode(mode){
    view.displayMode=mode==='administrative'?'administrative':'research';
    window.__MAP_DISPLAY_MODE=view.displayMode;
    goToPeriod(Timeline.getCurrent(),{animate:false});
    syncMapFilterControls();
  }

  function clearMapFilters(){
    mapFilters.faction='all';
    mapFilters.state='all';
    applyMapFilters();
  }

  // 切换时期：先确保对应州界数据加载，再更新图层
  function goToPeriod(i, opts) {
    opts = opts || {};
    const p = DATA.periods[i];
    if (!p) return;
    window.__activeMapPeriodId = p.id;
    p.__index = i;
    if (window.HistoryMapBridge) window.HistoryMapBridge.setPeriod(p);

    const def = PROVINCE_PERIODS[p.id] || {};
    const source = def.dataSource || 'late';

    loadProvinces(source).then((features) => {
      updateStateFilterOptions(features);
      if (view.terr) Territories.render(map, features, def.provinces, opts);
      else Territories.hide();

      const battleList = (p.battles || [])
        .map((id) => DATA.battles.find((b) => b.id === id))
        .filter(Boolean);
      if (view.battle) Markers.renderBattles(map, battleList, opts);
      else Markers.clearBattles();

      if (view.route) Routes.render(map, p.routes || [], opts);
      else Routes.hide();

      // 行政层只保留边界与郡州层；边界通道属于研究示意，不混入行政疆域。
      StrategicLayers.setRoutesVisible(map, view.frontierRoute && view.displayMode === 'research', p.year);
      StrategicLayers.setBattlefieldsVisible(map, view.battlefield, p.year);
      StrategicLayers.setMinoritiesVisible(map, view.minorities && view.displayMode === 'research', p.year);

      // 郡级边界：
      //   · 220 年前（东汉）显示全部郡界，统一为汉色；
      //   · sanguo / beifa 显示汉的郡级边界；
      //   · guijin / hanwang / jinchu 显示全境郡色，避免只绘吴郡造成巴郡、巴西等空白；
      //   · taikang 显示晋朝 148 郡。
      const preSanguoIds = ['huangjin', 'shaodi', 'dongzhuo', 'xingping', 'jianbing', 'guandu', 'chibi', 'xiangfan'];
      const fullCommanderyIds = ['guijin', 'hanwang', 'jinchu', 'hui_di', 'yongjia'];
      if (fullCommanderyIds.includes(p.id)) {
        loadCommanderies().then(() => {
          if (view.wuCmd) {
            const periodData = window.__HISTORY_GEO_DATA?.commanderyByPeriod?.[p.id] || [];
            Commanderies.render(map, periodData, opts);
          } else { WuCommanderies.hide(); Commanderies.hide(); }
        });
      } else if (p.id === 'taikang') {
        loadJinCommanderies().then(() => {
          if (view.wuCmd) Commanderies.render(map, window.GEO_COMMANDERIES_JIN, opts);
          else { WuCommanderies.hide(); Commanderies.hide(); }
        });
      } else if (p.id === 'sanguo' || p.id === 'beifa' || preSanguoIds.includes(p.id)) {
        loadCommanderies().then(() => {
          if (view.wuCmd) {
            const periodData = window.__HISTORY_GEO_DATA?.commanderyByPeriod?.[p.id] || window.GEO_COMMANDERIES || [];
            const political = window.POLITICAL_SNAPSHOT_AUDIT?.[p.id] || {};
            const commanderyFactions = political.commanderyFactions || {};
            const stateKeys = {'司隶':'sili','司州':'sili','并州':'bingzhou','冀州':'jizhou','兖州':'yanzhou','豫州':'yuzhou','青州':'qingzhou','徐州':'xuzhou','扬州':'yangzhou','荆州':'jingzhou','益州':'yizhou','梁州':'liang_state','凉州':'liangzhou','雍州':'yongzhou','秦州':'qinzhou','幽州':'youzhou','平州':'pingzhou','交州':'jiaozhou','广州':'guangzhou','宁州':'ningzhou'};
            const sourceProvinceKeys = {'Bingzhou':'bingzhou','Jiaozhou':'jiaozhou','Jizhou':'jizhou','Liangzhou':'liangzhou','Qingzhou':'qingzhou','Sili':'sili','Xuzhou':'xuzhou','Yanzhou':'yanzhou','Youzhou':'youzhou','Yuzhou':'yuzhou','Yongzhou':'yongzhou','Jingzhou (Wei)':'jing_wei','Jingzhou (Wu)':'jing_wu','Yangzhou (Wei)':'yang_wei','Yangzhou (Wu)':'yang_wu','Yizhou (North)':'yizhou','Yizhou (South)':'yizhou'};
            const displayData = periodData.map((c) => ({
              ...c,
              kingdom: commanderyFactions[c.sourceName]
                || (preSanguoIds.includes(p.id) ? (def.provinces[sourceProvinceKeys[c.sourceProvince]] || def.provinces[stateKeys[c.state]] || 'han') : c.kingdom),
            }));
            Commanderies.render(map, displayData, opts);
          } else { WuCommanderies.hide(); Commanderies.hide(); }
        });
      } else {
        WuCommanderies.hide();
        Commanderies.hide();
      }

      // 县政区点层：按当前时期实际存在的郡过滤 COUNTY_REGISTRY
      if (view.county && Counties && Counties.render) {
        const periodData = window.__HISTORY_GEO_DATA?.commanderyByPeriod?.[p.id] || window.GEO_COMMANDERIES || [];
        Counties.render(map, periodData, opts);
      } else if (Counties && Counties.hide) {
        Counties.hide();
      }

      Markers.setActiveCities(p.cities || []);
      Panel.renderLegend(periodFactions(p.id));
      applyMapFilters();
      Panel.periodView(p);

      if (opts.animate) map.flyTo(p.focus, p.zoom, { duration: 1.1 });
      else map.setView(p.focus, p.zoom, { animate: false });
    }).catch((err) => {
      console.error('加载州界数据失败:', err);
    });
  }

  // 切换常驻图层（城池、水系、古韵滤镜）
  function applyStaticLayers() {
    const cityLayer = Markers.getCityLayer();
    if (view.city) { if (!map.hasLayer(cityLayer)) map.addLayer(cityLayer); }
    else map.removeLayer(cityLayer);

    BaseLayer.setWaterVisible(map, view.water);
    BaseLayer.setTint(map, view.tint);
  }

  function bindLayerToggles() {
    // 底图切换（单选）
    document.querySelectorAll('input[name="basemap"]').forEach((r) => {
      r.addEventListener('change', () => { if (r.checked) BaseLayer.setBase(map, r.value); });
    });

    // 图层显隐（多选）
    const mapDef = {
      'lyr-terr': 'terr', 'lyr-city': 'city', 'lyr-btl': 'battle',
      'lyr-route': 'route', 'lyr-water': 'water', 'lyr-tint': 'tint',
      'lyr-wu-cmd': 'wuCmd', 'lyr-province-tint':'provinceTint',
      'lyr-frontier-route':'frontierRoute', 'lyr-battlefield':'battlefield',
      'lyr-cmd-label':'cmdLabel', 'lyr-county':'county', 'lyr-minorities':'minorities',
    };
    Object.keys(mapDef).forEach((id) => {
      const box = document.getElementById(id);
      if (!box) return;
      box.addEventListener('change', () => {
        view[mapDef[id]] = box.checked;
        if (mapDef[id] === 'provinceTint') window.__provinceTintEnabled = box.checked;
        if (mapDef[id] === 'cmdLabel') {
          if (Commanderies.setLabelsVisible) Commanderies.setLabelsVisible(box.checked);
          if (WuCommanderies.setLabelsVisible) WuCommanderies.setLabelsVisible(box.checked);
          return;
        }
        if (mapDef[id] === 'county') {
          if (view.county) goToPeriod(Timeline.getCurrent(), { animate: false });
          else if (Counties.hide) Counties.hide();
          return;
        }
        if (mapDef[id] === 'minorities') {
          const period = DATA.periods[Timeline.getCurrent()];
          StrategicLayers.setMinoritiesVisible(map, view.minorities && view.displayMode === 'research', period && period.year);
          return;
        }
        if (['terr','battle','route','wuCmd','provinceTint','frontierRoute','battlefield'].includes(mapDef[id])) {
          goToPeriod(Timeline.getCurrent(), { animate: false });
        } else {
          applyStaticLayers();
        }
      });
    });

    document.querySelectorAll('input[name="map-display-mode"]').forEach((radio)=>{
      radio.addEventListener('change',()=>{if(radio.checked)setDisplayMode(radio.value);});
    });
    const stateFilter=document.getElementById('map-state-filter');
    if(stateFilter) stateFilter.addEventListener('change',()=>{mapFilters.state=stateFilter.value||'all';applyMapFilters();});
    const legend=document.getElementById('legend-factions');
    if(legend) legend.addEventListener('click',(event)=>{
      const item=event.target.closest('[data-faction-id]');
      if(!item) return;
      const id=item.getAttribute('data-faction-id');
      mapFilters.faction=mapFilters.faction===id?'all':id;
      applyMapFilters();
    });
    const clearButton=document.getElementById('map-clear-filter');
    if(clearButton) clearButton.addEventListener('click',clearMapFilters);
    syncMapFilterControls();

    // 移动端：图层面板开关
    const layersToggle = document.getElementById('layers-toggle');
    const sidebox = document.getElementById('sidebox');
    if (layersToggle && sidebox) {
      layersToggle.addEventListener('click', () => {
        sidebox.classList.toggle('is-open');
        layersToggle.classList.toggle('is-active');
      });
      sidebox.addEventListener('click', (e) => {
        if (e.target === sidebox) {
          sidebox.classList.remove('is-open');
          layersToggle.classList.remove('is-active');
        }
      });
    }

    // 左右信息面板折叠
    const sideboxCollapse = document.getElementById('sidebox-collapse');
    if (sideboxCollapse && sidebox) {
      sideboxCollapse.addEventListener('click', () => {
        sidebox.classList.toggle('is-collapsed');
      });
    }
    const infoPanel = document.getElementById('info-panel');
    const infoCollapse = document.getElementById('info-collapse');
    if (infoCollapse && infoPanel) {
      infoCollapse.addEventListener('click', () => {
        infoPanel.classList.toggle('is-collapsed');
      });
    }
  }

  // 夷洲轮廓与标签：独立常驻图层，不随任何图层开关或时期切换消失。
  function initYizhouLabel() {
    const y = window.YIZHOU_LABEL;
    if (!y || !y.pos) return;
    const permanentLayer = L.layerGroup();
    const notifyYizhou = () => {
      try {
        window.parent.postMessage({
          type:'sgz-map-selection', level:'special', name:y.name, state:'夷洲', sourceName:'YizhouIsland',
          polity:'吴', periodId:window.__activeMapPeriodId, year:window.PROVINCE_PERIODS?.[window.__activeMapPeriodId]?.year,
        }, '*');
      } catch (_) {}
    };
    if (Array.isArray(y.outline) && y.outline.length >= 3) {
      L.polygon(y.outline, {
        className:'yizhou-island-outline',color:'#3F7652',weight:1.45,opacity:.86,
        fill:true,fillColor:'#7FA38A',fillOpacity:.20,interactive:true,
      }).bindTooltip(y.name, {sticky:true,className:'tt-yizhou'})
        .on('click', () => { notifyYizhou(); Panel.factionView({
          id:'yizhou',name:y.name,color:'#4a7c59',ruler:'山夷',capital:y.name,desc:y.desc,
        }); }).addTo(permanentLayer);
    }
    L.marker(y.pos, {
      icon: L.divIcon({
        className: 'yizhou-label',
        html: `<span>${y.name}</span>`,
        iconSize: [64, 22],
        iconAnchor: [32, 11],
      }),
      interactive: true,
    }).bindTooltip(y.name, { sticky: true, className: 'tt-yizhou' })
      .on('click', () => { notifyYizhou(); Panel.factionView({
        id: 'yizhou', name: y.name, color: '#4a7c59',
        ruler: '山夷', capital: y.name,
        desc: y.desc,
      }); }).addTo(permanentLayer);
    permanentLayer.addTo(map);
    window.__YIZHOU_PERMANENT_LAYER = permanentLayer;
  }

  function init() {
    initMap();
    BaseLayer.init(map);
    Territories.init(map);
    WuCommanderies.init(map);
    Commanderies.init(map);
    Markers.initCities(map, DATA.cities);
    initYizhouLabel();
    Panel.setBackHandler(() => goToPeriod(Timeline.getCurrent(), { animate: false }));

    Timeline.init(DATA.periods, (i, opts) => goToPeriod(i, opts));
    bindLayerToggles();

    // 根据缩放级别动态调整国号大字等文字大小
    function updateZoomClasses() {
      const app = document.getElementById('app');
      if (!app) return;
      const z = map.getZoom();
      app.classList.toggle('zoom-lte-5', z <= 5);
      app.classList.toggle('zoom-lte-4', z <= 4);
      app.classList.toggle('zoom-lte-3', z <= 3);
      app.classList.toggle('zoom-gte-7', z >= 7);
      app.classList.toggle('zoom-gte-8', z >= 8);
    }
    map.on('zoomend', updateZoomClasses);
    updateZoomClasses();

    // 初始载入第一个时期
    goToPeriod(0, { animate: false });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
