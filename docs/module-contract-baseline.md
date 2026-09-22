# 观史台模块契约基线（重构前冻结）

> 本文件是 UI 层重构的**安全网**。在拆分 `atlas/index.html`、统一组件样式与命名之前，
> 先把现有八个模块的职责、结构、依赖与对外契约固定下来，作为「功能对等」的判定依据。
>
> 基线提交：`cd2fb66`（Merge PR #23：州镇表 V2 军政职权与响应式阅读层）
> 冻结日期：2026-09-21
> 状态：**只读基线，重构期间不得修改**；重构完成后由 `docs/module-contract-redesign.md` 取代。

---

## 一、总体分层

```
atlas/index.html（10,601 行 / 815 KB）  ← 单一入口，承载全部模板与视图逻辑
  ├─ 五层运行时样式（唯一级联链）
  │   tokens.css → base.css → components.css → modules.css → responsive.css
  ├─ assets/app/*.js（13 个）
  │   ├─ 共享组件层（Vue 全局组件，1 个文件）
  │   ├─ 纯函数模块层（无 UI，12 个文件）
  │   └─ 引导/契约层
  └─ assets/vendor/（Vue 3 + Element Plus，本地锁定）
```

### 已归档、不参与运行的历史样式

`v55.css` `v56.css` `v57.css` `v58.css` `v60.css` `v61.css` `v62.css`（合计 2,817 行）

**核实结论**：`index.html` 中**没有任何一条**对这些文件的引用（第 33—37 行仅引用五层）。
`DESIGN.md` V64 条款已明确其"只作历史档案，不再并行参与级联"。
→ **重构不得重新引入它们；命名统一时也不得据其命名规范反向推导。**

---

## 二、模块清单（八个）

`MODULE_KEYS` 定义于 `assets/app/route-contract.js`，模块元数据定义于 `index.html` 的 `v56ModuleItems`。

### 2.1 模块在 `index.html` 中的真实分布（已逐行核实）

**关键事实：每个模块并非集中在一处，而是散落在四个互不相邻的 `v-if` 条件链中**，
四条链全部以 `activeModule` 为判据。这是本次重构的结构性根源，也是「按模块整体抽取」不能简单剪切粘贴的原因。

全文共 **30 处** `activeModule===` 条件。各模块作为模板条件出现的次数：

| 模块 | key | 条件出现次数 |
|---|---|---|
| 职官谱 | `offices` | **6** |
| 州镇表 | `fangzhen` | 4 |
| 人物记 | `people` | 3 |
| 战事纪 | `battle` | 3 |
| 金石录 | `jinshi` | 3 |
| 食货志 | `shihuo` | 3 |
| 形势图 | `map` | 3 |
| 史源表 | `shiyuan` | 2 |

四条链的落点：

| 链 | 行区间 | 形态 | 作用 |
|---|---|---|---|
| ① 工具栏上下文条 | 8727–8750 | `<template v-if="activeModule===…">` | 每模块一个上下文选择器 |
| ② 筛选面板 | 8773–8820 | 第二条 `v-if` 链 | 每模块一组筛选控件 |
| ③ **模块主体** | **9567–9963** | `<main class="module-page X-workbench">` | **八个模块的正文区** |
| ④ 检视/详情面板 | 9981–10023 | 第三条 `v-if` 链 | 每模块的右侧详情 |

**模块主体（链③）精确边界 —— 重构的实际工作单元：**

| # | 模块 | key | 标签 | 字 | searchScope | 主体行区间（index.html） | 行数 | 逻辑文件 |
|---|---|---|---|---|---|---|---|---|
| — | 载入占位 | — | — | — | — | 9567–9570 | 4 | — |
| 1 | 人物记 | `people` | 人物记 | 人 | `people` | 9571–9643 | 73 | `people.js` |
| 2 | 战事纪 | `battle` | 战事纪 | 战 | `battle` | 9644–9685 | 42 | — |
| 3 | 州镇表 | `fangzhen` | 州镇表 | 州 | `fangzhen` | 9686–9763 | 78 | `fangzhen.js` |
| 4 | 金石录 | `jinshi` | 金石录 | 石 | `jinshi` | 9764–9828 | 65 | `jinshi.js` |
| 5 | 史源表 | `shiyuan` | 史源表 | 源 | `all` | 9829–9879 | 51 | `shiyuan.js` |
| 6 | 食货志 | `shihuo` | 食货志 | 食 | `shihuo` | 9880–9915 | 36 | `shihuo.js` |
| 7 | 形势图 | `map` | 形势图 | 图 | `all` | 9916–9963 | 48 | iframe（**冻结**） |
| 8 | 职官谱 | `offices` | 职官谱 | 官 | `office` | 8820–9566（内嵌于链②尾部起） | ~747 | — |

