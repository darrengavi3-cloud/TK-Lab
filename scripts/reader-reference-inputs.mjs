import fs from 'node:fs';
import vm from 'node:vm';

/** Read existing atlas definitions without starting Vue or changing the source. */
export function readOfficeNodes() {
  const html = fs.readFileSync('atlas/index.html', 'utf8');
  const start = html.indexOf('const FACTIONS = [');
  const end = html.indexOf('/* =========================================================================\n   Vue App', start);
  if (start < 0 || end <= start) throw new Error('Missing canonical atlas definitions');
  const context = {console, window: {HISTORY_MAP_REGISTRY: JSON.parse(fs.readFileSync('atlas/data/map-period-registry.json', 'utf8'))}, document: {getElementById: () => ({innerHTML: ''})}};
  context.window.window = context.window;
  vm.createContext(context);
  for (const name of ['research-model.js', 'person-name-normalization.js', 'wu-fangzhen-records.js', 'shu-fangzhen-records.js', 'fangzhen-term-supplement.js', 'v62-jin-fangzhen.js']) {
    vm.runInContext(fs.readFileSync('atlas/data/' + name, 'utf8'), context, {timeout: 20000});
  }
  vm.runInContext(html.slice(start, end) + '\nglobalThis.referenceTrees=buildPresets();', context, {timeout: 20000});
  return JSON.parse(JSON.stringify(context.referenceTrees));
}
