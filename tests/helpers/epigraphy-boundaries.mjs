import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { applyConsistencyReview } from '../../atlas/scripts/consistency-publication.mjs';

const read = path => JSON.parse(fs.readFileSync(new URL('../../' + path, import.meta.url)));
const frozen = read('tests/fixtures/v86-epigraphy-boundary.json');
assert.equal(createHash('sha256').update(JSON.stringify(frozen)).digest('hex'), '4cfd542e0508f3c3009aba7160717ce9cb5e6933979a28b07c2565a7d6e50e01', 'pre-review epigraphy fixture changed');
const decisions = read('atlas/data/v86-epigraphy-consistency-review.json').records;
const scope = {};
new Function('global', 'window', fs.readFileSync(new URL('../../atlas/data/epigraphic-v46-jin.js', import.meta.url), 'utf8'))(scope, scope);
const sources = Object.values(scope)[0].records;
assert.deepEqual(decisions.map(r => r.recordId).sort(), frozen.records.map(r => r.recordId).sort());

// Validate exactly the reviewed delta, then reconstruct the old projection so
// the existing historical hashes continue to guard every other inscription.
export function beforeV86Consistency(rows) {
  return rows.map(row => {
    const previous = frozen.records.find(r => r.recordId === row.id);
    if (!previous) return row;
    const baseline = { ...row, ...previous.previous };
    for (const key of previous.absent) delete baseline[key];
    const decision = decisions.find(r => r.recordId === row.id);
    const expected = applyConsistencyReview(sources.find(r => r.id === row.id), structuredClone(baseline), decision);
    assert.deepEqual(row, expected, `unreviewed projection change: ${row.id}`);
    return baseline;
  });
}