**职官谱特例**：`offices` 未使用 `module-page` 包装类，其正文自 8820 行起直接嵌在筛选面板之后，
跨度最大、条件分支最多（6 处），是风险最高、必须最后处理的模块。

**导航分层（V83 决定）**：主导航 = 职官谱／人物记／州镇表／金石录；「更多案卷」= 战事纪／食货志／形势图。
**移动端底栏（V56）**：职官、人物、战事、形势、全部。

---

## 三、逐模块职责与结构

### 1. offices 职官谱
- **职责**：以「朝堂结构图」或「数据表」两种呈现阅读官职体系与爵位体系。
- **双轴状态**：`treeType`（`office`｜`noble`）× `officePresentation`（`catalog`｜`table`）。
- **主要子结构**：后汉朝堂专图、通用朝堂、爵位总览、数据表、状态栏。
- **依赖**：`office-succession.js`（任官继承注入）、`reviewed-office-succession.js`（数据）、
  `office-seat-policies.js` / `office-residences.js` / `kaifu-policies.js` / `office-order-policies.js`。
- **专属样式**：`han-court-*`、`court-*`、`statusbar`、`v56-context-*`。
- **风险点**：模板为全仓最大单块（723 行）；朝堂结构图与数据表耦合在同一 `<div class="body-row">`。

### 2. people 人物记
- **职责**：人物全量名录 + 档案详情主从布局；模块内常驻检索（V62 明确的唯一例外）。
- **视图**：`peopleView`（`people`｜时期快照）。
- **主要子结构**：紧凑指标带、人物名录（`v56-person-directory`）、档案详情（`v56-person-dossier`）、分页。
- **共享组件**：`reader-portrait`、`person-identity-facts`、`reader-citations`。
- **依赖**：`people.js` 导出 `matchPerson` / `comparePeople` / `dynastySortIndex` / `fieldIsPublished`。
- **分页**：桌面 48 人／页，移动 20 人／页。
- **专属样式**：`v56-people-master-detail`、`v56-person-row*`、`v69-person-life-*`、`v62-person-match`。

### 3. battle 战事纪
- **职责**：单根编年导线，按年份连续阅读战事／战役／战场记录。
- **子结构**：时代锚点导航（`v66-battle-anchors`）、编年列表（`battle-chronology-list`）、涉及人物按钮组。
- **交互契约（V66）**：锚点**只定位、不筛选**；不出现类别／交战关系／时期／交战方／战役链／局部密度控件。
- **跨模块**：与人物记以稳定 ID 双向跳转；地图跳转 `jumpBattleToMap`。
- **专属样式**：`battle-timeline-*`、`v66-battle-*`、`v69-battle-people`。

### 4. fangzhen 州镇表
- **职责**：辖区索引／职任表／记录案卷三栏工作台；军政职权分类与年份快照。
- **视图轴**：`fangzhenView`（`records`｜`snapshot`｜`compare`）；辖区轴（州｜郡｜方镇）；政权档案轴。
- **依赖**：`fangzhen.js` 导出 20 个函数，核心为 `classifyFangzhenJurisdiction`（州/郡/方镇）、
  `classifyFangzhenDynasty`（后汉/季汉/汉）、`classifyFangzhenPowers`（行政/军号/军事督辖/节权）、
  `fangzhenValidAtYear`（快照门禁）、`splitTenureText`（任期/籍贯拆分）。
- **门禁契约**：`readerDisplayStatus==='verified'` + 年代确定 + 非未拜不任 → 才进快照。
- **专属样式**：`v67-module-masthead`、`v67-masthead-tabs`、`fangzhen-*`。

### 5. jinshi 金石录
- **职责**：分页目录 + 释文阅读区 + 证据案卷。
- **依赖**：`jinshi.js` 导出 `epigraphicEraKey`（后汉/三国/两晋）、`segmentLacunae`（缺字切分）、
  `normalizeEpigraphicMediaAssets`（媒体门禁）、`mergeEpigraphicRecords`。
- **硬契约**：缺字符号 `□`（可数缺字）／`■`（残泐）／连续 `•`／`.`（字数不明）**逐字保留**，
  界面只加标记与提示，不改写、不补字、不合并。
