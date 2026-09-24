/**
 * 战事纪（battle）模块界面单元。
 *
 * 由 atlas/index.html 的模块模板中迁出，模板内容逐字保持，不改动结构、类名与文案。
 * 契约与 shihuo / shiyuan 一致：`state` 代理只读 + 事件上行。
 *
 * 本模块的工具栏情境条仅为一行静态注释（`<span class="v66-context-note">`），
 * 不含可交互控件，故不单独拆出 Context 单元，留在 index.html。
 *
 * 单元：
 *   BattleWorkbench —— 模块主体（时代定位条 + 编年列表）
 *
 * 依赖面：
 *   state 读取：filteredBattles workspaceMode
 *   props 读取：eras（BATTLE_ERA_ANCHORS，模块级冻结常量，非响应式状态）
 *   动作（函数 prop）：scrollEra battleDetailYear openDetail partiesLabel
 *                      personLinksFor openPerson kindClass kindLabel jumpToMap
 */

export const BattleWorkbench = {
  name: 'BattleWorkbench',
  props: {
    moduleVisited: { type: Boolean, default: false },
    moduleReady: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    state: { type: Object, required: true },
    /* BATTLE_ERA_ANCHORS 为模块级 Object.freeze 常量，按值传入。 */
    eras: { type: Array, default: () => [] },
    /* 父层动作。 */
    scrollEra: { type: Function, required: true },
    detailYear: { type: Function, required: true },
    openDetail: { type: Function, required: true },
    partiesLabel: { type: Function, required: true },
    personLinksFor: { type: Function, required: true },
    openPerson: { type: Function, required: true },
    kindClass: { type: Function, required: true },
    kindLabel: { type: Function, required: true },
    jumpToMap: { type: Function, required: true },
  },
  template: `
    <main v-if="moduleVisited && moduleReady" v-show="active" class="module-page battle-workbench">
      <div class="module-page-inner">
        <div class="page-heading">
          <div>
            <div class="page-kicker">汉末至西晋</div>
            <h1>战事纪</h1>
            <p>按年份连续阅读战事、战役与战场记录。</p>
          </div>
        </div>
        <nav class="v66-battle-anchors" aria-label="战事时代定位">
          <button v-for="era in eras" :key="era.key" type="button" @click="scrollEra(era.key)">{{era.label}}</button>
          <span>{{state.filteredBattles.length}} 条</span>
        </nav>
        <div class="battle-vertical-scroll" aria-label="战事编年列表">
          <div class="battle-chronology-list">
            <article v-for="item in state.filteredBattles" :key="'chronology-'+item.id" class="battle-timeline-item" :data-battle-era="item.isEraStart?item.eraKey:null">
              <div v-if="item.isEraStart" class="v66-battle-era">{{item.eraLabel}}</div>
              <time class="battle-timeline-year">{{detailYear(item)}}</time>
              <button type="button" class="v66-battle-open" @click="openDetail(item)">
                <span class="battle-timeline-title">{{item.title||item.name||item.text}}</span>
                <span class="battle-timeline-desc">{{item.desc||item.text||item.note||item.result}}</span>
              </button>
              <div class="v66-battle-facts">
                <span v-if="partiesLabel(item)">{{partiesLabel(item)}}</span>
                <span v-if="item.result">{{item.result}}</span>
              </div>
              <div v-if="personLinksFor(item).length" class="v69-battle-people" aria-label="涉及人物">
                <span>涉及人物</span>
                <button v-for="link in personLinksFor(item).slice(0,6)" :key="link.linkId" type="button" class="person-link" @click="openPerson(link)">{{link.personName}}</button>
                <small v-if="personLinksFor(item).length>6">另 {{personLinksFor(item).length-6}} 人</small>
              </div>
              <div class="battle-item-actions">
                <span class="battle-kind-pill" :class="kindClass(item.kind)">{{kindLabel(item.kind)}}</span>
                <span v-if="state.workspaceMode==='review'&&item.kind==='battlefield'&&!item.coordinateEvidence" class="v58-coordinate-pending review-only">坐标来源待补</span>
                <button type="button" class="battle-map-link" @click="jumpToMap(item)">地图</button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </main>
  `,
};

export const ui = { BattleWorkbench };
