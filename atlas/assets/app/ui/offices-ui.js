/* 职官谱（offices）模块的界面单元。
 *
 * 设计约定（与其余七个案卷一致）：
 *   1. 组件不持有状态。所有字段读取均指向父层传入的 state 代理（officesUiState）。
 *   2. 模板中的只读引用逐字保留——组件用同名 computed 转发到 state.*，
 *      因此原模板除 v-model／就地写／父层动作外无需改写，等价性最强。
 *   3. 写入统一走 state-update 事件（update(key,value)），开关走 toggle 事件。
 *   4. 函数类引用（courtSeatStats 等）由父层挂在 state 上，组件同名 computed 转发。
 *
 * 单元划分：
 *   OfficesContext  —— 上下文栏（slot=context）＋筛选抽屉（slot=filter），双 slot 复用
 *   OfficesActions  —— 审校工具条（导入／导出／工程）
 *   OfficesCourt    —— 朝堂与府署画布（后汉结构图、通用朝堂、府署）
 *   OfficesCatalog  —— 总览工作台
 *   OfficesTable    —— 数据表视图
 *   OfficesStatus   —— 状态栏
 *   OfficesDetail   —— 右侧详情面板
 *   OfficesEvidence —— 证据栏
 */

export const OFFICES_STATE_UPDATE_EVENT = 'state-update';
export const OFFICES_STATE_TOGGLE_EVENT = 'state-toggle';

/* ------------------------------------------------------------------ *
 * 上下文栏 / 筛选抽屉
 * ------------------------------------------------------------------ */
export const OfficesContext = {
  name: 'OfficesContext',
  props: {
    state: { type: Object, required: true },
    slot: { type: String, default: 'context' },
    workspaceMode: { type: String, default: 'reader' }
  },
  emits: [OFFICES_STATE_UPDATE_EVENT, OFFICES_STATE_TOGGLE_EVENT],
  computed: {
    /* 上下文栏 */
    factions() { return this.state.factions; },
    currentFaction() { return this.state.currentFaction; },
    periodOptions() { return this.state.periodOptions; },
    currentPeriodKey() { return this.state.currentPeriodKey; },
    officePresentation() { return this.state.officePresentation; },
    /* 筛选抽屉 */
    treeType() { return this.state.treeType; },
    rank9Enabled() { return this.state.rank9Enabled; },
    canvasFilters() { return this.state.canvasFilters; },
    RANK9_OPTIONS() { return this.state.RANK9_OPTIONS; },
    OFFICE_GROUP_DEFS() { return this.state.OFFICE_GROUP_DEFS; },
    officeGroup() { return this.state.officeGroup; },
    officeSub() { return this.state.officeSub; },
    officeSub2() { return this.state.officeSub2; },
    officeClassStats() { return this.state.officeClassStats; },
    officeSubOptions() { return this.state.officeSubOptions; },
    officeSub2Options() { return this.state.officeSub2Options; },
    timelineEnabled() { return this.state.timelineEnabled; },
    timelineYear() { return this.state.timelineYear; },
    timelineMinYear() { return this.state.timelineMinYear; },
    timelineMaxYear() { return this.state.timelineMaxYear; },
    currentEraLabel() { return this.state.currentEraLabel; },
    /* 父层动作转发 */
    switchFaction() { return this.state.switchFaction; },
    setOfficePresentation() { return this.state.setOfficePresentation; },
    openOfficeHolders() { return this.state.openOfficeHolders; },
    setOfficeGroup() { return this.state.setOfficeGroup; },
    setOfficeSub() { return this.state.setOfficeSub; },
    setOfficeSub2() { return this.state.setOfficeSub2; }
  },
  methods: {
    update(key, value) { this.$emit(OFFICES_STATE_UPDATE_EVENT, key, value); },
    toggle(key) { this.$emit(OFFICES_STATE_TOGGLE_EVENT, key); }
  },
  template: `
    <template v-if="slot==='context'">
      <el-select v-model="currentFaction" class="v56-context-select faction-select" size="small" aria-label="当前政权" @change="switchFaction">
        <el-option v-for="f in factions" :key="f.key" :label="f.label||f.short||f.name" :value="f.key" />
      </el-select>
      <el-select v-model="currentPeriodKey" class="v56-context-select period-select" size="small" aria-label="皇帝在位时期"><el-option label="全部时期" value="all"/><el-option v-for="p in periodOptions" :key="p.key" :label="p.name+'（'+p.startYear+'—'+p.endYear+'）'" :value="p.key"/></el-select>
      <div class="v56-segmented" aria-label="职官谱视图"><button :class="{active:officePresentation==='catalog'}" @click="setOfficePresentation('catalog')">朝堂</button><button :class="{active:officePresentation==='table'}" @click="setOfficePresentation('table')">表格</button></div><button type="button" class="v84-button v84-button--outline" @click="openOfficeHolders('current')">查看在任人物</button>
    </template>
    <template v-else>          <el-select v-if="treeType==='office' && rank9Enabled" v-model="canvasFilters.rank" class="compact-select" size="small" clearable placeholder="官品">
        <el-option v-for="r in RANK9_OPTIONS" :key="r" :label="r" :value="r" />
      </el-select>
      <el-select v-if="treeType==='office'" v-model="canvasFilters.special" class="compact-select" size="small" clearable placeholder="特殊属性">
        <el-option label="仅遥领" value="yaoling"/><el-option label="仅虚职" value="virtual"/><el-option label="仅可开府" value="kaifu"/><el-option label="仅临时职任" value="temporary"/>
      </el-select>
<el-checkbox v-model="canvasFilters.hideNonCore">仅核心体系</el-checkbox><fieldset v-if="workspaceMode==='review'"><legend>显示内容</legend><el-checkbox v-model="canvasFilters.showArchived">显示归档</el-checkbox><el-checkbox v-model="canvasFilters.showHidden">显示隐藏</el-checkbox></fieldset><fieldset><legend>相关年份</legend><el-switch v-model="timelineEnabled" active-text="按年份筛选"/><el-input-number v-if="timelineEnabled" v-model="timelineYear" :min="timelineMinYear" :max="timelineMaxYear" aria-label="职官年份"/><p v-if="timelineEnabled">{{currentEraLabel}}</p></fieldset><fieldset v-if="treeType==='office'"><legend>官署分类</legend>
      <div class="office-group-nav">
        <button v-for="g in OFFICE_GROUP_DEFS" :key="g.key" class="group-pill"
                :class="{active:officeGroup===g.key}"
                :style="officeGroup===g.key ? {background:g.color,borderColor:g.color} : {}"
                @click="setOfficeGroup(g.key)">
          <span class="group-dot" :style="{background:g.color}"></span>{{g.label}}<b>{{officeClassStats[g.key]}}</b>
        </button>
      </div>
      <div v-if="officeSubOptions.length" class="office-sub-nav">
        <button class="sub-pill" :class="{active:officeSub==='all'}" @click="setOfficeSub('all')">全部<b>{{officeClassStats[officeGroup]}}</b></button>
        <button v-for="sub in officeSubOptions" :key="sub" class="sub-pill" :class="{active:officeSub===sub}" @click="setOfficeSub(sub)">{{sub}}<b>{{officeClassStats[officeGroup+'_'+sub]}}</b></button>
      </div>
      <div v-if="officeSub2Options.length" class="office-sub-nav office-sub2-nav">
        <button class="sub-pill" :class="{active:officeSub2==='all'}" @click="setOfficeSub2('all')">全部官署<b>{{officeClassStats[officeGroup+'_'+officeSub]}}</b></button>
        <button v-for="cat in officeSub2Options" :key="cat" class="sub-pill" :class="{active:officeSub2===cat}" @click="setOfficeSub2(cat)">{{cat}}<b>{{officeClassStats[officeGroup+'_'+officeSub+'_'+cat]}}</b></button>
      </div>
    </fieldset></template>
  `
};

/* ------------------------------------------------------------------ *
 * 审校工具条
 * ------------------------------------------------------------------ */
export const OfficesActions = {
  name: 'OfficesActions',
  props: {
    workspaceMode: { type: String, default: 'reader' },
    state: { type: Object, required: true }
  },
  computed: {
    importJSON() { return this.state.importJSON; },
    importExcel() { return this.state.importExcel; },
    saveLocal() { return this.state.saveLocal; },
    loadLocal() { return this.state.loadLocal; },
    clearLegacyCacheCopies() { return this.state.clearLegacyCacheCopies; },
    runDataAudit() { return this.state.runDataAudit; },
    exportJSON() { return this.state.exportJSON; },
    exportTable() { return this.state.exportTable; },
    exportImage() { return this.state.exportImage; }
  },
  methods: {
    openAuditCenter() { this.$emit(OFFICES_STATE_UPDATE_EVENT, 'showAuditCenter', true); this.runDataAudit(); }
  },
  template: `
      <div v-if="workspaceMode==='review'" class="v56-context-actions review-only">
        <el-upload :show-file-list="false" accept=".json" :before-upload="importJSON"><el-button size="small">导入 JSON</el-button></el-upload>
        <el-upload :show-file-list="false" accept=".xlsx,.xls" :before-upload="importExcel"><el-button size="small">导入表格</el-button></el-upload>
        <el-dropdown trigger="click"><el-button size="small">工程与导出 ▾</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item @click="saveLocal()">保存到本地缓存</el-dropdown-item><el-dropdown-item @click="loadLocal">从本地缓存恢复</el-dropdown-item><el-dropdown-item @click="clearLegacyCacheCopies">清理旧缓存副本</el-dropdown-item><el-dropdown-item @click="openAuditCenter">资料状态与审校</el-dropdown-item><el-dropdown-item divided @click="exportJSON">导出完整工程 JSON</el-dropdown-item><el-dropdown-item @click="exportTable">导出表格</el-dropdown-item><el-dropdown-item @click="exportImage">导出图片</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      </div>
  `
};

/* ------------------------------------------------------------------ *
 * 状态栏
 * ------------------------------------------------------------------ */
