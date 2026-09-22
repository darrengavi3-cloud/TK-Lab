/**
 * 史源表（shiyuan）模块界面单元。
 *
 * 由 atlas/index.html 的模块模板中迁出，模板内容逐字保持，不改动结构、类名与文案。
 * 契约与 shihuo-ui.js 一致：`state` 代理只读 + `state-update` 事件上行。
 *
 * 两个单元：
 *   ShiyuanContext   —— 顶部工具栏情境条（典籍筛选 + 条目类别 + 检索）
 *   ShiyuanWorkbench —— 模块主体（卷次一览 + 卷次详情 + 卷次未详）
 *
 * 依赖面（state 中实际被读取的字段）：
 *   shiyuanWork shiyuanKind shiyuanQuery shiyuanPage shiyuanVolumeId
 *   shiyuanWorks shiyuanPagination shiyuanActiveVolume shiyuanSummary shiyuanUnattributed
 * 动作（以函数 prop 传入）：
 *   selectShiyuanVolume shiyuanEntryRoute openShiyuanEntry shiyuanLayerText shiyuanKindText
 */

export const SHIYUAN_STATE_UPDATE_EVENT = 'state-update';

/** 顶部情境条：典籍下拉 + 条目类别分段 + 检索框。 */
export const ShiyuanContext = {
  name: 'ShiyuanContext',
  emits: [SHIYUAN_STATE_UPDATE_EVENT],
  props: {
    state: { type: Object, required: true },
  },
  methods: {
    setState(key, value) { this.$emit(SHIYUAN_STATE_UPDATE_EVENT, key, value); },
  },
  template: `
    <el-select :model-value="state.shiyuanWork" @update:model-value="setState('shiyuanWork',$event)" class="v56-context-select" size="small" aria-label="典籍筛选"><el-option label="全部典籍" value="all"/><el-option v-for="row in state.shiyuanWorks" :key="row.work" :label="row.work" :value="row.work"/></el-select>
    <div class="v56-segmented shiyuan-context-kind" aria-label="条目类别"><button :class="{active:state.shiyuanKind==='all'}" @click="setState('shiyuanKind','all')">全部</button><button :class="{active:state.shiyuanKind==='appointment'}" @click="setState('shiyuanKind','appointment')">任官</button><button :class="{active:state.shiyuanKind==='battle'}" @click="setState('shiyuanKind','battle')">战事</button><button :class="{active:state.shiyuanKind==='shihuo'}" @click="setState('shiyuanKind','shihuo')">食货</button><button :class="{active:state.shiyuanKind==='epigraphy'}" @click="setState('shiyuanKind','epigraphy')">金石</button></div>
    <el-input :model-value="state.shiyuanQuery" @update:model-value="setState('shiyuanQuery',$event)" class="v56-context-search" size="small" clearable placeholder="检索卷次或条目" aria-label="检索卷次或条目"/>
  `,
};

