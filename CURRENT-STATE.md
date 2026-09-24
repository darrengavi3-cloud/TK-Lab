# 观史台当前状态

> 本页是观史台当前产品、数据、部署与验收状态的唯一入口。TK-Lab 仓库级 `main` 的后续改动单独记录；历史版本说明保留事实记录，但不得覆盖现行产品口径。

仓库核对日期：2026-09-24；下方第 45 版产品／部署表核对日期仍为 2026-09-17。各次仓库整理、重构、权限复核、部署与验收分别记时，历史回执不回写。

## 2026-09-24 仓库进展与线上边界

- `main@203287fa01ac5c5be5b78dc2a410b55710070faa` 已合入 PR #25，包含 V87／V88 界面及仓库清理、V90 人物总表导入和 V91 人物记／战事纪／金石录等界面覆核。V91 见 `atlas/DESIGN.md` 与 `atlas/UX-CONTRACT.md`，并非独立的站点部署回执。
- V90 的 Git 规范输入现有 3,621 位读者人物（从 2,074 位净增 1,547 位）；任官为已核 263、待补核 507、存疑 2、排除 79，小传 101、立绘 500。新增人物依用户当轮决定允许史源与原文节引齐全但缺网址；这批未逐项完成第二来源交叉核查。此处是仓库数据口径，不能推断线上阅读快照已更新。
- `main` 的 PR #25 head Reader validation `35939405522`：offline-validation 成功，reader-visual 31/34，通过以外的三项均为州镇「职任」按钮在 1440px 双主题及 1280px 审校视图竖排。PR #24 有针对性修复，但旧分支当前不可直接合并；修复需在现行 `main` 重新验证。
- 下表第 45 版仍是仓库内最后一份明确成功的 Sites 部署回执；此处未作新的线上权限、首次初始化或内容发布核验。真实 iPhone 与完整人工视觉验收仍未验证。仓库合并、CI 与站点部署各自独立。

### 2026-09-24 州镇表修复候选（尚未合并或部署）

从上述 `main` 建立 `codex/fangzhen-main-validation-20260924`，移植 PR #24 仍适用的分区按钮触控面积、禁止竖排、选中语义及视图 URL 监听，并为 V91 后拆出的州镇工作台接通遗漏的 `state-update` 事件；同时处理全量浏览器门禁发现的职官分段按钮与设置按钮短标签尺寸。新增 390／1280／1440px 切换、键盘与刷新回归。规范源锁和读者资源清单显式重建。

本地 `npm run test:visual` **37/37 通过**；`npm run release:offline`（确定性构建、规范验证、typecheck、lint、站点构建及 **110/110** 应用测试）通过。此为候选分支本地验证，仍需 GitHub 新 head 的 CI 与合并状态；不等于 Sites 部署、生产权限核验、真实 iPhone 或人工视觉验收。

## 觀史台當前產品與部署

