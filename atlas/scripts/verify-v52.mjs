import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(`V52 校验失败：${message}`); };
function load(file, name) {
  const context = { window: {} };
  vm.runInNewContext(read(file), context, { filename: file });
  return context.window[name];
}

const source = load('data/person-source-index.js', 'SGZ_PERSON_SOURCE_INDEX');
const manifest = json('data/portrait-manifest.json');
const portraitAudit = json('data/portrait-retirement-audit.json');
const portraitPool = json('data/portrait-unassigned-pool.json');
const titles = load('data/general-titles.js', 'SGZ_GENERAL_TITLES');
const html = read('index.html');
const portable = fs.existsSync(path.join(root, 'exports', '三国职官谱-单文件版.html')) ? read('exports/三国职官谱-单文件版.html') : '';

const retiredNames = ['安定','安豐','安南','安平','安遠','巴东','巴西','东大','东莞','东羌','东属国','东阳','和世','扶風','乐安','平寇','平南','平虜','平魏','平原','平子雖','曲梁','平戎','时擢','史大夫','通振威','文观','文学','聞弟','烏丸','武都','武平','相大','吴曆','谢服','宣信','严裨','燕平難','阳安','阳平','有军功','章陵','章西安','左大','左度辽','伯父鼎','匡师友','鲁镇南','时孚','时蒋济','虞子和','卓弟旻'];
const corrected = ['士匡','张鲁','司马孚','蒋济','刘和','董旻'];
const defaultPeople = source.people.filter(item => item.includeInDefault === true && item.visibilityStatus === 'visible');
const defaultNames = new Set(defaultPeople.flatMap(item => [item.name, ...(item.aliases || [])]));
assert(new Set(defaultPeople.map(item => item.personId)).size === defaultPeople.length, '默认人物 personId 重复');
assert(new Set(defaultPeople.map(item => item.name)).size === defaultPeople.length, '默认人物规范姓名重复');
assert(retiredNames.every(name => !defaultNames.has(name)), '误识别姓名仍进入默认人物或别名');
assert(corrected.every(name => source.people.filter(item => item.name === name).length === 1), '纠正人物未形成唯一规范实体');
assert(!source.people.find(item => item.name === '曹鼎') || source.people.find(item => item.name === '曹鼎')?.includeInDefault === false, '曹鼎未排除默认范围');
assert(source.people.find(item => item.name === '刘和')?.includeInDefault === false, '刘和的范围状态不应被自动扩大');
assert(defaultPeople.some(item => item.name === '士匡' && item.personId === 'person:wu:shi-kuang'), '士匡稳定身份未接入');
assert(defaultPeople.some(item => item.name === '张鲁' && item.personId === 'person:han:zhang-lu'), '张鲁稳定身份未接入');
assert(defaultPeople.some(item => item.name === '董旻' && item.personId === 'person:han:dong-min'), '董旻稳定身份未接入');
assert(!html.includes('南匈奴呼厨泉') && html.includes("figures:['呼厨泉']"), '呼厨泉人物标签仍混入族属前缀');

const retiredManifestNames = retiredNames.filter(name => manifest.byName?.[name] || Object.values(manifest.byPersonId || {}).some(item => item.name === name || (item.aliases || []).includes(name)));
assert(retiredManifestNames.length === 0, `误识别人物仍有立绘索引：${retiredManifestNames.join('、')}`);
assert(portraitAudit.summary.retiredAssets === portraitPool.assets.length && portraitPool.assets.length > 0, '误识别立绘未进入未分配资源池');
assert(portraitPool.assets.every(item => item.src && fs.existsSync(path.join(root, item.src.replace(/^\.\//, '')))), '未分配资源池存在缺失文件');
assert(Object.values(manifest.byPersonId || {}).every(item => item.interfaceOnly === true), '运行时立绘存在未声明 interfaceOnly 的记录');

for (const group of titles.groups) {
  assert(group.titles.every(item => item.serviceDomain === '武官' && item.institutionType === '朝廷机关'), `${group.label}存在未标为武官的名号`);
  assert(group.titles.every(item => Number.isFinite(Number(item.sortOrder)) && item.rankGroup), `${group.label}名号缺少等级排序字段`);
  assert(new Set(group.titles.map(item => item.title)).size === group.titles.length, `${group.label}存在重复名号`);
}
assert(['曹魏','季汉','孙吴'].every(label => titles.groups.find(group => group.label.includes(label))?.titles.length >= 60), '三国武官名号扩充不足');
assert(html.includes('generalTitleSortOrder') && html.includes("category:'将军武职'") && html.includes('SGZ_GENERAL_TITLES'), '武官名号未接入朝堂树');
assert(portable.includes('generalTitleSortOrder') && portable.includes('SGZ_PERSON_PORTRAIT_MANIFEST'), '便携版未同步 V52 名号与人物索引');

console.log(JSON.stringify({
  version: 'V52',
  people: { default: defaultPeople.length, total: source.people.length, appointments: source.appointments.length, corrected },
  excluded: { requested: retiredNames.length, portraitAssets: portraitAudit.summary.retiredAssets },
  generalTitles: Object.fromEntries(titles.groups.map(group => [group.polity, group.titles.length])),
  checks: 'passed',
}, null, 2));