export const OfficesStatus = {
  name: 'OfficesStatus',
  props: {
    active: { type: Boolean, default: false },
    history: { type: Object, required: true },
    state: { type: Object, required: true }
  },
  computed: {
    currentFactionLabel() { return this.state.currentFactionLabel; },
    treeType() { return this.state.treeType; },
    currentPeriodLabel() { return this.state.currentPeriodLabel; },
    timelineEnabled() { return this.state.timelineEnabled; },
    currentEraLabel() { return this.state.currentEraLabel; },
    totalNodeCount() { return this.state.totalNodeCount; },
    officePresentation() { return this.state.officePresentation; },
    selectedCount() { return this.state.selectedCount; },
    validationEnabled() { return this.state.validationEnabled; },
    autosaveStatus() { return this.state.autosaveStatus; },
    zoomPct() { return this.state.zoomPct; }
  },
  template: `
    <div v-show="active" class="statusbar">
      <div class="item">当前：{{ currentFactionLabel }} · {{ treeType==='office' ? '官职体系' : '爵位体系' }}</div>
      <div class="item">时期：{{ currentPeriodLabel }}</div>
      <div class="item" v-if="timelineEnabled">年号：{{ currentEraLabel }}</div>
      <div class="item">节点数：{{ totalNodeCount }}</div>
      <div class="item">视图：{{ officePresentation==='catalog' ? (treeType==='office'?'朝堂总览':'爵位总览') : '表格总览' }}</div>
      <div class="item">已选：{{ selectedCount }}</div>
      <div class="item">校验：{{ validationEnabled ? '已启用' : '已关闭（自定义模式）' }}</div>
      <div class="spacer"></div>
      <div class="item">{{ autosaveStatus }}</div>
      <div class="item">缩放 {{ zoomPct }}%</div>
      <div class="item">历史步骤 {{ history.index+1 }} / {{ history.stack.length }}</div>
    </div>
  `
};

/* ------------------------------------------------------------------ *
 * 证据栏
 * ------------------------------------------------------------------ */
export const OfficesEvidence = {
  name: 'OfficesEvidence',
  props: {
    state: { type: Object, required: true }
  },
  computed: {
    selectedNode() { return this.state.selectedNode; },
    courtResidenceAvailable() { return this.state.courtResidenceAvailable; },
    openCourtResidence() { return this.state.openCourtResidence; }
  },
  template: `
        <template v-if="selectedNode">
          <h3 class="v56-evidence-title">{{selectedNode.name}}</h3>
          <div class="v56-evidence-meta">{{selectedNode.key}} · {{selectedNode.category||'分类待考'}}</div>
          <span class="v56-evidence-status" :class="{pending:['待考','存疑'].includes(selectedNode.confidence)}">{{selectedNode.confidence||'证据状态待考'}}</span>
          <section class="v56-evidence-section"><h4>制度归属</h4><p>{{selectedNode.serviceDomain||'文武类别待考'}} · {{selectedNode.institutionType||'官署类型待考'}}</p><p v-if="selectedNode.rank9||selectedNode.hanRank">品秩：{{selectedNode.rank9||selectedNode.hanRank}}</p><p>{{selectedNode.duty||'职掌待补'}}</p></section>
          <section class="v56-evidence-section"><h4>来源与关联</h4><p>{{selectedNode.sources||selectedNode.sourceTitle||'来源待补'}}</p><p v-if="courtResidenceAvailable(selectedNode)">该官位有明确府署入口；“府”标签仅按当前官位的开府政策进入。</p><el-button v-if="courtResidenceAvailable(selectedNode)" size="small" plain @click="openCourtResidence(selectedNode)">进入对应府署</el-button></section>
        </template>
  `
};

/* ------------------------------------------------------------------
 * 画布视图切换条（canvas-tabs 段）
 * 树型（官职／爵位）分段控件 + 参照系下拉。
 * 原模板中 `showTemplateLibrary=true` 为就地写入，改走 state-update；
 * 其余读取项由同名 computed 逐字转发，模板其余部分保持不变。
 * ------------------------------------------------------------------ */
export const OfficesCanvasTabs = {
  name: 'OfficesCanvasTabs',
  props: {
    state: { type: Object, required: true }
  },
  emits: [OFFICES_STATE_UPDATE_EVENT],
  computed: {
    treeType() { return this.state.treeType; },
    workspaceMode() { return this.state.workspaceMode; },
    showTemplateLibrary() { return this.state.showTemplateLibrary; },
    switchTreeType() { return this.state.switchTreeType; },
    openRankCompareForSelected() { return this.state.openRankCompareForSelected; },
    openOfficeCompareForSelected() { return this.state.openOfficeCompareForSelected; }
  },
  template: `<div class="canvas-tabs">
        <div class="seg-tabs">
          <button type="button" class="mini-tab" :class="{active: treeType==='office'}" @click="switchTreeType('office')">官职</button>
          <button type="button" class="mini-tab" :class="{active: treeType==='noble'}" @click="switchTreeType('noble')">爵位</button>
        </div>
        <el-dropdown class="view-tools" trigger="click">
          <el-button size="small" plain>参照<el-icon class="el-icon--right"><svg viewBox="0 0 1024 1024" width="12" height="12"><path fill="currentColor" d="M512 640 128 256h768z"/></svg></el-icon></el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="openRankCompareForSelected">与经典品秩参照</el-dropdown-item>
              <el-dropdown-item @click="openOfficeCompareForSelected">与通典职官参照</el-dropdown-item>
              <el-dropdown-item v-if="workspaceMode==='review'" @click="update('showTemplateLibrary',true)">模板库</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div class="spacer"></div>
      </div>`,
  methods: {
    update(key, value) { this.$emit(OFFICES_STATE_UPDATE_EVENT, key, value); }
  }
};

/* ------------------------------------------------------------------
 * 后汉官职结构图（han-court 段）
 * 含分区导航、宫城核心／九卿／尚书台／军府／东宫五段、属官详情 teleport 与图例。
 * ------------------------------------------------------------------ */
