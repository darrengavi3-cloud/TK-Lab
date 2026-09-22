# 观史台组件命名规范（重设计目标态）

> 本文件定义重构**完成后**的命名与组件规范。现有 171 个版本化类名（320 处）按此收敛。
> 规范依据：`DESIGN.md` 已确立的语义（兰台案牍／册府索引台）与五层 CSS 架构。
>
> 核心原则：**类名描述"它是什么"，不描述"哪个版本加的"。**

---

## 一、命名总则

### 1.1 禁止版本号

版本号（`v56-` `v67-` `v69-` …）是**开发时间标记**，不是语义。类名中出现版本号意味着：

- 同一概念随版本分裂成多个类（如 `v56-person-row` / `v69-person-profile`）；
- 后人无法判断该用哪个；
- 归档样式被删除后，类名成为孤儿。

**规则：所有面向运行时的类名一律不含 `vNN-` 前缀。**

> 例外：`data-*` 属性可保留版本化字段名（如 `data-v58-status`），因为其语义是"该数据字段的版本来源"，
> 且不参与样式级联。但本次重构同样不新增此类属性。

### 1.2 三层命名空间

```
sgz-{role}-{element}-{modifier}      组件层（新增）
{module}-{element}-{modifier}        模块层（复用现有）
sgz-{token}                         令牌层（已存在，不动）
```

| 层 | 前缀 | 示例 | 规则 |
|---|---|---|---|
| 令牌 | `--sgz-*` | `--sgz-paper`, `--sgz-ink` | **已冻结，不改** |
| 组件 | `sgz-` | `sgz-button`, `sgz-panel`, `sgz-meta-row` | 跨模块复用，定义于 `components.css` |
| 模块 | `{module}-` | `people-directory`, `jinshi-reader` | 单模块专用，定义于 `modules.css` 对应分区 |

### 1.3 BEM 变体

沿用 `DESIGN.md` 与现有代码已实际使用的 BEM 风格：

```
.sgz-button                 块
.sgz-button--primary        修饰符（双连字符）
.sgz-button__icon           元素（双下划线）
.is-active / .is-loading    状态类（is- 前缀，可选独立类）
```

**状态类统一用 `is-` 前缀**，替换现有的裸 `.active` / `.keyboard-active` / `.review-only`：

| 现有 | 目标 | 说明 |
|---|---|---|
| `.active` | `.is-active` | 避免与第三方库冲突 |
| `.keyboard-active` | `.is-keyboard-active` | 键盘导航高亮 |
| `.review-only` | `.is-review-only` | 审校态专属元素 |
| `.reader-quiet-note` | `.is-quiet-note` | 安静说明 |

> **兼容处理**：由于 `.review-only` 在模板中大量出现（审校/阅读分层的关键开关），
> 迁移时在 `base.css` 保留一条 `.review-only { @extend .is-review-only }` 等价规则，
> 但模板中改为 `.is-review-only`。**不得两套并存超过一个版本。**

---

## 二、版本化类名收敛映射表

171 个唯一版本化类名按语义归并。以下为主干映射（完整表在实现时逐项核对）：

### 2.1 跨版本重复概念 → 统一为组件层

| 现有类名 | 目标类名 | 组件 |
|---|---|---|
| `v84-button` `v84-button--text` `v84-button--outline` | `sgz-button` `sgz-button--text` `sgz-button--outline` | 按钮 |
| `v84-reading-detail` `v84-detail-heading` | `sgz-reading-detail` `sgz-reading-detail__heading` | 阅读详情容器 |
| `v56-evidence-section` `v56-evidence-title` `v56-evidence-status` `v56-evidence-meta` `v56-evidence-head` `v56-evidence-rail` | `sgz-evidence-rail` `sgz-evidence-rail__title` `sgz-evidence-rail__status` `sgz-evidence-rail__meta` … | 证据案卷 |
| `v67-pagination` | `sgz-pagination` | 分页 |
| `v67-panel-heading` | `sgz-panel__heading` | 面板标题 |
| `v56-segmented` | `sgz-segmented` | 分段控件 |
| `v56-context-select` | `sgz-context-select` | 上下文栏选择器 |
| `v56-mobile-module-sheet` | `sgz-mobile-sheet` | 移动底部面板 |
| `v69-review-status` `v73-status-row` `v58-status` | `sgz-status-row` `sgz-status-row__badge` | 状态行 |

