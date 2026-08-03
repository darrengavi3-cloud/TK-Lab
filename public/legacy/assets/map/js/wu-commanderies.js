/**
 * wu-commanderies.js — 孙吴 263 年郡级边界图层
 *
 * 仅在「三国归晋（263）」时期叠加显示，用于呈现孙吴境内
 * 扬州 / 荆州 / 广州 / 交州 四州下辖郡界。
 */

const WuCommanderies = (function () {
  let mapRef = null;
  let layer = null;
  let entries = [];
  let labelsVisible = true;

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
    return L.polygon(latlngs, {
      color: '#4a3b2e', weight: 0.8, opacity: 0.7,
      fillColor: feature.color, fillOpacity: 0.18, className: 'wu-commandery',
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
    return ((filters.faction||'all')==='all'||entry.feature.kingdom===filters.faction)
      && ((filters.state||'all')==='all'||entry.feature.state===filters.state);
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

  function render(map, opts) {
    opts = opts || {};
    if (!window.GEO_WU_COMMANDERIES_263) return;

    const incoming = L.layerGroup();
    entries=[];
    if (window.HistoryMapBridge) window.HistoryMapBridge.clear('commandery');
    window.GEO_WU_COMMANDERIES_263.forEach((feature) => {
      const poly = makePolygon(feature);
      poly.bindTooltip(`${feature.state} · ${feature.name}`, { sticky: true, className: 'tt-cmd' });
      if (window.HistoryMapBridge) window.HistoryMapBridge.register('commandery', feature, poly, feature.kingdom);
      incoming.addLayer(poly);

      const label = makeLabel(feature);
      if (label) incoming.addLayer(label);
      entries.push({feature,polygon:poly,label,baseStyle:{color:poly.options.color,weight:poly.options.weight,opacity:poly.options.opacity,fillColor:poly.options.fillColor,fillOpacity:poly.options.fillOpacity}});

      if (opts.animate) {
        poly.setStyle({ fillOpacity: 0, opacity: 0 });
        // 透明度补间（territories.js 同款）
        const target = { fillOpacity: 0.18, opacity: 0.7 };
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