/** 模块主体：卷次一览表、卷次详情、卷次未详折叠区。 */
export const ShiyuanWorkbench = {
  name: 'ShiyuanWorkbench',
  emits: [SHIYUAN_STATE_UPDATE_EVENT],
  props: {
    moduleVisited: { type: Boolean, default: false },
    moduleReady: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    state: { type: Object, required: true },
    /* 父层动作。 */
    selectVolume: { type: Function, required: true },
    entryRoute: { type: Function, required: true },
    openEntry: { type: Function, required: true },
    layerText: { type: Function, required: true },
    kindText: { type: Function, required: true },
  },
  methods: {
    setState(key, value) { this.$emit(SHIYUAN_STATE_UPDATE_EVENT, key, value); },
    /** 翻转页码：原模板为 `shiyuanPage = shiyuanPagination.page ± 1`。 */
    stepPage(delta) { this.setState('shiyuanPage', this.state.shiyuanPagination.page + delta); },
    /** 空态按钮：一次清空三项筛选。 */
    clearFilters() {
      this.setState('shiyuanWork', 'all');
      this.setState('shiyuanKind', 'all');
      this.setState('shiyuanQuery', '');
    },
  },
  template: `
    <main v-if="moduleVisited && moduleReady" v-show="active" class="module-page shiyuan-workbench">
      <div class="module-page-inner">
        <p class="reader-quiet-note">按典籍卷次查看引文，选择条目可继续阅读正文。</p>
        <div class="battle-metrics">
          <div class="battle-metric"><strong>{{state.shiyuanSummary.volumes}}</strong><span>已归卷卷次</span></div>
          <div class="battle-metric"><strong>{{state.shiyuanSummary.entries}}</strong><span>卷次条目</span></div>
          <div class="battle-metric"><strong>{{state.shiyuanSummary.resolvedCitations}} / {{state.shiyuanSummary.citations}}</strong><span>引文已解析</span></div>
          <div class="battle-metric"><strong>{{state.shiyuanSummary.unattributed}}</strong><span>卷次未详</span></div>
        </div>
        <div class="v56-shiyuan-grid">
          <section class="v56-shiyuan-volumes" aria-label="卷次一览">
            <p class="reader-quiet-note" role="status">{{state.shiyuanPagination.total}} 卷符合条件 · 第 {{state.shiyuanPagination.page}} / {{state.shiyuanPagination.pages}} 页</p>
            <el-table :data="state.shiyuanPagination.rows" size="small" height="560" empty-text="暂无符合条件的卷次" @row-click="selectVolume">
              <el-table-column prop="work" label="典籍" width="104"/>
              <el-table-column label="卷次" width="96"><template #default="{row}"><button type="button" class="shiyuan-volume-button" :aria-label="'查看'+row.label" :aria-pressed="state.shiyuanVolumeId===row.id" @click.stop="selectVolume(row)">卷{{row.volume}}</button></template></el-table-column>
              <el-table-column prop="entryCount" label="条目" width="66"/>
              <el-table-column label="类别"><template #default="{row}">{{kindText(row)}}</template></el-table-column>
              <el-table-column label="证据层" width="150"><template #default="{row}">{{layerText(row)}}</template></el-table-column>
            </el-table>
            <nav class="shiyuan-pagination" aria-label="史源卷次分页"><el-button :disabled="state.shiyuanPagination.page===1" @click="stepPage(-1)">上一页</el-button><el-button :disabled="state.shiyuanPagination.page===state.shiyuanPagination.pages" @click="stepPage(1)">下一页</el-button></nav>
            <el-button v-if="!state.shiyuanPagination.total" @click="clearFilters">清除检索与筛选</el-button>
          </section>
          <section class="v56-shiyuan-detail" aria-label="卷次详情">
            <template v-if="state.shiyuanActiveVolume">
              <h2 id="shiyuan-detail-title" tabindex="-1" class="v56-shiyuan-detail-title">{{state.shiyuanActiveVolume.label}}</h2>
              <p class="v56-shiyuan-detail-meta">{{state.shiyuanActiveVolume.entryCount}} 条 · {{layerText(state.shiyuanActiveVolume)}}</p>
              <ul class="v56-shiyuan-entry-list">
                <li v-for="(entry,index) in state.shiyuanActiveVolume.entries" :key="entry.kind+':'+entry.id+':'+index">
                  <span class="v56-shiyuan-entry-kind">{{entry.kindLabel}}</span>
                  <a v-if="entryRoute(entry)" :href="entryRoute(entry)" @click.prevent="openEntry(entry)">{{entry.title}}</a><strong v-else>{{entry.title}}</strong>
                  <span v-if="entry.meta" class="v56-shiyuan-entry-meta">{{entry.meta}}</span>
                  <span v-if="entry.citedWork" class="v56-shiyuan-entry-meta">裴注引《{{entry.citedWork}}》</span>
                  <span class="v56-shiyuan-entry-cite">{{entry.citation}}</span>
                </li>
              </ul>
            </template>
            <p v-else class="v56-shiyuan-empty">在左侧选择一卷，查看它支撑了本库哪些条目。</p>
          </section>
        </div>
        <details v-if="state.shiyuanUnattributed.length" class="v56-shiyuan-unattributed">
          <summary>卷次未详 {{state.shiyuanUnattributed.length}} 条（引文未写明卷次，未作归卷推测）</summary>
          <ul>
            <li v-for="(item,index) in state.shiyuanUnattributed" :key="item.kind+':'+item.id+':'+index">
              <strong>{{item.title}}</strong>
              <span class="v56-shiyuan-entry-meta">{{item.reason}}</span>
              <span v-if="item.citationTexts&&item.citationTexts.length" class="v56-shiyuan-entry-cite">{{item.citationTexts.join('；')}}</span>
            </li>
          </ul>
        </details>
      </div>
    </main>
  `,
};

export const ui = { ShiyuanContext, ShiyuanWorkbench };
