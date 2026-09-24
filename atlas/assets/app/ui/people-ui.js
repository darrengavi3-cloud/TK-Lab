/* 人物记（people）模块的界面单元。
 *
 * 从 atlas/index.html 的巨型模板字面量中整体迁出。模板正文逐字保留，只做了两类
 * 最小改写：
 *   1. v-model="peopleXxx" → :model-value="state.peopleXxx" + @update:model-value="update('peopleXxx',v)"
 *      组件不能改写 prop，筛选条件的写入统一 $emit 给父层。
 *   2. 分页的 peoplePage-=1 / +=1 → stepPage(-1) / stepPage(1)
 *      同理，当前页号由父层持有。
 * 其余所有只读引用（filteredPeople、peopleMetrics、peoplePrimaryDetail、peopleView、
 * workspaceMode、各类 formatter 与常量等）在模板中**原样保留**，由本文件内同名的
 * computed / prop 解析到父层状态，从而保证迁出前后渲染结果逐字一致。
 *
 * 三个界面单元：
 *   PeopleContext    —— 筛选抽屉中的人物筛选面板（链①）
 *   PeopleWorkbench  —— 人物名录 + 档案主体（链③）
 *   PeopleEvidence   —— 证据案卷中的人物分支（链④）
 *
 * 注意：props 一律使用 fnXxx / optionsXxx 前缀，避免与模板期望的**同名成员**
 * （如 polityPillClass、readableFact）冲突——Vue 中 props 与 computed 不得同名。
 */

/* ==========================================================================
 * 1) PeopleContext —— 筛选抽屉中的人物筛选面板（链①）
 * ========================================================================== */
export const PEOPLE_STATE_UPDATE_EVENT = 'state-update';
export const PEOPLE_PAGE_STEP_EVENT = 'page-step';

