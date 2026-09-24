/* 州镇表（fangzhen）模块的界面单元。
 *
 * 主体布局自 atlas/index.html 的巨型模板字面量中整体迁出（原 9758–9834 行）。
 * 模板正文逐字保留，只做了两类最小改写：
 *   1. v-model="fangzhenXxx" → :model-value="state.fangzhenXxx"
 *                            + @update:model-value="v=>update('fangzhenXxx',v)"
 *      组件不能改写 prop，筛选条件的写入统一 $emit 给父层。
 *   2. 就地赋值与分页（fangzhenSection='…'、fangzhenDutyView='…'、
 *      fangzhenPage-=1/+=1）→ setState(...) / stepPage(±1)
 *      同理，这些状态由父层持有。
 * 其余所有只读引用（fangzhenArchiveOptions、fangzhenPrimaryDetail、
 * fangzhenSeatPeriods、fangzhenPowerText 等）在模板中**原样保留**，由本文件内
 * 同名的 computed / methods 解析到父层状态，从而保证迁出前后渲染结果逐字一致。
 *
 * 三个界面单元：
 *   FangzhenContext    —— 上下文条 + 筛选抽屉中的州镇筛选面板（链①）
 *   FangzhenWorkbench  —— 州镇职任表 / 治所与辖境主体（链③）
 *   FangzhenEvidence   —— 证据案卷中的州镇分支（链④）
 *
 * 注意：props 一律使用 fnXxx 前缀，避免与模板期望的**同名成员**
 * （如 fangzhenPowerText、fangzhenTypeLabel 等）冲突——Vue 中 props 与 computed
 * 不得同名。链④的状态源是 v56ActiveRecord（ref），与链③的 fangzhenPrimaryDetail
 * 形状不同，故单独作为 fnActiveRecord getter 注入。
 */

export const FANGZHEN_STATE_UPDATE_EVENT = 'state-update';
export const FANGZHEN_PAGE_STEP_EVENT = 'page-step';

/* ==========================================================================
 * 1) FangzhenContext —— 上下文条 + 筛选抽屉中的州镇筛选面板（链①）
 * ========================================================================== */
export const FangzhenContext = {
  name: 'FangzhenContext',
  emits: [FANGZHEN_STATE_UPDATE_EVENT],
  props: {
    state: { type: Object, required: true },
    /* 上下文条与筛选抽屉复用同一组控件，由父层决定渲染哪一段 */
    slot: { type: String, default: 'context' }
  },
  methods: {
    update(key, value) { this.$emit(FANGZHEN_STATE_UPDATE_EVENT, key, value); }
  },
  template: `<template>
        <el-select v-if="slot==='context'" :model-value="state.fangzhenView" @update:model-value="v=>update('fangzhenView',v)" class="v56-context-select" aria-label="州镇查阅工具"><el-option label="职任表" value="records"/><el-option label="年份快照" value="snapshot"/><el-option label="两年对比" value="compare"/></el-select>
        <el-select v-else :model-value="state.fangzhenLevel" @update:model-value="v=>update('fangzhenLevel',v)" class="v56-context-select" size="small" aria-label="辖区层级"><el-option label="州、郡与方镇" value="all"/><el-option label="州" value="州"/><el-option label="郡" value="郡"/><el-option label="方镇" value="方镇"/></el-select>
        <el-select v-if="slot!=='context'" :model-value="state.fangzhenRecordType" @update:model-value="v=>update('fangzhenRecordType',v)" class="v56-context-select" size="small" aria-label="档案类别"><el-option label="全部类别" value="all"/><el-option label="刺史／州牧" value="cishi"/><el-option label="太守／国相" value="taishou"/><el-option label="都督" value="dudu"/><el-option label="都尉" value="duwei"/><el-option label="其他" value="other"/></el-select>
        <el-select v-if="slot!=='context'" :model-value="state.fangzhenState" @update:model-value="v=>update('fangzhenState',v)" class="v56-context-select" size="small" aria-label="州郡筛选"><el-option label="全部州郡" value="all"/><el-option v-for="state in state.fangzhenStateOptions" :key="state" :label="state" :value="state"/></el-select>

      <el-checkbox v-if="slot!=='context'" :model-value="!state.fangzhenOnlyVerified" @update:model-value="value=>update('fangzhenOnlyVerified',!value)">含待审资料</el-checkbox><p v-if="slot!=='context'" class="reader-quiet-note">已核 {{state.fangzhenArchiveRows.filter(r=>r.readerDisplayStatus==='verified').length}} · 待补核 {{state.fangzhenArchiveRows.filter(r=>r.readerDisplayStatus==='candidate').length}}</p>
      </template>`
};

