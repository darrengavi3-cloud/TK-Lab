import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
execFileSync(process.execPath, ['--test', fileURLToPath(new URL('../../tests/reader-semantics.test.mjs', import.meta.url))], { stdio: 'inherit' });
