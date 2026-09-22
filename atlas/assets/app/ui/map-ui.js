/**
 * 形势图（map）模块界面单元。
 *
 * 由 atlas/index.html 的模块模板中迁出，模板内容逐字保持，不改动结构、类名与文案。
 * 契约与其余模块一致：`state` 代理只读，所有交互经函数 prop 回调父层。
 *
 * 本模块按既定范围只重构外壳（时间轴、播放控件、地图容器、联动卡片）；
 * 不触碰地图几何、图层逻辑与历史数据，iframe 及其 id/class 原样保留。
 *
 * 单元：
 *   MapShell —— 形势图外壳（时间轴 + 阶段 + 地图舞台 + 联动卡片）
 *
 * 依赖面：
 *   state 读取：historyMapBooted historyMapReady historyMapIndex historyMapEras
 *               historyMapPeriods currentHistoryPeriod mapLinkSelection
 *               mapLinkedFangzhenRecords historyMapPlaying historyMapUrl
 *   动作（函数 prop）：stepPeriod togglePlay selectPeriod closeLink
 *                      openPeopleDetail openSelectionFangzhen onFrameLoaded
 */

export const MapShell = {
  name: 'MapShell',
  props: {
    active: { type: Boolean, default: false },
    state: { type: Object, required: true },
    stepPeriod: { type: Function, required: true },
    togglePlay: { type: Function, required: true },
    selectPeriod: { type: Function, required: true },
    closeLink: { type: Function, required: true },
    openPeopleDetail: { type: Function, required: true },
    openSelectionFangzhen: { type: Function, required: true },
    onFrameLoaded: { type: Function, required: true },
  },
  template: `
    <main v-if="state.historyMapBooted" v-show="active" class="module-page history-map-page">
      <section class="battle-timebar" aria-label="朝代时间轴">
        <div class="battle-time-head">
          <div class="battle-time-title">
            <span class="eyebrow">历史时期</span>
            <strong>{{state.currentHistoryPeriod.axisLabel}}</strong>
            <span>{{state.currentHistoryPeriod.name}} · 公元 {{state.currentHistoryPeriod.year}} 年</span>
          </div>
          <div class="battle-time-summary">{{state.currentHistoryPeriod.snapshotMoment}} · {{state.currentHistoryPeriod.tagline}} · {{state.currentHistoryPeriod.summary}}</div>
          <div class="map-play-controls">
            <button class="map-play-btn" title="上一时期" @click="stepPeriod(-1)">‹</button>
            <el-dropdown trigger="click"><button type="button" class="map-play-btn" aria-label="地图更多操作">⋯</button><template #dropdown><el-dropdown-menu><el-dropdown-item @click="togglePlay">{{state.historyMapPlaying?'暂停播放':'自动播放时期'}}</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
            <button class="map-play-btn" title="下一时期" @click="stepPeriod(1)">›</button>
          </div>
        </div>
        <div class="battle-timeline-scroll">
          <div class="battle-era-track" aria-label="朝代分段">
            <button v-for="era in state.historyMapEras" :key="era.id" class="battle-era-segment"
                    :class="{active:state.historyMapIndex>=era.start&&state.historyMapIndex<era.start+era.span}"
                    :style="{gridColumn:'span '+era.span,'--era-color':era.color}"
                    @click="selectPeriod(era.start,true)">
              <strong>{{era.label}}</strong><span>{{era.range}}</span>
            </button>
          </div>
          <div class="battle-period-track">
            <button v-for="(period,index) in state.historyMapPeriods" :key="period.id" class="battle-period"
                    :class="{active:state.historyMapIndex===index,past:index<state.historyMapIndex}"
                    @click="selectPeriod(index,true)">
              <b>{{period.year}}</b><span>{{period.name}}</span>
            </button>
          </div>
        </div>
      </section>
      <section class="history-map-stage">
        <div v-if="!state.historyMapReady" class="map-loading">正在载入历史疆域与战役图层…</div>
        <iframe id="historyMapFrame" class="history-map-frame" title="汉末三国历史形势图" loading="lazy"
                :src="state.historyMapUrl" @load="onFrameLoaded"></iframe>
        <div v-if="state.mapLinkSelection" class="map-link-card" aria-live="polite">
          <div class="map-link-head"><strong>{{state.mapLinkSelection.name||state.mapLinkSelection.state}}</strong><span>{{state.mapLinkSelection.year||state.currentHistoryPeriod.year}} 年 · {{state.mapLinkSelection.level==='commandery'?'郡级辖区':'州级辖区'}}</span><button title="关闭" @click="closeLink">×</button></div>
          <div v-if="state.mapLinkedFangzhenRecords.length" class="map-link-records">
            <button v-for="record in state.mapLinkedFangzhenRecords" :key="record.id" class="map-link-person" @click="openPeopleDetail(record.personId||record.commander)"><b>{{record.commander}}</b><span>{{record.title}}</span></button>
          </div>
          <div v-else class="map-link-empty">当前年份未检索到明确匹配的州镇职任；可进入州镇表查看相邻任期或任期未详的记录。</div>
          <div class="map-link-actions"><el-button size="small" type="primary" plain @click="openSelectionFangzhen">在州镇表中检索</el-button></div>
        </div>
      </section>
    </main>
  `,
};

export const ui = { MapShell };
