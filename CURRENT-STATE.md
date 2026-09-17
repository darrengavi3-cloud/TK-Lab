# 观史台当前状态

> 本页是观史台当前产品、数据、部署与验收状态的唯一入口。TK-Lab 仓库级 `main` 的后续改动单独记录；历史版本说明保留事实记录，但不得覆盖现行产品口径。

文档与仓库核对日期：2026-09-17。该日期只表示本次文档校准与仓库整理，不更新下列部署、权限或验收的发生时间。

## 观史台产品与部署基线

| 维度 | 当前值 | 含义 |
| --- | --- | --- |
| 规范数据快照 | V86 | 表示当前审定数据与构建输入的版本，不表示线上已部署 |
| 改进工作流 | R0 状态收口；R1 阅读连续性 | R 编号只表示产品改进工作，不改写历史数据版本 |
| R1 开发起点（历史） | `main@63f9964484bc2ef53825caf5aefa99abcf0f6d27` | 仅用于追溯 R1 开发开始时的冻结基线 |
| R1 产品合并基线 | [`4f8c8c92`](https://github.com/darrengavi3-cloud/TK-Lab/commit/4f8c8c9209076a89fed2d917ffac8ffcc58b9182) | `codex/r1-reader-continuity` 已通过 PR #15 合并 |
| R1 发布记录基线 | [`2617c69b`](https://github.com/darrengavi3-cloud/TK-Lab/commit/2617c69b61ec7387da919309b53f2dab8e609a67) | 2026-09-12 将第 43 版部署回执与已验证清单记入 Git；Sites 发布源码另见下方回执 |
| 部署 | 第 43 版已部署成功，2026-09-12 12:47 UTC | 合并、构建成功和部署是三个独立事件 |
| 访问边界 | 沿用既有 owner-only 私密站点 | 保留 R1 发布时的权限事实；本次仓库整理不产生新的权限复核结果 |
| 浏览器／真机 | 待验收 | R1 CI 浏览器回归 35/35 通过；真实 iPhone、完整键盘、200% 缩放、网络／性能测量、线上回滚及最终线上页面验收仍待办 |

## 仓库 main 的后续改动

本次校准及移除旧副本前，核对的 `main` 快照为 [`f170c8914d2694947fc99591dab9b94a8a4fa02e`](https://github.com/darrengavi3-cloud/TK-Lab/commit/f170c8914d2694947fc99591dab9b94a8a4fa02e)，提交时间为 2026-09-13 10:18:35 UTC。它是仓库核对快照；观史台产品与部署仍按上表记录。仓库后续最新提交以 [`main` 提交历史](https://github.com/darrengavi3-cloud/TK-Lab/commits/main/)为准。

| 时间（UTC） | 仓库事件 | 范围与产品影响 |
| --- | --- | --- |
| 2026-09-13 06:44:30 | [PR #16](https://github.com/darrengavi3-cloud/TK-Lab/pull/16)，合并提交 `13e3bf07` | 新增独立 Umi-OCR／Sumi-OCR 源码增强，位于 `tools/umi-ocr/` |
| 2026-09-13 10:18:35 | [PR #17](https://github.com/darrengavi3-cloud/TK-Lab/pull/17)，合并提交 `f170c891` | 继续补充离线模型、校对及 macOS 适配，仍只涉及 `tools/umi-ocr/` |
| 2026-09-17 | 本次文档校准与旧副本移除 | 删除已由 TK-Laby 承接的 148 个 Sumi-OCR 跟踪文件，校准本页与 README；观史台应用、规范数据和发布回执保持原样 |

从 R1 发布记录提交 `2617c69b` 到核对快照 `f170c891` 的[完整比较](https://github.com/darrengavi3-cloud/TK-Lab/compare/2617c69b61ec7387da919309b53f2dab8e609a67...f170c8914d2694947fc99591dab9b94a8a4fa02e)共 6 个提交、148 个新增文件，全部属于 `tools/umi-ocr/`。这段仓库进展没有新增观史台数据审定、R 轮次、部署或验收。

Sumi-OCR 此后由 [TK-Laby 的对应目录](https://github.com/darrengavi3-cloud/TK-Laby/tree/main/tools/umi-ocr)维护，TK-Lab 当前树中移除旧副本，历史提交保留。移除前逐文件对照 `TK-Lab@f170c891` 与 [`TK-Laby@c0a216275dcce98ecd15bdb84f60c384b8c553fb`](https://github.com/darrengavi3-cloud/TK-Laby/tree/c0a216275dcce98ecd15bdb84f60c384b8c553fb/tools/umi-ocr)：148 个文件全部存在，146 个 Git blob 完全一致，全部文件模式一致；外层 README 仅增加迁移／交付入口并调整运行仓库名，`SOURCE.json` 保留全部 142 个原始 overlay 摘要并增加一项后续源码记录。原有 17 个 Release 交付附件仍存在；历史下载回验见 [TK-Laby 迁移回执](https://github.com/darrengavi3-cloud/TK-Laby/blob/c0a216275dcce98ecd15bdb84f60c384b8c553fb/tools/umi-ocr/migration/remote-delivery.json)。本次仅清理 Git 跟踪副本，不涉及用户设备上的未跟踪资料或运行环境。

## 现行产品默认

- 州镇表默认显示读者投影中的全部公开记录，包括带“待审”标识的候选记录；“仅已核”是用户主动缩窄范围。
- “清除筛选”恢复上述默认，不得把“仅已核”作为隐藏默认。
- 全局检索在计算结果前加载目标案卷；冷启动不得用尚未载入的数据生成“0 条结果”。
- 检索结果按稳定 ID 打开目标记录并写入 URL，不得退化为标题或姓名的二次检索。
- 阅读态与审校态继续分层；读者投影可见不等于史实核定，状态文字必须保留。
- 主导航保持职官谱、人物记、州镇表、金石录；其他案卷保留在“更多案卷”。

## 状态变更规则

1. 数据审定变化才提升 V 版本；产品可靠性工作使用 R 编号。
2. PR 建立、CI 通过、合并、部署、权限复核、真机验收分别记录，不相互代替。
3. 新一轮开始先更新本页，再更新 README 摘要；分别注明观史台产品基线、仓库核对快照与实际部署回执，历史 REVIEW 文件不回写成“当前状态”。
4. 非观史台提交、文档校准与目录迁移只更新仓库状态；不得据 `main` 前进自动提升 V／R 版本、部署版号或验收结论。
5. 文档核对日期与提交日期单独记录，不能替代部署完成时间、权限检查时间或真机验收时间。
6. 若现行契约与历史契约冲突，以本页和 `atlas/UX-CONTRACT.md` 顶部的“现行覆盖条款”为准。

## R1 第 43 版发布回执（2026-09-12）

- PR #15 合并提交：`4f8c8c9209076a89fed2d917ffac8ffcc58b9182`。
- Sites 发布源码：`d7800effea513f12aa89c69aabdbaf44cdce0e26`；应用源码逐项核对合并树一致，另包含发布状态文字、新鲜权限快照与重建部署清单。
- 第 43 版，部署状态 `succeeded`；站点：[观史台私密站点](https://zhiguanpu-private.darrengavi3.chatgpt.site)。
- 正式 release:check 通过：确定性双构建、20 项不变量、类型检查、lint（3 条既有警告）、86/86 应用测试、2/2 新鲜权限门禁；10 项 Worker 运行时探测通过。
- R1 CI 浏览器回归针对 atlas 源码；R1 发布时未新增最终线上页面、真实设备或完整无障碍验收，本次仓库整理亦不改变这些结论。
- 发布详情见 [release-metadata/r1-deployment.json](release-metadata/r1-deployment.json)，精确完成时间为 `2026-09-12T12:47:06.099127+00:00`。该回执及原部署清单保持不变；本次文档校准不构成新部署。

## 管理後台重構草稿（未部署）

擁有者已選定後台編輯、匯入、修訂及統一發布的維護方式。本重構分支先加入人物／任官／史料契約、修訂與發布核對規則、唯讀遷移器；目前仍無可用後台、資料庫寫入或新部署。資料權威繼續為 atlas，產品部署仍按上列第 43 版紀錄。

實作範圍、環境中斷與尚未完成事項見 [資料核心重構紀錄](docs/catalogue-refactor.md)。本節是開發進度，不提升 V／R／Sites 版本，也不表示正式遷移或驗收完成。
