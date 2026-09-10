import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../atlas/index.html', import.meta.url), 'utf8');
const extract = (start, end) => html.slice(html.indexOf(start), html.indexOf(end));
function harness() {
  const ticks = [], timers = [], selected = [];
  const mapWindow = { HistoryMapTimeline: { select: index => selected.push(index) } };
  const context = {
    historyMapPeriods: Array.from({ length: 16 }, (_, index) => ({ year: 184 + index })),
    historyMapIndex: { value: 0 }, historyMapReady: { value: false },
    pendingHistoryMapIndex: null, mapLinkSelection: { value: null },
    document: { getElementById: () => ({ contentWindow: mapWindow }) },
    nextTick: callback => ticks.push(callback), setTimeout: callback => timers.push(callback),
  };
  vm.runInNewContext(
    extract('    function selectHistoryPeriod(', '    function stepHistoryPeriod(') +
    extract('    function onHistoryMapLoaded(', '    function historyStatusClass(') +
    extract('    function onHistoryMapMessage(', '    function postMapFocus(') +
    ';this.select=selectHistoryPeriod;this.loaded=onHistoryMapLoaded;this.receive=onHistoryMapMessage;', context);
  const receive = index => context.receive({ source: mapWindow, data: { type: 'sgz-map-period', index } });
  return { context, receive, ticks, timers, selected };
}

test('cold map initialization cannot replace the requested battle period', () => {
  const { context, receive, ticks, timers, selected } = harness();
  context.select(5, false);
  receive(0); // iframe initialization announces its default before load.
  assert.equal(context.historyMapIndex.value, 5);
  context.loaded();
  receive(0); // A queued default message can also arrive after load.
  timers.shift()();
  while (ticks.length) ticks.shift()();
  assert.ok(selected.length > 0);
  assert.ok(selected.every(index => index === 5));
  receive(5);
  assert.equal(context.pendingHistoryMapIndex, null);
  receive(6);
  assert.equal(context.historyMapIndex.value, 6, 'normal child timeline navigation remains supported');
});

test('map period messages reject foreign frames and invalid indices', () => {
  const { context, receive } = harness();
  context.historyMapIndex.value = 5;
  context.receive({ source: {}, data: { type: 'sgz-map-period', index: 0 } });
  for (const value of [-1, 16, 2.5, null, '', '2', NaN]) receive(value);
  assert.equal(context.historyMapIndex.value, 5);
});
