import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const ledger = JSON.parse(fs.readFileSync(path.join(dataDir, 'v60-research-ledger.json'), 'utf8'));
fs.writeFileSync(
  path.join(dataDir, 'v60-research-ledger.js'),
  `window.SGZ_V60_RESEARCH_LEDGER=${JSON.stringify(ledger)};\n`,
  'utf8'
);
console.log(`已生成 V60 审校台账运行时脚本：${ledger.summary.epigraphicMissingInscription} 条缺释文、${ledger.summary.v59ReviewQueueClosed} 条 V59 队列、${ledger.summary.booksClosed} 卷复核记录`);