export const OfficesHanCourt = {
  name: 'OfficesHanCourt',
  props: {
    state: { type: Object, required: true }
  },
  emits: [OFFICES_STATE_UPDATE_EVENT],
  computed: {
    workspaceMode() { return this.state.workspaceMode; },
    currentFaction() { return this.state.currentFaction; },
    currentFactionDef() { return this.state.currentFactionDef; },
    officePresentation() { return this.state.officePresentation; },
    viewportWidth() { return this.state.viewportWidth; },
    selectedNode() { return this.state.selectedNode; },
    courtHierarchy() { return this.state.courtHierarchy; },
    hanCourtActiveSection() { return this.state.hanCourtActiveSection; },
    showHanCourtDetail() { return this.state.showHanCourtDetail; },
    hanCourtStructure() { return this.state.hanCourtStructure; },
    treeType() { return this.state.treeType; },
    showCourtResidence() { return this.state.showCourtResidence; },
    hanCourtSelectedDetail() { return this.state.hanCourtSelectedDetail; },
    courtResidenceAvailable() { return this.state.courtResidenceAvailable; },
    HAN_COURT_SECTION_NAV() { return this.state.HAN_COURT_SECTION_NAV; },
    setOfficePresentation() { return this.state.setOfficePresentation; },
    hanCourtDutySummary() { return this.state.hanCourtDutySummary; },
    selectHanCourtNode() { return this.state.selectHanCourtNode; },
    scrollHanCourtSection() { return this.state.scrollHanCourtSection; },
    closeHanCourtDetail() { return this.state.closeHanCourtDetail; },
    handleHanCourtDetailKeydown() { return this.state.handleHanCourtDetailKeydown; },
    openHanEastPalace() { return this.state.openHanEastPalace; },
    openCourtResidence() { return this.state.openCourtResidence; },
    openCourtPerson() { return this.state.openCourtPerson; },
    addCourtPosition() { return this.state.addCourtPosition; }
  },
  methods: {
    update(key, value) { this.$emit(OFFICES_STATE_UPDATE_EVENT, key, value); }
  },
  template: `
  <div v-if="officePresentation==='catalog'&&treeType==='office'&&!showCourtResidence" class="court-scroll">
    <div v-if="currentFaction==='han'&&courtHierarchy.root" class="han-court-canvas" :style="{'--court-accent':currentFactionDef.color}">
      <header class="han-court-header">
        <div>
          <div class="han-court-kicker">《后汉书·百官志》</div>
          <h2>后汉官职结构</h2>
        </div>
        <div v-if="workspaceMode==='review'" class="court-heading-actions review-only">
          <el-button size="small" type="primary" plain @click="addCourtPosition">＋ 添加朝堂位置</el-button>
          <el-button size="small" text @click="setOfficePresentation('table')">打开数据表</el-button>
        </div>
      </header>

      <div class="han-court-layout" :class="{'review-mode':workspaceMode==='review'}">
        <nav class="han-court-nav" aria-label="后汉官职结构分区" :inert="showHanCourtDetail&&viewportWidth<=760?true:undefined">
          <button v-for="item in HAN_COURT_SECTION_NAV" :key="item.id" type="button"
                  :class="{active:hanCourtActiveSection===item.id}" :aria-current="hanCourtActiveSection===item.id?'location':undefined"
                  @click="scrollHanCourtSection(item.id)">{{item.label}}</button>
        </nav>

        <main class="han-court-map" :inert="showHanCourtDetail&&viewportWidth<=760?true:undefined">
          <section id="han-court-core" class="han-court-section han-court-core-section">
            <header class="han-court-section-head"><span>01</span><div><h3>中枢</h3><small>皇权、东宫与辅政公位</small></div></header>
            <div class="han-imperial-axis" aria-label="皇帝">
              <div class="han-office-card han-office-card--sovereign han-office-card--structural">
                <span class="han-office-eyebrow">最高统治者</span><strong>{{courtHierarchy.root.name}}</strong>
              </div>
              <span class="han-structure-line" aria-hidden="true"></span>
            </div>
            <div class="han-core-stage">
              <div class="han-core-grid" aria-label="辅政、公位与大将军">
                <button v-for="node in hanCourtStructure.core" :key="'han-core-'+node.key" type="button" class="han-office-card"
                        :class="{selected:selectedNode&&selectedNode.key===node.key}" :aria-pressed="selectedNode&&selectedNode.key===node.key"
                        @click="selectHanCourtNode(node,$event)">
                  <span class="han-office-eyebrow">{{node.category}}</span><strong>{{node.name}}</strong>
                  <small>{{node.hanRank||'品秩未录'}}</small><p v-if="hanCourtDutySummary(node)">{{hanCourtDutySummary(node)}}</p>
                  <span v-if="courtResidenceAvailable(node)" class="han-office-residence">府</span>
                </button>
              </div>
              <div class="han-heir-branch">
                <button type="button" class="han-office-card han-office-card--heir" @click="openHanEastPalace">
                  <span class="han-office-eyebrow">东宫</span><strong>太子</strong><small>查看官属</small>
                </button>
              </div>
            </div>
          </section>

          <section v-if="hanCourtActiveSection==='han-court-nine'" id="han-court-nine" class="han-court-section">
            <header class="han-court-section-head"><span>02</span><div><h3>九卿</h3><small>礼制 · 宫卫 · 治政</small></div></header>
            <div class="han-nine-grid">
              <article v-for="group in hanCourtStructure.nineGroups" :key="group.id" class="han-nine-group">
                <h4>{{group.label}}</h4>
                <button v-for="node in group.items" :key="'han-nine-'+node.key" type="button" class="han-office-card han-office-card--compact"
                        :class="{selected:selectedNode&&selectedNode.key===node.key}" :aria-pressed="selectedNode&&selectedNode.key===node.key"
                        @click="selectHanCourtNode(node,$event)">
                  <strong>{{node.name}}</strong><small>{{node.hanRank}}</small><p>{{hanCourtDutySummary(node)}}</p>
                </button>
              </article>
            </div>
          </section>

          <section v-if="hanCourtActiveSection==='han-court-secretariat'" id="han-court-secretariat" class="han-court-section">
            <header class="han-court-section-head"><span>03</span><div><h3>台阁近侍</h3><small>章奏、监察与近侍官分区</small></div></header>
            <div class="han-functional-grid">
              <article v-for="group in hanCourtStructure.secretariatGroups" :key="group.id" class="han-functional-group">
                <header><h4>{{group.label}}</h4><span>{{group.items.length}}</span></header>
                <div class="han-office-chip-grid">
                  <button v-for="node in group.items" :key="'han-secretariat-'+node.key" type="button"
                          :class="{selected:selectedNode&&selectedNode.key===node.key}" :aria-pressed="selectedNode&&selectedNode.key===node.key"
                          @click="selectHanCourtNode(node,$event)">
                    <strong>{{node.name}}</strong><small>{{node.hanRank||node.category}}</small>
                  </button>
                </div>
              </article>
            </div>
          </section>

          <section v-if="hanCourtActiveSection==='han-court-military'" id="han-court-military" class="han-court-section">
            <header class="han-court-section-head"><span>04</span><div><h3>军职宿卫</h3><small>将军、郎卫、校尉与护边职分组</small></div></header>
            <div class="han-military-list">
              <article v-for="group in hanCourtStructure.militaryGroups" :key="group.id" class="han-military-group">
                <h4>{{group.label}}</h4>
                <div class="han-office-chip-grid">
                  <button v-for="node in group.items" :key="'han-military-'+node.key" type="button"
                          :class="{selected:selectedNode&&selectedNode.key===node.key}" :aria-pressed="selectedNode&&selectedNode.key===node.key"
                          @click="selectHanCourtNode(node,$event)">
                    <strong>{{node.name}}</strong><small>{{node.hanRank||'品秩未录'}}</small><span v-if="courtResidenceAvailable(node)">府</span>
                  </button>
                </div>
              </article>
            </div>
          </section>

          <section v-if="hanCourtActiveSection==='han-court-east-palace'" id="han-court-east-palace" class="han-court-section han-east-palace-section">
            <header class="han-court-section-head"><span>05</span><div><h3>东宫</h3><small>太子官属独立成署</small></div></header>
            <div class="han-east-palace-body">
              <div class="han-east-palace-roles" aria-label="东宫官属摘要">
                <span v-for="role in hanCourtStructure.eastPalaceRoles" :key="role.key">{{role.name}}</span>
              </div>
              <button type="button" class="han-system-action" @click="openHanEastPalace">查看东宫官属</button>
            </div>
          </section>

        </main>

        <teleport to="body" :disabled="viewportWidth>760">
          <button v-if="workspaceMode!=='review'&&showHanCourtDetail" type="button" class="han-court-detail-backdrop" aria-label="关闭官职详情" @click="closeHanCourtDetail()"></button>
          <aside v-if="workspaceMode!=='review'" id="han-court-detail" class="han-court-detail" :class="{'mobile-open':showHanCourtDetail}"
                 :role="viewportWidth<=760?'dialog':'complementary'" :aria-modal="viewportWidth<=760?'true':undefined"
                 aria-label="后汉官职详情" aria-live="polite" @keydown="handleHanCourtDetailKeydown">
          <button type="button" class="han-detail-close" aria-label="关闭官职详情" @click="closeHanCourtDetail()">关闭</button>
          <template v-if="hanCourtSelectedDetail">
            <header><span>{{hanCourtSelectedDetail.node.category}}</span><h3>{{hanCourtSelectedDetail.node.name}}</h3></header>
            <dl>
              <div v-if="hanCourtSelectedDetail.node.hanRank||hanCourtSelectedDetail.node.rank9"><dt>品秩</dt><dd>{{hanCourtSelectedDetail.node.hanRank||hanCourtSelectedDetail.node.rank9}}</dd></div>
              <div v-if="hanCourtSelectedDetail.parent"><dt>结构归属</dt><dd>{{hanCourtSelectedDetail.parent.name}}</dd></div>
            </dl>
            <section v-if="hanCourtSelectedDetail.node.duty"><h4>职掌</h4><p>{{hanCourtSelectedDetail.node.duty}}</p></section>
            <section v-if="hanCourtSelectedDetail.figures.length"><h4>任官人物</h4><div class="han-detail-people"><button v-for="figure in hanCourtSelectedDetail.figures" :key="figure.id||figure.personId||figure.name" type="button" @click="openCourtPerson(figure)">{{figure.name}}</button></div></section>
            <section v-if="hanCourtSelectedDetail.children.length"><h4>属官</h4><div class="han-detail-children"><button v-for="child in hanCourtSelectedDetail.children.slice(0,12)" :key="child.key" type="button" @click="selectHanCourtNode(child,$event)">{{child.name}}</button></div></section>
            <button v-if="courtResidenceAvailable(hanCourtSelectedDetail.node)" type="button" class="han-detail-residence" @click="openCourtResidence(hanCourtSelectedDetail.node)">进入府属</button>
          </template>
          <template v-else>
            <header><span>官署详情</span><h3>后汉百官</h3></header>
            <div class="han-detail-overview"><strong>{{hanCourtStructure.searchable.length}}</strong><span>项当前可见中央官职</span></div>
          </template>
          </aside>
        </teleport>
      </div>

      <footer class="han-court-legend" aria-label="结构图说明">
        <span><i class="axis"></i>连线表示展示层级，不自动等同逐级直属</span>
        <span><i class="group"></i>分组表示制度功能，不跨类强定尊卑</span>
        <span><i class="residence">府</i>仅在已有府属规范记录时出现</span>
      </footer>
    </div>
  `};

/* ------------------------------------------------------------------
 * 通用朝堂画布（court-canvas，非后汉势力）＋空态提示
 * ------------------------------------------------------------------ */
