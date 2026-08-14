/**
 * hydronyms.js — 古水名标注层
 *
 * 数据来自 data/hydronym-audit.js（HYDRONYM_AUDIT）。每条记录已经由审计
 * 合并同名多段几何并计算 labelAnchor、priority 与 minZoom：
 *   · 低缩放只显示大河主名（priority 高、minZoom 低）；
 *   · 放大后逐步显示支流、渠与湖泊；
 *   · 同一次渲染用屏幕像素盒做避让，已占用位置不再重复标注。
 * 点击标签打开 Panel.hydronymView，可查看《水经注》卷次出处与几何来源说明。
 */
const Hydronyms = (function () {
  let mapRef = null;
  let layer = null;
  let enabled = false;
  let bound = false;

  function mainName(item) {
    return String(item.ancientName || '').split('/')[0].trim() || '未名水';
  }

  function orderedItems() {
    return (window.HYDRONYM_AUDIT && window.HYDRONYM_AUDIT.hydronyms || [])
      .slice()
      .sort((a, b) => (Number(b.priority) - Number(a.priority)) || String(a.ancientName).localeCompare(String(b.ancientName), 'zh-CN'));
  }

  function render(map) {
    if (!enabled || !map) return;
    if (!layer) layer = L.layerGroup();
    else layer.clearLayers();
    const zoom = map.getZoom();
    const used = [];
    orderedItems().forEach((item) => {
      if (item.minZoom != null && zoom < Number(item.minZoom)) return;
      if (!Array.isArray(item.labelAnchor) || item.labelAnchor.length < 2) return;
      const point = map.latLngToContainerPoint(L.latLng(Number(item.labelAnchor[1]), Number(item.labelAnchor[0])));
      const name = mainName(item);
      const width = Math.max(42, Array.from(name).length * 15 + 12);
      const height = 22;
      const box = { left: point.x - width / 2, top: point.y - height / 2, right: point.x + width / 2, bottom: point.y + height / 2 };
      if (used.some((u) => !(box.right < u.left || box.left > u.right || box.bottom < u.top || box.top > u.bottom))) return;
      used.push(box);
      const hit = item.evidence && item.evidence.status === '原文命中';
      const marker = L.marker([Number(item.labelAnchor[1]), Number(item.labelAnchor[0])], {
        icon: L.divIcon({
          className: 'hydronym-label' + (hit ? ' is-evidenced' : ' is-pending'),
          html: `<span>${name}</span>`,
          iconSize: [width, height],
          iconAnchor: [width / 2, height / 2],
        }),
        interactive: true,
      });
      const locators = Array.isArray(item.sourceLocators) && item.sourceLocators.length
        ? item.sourceLocators.join('、')
        : '未见《水经注》原文直接命中';
      marker.bindTooltip(
        `<strong>${item.ancientName}</strong><br>出处：${locators}<br>证据：${hit ? '原文命中' : '待考'} · 几何来源：${(item.geometrySource && item.geometrySource.status) || '推定'}`,
        { sticky: true, className: 'tt-hydronym' }
      );
      marker.on('click', () => { if (window.Panel && Panel.hydronymView) Panel.hydronymView(item); });
      layer.addLayer(marker);
    });
    if (!map.hasLayer(layer)) layer.addTo(map);
  }

  function bindZoom(map) {
    if (bound || !map) return;
    bound = true;
    map.on('zoomend', () => { if (enabled) render(map); });
  }

  function setVisible(map, on) {
    mapRef = map;
    enabled = Boolean(on);
    if (!enabled) {
      if (layer && map && map.hasLayer(layer)) map.removeLayer(layer);
      return;
    }
    bindZoom(map);
    render(map);
  }

  return {
    render,
    setVisible,
    isVisible: () => enabled,
  };
})();
