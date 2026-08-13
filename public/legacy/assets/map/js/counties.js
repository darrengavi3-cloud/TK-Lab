/**
 * counties.js — 县政区图层
 *
 * 依据 COUNTY_REGISTRY 把已知县治与重要县标注到郡界之上；
 * 数据源为维基百科郡县索引，坐标只覆盖郡治与重要县。
 */
const Counties = (function () {
  let mapRef = null;
  let layer = null;
  let entries = [];
  let labelsVisible = true;

  const registry = window.COUNTY_REGISTRY || { commanderies: {}, cityFallbacks: [] };

  function wikiSearchUrl(text) {
    return 'https://zh.wikipedia.org/w/index.php?search=' + encodeURIComponent(text || '');
  }

  function makeMarker(county, commandery, reg) {
    const pos = county.pos || (Number.isFinite(county.lat) && Number.isFinite(county.lng) ? [county.lat, county.lng] : null);
    if (!pos || pos.length < 2) return null;
    const label = commandery ? (reg ? reg.label : commandery.name) : '';
    const marker = L.marker(pos, {
      icon: L.divIcon({
        className: 'county-label' + (county.seat ? ' county-seat' : ''),
        html: `<span>${county.name}</span>`,
        iconSize: [54, 16],
        iconAnchor: [27, 8],
      }),
      interactive: true,
    });
    marker.bindTooltip(`${county.name} · ${label}`, { sticky: true, className: 'tt-county' });
    marker.on('click', () => {
      if (window.Panel && Panel.countyView) Panel.countyView(county, commandery, reg);
    });
    return marker;
  }

  function render(map, data, opts) {
    if (!map || !data) return;
    const bySource = {};
    data.forEach((feature) => { bySource[feature.sourceName] = feature; });
    const incoming = L.layerGroup();
    entries = [];

    Object.keys(registry.commanderies || {}).forEach((sourceName) => {
      const reg = registry.commanderies[sourceName];
      const commandery = bySource[sourceName];
      if (!commandery) return;
      (reg.counties || []).forEach((county) => {
        const marker = makeMarker(county, commandery, reg);
        if (marker) {
          incoming.addLayer(marker);
          entries.push({ marker, county, commandery, reg });
        }
      });
    });

    (registry.cityFallbacks || []).forEach((item) => {
      const commandery = bySource[item.sourceName];
      if (!commandery) return;
      const marker = makeMarker({ name: item.name, pos: item.pos, seat: false, fallback: true }, commandery, null);
      if (marker) {
        incoming.addLayer(marker);
        entries.push({ marker, county: { name: item.name, pos: item.pos }, commandery, reg: null });
      }
    });

    if (layer && map.hasLayer(layer)) map.removeLayer(layer);
    incoming.addTo(map);
    layer = incoming;
    setLabelsVisible(labelsVisible);
    if (window.__scheduleLabelLayout) window.__scheduleLabelLayout();
  }

  function setLabelsVisible(value) {
    labelsVisible = value !== false;
    entries.forEach((entry) => {
      const el = entry.marker && entry.marker.getElement && entry.marker.getElement();
      if (el) el.style.display = labelsVisible ? '' : 'none';
    });
  }

  function hide() {
    if (layer && mapRef && mapRef.hasLayer(layer)) mapRef.removeLayer(layer);
    layer = null;
  }

  function init(map) { mapRef = map; }

  return { init, render, hide, setLabelsVisible, wikiSearchUrl };
})();
window.Counties = Counties;
