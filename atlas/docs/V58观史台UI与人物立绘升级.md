# 观史台 V58：V57 壳层内的整体 UI 与人物立绘升级

## 范围

V58 继承 V57 顶栏、模块脊柱、上下文栏、证据案卷、统一检索与移动端导航。本轮只调整内容层视觉、信息密度、详情面板与响应式表现，不修改形势图几何、时期、图层、配色或历史数据口径。

统一视觉识别采用“证据脊线”：记录标题、来源定位、证据等级与审校状态沿同一视觉轴排列；状态以文字与颜色同时表达。所有立绘均标注为界面识别立绘，不作为史实肖像或历史证据。

## 模块交付

- 职官谱：保留朝堂／表格，强化选中官位后的证据层、沿革和人物关联呈现。
- 人物记：详情显示默认档案／活动源范围、来源卷覆盖、任官时间线与立绘边界。
- 战事纪：编年、交战方、战役链三种组织方式保留；舒展／紧凑控制时间线可见高度、行距与摘要长度；缺坐标证据的战场显示“坐标来源待补”。
- 州镇表：保留国家档案、职任、快照与对比结构，分离任期、辖区、委任和证据状态。
- 金石录：增加来源范围与释文状态筛选；列表直接显示“释文已录入”“源文未见释文”“残缺释文”“待校释文”等状态，不补写推测性释文。
- 食货志：保留制度／编年／户口物价互斥视图，明确统计口径与不可比记录不进入比例图。

## V58 立绘资源

20 个最终生产资源为 V48 的 16 个 `designOnly` 条目转正式资源，加上按稳定 `personId`、可见性、来源覆盖与跨模块关联规则筛选的 4 个现有人物记录：郗鉴、桓温、刘寔、刘裕。四人不进入默认人物档案，不新增人物实体。

资源源文件为 `data/v58-portrait-board.js`，生产 manifest 由 `scripts/build-v46-portrait-manifest.mjs` 生成，统一状态为：

```text
status: ready
interfaceOnly: true
designStatus: figma-design
designRef.fileKey: gvWRC5GHHSgd8QX9b2VJgo
designRef.version: V58
```

## Figma 状态

沿用文件 `gvWRC5GHHSgd8QX9b2VJgo` 的要求已写入规范源与运行时 manifest；本轮实际调用 Figma MCP 时受到 Starter 计划工具额度限制，未能写入 V58 页面、组件或节点定位信息。因此不伪造 nodeId，`designRef` 只保留文件 key、版本、顺序和角色，节点定位待 Figma 工具额度恢复后补录。

## 重建与验证

```bash
node scripts/build-v46-portrait-manifest.mjs
node scripts/build-asset-manifest.mjs
node scripts/build-portable-export.mjs
node scripts/verify-v58.mjs
```

V58 验证固定检查：20 个资源、资源路径和方形 PNG、稳定 ID、界面资产边界、Figma 版本映射、509 人、766 条任官和 123 个默认人物档案不变。
