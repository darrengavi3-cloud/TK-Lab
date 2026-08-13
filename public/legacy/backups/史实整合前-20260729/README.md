# 三国职官谱本地项目版

打开 `index.html` 即可使用。Vue、Element Plus、GoJS、XLSX、Leaflet、地图脚本、州郡几何和水系数据均已放入本目录；在线底图仍可在联网时启用，断网时不会影响职官谱数据与本地州郡图层加载。

## 目录

- `index.html`：本地稳定版入口。
- `data/map-period-registry.json`：九期地图唯一注册表。
- `data/historical-audit.json`：机器可读的逐期史实审校。
- `data/asset-manifest.json`：本地资源大小与 SHA-256 完整性清单。
- `docs/九期地图史实审校.md`：人工查阅版审校记录。
- `assets/map/`：地图程序、Leaflet、州郡几何与水系。
- `assets/vendor/`：页面运行依赖。
- `scripts/`：资源下载、注册表构建与完整性验证脚本。

## 九期保护规则

以下节点均为必需项并按固定顺序加载：184、190、200、208、220、228、263、266、280。若注册表缺项、重复、乱序，页面会明确报错并停止载入历史地图。

根目录原有的 `三国职官谱 .html` 继续作为便携单文件导出版保留，不被项目版覆盖。

## 验证

在项目上级目录执行：

```bash
node 三国职官谱项目/scripts/build-local-data.mjs
node 三国职官谱项目/scripts/verify-project.mjs
node 三国职官谱项目/scripts/verify-map-data.mjs
```
