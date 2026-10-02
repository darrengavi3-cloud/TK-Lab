# 观史台组件重设计 — 实施记录

> 伴生文档：`docs/module-contract-baseline.md`（重构前基线）、`docs/component-naming-standard.md`（目标规范）
> 历史分支：`redesign-modules-unified`
> 本轮分支：`codex/phase2-pagination-main-20261002`
> 当前实施基准：main `1af7a8a`（含 PR #25、阶段一合并与 PR #27）
> 基线提交：`cd2fb66`
> 起始日期：2026-09-21

---

## 〇、历史环境修复记录（2026-09-21）

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

### 历史本机处置：临时最小依赖

完整 `npm ci` 在本机需 11—21 分钟且多次卡死。核实后确认**整条构建与测试链路只依赖一个外部包：`esbuild`**。
处置：绕开 npm，直接取 `esbuild@0.28.2` 与其 `@esbuild/win32-x64` 二进制包解包入 `node_modules`，
一次性解决依赖问题（详见基线文档 §9.1）。

### 附带问题：`public/legacy/` 缺失导致全新检出无法构建

`build:catalogue` 硬依赖 `public/legacy/data/v69-person-profiles.js`，而该目录被 `.gitignore:45` 排除、
且**不由 `build:atlas` 生成**（`build:atlas` 只写 `atlas/exports/`）。必须显式运行 `sync:reader`。
正确顺序见基线文档 §9.2。

---

## 一、阶段一：结构重构

**目标**：把 `atlas/index.html` 中当前 7 个模块的模板与视图逻辑分离为独立单元，
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
| 1 | shihuo 食货志 | 3 | 36 | 低 | 已迁出 |
| 2 | battle 战事纪 | 3 | 42 | 低 | 已迁出 |
| 3 | map 形势图 | 3 | 48 | 低（仅外框，iframe 冻结） | 已迁出 |
| 4 | jinshi 金石录 | 3 | 65 | 中 | 已迁出 |
| 5 | people 人物记 | 3 | 73 | 中 | 已迁出 |
| 6 | fangzhen 州镇表 | 4 | 78 | 中高 | 已迁出；PR #27 修复已合并 |
| 7 | offices 职官谱 | 6 | ~747 | 高 | 已迁出 |

以上尺寸是重构前冻结基线，不是当前模板计数。阶段一由 `32e990b` 迁出，`0caae0e` 合并并修复运行时接线；当前 `sgzUiUnitLoaders` 与 `assets/app/ui/` 对应七个单元。PR #25 已移除史源表；它不属于任何后续工作项，不重新引入。

### 每模块的验收动作

重构期使用实际可用的验证链（`lint` 对 `atlas/**` 不适用，见基线文档 §9.1）：

```bash
node atlas/scripts/build-all.mjs --refresh-lock    # 规范源确定性重建
node scripts/sync-reader-bundle.mjs                # 生成 public/legacy
node scripts/build-catalogue.mjs                   # 生成 server/generated
npx tsc --noEmit --incremental false               # 型别检查
node --test tests/*.test.mjs                       # 语义测试（基线 68/69）
```

以上命令与 68/69 数量是历史记录，不是当前验收基线。当前按 package.json 运行 `check:atlas`、`check:ui`、`check:wiring`、模板等价性、`release:offline` 与 `test:visual`；`release:access` 另要求 6 小时内的现场访问核验。当前完整工具链仍须按锁文件安装，不能沿用“只装 esbuild”作为 release/offline 的替代。

---

## 二、阶段二：视觉重设计 + 命名统一

**目标**：按当前模板分批收敛版本化类名；仅在核实真实重复后提取共享组件，不改变业务行为。171 个类名／320 处、6 个组件及约 25 处重复都是旧方案估算，不作为当前交付数量。

依据：`docs/component-naming-standard.md`

### 命名收敛候选批次（数量沿用旧估算，逐批重查）

| 批次 | 范围 | 唯一类名数 |
|---|---|---|
| B1 | 组件层统一（`sgz-*`） | ~30 |
| B2 | people 模块类名 | ~40 |
| B3 | jinshi 模块类名 | ~35 |
| B4 | fangzhen 模块类名 | ~22 |
| B5 | battle / shihuo | ~25 |
| B6 | offices 模块类名 | ~19 |

### 共享组件提取

`SgzModulePage`、`SgzMasthead`、`SgzMetricStrip`、`SgzPagination`、`SgzStatusLine`、`SgzEmptyPanel` 仅是候选目录，逐项核查当前模板与已有共享组件后决定，不预先要求全部抽取。

### 历史样式保留（离线导出依赖）

