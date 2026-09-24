import {loadResearchPreview} from '../domain/prosopography/loader';
import {getRevision, snapshot, watermark} from './catalogue-service';

/** Called only after the existing owner gate. No database or release writes. */
export function previewPersonResearch(db: D1Database, personId: string, params: URLSearchParams) {
  return loadResearchPreview({
    watermark: () => watermark(db),
    snapshot: seq => snapshot(db, seq),
    sourceRevision: (id, version) => getRevision(db, id, version),
  }, personId, params);
}
