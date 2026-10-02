import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { ShihuoWorkbench } from '../../atlas/assets/app/ui/shihuo-ui.js';
import { FangzhenWorkbench } from '../../atlas/assets/app/ui/fangzhen-ui.js';

const root = path.resolve(import.meta.dirname, '../..');
const browser = await chromium.launch();
test.after(() => browser.close());
for (const [module, unit] of [['shihuo', ShihuoWorkbench], ['fangzhen', FangzhenWorkbench]]) {
  test(`${module}: shared pagination preserves main DOM, disabled boundaries and parent event forwarding`, async () => {
    const original = execFileSync('git', ['show', `1af7a8a:atlas/assets/app/ui/${module}-ui.js`], { cwd: root, encoding: 'utf8' });
    const before = original.match(/<nav class="v67-pagination"[\s\S]*?<\/nav>/)[0];
    const after = unit.template.match(/<sgz-pagination[\s\S]*?<\/sgz-pagination>/)[0];
    const page = await browser.newPage();
    try {
      await page.setContent('<div id="before"></div><div id="after"></div>');
      await page.addScriptTag({ path: path.join(root, 'atlas/assets/vendor/vue/vue.global.min.js') });
      await page.addScriptTag({ path: path.join(root, 'atlas/assets/app/reader-components.js') });
      for (const [current, pages, total] of [[1, 1, 0], [1, 3, 25], [2, 3, 25], [3, 3, 25]]) {
        const result = await page.evaluate(({ before, after, current, pages, total, stepMethod }) => {
          const traces = [[], []];
          const state = { shihuoPagination: { page: current, pages, total } };
          const data = () => ({ state, fangzhenPage: current, fangzhenPageCount: pages, fangzhenPagination: { total }, fangzhenVisibleRecords: [] });
          // Use the actual module forwarding method: it must keep its original parent event.
          const step = new Function(`return (${stepMethod.replace(/^stepPage\(/, 'function(')});`)();
          const apps = [before, after].map((template, i) => {
            const app = Vue.createApp({ data, template, methods: { stepPage(delta) { step.call({ $emit: (...args) => traces[i].push(args) }, delta); } } });
            Object.entries(window.SGZ_READER_COMPONENTS).forEach(([name, component]) => app.component(name, component));
            app.mount(i ? '#after' : '#before');
            return app;
          });
          const navs = ['before', 'after'].map(id => document.querySelector(`#${id} nav`));
          const dom = navs.map(nav => nav.outerHTML.replaceAll('v67-pagination', 'sgz-pagination').replace(/<!--[^]*?-->/g, ''));
          navs.forEach(nav => nav.querySelectorAll('button').forEach(button => button.click()));
          const disabled = navs.map(nav => [...nav.querySelectorAll('button')].map(button => button.disabled));
          apps.forEach(app => app.unmount());
          return { dom, traces, disabled };
        }, { before, after, current, pages, total, stepMethod: unit.methods.stepPage.toString().replace('SHIHUO_PAGE_DELTA_EVENT', JSON.stringify('page-delta')).replace('FANGZHEN_PAGE_STEP_EVENT', JSON.stringify('page-step')) });
        assert.equal(result.dom[0], result.dom[1]);
        assert.deepEqual(result.disabled[0], result.disabled[1]);
        assert.deepEqual(result.traces[0], result.traces[1]);
        assert.equal(result.traces[1].length, Number(current > 1) + Number(current < pages));
      }
    } finally { await page.close(); }
  });
}

