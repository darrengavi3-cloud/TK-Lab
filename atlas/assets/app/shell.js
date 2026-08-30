export const MODULE_KEYS = Object.freeze(['offices','people','battle','fangzhen','jinshi','shihuo','map']);

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
