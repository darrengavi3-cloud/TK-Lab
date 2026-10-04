import {validRouteHash} from './route-contract.js';

export const READING_HISTORY_KEY = 'guanshitai:recent-reading';
export function readingHistorySnapshot() {
  try { return localStorage.getItem(READING_HISTORY_KEY) || '[]'; } catch { return '[]'; }
}
export function parseReadingHistory(raw) {
  try {
    const rows = JSON.parse(raw);
    return Array.isArray(rows) ? rows.filter(row => row && validRouteHash(row.hash)
      && typeof row.title === 'string' && Number.isFinite(row.scroll)
      && row.scroll >= 0 && row.scroll <= 500000).slice(0, 5) : [];
  } catch { return []; }
}
export function rememberReading(entry) {
  if (!entry || !validRouteHash(entry.hash)) return;
  try {
    const row = {hash: entry.hash, title: String(entry.title || '继续阅读').slice(0, 120),
      scroll: Math.min(500000, Math.max(0, Number(entry.scroll) || 0)),
      drawerScroll: Math.min(500000, Math.max(0, Number(entry.drawerScroll) || 0)), at: Date.now()};
    localStorage.setItem(READING_HISTORY_KEY, JSON.stringify([row, ...parseReadingHistory(readingHistorySnapshot()).filter(old => old.hash !== row.hash)].slice(0, 5)));
    window.dispatchEvent(new Event('guanshitai:reading-history'));
  } catch { /* Device history is optional and never blocks reading. */ }
}
export function clearReadingHistory() {
  try { localStorage.removeItem(READING_HISTORY_KEY); } catch { /* optional */ }
  window.dispatchEvent(new Event('guanshitai:reading-history'));
}
export function safeReadingReturn(input, origin) {
  try {
    const url = new URL(input || '/', origin);
    if (url.origin !== origin || url.pathname !== '/' || url.username || url.password || (url.hash && !validRouteHash(url.hash))) return '/';
    if (url.hash) url.searchParams.set('resume', '1');
    return url.pathname + url.search + url.hash;
  } catch { return '/'; }
}
