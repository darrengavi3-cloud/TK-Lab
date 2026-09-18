import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

/** Uses the project's installed TypeScript. DB/R2 are doubles, not deployment evidence. */
export async function loadResearchForTests() {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'prosopography-'));
  // Discover the maintained core so a newly imported module cannot disappear in tests.
  const core = (await fs.readdir('domain/prosopography')).filter(name => name.endsWith('.ts')).sort().map(name => 'domain/prosopography/' + name);
  const files = ['domain/catalogue.ts', 'domain/revisions.ts', ...core, 'server/research-preview.ts', 'server/storage.ts', 'server/authorization.ts', 'server/admin-router.ts'];
  for (const file of files) {
    const source = await fs.readFile(file, 'utf8');
    let output = ts.transpileModule(source, {fileName: file, compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText;
    if (file === 'server/admin-router.ts') {
      output = output.replace(/(['"])(\.\/(?:backup-service|bootstrap-service|catalogue-service|import-service|publication-service|reader-links))\1/g, "'./research-test-dependencies.mjs'");
      output = output.replace(/(['"])(?:\.\.\/admin\/(?:index|research)\.html|\.\/generated\/reader\.html)\?raw\1/g, "'./research-test-html.mjs'");
    }
    output = output.replace(/(from\s+|import\s*)(['"])(\.{1,2}\/[^'"]+)\2/g, (match, prefix, quote, specifier) => prefix + quote + (specifier.endsWith('.mjs') ? specifier : specifier + '.mjs') + quote);
    const target = path.join(temp, file.replace(/\.ts$/, '.mjs'));
    await fs.mkdir(path.dirname(target), {recursive: true});
    await fs.writeFile(target, output);
  }
  await fs.writeFile(path.join(temp, 'server/research-test-html.mjs'), 'export default "<html><head></head><body>fixture</body></html>";');
  await fs.writeFile(path.join(temp, 'server/research-test-dependencies.mjs'), `
import {DomainError} from '../domain/catalogue.mjs';
import {HttpError} from './storage.mjs';
export const watermark = db => db.repo.watermark();
export const snapshot = (db, seq) => db.repo.snapshot(seq);
export const getRevision = (db, id, version) => db.repo.getRevision(id, version);
export const domainErrorStatus = e => e instanceof DomainError ? 422 : e instanceof HttpError ? e.status : 503;
const unused = () => { throw new Error('Unexpected unrelated route or write'); };
export const backup=unused, bootstrap=unused, upload=unused, inspectFile=unused, createImport=unused, importDetail=unused, stageImport=unused, commitImport=unused, makePublication=unused, publishData=unused, readerLinkOptions=unused, listRecords=unused, history=unused, saveRecord=unused;
`);
  const modules = {};
  for (const name of ['time', 'validate', 'presence', 'legacy', 'types']) Object.assign(modules, await import(pathToFileURL(path.join(temp, 'domain/prosopography/' + name + '.mjs'))));
  Object.assign(modules, await import(pathToFileURL(path.join(temp, 'domain/revisions.mjs'))));
  Object.assign(modules, await import(pathToFileURL(path.join(temp, 'server/research-preview.mjs'))));
  Object.assign(modules, await import(pathToFileURL(path.join(temp, 'server/admin-router.mjs'))));
  return {modules, cleanup: () => fs.rm(temp, {recursive: true, force: true})};
}
