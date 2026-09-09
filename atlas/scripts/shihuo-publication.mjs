import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function shihuoDigest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

// Editorial corrections are applied to the reader projection only. The original
// records and their disputed statements remain in the canonical research input.
export function projectShihuo(source, review) {
  if (shihuoDigest(source) !== review.sourceSha256) throw new Error('食货原始资料变更，请重新核对展示审定');
  const decisions = new Map(review.records.map(row => [row.id, row]));
  for (const row of review.records) {
    if (!source.records.some(record => record.id === row.id)) throw new Error('食货审定缺少源条目：'+row.id);
  }
  const project = (row, linkedId = row.id) => {
    const decision = decisions.get(linkedId);
    if (decision?.action === 'withdraw') return null;
    const linked = source.records.find(record => record.id === linkedId);
    const updated = { ...row, ...(decision?.display || {}) };
    updated.readerSummary = updated.detail || updated.note || '';
    updated.sourceTitle = row.sourceTitle || linked?.sourceTitle || row.evidence?.sourceTitle || '';
    updated.citations = decision?.citations || (row.sourceUrl ? [{title:updated.sourceTitle,url:row.sourceUrl,quote:'',note:''}] : []);
    updated.readingClass = decision?.readingClass || 'record';
    updated.discussion = decision?.discussion || '';
    return updated;
  };
  return {
    ...source,
    records: source.records.map(row => project(row)).filter(Boolean),
    events: source.events.map(row => project(row, row.recordId)).filter(Boolean),
    household: source.household.map(row => project(row, row.recordId)).filter(Boolean)
  };
}

export function loadShihuoPublication(root, source) {
  return projectShihuo(source, JSON.parse(fs.readFileSync(path.join(root, 'data/v83-shihuo-display-review.json'), 'utf8')));
}