### 2.2 模块专属类 → 模块层

| 现有 | 目标 | 模块 |
|---|---|---|
| `v56-person-directory` `v56-person-row` `v56-person-row-name` `v56-person-row-meta` `v56-person-row-count` `v56-people-master-detail` `v56-person-dossier` `v56-person-dossier-head` `v56-person-dossier-meta` `v69-person-profiles` `v69-person-life-*` `v69-life-type` `v62-person-match` `v62-people-offices` `v63-person-registry` `v63-reader-people` `v63-reader-person-relations` | `people-directory` `people-row` `people-row__name` `people-row__meta` `people-row__count` `people-master-detail` `people-dossier` `people-dossier__head` `people-dossier__meta` `people-profiles` `people-life-year` … `people-match` … | people |
| `v56-jinshi-directory` `v56-jinshi-row` `v56-jinshi-row-title` `v56-jinshi-row-meta` `v56-jinshi-reader` `v56-jinshi-inscription` `v56-jinshi-fields` `v56-jinshi-workbench-grid` `v67-jinshi-media` `v67-jinshi-facts` `v67-jinshi-related` `v67-jinshi-thumbnails` `v67-jinshi-reader-head` `v67-jinshi-directory-head` `v62-transcription*` `v62-jinshi-*` `v61-jinshi-*` `v61-epigraphy-research` `v58-jinshi-status` `v69-epigraphic-*` `v69-epigraphy-audit` | `jinshi-directory` `jinshi-row` … `jinshi-reader` … `jinshi-transcription` `jinshi-variant-label` … | jinshi |
| `v67-module-masthead` `v67-masthead-tabs` `v67-masthead-meta` `v67-fangzhen-related` `v67-fangzhen-person` `v67-fangzhen-dossier` `v67-fact-grid` `v67-dossier-actions` `v69-fangzhen-statuses` `v69-fangzhen-reader` `v66-administrative-seat-periods` | `fangzhen-masthead` `fangzhen-masthead__tabs` … `fangzhen-dossier` … | fangzhen |
| `v56-shiyuan-*`（10 个） | `shiyuan-*` | shiyuan |
| `v66-battle-*` `v69-battle-*` | `battle-*` | battle |
| `v66-peerage-stages` | `offices-peerage-stages` | offices |
| `v83-food-*` `v83-discussion` | `shihuo-*` | shihuo |
| `v56-career-*` | `sgz-career-*` | 跨模块（履历时间线） |

---

## 三、组件目录（重设计后的共享组件层）

现有 5 个组件不足以消除重复。重设计后组件层 = **6 个现有 + 6 个新增**：

### 3.1 保留并规范化（现有 5 个）

| 组件 | 变更 |
|---|---|
| `ReaderPortrait` | 类名 `reader-portrait` → 加 BEM 子元素；失败态加 `.is-failed` |
| `ReaderCitations` | 类名规范为 `sgz-citations`；折叠态用 `.is-open` |
| `PersonIdentityFacts` | 类名 `v69-person-facts` → `people-identity-facts`；**契约不变**（tenureText 只承载任期） |
| `InscriptionApparatus` | 类名规范为 `jinshi-apparatus` |
| `InscriptionAvailability` | 类名规范为 `jinshi-availability` |
| `ShihuoReadingDetail` | 类名 `v83-food-detail` → `shihuo-reading-detail` |

