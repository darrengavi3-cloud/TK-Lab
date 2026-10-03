import {api, ApiError, locale, randomId} from './shared';
import {safeReadingReturn} from '../atlas/assets/app/reading-history.js';
import {canonicalJson, type Revision} from '../domain/revisions';
import type {Person, Source} from '../domain/catalogue';
import type {ResearchGraph, CareerEvent, Claim} from '../domain/prosopography/types';
import {requiresResearchReview} from '../domain/prosopography/journal';
import {validateResearchGraph} from '../domain/prosopography/validate';
import {unknownTime} from '../domain/prosopography/time';
import {appendMaterials, validateMaterialPack, normalizeMaterialSource, assessmentNames, eventNames, claimText, eventDates, emptyEvent, emptyEventDate, researchCsv, researchDocument, type Inspection, type ResearchMaterialPack, type SourceView} from '../domain/prosopography/workspace';

interface RawPreview {readOnly: true; graph: ResearchGraph; manifest: {catalogueWatermark: number; personId: string; graphDigest: string}; digest: string; warnings: Inspection['warnings']; sourceRevisions: SourceView[]}
interface Saved {personId: string; number: number; catalogueWatermark: number; graph: ResearchGraph; graphDigest: string; reason: string; at: string}
interface PersonRow {id: string; data: Person; version: number}
interface HistoryRow {version: number; reason: string; at: string}
const {createApp, reactive, computed, watch, onMounted, nextTick} = window.Vue;
const clone = <T>(value: T): T => JSON.parse(canonicalJson(value)) as T;
const themeKeys = ['laitai-day', 'review-paper', 'lamp-night'];
const presenceNames: Record<string, string> = {attested: '該年見任', continuous: '有連續任期依據', possible: '可能在任', unknown: '不詳', 'not-held': '未實任', outside: '不在所採任期內', excluded: '已排除'};

