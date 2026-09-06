#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const readJson = name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
const reader = readJson('v63-reader-people.json');
const manifest = readJson('portrait-manifest.json');
const figmaMapping = fs.existsSync(path.join(dataDir, 'v73-figma-mapping.json'))
  ? readJson('v73-figma-mapping.json')
  : { records: [] };
const figmaByOrder = new Map((figmaMapping.records || []).map(row => [row.order, row]));
const people = reader.people || [];
const byName = new Map(people.map(row => [row.name, row]));
const existingPortraitPeople = new Set(Object.values(manifest.assetsById || {})
  .filter(row => row.status === 'ready')
  .map(row => row.personId));

const chancelleryRoles = new Map(Object.entries({
  '李严': '中都护', '尹默': '军师祭酒', '王连': '长史', '向朗': '长史', '张裔': '长史',
  '李邈': '参军', '姚伷': '参军', '胡济': '参军／主簿', '李邵': '西曹掾', '李朝': '西曹掾',
  '马齐': '从事中郎', '董恢': '属', '杨颙': '东曹属／主簿', '赖厷': '令史', '霍弋': '记室'
}));

const selectedNames = `李严 尹默 王连 向朗 张裔 李邈 姚伷 胡济 李邵 李朝 马齐 董恢 杨颙 赖厷 霍弋 赵云 刘巴 董和 简雍 孙乾 麋竺 伊籍 庞羲 刘封 关平 关兴 霍峻 吴懿 吴班 冯习 傅肜 辅匡 刘琰 廖立 李恢 费诗 孟达 彭羕 许慈 孟光 杜琼 周群 张裕 李譔 杜微 李福 吕乂 杨洪 何祗 张嶷 句扶 龚禄 庞统 糜芳 马超 马岱 孟获 甘夫人 敬哀皇后 张皇后 黄皓 陈寿 诸葛乔 蒋斌 蒋显 黄崇 李球 张绍 樊建 董扶 何宗 来忠 费承 费恭 费缉 常勖 常忌 陈裕 爨熊 邓良 董宏 杜烈 杜轸 范贤 霍在 李密 何攀 李毅 李特 李庠 文立 关彝 诸葛显 赵广 郄正 马承 王崇 寿良 谯贤 糜威`.split(' ');

if (selectedNames.length !== 100 || new Set(selectedNames).size !== 100) {
  throw new Error(`V73 立绘候选必须恰为 100 个唯一姓名，当前 ${selectedNames.length}/${new Set(selectedNames).size}`);
}

const records = selectedNames.map((name, index) => {
  const person = byName.get(name);
  if (!person) throw new Error(`V73 候选不在读者人物表：${name}`);
  if (!/^person:(?!unresolved:)/.test(person.personId || '')) throw new Error(`V73 候选 personId 不稳定：${name}`);
  if (existingPortraitPeople.has(person.personId)) throw new Error(`V73 候选已有正式立绘：${name}`);
  const order = index + 1;
  const figmaRow = figmaByOrder.get(order);
  const figmaReady = figmaRow?.name === name && /^\d+:\d+$/.test(String(figmaRow?.nodeId || ''));
  return {
    order,
    personId: person.personId,
    name,
    dynasty: '季汉',
    dynastyTags: person.dynastyTags || ['季汉'],
    priorityGroup: chancelleryRoles.has(name) ? '诸葛亮府署' : '季汉人物',
    role: chancelleryRoles.get(name) || '人物记补绘',
    assetPath: `./assets/portraits/v73/shu/${String(order).padStart(3, '0')}.png`,
    interfaceOnly: true,
    designStatus: figmaReady ? 'figma-design' : 'pending-figma-upload',
    designRef: {
      fileKey: 'gvWRC5GHHSgd8QX9b2VJgo',
      version: 'V73',
      pageName: 'V73 / Portraits',
      nodeId: figmaReady ? figmaRow.nodeId : null,
      componentId: null
    }
  };
});

const payload = {
  schemaVersion: 'V73',
  modelId: 'sgz-v73-portrait-candidates',
  scope: '人物记新增 100 项界面识别立绘；优先诸葛亮丞相府属，不代表史实肖像。',
  selection: {
    count: records.length,
    chancelleryPriority: records.filter(row => row.priorityGroup === '诸葛亮府署').length,
    rule: '读者可见、稳定 personId、无同名冲突、当前无正式立绘；前 15 项为诸葛亮府署优先。'
  },
  records
};

fs.writeFileSync(path.join(dataDir, 'v73-portrait-candidates.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, records: records.length, chancelleryPriority: payload.selection.chancelleryPriority }, null, 2));