### 3.2 新增提取（消除模板重复）

| 新组件 | props | 替代的重复模式 | 出现次数 |
|---|---|---|---|
| `SgzModulePage` | `module` | `<main class="module-page …"><div class="module-page-inner">` 骨架 | 6 |
| `SgzMasthead` | `label, count, tabs` | `v67-module-masthead` 三处近乎相同的题头 | 3 |
| `SgzMetricStrip` | `metrics[]` | 紧凑指标带（people / jinshi / fangzhen 各写一遍） | 3 |
| `SgzPagination` | `page, pageCount, total, label` | 4 套手写分页导航 | 4 |
| `SgzStatusLine` | `state, text` | 状态徽标（释文状态／审定状态／岗位状态） | 6+ |
| `SgzEmptyPanel` | `seal, title, hint` | 空状态面板（`jinshi-empty-panel` 等） | 3 |

> **判断**：提取这 6 个组件可消除约 **25 处模板重复**，并让 `index.html` 减少约 200 行。
> 收益真实但非颠覆性——真正的收益在于**风格一致性由组件保证，而非靠人工对齐**。

---

## 四、CSS 文件组织（重设计后）

保持五层不变，但**每层内部分区**，并在 `modules.css` 按模块切分：

```
assets/ui/
  tokens.css        # 令牌（冻结，不动）
  base.css          # 重置 + 排版 + 基础元素 + 状态类
  components.css    # 组件层：sgz-* 前缀
    ├─ 1. 按钮与操作
    ├─ 2. 表单与选择
    ├─ 3. 面板与案卷
    ├─ 4. 折叠与抽屉
    ├─ 5. 状态与徽标
    └─ 6. 分页与导航
  modules.css       # 模块层：按模块分区（新增分区注释）
    ├─ 1. offices
    ├─ 2. people
    ├─ 3. battle
    ├─ 4. fangzhen
    ├─ 5. jinshi
    ├─ 6. shiyuan
    ├─ 7. shihuo
    └─ 8. map（只保留 iframe 外框）
  responsive.css    # 断点：760 / 980 / 1280
```

**删除**：`v55.css` `v56.css` `v57.css` `v58.css` `v60.css` `v61.css` `v62.css`（2,817 行，零引用）

> 该删除已由 `DESIGN.md` V64 条款授权（"只作历史档案"）。但**删除前须再次全量核对零引用**，
> 包括 `tests/` 与 `scripts/` 中的字符串引用。

---

## 五、迁移策略（不可回退的约束）

1. **一次一个模块**：完成 → 测试全绿 → 提交 → 下一个。**不得并行改多个模块。**
2. **类名迁移必须原子**：模板与 CSS 同一次提交内改完，中间不留"两套并存"状态。
3. **令牌不动**：`--sgz-*` 与 `--v56-*` 的映射关系不变（`tokens.css` 已定义 `--sgz-paper: var(--v56-paper, …)`）。
4. **不变量优先**：`docs/module-contract-baseline.md` 第七节 10 条硬约束优先于任何"更好看"的方案。
5. **地图冻结**：`map` 模块只整理外框类名，iframe 内部一律不碰。

---

## 六、验收标准

| 项 | 目标值 | 验证方式 |
|---|---|---|
| 版本化类名 | **0 个** | `grep -o '\bv[0-9][0-9]-[a-z-]*' atlas/index.html \| wc -l` == 0 |
| 归档 CSS 文件 | **0 个** | `ls atlas/assets/ui/v*.css` 为空 |
| 共享组件数 | **12 个** | `reader-components.js` 内组件计数 |
| `index.html` 行数 | **≤ 8,500** | `wc -l` |
| 测试 | **全绿** | `npm test` + `npm run test:source` + `npm run test:visual` |
| 发布检查 | **通过** | `npm run release:check` |
| 令牌值 | **未变** | `git diff` 中 `tokens.css` 无改动 |
