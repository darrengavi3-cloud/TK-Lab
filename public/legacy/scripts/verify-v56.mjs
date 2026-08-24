import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(`V56 校验失败：${message}`); };

const html = read('index.html');
const css = read('assets/ui/v56.css');
const design = read('DESIGN.md');
const ux = read('UX-CONTRACT.md');
const premium = JSON.parse(read('premium-ui.json'));
const template = html.slice(html.indexOf('template: `'));

// 1. V56 外壳与唯一视觉所有者。
const v55Link = html.indexOf('<link rel="stylesheet" href="./assets/ui/v55.css" />');
const v56Link = html.indexOf('<link rel="stylesheet" href="./assets/ui/v56.css" />');
assert(v55Link >= 0 && v56Link > v55Link, 'V56 样式未在 V55 兼容层之后加载');
for (const token of ['--v56-paper','--v56-sheet','--v56-ink','--v56-green','--v56-vermilion','--v56-gold','--v56-topbar-h','--v56-context-h','--v56-spine-w','--v56-evidence-w']) {
  assert(css.includes(token), `缺少 V56 令牌 ${token}`);
}
assert(css.includes('--v56-topbar-h: 52px') && css.includes('--v56-motion-fast: 180ms') && css.includes('--v56-motion: 220ms'), '顶栏高度或动效时长偏离确认稿');
assert(template.includes('class="v56-spine-nav"') && template.includes('class="v56-context-bar"') && template.includes('class="v56-evidence-rail"'), '卷脊、上下文栏或证据案卷未接入生产模板');
assert(!template.includes('class="module-nav"'), '生产模板仍保留顶部第二套模块导航');
assert(template.includes('v56-current-module') && template.includes('打开全局检索（Ctrl/Cmd+K）'), '顶栏缺少当前模块或全局检索');

// 2. 轻量偏好与检索可访问性。
assert(html.includes("localStorage.setItem('sgz_ui_preferences_v56'") && html.includes('navigationCollapsed:spineCollapsed.value') && html.includes('evidenceCollapsed:evidenceRailCollapsed.value'), 'uiPreferencesV56 未保存四项允许字段');
const preferenceWrite = html.match(/localStorage\.setItem\('sgz_ui_preferences_v56',[^\n]+/u)?.[0] || '';
assert(preferenceWrite && !/density|motion|trees|personMeta|fangzhen/i.test(preferenceWrite), 'V56 偏好混入非授权字段或研究数据');
assert(html.includes('if(event?.isComposing) return;') && html.includes('palettePreviousFocus') && html.includes('nextTick(()=>target.focus())'), '命令面板缺少 IME 保护或焦点恢复');
assert(css.includes('scrollbar-color:') && css.includes('scrollbar-width:') && css.includes('prefers-reduced-motion'), '全局滚动条或减少动效规则缺失');

// 3. 人物记主从档案与稳定 ID。
assert(template.includes('class="v56-people-master-detail"') && template.includes('class="v56-person-directory"') && template.includes('class="v56-person-dossier"'), '人物记未迁移为名录与档案详情');
assert(template.includes(':data-person-id="p.personId"') && template.includes(':key="p.personId"'), '人物名录未以 personId 为稳定键');
assert(template.includes('peoplePrimaryDetail.appointments') && template.includes('recordYearLabel(item)') && template.includes('v56-career-timeline'), '人物历官未按时间线呈现');
assert(!template.includes('class="person-card-grid"'), '人物记仍渲染卡片墙');
assert(html.includes("showPeopleDetail.value=viewportWidth.value<=980") && html.includes('v-model="showPeopleDetail"'), '人物详情未在窄屏切换为抽屉');

// 4. 官位、府署与各案卷布局。
assert(html.includes('function courtSlotClick(node)') && html.includes('selectCourtSlot(node);'), '普通官位点击职责发生回归');
assert(html.includes('return Boolean(residenceDefinitionFor(node));') && template.includes('@click.stop="openCourtResidence(node)"'), '府署入口未限定为精确定义与独立府按钮');
assert(css.includes('.court-tier') && css.includes('border-left: 4px solid var(--v56-gold)') && css.includes('content: "朝堂官署"'), '职官谱缺少品秩官署分带或低透明度题头');
assert(template.includes('battle-chronology-list') && template.includes("selectV56Record('fangzhen',record)") && template.includes("selectV56Record('shihuo',record)"), '战事、州镇或食货未接入行式工作台与证据案卷');
assert(template.includes('class="v56-jinshi-workbench-grid"') && template.includes('class="v56-jinshi-directory"') && template.includes('class="v56-jinshi-reader"'), '金石录未形成目录、释文、证据三栏');
assert(template.includes("activeModule==='map'") && template.includes('本轮仅同步全局框架、工具按钮与证据案卷，不修改地图几何、图层逻辑和历史数据'), '形势图外壳冻结说明缺失');

// 5. 移动端与文档／审计契约。
assert(css.includes('grid-template-columns: repeat(5, 1fr)') && css.includes('.v56-mobile-more') && css.includes('.v56-spine-item.module-fangzhen'), '移动端五项底部导航规则缺失');
assert(css.includes('@media (max-width: 760px)') && css.includes('.v56-person-dossier { display: none; }') && css.includes('.v56-jinshi-reader { display: none; }'), '390px 主从布局降级规则缺失');
assert(design.startsWith('# 观史台 UI 设计契约（V56）') && design.includes('## V56 册府索引台'), 'DESIGN.md 未同步 V56');
assert(ux.startsWith('# 观史台交互契约（V56）') && ux.includes('## Canonical UI Map'), 'UX-CONTRACT.md 未同步 V56');
assert(premium.profile === 'product-admin' && premium.sourceRoots.length === 1 && premium.sourceRoots[0] === 'assets/ui', 'Premium 审计未限定运行时视觉源');

// 6. 便携版必须内嵌 V56；首次构建前给出明确错误。
const portablePath = path.join(root, 'exports', '三国职官谱-单文件版.html');
assert(fs.existsSync(portablePath), '便携版尚未构建');
const portable = fs.readFileSync(portablePath, 'utf8');
assert(portable.includes('--v56-paper') && portable.includes('v56-spine-nav') && portable.includes('v56-people-master-detail') && portable.includes('v56-jinshi-workbench-grid'), '便携版未内嵌 V56 外壳或模块布局');
assert(!/<link[^>]+href=["']\.\/assets\/ui\/v56\.css/.test(portable), '便携版仍引用外部 V56 样式');

console.log(JSON.stringify({
  version: 'V56',
  shell: { topbar: 52, spine: true, contextBar: true, evidenceRail: true },
  people: { layout: 'master-detail', stableId: true },
  offices: { bands: true, exactResidenceOnly: true },
  modules: { battle: 'chronology', fangzhen: 'table', jinshi: 'directory-reader-evidence', shihuo: 'table-trend', map: 'shell-only' },
  portable: { bytes: fs.statSync(portablePath).size },
  checks: 'passed'
}, null, 2));
