#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR="$ROOT/assets/vendor"
MAP="$ROOT/assets/map"
MAP_BASE="https://workbuddy-space-static.codebuddy.work/page/q71T7ZIe9O6xmZrTj3ldoy/1"

download() {
  local url="$1"
  local output="$2"
  mkdir -p "$(dirname "$output")"
  curl -L --fail --retry 3 --connect-timeout 20 --max-time 180 "$url" -o "$output"
}

download "https://cdnjs.cloudflare.com/ajax/libs/element-plus/2.11.4/index.css" \
  "$VENDOR/element-plus/index.css"
download "https://cdnjs.cloudflare.com/ajax/libs/vue/3.5.39/vue.global.min.js" \
  "$VENDOR/vue/vue.global.min.js"
download "https://cdnjs.cloudflare.com/ajax/libs/element-plus/2.11.4/index.full.min.js" \
  "$VENDOR/element-plus/index.full.min.js"
download "https://cdnjs.cloudflare.com/ajax/libs/gojs/3.1.10/go.js" \
  "$VENDOR/gojs/go.js"
download "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" \
  "$VENDOR/xlsx/xlsx.full.min.js"

download "$MAP_BASE/vendor/leaflet/leaflet.css" "$MAP/vendor/leaflet/leaflet.css"
download "$MAP_BASE/vendor/leaflet/leaflet.js" "$MAP/vendor/leaflet/leaflet.js"
download "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/layers.png" "$MAP/vendor/leaflet/images/layers.png"
download "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/layers-2x.png" "$MAP/vendor/leaflet/images/layers-2x.png"
download "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png" "$MAP/vendor/leaflet/images/marker-icon.png"
download "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png" "$MAP/vendor/leaflet/images/marker-icon-2x.png"
download "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png" "$MAP/vendor/leaflet/images/marker-shadow.png"

download "$MAP_BASE/data/geo-water.js" "$MAP/data/geo-water.js"
download "$MAP_BASE/data/three-kingdoms.js" "$MAP/data/three-kingdoms.js"
download "$MAP_BASE/js/base-layer.js" "$MAP/js/base-layer.js"
download "$MAP_BASE/js/config.js" "$MAP/js/config.js"
download "$MAP_BASE/js/territories.js" "$MAP/js/territories.js"
download "$MAP_BASE/js/wu-commanderies.js" "$MAP/js/wu-commanderies.js"
download "$MAP_BASE/js/commanderies.js" "$MAP/js/commanderies.js"
download "$MAP_BASE/js/markers.js" "$MAP/js/markers.js"
download "$MAP_BASE/js/routes.js" "$MAP/js/routes.js"
download "$MAP_BASE/js/panel.js" "$MAP/js/panel.js"
download "$MAP_BASE/js/timeline.js" "$MAP/js/timeline.js"
download "$MAP_BASE/js/app.js" "$MAP/js/app.js"
