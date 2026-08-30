/**
 * base-layer.js — 基础底图：真实瓦片地图 + 真实水系叠加
 *
 * 还原参考项目 historical-map-project「真实瓦片打底」的呈现形式，
 * 并叠加 GEO_WATER 中的手工水系（黄河、长江、淮河、汉水等）。
 */

const BaseLayer = (function () {
  let current = null;
  let currentKey = 'terrain';
  let waterLayer = null;
  let coastlineLayer = null;
  let hillshadeLayer = null;
  let elevationReadoutEnabled = false;

  function makeLayer(key) {
    const def = BASE_MAPS[key];
    return L.tileLayer(def.url, {
      attribution: def.attribution,
      maxZoom: def.maxZoom || 18,
    });
  }

  function syncHillshade(map) {
    if (!current || currentKey !== 'elevation') return;
    const zoom = map ? map.getZoom() : 0;
    if (zoom < 7) {
      if (!hillshadeLayer) hillshadeLayer = makeLayer('hillshade').setOpacity(0.62);
      if (map && !map.hasLayer(hillshadeLayer)) hillshadeLayer.addTo(map);
    } else if (hillshadeLayer && map && map.hasLayer(hillshadeLayer)) {
      map.removeLayer(hillshadeLayer);
    }
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
        icon:L.divIcon({className:'major-river-label',html:`<span>${MapSafeHtml.escapeHtml(label.name)}</span>`,iconSize:[120,20],iconAnchor:[60,10]}),
        interactive:false,
      }));
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
    waterLayer = buildWaterLayer().addTo(map);
    coastlineLayer = buildCoastlineLayer().addTo(map);
    coastlineLayer.eachLayer((layer) => layer.bringToBack());
    map.getContainer().classList.add('tinted');
    return current;
  }

  function setBase(map, key) {
    if (!BASE_MAPS[key]) return;
    if (key === currentKey && current) { if (key === 'elevation') syncHillshade(map); return; }
    if (current) {
      map.removeLayer(current);
      if (hillshadeLayer && map.hasLayer(hillshadeLayer)) map.removeLayer(hillshadeLayer);
    }
    current = makeLayer(key).addTo(map);
    currentKey = key;
    if (key === 'elevation') {
      map.on('zoomend', () => syncHillshade(map));
      syncHillshade(map);
    }
  }

  function elevationAt(latlng, callback) {
    const map = current && current._map;
    if (!map || currentKey !== 'elevation') { if (callback) callback(null); return; }
    const z = Math.max(4, Math.min(15, Math.round(map.getZoom())));
    const pixel = map.project(latlng, z);
    const x = Math.floor(pixel.x / 256);
    const y = Math.floor(pixel.y / 256);
    const tileX = pixel.x - x * 256;
    const tileY = pixel.y - y * 256;
    const url = BASE_MAPS.elevation.url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = function () {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const data = ctx.getImageData(Math.max(0, Math.min(255, Math.floor(tileX))), Math.max(0, Math.min(255, Math.floor(tileY))), 1, 1).data;
        const value = (data[0] * 256 + data[1] + data[2] / 256) - 32768;
        if (callback) callback(Math.round(value));
      } catch (error) {
        if (callback) callback(null);
      }
    };
    image.onerror = function () { if (callback) callback(null); };
    image.src = url;
  }

  function setElevationReadout(enabled) {
    elevationReadoutEnabled = Boolean(enabled);
    const el = document.getElementById('elev-readout');
    if (el) el.textContent = elevationReadoutEnabled ? '高程：点击地图取样' : '高程读数已关闭';
  }

  function handleMapClick(map, latlng) {
    if (!elevationReadoutEnabled) return;
    const el = document.getElementById('elev-readout');
    if (el) el.textContent = '高程：读取中…';
    elevationAt(latlng, function (value) {
      if (el) el.textContent = value == null ? '高程未取到' : '高程：' + value + ' 米';
    });
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

  return { init, setBase, setTint, setWaterVisible, getWaterLayer, getCurrentKey, elevationAt, setElevationReadout, handleMapClick };
})();
