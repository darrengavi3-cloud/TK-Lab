import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import vm from 'node:vm';

/** Compile the real dependency-free domain and read service, not a test rewrite. */
export async function loadProsopography() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'prosopography-'));
  try {
    const names = ['time', 'types', 'validate', 'presence', 'evidence', 'legacy'];
    const relative = [...names.map(n => `domain/prosopography/${n}.ts`), 'server/prosopography-preview.ts'];
    const program = ts.createProgram(relative.map(p => path.join(root, p)), {
      rootDir: root, outDir: output, target: ts.ScriptTarget.ES2017,
      module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10,
      strict: true, skipLibCheck: true, types: [], noEmitOnError: true,
      lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'],
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root, getCanonicalFileName: p => p, getNewLine: () => '\n',
    }));
    const emitted = program.emit();
    if (emitted.emitSkipped) throw new Error('TypeScript did not emit the research module.');
    await fs.writeFile(path.join(output, 'package.json'), '{"type":"commonjs"}');
    const require = createRequire(path.join(output, 'entry.cjs'));
    const api = Object.assign({}, ...relative.map(p => require(path.join(output, p.replace(/\.ts$/, '.js')))), require(path.join(output, 'domain/revisions.js')), require(path.join(output, 'domain/catalogue.js')));
    return {api, compilerVersion: ts.version, cleanup: () => fs.rm(output, {recursive: true, force: true})};
  } catch (error) {
    await fs.rm(output, {recursive: true, force: true});
    throw error;
  }
}

/** Real router and owner guards with read-store test doubles, not a live D1 test. */
export async function loadCatalogueRouter(api, readStore) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const files = ['storage', 'authorization', 'admin-router'];
  const outputs = new Map(await Promise.all(files.map(async name => [name, ts.transpileModule(
    await fs.readFile(path.join(root, `server/${name}.ts`), 'utf8'),
    {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}},
  ).outputText])));
  const cache = new Map();
  const context = vm.createContext({JSON, Error, Response, Request, URL, TextDecoder, Uint8Array, CompressionStream, console});
  const mocks = {
    '../domain/catalogue': api, '../domain/revisions': api, './prosopography-preview': api,
    './catalogue-service': {
      watermark: () => readStore.watermark(), snapshot: (_db, w) => readStore.snapshot(w),
      getRevision: (_db, id, version) => readStore.revision(id, version),
      domainErrorStatus: error => error instanceof api.DomainError ? 422 : error.status || 503,
    },
    './backup-service': {}, './bootstrap-service': {}, './import-service': {},
    './publication-service': {}, './reader-links': {},
    '../admin/index.html?raw': {default: '<html></html>'}, './generated/reader.html?raw': {default: '<html></html>'},
  };
  const load = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    const key = name.replace(/^\.\//, '');
    if (cache.has(key)) return cache.get(key);
    if (!outputs.has(key)) throw new Error(`Unexpected router dependency: ${name}`);
    const module = {exports: {}};
    vm.runInContext(`(function(require,module,exports){${outputs.get(key)}\n})`, context)(load, module, module.exports);
    cache.set(key, module.exports);
    return module.exports;
  };
  return load('./admin-router').catalogueRouter;
}
