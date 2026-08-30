/**
 * territories.js — 疆域图层：基于真实州界多边形渲染势力范围
 *
 * 渲染 GEO_PROVINCES 手工精绘州界，按 PROVINCE_PERIODS[periodId] 映射着色。
 * 标注分两级：
 *   · 国号大字：每势力一次，取 FACTION_LABELS 锚点（如「魏」「蜀汉」）
 *   · 州名小字：每州一次，取州数据自带 label 锚点
 * 如此可避免「荆州（魏）」这类现代注记，魏荆州处标小字「荆州」、
 * 其北自有国号「魏」大字，吴荆州同理——与史地图集画法一致。
 */

const Territories = (function () {
  let mapRef = null;
  let current = null; // 当前 L.layerGroup
  let currentEntries = [];
  let currentFactionLabels = [];
  let currentAnnotationEntries = [];
  let hierarchyLevel = 'faction';

  // 缓存当前使用的州界数据集，避免切换时重复解析
  let currentFeatures = [];

  // 透明度补间（requestAnimationFrame）
  function tween(poly, target, ms, done) {
    const start = {
      fillOpacity: poly.options.fillOpacity || 0,
      opacity: poly.options.opacity || 0,
    };
    const t0 = performance.now();
    function step(t) {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3); // ease-out
      poly.setStyle({
        fillOpacity: start.fillOpacity + (target.fillOpacity - start.fillOpacity) * e,
        opacity: start.opacity + (target.opacity - start.opacity) * e,
      });
      if (k < 1) requestAnimationFrame(step);
      else if (done) done();
    }
    requestAnimationFrame(step);
  }

  function makePolygon(feature, factionId) {
    const f = FACTIONS[factionId];
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
    const factionColor=MapSafeHtml.safeHex(f.color,'#746c60');
    const poly = L.polygon(latlngs, {
      color: factionColor, weight: 1.5, opacity: 0.9,
      fillColor: factionColor, fillOpacity: 0.30, className: 'territory',
    });
    poly.__factionId = factionId;
    poly.__provinceFeature = feature;
    poly.bindTooltip(MapSafeHtml.escapeHtml(`${feature.name} · ${f.name}`), { sticky: true, className: 'tt-faction' });
    poly.on('click', () => Panel.factionView(f));
    if (window.HistoryMapBridge) window.HistoryMapBridge.register('province', feature, poly, factionId);
    return poly;
  }

  // 国号大字（每势力一次），支持 FACTIONS 中 labelCenter 手动覆盖与 labelOffset 微调
  function makeFactionLabel(factionId, centroids) {
    const f = FACTIONS[factionId];
    const override = (window.FACTION_LABEL_OVERRIDES || {})[window.__activeMapPeriodId || ''];
    let pos = (override && override[factionId]) ||
      (centroids && centroids[factionId]) || f.labelCenter || FACTION_LABELS[factionId];
    if (!pos) return null;
    // 防止势力名因质心或锚点偏出地图可视范围。
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    pos = [clamp(pos[0], 18, 44), clamp(pos[1], 92, 130)];
    const off = f.labelOffset || [0, 0];
    const latLng = [pos[0] + off[0], pos[1] + off[1]];
    const marker=L.marker(latLng, {
      icon: L.divIcon({
        className: 'faction-label',
        html: `<span style="color:${MapSafeHtml.safeHex(f.color,'#746c60')}">${MapSafeHtml.escapeHtml(f.name)}</span>`,
        iconSize: [90, 30],
        iconAnchor: [45, 15],
      }),
      interactive: false,
    });
    marker.__factionId=factionId;
    return marker;
  }

  // 州名小字（每州一次）
  function makeProvinceLabel(feature) {
    const pos = feature.label ? [feature.label[0], feature.label[1]] : null;
    if (!pos) return null;
    const marker=L.marker(pos, {
      icon: L.divIcon({
        className: 'province-label',
        html: `<span>${MapSafeHtml.escapeHtml(feature.name)}</span>`,
        iconSize: [70, 18],
        iconAnchor: [35, 9],
      }),
      interactive: false,
    });
    marker.__stateName=feature.name;
    return marker;
  }

  function ensureHatchPattern(id, color) {
    if (!mapRef || !mapRef.getPanes) return null;
    const svg = mapRef.getPanes().overlayPane.querySelector('svg');
    if (!svg) return null;
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    if (!defs.querySelector('#' + id)) {
      const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      pattern.setAttribute('id', id);
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pattern.setAttribute('width', '10');
      pattern.setAttribute('height', '10');
      const hatch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hatch.setAttribute('d', 'M-2,10 L10,-2 M4,14 L14,4');
      hatch.setAttribute('stroke', MapSafeHtml.safeHex(color,'#9a4f3e'));
      hatch.setAttribute('stroke-width', '1.25');
      hatch.setAttribute('stroke-opacity', '.72');
      hatch.setAttribute('fill', 'none');
      pattern.appendChild(hatch);
      defs.appendChild(pattern);
    }
    return id;
  }

  function resolveFaction(mapping, feature) {
    return (mapping && mapping[feature.key]) || feature.kingdom || 'lianjun';
  }

  function ringAreaCentroid(ring) {
    if (!ring || ring.length < 3) return null;
    let twiceArea = 0, cx = 0, cy = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const cross = a[0] * b[1] - b[0] * a[1];
      twiceArea += cross;
      cx += (a[0] + b[0]) * cross;
      cy += (a[1] + b[1]) * cross;
    }
    if (Math.abs(twiceArea) < 1e-9) return null;
    return {lng:cx/(3*twiceArea),lat:cy/(3*twiceArea),area:Math.abs(twiceArea/2)};
  }

  function geometryAreaCentroid(geometry) {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    let lng = 0, lat = 0, area = 0;
    (polygons || []).forEach((polygon) => {
      const result = ringAreaCentroid(polygon && polygon[0]);
      if (!result) return;
      lng += result.lng * result.area; lat += result.lat * result.area; area += result.area;
    });
    return area ? {lng:lng/area,lat:lat/area,area} : null;
  }

  function geometryLatLngs(feature) {
    const geom = feature && feature.geometry;
    if (!geom) return [];
    if (geom.type === 'Polygon') {
      return geom.coordinates.map((ring) => ring.map((point) => [point[1], point[0]]));
    }
    if (geom.type === 'MultiPolygon') {
      return geom.coordinates.map((polygon) =>
        polygon.map((ring) => ring.map((point) => [point[1], point[0]]))
      );
    }
    return [];
  }

  function activeCommanderies() {
    const data = window.__HISTORY_GEO_DATA;
    const periodId = window.__activeMapPeriodId;
    return data && data.commanderyByPeriod && data.commanderyByPeriod[periodId] || [];
  }

  // 按当前时期各势力实际占据的州界，计算加权版图中心
  function computeFactionCentroids(features, mapping) {
    const acc = {};
    features.forEach((feature) => {
      const fid = resolveFaction(mapping, feature);
      const center = geometryAreaCentroid(feature.geometry);
      if (!center) return;
      const area = center.area;
      if (!acc[fid]) acc[fid] = { lat: 0, lng: 0, area: 0 };
      acc[fid].lat += center.lat * area;
      acc[fid].lng += center.lng * area;
      acc[fid].area += area;
    });
    const result = {};
    Object.keys(acc).forEach((fid) => {
      const a = acc[fid];
      if (a.area > 0) result[fid] = [a.lat / a.area, a.lng / a.area];
    });
    return result;
  }

  function addPeriodAnnotations(group) {
    currentAnnotationEntries = [];
    if (window.__MAP_DISPLAY_MODE === 'administrative') return;
    const snapshot = window.POLITICAL_SNAPSHOT_AUDIT && window.POLITICAL_SNAPSHOT_AUDIT[window.__activeMapPeriodId];
    (snapshot && snapshot.influenceAreas || []).forEach((item) => {
      const faction = FACTIONS[item.faction] || {color:'#746C60'};
      const commanderyNames = new Set(item.commanderySourceNames || []);
      const matched = activeCommanderies().filter((feature) =>
        commanderyNames.has(feature.sourceName) || commanderyNames.has(feature.key) || commanderyNames.has(feature.name)
      );
      const geometries = matched.length ? matched.map((feature) => geometryLatLngs(feature)) : (item.pts ? [item.pts] : []);
      const patternId = 'sgz-hatch-' + String(item.pattern || 'diagonal').replace(/[^a-z0-9_-]/gi, '-');
      geometries.forEach((latlngs) => {
        if (!latlngs || !latlngs.length) return;
        const area = L.polygon(latlngs, {
          color:'transparent', weight:0, opacity:0,
          fillColor:MapSafeHtml.safeHex(faction.color,'#746c60'), fillOpacity:.42,
          className:'historical-influence-hatch', interactive:false,
        }).addTo(group);
        const applyPattern = () => {
          const id = ensureHatchPattern(patternId, faction.color);
          if (id) area.setStyle({fillColor:`url(#${id})`});
        };
        area.once('add', () => requestAnimationFrame(applyPattern));
        requestAnimationFrame(applyPattern);
        currentAnnotationEntries.push({factionId:item.faction,circle:area,marker:null});
      });
    });
    (snapshot && snapshot.annotations || []).forEach((item) => {
      const faction = FACTIONS[item.faction] || {color:'#746C60'};
      let circle=null;
      if (item.radius) {
        const safeFactionColor=MapSafeHtml.safeHex(faction.color,'#746c60');
        circle=L.circle(item.pos,{radius:item.radius,color:safeFactionColor,weight:1.35,opacity:.82,dashArray:'5 5',
          fillColor:safeFactionColor,fillOpacity:.10,className:'historical-influence'}).addTo(group);
      }
      const marker=L.marker(item.pos,{icon:L.divIcon({className:'faction-annotation',
        html:`<span style="--annotation-color:${MapSafeHtml.safeHex(faction.color,'#746c60')}"><b>${MapSafeHtml.escapeHtml(item.name)}</b></span>`,
        iconSize:[96,26],iconAnchor:[48,13]}),interactive:true}).addTo(group);
      if(item.detail) marker.bindTooltip(MapSafeHtml.escapeHtml(`${item.name} · ${item.detail}`),{sticky:true,className:'tt-annotation'});
      currentAnnotationEntries.push({factionId:item.faction,circle,marker});
    });
  }

  function filterState(entry){
    const filters=window.__MAP_FILTERS||{};
    const faction=filters.faction||'all';
    const state=filters.state||'all';
    if(faction!=='all'&&entry.factionId!==faction) return false;
    if(state==='all') return true;
    return entry.feature && (entry.feature.name===state || entry.feature.state===state);
  }

  function setMarkerVisible(marker,visible){
    if(!marker) return;
    const element=marker.getElement&&marker.getElement();
    if(element) element.style.display=visible?'':'none';
  }

  function applyFilters(){
    const filters=window.__MAP_FILTERS||{};
    const level=window.__MAP_HIERARCHY_LEVEL||hierarchyLevel;
    currentEntries.forEach((entry)=>{
      const visible=filterState(entry);
      if(entry.polygon&&entry.polygon.setStyle){
        if(!visible){entry.hidden=true;entry.polygon.setStyle({opacity:0,fillOpacity:0});}
        else if(level==='faction'){entry.hidden=false;entry.polygon.setStyle({weight:0,opacity:0,fillOpacity:0.30});}
        else if(level==='province'){entry.hidden=false;entry.polygon.setStyle({weight:1.5,opacity:0.9,fillOpacity:0.30});}
        else {entry.hidden=false;entry.polygon.setStyle({weight:0,opacity:0,fillOpacity:0});}
      }
      setMarkerVisible(entry.label,visible&&level==='province');
    });
    currentFactionLabels.forEach((entry)=>{
      const visible=currentEntries.some(item=>item.factionId===entry.factionId&&filterState(item));
      setMarkerVisible(entry.marker,visible&&level==='faction');
    });
    currentAnnotationEntries.forEach((entry)=>{
      const visible=(filters.faction||'all')==='all'||entry.factionId===filters.faction;
      const stateVisible=(filters.state||'all')==='all';
      setMarkerVisible(entry.marker,visible&&stateVisible);
      if(entry.circle){
        if(visible&&stateVisible){if(!mapRef.hasLayer(entry.circle)) entry.circle.addTo(current);}else if(mapRef.hasLayer(entry.circle)) mapRef.removeLayer(entry.circle);
      }
    });
    if(currentEntries.some(entry=>entry.label&&entry.label.getElement&& !entry.label.getElement())) requestAnimationFrame(applyFilters);
  }

  function render(map, features, mapping, opts) {
    opts = opts || {};
    currentFeatures = features || [];
    currentEntries = [];
    currentFactionLabels = [];
    currentAnnotationEntries = [];
    if (window.HistoryMapBridge) window.HistoryMapBridge.clear('province');
    const incoming = L.layerGroup();
    const present = new Set(); // 本期出现的势力

    currentFeatures.forEach((feature) => {
      const factionId = resolveFaction(mapping, feature);
      present.add(factionId);

      const poly = makePolygon(feature, factionId);
      incoming.addLayer(poly);

      const pLabel = makeProvinceLabel(feature);
      if (pLabel) incoming.addLayer(pLabel);
      currentEntries.push({feature,factionId,polygon:poly,label:pLabel,baseStyle:{color:poly.options.color,weight:poly.options.weight,opacity:poly.options.opacity,fillColor:poly.options.fillColor,fillOpacity:poly.options.fillOpacity}});

      if (opts.animate) {
        poly.setStyle({ fillOpacity: 0, opacity: 0 });
        tween(poly, { fillOpacity: 0.30, opacity: 0.9 }, 650);
      }
    });

    // 国号大字
    const centroids = computeFactionCentroids(currentFeatures, mapping);
    present.forEach((fid) => {
      const big = makeFactionLabel(fid, centroids);
      if (big) { incoming.addLayer(big); currentFactionLabels.push({factionId:fid,marker:big}); }
    });
    addPeriodAnnotations(incoming);

    if (current) {
      if (opts.animate) {
        const old = current;
        old.eachLayer((l) => { if (l.setStyle) tween(l, { fillOpacity: 0, opacity: 0 }, 400); });
        setTimeout(() => { if (map.hasLayer(old)) map.removeLayer(old); }, 450);
      } else {
        map.removeLayer(current);
      }
    }
    incoming.addTo(map);
    current = incoming;
    applyFilters();
  }

  function hide() {
    if (current && mapRef) {
      mapRef.removeLayer(current);
      current = null;
    }
  }

  function init(map) { mapRef = map; }

  function setHierarchyLevel(level){
    hierarchyLevel=['faction','province','commandery'].includes(level)?level:'faction';
    window.__MAP_HIERARCHY_LEVEL=hierarchyLevel;
    applyFilters();
  }

  return { init, render, hide, setFilters:applyFilters, setHierarchyLevel, setDisplayMode:function(mode){window.__MAP_DISPLAY_MODE=mode||'research';applyFilters();} };
})();
