# 观史台组件重设计 — 实施记录

> 伴生文档：`docs/module-contract-baseline.md`（重构前基线）、`docs/component-naming-standard.md`（目标规范）
> 分支：`redesign-modules-unified`
> 基线提交：`cd2fb66`
> 起始日期：2026-09-21

---

## 〇、环境修复（必须先做，否则一切构建失败）

本次重设计动工前，先发现并修复了一个**阻断性环境缺陷**，它与 UI 无关但会使全部构建失败。

### 问题：CRLF 检出让构建直接报错

**症状**

```
Error: Missing canonical atlas definitions
    at readOfficeNodes (scripts/reader-reference-inputs.mjs:9:40)
```

**根因**

`scripts/reader-reference-inputs.mjs` 以**字面 `\n`** 作为锚点切分 `atlas/index.html`：

```js
const end = html.indexOf('/* =========================================================================\n   Vue App', start);
```

仓库**没有 `.gitattributes`**，而 Windows 上 `core.autocrlf` 默认为 `true`，导致检出时
整个工作树被转换为 CRLF。锚点中的 `\n` 因此永远匹配不到，`indexOf` 返回 `-1`，
构建在第一个调用点即抛出。

**为什么在 CI 上没暴露**：GitHub Actions 运行于 Linux，`core.autocrlf` 默认 `false`，
检出为 LF，锚点正常匹配。**这是仅在本机 Windows 开发环境出现的缺陷。**

**修复**

1. 新增 `.gitattributes`，锁定 `* text=auto eol=lf`，并对图片／字体声明 binary；
2. 本地设 `core.autocrlf=false`、`core.eol=lf`，重新检出。

`reader-reference-inputs.mjs` 本身**不改**——它是既有契约，且锚点写 `\n` 在 LF 仓库中是正确的。
修正换行符配置比修改构建脚本更符合"不变量优先"原则。

### 附带问题：工作区位于云盘同步目录

原工作区 `WPSDrive/…/tk-lab-src` 位于 WPS 云盘同步目录，导致：

| 现象 | 后果 |
|---|---|
| git 写入 `.git/refs/heads/<嵌套路径>` 后消失 | 分支引用丢失，`git log` 报"无提交" |
| `.git/index.lock` 反复残留 | `reset`/`checkout` 频繁被拒 |
| `npm ci` 耗时 21 分钟 | 开发迭代不可行 |

**处置**：迁移到 `C:\work\tk-lab`（本地非同步路径），工作区 `tk-lab-src` 保留为交付副本。
两处均为同一提交 `cd2fb66`、同一分支 `redesign-modules-unified`。

**补充：云盘副本的 git 索引曾被同步进程清空**

复检 `tk-lab-src` 时发现 `git ls-files` 返回 0，`git status` 显示 1,222 个文件为已暂存删除，
但磁盘上 1,207 个文件均在。另有 0 字节的 `.git/index.lock` 残留（15:30）。
**文件未丢失，仅索引丢失。** 处置：删除陈旧锁 → `git reset --mixed HEAD` → 恢复 1,171 个跟踪文件。

### 附带问题：工具链的真实依赖面远小于声明

完整 `npm ci` 在本机需 11—21 分钟且多次卡死。核实后确认**整条构建与测试链路只依赖一个外部包：`esbuild`**。
处置：绕开 npm，直接取 `esbuild@0.28.2` 与其 `@esbuild/win32-x64` 二进制包解包入 `node_modules`，
一次性解决依赖问题（详见基线文档 §9.1）。

### 附带问题：`public/legacy/` 缺失导致全新检出无法构建

`build:catalogue` 硬依赖 `public/legacy/data/v69-person-profiles.js`，而该目录被 `.gitignore:45` 排除、
且**不由 `build:atlas` 生成**（`build:atlas` 只写 `atlas/exports/`）。必须显式运行 `sync:reader`。
正确顺序见基线文档 §9.2。

---

## 一、阶段一：结构重构

