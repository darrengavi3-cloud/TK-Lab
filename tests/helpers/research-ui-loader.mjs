import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

/** Uses the already locked TypeScript dependency; no network or added packages.
 * Overrides are explicit test doubles, never production implementations.
 */
export async function loadResearchModules(entries, overrides = {}) {
  const root = process.cwd(), temp = await fs.mkdtemp(path.join(os.tmpdir(), 'research-test-'));
  const done = new Set();
  const emit = async relative => {
    if (done.has(relative)) return;
    done.add(relative);
    const target = path.join(temp, relative + '.mjs');
    let content;
    if (Object.hasOwn(overrides, relative)) content = overrides[relative];
    else if (relative.endsWith('?raw')) content = 'export default ' + JSON.stringify(await fs.readFile(path.join(root, relative.slice(0, -4)), 'utf8'));
    else content = ts.transpileModule(await fs.readFile(path.join(root, relative), 'utf8'), {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText;
    const dependencies = [];
    content = content.replace(/(\bfrom\s*['"]|\bimport\s*['"])(\.[^'"]+)(['"])/g, (_, before, specifier, after) => {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), specifier));
      const dependency = resolved.endsWith('?raw') || /\.(ts|mjs|js)$/.test(resolved) ? resolved : resolved + '.ts';
      dependencies.push(dependency);
      let local = path.posix.relative(path.posix.dirname(relative), dependency + '.mjs');
      if (!local.startsWith('.')) local = './' + local;
      // Encode ? in raw-file mock modules so Node does not parse it as a query.
      return before + local.replaceAll('?', '%3F') + after;
    });
    await fs.mkdir(path.dirname(target), {recursive: true});
    await fs.writeFile(target, content);
    for (const dependency of dependencies) await emit(dependency);
  };
  try {
    for (const entry of entries) await emit(entry);
    return {modules: await Promise.all(entries.map(entry => import(pathToFileURL(path.join(temp, entry + '.mjs')).href))), cleanup: () => fs.rm(temp, {recursive: true, force: true})};
  } catch (error) {await fs.rm(temp, {recursive: true, force: true}); throw error;}
}
