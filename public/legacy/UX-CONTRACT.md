# 观史台交互契约（V56）

## 检索与导航

- 全站统一使用一个“检索”入口，支持 `Ctrl/Cmd+K`；模块页通过范围按钮打开统一检索，不再维护平行的模块检索输入框。
- 检索支持范围芯片、`@人物`、`#战事`、`官:`、`地:`、`水:` 和年份语法；结果按模块分组并按稳定 ID 去重。
- 检索输入必须 IME 安全；非组合输入的 Enter 才打开结果，清空按钮立即清除内容并恢复焦点。
- 页面内筛选改变后，人物分页回到第一页；详情抽屉关闭后焦点回到触发人物卡或按钮。
- 人物档案与时期快照是两个互斥视图，不通过同一列表混排；快照条目点击进入对应人物履历或官署定位。

## 证据与状态

- 确定、推定、存疑、待考始终有文字标记；不能只用色彩表达。
- 立绘、制度名号和任官记录的来源层分开。没有图像资产时使用带人脸的界面识别设计，不写成“史实画像”。
- 未核定官品或跨政权沿用名号不得在排序中静默合并；显示层以稳定 `sortOrder` 保证可复核。
- 朝堂序位使用 `data/office-order-policies.js` 的显示政策；优先读取 `courtOrder`、`generalTitleSortOrder` 和 `sortOrder`，同品无证据时按并列层级显示。
- “其他”类别不作为朝堂可见官署；原始记录保留在规范源和审校入口，地方官按地方层显示。
- 人物卡头像只渲染 `status=ready` 的有人脸资源；`designOnly` 和 `fallback` 以文字状态呈现，不展示无五官图片。
- 人物统计使用单行紧凑带，宽屏不因指标数量产生孤立的第二行卡片。

## V51 视觉与立绘状态

- 人物记页面不显示设计板、生产数量或版本残余状态行；资源状态保留在后台清单和审计数据中。
- 人物卡头像必须来自已登记的 `status=ready` 资源；无资源时不得渲染无五官占位图。
- 全站共享史料工作台视觉令牌，模块不得自行引入外部字体或网络样式依赖。

## 响应式与无障碍

- 重要触控目标不小于约 44px；键盘焦点清晰可见。
- 760px 以下人物双按钮转为横向，名号卡片改单列，详情内容自然滚动，不创建第二个页面滚动容器。
- 支持 `prefers-reduced-motion`；卡片上移效果不得影响信息读取。

## V54 主题与动效

- 主题由 `data-sgz-theme` 控制，默认“兰台清昼”，可切换“朱批纸本”“青灯夜校”。主题只改变语义令牌，不改变政权色或史料数据。
- 动效由 `data-sgz-motion` 控制；标准动效仅用于模块切换、抽屉进入和结果状态变化，减少动效时使用短淡入或直接切换。
- 主题、密度和动效偏好使用独立的小型 `localStorage` 记录；工程数据仍由现有 IndexedDB 缓存负责。

## V55 阅读／审校模式

- 默认进入阅读模式，只呈现读者摘要、必要元数据和明确证据状态；原始记录与来源定位仍保留在数据对象中。
- 审校模式显式显示编辑、来源定位、任期冲突、缺失释文和待考数量。切换模式不改写项目数据。
- 缺少精确府署定义时显示“府署未建档”；不得用通用府署或丞相府作为任意官位的点击兜底。

## V55 稳定身份与检索

- 人物合并只能依据规范 `personId`。姓名、异体、表字和括号内容只能作为显式身份解析或检索键。
- 同名异人必须分配不同 ID；人物卡以 ID 为键，每个 ID 只出现一次。旧 ID 仅通过登记的兼容映射迁移。
- 空检索显示最近使用、常用入口和审校任务，不预先渲染全库。非空结果显示命中原因，并以模块加稳定 ID 去重。
- 表字、立绘、人物详情和跨模块跳转优先按人物 ID 关联；姓名回退只服务旧数据兼容，不产生新合并。

## V55 六版块交互

- 职官谱：官位点击只选中官位；人物点击进入履历；“府”按钮只进入与该官位、时期和府主匹配的精确府署。
- 战事纪：默认按年代，另有按交战方和按战役链；州名不是主要分类入口。
- 州镇表：职任表、某年快照和两年对比互斥；重叠任期只在审校模式提示。
- 食货志：146／157 基线与 168—316 主体分开；只有可比的确定年份数值进入比例图。
- 金石录：列表字段与源文表头一一对应；详情显示完整释文或明确的缺载状态。
- 形势图：V55 不改变地图本身，只保证战事和州镇的既有定位动作不回归。

## V56 导航与证据案卷