**目标**：把 `atlas/index.html` 中 8 个模块的模板与视图逻辑分离为独立单元，
同时保持功能对等（全部测试通过）。

### 重要修正：模块并非集中在一处

逐行核实后推翻了「每个模块是一段连续模板」的初始假设。**每个模块散落在四条互不相邻的
`v-if` 条件链中**（工具栏条 / 筛选面板 / 模块主体 / 检视面板），四条链均以 `activeModule` 为判据，
全文共 30 处条件。因此**不能整体剪切粘贴**，必须按链逐段迁移，并保证四条链的模块分支同进同退。

详见 `docs/module-contract-baseline.md` §2.1。

### 实施顺序（一次一个模块，不得并行）

按**风险从低到高**排列。风险 = 条件分支数 × 主体行数 × 是否内嵌复合状态。

| 顺序 | 模块 | 条件数 | 主体行数 | 风险 | 状态 |
|---|---|---|---|---|---|
| 1 | shihuo 食货志 | 3 | 36 | 低 | 待做 |
| 2 | shiyuan 史源表 | 2 | 51 | 低 | 待做 |
| 3 | battle 战事纪 | 3 | 42 | 低 | 待做 |
| 4 | map 形势图 | 3 | 48 | 低（仅外框，逻辑冻结于 iframe） | 待做 |
| 5 | jinshi 金石录 | 3 | 65 | 中 | 待做 |
| 6 | people 人物记 | 3 | 73 | 中 | 待做 |
| 7 | fangzhen 州镇表 | 4 | 78 | 中高（双轴状态 + 内联样式） | 待做 |
| 8 | offices 职官谱 | **6** | ~747 | **高**（未用 `module-page`，分支最多） | 待做 |

**调整说明**：`shiyuan` 条件数最少（2），从第 4 位提到第 2 位作为更早的模式验证；
`map` 后移，因其主体虽短但涉及 iframe 引导（`historyMapBooted`），机制与其余模块不同。

### 每模块的验收动作

重构期使用实际可用的验证链（`lint` 对 `atlas/**` 不适用，见基线文档 §9.1）：

```bash
node atlas/scripts/build-all.mjs --refresh-lock    # 规范源确定性重建
node scripts/sync-reader-bundle.mjs                # 生成 public/legacy
node scripts/build-catalogue.mjs                   # 生成 server/generated
npx tsc --noEmit --incremental false               # 型别检查
node --test tests/*.test.mjs                       # 语义测试（基线 68/69）
```

全绿（且通过数不低于基线）后 `git commit`，再进入下一个模块。

---

## 二、阶段二：视觉重设计 + 命名统一

**目标**：收敛 171 个版本化类名（320 处），提取 6 个新共享组件，删除 7 个零引用归档样式。

依据：`docs/component-naming-standard.md`

### 命名收敛批次

| 批次 | 范围 | 唯一类名数 |
|---|---|---|
| B1 | 组件层统一（`sgz-*`） | ~30 |
| B2 | people 模块类名 | ~40 |
| B3 | jinshi 模块类名 | ~35 |
| B4 | fangzhen 模块类名 | ~22 |
| B5 | shiyuan / battle / shihuo | ~25 |
| B6 | offices 模块类名 | ~19 |

### 共享组件提取

6 个新增组件（`SgzModulePage` `SgzMasthead` `SgzMetricStrip` `SgzPagination` `SgzStatusLine` `SgzEmptyPanel`）
消除约 25 处模板重复。

### 归档样式删除

`v55.css` `v56.css` `v57.css` `v58.css` `v60.css` `v61.css` `v62.css`（2,817 行）

**删除前置条件**：全量核对零引用，包括 `tests/` 与 `scripts/` 中的字符串引用。

---

## 三、进度

- [x] 环境修复（`.gitattributes` + LF）
- [x] 基线契约文档
- [x] 命名规范文档
- [ ] 阶段一：8 个模块结构重构
- [ ] 阶段二：命名收敛 + 组件提取 + 归档删除
- [ ] 提交