| 維度 | 當前值（2026-09-17 核對） | 邊界 |
| --- | --- | --- |
| 產品 | 管理後台與任官閱讀關聯 | 一份任官修訂同步到人物履歷、明確選定的官職任職者及州鎮條目；全部領域重構尚未完成 |
| Sites 程式部署 | **第 45 版，succeeded，2026-09-17 16:53:14 UTC** | [獨立部署回執](release-metadata/catalogue-links-deployment.json)；第 43 版 R1 與第 44 版後台一期回執保留 |
| 實際部署源碼 | `5997a4155915a2bce8c6aecc01cdf994472516db` | 與 GitHub 實作提交 `36048c399290abc7e3950d113a6fbbf5e7788fe4`、本期合併提交的 tree 完全一致 |
| 資料來源基線 | V86，2,074 位讀者人物、263 條已核任官 | 用於遷移核對；不以程式部署提升 V／R 或更改史實審定 |
| 生產工作資料 | 本次部署未初始化 D1 工作資料 | 首次擁有者登入 `/admin`，按「載入既有資料」；初始化不自動發布 |
| 閱讀內容 | 首次後台發布前沿用 V86 既有投影 | 保存修訂、切換閱讀快照、Sites 程式部署分開記錄 |
| GitHub `main` 本期合併基線 | `0689a8a3de5a48610a778094be2a44ebe7f6bbd7` | [PR #19](https://github.com/darrengavi3-cloud/TK-Lab/pull/19) 已合入；Sumi-OCR 保持移除，後續回執提交不替換實際部署源碼 |
| 存取權限 | owner-only，2026-09-17 16:36 UTC 複核 | 第 45 版沿用既有私密站點，環境修訂 1 |
| 本地及隔離驗證 | 119 項應用測試、37 項瀏覽器回歸、18 項 Worker 探測通過 | [驗收紀錄及未驗事項](release-metadata/catalogue-links-validation.json)；包含後台 390px／1280px 表單，不等於生產首次登入或真機驗收 |
| GitHub CI | [Reader validation](https://github.com/darrengavi3-cloud/TK-Lab/actions/runs/35248889983) 兩個工作均成功 | 針對 PR 提交 `36048c39`；[CI 與合併回執](release-metadata/catalogue-links-ci.json)分開記錄 |

入口：[管理後台](https://zhiguanpu-private.darrengavi3.chatgpt.site/admin) · [閱讀版](https://zhiguanpu-private.darrengavi3.chatgpt.site)。後台初始化後，人物身份、任官與引用史料的工作修訂由 D1 維護；明確關聯的官職任職者與州鎮條目共享任官修訂。未接管領域及官職制度仍使用 atlas。當次發布數量以後台固定閱讀快照為準。

本期第 45 版更新了運行程式；部署後補入的文檔與回執只更新倉庫記錄。`main` 後續前進不改變上列實際部署源碼 SHA，也不自動提升 V86／R1。第 44 版後台一期另見[歷史回執](release-metadata/catalogue-deployment.json)。

## R1 歷史產品與部署基線（固定記錄）

| 维度 | R1 当时值 | 含义 |
| --- | --- | --- |
| 规范数据快照 | V86 | 表示该轮审定数据与构建输入的版本 |
| 改进工作流 | R0 状态收口；R1 阅读连续性 | R 编号只表示产品改进工作，不改写历史数据版本 |
| R1 开发起点（历史） | `main@63f9964484bc2ef53825caf5aefa99abcf0f6d27` | 仅用于追溯 R1 开发开始时的冻结基线 |
| R1 产品合并基线 | [`4f8c8c92`](https://github.com/darrengavi3-cloud/TK-Lab/commit/4f8c8c9209076a89fed2d917ffac8ffcc58b9182) | `codex/r1-reader-continuity` 已通过 PR #15 合并 |
| R1 发布记录基线 | [`2617c69b`](https://github.com/darrengavi3-cloud/TK-Lab/commit/2617c69b61ec7387da919309b53f2dab8e609a67) | 2026-09-12 将第 43 版部署回执与已验证清单记入 Git；Sites 发布源码另见下方回执 |
| 部署 | 第 43 版已部署成功，2026-09-12 12:47 UTC | 合并、构建成功和部署是三个独立事件 |
| 访问边界 | 沿用既有 owner-only 私密站点 | 保留 R1 发布时的权限事实；本期权限复核单列于上方 |
| 浏览器／真机 | 待验收 | R1 CI 浏览器回归 35/35 通过；真实 iPhone、完整键盘、200% 缩放、网络／性能测量、线上回滚及最终线上页面验收仍待办 |

## 仓库 main 的后续改动

本次校准及移除旧副本前，核对的 `main` 快照为 [`f170c8914d2694947fc99591dab9b94a8a4fa02e`](https://github.com/darrengavi3-cloud/TK-Lab/commit/f170c8914d2694947fc99591dab9b94a8a4fa02e)，提交时间为 2026-09-13 10:18:35 UTC。它是仓库核对快照；观史台产品与部署仍按上表记录。仓库后续最新提交以 [`main` 提交历史](https://github.com/darrengavi3-cloud/TK-Lab/commits/main/)为准。

| 时间（UTC） | 仓库事件 | 范围与产品影响 |
| --- | --- | --- |
| 2026-09-13 06:44:30 | [PR #16](https://github.com/darrengavi3-cloud/TK-Lab/pull/16)，合并提交 `13e3bf07` | 新增独立 Umi-OCR／Sumi-OCR 源码增强，位于 `tools/umi-ocr/` |
| 2026-09-13 10:18:35 | [PR #17](https://github.com/darrengavi3-cloud/TK-Lab/pull/17)，合并提交 `f170c891` | 继续补充离线模型、校对及 macOS 适配，仍只涉及 `tools/umi-ocr/` |
| 2026-09-17 | `7b8d0399` 文档校准与旧副本移除 | 删除已由 TK-Laby 承接的 148 个 Sumi-OCR 跟踪文件；该次提交未改动观史台应用、规范数据和部署回执 |
| 2026-09-17 | PR #18 管理後台一期 | 觀史台產品改動；以独立 Sites 源码部署第 44 版，PR 与 main 状态另计 |
| 2026-09-17 | PR #19 任官閱讀關聯 | 觀史台產品改動；部署第 45 版，三處投影由明確關聯的任官修訂統一產生；不更改既有史實審定版本 |

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
- 发布详情见 [release-metadata/r1-deployment.json](release-metadata/r1-deployment.json)，精确完成时间为 `2026-09-12T12:47:06.099127+00:00`。该回执保持不变；[当时的部署清单](https://github.com/darrengavi3-cloud/TK-Lab/blob/2617c69b61ec7387da919309b53f2dab8e609a67/release-metadata/deployment-manifest.json)保存在固定历史提交中，工作树中的同名清单随新建置更新。

## 第 44 版管理後台一期的實作與驗收範圍（歷史）

已實作人物／任官／史料後台、D1 不可變修訂、R2 原檔、CSV／Excel／JSON 暫存匯入、固定閱讀候選、確認發布與內容回退，以及備份核驗和空環境還原。隔離環境完成 4,336 筆基線遷移；29 項核心／遷移／儲存測試包含在 115 項應用測試內，全部通過。35 項既有閱讀端瀏覽器回歸通過。

第 44 版已部署成功。生產資料初始化與首次內容發布留給擁有者在後台操作；驗收新增的人物與任官只存在隔離環境。工作提交、內容快照與 Sites 程式部署分開記錄，不因此自動提升 V／R。

本期細節、資料權威及待遷移領域見 [資料核心重構紀錄](docs/catalogue-refactor.md)。全項目六階段遷移、真實設備及完整無障礙驗收尚未完成。

## 第 45 版任官閱讀關聯的實作與驗收範圍

後台可明確選擇官職位置、新增或接管同人物的州鎮條目；保存、候選預覽及內容發布沿用同一份任官修訂與固定史料引用。新增唯一約束攔截併發接管，未知／推定／未拜不進確定在任快照，撤回不恢復舊官職姓名。

4,336 筆遷移資料、523 條未接管州鎮基線及 11 條既有官職歷任逐項核對通過。33 項資料核心測試包含在 119 項應用測試中；37 項瀏覽器回歸包含兩個後台視口。隔離環境完成關聯保存、錯誤保留輸入、三處閱讀核對及統一發布，未向生產資料寫入驗收記錄。功能、權威與剩餘範圍見[任官閱讀關聯](docs/catalogue-reader-links.md)。