/* ==========================================================================
 * 2) FangzhenWorkbench —— 州镇职任表 / 治所与辖境主体（链③）
 * ========================================================================== */
export const FangzhenWorkbench = {
  name: 'FangzhenWorkbench',
  emits: [FANGZHEN_STATE_UPDATE_EVENT, FANGZHEN_PAGE_STEP_EVENT],
  props: {
    moduleVisited: { type: Boolean, default: false },
    moduleReady: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    workspaceMode: { type: String, default: 'reader' },
    state: { type: Object, required: true },
    /* 函数型 props：由父层注入，组件只调用、不实现。前缀 fnXxx 以避开与模板
     * 期望的同名成员（fangzhenPowerText 等）冲突。 */
    fnSelectArchive: { type: Function, required: true },
    fnPowerText: { type: Function, required: true },
    fnTypeLabel: { type: Function, required: true },
    fnPolityClass: { type: Function, required: true },
    fnPeriodLabel: { type: Function, required: true },
    fnIsAdministrative: { type: Function, required: true },
    fnHasResidence: { type: Function, required: true },
    fnSelectRecord: { type: Function, required: true },
    fnOpenEditor: { type: Function, required: true },
    fnDeleteRecord: { type: Function, required: true },
    fnExport: { type: Function, required: true },
    fnOpenResidence: { type: Function, required: true },
    fnJumpToMap: { type: Function, required: true },
    fnOpenPerson: { type: Function, required: true }
  },
  computed: {
    /* 只读引用：模板中的标识符原样保留，此处逐个转发到父层状态。 */
    fangzhenArchiveStyle() { return this.state.fangzhenArchiveStyle; },
    fangzhenArchiveOptions() { return this.state.fangzhenArchiveOptions; },
    fangzhenArchiveKey() { return this.state.fangzhenArchiveKey; },
    fangzhenArchiveDef() { return this.state.fangzhenArchiveDef; },
    fangzhenVisibleRecords() { return this.state.fangzhenVisibleRecords; },
    fangzhenMetrics() { return this.state.fangzhenMetrics; },
    fangzhenView() { return this.state.fangzhenView; },
    fangzhenSection() { return this.state.fangzhenSection; },
    fangzhenDutyView() { return this.state.fangzhenDutyView; },
    fangzhenState() { return this.state.fangzhenState; },
    fangzhenSnapshotYear() { return this.state.fangzhenSnapshotYear; },
    fangzhenSnapshotExcluded() { return this.state.fangzhenSnapshotExcluded; },
    fangzhenSnapshotRecords() { return this.state.fangzhenSnapshotRecords; },
    fangzhenCompareYear() { return this.state.fangzhenCompareYear; },
    fangzhenCompareRecords() { return this.state.fangzhenCompareRecords; },
    fangzhenPage() { return this.state.fangzhenPage; },
    fangzhenPageCount() { return this.state.fangzhenPageCount; },
    fangzhenPagination() { return this.state.fangzhenPagination; },
    fangzhenPagedRecords() { return this.state.fangzhenPagedRecords; },
    fangzhenPrimaryDetail() { return this.state.fangzhenPrimaryDetail; },
    fangzhenSeatPeriods() { return this.state.fangzhenSeatPeriods; },
    fangzhenRelatedRecords() { return this.state.fangzhenRelatedRecords; },
    fangzhenMilitaryJurisdictions() { return this.state.fangzhenMilitaryJurisdictions; },
    fangzhenOverlapIssues() { return this.state.fangzhenOverlapIssues; },
    /* 函数型转发：模板调用点保持原名。 */
    fangzhenPowerText() { return this.fnPowerText; },
    fangzhenTypeLabel() { return this.fnTypeLabel; },
    fangzhenPolityClass() { return this.fnPolityClass; },
    fangzhenPeriodLabel() { return this.fnPeriodLabel; },
    fangzhenIsAdministrative() { return this.fnIsAdministrative; },
    fangzhenHasResidence() { return this.fnHasResidence; },
    selectFangzhenArchive() { return this.fnSelectArchive; },
    selectFangzhenWorkbenchRecord() { return this.fnSelectRecord; },
    openFangzhenEditor() { return this.fnOpenEditor; },
    deleteFangzhenRecord() { return this.fnDeleteRecord; },
    exportFangzhen() { return this.fnExport; },
    openFangzhenResidence() { return this.fnOpenResidence; },
    jumpFangzhenToMap() { return this.fnJumpToMap; },
    openPeopleDetail() { return this.fnOpenPerson; }
  },
  methods: {
    update(key, value) { this.$emit(FANGZHEN_STATE_UPDATE_EVENT, key, value); },
    stepPage(delta) { this.$emit(FANGZHEN_PAGE_STEP_EVENT, delta); }
  },
  template: `<main v-if="moduleVisited&&moduleReady" v-show="active" class="module-page fangzhen-workbench" :style="fangzhenArchiveStyle">
      <div class="module-page-inner">
        <header class="v67-module-masthead">
          <nav class="v67-masthead-tabs" aria-label="政权州镇档案">
            <button v-for="item in fangzhenArchiveOptions" :key="item.key" type="button" :class="{active:fangzhenArchiveKey===item.key}" @click="selectFangzhenArchive(item.key)"><span>{{item.label.replace('州镇档案','').replace('州镇扩展','')}}</span><small>{{item.count}}</small></button>
          </nav>
          <div class="v67-masthead-meta"><strong>{{fangzhenVisibleRecords.length}}</strong><span>当前职任</span><strong>{{fangzhenMetrics.commanders}}</strong><span>人</span><small class="v67-fangzhen-state-count">{{fangzhenArchiveDef.stateCountLabel}}</small></div>
        </header>
        <div v-if="fangzhenView!=='records'||workspaceMode==='review'" class="fangzhen-toolbar">
          <strong v-if="fangzhenView==='records'">{{fangzhenArchiveDef.label}}</strong><span style="flex:1"></span>
          <el-input-number v-if="fangzhenView!=='records'" :model-value="state.fangzhenSnapshotYear" @update:model-value="v=>update('fangzhenSnapshotYear',v)" :min="168" :max="316" size="small" controls-position="right" placeholder="起始年份" style="width:130px" />
          <el-input-number v-if="fangzhenView==='compare'" :model-value="state.fangzhenCompareYear" @update:model-value="v=>update('fangzhenCompareYear',v)" :min="168" :max="316" size="small" controls-position="right" placeholder="对比年份" style="width:130px" />
          <el-button v-if="workspaceMode==='review'" class="review-only" type="primary" @click="openFangzhenEditor()">添加职任</el-button>
          <el-button v-if="workspaceMode==='review'" class="review-only" @click="exportFangzhen">导出 Excel</el-button>
        </div>
        <div v-if="fangzhenView!=='records'" class="fangzhen-snapshot-panel">
          <p class="reader-quiet-note">仅统计已核且起讫年明确的任期。{{fangzhenSnapshotExcluded}} 条待补核或年代未定资料未计入；数量反映本库已核范围。</p>
          <div v-if="fangzhenView==='snapshot'&&fangzhenSnapshotYear" class="fangzhen-snapshot-row">
            <strong>{{fangzhenSnapshotYear}} 年任职快照</strong>
            <span>{{fangzhenSnapshotRecords.length}} 条记录</span>
            <span v-for="r in fangzhenSnapshotRecords.slice(0,12)" :key="r.id" class="fz-snapshot-chip">{{r.commander}} · {{r.title}}<small v-if="r.jurisdiction">{{r.jurisdiction}}</small></span>
            <span v-if="fangzhenSnapshotRecords.length>12" class="fz-snapshot-more">另有 {{fangzhenSnapshotRecords.length-12}} 条</span>
          </div>
          <div v-if="fangzhenView==='compare'&&!fangzhenCompareRecords.length" class="summary-empty">请输入两个不同年份生成对比。</div>
          <div v-if="fangzhenView==='compare'" v-for="cmp in fangzhenCompareRecords" :key="cmp.year" class="fangzhen-compare-row">
            <strong>{{cmp.year}} 年</strong>
            <span>{{cmp.rows.length}} 条在任记录</span>
            <span v-if="cmp.added.length" class="fz-diff added">新出现 {{cmp.added.length}} 条</span>
            <span v-if="cmp.removed.length" class="fz-diff removed">未见于该年快照 {{cmp.removed.length}} 条</span>
            <span v-for="record in cmp.added.slice(0,8)" :key="'added-'+cmp.year+'-'+record.id" class="fz-snapshot-chip">＋ {{record.commander}} · {{record.title}}</span>
            <span v-for="record in cmp.removed.slice(0,8)" :key="'removed-'+cmp.year+'-'+record.id" class="fz-snapshot-chip removed">－ {{record.commander}} · {{record.title}}</span>
          </div>
        </div>
        <nav v-if="fangzhenView==='records'" class="fangzhen-section-tabs" aria-label="州镇详情"><button type="button" :class="{active:fangzhenSection==='appointments'}" :aria-pressed="fangzhenSection==='appointments'" @click="update('fangzhenSection','appointments')">职任</button><button type="button" :class="{active:fangzhenSection==='territory'}" :aria-pressed="fangzhenSection==='territory'" @click="update('fangzhenSection','territory')">治所与辖境</button></nav>
        <section v-if="fangzhenView==='records'&&fangzhenSection==='appointments'" class="v67-fangzhen-workbench" aria-label="州镇职任工作台">
          <section class="v67-fangzhen-table-panel">
            <header class="v67-panel-heading"><div><small>{{fangzhenArchiveDef.label}}</small><strong>职任</strong></div><nav class="fangzhen-duty-tabs" aria-label="军政职任视图"><button type="button" :class="{active:fangzhenDutyView==='all'}" :aria-pressed="fangzhenDutyView==='all'" @click="update('fangzhenDutyView','all')">综合</button><button type="button" :class="{active:fangzhenDutyView==='administrative'}" :aria-pressed="fangzhenDutyView==='administrative'" @click="update('fangzhenDutyView','administrative')">行政</button><button type="button" :class="{active:fangzhenDutyView==='military'}" :aria-pressed="fangzhenDutyView==='military'" @click="update('fangzhenDutyView','military')">军事</button></nav><span>第 {{fangzhenPage}} / {{fangzhenPageCount}} 页</span></header>
            <div class="fangzhen-table-card fangzhen-desktop-table">
              <el-table :data="fangzhenPagedRecords" row-key="id" highlight-current-row :current-row-key="fangzhenPrimaryDetail&&fangzhenPrimaryDetail.id" size="small" empty-text="当前档案尚无符合条件的记录" @row-click="selectFangzhenWorkbenchRecord">
                <el-table-column label="辖区" min-width="86" show-overflow-tooltip><template #default="scope"><span>{{scope.row.jurisdiction}}</span><small class="fz-jurisdiction-kind">{{scope.row.jurisdictionKind}}</small></template></el-table-column>
                <el-table-column label="政权" width="68"><template #default="scope"><span class="fz-polity-badge" :class="fangzhenPolityClass(scope.row.polity)">{{scope.row.dynastyLabel||scope.row.polity}}</span></template></el-table-column>
                <el-table-column label="人物" min-width="76" show-overflow-tooltip><template #default="scope"><button type="button" class="fz-person person-link" @click.stop="openPeopleDetail(scope.row.personId||scope.row.commander)">{{scope.row.commander}}</button></template></el-table-column>
                <el-table-column prop="title" label="职任" min-width="110" show-overflow-tooltip />
                <el-table-column label="治所／驻地" min-width="82" show-overflow-tooltip><template #default="scope"><span v-if="scope.row.seat">{{scope.row.seat}}</span></template></el-table-column>
                <el-table-column label="任期" min-width="118" show-overflow-tooltip><template #default="scope"><span v-if="scope.row.tenureText||scope.row.confirmedRange">{{scope.row.tenureText||scope.row.confirmedRange}}</span></template></el-table-column>
                <el-table-column label="职权" min-width="96"><template #default="scope"><span class="fz-power-text">{{fangzhenPowerText(scope.row)}}</span></template></el-table-column>
                <el-table-column label="状态" width="76"><template #default="scope"><span class="v69-review-status" :class="scope.row.readerDisplayStatus">{{scope.row.readerDisplayStatus==='verified'?'已核':'待补核'}}</span></template></el-table-column>
                <el-table-column v-if="workspaceMode==='review'" class-name="review-only" label="操作" width="108" fixed="right"><template #default="scope"><el-button class="review-only" size="small" text type="primary" @click.stop="openFangzhenEditor(scope.row)">编辑</el-button><el-button class="review-only" size="small" text type="danger" @click.stop="deleteFangzhenRecord(scope.row)">删除</el-button></template></el-table-column>
              </el-table>
            </div>
            <nav class="v67-pagination" aria-label="州镇表分页"><button type="button" :disabled="fangzhenPage<=1" @click="stepPage(-1)">上一页</button><span>{{fangzhenPagination.total||fangzhenVisibleRecords.length}} 条</span><button type="button" :disabled="fangzhenPage>=fangzhenPageCount" @click="stepPage(1)">下一页</button></nav>
            <div class="fangzhen-mobile-cards">
              <button v-for="record in fangzhenPagedRecords" :key="'mobile-'+record.id" type="button" class="fangzhen-mobile-card" @click="selectFangzhenWorkbenchRecord(record)"><span><b>{{record.commander}}</b><small>{{record.dynastyLabel||record.polity}} · {{record.jurisdictionKind}} · {{fangzhenTypeLabel(record.recordType)}}</small><i class="v69-review-status" :class="record.readerDisplayStatus">{{record.readerDisplayStatus==='verified'?'已核':'待补核'}}</i></span><strong>{{record.title}}</strong><span>{{record.jurisdiction}}<template v-if="record.seat"> · {{record.seat}}</template></span><time v-if="record.tenureText||record.confirmedRange">{{record.tenureText||record.confirmedRange}}</time></button>
            </div>
          </section>
          <aside v-if="fangzhenPrimaryDetail" class="v67-fangzhen-dossier" aria-label="州镇记录详情">
            <header><div><small>{{fangzhenPrimaryDetail.dynastyLabel||fangzhenPrimaryDetail.polity}} · {{fangzhenPrimaryDetail.jurisdictionKind}} · {{fangzhenTypeLabel(fangzhenPrimaryDetail.recordType)}}</small><h2>{{fangzhenPrimaryDetail.jurisdiction}}</h2></div><div class="v69-fangzhen-statuses"><span class="fz-polity-badge" :class="fangzhenPolityClass(fangzhenPrimaryDetail.polity)">{{fangzhenPrimaryDetail.dynastyLabel||fangzhenPrimaryDetail.polity}}</span><span class="v69-review-status" :class="fangzhenPrimaryDetail.readerDisplayStatus">{{fangzhenPrimaryDetail.readerDisplayStatus==='verified'?'已核':'待补核'}}</span></div></header>
            <div class="v67-fangzhen-person"><button type="button" @click="openPeopleDetail(fangzhenPrimaryDetail.personId||fangzhenPrimaryDetail.commander)">{{fangzhenPrimaryDetail.commander}}</button><strong>{{fangzhenPrimaryDetail.title}}</strong></div>
            <dl class="v67-fact-grid"><div v-if="fangzhenPrimaryDetail.tenureText||fangzhenPrimaryDetail.confirmedRange"><dt>任期</dt><dd>{{fangzhenPrimaryDetail.tenureText||fangzhenPrimaryDetail.confirmedRange}}</dd></div><div v-if="fangzhenPrimaryDetail.seat"><dt>{{fangzhenPrimaryDetail.seatType||'治所／驻地'}}</dt><dd>{{fangzhenPrimaryDetail.seat}}</dd></div><div v-if="fangzhenPrimaryDetail.commission"><dt>委任</dt><dd>{{fangzhenPrimaryDetail.commission}}</dd></div><div v-if="fangzhenPrimaryDetail.appointmentStatus"><dt>任职性质</dt><dd>{{fangzhenPrimaryDetail.appointmentStatus}}</dd></div></dl>
            <reader-citations :citations="fangzhenPrimaryDetail.citations||[]"></reader-citations>
            <div class="v67-dossier-actions"><button type="button" @click="openPeopleDetail(fangzhenPrimaryDetail.personId||fangzhenPrimaryDetail.commander)">人物履历</button><button v-if="fangzhenHasResidence(fangzhenPrimaryDetail)" type="button" @click="openFangzhenResidence(fangzhenPrimaryDetail)">府署</button><button type="button" @click="jumpFangzhenToMap(fangzhenPrimaryDetail)">形势图定位</button></div>
          </aside>
          <section v-if="fangzhenSeatPeriods.length" class="v67-fangzhen-related">
            <article v-if="fangzhenSeatPeriods.length"><header><strong>已核治所分期</strong><small>{{fangzhenSeatPeriods.length}} 条</small></header><table><thead><tr><th>治所／驻地</th><th>类型</th><th>有效年代</th></tr></thead><tbody><tr v-for="period in fangzhenSeatPeriods" :key="period.seatPeriodId"><td>{{period.seatName}}</td><td>{{period.seatType}}</td><td>{{fangzhenPeriodLabel(period)}}</td></tr></tbody></table></article>
          </section>
        </section>
        <section v-if="fangzhenView==='records'&&fangzhenSection==='territory'" class="fangzhen-territory-panel" aria-label="治所与辖境">
          <header><div><small>{{fangzhenArchiveDef.label}}</small><h2>{{fangzhenState!=='all'?fangzhenState:'治所与辖境'}}</h2></div><p>行政辖属与军事督辖分开呈现；军事辖区保持史料原范围。</p></header>
          <div class="fangzhen-territory-grid">
            <article><h3>治所</h3><template v-if="fangzhenSeatPeriods.length"><dl v-for="period in fangzhenSeatPeriods" :key="period.seatPeriodId"><dt>{{period.seatName}}</dt><dd>{{fangzhenPeriodLabel(period)}}</dd></dl></template><p v-else>暂无可确认治所分期。</p></article>
            <article><h3>行政辖属</h3><p v-if="fangzhenState==='all'">请选择州郡后查看对应行政记录。</p><ul v-else><li v-for="record in fangzhenRelatedRecords.filter(fangzhenIsAdministrative)" :key="'admin-'+record.id">{{record.jurisdiction}}<small>{{record.tenureText||record.confirmedRange||'时期未详'}}</small></li></ul></article>
            <article><h3>军事辖区</h3><p v-if="!fangzhenMilitaryJurisdictions.length">暂无明确军事督辖记录。</p><ul v-else><li v-for="item in fangzhenMilitaryJurisdictions" :key="item.recordId">{{item.jurisdiction}}<small>{{item.tenureText||'时期未详'}}</small></li></ul></article>
          </div>
        </section>
        <section v-if="workspaceMode==='review'&&fangzhenOverlapIssues.length" class="fangzhen-overlap-audit review-only"><header>任期重叠审校</header><p v-for="issue in fangzhenOverlapIssues.slice(0,20)" :key="issue.id">{{issue.unit}} · {{issue.office}}：{{issue.a.commander}}（{{issue.a.tenureText||issue.a.startYear+'—'+issue.a.endYear}}）／{{issue.b.commander}}（{{issue.b.tenureText||issue.b.startYear+'—'+issue.b.endYear}}）</p></section>
      </div>
    </main>`
};

