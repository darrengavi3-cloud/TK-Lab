# 观史台私密网站

本仓库同时保存观史台的版本化规范源与私密 Sites 壳层。`atlas/` 是历史数据、读者投影和资源清单的唯一规范输入；`public/legacy` 是构建生成物，不得手工编辑或提交。

## 发布边界

- 站点复用既有 owner-only Site，不新建站点、不扩大访问范围。
- 线上包只能包含读者投影；工作簿行号、检索日志、审校字段和本机路径不得进入部署产物。V71 的公开原典引文仅允许 `citations` 中的 title/url/quote/note，独立于研究台账。
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
4. 构建、剪枝并校验最终部署清单。

常用的分步命令：

```bash
npm run sync:reader
npm run typecheck
npm run lint
npm test
```

发布前还必须通过 Sites 权限检查，确认访问策略仍只允许当前所有者，并把不含个人信息的检查结果写入 `release-metadata/access-policy.json`。该记录超过 6 小时即阻断测试；权限状态不明确时停止发布。

## 目录职责

- `atlas/`：版本化规范源、研究台账、生成器与长期不变量验证。
- `app/`：私密站壳层。
- `scripts/sync-reader-bundle.mjs`：从规范源清单单向同步读者包。
- `scripts/prune-site-build.mjs`：部署剪枝、头像优化和最终清单生成。
- `release-metadata/`：随 Git 版本保存规范输入锁、读者清单与最终部署清单；不保存第二份站点文件。
- `tests/reader-boundary.test.mjs`：读者／审校数据隔离和首屏预算。
- `tests/deployment-integrity.test.mjs`：最终部署文件的尺寸与哈希闭合。
- `tests/reader-semantics.test.mjs`：任官主体与否定句、年代快照、跨模块跳转、网址同步和释文全文不变。

V71 的任官审定表为 `atlas/data/v71-appointment-review.json`；修改原始行后必须重新核定，不能仅凭人物消歧状态恢复发布。阅读与交互变更见 `atlas/DESIGN.md`、`atlas/UX-CONTRACT.md` 的 V71 条目。

要求 Node.js `>=22.13.0`。

Cloudflare runtime 型别由锁定版本 Wrangler / workerd 根据实际构建配置生成并提交。完成构建后可运行 `npm run types:generate` 刷新；`npm run typecheck` 不需要连接 Cloudflare。D1 保持可选绑定，并保留缺少绑定时的运行时检查。

V71 续修恢复六条早期已核、但未接入最终投影的金石释文，再据古籍补入吕君、刘镇南、王基、洛阳北界、大飨碑、修老子庙诏六条录文，当前为 56 条有释文、110 条缺文。异文与著录也进入读者详情和手机抽屉。当前 101 条任官通过发布审定，旧批次人物身份待核已收口，48 条保留在审校层。V62 的 2096 人基线保持不变，V71 有据增补三人，读者合计 2099 人；刘沈保留 ID 并核定为西晋。

本轮再为刘望之、王商、李兴、刘廙、桓阶、麋竺、杜微、黄权补写有原典依据的文言小传，共 78 篇实质小传。八篇新作按稳定人物 ID 单独审定，小传及引文共同锁定；已有 70 篇逐字不变，不改写为古籍原文。读者通过人物页原典区查看定位节引与完整来源。

本次依用户“继续深化，完成后合并并部署”的指示，在发布检查通过后合并并部署到既有私密站点；替代此前仅交付审阅分支的安排。浏览器预览此前未成功，本次静态和运行时测试不代表完成了实际视觉或触控验收。
