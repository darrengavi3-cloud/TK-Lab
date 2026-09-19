# 州镇表 V2：失败定位与合并后修复

核对日期：2026-09-19。范围：TK-Lab 的 PR #23、合并后的 main 及后续修复分支。人工视觉与真实 iPhone 验收均未完成。

## 已核对的仓库事实

| 对象 | 精确提交／运行 | 结果 |
| --- | --- | --- |
| 首次失败 | `f8913a697a0b39cc1918bf070fe910f713a37deb`；[run 35386040817](https://github.com/darrengavi3-cloud/TK-Lab/actions/runs/35386040817) | reader-visual 34/38；offline-validation 失败 |
| 最终 PR head | `c6db19c81dd37f3d0456cb63083208e8ba0a5daa`；[run 35410599776](https://github.com/darrengavi3-cloud/TK-Lab/actions/runs/35410599776) | reader-visual 35/38；offline-validation 失败 |
| 合并后的 main | `cd2fb66edfb63c406bfed415a77acbfd6e7ef9ce`；[run 35410711617](https://github.com/darrengavi3-cloud/TK-Lab/actions/runs/35410711617) | 两个工作均失败 |

[PR #23](https://github.com/darrengavi3-cloud/TK-Lab/pull/23) 已于 2026-09-19 00:50:30 UTC 合并，已关闭且不再是 draft。最终 head 和合并提交共用 tree `3d063906af9eb0ef163792cc0c7a2e67a08ab2a9`。旧提示中的 draft、可合并及 f8913a6 不再是当前状态。

## 失败原因与修复

1. **最初的运行时异常已由原 PR 修复。** 首次 reader-visual 日志报 `Cannot read properties of undefined (reading 'SGZ_UI_MODULES')`，来自 Vue 模板直接引用未暴露的 `window`。`5c95d5c` 将职权显示移至 setup 函数；`9a5d64a` 对辖境分区做相同处理。最终失败已经是按钮尺寸告警，不应再次把它归为同一运行时异常。
2. **分区按钮尺寸触发几何门禁。** 最终 head 在两个 1440px 阅读场景和 1280px 审校场景均报“短标签按钮竖排”，对象为 `职任`，32×42px。该门禁依据按钮与字号的几何比例判定，日志本身不是实际字形换行的证明。修复复用 `--sgz-touch-target`，令分区按钮至少 44×44px、水平内边距 12px、文字不换行且不受 flex 压缩；补齐悬停和可读的 `aria-pressed` 状态。保留原门禁和阈值。
3. **源锁与已合并的三项规范输入不一致。** `atlas/assets/app/fangzhen.js`、`atlas/assets/ui/modules.css`、`atlas/index.html` 在原 PR 中发生变化，但 `atlas/sources.lock.json` 未刷新。审查差异后显式运行 `node atlas/scripts/build-all.mjs --refresh-lock` 和 `npm run sync:reader`，同时重建资源清单、规范源锁镜像及读者包摘要。未删除锁校验、未加入 CI 自动 refresh、未修改史料审定记录。
4. **V2 URL 更新监听遗漏。** `duty` 和 `section` 已有序列化、恢复逻辑，两个 ref 却未接入 URL 监听。处于第一页且未改变选中项时，点击军政视图／分区可能不更新地址。新增监听复用 `scheduleUrlState('replace')` 及其恢复期间保护，与既有筛选历史行为一致；不新增平行路由实现。

## 验证范围

新增 390／1280／1440px 浏览器回归，实际点击军事、行政、综合与治所分区，核验网址写入、刷新恢复、键盘 Enter 返回职任、选中状态、正文不硬切、页面不横溢和分区按钮尺寸／单行文字。移动视口是 Chromium 模拟，不是 iPhone。

本地 `npm run release:offline` 已完整通过：确定性双构建、规范数据校验、类型检查、lint、生产构建和 121 项应用测试。另有 69 项源码测试、18 项隔离 Worker 探测及上述三项新增浏览器回归通过；Premium strict 静态审计无发现。[机器可读记录](../release-metadata/fangzhen-v2-validation.json)保留命令、输入摘要与本地限制；远程结果见下表。lint 为 0 错误、3 条既有 unused eslint-disable 警告。

本地没有中文字体，安装系统浏览器依赖受权限限制；默认完整 Chromium 启动还受到 Unix socket 限制。已安装的无头 Chromium 可执行交互测试，但本地字体回退导致通用几何门禁额外报告“设置”等按钮。因此正式自动布局结果使用 GitHub workflow 的 `playwright install --with-deps chromium` 环境；不据本地字体结果改动其他模块或降低阈值。

## GitHub CI 回执

修复提交 `d0002b7eaac7443a7b8e95d3de51df0c91918fab`（tree `1ec6f1803669ae3dfe93c04c0d0a17b18c1b867d`）的 [Reader validation 35412522242](https://github.com/darrengavi3-cloud/TK-Lab/actions/runs/35412522242) 于 2026-09-19 01:27:21 UTC 完成，两个工作均成功。

| 工作 | 实际验证 | 结果 |
| --- | --- | --- |
| reader-visual，job 105814789719 | 41 项浏览器测试、7 项引用解析测试、库内一致性报告 | 通过 |
| offline-validation，job 105814789921 | 确定性双构建、24 项不变量测试、类型／lint／构建、121 项应用测试 | 通过 |
| 同一 offline-validation 的最后两步 | 18 项隔离 Worker 探测；规范源与提交投影无漂移 | 通过 |

一致性报告仍列出 14 条启发式候选，未视为确认错误，未自动改写史料或提升审定状态。上述浏览器矩阵是 workflow 的代表性组合，不等于完整三主题×三视口的人工验收。

## 就绪结论与未验证事项

**代码合并就绪：是，针对上述已验证的修复提交。完整产品验收：否。** [后续 PR #24](https://github.com/darrengavi3-cloud/TK-Lab/pull/24) 基于 main@cd2fb66e；GitHub 核对为可合并、无冲突，无未解决的审阅线程，但未记录人工批准。原 PR #23 无需再次合并；本轮未合并 PR #24。

本回执固定引用已通过验证的代码提交。此后只追加状态文档与回执；最新 head 的检查状态以 PR #24 对应运行链接为准，不把旧 head 的绿色结果冒作新提交 CI。

| 项目 | 状态／边界 |
| --- | --- |
| 后续修复自动门禁 | 上述代码提交两项工作均成功；PR #24 尚未合并 |
| 真实 iPhone Safari、触控、虚拟键盘与安全区 | **未验证** |
| 人工视觉验收、完整三主题×三视口验收 | **未验证**；自动尺寸与对比检测不能代替人工审阅 |
| 完整键盘／200% 缩放／辅助技术验收 | **未验证**；新增测试仅覆盖所述 Enter 操作 |
| 新鲜线上 owner-only 权限复核 | 本轮未执行，`release:access` 不由离线检查替代 |
| 州镇表 V2 的 Sites 部署及线上验收 | 本轮未执行，无新增部署回执 |
| 生产数据初始化、内容发布、回滚演练 | 本轮未操作 |

保存修订、发布阅读快照、合并代码、部署程序和验收是独立事件。本轮不回写第 45 版部署源码与历史回执，不提升 V86 数据审定基线。