保留 `v55.css`、`v56.css`、`v57.css`、`v58.css`、`v60.css`、`v61.css`、`v62.css`，本轮不修改这些文件。PR #25 的删除方案已撤回：`build-portable-export.mjs` 读取／打包这些文件，`sources.lock.json` 追踪它们。V64 的“不参与在线五层级联”不等于零消费者，更不构成删除授权。未来若替换离线样式，必须独立迁移、验证导出与确定性建置后另行评审。

### B1a：共享分页小批次（2026-10-02）

- 已核实食货志、州镇表两处原生 `nav → button/span/button` 结构、按钮文案、页码禁用判定与 `stepPage(±1)` 调用重复。
- 在现有 `SGZ_READER_COMPONENTS` 登记 `SgzPagination(page, pageCount, label)`，仅发出 `page-delta`；计数／页码文字由插槽保留，业务状态、详情清空与 URL 更新继续由原父层处理。
- 仅替换这两处重复模板；金石录保留独立分页事件处理，只同步 `sgz-pagination` 类名。人物分页保持原样。
- 五层样式中的分页选择器逐字更名，位置、顺序、特异性、声明值与断点保持不变；不挪动规则，避免改变级联。
- 共享组件仍经现有同步读者登记加载；不新增 ESM 单元、加载分支或数据依赖。回滚可恢复本批模板、共享组件与选择器，不涉及数据迁移。
- 门禁收据见下方；不得用自动浏览器结果替代真机验收。

---

## 三、进度

- [x] 环境修复（`.gitattributes` + LF）
- [x] 基线契约文档
- [x] 命名规范文档
- [x] 阶段一：当前 7 个模块结构重构（史源表已移除）
- [ ] 阶段二：逐批命名收敛 + 已核实重复的组件提取（历史 CSS 保留）
- [x] B1a 工作分支提交（阶段二整体未完成，保持 draft）

## 四、本轮验证与未完成项

### 已执行的验证

- `check:atlas`、`check:ui`、`check:wiring` 通过；7 个 ESM 单元／23 个模块组件，加 7 个共享组件共 30 个模板编译通过。接线门禁现同时扫描模块与共享模板中的嵌套标签。
- `check-module-equivalence.mjs` 对 main `1af7a8a` 的三个 UI 单元验证 30／66／41 个文案片段，缺失均为 0。脚本新增显式基准文件、ref 与共享文件参数，并拒绝零文案的空验证；文案保全不再误称功能等价。
- `tests/visual/pagination-equivalence.test.mjs` 用实际 Vue 和浏览器，对两处分页比较空集、单页、首页、中间页、末页的 DOM、禁用状态与原模块父事件转发。CSS 的一次性逐字对照确认只更名选择器；七个历史 CSS 与 tokens.css 未修改。
- 导出的读者包通过本地 HTTP 服务运行，阻断所有外部 HTTP(S)，食货分页前进／返回通过，pageerror 为 0。
- `lint` 0 错误，保留 `types/cloudflare.d.ts` 的 3 条既有警告；premium strict 静态审计 0 项发现。静态审计不替代浏览器或真机验收。
- 完整门禁最终结果与执行日志见 `release-metadata/phase2-pagination-20261002/`，初次运行结果也保留。

### 完整门禁结果

| 门禁 | 本轮实际结果 |
| --- | --- |
| UI 语法／模板编译／嵌套组件接线 | 通过 |
| 三模块文案保全 + 两分页浏览器等价性 | 通过 |
| `build-all --refresh-lock`、离线 ZIP、来源锁、release 双重确定性构建及不变量 | 通过 |
| `test:visual`（最终版本） | 39/39 通过 |
| `release:offline`／`release:check` | 未通过：构建测试 109/110，部署清单之外再次出现 `client/legacy/assets/ui/court-ink-palace.png`；空 dist 重建亦复现。不能把单项清单重跑成功当作完整门禁成功 |
| `release:access`（独立执行） | 未通过：现场 owner-only 访问核验超过 6 小时有效期 |
| 未改动 main 的独立构建对照 | `test:built` 110/110 通过；本工作区清单差异的原因仍未闭环，不宣称它是 main 既有缺陷 |

完整发布门禁与部署验收仍未完成。本批保持 draft，不合并或发布；部署清单差异需独立定位后再放行，不通过修改预期数量或绕过断言掩盖失败。

### 既有缺口与验证边界

轻量单文件版直接以 file URL 冷启动 `#shihuo` 进入错误态，在未改动的 main `1af7a8a` 重新生成的同类产物中亦复现。本批不扩展修复导出加载器范围，不能声称单文件运行已验收；离线 ZIP／读者目录、本地 HTTP 运行与单文件版须分别报告。

保留真机 iOS／Android 触控、Safari、虚拟键盘、屏幕阅读器、200% 缩放完整矩阵、性能基线与回滚演练等未验证项目；不提升任何验收状态。部署事实继续以 CURRENT-STATE.md 与既有部署记录为准，本轮不发布站点。
