import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = { console };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'data/v58-portrait-board.js'), 'utf8'), context, { filename: 'data/v58-portrait-board.js' });
const board = context.SGZ_V58_PORTRAIT_BOARD;
const handoff = {
  schemaVersion: 'V60',
  modelId: 'sgz-v60-figma-handoff',
  status: 'pending',
  fileKey: board.fileKey,
  fileName: '观史台 · V48 人物立绘与 UI',
  reason: 'Figma 当前为 Starter 计划且编辑席位／MCP 写入配额未解除；本地映射保留 pending，不伪造节点 ID。',
  requestedPages: [
    { name: 'V58 / Foundations', status: 'pending' },
    { name: 'V58 / Shell', status: 'pending' },
    { name: 'V58 / Modules', status: 'pending' },
    { name: 'V58 / Portraits', status: 'pending' },
    { name: 'V60 / Reader Clean State', status: 'pending' },
    { name: 'V60 / Research Workflow', status: 'pending' }
  ],
  portraits: board.records.map(record => ({
    order: record.order,
    name: record.name,
    personId: record.personId,
    polity: record.polity,
    role: record.role,
    src: record.src,
    purpose: '人物记界面识别立绘',
    interfaceOnly: true,
    status: record.status,
    designStatus: 'figma-design',
    designRef: {...record.designRef, nodeId: null, status: 'pending'}
  }))
};
fs.writeFileSync(path.join(root, 'data/v60-figma-handoff.json'), `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, status: handoff.status, portraits: handoff.portraits.length, pages: handoff.requestedPages.length }, null, 2));
