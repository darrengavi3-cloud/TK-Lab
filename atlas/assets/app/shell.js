import { MODULE_KEYS, validRouteHash } from './route-contract.js';
export { MODULE_KEYS };
export { createPersonNavigator } from './navigation.js';
export { validRouteHash, acceptedRouteMessage } from './route-contract.js';

export function parseRouteHash(hash){
  const raw=String(hash||'#offices').replace(/^#/,'');
  const split=raw.indexOf('?');
  const requested=(split<0?raw:raw.slice(0,split))||'offices';
  return {
    module:MODULE_KEYS.includes(requested)?requested:'offices',
    params:new URLSearchParams(split<0?'':raw.slice(split+1))
  };
}

export function serializeRouteHash(module,params){
  const safeModule=MODULE_KEYS.includes(module)?module:'offices';
  const query=params instanceof URLSearchParams?params.toString():new URLSearchParams(params||{}).toString();
  return '#'+safeModule+(query?'?'+query:'');
}

// Only UI state is retained, never copies of historical records.
export function createReadingTrail(limit=20){
  const entries=[];
  return {
    remember(hash,label,scrollY=0){
      if(!validRouteHashForTrail(hash)||entries.at(-1)?.hash===hash)return;
      entries.push({hash,label,scrollY:Math.max(0,Number(scrollY)||0)});
      if(entries.length>limit)entries.shift();
    },
    peek(){return entries.at(-1)||null;},
    take(){return entries.pop()||null;}
  };
}
function validRouteHashForTrail(hash){
  return validRouteHash(hash);
}