/* ==========================================================================
 * 3) FangzhenEvidence —— 证据案卷中的州镇分支（链④）
 * ========================================================================== */
export const FangzhenEvidence = {
  name: 'FangzhenEvidence',
  props: {
    /* 链④的数据源是父层的 v56ActiveRecord（ref），与链③的 fangzhenPrimaryDetail
     * 形状不同，故以 getter 注入而非 state 代理字段。 */
    fnActiveRecord: { type: Function, required: true },
    fnOpenPerson: { type: Function, required: true },
    fnJumpToMap: { type: Function, required: true }
  },
  computed: {
    v56ActiveRecord() { return this.fnActiveRecord(); },
    openPeopleDetail() { return this.fnOpenPerson; },
    jumpFangzhenToMap() { return this.fnJumpToMap; }
  },
  template: `          <h3 class="v56-evidence-title">{{v56ActiveRecord.record.commander}} · {{v56ActiveRecord.record.title}}</h3>
          <div class="v56-evidence-meta">{{v56ActiveRecord.record.id}} · {{v56ActiveRecord.record.tenureText||'任期未详'}}</div>
          <span class="v56-evidence-status" :class="{pending:['待考','存疑'].includes(v56ActiveRecord.record.confidence)}">{{v56ActiveRecord.record.confidence||'证据状态待考'}}</span>
          <section class="v56-evidence-section"><h4>行政关系</h4><p>{{v56ActiveRecord.record.polity||'政权待考'}} · {{v56ActiveRecord.record.jurisdiction||'辖区未详'}}</p><p v-if="v56ActiveRecord.record.seat">治所：{{v56ActiveRecord.record.seat}}</p></section>
          <section class="v56-evidence-section"><h4>跨模块动作</h4><el-button size="small" plain @click="openPeopleDetail(v56ActiveRecord.record.personId||v56ActiveRecord.record.commander)">查看人物履历</el-button><el-button size="small" plain @click="jumpFangzhenToMap(v56ActiveRecord.record)">地图定位</el-button></section>`
};

/* 登记表：与 index.html 的 sgzUiUnitLoaders 模块键对应，由
 * registerSgzUiModuleComponents 逐项 app.component(name, component) 注册。
 * 放在文件末尾，避免「引用尚未初始化」的 TDZ 问题。 */
export const ui = {
  FangzhenContext,
  FangzhenWorkbench,
  FangzhenEvidence
};
