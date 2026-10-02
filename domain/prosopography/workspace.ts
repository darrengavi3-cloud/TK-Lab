import {canonicalJson, type Revision} from '../revisions';
import {validateRecord, type Source} from '../catalogue';
import {unknownTime, validateTime, requireResearch as ok, type HistoricalTime} from './time';
import {validateResearchGraph, type ResearchWarning} from './validate';
import {CAREER_EVENT_TYPES, type CareerEvent, type ResearchGraph, type RevisionPin} from './types';

export interface MaterialEvent {
  key: string;
  original: string;
  type: CareerEvent['type'];
  dates: {key: string; time: HistoricalTime; derivation: 'direct' | 'inferred'; rationale: string; sourceIds: string[]}[];
  conflictNote: string;
}
/** Transfer format only. Materials become ordinary private catalogue Sources;
 * events and claims use the existing ResearchGraph, never a second data model. */
export interface ResearchMaterialPack {
  format: 'guanshitai-research-materials-1';
  title: string;
  subjectName: string;
  inputSha256: string;
  sources: Source[];
  events: MaterialEvent[];
}
export interface SourceView {pin: RevisionPin; data: Source}
export interface Inspection {
  readOnly: true; persisted: false; watermark: number; graphDigest: string;
  warnings: ResearchWarning[]; sourceRevisions: SourceView[];
  presence: {graphDigest: string; year: number; results: {tenureId: string; status: string; reason: string}[]} | null;
}
const keyPattern = /^[a-zA-Z0-9][a-zA-Z0-9:_.-]{0,100}$/;
export function normalizeMaterialSource(source: Source): Source {
  return {...source, assessment: 'pending', workflow: 'review', visibility: 'private', disposition: 'none', reason: '匯入候選，等待核對'};
}
export function validateMaterialPack(value: unknown): ResearchMaterialPack {
  ok(value && typeof value === 'object' && !Array.isArray(value), 'material', '請選擇研究材料包。');
  const p = value as ResearchMaterialPack;
  ok(p.format === 'guanshitai-research-materials-1' && typeof p.title === 'string' && p.title.trim() && typeof p.subjectName === 'string' && p.subjectName.trim() && /^[a-f0-9]{64}$/.test(p.inputSha256), 'material', '材料包題名、人物或原檔摘要無效。');
  ok(Array.isArray(p.sources) && p.sources.length > 0 && p.sources.length <= 150 && Array.isArray(p.events) && p.events.length <= 150, 'material', '每份材料包最多 150 份引文與 150 個事件。');
  const sourceIds = new Set<string>(), eventIds = new Set<string>();
  for (const source of p.sources) {
    validateRecord(source);
    ok(source.kind === 'source' && source.id.startsWith('source:materials:' + p.inputSha256 + ':') && !sourceIds.has(source.id) && source.evidence.length === 0, 'material', '材料來源必須使用獨立、無重複的固定原檔識別碼。');
    sourceIds.add(source.id);
  }
  for (const event of p.events) {
    ok(event && keyPattern.test(event.key) && !eventIds.has(event.key) && typeof event.original === 'string' && event.original.trim() && CAREER_EVENT_TYPES.includes(event.type) && typeof event.conflictNote === 'string', 'material', '材料事件的識別碼、原文或性質無效。');
    eventIds.add(event.key);
    ok(Array.isArray(event.dates) && event.dates.length > 0 && event.dates.length <= 10, 'material', '每個事件需有一至十條紀年記載；未知年代保留原文。');
    const keys = new Set<string>();
    for (const date of event.dates) {
      ok(date && keyPattern.test(date.key) && !keys.has(date.key) && ['direct', 'inferred'].includes(date.derivation) && typeof date.rationale === 'string', 'material', '紀年說法格式無效。');
      keys.add(date.key); validateTime(date.time);
      ok(Array.isArray(date.sourceIds) && date.sourceIds.length > 0 && new Set(date.sourceIds).size === date.sourceIds.length && date.sourceIds.every(id => sourceIds.has(id)), 'material', '每項說法必須明確引用本包中的材料。');
    }
  }
  return JSON.parse(canonicalJson(p)) as ResearchMaterialPack;
}
export function appendMaterials(input: ResearchGraph, pack: ResearchMaterialPack, rows: Revision<Source>[]): ResearchGraph {
  validateMaterialPack(pack);
  const graph = JSON.parse(canonicalJson(input)) as ResearchGraph;
  const pins = new Map<string, RevisionPin>();
  for (const source of pack.sources) {
    const row = rows.find(r => r.id === source.id);
    ok(row && canonicalJson(row.data) === canonicalJson(normalizeMaterialSource(source)), 'material-source', '同名材料已有其他修訂，請先比較，不能覆蓋或冒用新版。');
    pins.set(source.id, {id: row.id, revision: row.number, digest: row.digest});
  }
  for (const entry of pack.events) {
    const id = 'event:materials:' + pack.inputSha256 + ':' + entry.key;
    const event: CareerEvent = {id, personId: graph.personId, type: entry.type, original: entry.original, tenureIds: [], dateClaimId: null, afterEventIds: []};
    const existing = graph.events.find(e => e.id === id);
    ok(!existing, 'material-duplicate', '此案卷已包含材料事件 ' + entry.key + '，請查看既有記錄，避免重複匯入。');
    graph.events.push(event);
    const claimIds: string[] = [];
    for (const date of entry.dates) {
      const claimId = id + '/date:' + date.key; claimIds.push(claimId);
      graph.claims.push({id: claimId, subject: {kind: 'event', id}, content: {type: 'event-date', value: date.time}, derivation: date.derivation, assessment: 'pending', rationale: date.rationale});
      date.sourceIds.forEach((sourceId, index) => graph.evidence.push({id: claimId + '/evidence:' + index, claimId, source: pins.get(sourceId)!, role: 'support', note: '研究材料轉入，尚未重新核定原典與史實。'}));
    }
    if (entry.conflictNote && claimIds.length > 1) graph.factualConflicts.push({id: id + '/conflict', claimIds, note: entry.conflictNote});
  }
  validateResearchGraph(graph);
  return graph;
}
export const assessmentNames: Record<string, string> = {pending: '待核', verified: '已核', disputed: '存疑', excluded: '排除'};
export const eventNames: Record<string, string> = {appointment: '授官', assumption: '就職', transfer: '遷轉', removal: '免官', restoration: '復任', decline: '辭受', retirement: '退處', death: '去世', capture: '被俘', surrender: '投降', other: '其他行事'};
export function claimText(graph: ResearchGraph, id: string): string {
  const claim = graph.claims.find(c => c.id === id); if (!claim) return '';
  const content = claim.content;
  if (content.type === 'legacy-record') return content.value.date.original || '年代未詳';
  if (typeof content.value === 'string') return ({held: '實任', 'not-held': '未實任', posthumous: '追贈', unknown: '不詳', continuous: '有連續任期依據'} as Record<string, string>)[content.value] || content.value;
  return content.value.original || '年代未詳';
}
export function eventDates(graph: ResearchGraph, id: string): string {
  return graph.claims.filter(c => c.subject.kind === 'event' && c.subject.id === id).map(c => claimText(graph, c.id)).join(' ／ ') || '年代未詳';
}
export function emptyEvent(personId: string): CareerEvent {
  return {id: 'event:' + crypto.randomUUID(), personId, type: 'other', original: '', tenureIds: [], dateClaimId: null, afterEventIds: []};
}
export function emptyEventDate(id: string) {
  return {id: 'claim:' + crypto.randomUUID(), subject: {kind: 'event' as const, id}, content: {type: 'event-date' as const, value: unknownTime()}, derivation: 'direct' as const, assessment: 'pending' as const, rationale: ''};
}
export function researchCsv(graph: ResearchGraph, sources: SourceView[]): string {
  const rows: unknown[][] = [['類別', '記錄ID', '事項／原官名', '原紀年／說法', '史實狀態', '研究理由', '出處與固定修訂', '引文']];
  for (const claim of graph.claims) {
    const subject = claim.subject.kind === 'event' ? graph.events.find(e => e.id === claim.subject.id)?.original : graph.tenures.find(t => t.id === claim.subject.id)?.officeNameOriginal;
    const evidence = graph.evidence.filter(e => e.claimId === claim.id);
    const refs = evidence.map(e => ({link: e, source: sources.find(s => s.pin.id === e.source.id && s.pin.revision === e.source.revision)}));
    rows.push([claim.subject.kind === 'event' ? '事件記載' : '任職記載', claim.id, subject, claimText(graph, claim.id), assessmentNames[claim.assessment], claim.rationale,
      refs.map(({link, source}) => [source?.data.title, source?.data.edition, source?.data.locator, '修訂 ' + link.source.revision, link.source.digest, link.role, source?.data.url].filter(Boolean).join(' · ')).join('\n'),
      refs.map(({source}) => source?.data.text || '固定引文未載入').join('\n\n')]);
  }
  // Spreadsheet programs treat leading =,+,-,@ as formulas even inside CSV quotes.
  // The exact original strings remain available in JSON and printable HTML.
  const cell = (v: unknown) => {let text = String(v ?? ''); if (/^[\s]*[=+@-]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"', '""') + '"';};
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
export function researchDocument(title: string, graph: ResearchGraph, sources: SourceView[], revision: number, watermark: number, draft = false): string {
  const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]!));
  const sections = graph.events.map(event => '<article><h2>' + esc(event.original) + '</h2><p>' + esc(eventNames[event.type]) + ' · ' + esc(eventDates(graph, event.id)) + '</p>' +
    graph.claims.filter(c => c.subject.id === event.id).map(c => '<h3>' + esc(claimText(graph, c.id)) + ' · ' + esc(assessmentNames[c.assessment]) + '</h3><p>' + esc(c.rationale) + '</p>' + graph.evidence.filter(e => e.claimId === c.id).map(e => '<p>引用：' + esc(e.source.id) + '，修訂 ' + e.source.revision + '</p>').join('')).join('') + '</article>').join('');
  const tenures = graph.tenures.map(t => '<article><h2>' + esc(t.officeNameOriginal) + '</h2><p>' + esc([t.natureOriginal, t.polityOriginal, t.jurisdictionOriginal].filter(Boolean).join(' · ')) + '</p><p>' + esc(t.reason) + '</p>' + graph.claims.filter(c => c.subject.id === t.id).map(c => '<p>' + esc(claimText(graph, c.id)) + ' · ' + esc(assessmentNames[c.assessment]) + '</p><p>' + esc(c.rationale) + '</p>').join('') + '</article>').join('');
  const conflicts = graph.factualConflicts.map(c => '<article><h3>異說</h3><p>' + esc(c.note) + '</p><p>' + esc(c.claimIds.map(id => claimText(graph, id)).join(' ／ ')) + '</p></article>').join('');
  const variants = graph.textualVariants.map(v => '<article><h3>' + esc(v.locus) + '</h3><p>' + esc(v.note) + '</p>' + v.readings.map(r => '<p>' + esc(r.source.id) + '，修訂 ' + r.source.revision + '</p><pre>' + esc(r.text) + '</pre>').join('') + '</article>').join('');
  return '<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' + esc(title) + '</title><style>body{max-width:850px;margin:40px auto;padding:24px;font:17px/1.8 serif;color:#17252d}h1{font-size:30px}h2{font-size:21px}h3{font-size:18px}article{border-top:1px solid #ccc;margin-top:28px;padding-top:18px}pre,p{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}small{font:14px/1.6 sans-serif}@media print{body{margin:0;max-width:none}h2,h3{break-after:avoid}}</style><h1>' + esc(title) + '</h1><p>' + (draft ? '未保存草稿，基於研究修訂 ' : '研究修訂 ') + revision + ' · 資料快照 ' + watermark + ' · 未發布研究材料</p><p>事件紀年不是連續任期；不同說法分列。本文包含全部案卷記錄與固定版本引文。</p>' + tenures + sections + conflicts + variants + '<h2>固定版本引文</h2>' + sources.map(s => '<article><h3>' + esc(s.data.title) + '</h3><p>' + esc([s.data.edition, s.data.locator].filter(Boolean).join(' · ')) + '</p><small>' + esc(s.pin.id) + ' · 修訂 ' + s.pin.revision + ' · SHA-256 ' + esc(s.pin.digest) + '</small><pre>' + esc(s.data.text) + '</pre><p>' + esc(s.data.url) + '</p></article>').join('') + '</html>';
}