export const OfficesCourtCanvas = {
  name: 'OfficesCourtCanvas',
  props: {
    state: { type: Object, required: true }
  },
  computed: {
    workspaceMode() { return this.state.workspaceMode; },
    currentFactionDef() { return this.state.currentFactionDef; },
    selectedNode() { return this.state.selectedNode; },
    courtHierarchy() { return this.state.courtHierarchy; },
    courtActiveState() { return this.state.courtActiveState; },
    courtResidence() { return this.state.courtResidence; },
    courtResidenceIsLocal() { return this.state.courtResidenceIsLocal; },
    courtResidenceAvailable() { return this.state.courtResidenceAvailable; },
    setOfficePresentation() { return this.state.setOfficePresentation; },
    courtPrimaryFigure() { return this.state.courtPrimaryFigure; },
    courtFigureCount() { return this.state.courtFigureCount; },
    courtSeatCount() { return this.state.courtSeatCount; },
    courtFigureSlots() { return this.state.courtFigureSlots; },
    courtColumnCount() { return this.state.courtColumnCount; },
    courtSeatMeta() { return this.state.courtSeatMeta; },
    courtSlotClick() { return this.state.courtSlotClick; },
    courtDisplayName() { return this.state.courtDisplayName; },
    courtRulerLabel() { return this.state.courtRulerLabel; },
    selectCourtState() { return this.state.selectCourtState; },
    selectCourtSlot() { return this.state.selectCourtSlot; },
    openCourtPerson() { return this.state.openCourtPerson; },
    openCourtResidence() { return this.state.openCourtResidence; },
    addCourtPosition() { return this.state.addCourtPosition; },
    deleteCourtPosition() { return this.state.deleteCourtPosition; },
    personPortraitFor() { return this.state.personPortraitFor; },
    portraitStyleFor() { return this.state.portraitStyleFor; }
  },
  template: `
    <div v-else-if="courtHierarchy.root" class="court-canvas" :style="{'--court-accent':currentFactionDef.color}">
      <header class="court-heading">
        <h2>{{currentFactionDef.label||currentFactionDef.name}}中央官署总览</h2>
        <div v-if="workspaceMode==='review'" class="court-heading-actions review-only">
          <el-button size="small" type="primary" plain @click="addCourtPosition">＋ 添加朝堂位置</el-button>
          <el-button size="small" text type="danger" @click="deleteCourtPosition">删除自定义位置</el-button>
          <el-button class="review-only" size="small" text @click="setOfficePresentation('table')">打开数据表</el-button>
        </div>
      </header>
      <div v-if="!courtResidenceIsLocal||courtPrimaryFigure(courtResidence.owner)" class="court-sovereign-row">
        <article class="court-slot sovereign" role="button" tabindex="0" :class="{selected:selectedNode&&selectedNode.key===courtHierarchy.root.key}" @click="selectCourtSlot(courtHierarchy.root)" @keydown.enter.prevent="selectCourtSlot(courtHierarchy.root)" @keydown.space.prevent="selectCourtSlot(courtHierarchy.root)">
          <div class="court-slot-name">{{courtHierarchy.root.name}}</div>
          <div class="court-slot-person">
            <div class="court-portrait"><span>{{courtRulerLabel().slice(0,1)}}</span></div>
            <div class="court-person-name">{{courtRulerLabel()}}</div>
          </div>
          <div class="court-slot-meta">君主</div>
        </article>
      </div>
      <div class="court-link-vertical"></div>
      <section class="court-tier court-heir-tier">
        <div class="court-tier-title"><span>太子</span></div>
        <div class="court-tier-grid">
          <article v-for="node in [courtHierarchy.heir]" :key="node.key" class="court-slot heir-slot"
                   :class="{selected:selectedNode&&selectedNode.key===node.key,virtual:node.virtualSlot}" @click="courtSlotClick(node)">
            <div class="court-slot-name">{{courtDisplayName(node)}}</div>
            <div class="court-slot-person">
              <template v-if="courtPrimaryFigure(node)">
                <div class="court-portrait" :style="portraitStyleFor(courtPrimaryFigure(node))"><img loading="lazy" decoding="async" v-if="personPortraitFor(courtPrimaryFigure(node).name,[courtPrimaryFigure(node)])" :src="personPortraitFor(courtPrimaryFigure(node).name,[courtPrimaryFigure(node)])" :alt="courtPrimaryFigure(node).name+'立绘'"/><span v-else>{{courtPrimaryFigure(node).name.slice(0,1)}}</span></div>
                <button class="court-person-name court-person-link" @click.stop="openCourtPerson(courtPrimaryFigure(node))">{{courtPrimaryFigure(node).name}}</button>
              </template>
              <div v-else class="court-person-empty">{{node.virtualSlot?'未立／人物未详':'暂无任官记录'}}</div>
            </div>
            <div class="court-slot-meta">{{courtSeatMeta(node)}}</div>
            <button v-if="courtResidenceAvailable(node)" type="button" class="court-residence-badge" title="进入府属" @click.stop="openCourtResidence(node)">府</button>
            <span v-if="courtFigureCount(node)>1" class="court-slot-count" :class="{'has-residence':courtResidenceAvailable(node)}" :title="'本期共 '+courtFigureCount(node)+' 条任职记录'">{{courtFigureCount(node)}}</span>
          </article>
        </div>
      </section>
      <div class="court-link-vertical"></div>
      <section class="court-tier">
        <div class="court-tier-title"><span>公位</span></div>
        <div class="court-apex-columns">
          <section class="court-apex-branch civil">
            <div class="court-apex-branch-title">文官公位</div>
            <div class="court-tier-grid">
            <article v-for="node in courtHierarchy.apexCivil" :key="node.key" class="court-slot civil"
                       :class="{selected:selectedNode&&selectedNode.key===node.key}" @click="courtSlotClick(node)">
                <span class="court-branch-badge" aria-label="文官">文</span>
                <div class="court-slot-name">{{node.name}}</div>
                <div class="court-slot-person">
                  <template v-if="courtPrimaryFigure(node)">
                    <div class="court-portrait" :style="portraitStyleFor(courtPrimaryFigure(node))"><img loading="lazy" decoding="async" v-if="personPortraitFor(courtPrimaryFigure(node).name,[courtPrimaryFigure(node)])" :src="personPortraitFor(courtPrimaryFigure(node).name,[courtPrimaryFigure(node)])" :alt="courtPrimaryFigure(node).name+'立绘'"/><span v-else>{{courtPrimaryFigure(node).name.slice(0,1)}}</span></div>
                    <button class="court-person-name court-person-link" @click.stop="openCourtPerson(courtPrimaryFigure(node))">{{courtPrimaryFigure(node).name}}</button>
                  </template>
                  <div v-else class="court-person-empty">暂无任官记录</div>
                </div>
                <div class="court-slot-meta">{{courtSeatMeta(node)}}</div>
                <button v-if="courtResidenceAvailable(node)" type="button" class="court-residence-badge" title="进入府属" @click.stop="openCourtResidence(node)">府</button>
                <span v-if="courtFigureCount(node)>1" class="court-slot-count" :class="{'has-residence':courtResidenceAvailable(node)}" :title="'本期共 '+courtFigureCount(node)+' 条任职记录'">{{courtFigureCount(node)}}</span>
              </article>
            </div>
          </section>
          <section class="court-apex-branch military">
            <div class="court-apex-branch-title">武官公位</div>
            <div class="court-tier-grid">
              <article v-for="node in courtHierarchy.apexMilitary" :key="node.key" class="court-slot military"
                       :class="{selected:selectedNode&&selectedNode.key===node.key}" @click="courtSlotClick(node)">
                <span class="court-branch-badge" aria-label="武官">武</span>
                <div class="court-slot-name">{{node.name}}</div>
                <div class="court-slot-person">
                  <template v-if="courtPrimaryFigure(node)">
                    <div class="court-portrait" :style="portraitStyleFor(courtPrimaryFigure(node))"><img loading="lazy" decoding="async" v-if="personPortraitFor(courtPrimaryFigure(node).name,[courtPrimaryFigure(node)])" :src="personPortraitFor(courtPrimaryFigure(node).name,[courtPrimaryFigure(node)])" :alt="courtPrimaryFigure(node).name+'立绘'"/><span v-else>{{courtPrimaryFigure(node).name.slice(0,1)}}</span></div>
                    <button class="court-person-name court-person-link" @click.stop="openCourtPerson(courtPrimaryFigure(node))">{{courtPrimaryFigure(node).name}}</button>
                  </template>
                  <div v-else class="court-person-empty">暂无任官记录</div>
                </div>
                <div class="court-slot-meta">{{courtSeatMeta(node)}}</div>
                <button v-if="courtResidenceAvailable(node)" type="button" class="court-residence-badge" title="进入府属" @click.stop="openCourtResidence(node)">府</button>
                <span v-if="courtFigureCount(node)>1" class="court-slot-count" :class="{'has-residence':courtResidenceAvailable(node)}" :title="'本期共 '+courtFigureCount(node)+' 条任职记录'">{{courtFigureCount(node)}}</span>
              </article>
            </div>
          </section>
        </div>
      </section>
      <div class="court-columns" aria-label="文官与武官分列">
        <section v-for="column in courtHierarchy.columns" :key="column.key" class="court-column" :class="column.key">
          <div class="court-column-title">{{column.label}}<span>{{courtColumnCount(column)}} 项具体官职</span></div>
          <section v-for="group in column.groups" :key="group.label" class="court-department">
            <div class="court-department-head"><span>{{group.label}}</span></div>
            <div class="court-office-track">
              <article v-for="node in group.items" :key="node.key" class="court-slot"
                       :class="[column.key,{selected:selectedNode&&selectedNode.key===node.key}]" @click="courtSlotClick(node)">
                <span class="court-branch-badge" :aria-label="column.label">{{column.key==='military'?'武':'文'}}</span>
                <div class="court-slot-name">{{node.name}}</div>
                <div class="court-seat-grid" :class="{many:courtSeatCount(node)>1}">
                  <div v-for="(figure,index) in courtFigureSlots(node)" :key="(figure&&figure.id)||node.key+'-seat-'+index" class="court-seat">
                    <template v-if="figure">
                      <div class="court-portrait" :style="portraitStyleFor(figure)"><img loading="lazy" decoding="async" v-if="personPortraitFor(figure.name,[figure])" :src="personPortraitFor(figure.name,[figure])" :alt="figure.name+'立绘'"/><span v-else>{{figure.name.slice(0,1)}}</span></div>
                      <button class="court-seat-name" @click.stop="openCourtPerson(figure)">{{figure.name}}</button>
                    </template>
                    <span v-else class="court-seat-empty">空席</span>
                  </div>
                </div>
                <div class="court-slot-meta">{{courtSeatMeta(node)}}</div>
                <button v-if="courtResidenceAvailable(node)" type="button" class="court-residence-badge" title="进入府属" @click.stop="openCourtResidence(node)">府</button>
                <span v-if="courtSeatCount(node)>1" class="court-slot-count" :class="{'has-residence':courtResidenceAvailable(node)}" :title="'本期设置 '+courtSeatCount(node)+' 席；已录 '+courtFigureCount(node)+' 人'">{{courtSeatCount(node)}}</span>
              </article>
            </div>
          </section>
        </section>
      </div>
      <section v-if="courtHierarchy.states.length" class="court-local">
        <div class="court-local-head"><strong>州郡长吏</strong><span>州牧／刺史统州，太守／国相治郡国</span></div>
        <div class="court-state-tabs" role="tablist" aria-label="州级政区">
          <button v-for="item in courtHierarchy.states" :key="item.node.key" class="court-state-tab"
                  :class="{active:courtActiveState&&courtActiveState.node.key===item.node.key}" @click="selectCourtState(item.node.key)">{{item.node.region||item.node.name}}</button>
        </div>
        <div v-if="courtActiveState" class="court-local-chain">
          <div class="court-state-holder">
            <article class="court-state-card" role="button" tabindex="0" @click="courtSlotClick(courtActiveState.node)" @keydown.enter.prevent="courtSlotClick(courtActiveState.node)" @keydown.space.prevent="courtSlotClick(courtActiveState.node)">
              <strong>{{courtActiveState.node.name}}</strong><span>{{courtActiveState.node.region}} · 州牧／刺史</span>
            </article>
          </div>
          <div class="court-local-trunk"></div>
          <div class="court-commandery-grid">
            <article v-for="node in courtActiveState.commanderies" :key="node.key" class="court-commandery"
                     :class="{selected:selectedNode&&selectedNode.key===node.key}" @click="courtSlotClick(node)">
              <strong>{{node.name}}</strong><span>{{/国$/.test(node.name)?'国相':'太守'}} · {{node.region}}</span>
            </article>
          </div>
        </div>
      </section>
    </div>
    <div v-else class="court-empty">当前体系尚无可显示的中央官署节点。</div>
  </div>
  `};

