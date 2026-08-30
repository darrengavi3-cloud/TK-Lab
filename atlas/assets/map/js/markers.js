/**
 * markers.js — 标记图层：城池（常驻）+ 战役（按时期）
 *
 * 城池标记沿用自定义 divIcon，战役标记随时期切换。
 */

const Markers = (function () {
  const cityMarkers = {}; // id -> marker
  let mapRef = null;
  let cityLayer = null;
  let battleLayer = null;

  function cityIcon(isKey) {
    return L.divIcon({
      className: 'marker-city' + (isKey ? ' is-key' : ''),
      html: '<i class="mk-city"></i>',
      iconSize: [18, 18], iconAnchor: [9, 9],
    });
  }

  function battleIcon() {
    return L.divIcon({
      className: 'marker-battle',
      html: '<i class="mk-battle"></i>',
      iconSize: [22, 22], iconAnchor: [11, 11],
    });
  }

  function initCities(map, cities) {
    mapRef = map;
    cityLayer = L.layerGroup().addTo(map);
    cities.forEach((c) => {
      const m = L.marker([c.lat, c.lng], { icon: cityIcon(false) });
      m.bindTooltip(MapSafeHtml.escapeHtml(c.name), { direction: 'top', className: 'tt-city' });
      m.on('click', () => Panel.showCity(c));
      cityMarkers[c.id] = m;
      cityLayer.addLayer(m);
    });
  }

  function setActiveCities(ids) {
    Object.keys(cityMarkers).forEach((id) => {
      cityMarkers[id].setIcon(cityIcon(ids.indexOf(id) !== -1));
    });
  }

  function renderBattles(map, battles, opts) {
    opts = opts || {};
    mapRef = map;
    if (!battleLayer) battleLayer = L.layerGroup().addTo(map);
    else battleLayer.clearLayers();

    battles.forEach((b) => {
      const m = L.marker([b.lat, b.lng], { icon: battleIcon() });
      m.bindTooltip(MapSafeHtml.escapeHtml(b.name + '（' + b.year + '）'), { direction: 'top', className: 'tt-battle' });
      m.on('click', () => Panel.showBattle(b));
      battleLayer.addLayer(m);
    });
  }

  function clearBattles() { if (battleLayer) battleLayer.clearLayers(); }
  function getCityLayer() { return cityLayer; }
  function getBattleLayer() { return battleLayer; }

  return {
    initCities,
    setActiveCities,
    renderBattles,
    clearBattles,
    getCityLayer,
    getBattleLayer,
    getCityMarkers: () => cityMarkers,
  };
})();
