import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source = await fs.readFile('domain/prosopography/origin.ts', 'utf8');
const output = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const {matchesLegacyOriginal} = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
const appointment = {officeName: '　領司隸校尉𬱟\n', nature: '未就', polity: '季漢', jurisdiction: '益州'};
const tenure = () => ({officeNameOriginal: appointment.officeName, natureOriginal: appointment.nature, polityOriginal: appointment.polity, jurisdictionOriginal: appointment.jurisdiction});

test('identical original fields match without changing inputs', () => {const t = Object.freeze(tenure()); assert.equal(matchesLegacyOriginal(t, Object.freeze({...appointment})), true);});
for (const field of ['officeNameOriginal', 'natureOriginal', 'polityOriginal', 'jurisdictionOriginal']) {
  test('rewritten ' + field + ' does not authenticate with the old pin', () => {const t = tenure(); t[field] += '改'; assert.equal(matchesLegacyOriginal(t, appointment), false);});
}
test('trimming whitespace is a change, not a harmless normalization', () => {const t = tenure(); t.officeNameOriginal = t.officeNameOriginal.trim(); assert.equal(matchesLegacyOriginal(t, appointment), false);});
test('Unicode normalization is not applied to original text', () => {const a = {...appointment, officeName: 'e\u0301'}; const t = {...tenure(), officeNameOriginal: '\u00e9'}; assert.equal(matchesLegacyOriginal(t, a), false);});
test('missing values are not treated as matching unknowns', () => assert.equal(matchesLegacyOriginal({}, {}), false));
test('numeric fields cannot impersonate original text', () => assert.equal(matchesLegacyOriginal({...tenure(), polityOriginal: 1}, {...appointment, polity: 1}), false));
test('empty original jurisdiction is preserved when both records have it', () => assert.equal(matchesLegacyOriginal({...tenure(), jurisdictionOriginal: ''}, {...appointment, jurisdiction: ''}), true));
test('null objects do not match', () => assert.equal(matchesLegacyOriginal(null, null), false));
test('inspect service invokes original-text guard after origin identity and before accepting graph', async () => {const code = await fs.readFile('server/research-preview.ts', 'utf8'); const call = code.indexOf('ok(matchesLegacyOriginal(tenure, origin.data)'); assert(call > code.indexOf("'origin-reference'")); assert(call < code.indexOf('await verifyResearchGraph(graph')); assert(code.includes("'origin-content'"));});