export const PeopleContext = {
  name: 'PeopleContext',
  props: {
    state: { type: Object, required: true },
    workspaceMode: { type: String, default: 'reader' },
    options: { type: Object, default: () => ({}) },
  },
  emits: [PEOPLE_STATE_UPDATE_EVENT],
  computed: {
    /* 下拉选项由父层常量注入，模板中的引用名保持不变 */
    PERSON_DYNASTY_ORDER() { return this.options.PERSON_DYNASTY_ORDER || []; },
    SERVICE_DOMAIN_OPTIONS() { return this.options.SERVICE_DOMAIN_OPTIONS || []; },
    INSTITUTION_TYPE_OPTIONS() { return this.options.INSTITUTION_TYPE_OPTIONS || []; },
  },
  methods: {
    update(key, value) { this.$emit(PEOPLE_STATE_UPDATE_EVENT, key, value); },
  },
  template: `        <el-select :model-value="state.peoplePolity" @update:model-value="v=>update('peoplePolity',v)" class="v56-context-select" size="small" aria-label="朝代筛选"><el-option label="全部朝代" value="all"/><el-option v-for="dynasty in PERSON_DYNASTY_ORDER" :key="dynasty" :label="dynasty" :value="dynasty"/></el-select>
        <el-select :model-value="state.peopleKind" @update:model-value="v=>update('peopleKind',v)" class="v56-context-select" size="small" aria-label="记录类别"><el-option label="全部记录" value="all"/><el-option label="任官" value="office"/><el-option label="受爵" value="noble"/><el-option label="州镇" value="fangzhen"/><el-option label="时期录" value="roster"/></el-select>
                <el-select :model-value="state.peopleContent" @update:model-value="v=>update('peopleContent',v)" aria-label="人物内容筛选" style="width:150px"><el-option label="全部人物" value="all"/><el-option label="有小传" value="biography"/><el-option label="有已核经历" value="events"/></el-select>

          <el-checkbox :model-value="state.peopleOnlyPortrait" @update:model-value="v=>update('peopleOnlyPortrait',v)">仅有立绘</el-checkbox>
          <el-select :model-value="state.peopleEra" @update:model-value="v=>update('peopleEra',v)" size="small" style="width:132px;" aria-label="时代筛选">
            <el-option label="全部时代" value="all" />
            <el-option label="汉末（168—219）" value="latehan" />
            <el-option label="三国（220—265）" value="three" />
            <el-option label="西晋（266—316）" value="jin" />
          </el-select>
          <el-input-number :model-value="state.peopleYear" @update:model-value="v=>update('peopleYear',v)" size="small" :min="168" :max="316" controls-position="right" style="width:120px" aria-label="相关年份" />
          <el-select v-if="workspaceMode==='review'" :model-value="state.peopleSource" @update:model-value="v=>update('peopleSource',v)" size="small" style="width:132px;" aria-label="史料来源">
            <el-option label="全部来源" value="all" />
            <el-option label="《三国志》正文" value="sgz" />
            <el-option label="裴松之注" value="pei" />
            <el-option label="《晋书》" value="jinshu" />
            <el-option label="工程内任官档案" value="curated" />
          </el-select>
          <el-select v-if="workspaceMode==='review'" :model-value="state.peopleEvidence" @update:model-value="v=>update('peopleEvidence',v)" size="small" style="width:132px;" aria-label="证据状态">
            <el-option label="全部证据状态" value="all" />
            <el-option label="确定／推定" value="confirmed" />
            <el-option label="待补核／存疑" value="pending" />
          </el-select>
          <el-select :model-value="state.peopleServiceDomain" @update:model-value="v=>update('peopleServiceDomain',v)" size="small" style="width:132px;" aria-label="文武类别">
            <el-option label="文武全部" value="all" />
            <el-option v-for="d in SERVICE_DOMAIN_OPTIONS" :key="d" :label="d" :value="d" />
          </el-select>
          <el-select :model-value="state.peopleInstitutionType" @update:model-value="v=>update('peopleInstitutionType',v)" size="small" style="width:150px;" aria-label="官署类型">
            <el-option label="官署全部" value="all" />
            <el-option v-for="t in INSTITUTION_TYPE_OPTIONS" :key="t" :label="t" :value="t" />
          </el-select>`,
};

/* ==========================================================================
 * 2) PeopleWorkbench —— 人物名录 + 档案主体（链③）
 * ========================================================================== */