- **媒体门禁**：仅消费 `publicationStatus=verified` 且具本地路径与 `altText` 的资产；无合格媒体则不创建图片节点。
- **阅读宽度**：约 40—44 汉字。
- **共享组件**：`inscription-apparatus`、`inscription-availability`。
- **专属样式**：`v56-jinshi-*`、`reader-inscription-apparatus`。

### 6. shiyuan 史源表
- **职责**：把已发布条目按典籍卷次**倒排**；不产生任何新的史学判断。
- **依赖**：`shiyuan.js` 导出 `parseCitation`（书名/卷次/篇名解析）、`buildSourceVolumes`（按卷聚合）、
  `selectSourceVolumes`、`paginateSourceVolumes`（12 条/页）、`sourceEntryRoute`（跨模块跳转）。
- **硬契约**：无法确切解析卷次者一律进「未归卷」并保留原串，**不作猜测**。
  只有出现在「卷」**之前**的《…》才是书名；卷次之后的《…》是篇名。
- **专属样式**：`v56-shiyuan-*`。

### 7. shihuo 食货志
- **职责**：制度／编年／户口物价三个互斥视图；分页目录 + 独立来源详情。
- **依赖**：`shihuo.js` 导出 `selectShihuoRecords`（含 `readingClass==='discussion'` 过滤）、`paginateShihuo`。
- **契约**：异说与推算默认不参与常规阅读；`readingClass==='discussion'` 条目须显式开启。
- **共享组件**：`shihuo-reading-detail`（`v83-food-detail`）。
- **专属样式**：`v83-food-*`、`v56-shihuo-*`。

### 8. map 形势图
- **职责**：iframe 承载的十六期历史地图。
- **状态：冻结区。** `DESIGN.md` 多处重复声明：iframe 内的几何、图层、时期、配色**不在重构范围**。
- **契约**：16 期与稳定 ID 由规范源验证锁定。

---

## 四、共享组件层（`assets/app/reader-components.js`）

单一文件，5 个 Vue 全局组件，经 `app.component(name, component)` 逐项注册（index.html:10589）。

| 组件 | props | 用途 | 关键约束 |
|---|---|---|---|
| `ShihuoReadingDetail` | `record` | 食货条目详情 | discussion 类须标注"不作为确定数量" |
| `ReaderPortrait` | `src, alt, detail` | 立绘，带 srcset 变体 | 失败回退 `failedVariant`；必须是界面识别资产 |
| `ReaderCitations` | `citations` | 原典回查折叠列表 | 标作节录；`role='counter'`=反证、`'variant'`=异说 |
| `PersonIdentityFacts` | `person, lifespan, office, peerage` | 人物身份字段 | **`tenureText` 只承载任期**，籍贯/表字须走本组件 |
| `InscriptionApparatus` | `record` | 异文与著录 | 过滤与正文完全相同的原文副本 |

**注册机制**：`Object.entries(window.SGZ_READER_COMPONENTS||{}).forEach(([name,c])=>app.component(name,c));`

---

## 五、纯函数模块层（12 个，无 UI）

| 文件 | 导出 | 职责 | 对外契约 |
|---|---|---|---|
| `route-contract.js` | `MODULE_KEYS`, `validRouteHash`, `acceptedRouteMessage` | 路由契约 | 8 个合法 key；hash ≤4096 且无换行 |
| `shell.js` | `parseRouteHash`, `serializeRouteHash`, `createReadingTrail` | 路由解析与阅读轨迹 | 非法模块名回落 `offices` |
| `navigation.js` | `createPersonNavigator` | 人物跳转防竞态 | generation 计数丢弃过期请求 |
| `people.js` | `matchPerson`, `comparePeople`, `dynastySortIndex`, `fieldIsPublished`, `normalizePersonSearchText`, `firstPersonFieldMatch` | 人物搜索与排序 | 分词得分：直接命中 0–30，关联命中 100–130 |
| `fangzhen.js` | 20 个函数（见模块 4） | 州镇分类与门禁 | 见模块 4 |
| `jinshi.js` | 11 个函数（见模块 5） | 金石时代/缺字/媒体 | 见模块 5 |
| `shihuo.js` | `selectShihuoRecords`, `paginateShihuo` | 食货筛选分页 | 默认排除 discussion |
| `shiyuan.js` | 7 个函数（见模块 6） | 引文卷次倒排 | 见模块 6 |
| `office-succession.js` | `applyOfficeSuccession` | 任官继承注入 | 大将军/大司马的 officeStartYear 强制置 null |
| `persistence-core.js` | `createDirtyState`, `createPatchEngine` | 稳定键补丁引擎 | 增量 patch 为常规撤销单位 |
| `persistence.js` | re-export 上者 | 加载守卫 | 核心缺失即 throw |
| `release-version.js` | `RELEASE_VERSION` | 版本标识 | 当前 `"V86"` |