/* ------------------------------------------------------------------
 * 府署画布（office-residence-canvas）
 * ------------------------------------------------------------------ */
export const OfficesCourtResidence = {
  name: 'OfficesCourtResidence',
  props: {
    state: { type: Object, required: true }
  },
  computed: {
    workspaceMode() { return this.state.workspaceMode; },
    treeType() { return this.state.treeType; },
    officePresentation() { return this.state.officePresentation; },
    showCourtResidence() { return this.state.showCourtResidence; },
    selectedNode() { return this.state.selectedNode; },
    courtResidence() { return this.state.courtResidence; },
    courtResidenceIsLocal() { return this.state.courtResidenceIsLocal; },
    courtResidenceClass() { return this.state.courtResidenceClass; },
    courtResidenceStyle() { return this.state.courtResidenceStyle; },
    courtResidenceName() { return this.state.courtResidenceName; },
    courtResidenceType() { return this.state.courtResidenceType; },
    courtResidencePopulatedRoles() { return this.state.courtResidencePopulatedRoles; },
    courtPrimaryFigure() { return this.state.courtPrimaryFigure; },
    courtResidenceRoleMeta() { return this.state.courtResidenceRoleMeta; },
    courtSeatStats() { return this.state.courtSeatStats; },
    courtKaifuLabel() { return this.state.courtKaifuLabel; },
    selectCourtSlot() { return this.state.selectCourtSlot; },
    openCourtPerson() { return this.state.openCourtPerson; },
    personPortraitFor() { return this.state.personPortraitFor; },
    portraitStyleFor() { return this.state.portraitStyleFor; },
    closeCourtResidence() { return this.state.closeCourtResidence; },
    editCourtResidenceOwner() { return this.state.editCourtResidenceOwner; }
  },
  template: `
  <div v-if="officePresentation==='catalog'&&treeType==='office'&&showCourtResidence" class="court-scroll">
    <div class="court-canvas office-residence-canvas" :class="courtResidenceClass" :style="courtResidenceStyle">
      <header class="court-heading">
        <h2>{{courtResidence.owner?courtResidence.owner.name:'府属'}} · {{courtResidenceName}}</h2>
        <p class="residence-owner-note">府主：<strong>{{courtResidence.owner&&courtPrimaryFigure(courtResidence.owner)?courtPrimaryFigure(courtResidence.owner).name:(courtResidence.definition&&courtResidence.definition.ownerPersonName||'任职人物未详')}}</strong><template v-if="workspaceMode==='review'"> · 开府依据：<strong>{{courtKaifuLabel(courtResidence.owner)}}</strong></template> · 府署类型：{{courtResidenceType}}</p>
        <div v-if="workspaceMode==='review'" class="residence-policy-strip review-only">
          <span class="residence-policy-tag" :class="{verified:courtResidence.kaifuPolicy&&courtResidence.kaifuPolicy.researchStatus==='确定'}">{{courtResidence.kaifuPolicy&&courtResidence.kaifuPolicy.evidence&&courtResidence.kaifuPolicy.evidence.sourceLocator||'开府依据待考'}}</span>
          <span class="residence-policy-tag" :class="{verified:courtResidence.definition&&courtResidence.definition.researchStatus==='确定'}">{{courtResidence.definition&&courtResidence.definition.evidence&&courtResidence.definition.evidence.sourceLocator||'府属来源待考'}}</span>
          <span class="residence-policy-tag">制度员额与展示席位分列；实任人数按当前时期去重</span>
        </div>
        <div class="court-heading-actions">
          <el-button size="small" type="primary" plain @click="closeCourtResidence">← 返回朝堂</el-button>
          <el-button v-if="workspaceMode==='review'" class="review-only" size="small" text @click="editCourtResidenceOwner">编辑府主</el-button>
        </div>
      </header>
      <div class="court-sovereign-row">
        <article v-if="courtResidence.owner" class="court-slot sovereign selected" role="button" tabindex="0" @click="selectCourtSlot(courtResidence.owner)" @keydown.enter.prevent="selectCourtSlot(courtResidence.owner)" @keydown.space.prevent="selectCourtSlot(courtResidence.owner)">
          <div class="court-slot-name">府主</div>
          <div class="court-slot-person">
            <template v-if="courtPrimaryFigure(courtResidence.owner)">
              <div class="court-portrait" :style="portraitStyleFor(courtPrimaryFigure(courtResidence.owner))"><img loading="lazy" decoding="async" v-if="personPortraitFor(courtPrimaryFigure(courtResidence.owner).name,[courtPrimaryFigure(courtResidence.owner)])" :src="personPortraitFor(courtPrimaryFigure(courtResidence.owner).name,[courtPrimaryFigure(courtResidence.owner)])" :alt="courtPrimaryFigure(courtResidence.owner).name+'立绘'"/><span v-else>{{courtPrimaryFigure(courtResidence.owner).name.slice(0,1)}}</span></div>
              <button class="court-person-name court-person-link" @click.stop="openCourtPerson(courtPrimaryFigure(courtResidence.owner))">{{courtPrimaryFigure(courtResidence.owner).name}}</button>
            </template>
            <div v-else class="court-person-empty">府主人物未详</div>
          </div>
          <div class="court-slot-meta">{{courtResidence.owner.name}}</div>
        </article>
      </div>
      <div v-if="!courtResidenceIsLocal||courtPrimaryFigure(courtResidence.owner)" class="court-link-vertical"></div>
      <section class="court-tier">
        <div class="court-tier-title"><span>府属官次</span></div>
        <div v-if="courtResidenceIsLocal" class="v69-local-residence-definition">
          <strong>府属定义</strong>
          <div><span v-for="node in courtResidence.roles" :key="'definition-'+node.key">{{node.name}}</span></div>
          <p v-if="!courtResidencePopulatedRoles.length">当前没有已核到任人物。</p>
        </div>
        <div v-if="(courtResidenceIsLocal?courtResidencePopulatedRoles:courtResidence.roles).length" class="residence-role-track">
          <article v-for="(node,index) in (courtResidenceIsLocal?courtResidencePopulatedRoles:courtResidence.roles)" :key="node.key" class="residence-role-card"
                   :class="{selected:selectedNode&&selectedNode.key===node.key}" @click="selectCourtSlot(node)">
            <span class="residence-role-order">{{index+1}}</span>
            <div class="residence-role-name">{{node.name}}</div>
            <div class="residence-role-person">
              <template v-if="courtPrimaryFigure(node)">
                <div class="court-portrait" :style="portraitStyleFor(courtPrimaryFigure(node))"><img loading="lazy" decoding="async" v-if="personPortraitFor(courtPrimaryFigure(node).name,[courtPrimaryFigure(node)])" :src="personPortraitFor(courtPrimaryFigure(node).name,[courtPrimaryFigure(node)])" :alt="courtPrimaryFigure(node).name+'立绘'"/><span v-else>{{courtPrimaryFigure(node).name.slice(0,1)}}</span></div>
                <button class="court-person-name court-person-link" @click.stop="openCourtPerson(courtPrimaryFigure(node))">{{courtPrimaryFigure(node).name}}</button>
              </template>
              <div v-else class="court-person-empty">暂无任官记录</div>
            </div>
            <div class="residence-role-meta">{{courtResidenceRoleMeta(node)}}</div>
            <div class="residence-counts">
              <span v-if="workspaceMode==='review'" :class="{uncertain:courtSeatStats(courtResidence.owner,node).authorized===null}"><b>{{courtSeatStats(courtResidence.owner,node).authorized===null?'待考':courtSeatStats(courtResidence.owner,node).authorized}}</b>制度员额</span>
              <span><b>{{courtSeatStats(courtResidence.owner,node).display}}</b>展示席位</span>
              <span><b>{{courtSeatStats(courtResidence.owner,node).actual}}</b>实任人数</span>
            </div>
          </article>
        </div>
        <div v-else-if="!courtResidenceIsLocal" class="residence-empty">当前府属尚未录入具体属官。<br/>可返回朝堂，按三公府、将军府、都督府、州府、郡府或东宫的实际归属补充任官记录。</div>
      </section>
    </div>
  </div>
  `};

/* ------------------------------------------------------------------
 * 总览工作台（catalog-workbench：爵位层级目录 + 卡片区 + 爵位事件）
 * ------------------------------------------------------------------ */
