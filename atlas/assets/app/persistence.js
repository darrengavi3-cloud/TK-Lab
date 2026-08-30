export function createDirtyState(){
  let dirty=false;
  let revision=0;
  return {
    mark(){dirty=true;revision+=1;return revision;},
    clearIf(savedRevision){if(revision===savedRevision)dirty=false;return !dirty;},
    get dirty(){return dirty;},
    get revision(){return revision;}
  };
}

function defaultClone(value){
  if(typeof structuredClone==='function')return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

/**
 * Stable-key patch engine. It keeps one structurally shared index of the current
 * model and clones only records that actually changed. Full project snapshots
 * deliberately remain outside this engine and are reserved for named versions
 * and long-interval checkpoints.
 */
export function createPatchEngine(adapters={}){
  const clone=adapters.clone||defaultClone;
  const readTrees=adapters.readTrees||(()=>({}));
  const readFangzhen=adapters.readFangzhen||(()=>[]);
  const readPersonMeta=adapters.readPersonMeta||(()=>({}));
  let currentIndex=null;

  function itemKey(item,keyField,index){
    const key=String(item?.[keyField]??'').trim();
    return key||`__index_${index}`;
  }
  function valueSnapshot(value){return {json:JSON.stringify(value),value:clone(value)};}
  function listIndex(list,keyField){
    const items=new Map();
    const order=[];
    (Array.isArray(list)?list:[]).forEach((item,index)=>{
      const key=itemKey(item,keyField,index);
      order.push(key);items.set(key,valueSnapshot(item));
    });
    return {keyField,order,items};
  }
  function objectIndex(value){
    const items=new Map();
    Object.entries(value&&typeof value==='object'?value:{}).forEach(([key,item])=>items.set(key,valueSnapshot(item)));
    return {items};
  }
  function buildIndex(){
    const trees={};
    Object.entries(readTrees()||{}).forEach(([factionKey,faction])=>{
      trees[factionKey]={};
      Object.entries(faction||{}).forEach(([treeType,list])=>{trees[factionKey][treeType]=listIndex(list,'key');});
    });
    return {trees,fangzhen:listIndex(readFangzhen(),'id'),personMeta:objectIndex(readPersonMeta())};
  }
  function diffList(previousIndex,currentList,keyField){
    const previous=previousIndex||listIndex([],keyField);
    const nextItems=new Map();
    const nextOrder=[];
    const changes=[];
    (Array.isArray(currentList)?currentList:[]).forEach((item,index)=>{
      const key=itemKey(item,keyField,index);
      const json=JSON.stringify(item);
      const old=previous.items.get(key);
      nextOrder.push(key);
      if(old&&old.json===json){nextItems.set(key,old);return;}
      const next={json,value:clone(item)};
      nextItems.set(key,next);
      changes.push({key,before:old?clone(old.value):null,after:clone(next.value)});
    });
    previous.items.forEach((old,key)=>{if(!nextItems.has(key))changes.push({key,before:clone(old.value),after:null});});
    const orderChanged=previous.order.join('\u0000')!==nextOrder.join('\u0000');
    return {
      nextIndex:{keyField,order:nextOrder,items:nextItems},
      diff:changes.length||orderChanged?{keyField,changes,orderBefore:orderChanged?previous.order.slice():null,orderAfter:orderChanged?nextOrder.slice():null}:null
    };
  }
  function diffObject(previousIndex,currentObject){
    const previous=previousIndex||objectIndex({});
    const nextItems=new Map();
    const changes=[];
    Object.entries(currentObject&&typeof currentObject==='object'?currentObject:{}).forEach(([key,value])=>{
      const json=JSON.stringify(value);
      const old=previous.items.get(key);
      if(old&&old.json===json){nextItems.set(key,old);return;}
      const next={json,value:clone(value)};nextItems.set(key,next);
      changes.push({key,before:old?clone(old.value):null,after:clone(next.value)});
    });
    previous.items.forEach((old,key)=>{if(!nextItems.has(key))changes.push({key,before:clone(old.value),after:null});});
    return {nextIndex:{items:nextItems},diff:changes.length?{changes}:null};
  }
  function capturePatch(){
    if(!currentIndex)currentIndex=buildIndex();
    const targets=[];
    const trees=readTrees()||{};
    const nextTrees={};
    new Set([...Object.keys(currentIndex.trees||{}),...Object.keys(trees)]).forEach(factionKey=>{
      nextTrees[factionKey]={};
      const previousFaction=currentIndex.trees?.[factionKey]||{};
      const currentFaction=trees[factionKey]||{};
      new Set([...Object.keys(previousFaction),...Object.keys(currentFaction)]).forEach(treeType=>{
        const result=diffList(previousFaction[treeType],currentFaction[treeType],'key');
        nextTrees[factionKey][treeType]=result.nextIndex;
        if(result.diff)targets.push({kind:'tree',factionKey,treeType,...result.diff});
      });
    });
    const fangzhen=diffList(currentIndex.fangzhen,readFangzhen(),'id');
    if(fangzhen.diff)targets.push({kind:'fangzhen',...fangzhen.diff});
    const personMeta=diffObject(currentIndex.personMeta,readPersonMeta());
    if(personMeta.diff)targets.push({kind:'personMeta',...personMeta.diff});
    currentIndex={trees:nextTrees,fangzhen:fangzhen.nextIndex,personMeta:personMeta.nextIndex};
    return targets.length?{schemaVersion:1,targets}:null;
  }
  function patchedList(currentList,target,direction){
    const map=new Map((Array.isArray(currentList)?currentList:[]).map((item,index)=>[itemKey(item,target.keyField,index),clone(item)]));
    target.changes.forEach(change=>{
      const value=direction==='backward'?change.before:change.after;
      if(value===null)map.delete(change.key);else map.set(change.key,clone(value));
    });
    const order=direction==='backward'?target.orderBefore:target.orderAfter;
    if(!Array.isArray(order))return Array.from(map.values());
    const used=new Set();const result=[];
    order.forEach(key=>{if(map.has(key)){result.push(map.get(key));used.add(key);}});
    map.forEach((value,key)=>{if(!used.has(key))result.push(value);});
    return result;
  }
  function refreshTargets(patch){
    if(!currentIndex)currentIndex=buildIndex();
    const trees=readTrees()||{};
    (patch?.targets||[]).forEach(target=>{
      if(target.kind==='tree'){
        if(!currentIndex.trees[target.factionKey])currentIndex.trees[target.factionKey]={};
        currentIndex.trees[target.factionKey][target.treeType]=listIndex(trees?.[target.factionKey]?.[target.treeType],'key');
      }else if(target.kind==='fangzhen')currentIndex.fangzhen=listIndex(readFangzhen(),'id');
      else if(target.kind==='personMeta')currentIndex.personMeta=objectIndex(readPersonMeta());
    });
  }
  function applyPatch(patch,direction='forward',options={}){
    if(!patch?.targets?.length)return false;
    patch.targets.forEach(target=>{
      if(target.kind==='tree')adapters.writeTree?.(target.factionKey,target.treeType,patchedList(readTrees()?.[target.factionKey]?.[target.treeType],target,direction));
      else if(target.kind==='fangzhen')adapters.writeFangzhen?.(patchedList(readFangzhen(),target,direction));
      else if(target.kind==='personMeta'){
        const next={...(readPersonMeta()||{})};
        target.changes.forEach(change=>{const value=direction==='backward'?change.before:change.after;if(value===null)delete next[change.key];else next[change.key]=clone(value);});
        adapters.writePersonMeta?.(next);
      }
    });
    if(options.updateIndex!==false)refreshTargets(patch);
    return true;
  }

  return Object.freeze({
    reset(){currentIndex=buildIndex();},
    capturePatch,
    applyPatch,
    refreshTargets,
    get initialized(){return Boolean(currentIndex);}
  });
}