export const PeopleWorkbench = {
  name: 'PeopleWorkbench',
  props: {
    state: { type: Object, required: true },
    workspaceMode: { type: String, default: 'reader' },
    active: { type: Boolean, default: false },
    /* 函数型依赖以 fn 前缀传入，模板按原名调用 */
    fnOpenDetail: { type: Function, default: null },
    fnOpenLifeEvent: { type: Function, default: null },
    fnOpenMetaEditor: { type: Function, default: null },
    fnCitations: { type: Function, default: null },
    fnLifespanLabel: { type: Function, default: null },
    fnLifeEventTypeLabel: { type: Function, default: null },
    fnPortraitStyle: { type: Function, default: null },
    fnPolityPillClass: { type: Function, default: null },
    fnReadableFact: { type: Function, default: null },
    options: { type: Object, default: () => ({}) },
  },
  emits: [PEOPLE_PAGE_STEP_EVENT],
  computed: {
    /* ---- state 的只读转发：模板正文因此可逐字保留 ---- */
    filteredPeople() { return this.state.filteredPeople; },
    pagedPeople() { return this.state.pagedPeople; },
    peopleMetrics() { return this.state.peopleMetrics; },
    peoplePrimaryDetail() { return this.state.peoplePrimaryDetail; },
    peoplePrimaryLifeTimeline() { return this.state.peoplePrimaryLifeTimeline; },
    peoplePrimaryOfficeSummary() { return this.state.peoplePrimaryOfficeSummary; },
    peoplePrimaryPeerageSummary() { return this.state.peoplePrimaryPeerageSummary; },
    peopleArchiveScope() { return this.state.peopleArchiveScope; },
    peopleView() { return this.state.peopleView; },
    peoplePage() { return this.state.peoplePage; },
    peoplePageCount() { return this.state.peoplePageCount; },
    peoplePageSize() { return this.state.peoplePageSize; },
    peopleQuery() { return this.state.peopleQuery; },
    peopleKeyboardIndex() { return this.state.peopleKeyboardIndex; },
    /* ---- 函数型依赖 ---- */
    openPeopleDetail() { return this.fnOpenDetail || (() => {}); },
    openPersonLifeEvent() { return this.fnOpenLifeEvent || (() => {}); },
    openPersonMetaEditor() { return this.fnOpenMetaEditor || (() => {}); },
    personCitations() { return this.fnCitations || (() => []); },
    personLifespanLabel() { return this.fnLifespanLabel || (() => ''); },
    personLifeEventTypeLabel() { return this.fnLifeEventTypeLabel || (() => ''); },
    portraitStyleFor() { return this.fnPortraitStyle || (() => ({})); },
    polityPillClass() { return this.fnPolityPillClass || (() => ''); },
    readableFact() { return this.fnReadableFact || (() => false); },
    /* ---- 常量 ---- */
    PERSON_DYNASTY_ORDER() { return this.options.PERSON_DYNASTY_ORDER || []; },
    SERVICE_DOMAIN_OPTIONS() { return this.options.SERVICE_DOMAIN_OPTIONS || []; },
    INSTITUTION_TYPE_OPTIONS() { return this.options.INSTITUTION_TYPE_OPTIONS || []; },
  },
  methods: {
    stepPage(delta) { this.$emit(PEOPLE_PAGE_STEP_EVENT, delta); },
  },
  template: `      <div class="module-page-inner">
        <div class="people-view-layout">
          <div class="people-view-content">
        <div class="people-metrics">
          <div class="people-metric"><strong>{{filteredPeople.length}}</strong><span>当前人物</span></div>
          <div class="people-metric"><strong>{{peopleMetrics.records}}</strong><span>任官记录</span></div>
          <div class="people-metric"><strong>{{peopleMetrics.peerageEvents}}</strong><span>人物封爵关联</span></div>
        </div>
        <template v-if="peopleView==='people'">
        <div v-if="!filteredPeople.length" class="summary-empty">没有匹配的人物。试试姓名或表字，或减少筛选条件。</div>
        <div v-else class="v56-people-master-detail">
          <section class="v56-person-directory" role="list" aria-label="人物名录">
            <button v-for="p in pagedPeople" :key="p.personId" type="button"
                    class="v56-person-row" :class="{active:peoplePrimaryDetail&&peoplePrimaryDetail.personId===p.personId,'keyboard-active':peopleQuery&&filteredPeople[peopleKeyboardIndex]&&filteredPeople[peopleKeyboardIndex].personId===p.personId}"
                    :aria-current="peoplePrimaryDetail?.personId===p.personId?'true':undefined" :data-person-id="p.personId" :data-person-name="p.name" @click="openPeopleDetail(p.personId)">
              <span class="person-avatar" :style="portraitStyleFor(p)"><reader-portrait v-if="p.portrait" :src="p.portrait" :alt="p.name+'立绘'"/><span v-else>{{p.name.slice(0,1)}}</span></span>
              <span class="v56-person-row-copy">
                <span class="v56-person-row-name"><strong>{{p.canonicalName||p.name}}</strong><small v-if="p.zi">字{{p.zi}}</small></span>
                <span v-if="p.dynastyTags.length||p.appointments.length" class="v56-person-row-meta"><template v-if="p.dynastyTags.length">{{p.dynastyTags.join(' · ')}}</template><template v-if="p.appointments.length"><template v-if="p.dynastyTags.length"> · </template>{{p.appointments[0].nodeName}}</template></span>
                <small v-if="p.searchReason" class="v62-person-match" :class="'match-'+p.searchMatchKind">{{p.searchReason}}<template v-if="p.searchMatchValue&&p.searchMatchValue!==p.name">：{{p.searchMatchValue}}</template></small>
              </span>
              <span v-if="p.appointmentCount" class="v56-person-row-count">{{p.appointmentCount}} 任</span>
              <span v-else-if="p.peerageEvents.length" class="v56-person-row-count">{{p.peerageEvents.length}} 爵</span>
            </button>
          </section>
          <article v-if="peoplePrimaryDetail" class="v56-person-dossier" :data-person-id="peoplePrimaryDetail.personId">
            <header class="v56-person-dossier-head">
              <div class="people-detail-portrait" :style="portraitStyleFor(peoplePrimaryDetail)"><reader-portrait v-if="peoplePrimaryDetail.portrait" :src="peoplePrimaryDetail.portrait" :alt="peoplePrimaryDetail.name+'立绘'" detail/><span v-else>{{peoplePrimaryDetail.name.slice(0,1)}}</span></div>
              <div>
                <h2>{{peoplePrimaryDetail.canonicalName||peoplePrimaryDetail.name}}</h2>
                <div class="v56-person-dossier-meta"><span class="review-only" v-if="workspaceMode==='review'">ID：{{peoplePrimaryDetail.personId}}</span></div>
                <div class="people-detail-tags"><span v-for="pol in peoplePrimaryDetail.dynastyTags" :key="pol" class="person-pill" :class="polityPillClass(pol)">{{pol}}</span></div>
                <p v-if="peoplePrimaryDetail.historicalAffiliations.length" class="v62-historical-affiliations">历史归属：{{peoplePrimaryDetail.historicalAffiliations.join('、')}}</p>
                <person-identity-facts :person="peoplePrimaryDetail" :lifespan="personLifespanLabel(peoplePrimaryDetail)" :office="peoplePrimaryOfficeSummary" :peerage="peoplePrimaryPeerageSummary" />
                <div v-if="workspaceMode==='review'&&peoplePrimaryDetail.importCandidate" class="v60-import-candidate review-only"><strong>附件人物候选 · {{peoplePrimaryDetail.researchDisposition}}</strong><template v-if="peoplePrimaryDetail.v60Records&&peoplePrimaryDetail.v60Records.length"><span v-for="record in peoplePrimaryDetail.v60Records" :key="record.workbookSource.row">{{record.workbookSource.sheet}} 第 {{record.workbookSource.row}} 行 · 原名 {{record.rawName||record.name}}<template v-if="record.officeRaw"> · 官职字段 {{record.officeRaw}}</template></span></template><span v-else>{{peoplePrimaryDetail.workbookSource&&peoplePrimaryDetail.workbookSource.sheet}} 第 {{peoplePrimaryDetail.workbookSource&&peoplePrimaryDetail.workbookSource.row}} 行 · 原名 {{peoplePrimaryDetail.rawName||peoplePrimaryDetail.name}}</span><span v-if="peoplePrimaryDetail.candidateReason">{{peoplePrimaryDetail.candidateReason}}</span></div>
                <div v-if="workspaceMode==='review'" class="v58-dossier-strip review-only"><strong>档案范围</strong><span>{{peopleArchiveScope.label}}</span><strong>来源卷覆盖</strong><span>{{peoplePrimaryDetail.sourceVolumes.length?peoplePrimaryDetail.sourceVolumes.join('、'):'来源卷次待补'}}</span><span class="v58-status" :class="peoplePrimaryDetail.sourceVolumes.length?'v58-status--ready':'v58-status--pending'">{{peoplePrimaryDetail.sourceVolumes.length?'来源已关联':'来源待补'}}</span></div>
                <section v-if="readableFact(peoplePrimaryDetail.bio)" class="person-biography" aria-label="人物小传"><h3>人物小传</h3><p>{{peoplePrimaryDetail.bio}}</p></section>
                <el-button v-if="workspaceMode==='review'" class="review-only" size="small" plain @click="openPersonMetaEditor(peoplePrimaryDetail.personId)">编辑人物档案</el-button>
              </div>
            </header>
            <p v-if="!peoplePrimaryDetail.bio&&!peoplePrimaryLifeTimeline.length" class="reader-quiet-note">已收录身份资料；独立小传与经历尚待补充。</p>
            <reader-citations :citations="personCitations(peoplePrimaryDetail)" />
            <section v-if="peoplePrimaryLifeTimeline.length" class="v69-person-life-section">
              <h3 class="v56-dossier-section-title">人物经历 · {{peoplePrimaryDetail.lifeEvents.length}} 条</h3>
              <div class="v69-person-life-timeline">
                <section v-for="group in peoplePrimaryLifeTimeline" :key="group.year" class="v69-person-life-year">
                  <time>{{group.year}}</time>
                  <div class="v69-person-life-events">
                    <button v-for="event in group.events" :key="event.eventId" type="button" @click="openPersonLifeEvent(event)">
                      <span class="v69-life-type">{{personLifeEventTypeLabel(event)}}</span>
                      <strong>{{event.title}}</strong>
                      <small v-if="event.detail">{{event.detail}}</small>
                    </button>
                  </div>
                </section>
              </div>
            </section>
          </article>
        </div>
        <nav v-if="peoplePageCount>1" class="people-pagination" aria-label="人物档案分页">
          <button type="button" :disabled="peoplePage<=1" @click="stepPage(-1)">上一页</button>
          <span>第 {{peoplePage}} / {{peoplePageCount}} 页 · 每页 {{peoplePageSize}} 人</span>
          <button type="button" :disabled="peoplePage>=peoplePageCount" @click="stepPage(1)">下一页</button>
        </nav>
        </template>

          </div>
        </div>
      </div>`,
};