---

## 六、依赖关系图

```
                    ┌─────────────────────────┐
                    │  atlas/index.html       │
                    │  （模板 + 视图逻辑）      │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ 共享组件层     │    │ 纯函数模块层      │    │ 五层 CSS 级联链   │
│ reader-       │    │ 12 个文件         │    │ tokens→base→     │
│ components.js │    │                  │    │ components→      │
│ （5 组件）     │    │                  │    │ modules→         │
└───────────────┘    └────────┬─────────┘    │ responsive       │
                              │              └──────────────────┘
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      route-contract    persistence-    people / fangzhen /
      ← shell           core ←          jinshi / shihuo /
                        persistence     shiyuan / office-
                                        succession
```

**关键依赖事实**：
1. `shell.js` **同时** re-export 与 import `route-contract.js`；`persistence.js` 依赖 `persistence-core.js` 的全局注册。
2. 12 个纯函数模块之间**互不依赖**（除上两条），彼此只通过 `window.SGZ_UI_MODULES` 命名空间与 `index.html` 通信。
3. `office-succession.js` 直接改写传入的 `node` 对象（**变异式**，非纯函数）。
4. 模块加载为**懒加载**（`loadSgzUiModule`），`idle/loading/ready/error` 四态，空闲／悬停／聚焦／触控按下均预取。

---

## 七、重构不变量（必须保持）

以下为跨模块的硬约束，重构中**任何一条被破坏即为功能不对等**：

1. **数据与视图分层**：阅读态 `reader` 与审校态 `review` 严格分层；读者投影可见 ≠ 史实核定。
2. **状态文字保留**：`evidenceStatus` / `reviewState` / `uncertaintyReason` / `readerVisibility` 四轴分离，阅读态不显示工作流词。
3. **用词唯一**：「未详」与「存疑」不可互替；「未知/不详/无考/不明」皆越例；不与「待考」并用。
4. **年代符号**：`—？`／`？—`／`纪年？`／`？—？`；「？」不得出现在其他位置。
5. **单一检索入口**：全站只有一个固定「检索」；模块内不得复制检索输入框（人物记常驻检索是 V62 明确的唯一例外）。
6. **触控与焦点**：最小触控 44px；抽屉 Tab 焦点圈定、Escape 关闭、关闭后焦点返回原触发按钮。
7. **URL 可恢复**：模块、人物、碑刻、筛选、地图时期均以稳定 ID 写入 URL。
8. **颜色不作唯一状态提示**：「待考」同时显示文字。
9. **地图冻结**：`map` 模块的几何、图层、时期、配色不改。
10. **确定性构建**：`npm run release:check` 须通过（双构建一致 + 不变量 + 类型 + lint + 测试 + 权限门禁）。

---

## 八、现存结构性问题（重构目标）

| # | 问题 | 证据 | 严重度 |
|---|---|---|---|
| P1 | 单文件承载全部 UI | `index.html` 10,601 行 / 804,764 字节 | **高** |
| P2 | 模块模板无边界，且被切成四段 | 30 处 `activeModule===` 条件，分属 4 条互不相邻的 `v-if` 链 | **高** |
| P3 | 视图逻辑与模板耦合 | computed / methods / 模板同处一文件，无法独立测试 | **高** |
| P4 | 命名不统一 | 171 个带版本号类名、320 处引用（`v56-*` `v67-*` `v69-*` `v83-*` …） | 中 |
| P5 | 共享组件仅 5 个 | 大量重复模式未提取；offices 内同一立绘表达式逐字重复 6 次 | 中 |
| P6 | 模块 CSS 无分区 | `modules.css` 93,799 字节未按模块切分 | 中 |
| P7 | 命名空间隐式 | `window.SGZ_UI_MODULES` 无类型约束 | 低 |

---

## 九、基线验证结论（已实测）

### 9.1 工具链真实依赖面

**关键发现：整条构建与测试链路只依赖一个外部包 —— `esbuild`。** 其余全部为 `node:` 内置模块。

| 环节 | 外部依赖 |
|---|---|
| `build:atlas` | 无 |
| `sync:reader` | 无 |
| `build:catalogue` | **`esbuild`** |
| `test:source` / `test:built` / `test:visual` | **`esbuild`**（仅 catalogue 相关用例） |
| `typecheck` | `typescript` |

