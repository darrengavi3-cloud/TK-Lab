import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { readReleaseConfig } from './release-config.mjs';
import { RELEASE_VERSION } from '../assets/app/release-version.js';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptDir,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const coreSource=fs.readFileSync(path.join(root,'assets/app/persistence-core.js'),'utf8');
const wrapperSource=fs.readFileSync(path.join(root,'assets/app/persistence.js'),'utf8');
const pageSource=fs.readFileSync(path.resolve(root,'../app/page.tsx'),'utf8');

const coreMarker='<script src="./assets/app/persistence-core.js?v=66.2"></script>';
assert(html.includes(coreMarker),'规范入口缺少同步持久化核心');
assert(html.indexOf(coreMarker)<html.indexOf('const SGZ_UI_CORE_READY='),'持久化核心没有在异步界面启动前加载');
assert(html.includes("import('./assets/app/persistence.js?v=66.2')"),'持久化 ESM 兼容入口缺少缓存版本');
assert(html.includes("if(!persistence?.createDirtyState||!persistence?.createPatchEngine)"),'界面启动前没有验证持久化接口');
assert(html.indexOf("if(!persistence?.createDirtyState||!persistence?.createPatchEngine)")<html.indexOf('const app = createApp({'),'持久化接口验证晚于 Vue 初始化');
assert(wrapperSource.includes("throw new Error('持久化核心模块未注册')"),'ESM 兼容入口会静默返回不完整模块');
assert.equal(RELEASE_VERSION, readReleaseConfig(root).version, '站点版本与批准发布配置不一致');
assert(pageSource.includes('import { RELEASE_VERSION }') && pageSource.includes('/legacy/index.html?v=${RELEASE_VERSION.slice(1)}'), '站点壳层没有使用当前发布版本缓存键');

const context={window:{}};
vm.runInNewContext(coreSource,context,{filename:'persistence-core.js'});
const persistence=context.window.SGZ_UI_MODULES?.persistence;
assert.equal(typeof persistence?.createDirtyState,'function','持久化核心未注册 createDirtyState');
assert.equal(typeof persistence?.createPatchEngine,'function','持久化核心未注册 createPatchEngine');

const dirty=persistence.createDirtyState();
assert.equal(dirty.dirty,false);
const revision=dirty.mark();
assert.equal(revision,1);
assert.equal(dirty.dirty,true);
assert.equal(dirty.clearIf(revision),true);
assert.equal(dirty.dirty,false);

const model={trees:{han:{office:[]}},fangzhen:[],personMeta:{}};
const engine=persistence.createPatchEngine({
  readTrees:()=>model.trees,
  readFangzhen:()=>model.fangzhen,
  readPersonMeta:()=>model.personMeta
});
engine.reset();
assert.equal(engine.initialized,true);
assert.equal(engine.capturePatch(),null);

const readerCorePath=path.join(root,'exports/观史台-读者版/assets/app/persistence-core.js');
if(fs.existsSync(path.join(root,'exports/观史台-读者版'))){
  assert(fs.existsSync(readerCorePath),'读者构建遗漏持久化核心');
  const readerHtml=fs.readFileSync(path.join(root,'exports/观史台-读者版/index.html'),'utf8');
  assert(readerHtml.includes(coreMarker),'读者构建没有加载持久化核心');
}

for(const relative of ['exports/三国职官谱-单文件版.html','exports/观史台-轻量单文件版.html']){
  const portable=fs.readFileSync(path.join(root,relative),'utf8');
  assert(portable.includes('(function registerPersistenceCore(global){'),`${relative} 没有内嵌持久化核心`);
  assert(!portable.includes(coreMarker),`${relative} 仍依赖外部持久化核心文件`);
}

console.log('V66 运行时初始化验证通过：持久化核心同步注册、接口门禁与 iframe 缓存键完整。');