/* ==========================================================================
 * 3) PeopleEvidence —— 证据案卷中的人物分支（链④）
 * ========================================================================== */
export const PeopleEvidence = {
  name: 'PeopleEvidence',
  props: {
    state: { type: Object, required: true },
  },
  computed: {
    peoplePrimaryDetail() { return this.state.peoplePrimaryDetail; },
  },
  template: `          <h3 class="v56-evidence-title">{{peoplePrimaryDetail.canonicalName||peoplePrimaryDetail.name}}</h3>
          <div class="v56-evidence-meta">{{peoplePrimaryDetail.personId}} · {{peoplePrimaryDetail.appointments.length}} 条履历</div>
          <span class="v56-evidence-status" :class="{pending:!peoplePrimaryDetail.sourceVolumes.length}">{{peoplePrimaryDetail.sourceVolumes.length?'已关联卷次':'来源卷次待补'}}</span>
          <section class="v56-evidence-section"><h4>正史卷次</h4><div v-if="peoplePrimaryDetail.sourceVolumes.length" v-for="source in peoplePrimaryDetail.sourceVolumes" :key="source" class="v56-evidence-source"><b>出处</b><span>{{source}}</span></div><p v-else>当前仅显示工程内可验证履历，未自动生成本传摘要。</p></section>
          <section class="v56-evidence-section"><h4>实体关系</h4><p v-if="peoplePrimaryDetail.historicalAffiliations.length">历史归属：{{peoplePrimaryDetail.historicalAffiliations.join('、')}}</p><p v-if="peoplePrimaryDetail.homonymStatus">同名消歧：{{peoplePrimaryDetail.homonymStatus}}</p><p>稳定 ID、姓名和立绘索引保持一一对应。</p></section>`,
};

/* 登记表：与 index.html 的 sgzUiUnitLoaders 模块键对应，由
 * registerSgzUiModuleComponents 逐项 app.component(name, component) 注册。
 * 放在文件末尾，避免「引用尚未初始化」的 TDZ 问题。 */
export const ui = {
  PeopleContext,
  PeopleWorkbench,
  PeopleEvidence,
};