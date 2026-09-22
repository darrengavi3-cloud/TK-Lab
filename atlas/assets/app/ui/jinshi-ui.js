/* 金石录界面单元。
 *
 * 主体布局自 index.html 逐字抽取（原 9857–9920 行），未改写任何文案、class 或属性。
 * 组件不持有业务状态：数据读取经 state 代理转发到父层响应式引用，
 * 写入经 state-update / page-delta 事件回传父层，动作经函数型 props 调用。
 * 模板中保留父层同名标识符，由本组件的同名 computed / methods 承接解析。
 */
export const JINSHI_STATE_UPDATE_EVENT = 'state-update';
export const JINSHI_PAGE_DELTA_EVENT = 'page-delta';

export const JinshiWorkbench = {
  name: 'JinshiWorkbench',
  emits: [JINSHI_STATE_UPDATE_EVENT, JINSHI_PAGE_DELTA_EVENT],
  props: {
    moduleVisited: { type: Boolean, default: false },
    moduleReady: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    workspaceMode: { type: String, default: 'reader' },
    state: { type: Object, required: true },
    // 函数型 props：由父层注入，组件只调用、不实现。
    openRecord: { type: Function, required: true },
    stepRecord: { type: Function, required: true },
    highlight: { type: Function, required: true },
    confirmedText: { type: Function, required: true },
    openPerson: { type: Function, required: true }
  },
  computed: {
    epigraphicMetrics() { return this.state.epigraphicMetrics; },
    filteredEpigraphicRecords() { return this.state.filteredEpigraphicRecords; },
    epigraphicPage() { return this.state.epigraphicPage; },
    epigraphicPageCount() { return this.state.epigraphicPageCount; },
    pagedEpigraphicRecords() { return this.state.pagedEpigraphicRecords; },
    jinshiPrimaryDetail() { return this.state.jinshiPrimaryDetail; },
    jinshiRecordIndex() { return this.state.jinshiRecordIndex; },
    jinshiMediaAssets() { return this.state.jinshiMediaAssets; },
    jinshiActiveMedia() { return this.state.jinshiActiveMedia; },
    epigraphicMediaIndex() { return this.state.epigraphicMediaIndex; },
    epigraphicEraOptions() { return this.state.epigraphicEraOptions; },
    epigraphicTypes() { return this.state.epigraphicTypes; },
    epigraphicPolities() { return this.state.epigraphicPolities; },
    epigraphicInscriptionStatuses() { return this.state.epigraphicInscriptionStatuses; },
    epigraphicArchive() { return this.state.epigraphicArchive; },
    epigraphicQuery() { return this.state.epigraphicQuery; },
    epigraphicEra() { return this.state.epigraphicEra; },
    epigraphicType() { return this.state.epigraphicType; },
    epigraphicPolity() { return this.state.epigraphicPolity; },
    epigraphicInscriptionStatus() { return this.state.epigraphicInscriptionStatus; },
  },
  methods: {
    setState(key, value) { this.$emit(JINSHI_STATE_UPDATE_EVENT, key, value); },
    changePage(delta) { this.$emit(JINSHI_PAGE_DELTA_EVENT, delta); },
    /* 以下方法名与模板中的调用点一一对应，转调父层注入的函数。 */
    openEpigraphicDetail(record) { this.openRecord(record); },
    stepEpigraphicRecord(delta) { this.stepRecord(delta); },
    epigraphicHighlight(text) { return this.highlight(text); },
    epigraphicConfirmedText(value) { return this.confirmedText(value); },
    openEpigraphicPerson(name) { return this.openPerson(name); }
  },
  template: `<main v-if="moduleVisited&&moduleReady" v-show="active" class="module-page jinshi-workbench">
      <div class="module-page-inner">
        <header class="v67-module-masthead">

          <div class="v67-masthead-meta"><strong>{{epigraphicMetrics.current}}</strong><span>当前</span><strong>{{epigraphicMetrics.withInscription}}</strong><span>有释文</span></div>
        </header>
        <section v-if="!filteredEpigraphicRecords.length" class="jinshi-empty-panel">
          <div class="seal">金</div>
          <h2>暂无符合条件的金石材料</h2>
          <p>可清除筛选条件，或调整国别和材料类型。</p>
        </section>
        <section v-else class="v56-jinshi-workbench-grid" aria-label="金石目录与释文阅读区">
          <aside class="v56-jinshi-directory" aria-label="金石材料目录">
            <header class="v67-jinshi-directory-head"><div><strong>金石条目</strong><small>共 {{filteredEpigraphicRecords.length}} 条</small></div><span>第 {{epigraphicPage}} / {{epigraphicPageCount}} 页</span></header>
            <div role="list">
            <button v-for="record in pagedEpigraphicRecords" :key="record.id" type="button"
                    class="v56-jinshi-row" :aria-current="jinshiPrimaryDetail?.id===record.id?'true':undefined" :class="{active:jinshiPrimaryDetail&&jinshiPrimaryDetail.id===record.id}" @click="openEpigraphicDetail(record)">
              <span class="v56-jinshi-row-title">{{record.displayName}}<small v-if="record.variantLabel" class="v62-jinshi-variant-label">{{record.variantLabel}}</small></span>
              <span class="v56-jinshi-row-meta">{{[epigraphicConfirmedText(record.dateText),record.materialType,epigraphicConfirmedText(record.findspot)].filter(Boolean).join(' · ')}}</span>
              <span class="v58-jinshi-status">{{record.inscriptionState==='已录入'?'释文已录入':record.inscriptionState==='残缺'?'残缺释文':record.inscriptionState==='待校'?'待校释文':'源文未见释文'}}<template v-if="record.archiveKind==='争议'"> · 年代或归属存疑</template></span>
            </button>
            </div>
            <nav class="v67-pagination" aria-label="金石目录分页"><button type="button" :disabled="epigraphicPage<=1" @click="epigraphicPage-=1">上一页</button><span>{{filteredEpigraphicRecords.length}} 条</span><button type="button" :disabled="epigraphicPage>=epigraphicPageCount" @click="epigraphicPage+=1">下一页</button></nav>
          </aside>
          <article v-if="jinshiPrimaryDetail" class="v56-jinshi-reader">
            <header class="v67-jinshi-reader-head"><div><small>{{[jinshiPrimaryDetail.dynasty,jinshiPrimaryDetail.materialType].filter(Boolean).join(' · ')}}</small><h2>{{jinshiPrimaryDetail.displayName}}<small v-if="jinshiPrimaryDetail.variantLabel" class="v62-jinshi-variant-label">{{jinshiPrimaryDetail.variantLabel}}</small></h2><p v-if="jinshiPrimaryDetail.titleAliases&&jinshiPrimaryDetail.titleAliases.length" class="v62-jinshi-aliases">别名：{{jinshiPrimaryDetail.titleAliases.join('、')}}</p></div><nav aria-label="前后金石条目"><button type="button" :disabled="jinshiRecordIndex<=0" @click="stepEpigraphicRecord(-1)">上一条</button><button type="button" :disabled="jinshiRecordIndex<0||jinshiRecordIndex>=filteredEpigraphicRecords.length-1" @click="stepEpigraphicRecord(1)">下一条</button></nav></header>
            <section v-if="jinshiMediaAssets.length" class="v67-jinshi-media" aria-label="金石图像">
              <figure v-if="jinshiActiveMedia"><img :src="jinshiActiveMedia.localPath" :alt="jinshiActiveMedia.altText" :width="jinshiActiveMedia.width||undefined" :height="jinshiActiveMedia.height||undefined" loading="lazy" decoding="async"><figcaption>{{jinshiActiveMedia.sourceTitle}}<template v-if="jinshiActiveMedia.rightsStatus"> · {{jinshiActiveMedia.rightsStatus}}</template></figcaption></figure>
              <div v-if="jinshiMediaAssets.length>1" class="v67-jinshi-thumbnails"><button v-for="(asset,index) in jinshiMediaAssets" :key="asset.assetId" type="button" :class="{active:epigraphicMediaIndex===index}" @click="epigraphicMediaIndex=index"><img :src="asset.localPath" :alt="asset.altText" loading="lazy" decoding="async"></button></div>
            </section>
            <dl class="v67-jinshi-facts"><div v-if="epigraphicConfirmedText(jinshiPrimaryDetail.dateText)"><dt>年代</dt><dd>{{epigraphicConfirmedText(jinshiPrimaryDetail.dateText)}}</dd></div><div v-if="jinshiPrimaryDetail.dynasty"><dt>政权</dt><dd>{{jinshiPrimaryDetail.dynasty}}</dd></div><div v-if="jinshiPrimaryDetail.materialType"><dt>类型</dt><dd>{{jinshiPrimaryDetail.materialType}}</dd></div><div v-if="epigraphicConfirmedText(jinshiPrimaryDetail.findspot)"><dt>出土地</dt><dd>{{epigraphicConfirmedText(jinshiPrimaryDetail.findspot)}}</dd></div><div v-if="jinshiPrimaryDetail.scriptStyle"><dt>书体</dt><dd>{{jinshiPrimaryDetail.scriptStyle}}</dd></div><div v-if="jinshiPrimaryDetail.form"><dt>形制</dt><dd>{{jinshiPrimaryDetail.form}}</dd></div><div v-if="jinshiPrimaryDetail.bibliography"><dt>著录</dt><dd>{{jinshiPrimaryDetail.bibliography}}</dd></div></dl>
            <dl v-if="workspaceMode==='review'" class="v56-jinshi-fields review-only"><div><dt>原始题名</dt><dd>{{jinshiPrimaryDetail.rawRecord&&jinshiPrimaryDetail.rawRecord.title||jinshiPrimaryDetail.rawTitle||jinshiPrimaryDetail.name}}</dd></div><div><dt>来源范围</dt><dd>{{jinshiPrimaryDetail.archiveKind}} · {{jinshiPrimaryDetail.sourceTitle||jinshiPrimaryDetail.sourceDocument||'来源待补'}}</dd></div><div><dt>释文状态</dt><dd>{{jinshiPrimaryDetail.inscriptionState==='已录入'?'释文已录入':jinshiPrimaryDetail.inscriptionState==='残缺'?'残缺释文':jinshiPrimaryDetail.inscriptionState==='待校'?'待校释文':'源文未见明确释文标识'}}</dd></div><div><dt>源文状态</dt><dd>{{jinshiPrimaryDetail.inscriptionStatus||'源文未见明确释文标识'}}</dd></div></dl>
            <inscription-availability :record="jinshiPrimaryDetail" />
            <section v-if="jinshiPrimaryDetail.inscription" class="v56-jinshi-inscription">
              <h3>释文</h3>
              <div class="v62-transcription">
                <section v-for="section in jinshiPrimaryDetail.transcriptionSections" :key="section.key" class="v62-transcription-section">
                  <h4 v-if="section.label&&!['正文','释文'].includes(section.label)">{{section.label}}</h4>
                  <div v-if="section.text" class="v62-transcription-text"><template v-for="(fragment,index) in epigraphicHighlight(section.text)" :key="section.key+'-'+index"><mark v-if="fragment.hit">{{fragment.text}}</mark><template v-else>{{fragment.text}}</template></template></div>
                </section>
              </div>
            </section>
            <inscription-apparatus :record="jinshiPrimaryDetail" />
            <section v-if="workspaceMode==='review'&&jinshiPrimaryDetail.sourceVerification" class="v61-jinshi-research review-only">
              <h3>V61 检索与释文分层</h3>
              <p>{{jinshiPrimaryDetail.sourceVerification.result}}</p>
              <div v-if="jinshiPrimaryDetail.sourceVerification.sources&&jinshiPrimaryDetail.sourceVerification.sources.length" class="v61-jinshi-sources">
                <a v-for="source in jinshiPrimaryDetail.sourceVerification.sources" :key="source.url||source.title" :href="source.url" target="_blank" rel="noreferrer"><strong>{{source.title}}</strong><span>{{source.locator||source.role}}</span></a>
              </div>
              <details v-for="variant in (jinshiPrimaryDetail.inscriptionVariants||[])" :key="variant.type+'-'+variant.label" class="v61-jinshi-variant">
                <summary>{{variant.label||variant.type}} · {{variant.type}}</summary>
                <p v-if="variant.note">{{variant.note}}</p>
                <pre v-if="variant.text">{{variant.text}}</pre>
              </details>
              <details v-if="jinshiPrimaryDetail.externalSearchLog&&jinshiPrimaryDetail.externalSearchLog.length" class="v61-jinshi-variant">
                <summary>逐条检索日志（{{jinshiPrimaryDetail.externalSearchLog.length}}）</summary>
                <p v-for="log in jinshiPrimaryDetail.externalSearchLog" :key="log.url+'-'+log.source"><b>{{log.source}}</b>：{{log.result}}</p>
              </details>
            </section>
            <section v-if="jinshiPrimaryDetail.people||jinshiPrimaryDetail.offices||jinshiPrimaryDetail.contentSummary||jinshiPrimaryDetail.readerDescription||(workspaceMode==='review'&&jinshiPrimaryDetail.note)" class="v67-jinshi-related"><h3>相关信息</h3><p v-if="jinshiPrimaryDetail.contentSummary||jinshiPrimaryDetail.readerDescription">{{jinshiPrimaryDetail.contentSummary||jinshiPrimaryDetail.readerDescription}}</p><p v-if="workspaceMode==='review'&&jinshiPrimaryDetail.note" class="review-only">{{jinshiPrimaryDetail.note}}</p><div class="jinshi-related"><button v-for="nm in (jinshiPrimaryDetail.people||'').split(/[、，,]/).filter(Boolean)" :key="nm" @click="openEpigraphicPerson(nm)">{{nm}}</button><span v-if="jinshiPrimaryDetail.offices">{{jinshiPrimaryDetail.offices}}</span></div></section>
          </article>
        </section>
      </div>
    </main>`
};



