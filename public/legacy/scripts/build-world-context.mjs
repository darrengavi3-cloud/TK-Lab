import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const inputPath = process.argv[2] || '/tmp/ne_countries.geojson';
const outputPath = path.join(root, 'assets', 'map', 'data', 'geo-world-context.js');
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// 素色底图需要覆盖当前地图在最小缩放级别下的可见域外范围；中国本土由历史州郡层表达。
// 只保留这一视窗内的国家轮廓，避免把现代全球政区误读成汉末至西晋历史疆界。
const bounds = { west: 76, east: 146, south: 4, north: 56 };
const keep = new Set([
  'Kazakhstan', 'Indonesia', 'Russia', 'Cambodia', 'Thailand', 'Laos', 'Myanmar',
  'Vietnam', 'North Korea', 'South Korea', 'Mongolia', 'India', 'Bangladesh',
  'Bhutan', 'Nepal', 'Pakistan', 'Kyrgyzstan', 'Sri Lanka', 'Taiwan',
  'Philippines', 'Malaysia', 'Brunei', 'Japan',
]);
const names = {
  Russia: '俄罗斯', Mongolia: '蒙古', India: '印度', Bangladesh: '孟加拉',
  Bhutan: '不丹', Nepal: '尼泊尔', Myanmar: '缅甸', Thailand: '暹罗', Laos: '老挝',
  Vietnam: '交趾', Cambodia: '真腊', 'North Korea': '高丽', 'South Korea': '新罗',
  Japan: '倭', Philippines: '吕宋', Taiwan: '夷洲',
};
const labels = {
  Russia: [48.5, 133.0], Mongolia: [46.4, 103.2], India: [25.0, 84.0],
  Bangladesh: [23.9, 90.5], Bhutan: [27.5, 90.4], Nepal: [28.1, 84.1], Myanmar: [19.2, 96.0],
  Thailand: [15.2, 101.1], Laos: [19.4, 103.4], Vietnam: [16.2, 106.8],
  Cambodia: [12.6, 104.8], 'North Korea': [40.2, 127.3], 'South Korea': [36.1, 127.8],
  Japan: [37.4, 138.0], Philippines: [12.0, 122.0], Taiwan: [23.6, 121.0],
};

function walkCoordinates(value, visit) {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === 'number') visit(value);
  else value.forEach((item) => walkCoordinates(item, visit));
}

function intersects(geometry) {
  let hit = false;
  walkCoordinates(geometry.coordinates, (point) => {
    if (point[0] >= bounds.west && point[0] <= bounds.east && point[1] >= bounds.south && point[1] <= bounds.north) hit = true;
  });
  return hit;
}

function clampPoint(point) {
  return [
    Math.max(bounds.west, Math.min(bounds.east, Number(point[0].toFixed(3)))),
    Math.max(bounds.south, Math.min(bounds.north, Number(point[1].toFixed(3)))),
  ];
}

function reduceRing(ring) {
  const out = [];
  ring.forEach((point, index) => {
    const next = ring[(index + 1) % ring.length];
    const distance = Math.abs(point[0] - next[0]) + Math.abs(point[1] - next[1]);
    if (index === 0 || distance > 0.12 || index % 3 === 0) out.push(clampPoint(point));
  });
  if (out.length > 2) out.push(out[0]);
  return out;
}

function simplifyGeometry(geometry) {
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geometry.coordinates.map(reduceRing).filter((ring) => new Set(ring.map((point) => point.join(','))).size > 2) };
  }
  return {
    type: 'MultiPolygon',
    coordinates: geometry.coordinates
      .map((polygon) => polygon.map(reduceRing).filter((ring) => new Set(ring.map((point) => point.join(','))).size > 2))
      .filter((polygon) => polygon.length),
  };
}

const countries = source.features
  .filter((feature) => keep.has(feature.properties?.ADMIN) && intersects(feature.geometry))
  .map((feature) => ({
    id: feature.properties.ADMIN.toLowerCase().replace(/[^a-z]+/g, '-'),
    name: names[feature.properties.ADMIN] || feature.properties.ADMIN,
    geometry: simplifyGeometry(feature.geometry),
    label: labels[feature.properties.ADMIN],
  }));

const output = `/*
 * 素色底图的域外现代陆地背景，源自 Natural Earth 1:110m Admin 0 Countries（Public Domain）。
 * 仅用于补足世界地图的陆地和现代国界可见性；中国本土行政表达仍由历史州郡层负责，
 * 这些现代国名不代表汉末至西晋的历史政区。
 */
window.GEO_WORLD_CONTEXT = ${JSON.stringify(countries)};
`;
fs.writeFileSync(outputPath, output, 'utf8');
console.log(`已生成素色底图域外背景：${outputPath}（${countries.length} 国）`);
