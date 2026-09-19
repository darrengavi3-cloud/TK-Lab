export const MODULE_KEYS = Object.freeze(['offices','people','battle','fangzhen','jinshi','shihuo','map']);

export function validRouteHash(hash) {
  return typeof hash === 'string' && hash.length <= 4096
    && !/[\r\n]/.test(hash) && hash.startsWith('#')
    && MODULE_KEYS.includes(hash.slice(1).split('?')[0]);
}

export function acceptedRouteMessage(event, source, origin, type = 'guanshitai:route') {
  return event.source === source && event.origin === origin && event.data?.type === type
    && validRouteHash(event.data.hash)
    && (type === 'guanshitai:host-route' || ['push', 'replace'].includes(event.data.mode));
}