export const OfficesCatalog = {
  name: 'OfficesCatalog',
  props: {
    state: { type: Object, required: true }
  },
  computed: {
    workspaceMode() { return this.state.workspaceMode; },
    currentFaction() { return this.state.currentFaction; },
    currentFactionDef() { return this.state.currentFactionDef; },
    treeType() { return this.state.treeType; },
    officePresentation() { return this.state.officePresentation; },
    selectedNode() { return this.state.selectedNode; },
    catalogTreeRows() { return this.state.catalogTreeRows; },
    catalogFocusNode() { return this.state.catalogFocusNode; },
    catalogCards() { return this.state.catalogCards; },
    catalogPath() { return this.state.catalogPath; },
    catalogYearLabel() { return this.state.catalogYearLabel; },
    catalogRowExpanded() { return this.state.catalogRowExpanded; },
    catalogNodeIcon() { return this.state.catalogNodeIcon; },
    catalogNodeMeta() { return this.state.catalogNodeMeta; },
    catalogNodeSummary() { return this.state.catalogNodeSummary; },
    toggleCatalogRow() { return this.state.toggleCatalogRow; },
    selectCatalogNode() { return this.state.selectCatalogNode; },
    selectCatalogCard() { return this.state.selectCatalogCard; },
    openPersonProfile() { return this.state.openPersonProfile; },
    personPortraitFor() { return this.state.personPortraitFor; },
    portraitStyleFor() { return this.state.portraitStyleFor; },
    peerageNodeEvents() { return this.state.peerageNodeEvents; },
    peerageEventRecipientRows() { return this.state.peerageEventRecipientRows; },
    peerageNodeRecipientRows() { return this.state.peerageNodeRecipientRows; },
    peerageNodeMetrics() { return this.state.peerageNodeMetrics; },
    openPeerageEventPerson() { return this.state.openPeerageEventPerson; },
    officeGroupColor() { return this.state.officeGroupColor; },
    officeGroupLabel() { return this.state.officeGroupLabel; }
  },
  template: `
  <div v-if="officePresentation==='catalog'&&treeType==='noble'" class="catalog-workbench">
    <aside class="catalog-hierarchy" aria-label="职官爵位层级目录">
      <div class="catalog-hierarchy-head">
        <strong>{{treeType==='office'?'职官层级':'爵位层级'}}</strong>
        <span>沿制度层级展开；右侧显示具体{{treeType==='office'?'官名与任职人物':'爵位与受爵人物'}}。</span>
      </div>
      <div class="catalog-tree-scroll">
        <div v-for="row in catalogTreeRows" :key="row.node.key"
             class="catalog-tree-row" :class="{active:catalogFocusNode&&catalogFocusNode.key===row.node.key,root:row.node.kind==='root'}"
             :style="{'--depth':row.depth}" @click="selectCatalogNode(row)">
          <button class="catalog-tree-toggle" :class="{empty:!row.childCount}" :aria-label="catalogRowExpanded(row)?'折叠':'展开'"
                  @click.stop="toggleCatalogRow(row)">{{row.childCount?(catalogRowExpanded(row)?'▾':'▸'):''}}</button>
          <span class="catalog-tree-name" :title="row.node.name">{{row.node.name}}</span>
          <span class="catalog-tree-count" v-if="row.childCount">{{row.childCount}}</span>
        </div>
      </div>
    </aside>
    <section class="catalog-content" v-if="catalogFocusNode">
      <div class="catalog-content-head">
        <div>
          <div class="catalog-breadcrumb">{{catalogPath}}</div>
          <h2>{{catalogFocusNode.name}}</h2>
          <p>{{catalogNodeMeta(catalogFocusNode)}}<template v-if="workspaceMode==='review'"> · 点击卡片后可在审校面板编辑完整条目</template></p>
        </div>
        <div class="catalog-count-seal"><strong>{{catalogCards.length}}</strong><span>本层条目</span></div>
      </div>
      <div class="catalog-card-grid">
        <article v-for="node in catalogCards" :key="node.key" class="catalog-card"
                 :class="{selected:selectedNode&&selectedNode.key===node.key}"
                 :style="{'--catalog-accent':node.color||currentFactionDef.color}" @click="selectCatalogCard(node)">
          <div class="catalog-card-top">
            <div class="catalog-card-icon">{{catalogNodeIcon(node)}}</div>
            <div class="catalog-card-title"><h3>{{node.name}}</h3><p>{{catalogNodeMeta(node)}}</p></div>
            <span v-if="node.kind==='office'" class="catalog-group-pill" :style="{color:officeGroupColor(node),background:officeGroupColor(node)+'14'}">{{officeGroupLabel(node)}}</span>
          </div>
          <div class="catalog-card-badges">
            <span v-if="node.rank9||node.hanRank||node.nobleRank" class="catalog-card-badge">{{node.rank9||node.hanRank||node.nobleRank}}</span>
            <span v-if="node.officeStartYear||node.officeEndYear" class="catalog-card-badge">{{node.officeStartYear||'？'}}—{{node.officeEndYear||'？'}}</span>
            <span v-if="node.yaoling" class="catalog-card-badge special">遥领</span>
            <span v-if="node.virtual" class="catalog-card-badge special">虚职</span>
            <span v-if="node.kaifu" class="catalog-card-badge special">可开府</span>
            <span v-if="node.actualFief===false" class="catalog-card-badge special">虚封</span>
            <span v-if="currentFaction==='wei'&&node.peerageNodeId" class="catalog-card-badge v66-peerage-count">{{peerageNodeMetrics(node).events}} 件 · {{peerageNodeMetrics(node).people}} 人</span>
          </div>
          <p class="catalog-card-duty">{{catalogNodeSummary(node)}}</p>
          <div class="catalog-people">
            <button v-for="person in (node.figures||[]).slice(0,6)" :key="person.id||person.name+person.startYear"
                    class="catalog-person-chip" :title="person.name+' · '+catalogYearLabel(person)"
                    @click.stop="openPersonProfile(person.name)">
              <span class="catalog-person-avatar" :style="portraitStyleFor(person)"><img loading="lazy" decoding="async" v-if="personPortraitFor(person.name,[person])" :src="personPortraitFor(person.name,[person])" :alt="person.name+'立绘'"/><span v-else>{{person.name.slice(0,1)}}</span></span>
              <span>{{person.name}}</span>
            </button>
            <template v-if="currentFaction==='wei'&&node.peerageNodeId">
              <button v-for="recipient in peerageNodeRecipientRows(node).slice(0,6)" :key="'peerage-'+node.key+'-'+recipient.key" class="catalog-person-chip" @click.stop="openPeerageEventPerson(recipient.personRef)">
                <span class="catalog-person-avatar"><span>{{recipient.label.slice(0,1)}}</span></span>
                <span>{{recipient.label}}</span>
              </button>
            </template>
            <span v-else-if="!node.figures||node.figures.length===0" class="catalog-no-people">尚未录入人物</span>
            <span v-else-if="node.figures.length>6" class="catalog-no-people">另 {{node.figures.length-6}} 人</span>
          </div>
        </article>
        <div v-if="catalogCards.length===0" class="catalog-empty">当前层级没有符合筛选条件的条目。<br/>可清除筛选，或在左侧选择其他层级。</div>
      </div>
      <section v-if="currentFaction==='wei'&&selectedNode&&selectedNode.peerageNodeId" class="v66-peerage-events" aria-live="polite">
        <header><div><small>曹魏封爵关联</small><h3>{{selectedNode.name}}</h3></div><strong>{{peerageNodeMetrics(selectedNode).events}} 件 · {{peerageNodeMetrics(selectedNode).people}} 人</strong></header>
        <div v-if="peerageNodeEvents(selectedNode).length" class="v66-peerage-event-list">
          <article v-for="event in peerageNodeEvents(selectedNode).slice(0,24)" :key="event.eventId">
            <time>{{event.grantDate||event.year||''}}</time>
            <div><b>{{event.title||event.rawRecipient||'封爵记录'}}</b><span>{{event.rank||''}}<template v-if="event.rawRecipient"> · {{event.rawRecipient}}</template></span></div>
            <div class="v66-peerage-event-recipients">
              <button v-for="recipient in peerageEventRecipientRows(event)" :key="event.eventId+'-'+recipient.key" type="button" @click="openPeerageEventPerson(recipient.personRef)">{{recipient.label}}</button>
              <span v-if="!peerageEventRecipientRows(event).length">{{event.rawRecipient}}</span>
            </div>
          </article>
        </div>
        <p v-else>当前节点没有已核且可公开的曹魏本朝封爵事件。</p>
      </section>
    </section>
  </div>
  `};

/* ------------------------------------------------------------------
 * 表格视图（office-table-wrap）
 * 列显隐开关由 el-checkbox v-model 直接写 tableColumns（reactive 对象，
 * 嵌套写入不经父层代理，故无需改写）；行内编辑直写 scope.row。
 * ------------------------------------------------------------------ */
export const OfficesTable = {
  name: 'OfficesTable',
  props: {
    state: { type: Object, required: true }
  },
  computed: {
    treeType() { return this.state.treeType; },
    officePresentation() { return this.state.officePresentation; },
    tableColumns() { return this.state.tableColumns; },
    officeRows() { return this.state.officeRows; },
    CATEGORY_OPTIONS() { return this.state.CATEGORY_OPTIONS; },
    selectOfficeRow() { return this.state.selectOfficeRow; },
    onFormChangedDebounced() { return this.state.onFormChangedDebounced; },
    officeGroupColor() { return this.state.officeGroupColor; },
    officeGroupLabel() { return this.state.officeGroupLabel; }
  },
  template: `
  <div v-if="treeType==='office' && officePresentation==='table'" class="office-table-wrap">
    <div class="office-table-card">
      <div style="display:flex;align-items:center;justify-content:flex-end;padding:7px 12px;border-bottom:1px solid var(--rule);gap:8px;">
        <span style="font-size:11px;color:#8A918A;">表格内可直接编辑名称、类别、职权与辖区</span>
        <el-popover placement="bottom-end" width="170" trigger="click">
          <template #reference><el-button size="small" text>列显示 ▾</el-button></template>
          <el-checkbox v-model="tableColumns.name">官职</el-checkbox>
          <el-checkbox v-model="tableColumns.level">层级</el-checkbox>
          <el-checkbox v-model="tableColumns.category">类别</el-checkbox>
          <el-checkbox v-model="tableColumns.rank">品级／秩俸</el-checkbox>
          <el-checkbox v-model="tableColumns.duty">职权</el-checkbox>
          <el-checkbox v-model="tableColumns.region">辖区</el-checkbox>
          <el-checkbox v-model="tableColumns.years">沿革年代</el-checkbox>
          <el-checkbox v-model="tableColumns.figures">历任人物</el-checkbox>
        </el-popover>
      </div>
      <el-table :data="officeRows" height="100%" size="small" @row-click="selectOfficeRow" highlight-current-row>
        <el-table-column v-if="tableColumns.name" prop="name" label="官职" min-width="170" fixed sortable>
          <template #default="scope"><el-input v-model="scope.row.name" size="mini" @click.stop @change="onFormChangedDebounced" /></template>
        </el-table-column>
        <el-table-column v-if="tableColumns.level" label="层级" width="132" sortable>
          <template #default="scope"><span class="scope-pill" :style="{background:officeGroupColor(scope.row)+'14',color:officeGroupColor(scope.row)}">{{officeGroupLabel(scope.row)}}</span></template>
        </el-table-column>
        <el-table-column v-if="tableColumns.category" label="官职类别" width="148" sortable>
          <template #default="scope"><el-select v-model="scope.row.category" size="mini" @click.stop @change="onFormChangedDebounced"><el-option v-for="c in CATEGORY_OPTIONS" :key="c" :label="c" :value="c" /></el-select></template>
        </el-table-column>
        <el-table-column v-if="tableColumns.rank" label="品级／秩俸" width="118" sortable><template #default="scope">{{scope.row.rank9||scope.row.hanRank||'—'}}</template></el-table-column>
        <el-table-column v-if="tableColumns.duty" label="主要职权" min-width="220" show-overflow-tooltip><template #default="scope"><el-input v-model="scope.row.duty" size="mini" type="textarea" :rows="1" @click.stop @change="onFormChangedDebounced" /></template></el-table-column>
        <el-table-column v-if="tableColumns.region" label="辖区" min-width="140"><template #default="scope"><el-input v-model="scope.row.region" size="mini" @click.stop @change="onFormChangedDebounced" /></template></el-table-column>
        <el-table-column v-if="tableColumns.years" label="沿革年代" width="132" sortable><template #default="scope">{{scope.row.officeStartYear||'？'}}—{{scope.row.officeEndYear||'？'}}</template></el-table-column>
        <el-table-column v-if="tableColumns.figures" label="历任人物" min-width="150" show-overflow-tooltip><template #default="scope">{{(scope.row.figures||[]).map(p=>p.name).filter(Boolean).join('、')||'—'}}</template></el-table-column>
      </el-table>
    </div>
  </div>
  `};