- 桌面模块切换的唯一所有者是左侧卷脊导航；顶部不再维护第二套模块标签。移动端固定显示“职官、人物、战事、形势、全部”。
- 上下文栏是模块常用筛选的唯一所有者。页面内容区仅保留高级筛选、时间对比或审校动作，不重复政权、类别和检索入口。
- `Ctrl/Cmd+K` 打开全局检索；“检索本页”只改变范围。IME 组合期间不执行 Enter，关闭后焦点回到原触发控件。
- 桌面记录选择更新右侧证据案卷，不强制弹出抽屉；980px 以下记录详情使用全宽抽屉，并在关闭后恢复焦点。
- 人物名录的每一行都是可聚焦按钮，以 `personId` 为键。详情时间线只显示该 ID 的全部任官、受爵、州镇和时期录，不按姓名重复建卡。
- 官位卡点击只选择官位；只有显式“府”按钮或证据案卷中的“进入对应府署”动作可进入 `residenceDefinitionFor(当前官位)` 返回的精确府署。
- 战事、州镇、金石和食货的行选择均更新同一证据案卷；地图定位、人物履历等跨模块动作保留稳定 ID 或记录 ID。
- 证据状态由符号、文字和导轨共同表达：确定／推定、待考、争议不能只依赖颜色。

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Table Selection | Element Plus table row selection and `selectV56Record` | `index.html` | Desktop evidence rail; mobile full-width detail | `node scripts/verify-v56.mjs` |
| Select/Listbox | Element Plus `el-select` | `index.html` context bar | Compact width and mobile horizontal scroll only | `node scripts/verify-v56.mjs` |
| Date | Element Plus year input and existing period registry | `index.html` | Single-year snapshot or two-year comparison | V43–V56 verification chain |
| Form | Element Plus `el-form` in review mode | `index.html` | Reader mode hides mutation controls | V43–V56 verification chain |
| Scrollbar | Global V56 standards and WebKit fallback | `assets/ui/v56.css` | Geometry may vary by bounded surface | Premium strict audit |
| Toast | Element Plus `ElMessage` | `index.html` | Success, warning and error semantics | Existing project verification |
| CRUD | Existing review-mode project editors | `index.html` | Reader mode is non-mutating | V43–V56 verification chain |

## V56 响应式与偏好

- 1280×720 顶栏不得换行，主要记录应在顶栏下约 160px 内出现；人物桌面首屏至少可见七条名录记录。
- 390×844 不得横向溢出；证据栏隐藏，人物和金石的中栏详情改由全屏抽屉承载。
- `uiPreferencesV56` 对应存储键为 `sgz_ui_preferences_v56`，只含 `theme`、`workspaceMode`、`navigationCollapsed`、`evidenceCollapsed`。
- 支持 200% 缩放和 `prefers-reduced-motion`；减少动效时所有 V56 过渡缩短为近即时切换。

## V57 统一检索与状态边界

- 全局检索是唯一读者检索入口，顶栏显示“检索＋⌘K”；模块内不得出现“检索本页”或重复文本输入框。命令面板仍可按模块范围收窄。
- 外观设置使用锚定浮层，不打开第二层页面；主题、密度和动效偏好继续写入独立的小型 UI 存储。
- 阅读模式只显示 `evidenceStatus` 与有依据的“待考”；`reviewState`、审校任务和内部审计状态只在审校模式显示。
- 每个可见人物必须有明确史料实体与有效关系；人物只按稳定 `personId` 出现一次。表字只有在正史正文、裴注或《晋书》等明确出处中才显示。
- 职官谱只允许朝堂与表格两种前台视图，官位选择必须绑定所选官位；金石档案层级仅保留在内部数据与导出，食货志三个视图互斥。

## V62 人物检索、纯净题名与金石阅读

- 人物记保留一个常驻检索框，支持姓名、简繁异体、别名、表字、官职、爵号、封地和历史归属；姓名精确匹配优先，其次为别名／表字、官职／爵号和归属。
- 常驻检索必须兼容中文输入法组合输入、清空按钮、上下键和 Enter；清空后回到当前人物数据集的完整名录。
- 人物主标签只能是后汉、魏、季汉、吴、西晋，跨朝人物也按该顺序排列。无法确认的标签不在读者态猜测显示。
- 读者标题不得出现项目生成的说明性括号或前置 `【额】` 标记；原始题名、史料正文、书名和来源定位不受此规则影响。
- 金石正文只以转义文本片段进行检索高亮；不得使用 `v-html` 或其他原始 HTML 注入方式渲染释文。
- 390px 下筛选栏可折叠，人物与金石详情使用全宽抽屉；200% 缩放和减少动效模式必须保留焦点、滚动位置与可见关闭动作。