`lint` 对本任务**不适用**：`eslint.config.mjs` 的 `globalIgnores` 明确排除 `atlas/**`，
即 ESLint 从不检查 `atlas/` 源码。重构 `atlas/` 时无需也无法用 lint 验证。

### 9.2 正确的构建顺序（与 package.json 声明不同）

`public/legacy/` 被 `.gitignore:45` 排除，但 `build:catalogue` 硬依赖其中的
`public/legacy/data/v69-person-profiles.js`。因此全新检出后**不能**直接跑 `build:catalogue`。
`public/legacy/` 由 `sync:reader` 从 `atlas/exports/观史台-读者版/` 复制而来。正确顺序：

```bash
node atlas/scripts/build-all.mjs --refresh-lock   # ① 生成 atlas/exports/读者版（约 70s）
node scripts/sync-reader-bundle.mjs               # ② 复制到 public/legacy/（约 30s）
node scripts/build-catalogue.mjs                  # ③ 生成 server/generated 与 catalogue 种子
npx tsc --noEmit --incremental false              # ④ 型别检查
node --test tests/*.test.mjs                      # ⑤ 测试
```

`npm run build` 声明的 `build:atlas → sync:reader → build:site` 顺序虽然正确，
但 `build:site` 内含 `vinext build`，需要完整的 Next.js 工具链与 Cloudflare 绑定，本地不必要。
**重构期只跑 ①—⑤ 即可**，等同 `release:offline` 的语义子集。

### 9.3 基线实测结果

| 检查项 | 结果 | 说明 |
|---|---|---|
| `build:atlas --refresh-lock` | ✅ 通过，1m07s | 确定性输出，输入锁 `6c8d5da7…` |
| `sync:reader` | ✅ 通过，29s | 588 个文件 |
| `build:catalogue` | ✅ 通过 | 4,336 条基线记录 |
| `typecheck` | ✅ 通过（exit 0） | 48s |
| `lint` | ⚠️ 环境损坏 / 对本任务不适用 | 见 9.1 |
| `test:source` | ⚠️ **68/69 通过，1 失败** | 失败项为**既有 Windows 移植缺陷**，见 9.4 |

### 9.4 基线既有缺陷（非本次改动引入，重构前即存在）

**缺陷 A：`sources.lock.json` 与已提交源不一致（仓库级）**

`cd2fb66` 同时改动了 `atlas/sources.lock.json` 与 `atlas/index.html`，但锁内记录的
`index.html` 为 801,087 字节 / `c45ff011…`，而实际提交内容为 804,764 字节 / `2e41381d…`。
`fangzhen.js`、`modules.css` 同样不符。工作区无未提交改动（`git status` 干净）。

→ 结论：**`main` 上 `build:atlas` 不带 `--refresh-lock` 必然失败**，`release:check` 在干净检出上不可能通过。
本次重构会改动这三个文件，故必须以 `--refresh-lock` 作为基线，并在交付时说明锁的更新是预期行为。

**缺陷 B：`office-succession.test.mjs:84` 跨平台路径错误**

```js
loadSupplementDecisions(new URL('../atlas/', import.meta.url).pathname)
```

Windows 下 `URL.pathname` 返回 `/C:/work/tk-lab/atlas/`，作为文件路径拼接后变成
`C:\C:\work\tk-lab\atlas\`（不存在），导致 `ENOENT`。应改用 `fileURLToPath()`。
全文仅此一处出现在测试套件中。该用例在 Linux CI 上通过，故未被发现。

---

## 十、验证方式

重构每完成一个模块，须通过：

```bash
node atlas/scripts/build-all.mjs --refresh-lock   # 规范源确定性重建
node scripts/sync-reader-bundle.mjs
node scripts/build-catalogue.mjs
npx tsc --noEmit --incremental false              # 型别检查
node --test tests/*.test.mjs                      # 语义测试
node atlas/scripts/release-check.mjs              # 20 项不变量（无外部依赖）
```

**功能对等判定**：以上全绿 + 测试通过数不低于基线（≥68/69，缺陷 B 修复后应为 69/69）= 功能对等。
测试未覆盖的行为，须在重构记录中显式标注为「未验证」。

**不适用项**：`lint`（配置排除 `atlas/**`）；`vinext build` / `build:site` / `test:visual`（需完整
Next.js + Cloudflare 工具链，与 UI 层重构无关）。
