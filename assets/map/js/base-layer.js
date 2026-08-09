/**
 * base-layer.js — 基础底图：真实瓦片地图 + 真实水系叠加
 *
 * 还原参考项目 historical-map-project「真实瓦片打底」的呈现形式，
 * 并叠加 GEO_WATER 中的手工水系（黄河、长江、淮河、汉水等）。
 */

const BaseLayer = (function () {
  let current = null;
  let currentKey = 'terrain';
  let worldContextLayer = null;
  let waterLayer = null;
  let coastlineLayer = null;

  function makeLayer(key) {
    const def = BASE_MAPS[key];
    return L.tileLayer(def.url, {
      attribution: def.attribution,
      maxZoom: def.maxZoom || 18,
    });
  }

  function buildWaterLayer() {
    const grp = L.layerGroup();
    if (!window.GEO_WATER) return grp;

    window.GEO_WATER.forEach((item) => {
      const geom = item.geometry;
      if (!geom) return;

      const latlngsFrom = (coords) => coords.map((pt) => [pt[1], pt[0]]);

      const isMajor = /黄河|河水|长江|江水/.test(item.name || '') && /黄河|长江/.test(item.name || '');
      const lineClass = 'river river-line' + (isMajor ? ' major-river' : '');
      if (geom.type === 'LineString') {
        grp.addLayer(L.polyline(latlngsFrom(geom.coordinates), {
          className: lineClass, interactive: false,
        }));
      } else if (geom.type === 'MultiLineString') {
        geom.coordinates.forEach((line) => {
          grp.addLayer(L.polyline(latlngsFrom(line), {
            className: lineClass, interactive: false,
          }));
        });
      } else if (geom.type === 'Polygon') {
        geom.coordinates.forEach((ring) => {
          grp.addLayer(L.polygon(latlngsFrom(ring), {
            className: 'river river-lake', interactive: false,
          }));
        });
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach((poly) => {
          poly.forEach((ring) => {
            grp.addLayer(L.polygon(latlngsFrom(ring), {
              className: 'river river-lake', interactive: false,
            }));
          });
        });
      }
    });
    [
      {name:'河水',pos:[35.15,111.20]},
      {name:'江水',pos:[29.75,113.80]},
    ].forEach((label) => {
      grp.addLayer(L.marker(label.pos, {
        icon:L.divIcon({className:'major-river-label',html:`<span>${label.name}</span>`,iconSize:[120,20],iconAnchor:[60,10]}),
        interactive:false,
      }));
    });
    return grp;
  }

  function buildWorldContextLayer() {
    const grp = L.layerGroup();
    const palette = ['#c6cdca', '#cdd2cf', '#bcc6c4', '#d2d4cc'];
    const toLatLngs = (ring) => ring.map((point) => [point[1], point[0]]);
    (window.GEO_WORLD_CONTEXT || []).forEach((item, index) => {
      const geometry = item.geometry || {};
      const options = {
        className: 'world-context-country',
        color: '#f6f2e8', weight: 0.78, opacity: 0.88,
        fillColor: palette[index % palette.length], fillOpacity: 0.72,
        lineJoin: 'round', interactive: false,
      };
      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach((ring) => grp.addLayer(L.polygon(toLatLngs(ring), options)));
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon) => {
          polygon.forEach((ring) => grp.addLayer(L.polygon(toLatLngs(ring), options)));
        });
      }
      if (Array.isArray(item.label)) {
        grp.addLayer(L.marker(item.label, {
          icon: L.divIcon({
            className: 'world-context-label',
            html: `<span>${item.name}</span>`,
            iconSize: [80, 18], iconAnchor: [40, 9],
          }),
          interactive: false,
        }));
      }
    });
    return grp;
  }

  function buildCoastlineLayer() {
    const grp = L.layerGroup();
    const outlines = window.GEO_COASTLINES || [];

    // 海岸数据由矩形裁剪得到。裁剪框本身不是海岸线，若直接用
    // polygon 描边，会在地图上留下跨越州郡的水平／垂直直线。
    const clipFrames = {
      korea: { west: 123.5, east: 132, south: 33, north: 44 },
      indochina: { west: 97.5, east: 110, south: 7.5, north: 25 },
    };
    const frameEpsilon = 1e-6;
    const isAt = (value, target) => Math.abs(value - target) < frameEpsilon;
    const isArtificialFrameEdge = (a, b, frame) => {
      if (!frame) return false;
      const horizontal = isAt(a[1], b[1]) && (isAt(a[1], frame.south) || isAt(a[1], frame.north));
      const vertical = isAt(a[0], b[0]) && (isAt(a[0], frame.west) || isAt(a[0], frame.east));
      return horizontal || vertical;
    };
    const buildStrokeRuns = (ring, frame) => {
      const runs = [];
      let current = [];
      const flush = () => {
        if (current.length > 1) runs.push(current);
        current = [];
      };

      for (let index = 0; index < ring.length - 1; index += 1) {
        const start = ring[index];
        const end = ring[index + 1];
        if (isArtificialFrameEdge(start, end, frame)) {
          flush();
          continue;
        }

        const startLatLng = [start[1], start[0]];
        if (!current.length) {
          current.push(startLatLng);
        } else {
          const previous = current[current.length - 1];
          if (previous[0] !== startLatLng[0] || previous[1] !== startLatLng[1]) {
            flush();
            current.push(startLatLng);
          }
        }
        current.push([end[1], end[0]]);
      }
      flush();
      return runs;
    };

    outlines.forEach((item) => {
      item.rings.forEach((ring) => {
        const latlngs = ring.map((pt) => [pt[1], pt[0]]);
        // 填色保留完整陆地形状，但不让 polygon 自动描出裁剪框。
        const fill = L.polygon(latlngs, {
          className: 'real-coastline-fill',
          stroke: false,
          fill: true,
          fillColor: '#d8cdb7',
          fillOpacity: 0.25,
          interactive: false,
        });
        grp.addLayer(fill);

        // 仅描出裁剪框以内的真实海岸段，去除影响其他州郡的横／竖直线。
        buildStrokeRuns(ring, clipFrames[item.id]).forEach((points) => {
          grp.addLayer(L.polyline(points, {
            className: 'real-coastline',
            color: '#8b7f6b',
            weight: 1.1,
            opacity: 0.75,
            interactive: false,
          }));
        });
      });
    });
    return grp;
  }

  function init(map) {
    current = makeLayer(currentKey).addTo(map);
    worldContextLayer = buildWorldContextLayer();
    worldContextLayer.addTo(map);
    waterLayer = buildWaterLayer().addTo(map);
    coastlineLayer = buildCoastlineLayer().addTo(map);
    setWorldContextVisible(map, currentKey === 'terrain');
    worldContextLayer.eachLayer((layer) => { if (layer.bringToBack) layer.bringToBack(); });
    coastlineLayer.eachLayer((layer) => layer.bringToBack());
    map.getContainer().classList.add('tinted');
    return current;
  }

  function setBase(map, key) {
    if (!BASE_MAPS[key]) return;
    if (key === currentKey && current) return;
    if (current) map.removeLayer(current);
    current = makeLayer(key).addTo(map);
    currentKey = key;
    setWorldContextVisible(map, key === 'terrain');
  }

  function setWorldContextVisible(map, on) {
    if (!worldContextLayer) return;
    if (on) {
      if (!map.hasLayer(worldContextLayer)) map.addLayer(worldContextLayer);
      worldContextLayer.eachLayer((layer) => { if (layer.bringToBack) layer.bringToBack(); });
    }
    else if (map.hasLayer(worldContextLayer)) map.removeLayer(worldContextLayer);
  }

  function setTint(map, on) {
    map.getContainer().classList.toggle('tinted', !!on);
  }

  function setWaterVisible(map, on) {
    if (!waterLayer) return;
    if (on) { if (!map.hasLayer(waterLayer)) map.addLayer(waterLayer); }
    else map.removeLayer(waterLayer);
  }

  function getWaterLayer() { return waterLayer; }
  function getCurrentKey() { return currentKey; }

  return { init, setBase, setTint, setWaterVisible, setWorldContextVisible, getWaterLayer, getCurrentKey };
})();
