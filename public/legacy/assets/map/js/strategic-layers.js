/** 边界交通与重要战场图层。 */
const StrategicLayers = (function () {
  let mapRef = null;
  let routeLayer = null;
  let battlefieldLayer = null;
  let minorityLayer = null;

  function yearVisible(item, year) {
    return Number(year) >= Number(item.from || -Infinity) && Number(year) <= Number(item.to || Infinity);
  }

  function renderRoutes(map, year) {
    mapRef = map;
    if (routeLayer && map.hasLayer(routeLayer)) map.removeLayer(routeLayer);
    routeLayer = L.layerGroup();
    (window.FRONTIER_ROUTES || []).filter((item) => yearVisible(item, year)).forEach((item) => {
      const color = item.frontier === '魏—汉' ? '#8b563e' : '#5f6259';
      const line = L.polyline(item.pts, {
        color, weight:2.15, opacity:.82, dashArray:'4 5', className:'frontier-route', interactive:true,
      });
      line.bindTooltip(`<strong>${item.name}</strong><br>${item.frontier} · ${item.note}`, {sticky:true,className:'tt-route'});
      routeLayer.addLayer(line);
    });
    routeLayer.addTo(map);
  }

  function renderBattlefields(map, year) {
    mapRef = map;
    if (battlefieldLayer && map.hasLayer(battlefieldLayer)) map.removeLayer(battlefieldLayer);
    battlefieldLayer = L.layerGroup();
    (window.STRATEGIC_BATTLEFIELDS || []).filter((item) => yearVisible(item, year)).forEach((item) => {
      const marker = L.marker([item.lat,item.lng], {
        icon:L.divIcon({className:'battlefield-label',html:`<span>⚔ ${item.name}</span>`,iconSize:[126,22],iconAnchor:[8,11]}),
        interactive:true,
      });
      marker.bindTooltip(item.note, {direction:'top',className:'tt-battle'});
      battlefieldLayer.addLayer(marker);
    });
    battlefieldLayer.addTo(map);
  }

  function renderMinorities(map, year) {
    mapRef = map;
    if (minorityLayer && map.hasLayer(minorityLayer)) map.removeLayer(minorityLayer);
    minorityLayer = L.layerGroup();
    (window.MINORITY_REGIONS || []).filter((item) => yearVisible(item, year)).forEach((item) => {
      const label = L.marker(item.label, {
        icon:L.divIcon({
          className:'minority-label',
          html:`<span style="--minority-color:${item.color || '#625b52'}">${item.name}</span>`,
          iconSize:[104,22], iconAnchor:[52,11],
        }),
        interactive:false,
      });
      minorityLayer.addLayer(label);
    });
    minorityLayer.addTo(map);
  }

  function setRoutesVisible(map, on, year) {
    if (on) renderRoutes(map, year);
    else if (routeLayer && map.hasLayer(routeLayer)) map.removeLayer(routeLayer);
  }

  function setBattlefieldsVisible(map, on, year) {
    if (on) renderBattlefields(map, year);
    else if (battlefieldLayer && map.hasLayer(battlefieldLayer)) map.removeLayer(battlefieldLayer);
  }

  function setMinoritiesVisible(map, on, year) {
    if (on) renderMinorities(map, year);
    else if (minorityLayer && map.hasLayer(minorityLayer)) map.removeLayer(minorityLayer);
  }

  return {renderRoutes,renderBattlefields,renderMinorities,setRoutesVisible,setBattlefieldsVisible,setMinoritiesVisible};
})();
