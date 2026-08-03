/**
 * commanderies.js — 通用郡级边界图层
 *
 * 支持任意 GEO_COMMANDERIES_* 数组，按 feature.kingdom 取色，
 * 显示郡名标签与悬停提示。用于晋朝统一等需要呈现郡界的时期。
 */

const Commanderies = (function () {
  let mapRef = null;
  let layer = null;
  let entries = [];
  let labelsVisible = true;

  function factionColor(kingdom) {
    const f = FACTIONS[kingdom];
    return f ? f.color : '#5c5348';
  }

  function makePolygon(feature) {
    const geom = feature.geometry;
    let latlngs;
    if (geom.type === 'Polygon') {
      latlngs = geom.coordinates.map((ring) => ring.map((pt) => [pt[1], pt[0]]));
    } else if (geom.type === 'MultiPolygon') {
      latlngs = geom.coordinates.map((poly) =>
        poly.map((ring) => ring.map((pt) => [pt[1], pt[0]]))
      );
    } else {
      latlngs = [];
    }
    const color = feature.color || factionColor(feature.kingdom);
    return L.polygon(latlngs, {
      color: '#4a3b2e', weight: 0.7, opacity: 0.65,
      fillColor: color, fillOpacity: 0.14, className: 'wu-commandery',
    });
  }

  function labelName(name) {
    const base = String(name || '').replace(/郡$/, '');
    return base.length <= 1 ? base + '郡' : base;
  }

  function labelPosition(feature) {
    if (Array.isArray(feature.label) && feature.label.length >= 2) return feature.label;
    const points = [];
    const geometry = feature.geometry || {};
    const visit = (value) => {
      if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number') {
        points.push(value);
        return;
      }
      if (Array.isArray(value)) value.forEach(visit);
    };
    visit(geometry.coordinates);
    if (!points.length) return null;
    const center = points.reduce((sum, point) => [sum[0] + point[1], sum[1] + point[0]], [0, 0]);
    return [center[0] / points.length, center[1] / points.length];
  }

  function makeLabel(feature) {
    const pos = labelPosition(feature);
    if (!pos) return null;
    const marker=L.marker(pos, {
      icon: L.divIcon({
        className: 'cmd-label',
        html: `<span>${labelName(feature.name)}</span>`,
        iconSize: [60, 16],
        iconAnchor: [30, 8],
      }),
      interactive: false,
    });
    marker.__stateName=feature.state;
    return marker;
  }

  function matches(entry){
    const filters=window.__MAP_FILTERS||{};
    return (filters.faction||'all')==='all'||entry.feature.kingdom===filters.faction
      ? ((filters.state||'all')==='all'||entry.feature.state===filters.state)
      : false;
  }
  function setMarkerVisible(marker,visible){const element=marker&&marker.getElement&&marker.getElement();if(element)element.style.display=visible?'':'none';}
  function applyFilters(){
    entries.forEach((entry)=>{
      const visible=matches(entry);
      if(entry.polygon&&entry.polygon.setStyle){
        if(visible){if(entry.hidden){entry.polygon.setStyle(entry.hiddenStyle||entry.baseStyle);entry.hidden=false;}}
        else {if(!entry.hidden){entry.hiddenStyle={color:entry.polygon.options.color,weight:entry.polygon.options.weight,opacity:entry.polygon.options.opacity,fillColor:entry.polygon.options.fillColor,fillOpacity:entry.polygon.options.fillOpacity};entry.hidden=true;}entry.polygon.setStyle({opacity:0,fillOpacity:0});}
      }
      setMarkerVisible(entry.label,visible && labelsVisible);
    });
    if(entries.some(entry=>entry.label&&entry.label.getElement&&!entry.label.getElement()))requestAnimationFrame(applyFilters);
  }

  function render(map, data, opts) {
    opts = opts || {};
    if (!data || !data.length) return;

    const incoming = L.layerGroup();
    entries=[];
    if (window.HistoryMapBridge) window.HistoryMapBridge.clear('commandery');
    data.forEach((feature) => {
      const poly = makePolygon(feature);
      const state = feature.state || '';
      const owner = FACTIONS[feature.kingdom] && FACTIONS[feature.kingdom].name;
      const tip = [state, feature.name, owner].filter(Boolean).join(' · ');
      poly.bindTooltip(tip, { sticky: true, className: 'tt-cmd' });
      poly.on('click', () => {
        if (window.Panel && Panel.commanderyView) Panel.commanderyView(feature);
      });
      if (window.HistoryMapBridge) window.HistoryMapBridge.register('commandery', feature, poly, feature.kingdom);
      incoming.addLayer(poly);

      const label = makeLabel(feature);
      if (label) incoming.addLayer(label);
      entries.push({feature,polygon:poly,label,baseStyle:{color:poly.options.color,weight:poly.options.weight,opacity:poly.options.opacity,fillColor:poly.options.fillColor,fillOpacity:poly.options.fillOpacity}});

      if (opts.animate) {
        poly.setStyle({ fillOpacity: 0, opacity: 0 });
        const target = { fillOpacity: 0.14, opacity: 0.65 };
        const start = { fillOpacity: 0, opacity: 0 };
        const t0 = performance.now();
        function step(t) {
          const k = Math.min(1, (t - t0) / 650);
          const e = 1 - Math.pow(1 - k, 3);
          poly.setStyle({
            fillOpacity: start.fillOpacity + (target.fillOpacity - start.fillOpacity) * e,
            opacity: start.opacity + (target.opacity - start.opacity) * e,
          });
          if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
    });

    if (layer) {
      if (opts.animate) {
        const old = layer;
        old.eachLayer((l) => { if (l.setStyle) l.setStyle({ fillOpacity: 0, opacity: 0 }); });
        setTimeout(() => { if (map.hasLayer(old)) map.removeLayer(old); }, 450);
      } else {
        map.removeLayer(layer);
      }
    }
    incoming.addTo(map);
    layer = incoming;
    applyFilters();
  }

  function hide() {
    if (layer && mapRef) {
      mapRef.removeLayer(layer);
      layer = null;
    }
  }

  function init(map) { mapRef = map; }

  function setLabelsVisible(value) {
    labelsVisible = value !== false;
    entries.forEach((entry) => setMarkerVisible(entry.label, labelsVisible && matches(entry)));
  }

  return { init, render, hide, setFilters:applyFilters, setLabelsVisible };
})();
