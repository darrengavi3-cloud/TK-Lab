/**
 * 食货志（shihuo）模块界面单元。
 *
 * 由 atlas/index.html 的模块模板中迁出，模板内容逐字保持，不改动结构、类名与文案。
 *
 * 迁出契约：
 *   - 依赖由 `state`（父层传入的响应式状态代理）显式暴露，替代原先对 setup()
 *     返回的 585 个属性的隐式全量捕获。子组件只读取它真正用到的字段。
 *   - 所有写入通过 `state-update` 事件回传父层（props 只读、事件向上），
 *     不直接改写父层状态。
 *   - 分页原为 `shihuoPage--;activeShihuoId=''`，改为 `page-change`/`page-delta`
 *     回调，由父层在处理器内完成同样的两步操作，行为等价。
 *
 * 两个单元：
 *   ShihuoContext    —— 顶部工具栏情境条（类别筛选 + 视图切换）
 *   ShihuoWorkbench  —— 模块主体与详情抽屉
 *
 * 依赖面（state 中实际被读取的字段）：
 *   shihuoCategory shihuoCategories shihuoView
 *   shihuoPolity shihuoScope shihuoSort shihuoIncludeDiscussion shihuoQuery
 *   viewportWidth showShihuoDetail
 *   shihuoPolities shihuoPagination shihuoPrimaryDetail filteredShihuoHousehold
 *   openShihuoRecord closeReadingDetail
 */

export const SHIHUO_STATE_UPDATE_EVENT = 'state-update';
export const SHIHUO_PAGE_DELTA_EVENT = 'page-delta';

/** 顶部情境条：类别下拉 + 制度/户口视图切换。 */
export const ShihuoContext = {
  name: 'ShihuoContext',
  emits: [SHIHUO_STATE_UPDATE_EVENT],
  props: {
    state: { type: Object, required: true },
  },
  methods: {
    setState(key, value) { this.$emit(SHIHUO_STATE_UPDATE_EVENT, key, value); },
    setView(view) {
      this.setState('shihuoView', view);
      // 原模板：切到户口资料时同时把类别重置为 all。
      if (view === 'quantitative') this.setState('shihuoCategory', 'all');
    },
  },
  template: `
    <el-select :model-value="state.shihuoCategory" @update:model-value="setState('shihuoCategory',$event)" class="v56-context-select" size="small" aria-label="食货类别"><el-option label="全部类别" value="all"/><el-option v-for="c in state.shihuoCategories" :key="c" :label="c" :value="c"/></el-select>
    <div class="v56-segmented shihuo-context-view" aria-label="食货志视图"><button type="button" :class="{active:state.shihuoView==='institution'}" @click="setView('institution')">制度与事件</button><button type="button" :class="{active:state.shihuoView==='quantitative'}" @click="setView('quantitative')">户口资料</button></div>
  `,
};