/* ------------------------------------------------------------------
 * 详情面板（right-panel，仅审校模式显示）
 * 官职／爵位两套表单、沿革事件、历任人物。表单字段以 v-model 直写
 * selectedNode.*（对象属性写入不经代理），故模板逐字保留。
 * ------------------------------------------------------------------ */
export const OfficesDetail = {
  name: 'OfficesDetail',
  props: {
    state: { type: Object, required: true }
  },
  computed: {
    workspaceMode() { return this.state.workspaceMode; },
    currentFaction() { return this.state.currentFaction; },
    selectedNode() { return this.state.selectedNode; },
    selectedPolityLabel() { return this.state.selectedPolityLabel; },
    selectedDraftTime() { return this.state.selectedDraftTime; },
    rank9Enabled() { return this.state.rank9Enabled; },
    periodOptions() { return this.state.periodOptions; },
    mountOptions() { return this.state.mountOptions; },
    CATEGORY_OPTIONS() { return this.state.CATEGORY_OPTIONS; },
    EVOLUTION_TYPES() { return this.state.EVOLUTION_TYPES; },
    HAN_RANK_OPTIONS() { return this.state.HAN_RANK_OPTIONS; },
    INHERIT_OPTIONS() { return this.state.INHERIT_OPTIONS; },
    INSTITUTION_TYPE_OPTIONS() { return this.state.INSTITUTION_TYPE_OPTIONS; },
    JIAGUAN_OPTIONS() { return this.state.JIAGUAN_OPTIONS; },
    JIE_OPTIONS() { return this.state.JIE_OPTIONS; },
    NOBLE_RANK_OPTIONS() { return this.state.NOBLE_RANK_OPTIONS; },
    RANK9_OPTIONS() { return this.state.RANK9_OPTIONS; },
    REGION_OPTIONS() { return this.state.REGION_OPTIONS; },
    RELATION_OPTIONS() { return this.state.RELATION_OPTIONS; },
    SERVICE_DOMAIN_OPTIONS() { return this.state.SERVICE_DOMAIN_OPTIONS; },
    onFormChangedDebounced() { return this.state.onFormChangedDebounced; },
    generateKaifuTemplate() { return this.state.generateKaifuTemplate; },
    syncRegionFromPath() { return this.state.syncRegionFromPath; },
    jumpToMount() { return this.state.jumpToMount; },
    addFigureRecord() { return this.state.addFigureRecord; },
    removeFigureRecord() { return this.state.removeFigureRecord; },
    addEvolutionEvent() { return this.state.addEvolutionEvent; },
    removeEvolutionEvent() { return this.state.removeEvolutionEvent; },
    onFigureRulerChanged() { return this.state.onFigureRulerChanged; },
    uploadPortrait() { return this.state.uploadPortrait; },
    clearPortrait() { return this.state.clearPortrait; },
    restoreCurrentDraft() { return this.state.restoreCurrentDraft; },
    clearCurrentDraft() { return this.state.clearCurrentDraft; },
    personPortraitFor() { return this.state.personPortraitFor; },
    portraitStyleFor() { return this.state.portraitStyleFor; }
  },
  template: `
  <div v-show="workspaceMode==='review'" class="right-panel review-only">
    <div class="panel-head">
      <div class="name serif">{{ selectedNode ? selectedNode.name : '属性面板' }}</div>
      <div class="sub" v-if="selectedNode">{{ selectedPolityLabel }} · {{ selectedNode.kind==='office' ? '官职' : (selectedNode.kind==='root' ? '根节点' : '爵位') }}</div>
      <div class="sub" v-else>点击朝堂官位或表格行以编辑其属性</div>
    </div>
    <div class="panel-body">
      <div v-if="!selectedNode" class="panel-empty">
        <div class="glyph">職</div>
        尚未选中节点<br/>在朝堂或表格中点击任意官职或爵位
      </div>

      <el-form v-else label-position="top" size="small" @change="onFormChangedDebounced">
        <div v-if="selectedDraftTime" class="draft-banner">
          <span>📝 草稿已暂存于 {{new Date(selectedDraftTime).toLocaleTimeString('zh-CN',{hour12:false})}}</span>
          <div style="display:flex;gap:6px;margin-left:auto;">
            <el-button size="small" text type="primary" @click="restoreCurrentDraft">恢复草稿</el-button>
            <el-button size="small" text @click="clearCurrentDraft">清除</el-button>
          </div>
        </div>

        <template v-if="selectedNode.kind==='office'">
          <div class="field-group-title">基本信息</div>
          <el-form-item label="官职名称"><el-input v-model="selectedNode.name" /></el-form-item>
          <el-form-item label="别称／异名"><el-input v-model="selectedNode.aliases" placeholder="如：中护军／护军将军" /></el-form-item>
          <el-form-item label="国家／部落">
            <el-input :model-value="selectedPolityLabel" :disabled="currentFaction!=='tribal'" placeholder="如：匈奴、鲜卑、乌桓" @input="selectedNode.polity=$event" />
            <div v-if="currentFaction==='tribal'" class="form-inline-note">异族节点可直接填写部落名；未填写时会根据节点及祖先名称自动识别。</div>
          </el-form-item>
          <el-form-item label="官职分类">
            <el-select v-model="selectedNode.category" style="width:100%">
              <el-option v-for="c in CATEGORY_OPTIONS" :key="c" :label="c" :value="c" />
            </el-select>
          </el-form-item>
          <div class="year-row">
            <el-form-item label="职务性质">
              <el-select v-model="selectedNode.serviceDomain" style="width:100%">
                <el-option v-for="value in SERVICE_DOMAIN_OPTIONS" :key="value" :label="value" :value="value" />
              </el-select>
            </el-form-item>
            <el-form-item label="所属官署">
              <el-select v-model="selectedNode.institutionType" style="width:100%">
                <el-option v-for="value in INSTITUTION_TYPE_OPTIONS" :key="value" :label="value" :value="value" />
              </el-select>
            </el-form-item>
          </div>

          <div class="field-group-title">{{ rank9Enabled ? '官品与秩俸' : '秩俸制度' }}</div>
          <div v-if="!rank9Enabled" class="rank-notice">
            东汉与汉不实行曹魏九品官品体系；异族内部称号也不套用中原九品。本页仅记录可考的秩俸。
          </div>
          <el-form-item v-if="rank9Enabled" label="官品">
            <el-select v-model="selectedNode.rank9" clearable style="width:100%">
              <el-option v-for="r in RANK9_OPTIONS" :key="r" :label="r" :value="r" />
            </el-select>
            <div class="gis-stub">官品与九品中正选官是相关但不同的概念；请按具体制度和任职记录填写。</div>
          </el-form-item>
          <el-form-item label="汉代秩俸（石）">
            <el-select v-model="selectedNode.hanRank" clearable style="width:100%">
              <el-option v-for="r in HAN_RANK_OPTIONS" :key="r" :label="r" :value="r" />
            </el-select>
          </el-form-item>

          <div class="field-group-title">职权</div>
          <el-form-item label="职权文本"><el-input v-model="selectedNode.duty" type="textarea" :rows="2" /></el-form-item>

          <div class="field-group-title">沿革</div>
          <div class="year-row">
            <el-form-item label="设立年份"><el-input-number v-model="selectedNode.officeStartYear" :min="-300" :max="500" controls-position="right" style="width:100%" /></el-form-item>
            <el-form-item label="裁撤年份"><el-input-number v-model="selectedNode.officeEndYear" :min="-300" :max="500" controls-position="right" style="width:100%" /></el-form-item>
          </div>
          <el-form-item label="更名／裁撤沿革"><el-input v-model="selectedNode.evolution" type="textarea" :rows="2" placeholder="记录设立、改名、复置、裁撤等变更" /></el-form-item>
          <div class="field-group-title" style="margin-top:8px;">沿革事件（结构化） <el-button size="small" text type="primary" @click="addEvolutionEvent">＋ 添加</el-button></div>
          <div v-if="!selectedNode.evolutionEvents || !selectedNode.evolutionEvents.length" class="gis-stub">暂无结构化沿革事件；可逐条记录设立、更名、复置、裁撤的年份与说明。</div>
          <div v-for="(ev,evi) in selectedNode.evolutionEvents" :key="ev.id" class="evolution-event-row">
            <div style="display:flex;gap:6px;align-items:center;">
              <el-input-number v-model="ev.year" :min="-300" :max="500" controls-position="right" size="small" style="width:92px" />
              <el-select v-model="ev.type" size="small" style="width:92px;">
                <el-option v-for="t in EVOLUTION_TYPES" :key="t" :label="t" :value="t" />
              </el-select>
              <el-button size="small" text type="danger" @click="removeEvolutionEvent(evi)">✕</el-button>
            </div>
            <el-input v-model="ev.text" size="small" placeholder="事件说明（如：更名河南尹）" style="margin-top:5px;" />
          </div>

          <div class="field-group-title">辖区与权限</div>
          <el-form-item label="规范行政区划（州—郡）">
            <el-cascader v-model="selectedNode.regionPath" :options="REGION_OPTIONS" clearable filterable style="width:100%" @change="syncRegionFromPath" />
          </el-form-item>
          <el-form-item label="管辖区域">
            <el-input v-model="selectedNode.region" placeholder="如：荆州、南中、西域…" />
            <div class="gis-stub">📍 GIS 地图接口预留位：后续可接入三国行政区划地图，按坐标高亮本官职实际／遥领辖区。</div>
          </el-form-item>

          <div class="field-group-title">直属关系约束</div>
          <el-form-item label="从属性质">
            <el-select v-model="selectedNode.relationType" clearable style="width:100%"><el-option v-for="r in RELATION_OPTIONS" :key="r" :label="r" :value="r" /></el-select>
          </el-form-item>
          <el-form-item label="直属限制说明"><el-input v-model="selectedNode.directRules" type="textarea" :rows="2" placeholder="区分固定属官、临时幕僚、不可跨系挂靠等" /></el-form-item>
          <el-form-item label="符节权限">
            <el-select v-model="selectedNode.jie" style="width:100%">
              <el-option v-for="j in JIE_OPTIONS" :key="j" :label="j" :value="j" />
            </el-select>
          </el-form-item>

          <div class="field-group-title">标记</div>
          <el-form-item label="是否允许开府">
            <el-switch v-model="selectedNode.kaifu" />
            <el-button v-if="selectedNode.kaifu" size="small" text type="primary" style="margin-left:8px" @click="generateKaifuTemplate">生成标准幕府僚属</el-button>
          </el-form-item>
          <el-form-item label="遥领 / 世袭领兵 / 录尚书事">
            <el-checkbox v-model="selectedNode.yaoling">遥领</el-checkbox>
            <el-checkbox v-model="selectedNode.worldTangBing">世袭领兵</el-checkbox>
            <el-checkbox v-model="selectedNode.lushangshushi">录尚书事</el-checkbox>
          </el-form-item>
          <el-form-item label="加官（额外授予的荣衔）">
            <el-select v-model="selectedNode.jiaguan" style="width:100%">
              <el-option v-for="j in JIAGUAN_OPTIONS" :key="j" :label="j" :value="j" />
            </el-select>
          </el-form-item>
          <div v-if="selectedNode.yaoling" class="warning-inline">遥领官职请补充辖区，并在备注中说明属于实授、虚领或名义兼领。</div>
          <el-form-item label="显示状态">
            <el-checkbox v-model="selectedNode.virtual">虚职</el-checkbox>
            <el-checkbox v-model="selectedNode.temporary">临时职任</el-checkbox>
            <el-checkbox v-model="selectedNode.archived">归档</el-checkbox>
            <el-checkbox v-model="selectedNode.hidden">隐藏</el-checkbox>
          </el-form-item>
          <el-form-item label="自定义标签">
            <el-select v-model="selectedNode.customTags" multiple filterable allow-create default-first-option style="width:100%" placeholder="输入后回车，如“战时临时官职”" />
          </el-form-item>

          <div class="field-group-title">爵位关联挂载</div>
          <el-form-item label="关联爵位节点（跨体系挂载）">
            <el-select v-model="selectedNode.mountId" clearable filterable style="width:100%">
              <el-option v-for="m in mountOptions" :key="m.key" :label="m.name" :value="m.key" />
            </el-select>
            <div v-if="selectedNode.mountId" style="margin-top:6px;">
              <el-button size="small" text @click="jumpToMount">🔗 查看关联爵位节点</el-button>
            </div>
          </el-form-item>

          <div class="field-group-title">备注</div>
          <el-form-item><el-input v-model="selectedNode.note" type="textarea" :rows="2" placeholder="备注" /></el-form-item>
        </template>

        <template v-else-if="selectedNode.kind==='noble'">
          <div class="field-group-title">基本信息</div>
          <el-form-item label="爵位名称"><el-input v-model="selectedNode.name" /></el-form-item>
          <el-form-item label="国家／部落">
            <el-input :model-value="selectedPolityLabel" :disabled="currentFaction!=='tribal'" placeholder="如：匈奴、鲜卑、乌桓" @input="selectedNode.polity=$event" />
          </el-form-item>
          <el-form-item label="爵等">
            <el-select v-model="selectedNode.nobleRank" style="width:100%">
              <el-option v-for="r in NOBLE_RANK_OPTIONS" :key="r" :label="r" :value="r" />
            </el-select>
          </el-form-item>
          <el-form-item label="食邑 / 租税"><el-input v-model="selectedNode.fief" placeholder="如：食邑千户" /></el-form-item>
          <el-form-item label="承袭方式">
            <el-select v-model="selectedNode.inherit" clearable style="width:100%">
              <el-option v-for="i in INHERIT_OPTIONS" :key="i" :label="i" :value="i" />
            </el-select>
          </el-form-item>
          <el-form-item label="封爵性质">
            <el-radio-group v-model="selectedNode.actualFief"><el-radio-button :value="true">实封</el-radio-button><el-radio-button :value="false">虚封</el-radio-button></el-radio-group>
          </el-form-item>
          <div class="year-row">
            <el-form-item label="始封／设立年"><el-input-number v-model="selectedNode.officeStartYear" :min="-300" :max="500" controls-position="right" style="width:100%" /></el-form-item>
            <el-form-item label="废止年"><el-input-number v-model="selectedNode.officeEndYear" :min="-300" :max="500" controls-position="right" style="width:100%" /></el-form-item>
          </div>
          <el-form-item label="自定义标签"><el-select v-model="selectedNode.customTags" multiple filterable allow-create default-first-option style="width:100%" /></el-form-item>
          <el-form-item label="显示状态"><el-checkbox v-model="selectedNode.archived">归档</el-checkbox><el-checkbox v-model="selectedNode.hidden">隐藏</el-checkbox></el-form-item>

          <div class="field-group-title">官职关联挂载</div>
          <el-form-item label="关联官职节点（跨体系挂载）">
            <el-select v-model="selectedNode.mountId" clearable filterable style="width:100%">
              <el-option v-for="m in mountOptions" :key="m.key" :label="m.name" :value="m.key" />
            </el-select>
            <div v-if="selectedNode.mountId" style="margin-top:6px;">
              <el-button size="small" text @click="jumpToMount">🔗 查看关联官职节点</el-button>
            </div>
          </el-form-item>

          <div class="field-group-title">备注</div>
          <el-form-item><el-input v-model="selectedNode.note" type="textarea" :rows="2" /></el-form-item>
        </template>

        <template v-else>
          <div class="panel-empty" style="padding:20px 0;">
            根节点仅用于组织画布，不承载具体官职 / 爵位信息。
          </div>
        </template>

        <div v-if="selectedNode.kind==='office' || selectedNode.kind==='noble'">
          <div class="field-group-title">{{ selectedNode.kind==='office' ? '任职人物与立绘' : '受爵人物与立绘' }}</div>
          <div class="person-toolbar">
            <span class="tip">每条记录可绑定君主时期、年份和立绘</span>
            <el-button size="small" type="primary" plain @click="addFigureRecord">＋ 添加人物</el-button>
          </div>
          <div v-if="!selectedNode.figures || selectedNode.figures.length===0" class="gis-stub">
            尚无人物记录。添加后可在上方按皇帝时期生成官员汇总。
          </div>
          <div v-for="(p,pidx) in selectedNode.figures" :key="p.id" class="person-card">
            <div class="person-card-head">
              <div class="portrait-box" :style="portraitStyleFor(p)">
                <img loading="lazy" decoding="async" v-if="personPortraitFor(p.name,[p])" :src="personPortraitFor(p.name,[p])" :alt="(p.name||'人物')+'立绘'" />
                <span v-else>暂无<br/>立绘</span>
              </div>
              <div class="person-card-title">
                <el-input v-model="p.name" placeholder="人物姓名" aria-label="人物姓名" />
                <div class="person-card-actions">
                  <el-upload :show-file-list="false" accept=".jpg,.jpeg,.png,.webp,.gif"
                             :before-upload="file=>uploadPortrait(file,p)">
                    <el-button size="small" text>上传立绘</el-button>
                  </el-upload>
                  <el-button v-if="p.portrait" size="small" text @click="clearPortrait(p)">移除立绘</el-button>
                  <el-button size="small" text type="danger" @click="removeFigureRecord(pidx)">删除人物</el-button>
                </div>
              </div>
            </div>
            <el-input v-model="p.portrait" size="small" clearable aria-label="立绘图片地址"
                      placeholder="立绘图片网址，或使用上方本地上传" />
            <div class="portrait-source">本地图片会写入 JSON 工程；为避免缓存过大，单张限制 1MB。</div>
            <el-form-item label="任职时期" style="margin-top:8px;">
              <el-select v-model="p.rulerKey" clearable style="width:100%" aria-label="任职时期"
                         @change="onFigureRulerChanged(p)">
                <el-option v-for="period in periodOptions" :key="period.key"
                           :label="period.name+'（'+period.startYear+'—'+period.endYear+'）'" :value="period.key" />
              </el-select>
            </el-form-item>
            <div class="year-row">
              <el-form-item label="起始年">
                <el-input-number v-model="p.startYear" :min="160" :max="300" controls-position="right" style="width:100%" />
              </el-form-item>
              <el-form-item label="结束年">
                <el-input-number v-model="p.endYear" :min="160" :max="300" controls-position="right" style="width:100%" />
              </el-form-item>
            </div>
            <el-input v-model="p.note" size="small" placeholder="任职、领衔或人物备注" aria-label="人物备注" />
          </div>
        </div>

        <div class="badge-row" v-if="selectedNode.kind!=='root'">
          <span class="mini-badge" v-if="selectedNode.locked">🔒 已锁定</span>
          <span class="mini-badge" v-if="selectedNode.color">🎨 自定义色</span>
          <span class="mini-badge" v-if="selectedNode.icon">{{selectedNode.icon}} 图标标记</span>
        </div>
      </el-form>
    </div>
  </div>
  `};

/* 界面单元登记表。置于文件末尾可避免 TDZ：上面的 const 声明在此刻均已求值。 */
export const ui = {
  OfficesContext,
  OfficesActions,
  OfficesStatus,
  OfficesEvidence,
  OfficesCanvasTabs,
  OfficesHanCourt,
  OfficesCourtCanvas,
  OfficesCourtResidence,
  OfficesCatalog,
  OfficesTable,
  OfficesDetail
};