createApp({setup() {
  const state = reactive({ready: false, busy: false, loading: false, error: '', message: '', theme: 'laitai-day', query: '', composing: false, page: 1, total: 0, people: [] as PersonRow[],
    person: null as PersonRow | null, original: null as RawPreview | null, graph: null as ResearchGraph | null, loadedGraph: '', baseRevision: 0, watermark: 0,
    inspection: null as Inspection | null, sources: [] as SourceView[], selectedEvent: '', selectedTenure: '', mobileDetail: false, tab: 'events',
    eventFilter: '', eventKind: '', year: '', yearResult: null as Inspection['presence'], reason: '', reviewed: false, saveAvailable: true,
    compactSources: false, compareActiveKey: '', compareOrigin: 'events', returnPath: '/',
    compareKeys: [] as string[], revisions: [] as HistoryRow[], nextBefore: null as number | null, conflict: null as Saved | null, historyPreview: null as Saved | null,
    material: null as ResearchMaterialPack | null, materialConfirmed: false, importBusy: false, importJobId: '', advanced: '', advancedDirty: false});
  let listEpoch = 0, pendingSave: {signature: string; input: Record<string, unknown>} | null = null;
  const dirty = computed(() => !!state.graph && (canonicalJson(state.graph) !== state.loadedGraph || state.advancedDirty));
  const title = computed(() => (state.person?.data.name || '人物') + '研究案卷');
  const currentEvent = computed(() => state.graph?.events.find(e => e.id === state.selectedEvent) || null);
  const currentTenure = computed(() => state.graph?.tenures.find(t => t.id === state.selectedTenure) || null);
  const currentClaims = computed(() => state.graph?.claims.filter(c => c.subject.id === (state.tab === 'tenures' ? state.selectedTenure : state.selectedEvent)) || []);
  const visibleEvents = computed(() => (state.graph?.events || []).filter(e => (!state.eventKind || e.type === state.eventKind) && (!state.eventFilter || [e.original, eventDates(state.graph!, e.id)].join(' ').includes(state.eventFilter))));
  const compareSources = computed(() => state.compareKeys.map(key => state.sources.find(s => sourceKey(s) === key)).filter((s): s is SourceView => !!s));
  const contextEvidence = computed(() => currentClaims.value.flatMap(claim => claimSources(claim).map(ref => ({...ref, claim}))).filter((ref,index,all) => all.findIndex(other => other.evidence.source.id===ref.evidence.source.id&&other.evidence.source.revision===ref.evidence.source.revision)===index));
  watch(() => state.compareKeys.join('|'), () => {if (!state.compareKeys.includes(state.compareActiveKey)) state.compareActiveKey=state.compareKeys[0]||'';});
  const needsReview = computed(() => !!state.graph && requiresResearchReview(state.graph));
  const conflictRows = computed(() => {
    if (!state.conflict || !state.graph) return [];
    return (['events','tenures','claims','evidence','factualConflicts','textualVariants'] as const).flatMap(kind => {
      const remote = new Map(state.conflict!.graph[kind].map(row => [row.id, row]));
      const local = new Map(state.graph![kind].map(row => [row.id, row]));
      return [...new Set([...remote.keys(), ...local.keys()])].filter(id => canonicalJson(remote.get(id) ?? null) !== canonicalJson(local.get(id) ?? null)).map(id => ({key: kind + '/' + id, kind, id, remote: remote.get(id), local: local.get(id)}));
    });
  });
  const sourceKey = (s: SourceView) => s.pin.id + '@' + s.pin.revision;
  async function dossier<T>(suffix = ''): Promise<T> {const result = await api<{persisted: boolean; published: false; data: T}>('/research/dossiers/' + encodeURIComponent(state.person!.id) + suffix); if (result.published !== false) throw Error('研究回應狀態無效。'); return result.data;}
  function setTheme() {if (!themeKeys.includes(state.theme)) state.theme = 'laitai-day'; document.documentElement.dataset.sgzTheme = state.theme; try {localStorage.setItem('guanshitai:admin-theme', state.theme);} catch { /* preferences are optional */ }}
  function report(error: unknown) {state.error = error instanceof Error ? error.message : '操作未完成，輸入仍保留。'; void nextTick().then(() => document.getElementById('research-error')?.focus());}
  async function run(task: () => Promise<void>) {if (state.busy) return; state.busy = true; state.error = ''; state.message = ''; try {await task();} catch (e) {report(e);} finally {state.busy = false;}}
  async function mayReplace() {if (!dirty.value) return true; try {await window.ElementPlus.ElMessageBox.confirm('尚未保存的案卷修改會被替換。可以先取消並匯出草稿。', '保留案卷修改', {confirmButtonText: '替換草稿', cancelButtonText: '繼續編輯', type: 'warning', autofocus: true}); return true;} catch {return false;}}
  function syncUrl() {const p = new URLSearchParams(); if (state.query) p.set('q', state.query); p.set('page', String(state.page)); if (state.person) p.set('person', state.person.id); if (state.selectedEvent) p.set('event', state.selectedEvent); if (state.tab !== 'events') p.set('tab', state.tab);if(state.returnPath!=='/')p.set('return',state.returnPath); history.replaceState(null, '', '/admin/research?' + p);}
  function selectEvent(event: CareerEvent) {state.selectedEvent = event.id; state.mobileDetail = true; syncUrl(); void nextTick().then(() => document.getElementById('event-title')?.focus());}
  function selectTenure(id: string) {state.selectedTenure = id; state.mobileDetail = true;}
  function backToList() {state.mobileDetail = false; void nextTick().then(() => document.getElementById('event-' + state.selectedEvent)?.focus());}
  async function search(reset = true) {if (state.composing) return; if (reset) state.page = 1; const epoch = ++listEpoch; state.loading = true; state.error = ''; try {const result = await api<{rows: PersonRow[]; total: number}>('/records?kind=person&q=' + encodeURIComponent(state.query) + '&page=' + state.page); if (epoch !== listEpoch) return; state.people = result.rows; state.total = result.total; syncUrl();} catch (e) {if (epoch === listEpoch) report(e);} finally {if (epoch === listEpoch) state.loading = false;}}
  async function clearSearch() {state.query = ''; await search(); await nextTick(); document.querySelector<HTMLInputElement>('[aria-label="搜尋人物"]')?.focus();}
  async function inspect(graph = state.graph!, watermark = state.watermark, year?: number) {
    validateResearchGraph(graph);
    const result = await api<Inspection>('/research/inspect', 'POST', {graph, watermark, ...(year === undefined ? {} : {year})});
    if (!result.readOnly || result.persisted !== false || result.watermark !== watermark || !Array.isArray(result.sourceRevisions) || (result.presence && result.presence.graphDigest !== result.graphDigest)) throw Error('校驗結果與案卷快照不符。');
    return result;
  }
  async function loadHistory(reset = true) {if (!state.person || !state.saveAvailable) return; const result = await dossier<{rows: HistoryRow[]; nextBefore: number | null}>('/history' + (!reset && state.nextBefore ? '?before=' + state.nextBefore : '')); state.revisions = reset ? result.rows : [...state.revisions, ...result.rows]; state.nextBefore = result.nextBefore;}
  async function loadPerson(row: PersonRow) {if (state.busy || !await mayReplace()) return; await run(async () => {
    let saved: Saved | null = null, saveAvailable = true;
    try {const result = await api<{data: Saved | null; published: false}>('/research/dossiers/' + encodeURIComponent(row.id)); if (result.published !== false) throw Error('研究回應狀態無效。'); saved = result.data;} catch (e) {if (e instanceof ApiError && e.status === 404) saved = null; else if (e instanceof ApiError && e.status === 503) saveAvailable = false; else throw e;}
    const raw = await api<RawPreview>('/research/people/' + encodeURIComponent(row.id) + (saved ? '?watermark=' + saved.catalogueWatermark : ''));
    if (raw.graph.personId !== row.id || raw.manifest.personId !== row.id || (saved && saved.personId !== row.id)) throw Error('人物身份與案卷不符。');
    const graph = saved?.graph || raw.graph, watermark = saved?.catalogueWatermark ?? raw.manifest.catalogueWatermark;
    const checked = await inspect(graph, watermark);
    state.person = row; state.original = raw; state.graph = clone(graph); state.loadedGraph = canonicalJson(graph); state.baseRevision = saved?.number || 0; state.watermark = watermark;
    state.inspection = checked; state.sources = checked.sourceRevisions; state.selectedEvent = graph.events[0]?.id || ''; state.selectedTenure = graph.tenures[0]?.id || '';
    state.compareKeys = []; state.conflict = null; state.historyPreview = null; state.reason = ''; state.reviewed = false; state.material = null; state.materialConfirmed = false; state.importJobId = ''; state.saveAvailable = saveAvailable;
    state.advanced = JSON.stringify(graph, null, 2); state.advancedDirty = false; state.mobileDetail = false; state.yearResult = null; state.revisions = []; pendingSave = null;
    if (saveAvailable) {try {await loadHistory();} catch {state.error = '案卷已讀取，但修訂列表暫時無法更新。';}}
    state.message = saveAvailable ? (saved ? '已讀取研究修訂 ' + saved.number + '。' : '已建立案卷草稿，可加入材料後保存。') : '目前可閱讀、比較與匯出；研究保存服務尚未就緒。'; syncUrl();
  });}
  function changed() {state.inspection = null; state.reviewed = false; state.yearResult = null;}
  watch(() => state.graph ? canonicalJson(state.graph) : '', () => {changed(); if (!state.advancedDirty) state.advanced = JSON.stringify(state.graph, null, 2);});
  function addEvent() {if (!state.graph) return; const event = emptyEvent(state.graph.personId); event.original = '新事件'; state.graph.events.push(event); state.graph.claims.push(emptyEventDate(event.id)); state.tab = 'events'; selectEvent(event);}
  function addDate() {if (state.graph && currentEvent.value) state.graph.claims.push(emptyEventDate(currentEvent.value.id));}
  function dateChanged(claim: Claim) {if (claim.content.type !== 'event-date') return; const t = claim.content.value; if (t.earliestYear === null && t.latestYear === null) {t.precision = 'unknown'; t.certainty = 'unknown';} else {t.precision = t.earliestYear !== null && t.earliestYear === t.latestYear ? 'year' : 'range'; if (t.certainty === 'unknown') t.certainty = 'explicit';} changed();}
  function claimSources(claim: Claim) {return (state.graph?.evidence.filter(e => e.claimId === claim.id) || []).map(e => ({evidence: e, source: state.sources.find(s => sourceKey(s) === e.source.id + '@' + e.source.revision)}));}
  function selectEvidence(claim: Claim, keys: string[]) {if (!state.graph) return; const previous = state.graph.evidence.filter(e => e.claimId === claim.id && e.role === 'support'); const other = state.graph.evidence.filter(e => e.claimId !== claim.id || e.role !== 'support'); state.graph.evidence = [...other, ...keys.map(key => {const existing = previous.find(e => e.source.id + '@' + e.source.revision === key); if (existing) return existing; const source = state.sources.find(s => sourceKey(s) === key)!; return {id: 'evidence:' + randomId(), claimId: claim.id, source: source.pin, role: 'support' as const, note: ''};})];}
  function evidenceKeys(claim: Claim) {return state.graph?.evidence.filter(e => e.claimId === claim.id && e.role === 'support').map(e => e.source.id + '@' + e.source.revision) || [];}
  function compareClaim(claim: Claim) {state.compareOrigin=state.tab==='tenures'?'tenures':'events';state.compareKeys=evidenceKeys(claim).slice(0,3);state.compareActiveKey=state.compareKeys[0]||'';state.tab='sources';syncUrl();void nextTick().then(()=>document.getElementById('source-compare-title')?.focus());}
  function returnFromCompare(){state.tab=state.compareOrigin;syncUrl();void nextTick().then(()=>document.getElementById('event-title')?.focus());}
  function readEvidence(source: SourceView){state.compareOrigin=state.tab==='tenures'?'tenures':'events';const key=sourceKey(source);state.compareKeys=[key];state.compareActiveKey=key;state.tab='sources';syncUrl();void nextTick().then(()=>document.getElementById('source-compare-title')?.focus());}
  function focusSave(){document.querySelector<HTMLTextAreaElement>('[aria-label="本次修訂說明"]')?.focus();document.querySelector('.save-panel')?.scrollIntoView({block:'center',behavior:'auto'});}
  async function returnToReader(){if(await mayReplace())location.assign(state.returnPath);}

  async function checkDraft() {await run(async () => {if (!state.graph || state.advancedDirty) throw Error('請先套用或捨棄進階編輯中的草稿。'); const checked = await inspect(); state.inspection = checked; state.sources = checked.sourceRevisions; state.message = '案卷結構與固定引文已核對；史實狀態維持逐條記錄。';});}
  async function save() {await run(async () => {
    if (!state.graph || state.advancedDirty) throw Error('請先套用或捨棄進階編輯中的草稿。');
    if (!state.reason.trim()) throw Error('請填寫本次修訂說明。');
    if (needsReview.value && !state.reviewed) throw Error('本稿含已核或採擇內容，請確認已檢查這份案卷。');
    const graph = clone(state.graph), reason = state.reason, checked = await inspect(graph);
    const payload = {baseRevision: state.baseRevision, watermark: state.watermark, graph, inspectedGraphDigest: checked.graphDigest, reason, ...(needsReview.value ? {reviewedContentDigest: checked.graphDigest} : {})};
    const signature = canonicalJson(payload); if (!pendingSave || pendingSave.signature !== signature) pendingSave = {signature, input: {...payload, requestId: 'research:' + randomId()}};
    try {
      const result = await api<{persisted: true; published: false; revision: Saved}>('/research/dossiers', 'POST', pendingSave.input);
      if (!result.persisted || result.published || result.revision.personId !== state.graph.personId || result.revision.graphDigest !== checked.graphDigest) throw Error('保存回應與本稿不符，請重新讀取修訂紀錄確認。');
      state.baseRevision = result.revision.number; state.loadedGraph = canonicalJson(graph); state.reason = ''; state.inspection = checked; state.sources = checked.sourceRevisions; state.conflict = null; pendingSave = null;
      state.message = '已保存研究修訂 ' + result.revision.number + '，閱讀內容未發布。'; try {await loadHistory();} catch {state.message += ' 修訂列表暫時無法更新，可稍後重新讀取。';}
    } catch (e) {if (e instanceof ApiError && e.status === 409) {state.conflict = await dossier<Saved>(); state.tab = 'history';} throw e;}
  });}
  function useRemoteItem(row: {kind: 'events'|'tenures'|'claims'|'evidence'|'factualConflicts'|'textualVariants'; id: string; remote: unknown}) {if (!state.graph) return; const list = state.graph[row.kind] as {id: string}[]; const i = list.findIndex(item => item.id === row.id); if (i >= 0) list.splice(i, 1); if (row.remote) list.push(clone(row.remote) as {id: string});}
  async function acceptConflictBase() {if (!state.conflict) return; try {await window.ElementPlus.ElMessageBox.confirm('目前草稿會成為下一修訂。請先逐項比較並納入需要保留的新版本內容；未納入的差異仍保存在修訂歷史。', '完成修訂比較', {confirmButtonText: '以比較後草稿繼續', cancelButtonText: '繼續比較', type: 'warning'}); state.baseRevision = state.conflict.number; state.conflict = null; pendingSave = null; state.reviewed = false; state.message = '已更新保存基底，請填寫說明並重新保存。';} catch { /* keep both versions */ }}
  async function showRevision(number: number) {await run(async () => {state.historyPreview = await dossier<Saved>('?revision=' + number);});}
  async function restoreRevision() {if (!state.historyPreview || !await mayReplace()) return; await run(async () => {const candidate = clone(state.historyPreview!); const latest = await dossier<Saved>(); const checked = await inspect(candidate.graph, candidate.catalogueWatermark); state.graph = candidate.graph; state.watermark = candidate.catalogueWatermark; state.baseRevision = latest.number; state.loadedGraph = canonicalJson(latest.graph); state.sources = checked.sourceRevisions; state.reason = '恢復研究修訂 ' + candidate.number; state.historyPreview = null; state.advancedDirty = false; state.message = '已載入舊內容，保存後會新增修訂。';});}
  async function queryYear() {await run(async () => {if (!/^-?\d+$/.test(state.year) || +state.year === 0 || Math.abs(+state.year) > 5000) throw Error('請填寫公元前後 5000 年內的非零整數。'); const checked = await inspect(state.graph!, state.watermark, +state.year); state.yearResult = checked.presence;});}
  function download(content: string, suffix: string, mime: string) {const url = URL.createObjectURL(new Blob([content], {type: mime})); const a = document.createElement('a'); a.href = url; a.download = (state.person?.data.name || '研究案卷') + '-' + suffix; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);}
  async function exportFile(kind: string) {await run(async () => {
    if (!state.graph || state.advancedDirty) throw Error('請先套用或捨棄進階編輯中的草稿。'); const graph = clone(state.graph), checked = await inspect(graph);
    state.inspection = checked; state.sources = checked.sourceRevisions;
    if (kind === 'csv') download(researchCsv(graph, checked.sourceRevisions), '編年表.csv', 'text/csv;charset=utf-8');
    else if (kind === 'html') download(researchDocument(title.value, graph, checked.sourceRevisions, state.baseRevision, state.watermark, dirty.value || state.baseRevision === 0), '完整案卷.html', 'text/html;charset=utf-8');
    else download(JSON.stringify({format: 'guanshitai-research-workspace-1', title: title.value, originalPreview: state.original, graph, sourceRevisions: checked.sourceRevisions, inspection: checked, baseRevision: state.baseRevision, watermark: state.watermark, persisted: !dirty.value && state.baseRevision > 0, published: false}, null, 2), '研究案卷.json', 'application/json');
    state.message = '已匯出目前案卷與固定出處。未保存的修改仍需保存。';
  });}
  async function chooseMaterial(event: Event) {const input = event.target as HTMLInputElement, file = input.files?.[0]; input.value = ''; if (!file) return; await run(async () => {if (!state.graph) throw Error('請先選擇人物。'); if (file.size > 1024 * 1024) throw Error('研究材料包最多 1 MiB。'); const parsed = JSON.parse(await file.text()); if (parsed.format === 'guanshitai-research-workspace-1') {if (parsed.graph?.personId !== state.person?.id) throw Error('請選擇匯出檔對應的人物；原草稿仍保留。'); if (!await mayReplace()) return; const checked = await inspect(parsed.graph, parsed.watermark); state.graph = clone(parsed.graph); state.watermark = parsed.watermark; state.sources = checked.sourceRevisions; state.advancedDirty = false; state.reason = '載入已匯出的研究草稿'; state.message = '已載入草稿，尚未保存。'; return;} state.material = validateMaterialPack(parsed); state.materialConfirmed = false; state.importJobId = '';});}
  async function importMaterial() {await run(async () => {
    if (!state.material || !state.materialConfirmed || !state.graph || state.advancedDirty) throw Error('請先確認材料與人物對應。');
    const pack = clone(state.material); if (state.graph.events.some(e => e.id.startsWith('event:materials:' + pack.inputSha256 + ':'))) throw Error('此材料已加入案卷，請查看既有事件。');
    state.importBusy = true;
    try {
      const body = JSON.stringify({records: pack.sources.map(normalizeMaterialSource)});
      const response = await fetch('/api/admin/objects', {method: 'POST', credentials: 'same-origin', headers: {'X-Catalogue-Request': '1', 'X-Filename': encodeURIComponent(pack.title + '.json'), 'Content-Type': 'application/json'}, body});
      const uploaded = await response.json() as {hash: string; error?: string}; if (!response.ok) throw new ApiError(response.status, uploaded.error || '材料保存未完成。');
      const job = await api<{id: string; state: string}>('/imports', 'POST', {hash: uploaded.hash, mapping: {kind: 'source', columns: {}, allowUnmapped: false}}); state.importJobId = job.id;
      if (job.state !== 'committed') {
        const preview = await api<{rows: {baseVersion: number}[]; errors: {message: string}[]}>('/imports/' + encodeURIComponent(job.id) + '/preview');
        if (preview.errors.length) throw Error(preview.errors.map(e => e.message).join('\n'));
        if (preview.rows.some(r => r.baseVersion > 0)) throw Error('材料識別碼已有其他內容，本次未覆蓋。請在史料庫比較原資料。');
        let status = job.state, attempts = 0;
        while (status === 'staging' && attempts++ < 30) status = (await api<{state: string}>('/imports/' + encodeURIComponent(job.id) + '/stage', 'POST', {})).state;
        if (status !== 'ready') throw Error('材料暫存尚未完成，可以重試繼續。');
        await api('/imports/' + encodeURIComponent(job.id) + '/commit', 'POST', {reason: '導入研究工作本：' + pack.title});
      }
      const rows: Revision<Source>[] = [];
      for (const source of pack.sources) rows.push(await api<Revision<Source>>('/records/' + encodeURIComponent(source.id)));
      const session = await api<{watermark: number}>('/session');
      const graph = appendMaterials(state.graph, pack, rows), checked = await inspect(graph, session.watermark);
      state.graph = graph; state.watermark = session.watermark; state.sources = checked.sourceRevisions; state.selectedEvent = graph.events.find(e => e.id.startsWith('event:materials:' + pack.inputSha256 + ':'))?.id || state.selectedEvent;
      state.material = null; state.reason = '加入研究材料：' + pack.title; state.tab = 'events'; state.message = '材料已保存至私有史料庫，事件與異說已加入草稿。請核對後保存案卷。';
    } catch (e) {state.message = state.importJobId ? '材料批次已保留；案卷原稿仍在。可以重試繼續，已提交的材料不會重複提交。' : ''; throw e;} finally {state.importBusy = false;}
  });}
  async function applyAdvanced() {await run(async () => {const graph = JSON.parse(state.advanced) as ResearchGraph; if (graph.personId !== state.person?.id) throw Error('研究圖人物與目前人物不符。'); const checked = await inspect(graph); state.graph = graph; state.sources = checked.sourceRevisions; state.advancedDirty = false; state.message = '進階修改已套用至草稿，尚未保存。';});}
  function discardAdvanced() {state.advanced = JSON.stringify(state.graph, null, 2); state.advancedDirty = false;}
  window.addEventListener('beforeunload', e => {if (dirty.value) {e.preventDefault(); e.returnValue = '';}});
  onMounted(async () => {
    try {const saved = localStorage.getItem('guanshitai:admin-theme'); if (saved && themeKeys.includes(saved)) state.theme = saved;} catch { /* optional */ } setTheme();
    const compact=matchMedia('(max-width:760px)');state.compactSources=compact.matches;compact.addEventListener('change',event=>{state.compactSources=event.matches;});
    const p = new URLSearchParams(location.search), requested = p.get('person');state.returnPath=safeReadingReturn(p.get('return'),location.origin); state.query = p.get('q') || ''; state.page = Math.max(1, Number(p.get('page')) || 1);
    try {await api('/session'); state.ready = true; await search(false); if (requested) {const row = await api<Revision<Person>>('/records/' + encodeURIComponent(requested)); if (row.data.kind !== 'person') throw Error('此連結不是人物案卷。'); await loadPerson({id: row.id, version: row.number, data: row.data}); if (p.get('event') && state.graph?.events.some(e => e.id === p.get('event'))) state.selectedEvent = p.get('event')!; if (['events','tenures','sources','history'].includes(p.get('tab') || '')) state.tab = p.get('tab')!; syncUrl();}} catch (e) {report(e);}
  });
  return {...window.Vue.toRefs(state), dirty, title, currentEvent, currentTenure, currentClaims, visibleEvents, compareSources, contextEvidence, needsReview, conflictRows, assessmentNames, eventNames, presenceNames,
    returnToReader, returnFromCompare, readEvidence, focusSave, setTheme, search, clearSearch, loadPerson, selectEvent, selectTenure, backToList, addEvent, addDate, dateChanged, claimSources, evidenceKeys, selectEvidence, compareClaim, sourceKey, claimText, eventDates,
    save, checkDraft, useRemoteItem, acceptConflictBase, loadHistory: (reset = true) => run(() => loadHistory(reset)), showRevision, restoreRevision, queryYear, exportFile, chooseMaterial, importMaterial, applyAdvanced, discardAdvanced, syncUrl,
    openFilePicker: () => document.getElementById('research-file-input')?.click(),
    format: (value: unknown) => JSON.stringify(value, null, 2), unknownTime};
}}).use(window.ElementPlus, {locale}).mount('#research');
