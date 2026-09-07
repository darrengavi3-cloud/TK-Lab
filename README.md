# 观史台私密网站

本仓库同时保存观史台的版本化规范源与私密 Sites 壳层。`atlas/` 是历史数据、读者投影和资源清单的唯一规范输入；`public/legacy` 是构建生成物，不得手工编辑或提交。

## 本分支：V80 任官续核第三批与身份撤回

`release-config.json` 集中声明源码版本、任官及人物身份批准批次；README 当前统计由规范源自动生成。研究层初检不会因新增文件或人物消歧而自动发布。V77 的外层主题同步、动态视口高度及96／192／384宽度WebP立绘（保留PNG回退）继续有效。

V78、V79两批共复核40条；本次续核第41—60条，批准13、排除5、待补核2。累计复核60／100，原225条已核履历保持不变，余40条初检及24人小传、州镇与金石待办继续留在研究层。

上一批留下的7个误抽人物已核清全部10条关联源任官，撤回人物卡与7项立绘引用，原图和源记录保留。当前人物2086、立绘512，下降原因及逐条审定见 [V80-REVIEW.md](V80-REVIEW.md)。人物撤回采用单条与完整关联集合双重摘要校验；其他新发现的身份合并与建档问题仍独立待审。

本分支不能据源码或本地测试推定已合并、已部署或已完成视觉验收。V80仅为本次源码版本，不表示整个计划或州镇地理轮已完成。实际CI与私密部署回执见 [PR #11](https://github.com/darrengavi3-cloud/TK-Lab/pull/11)；待完成阅读矩阵见 [V77-ITERATION.md](V77-ITERATION.md)，前批结果保留于 [V78-REVIEW.md](V78-REVIEW.md)、[V79-REVIEW.md](V79-REVIEW.md)。

## 已合并审定基线：V76

V76 已通过 [PR #10](https://github.com/darrengavi3-cloud/TK-Lab/pull/10) 于 2026-09-07 03:02:30 UTC 合入 `main`，合并提交为 [`23c6d8b`](https://github.com/darrengavi3-cloud/TK-Lab/commit/23c6d8b3fb2d35c1efb3f5fbc9f5d3cd9b9f2c03)。该基线任官已核 197／待补核 601／存疑 2／排除 51；本分支续核后的当前数字如下，不回写为 V76 的历史结果。

## 当前分支审定结果

<!-- current-reviewed-counts:start -->
| 项目 | 当前审定数量 |
| --- | ---: |
| 读者人物 | 2086 人 |
| 任官已核 | 238 条 |
| 任官待补核 | 546 条 |
| 任官存疑 | 2 条 |
| 任官排除 | 65 条 |
| 实质小传 | 96 篇 |
| 正式立绘 | 512 项 |
<!-- current-reviewed-counts:end -->

统计依据为[审定状态台账](atlas/data/v73-review-status-ledger.json)、[读者人物数据](atlas/data/v63-reader-people.json)和[读者包清单](release-metadata/reader-bundle.json)，V76 基线与本批增量分别见 [V76 审阅说明](V76-REVIEW.md)及 [V80 审阅说明](V80-REVIEW.md)。沿用旧版本号的文件名不代表数据仍停留在旧版本。任官共 851 条；待补核、存疑及已排除记录不进入确定履历与确定性统计，人物身份通过也不自动放行任官、州镇或金石事实。

## V76 更新摘要

- 核准现有《三国志》卷 32—45 抽取中最后两条未审任官：刘备领司隶校尉归回本人，保留刘璋推领性质；吴壹车骑将军按建兴十二年核准。处理范围仅指现有抽取记录，不表示相关卷次的全部史事已完成校勘。
- 补明蒋琬尚书令（234）、大将军（235），费祎大将军（243），姜维初授大将军（256）的年份；蒋琬延熙二年大司马的跨卷重复记录合并为一条事实、两处证据。
- 新增蒋琬、费祎、姜维、董允、吕乂的 37 条职任；未知始任年保留空值，董允摄守性质保留，姜维初授、贬职行事与复拜分别呈现。
- 新增董允、吕乂小传，纠正蒋琬、费祎旧传的继政年代。V73 新增的 100 幅立绘及人物绑定全部保留；“安国”及 V75 清理的五个误抽取实体继续排除。

逐条范围与原典输入见 [V76-REVIEW.md](V76-REVIEW.md)；此前府署续核与伪人物清理见 [V74-REVIEW.md](V74-REVIEW.md)、[V75-REVIEW.md](V75-REVIEW.md)。小传为有原典依据的文言撰述，不冒充古籍原文；原典引文为定位节引，省略处明标，不冒充全卷校录。

## 发布边界

- 站点复用既有 owner-only Site，不新建站点、不扩大访问范围。
- 线上包只能包含读者投影；工作簿行号、检索日志、审校字段和本机路径不得进入部署产物。公开原典引文仅允许 `citations` 中的 title/url/quote/note，独立于研究台账。
- 审定更正必须匹配此前的完整审定摘要；小传更正必须匹配现存旧文及更正内容摘要，不能凭同一记录 ID 静默覆盖。旧文、被替代审定、证据和更正理由保留在研究层；读者层只投影更正后的正文和原典，不携带研究运行字段。
- 图片剪枝和缩放完成后重新生成 `dist/deployment-manifest.json`，清单逐项记录最终字节数和 SHA-256。
- 形势图的 16 期、几何、图层与稳定 ID 由规范源验证锁定。

## 唯一流程

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

任官审定以 `atlas/data/v71-appointment-review.json` 为基础，续接 V74、V75、V76、V78、V79、V80 的 `appointment-source-review`，以及 V74—V76 的 `appointment-supplements`；批准清单以 `release-config.json` 为准。人物身份批准批次同样由该清单显式声明；撤回前核清全部关联，新增关联须重新审核。原典依据保存在各批次的 `citations` 或 `chancellery-evidence`。修改原始行后必须重新核定，不能仅凭人物消歧状态恢复发布。V76 小传新增与更正分别保存于 `atlas/data/v76-person-biography-review.json`、`atlas/data/v76-person-biography-corrections.json`。阅读与交互规范见 `atlas/DESIGN.md`、`atlas/UX-CONTRACT.md`。

要求 Node.js `>=22.13.0`。

Cloudflare runtime 型别由锁定版本 Wrangler / workerd 根据实际构建配置生成并提交。完成构建后可运行 `npm run types:generate` 刷新；`npm run typecheck` 不需要连接 Cloudflare。D1 保持可选绑定，并保留缺少绑定时的运行时检查。