/** 模块主体：制度与事件目录 / 户口资料表 + 食货详情抽屉。 */
export const ShihuoWorkbench = {
  name: 'ShihuoWorkbench',
  emits: [SHIHUO_STATE_UPDATE_EVENT, SHIHUO_PAGE_DELTA_EVENT],
  props: {
    /* 模块挂载与可见性：保持原 4 条 v-if 链的判定条件。 */
    moduleVisited: { type: Boolean, default: false },
    moduleReady: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    /* 父层传入的响应式状态引用。仅读，写入走事件。 */
    state: { type: Object, required: true },
    /* 父层动作。 */
    openRecord: { type: Function, required: true },
    closeDetail: { type: Function, required: true },
  },
  methods: {
    setState(key, value) { this.$emit(SHIHUO_STATE_UPDATE_EVENT, key, value); },
    clearQuery() { this.setState('shihuoQuery', ''); },
    stepPage(delta) { this.$emit(SHIHUO_PAGE_DELTA_EVENT, delta); },
    isCurrentRecord(record) {
      const current = this.state.shihuoPrimaryDetail;
      return Boolean(current && current.id === record.id);
    },
  },
  template: `
    <main v-if="moduleVisited && moduleReady" v-show="active" class="module-page shihuo-workbench">
      <div class="module-page-inner">
        <div class="page-heading"><h1>食货志</h1></div>
        <div class="v83-reading-tools">
          <el-select :model-value="state.shihuoPolity" @update:model-value="setState('shihuoPolity',$event)" aria-label="食货政权"><el-option label="全部政权" value="all"/><el-option v-for="p in state.shihuoPolities" :key="p" :label="p" :value="p"/></el-select>
          <el-select :model-value="state.shihuoScope" @update:model-value="setState('shihuoScope',$event)" aria-label="食货时段"><el-option label="168—316主体" value="core"/><el-option label="146／157基线" value="baseline"/><el-option label="全部时段" value="all"/></el-select>
          <el-select v-if="state.shihuoView==='institution'" :model-value="state.shihuoSort" @update:model-value="setState('shihuoSort',$event)" aria-label="食货排序"><el-option label="按年代" value="year"/><el-option label="按类别" value="category"/></el-select>
          <el-checkbox :model-value="state.shihuoIncludeDiscussion" @update:model-value="setState('shihuoIncludeDiscussion',$event)">含推算与讨论</el-checkbox>
        </div>
        <div v-if="state.shihuoQuery" class="reader-filter-summary"><span>检索：{{state.shihuoQuery}}</span><button type="button" class="person-link" @click="clearQuery">清除检索</button></div>
        <section v-if="state.shihuoView==='institution'" class="v83-food-workbench">
          <div class="v83-food-directory">
            <header class="v67-panel-heading"><strong>制度与事件</strong><span>{{state.shihuoPagination.total}} 条</span></header>
            <div v-if="!state.shihuoPagination.total" class="reader-quiet-note">没有符合条件的条目。可清除检索或调整筛选。</div>
            <button v-for="record in state.shihuoPagination.rows" :key="record.id" type="button" class="v83-food-row" :aria-pressed="isCurrentRecord(record)" @click="openRecord(record)">
              <span>{{record.yearText||record.year||'年代未详'}} · {{record.polity}}</span><strong>{{record.title}}</strong><small>{{record.category}}<template v-if="record.readingClass==='discussion'"> · 推算与讨论</template></small>
            </button>
            <nav class="v67-pagination" aria-label="食货分页"><button type="button" :disabled="state.shihuoPagination.page<=1" @click="stepPage(-1)">上一页</button><span>{{state.shihuoPagination.page}} / {{state.shihuoPagination.pages}}</span><button type="button" :disabled="state.shihuoPagination.page>=state.shihuoPagination.pages" @click="stepPage(1)">下一页</button></nav>
          </div>
          <shihuo-reading-detail v-if="state.shihuoPrimaryDetail&&state.viewportWidth>980" :record="state.shihuoPrimaryDetail"/>
        </section>
        <section v-else class="fangzhen-table-card v83-households">
          <p class="reader-quiet-note">户与口分别列示；不同疆域、时点与记载性质不作直接比例比较。</p>
          <el-table :data="state.filteredShihuoHousehold" size="small" empty-text="没有符合条件的户口资料">
            <el-table-column label="年代与政权" min-width="150"><template #default="scope">{{scope.row.label}} · {{scope.row.polity}}</template></el-table-column>
            <el-table-column prop="households" label="户数" min-width="130"/>
            <el-table-column prop="population" label="口数" min-width="130"/>
            <el-table-column label="范围与依据" min-width="300"><template #default="scope"><p>{{scope.row.regionScope}}</p><p>{{scope.row.dataNature}}</p><details><summary>出处与说明</summary><p>{{scope.row.note}}</p><p>{{scope.row.sourceTitle}}</p><reader-citations :citations="scope.row.citations||[]"/></details><p v-if="scope.row.readingClass==='discussion'" class="reader-quiet-note">推算与讨论：{{scope.row.discussion}}</p></template></el-table-column>
          </el-table>
        </section>
      </div>
    </main>
    <el-drawer :model-value="state.showShihuoDetail" @update:model-value="setState('showShihuoDetail',$event)" title="食货条目" :size="state.viewportWidth<=980?'100%':'720px'" :show-close="false" class="v84-reading-detail v83-food-drawer"><template #header="{titleId}"><div class="v84-detail-heading"><button type="button" class="v84-button v84-button--text" @click="closeDetail('shihuo')">← 返回食货列表</button><strong :id="titleId">{{state.shihuoPrimaryDetail?state.shihuoPrimaryDetail.title:'食货详情'}}</strong></div></template>
      <shihuo-reading-detail v-if="state.shihuoPrimaryDetail" :record="state.shihuoPrimaryDetail"/>
    </el-drawer>
  `,
};

export const ui = { ShihuoContext, ShihuoWorkbench };
