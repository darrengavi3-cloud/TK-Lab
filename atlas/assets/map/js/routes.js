/**
 * routes.js — 进军路线图层
 *
 * 参考各时期战役地图的画法：以流动虚线表现行军方向，
 * 末端以箭头指示矛头所向，按势力着色，随时期切换。
 */

const Routes = (function () {
  let mapRef = null;
  let current = null;

  // 由末段两点计算朝向角（CSS rotate 角度，0 = 正北，顺时针）
  function bearing(a, b) {
    const dLat = b[0] - a[0];
    const dLng = b[1] - a[1];
    return Math.atan2(dLng, dLat) * 180 / Math.PI;
  }

  function makeArrow(pts, color) {
    const n = pts.length;
    if (n < 2) return null;
    const angle = MapSafeHtml.safeNumber(bearing(pts[n - 2], pts[n - 1]));
    const safeColor=MapSafeHtml.safeHex(color,'#5b4630');
    return L.marker(pts[n - 1], {
      icon: L.divIcon({
        className: 'route-arrow',
        html: `<svg width="18" height="18" viewBox="0 0 18 18" style="transform:rotate(${angle}deg)">
                 <path d="M9 1 L15 15 L9 11 L3 15 Z" fill="${safeColor}" stroke="#2b2118" stroke-width="0.8"/>
               </svg>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      }),
      interactive: false,
    });
  }

  function render(map, routes, opts) {
    opts = opts || {};
    mapRef = map;
    clear();

    if (!routes || !routes.length) return;
    const grp = L.layerGroup();

    routes.forEach((r) => {
      const f = FACTIONS[r.faction] || { color: '#5b4630' };
      const routeColor=MapSafeHtml.safeHex(f.color,'#5b4630');
      const line = L.polyline(r.pts, {
        color: routeColor, weight: 2.4, opacity: 0.85,
        dashArray: '9 7', className: 'march-route', interactive: false,
      });
      line.bindTooltip(MapSafeHtml.escapeHtml(r.name), { sticky: true, className: 'tt-route' });
      // tooltip 需要可交互才能悬停；给路线单独开启 interactive
      line.options.interactive = true;
      grp.addLayer(line);

      const arrow = makeArrow(r.pts, routeColor);
      if (arrow) grp.addLayer(arrow);
    });

    grp.addTo(map);
    current = grp;
  }

  function clear() {
    if (current && mapRef && mapRef.hasLayer(current)) mapRef.removeLayer(current);
    current = null;
  }

  function hide() { clear(); }

  return { render, clear, hide };
})();
