# 观史台私密网站

本仓库保存观史台的版本化规范源与私密 Sites 壳层。`atlas/` 是观史台历史数据、读者投影和资源清单的唯一规范输入；`public/legacy` 是构建生成物，不得手工编辑或提交。

## 观史台当前产品：V86 数据，R0／R1 改进，第 43 版部署

当前规范数据快照仍为 V86；R0 状态收口与 R1 阅读连续性已合并并部署。V 表示数据审定版本，R 表示产品改进，第 43 版表示 Sites 部署，三者分别记录。观史台唯一当前状态入口见 [CURRENT-STATE.md](CURRENT-STATE.md)，本页仅作摘要；改动与验收边界见 [R1-REVIEW.md](R1-REVIEW.md)。文档与仓库核对日期为 2026-09-17，部署事实仍为 2026-09-12。

R1 从历史开发起点 `main@63f9964484bc2ef53825caf5aefa99abcf0f6d27` 修复全局检索冷启动、稳定 ID 详情跳转及州镇清除筛选默认，经 [PR #15](https://github.com/darrengavi3-cloud/TK-Lab/pull/15) 合并为 `4f8c8c92`，发布记录提交为 `2617c69b`。Sites 发布源码为 `d7800effea513f12aa89c69aabdbaf44cdce0e26`，第 43 版于 **2026-09-12 12:47 UTC** 部署成功（owner-only）；[原发布回执](release-metadata/r1-deployment.json)保持不变。真实 iPhone、完整键盘、200% 缩放、网络／性能测量、线上回滚及最终线上页面验收仍待办。

## 仓库 main 与 Sumi-OCR 迁出

本次校准及移除前核对的仓库 `main` 为 [`f170c891`](https://github.com/darrengavi3-cloud/TK-Lab/commit/f170c8914d2694947fc99591dab9b94a8a4fa02e)（2026-09-13 10:18:35 UTC）。R1 发布记录之后，PR #16／#17 及其分支共 6 个提交只新增了 `tools/umi-ocr/` 中的 148 个文件；[提交比较](https://github.com/darrengavi3-cloud/TK-Lab/compare/2617c69b61ec7387da919309b53f2dab8e609a67...f170c8914d2694947fc99591dab9b94a8a4fa02e)没有观史台产品改动。

2026-09-17 核对 TK-Laby 已保留全部 148 个文件后，本次提交从 TK-Lab 当前树移除 Sumi-OCR 副本，并校准本页与 CURRENT-STATE.md。Sumi-OCR 的源码、构建和交付请前往 [TK-Laby](https://github.com/darrengavi3-cloud/TK-Laby/tree/main/tools/umi-ocr)，逐文件核对范围见 [CURRENT-STATE.md](CURRENT-STATE.md)。本次整理保持观史台 V86、R0／R1、第 43 版部署及未验收事项不变。

仓库后续进度见 [`main` 提交历史](https://github.com/darrengavi3-cloud/TK-Lab/commits/main/)；以上 SHA 是带时间的核对快照，不作为滚动更新的仓库 HEAD。以下 V 系列段落保留各轮当时的开发、审定、PR 与部署事实，当前状态统一以上文及 CURRENT-STATE.md 为准。

## 历史修改：V84 工具栏、按钮与手机阅读

统一四个主板块的搜索、筛选计数与可移除条件；职官视图切换与查看在任人物分组；全局设置收纳审校与外观。桌面更多改用菜单，手机筛选采用底部面板，人物、州镇、金石、战事及食货详情采用全屏阅读与固定返回栏。保留历史资料和既有主题，记录见 [V84-REVIEW.md](V84-REVIEW.md)。

## 历史修改：V83 阅读结构与食货展示整理

主导航收为职官谱、人物记、州镇表、金石录，战事纪、食货志、形势图置于“更多案卷”。官品参考合并，在任人物归入职官谱，增加跨模块阅读返回；州镇默认显示已核资料，人物和金石增加面向正文的筛选。食货改为分页目录与来源详情，对五条展示问题逐项处理，保留规范原始资料。

本轮没有新增任官审定，也没有把待考记录升级为已核。实现、来源及待验收边界见 [V83-REVIEW.md](V83-REVIEW.md)。本轮保存版本，不执行新部署。以下 V82 内容是此前审定与验收历史。

## 历史修改：V82 任官续核第五批

V82复核冻结清单第81—100条：批准12、排除实任4、待补核4。累计100／100条均已实质复核，结论为批准66、排除25、待补核9；没有尚未复核的队列条目，但不代表100条全部获准或全库851条任官已核完。

核准何劭、刘暾的尚书左仆射完整官名，区分山简与高密王简、荀组西晋与东晋两次太尉；保留温羡领司徒及傅祗因足疾免拜礼的性质。张轨太尉、荀藩司空、刘琨司空、荀组东晋太尉按辞受或未拜证据排除实任。山涛司徒、荀藩留台太尉及荀组两条史料已支持但身份冲突未解的任官继续待补核。详见 [V82-REVIEW.md](V82-REVIEW.md)。

既有251条确定履历全部不变，人物2086、实质小传96、正式立绘512、封爵535条与59篇金石释文保持。人物身份与封爵不随任官审定增删；24人小传证据包、州镇、金石及身份待办继续留在研究层。V78—V81历史审定及V80的7个误抽身份撤回结果原样保留。

本次保存源码与审定记录，不执行新部署，PR #11保持draft。第36版V80仍为此前已成功部署版本，第37版V81已保存但未部署；本次版本与CI的实际回执见 [PR #11](https://github.com/darrengavi3-cloud/TK-Lab/pull/11)。V82在此指任官续核，不表示地理轮或阅读矩阵已完成。浏览器视觉、真机iPhone、性能测量与回滚演练仍未完成；CI、构建和历史部署成功均不替代这些验收。待办矩阵见 [V77-ITERATION.md](V77-ITERATION.md)。

2026-09-08 验收续办：已核对 V82 源码树、现有 CI／保存／历史部署回执和 owner-only 权限，完成 V80 本地源码恢复核验。两次预览均在页面加载前超时，72 个阅读组合、键盘／缩放、真实 iPhone、性能指标与线上回滚演练仍未验收；PR 继续保持 draft。详细结果和本次门禁终态见 [V82-ACCEPTANCE.md](V82-ACCEPTANCE.md)。

## 历史审定基线：V76

V76 已通过 [PR #10](https://github.com/darrengavi3-cloud/TK-Lab/pull/10) 于 2026-09-07 03:02:30 UTC 合入 `main`，合并提交为 [`23c6d8b`](https://github.com/darrengavi3-cloud/TK-Lab/commit/23c6d8b3fb2d35c1efb3f5fbc9f5d3cd9b9f2c03)。该基线任官已核 197／待补核 601／存疑 2／排除 51；后续续核形成的观史台当前统计如下，不回写为 V76 的历史结果。

## 观史台当前审定统计（V86 数据快照）

<!-- current-reviewed-counts:start -->
| 项目 | 当前审定数量 |
| --- | ---: |
| 读者人物 | 2074 人 |
| 任官已核 | 263 条 |
| 任官待补核 | 507 条 |
| 任官存疑 | 2 条 |
| 任官排除 | 79 条 |
| 实质小传 | 96 篇 |
| 正式立绘 | 500 项 |
<!-- current-reviewed-counts:end -->

统计依据为[审定状态台账](atlas/data/v73-review-status-ledger.json)、[读者人物数据](atlas/data/v63-reader-people.json)和[读者包清单](release-metadata/reader-bundle.json)，V76 基线与本批增量分别见 [V76 审阅说明](V76-REVIEW.md)及 [V82 审阅说明](V82-REVIEW.md)。沿用旧版本号的文件名不代表数据仍停留在旧版本。任官共 851 条；待补核、存疑及已排除记录不进入确定履历与确定性统计，人物身份通过也不自动放行任官、州镇或金石事实。

## V76 历史更新摘要

- 核准现有《三国志》卷 32—45 抽取中最后两条未审任官：刘备领司隶校尉归回本人，保留刘璋推领性质；吴壹车骑将军按建兴十二年核准。处理范围仅指现有抽取记录，不表示相关卷次的全部史事已完成校勘。
- 补明蒋琬尚书令（234）、大将军（235），费祎大将军（243），姜维初授大将军（256）的年份；蒋琬延熙二年大司马的跨卷重复记录合并为一条事实、两处证据。
- 新增蒋琬、费祎、姜维、董允、吕乂的 37 条职任；未知始任年保留空值，董允摄守性质保留，姜维初授、贬职行事与复拜分别呈现。
- 新增董允、吕乂小传，纠正蒋琬、费祎旧传的继政年代。V73 新增的 100 幅立绘及人物绑定全部保留；“安国”及 V75 清理的五个误抽取实体继续排除。

逐条范围与原典输入见 [V76-REVIEW.md](V76-REVIEW.md)；此前府署续核与伪人物清理见 [V74-REVIEW.md](V74-REVIEW.md)、[V75-REVIEW.md](V75-REVIEW.md)。小传为有原典依据的文言撰述，不冒充古籍原文；原典引文为定位节引，省略处明标，不冒充全卷校录。

## 观史台发布边界

- 站点复用既有 owner-only Site，不新建站点、不扩大访问范围。
- 线上包只能包含读者投影；工作簿行号、检索日志、审校字段和本机路径不得进入部署产物。公开原典引文仅允许 `citations` 中的 title/url/quote/note，独立于研究台账。
- 审定更正必须匹配此前的完整审定摘要；小传更正必须匹配现存旧文及更正内容摘要，不能凭同一记录 ID 静默覆盖。旧文、被替代审定、证据和更正理由保留在研究层；读者层只投影更正后的正文和原典，不携带研究运行字段。
- 图片剪枝和缩放完成后重新生成 `dist/deployment-manifest.json`，清单逐项记录最终字节数和 SHA-256。
- 形势图的 16 期、几何、图层与稳定 ID 由规范源验证锁定。

## 观史台发布检查流程

```bash
npm run release:check
```

该命令依次完成：

1. 在规范源执行确定性全量构建和当前不变量验证；
2. 按 `reader-bundle.json` 同步纯净读者包；
3. 执行 TypeScript 型别检查与站点静态检查；
4. 构建、剪枝并校验最终部署清单，执行应用测试；
5. 执行发布前的新鲜 owner-only 权限快照检查。

该命令不调用 Sites，也不修改站点权限；检查通过不等于实际部署或视觉／触控验收完成。

常用的分步命令：

```bash
npm run sync:reader
npm run typecheck
npm run lint
npm test
npm run test:source
npm run release:offline
```

发布前必须通过 Sites 权限检查，确认访问策略仍只允许当前所有者，并把不含个人信息的检查结果写入 `release-metadata/access-policy.json`。`release:check` 最后执行 `release:access`，快照超过 6 小时即阻断发布检查。日常 `test:source`／`release:offline` 只验证快照结构，不宣称当前线上权限有效；权限状态不明确时停止发布。

## V76 历史核对记录

本节以 2026-09-07 的 V76 合并提交为核对基准，区分仓库记录与实际发布结果。

| 环节 | 已核实范围 |
| --- | --- |
| 合并 | PR #10 已合入 `main`，合并提交见上文。 |
| 构建与测试 | PR #10 记录两次构建一致、19 项发布不变量、33 项应用测试、类型检查及正式构建通过；本次 README 同步未重跑完整发布检查。 |
| 实际部署 | 本次仅核对仓库，未独立核验 Sites 上 V76 的实际部署结果。PR 中的发布表述及已提交的部署清单不作为部署成功凭据。 |
| 视觉与触控验收 | 本次未执行浏览器视觉或触控验收，不据静态检查、运行时测试或合并状态标记为已完成。 |

[权限检查记录](release-metadata/access-policy.json)中的 `checkedAt` 是最近一次实际核对时点；时间、权限、部署与视觉验收分别记录，发布前仍须满足上述 6 小时有效期要求。

## 目录职责

- `atlas/`：版本化规范源、研究台账、生成器与长期不变量验证。
- `app/`：私密站壳层。
- `research/v77-iteration/`：未批准研究初检、来源调查及后续证据包，不属于读者构建输入。
- `scripts/sync-reader-bundle.mjs`：从规范源清单单向同步读者包。
- `scripts/prune-site-build.mjs`：部署剪枝、头像优化和最终清单生成。
- `release-metadata/`：随 Git 版本保存规范输入锁、读者清单与最终部署清单；不保存第二份站点文件。
- `tests/reader-boundary.test.mjs`：读者／审校数据隔离和首屏预算。
- `tests/deployment-integrity.test.mjs`：最终部署文件的尺寸与哈希闭合。
- `tests/reader-semantics.test.mjs`：任官主体与否定句、年代快照、跨模块跳转、网址同步和释文全文不变。

任官审定以 `atlas/data/v71-appointment-review.json` 为基础，续接 V74、V75、V76、V78、V79、V80、V81、V82 的 `appointment-source-review`、V81 的 `appointment-followup-review`，以及 V74—V76 的 `appointment-supplements`；批准清单以 `release-config.json` 为准。人物身份批准批次同样由该清单显式声明；撤回前核清全部关联，新增关联须重新审核。原典依据保存在各批次的 `citations` 或 `chancellery-evidence`。修改原始行后必须重新核定，不能仅凭人物消歧状态恢复发布。V76 小传新增与更正分别保存于 `atlas/data/v76-person-biography-review.json`、`atlas/data/v76-person-biography-corrections.json`。阅读与交互规范见 `atlas/DESIGN.md`、`atlas/UX-CONTRACT.md`。

要求 Node.js `>=22.13.0`。

Cloudflare runtime 型别由锁定版本 Wrangler / workerd 根据实际构建配置生成并提交。完成构建后可运行 `npm run types:generate` 刷新；`npm run typecheck` 不需要连接 Cloudflare。D1 保持可选绑定，并保留缺少绑定时的运行时检查。
