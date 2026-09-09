/* 史源表引文解析的行为门禁。
 *
 * 归卷是纯机械变换，但错误归卷会把一条结论挂到它并不出自的那一卷上——
 * 这比不归卷更糟。以下用例锁住三件事：中文数字卷次、卷次之后的《…》是篇名
 * 而非书名、以及「未写明卷次」必须落入未归卷而不是被猜出来。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scope = {};
new Function('global', 'window', fs.readFileSync(path.join(root, 'atlas/assets/app/shiyuan.js'), 'utf8'))(scope, scope);
const shiyuan = scope.SGZ_UI_MODULES.shiyuan;

test('中文数字卷次', () => {
  for (const [text, expected] of [['一', 1], ['十', 10], ['十六', 16], ['二十一', 21], ['四十六', 46], ['九十九', 99], ['一百二十', 120], ['一百三十', 130], ['6', 6]]) {
    assert.equal(shiyuan.chineseNumeral(text), expected, `卷${text}`);
  }
  for (const text of ['', '甲', '卷', '零']) assert.equal(shiyuan.chineseNumeral(text), null, `不应解析：${text}`);
});

test('一串多卷，后段沿用前段书名', () => {
  const parsed = shiyuan.parseCitation('《三国志》卷四十三·王平传；卷四十四·费祎传');
  assert.deepEqual(parsed.hits.map(hit => hit.volumeId), ['三国志#43', '三国志#44']);
  assert.equal(parsed.unparsed.length, 0);
});

test('卷次之后的《…》是篇名，不得当作书名', () => {
  const parsed = shiyuan.parseCitation('《三国志》卷十《荀彧传》注引《曹瞒传》；卷一《武帝纪》');
  assert.deepEqual(parsed.hits.map(hit => hit.work), ['三国志', '三国志']);
  assert.deepEqual(parsed.hits.map(hit => hit.volume), [10, 1]);
});

test('简繁书名归并为同一部书', () => {
  assert.equal(shiyuan.parseCitation('《三國志》卷06·正文').hits[0].volumeId, '三国志#6');
  assert.equal(shiyuan.parseCitation('《三国志》卷6·正文').hits[0].volumeId, '三国志#6');
  assert.equal(shiyuan.parseCitation('《後漢書》卷八').hits[0].work, '后汉书');
});

test('书名内嵌的裴注引书按字面拆开', () => {
  const [hit] = shiyuan.parseCitation('《三國志 裴注引英雄記》卷06 袁紹傳').hits;
  assert.equal(hit.work, '三国志');
  assert.equal(hit.volume, 6);
  assert.equal(hit.citedWork, '英雄記');
  assert.equal(hit.evidenceLayer, '裴注');
});

test('未写明卷次者不得被猜出卷次', () => {
  for (const text of ['《魏志·张绣传》', '《蜀志·诸葛亮传》注引郭冲五事', '《通典·食货典》总数的后世推算']) {
    const parsed = shiyuan.parseCitation(text);
    assert.equal(parsed.hits.length, 0, `不应归卷：${text}`);
    assert.ok(parsed.unparsed.length > 0, `应保留原串：${text}`);
  }
});

test('倒排结果闭合：条目数等于各卷条目数之和', () => {
  const built = shiyuan.buildSourceVolumes([
    { kind: 'battle', id: 'b1', title: '甲', citations: ['《三国志》卷一·武帝纪；卷十六·任峻传'] },
    { kind: 'shihuo', id: 's1', title: '乙', citations: ['《魏志·张绣传》'] },
    { kind: 'appointment', id: 'a1', title: '丙', citations: [] }
  ]);
  assert.equal(built.summary.entries, built.volumes.reduce((total, volume) => total + volume.entryCount, 0));
  assert.equal(built.summary.volumes, 2);
  assert.equal(built.summary.unattributed, 2);
  assert.equal(built.works[0].work, '三国志');
});
