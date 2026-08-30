# 观史台私密网站

本仓库同时保存观史台的版本化规范源与私密 Sites 壳层。`atlas/` 是历史数据、读者投影和资源清单的唯一规范输入；`public/legacy` 是构建生成物，不得手工编辑或提交。

## 发布边界

- 站点复用既有 owner-only Site，不新建站点、不扩大访问范围。
- 线上包只能包含读者投影；工作簿行号、检索日志、审校状态、来源摘录和本机路径不得进入部署产物。
- 图片剪枝和缩放完成后重新生成 `dist/deployment-manifest.json`，清单逐项记录最终字节数和 SHA-256。
- 形势图的 16 期、几何、图层与稳定 ID 由规范源验证锁定。

## 唯一流程

```bash
npm run release:check
```

该命令依次完成：

1. 在规范源执行确定性全量构建和当前不变量验证；
2. 按 `reader-bundle.json` 同步纯净读者包；
3. 执行站点静态检查；
4. 构建、剪枝并校验最终部署清单。

常用的分步命令：

```bash
npm run sync:reader
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

要求 Node.js `>=22.13.0`。