/* 金石录工具栏条。
 * 原为 index.html 中的 <template v-else-if="activeModule==='jinshi'"> 块，
 * 承载四个筛选下拉框。v-model 目标经 state 代理读写，写入走 state-update 事件，
 * 与原 v-model 的数据流一致；workspaceMode 为只读 prop，控制「来源范围」的显隐。 */
export const JinshiContext = {
  name: 'JinshiContext',
  emits: [JINSHI_STATE_UPDATE_EVENT],
  props: {
    state: { type: Object, required: true },
    workspaceMode: { type: String, default: 'reader' }
  },
  methods: {
    setState(key, value) { this.$emit(JINSHI_STATE_UPDATE_EVENT, key, value); },
    update(model, value) { this.setState(model, value); }
  },
  template: `<template>
        <el-select :model-value="state.epigraphicEra" @update:model-value="v=>update('epigraphicEra',v)" class="v56-context-select" size="small" aria-label="时代筛选"><el-option label="全部时代" value="all"/><el-option v-for="era in state.epigraphicEraOptions" :key="era" :label="era" :value="era"/></el-select>
        <el-select :model-value="state.epigraphicType" @update:model-value="v=>update('epigraphicType',v)" class="v56-context-select" size="small" aria-label="材料类型"><el-option label="全部类型" value="all"/><el-option v-for="type in state.epigraphicTypes" :key="type" :label="type" :value="type"/></el-select>
        <el-select :model-value="state.epigraphicPolity" @update:model-value="v=>update('epigraphicPolity',v)" class="v56-context-select" size="small" aria-label="政权筛选"><el-option label="全部政权" value="all"/><el-option v-for="polity in state.epigraphicPolities" :key="polity" :label="polity" :value="polity"/></el-select>
        <el-select v-if="workspaceMode==='review'" :model-value="state.epigraphicArchive" @update:model-value="v=>update('epigraphicArchive',v)" class="v56-context-select review-only" size="small" aria-label="来源范围"><el-option label="全部范围" value="all"/><el-option label="核心" value="核心"/><el-option label="扩展" value="扩展"/><el-option label="争议" value="争议"/></el-select>
        <el-select :model-value="state.epigraphicInscriptionStatus" @update:model-value="v=>update('epigraphicInscriptionStatus',v)" class="v56-context-select" size="small" aria-label="释文状态"><el-option label="全部释文状态" value="all"/><el-option v-for="status in state.epigraphicInscriptionStatuses" :key="status" :label="status==='已录入'?'有释文（含残缺）':status" :value="status"/></el-select>
      </template>`
};

export const ui = { JinshiWorkbench, JinshiContext };
