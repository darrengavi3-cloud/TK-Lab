export function validRouteHash(hash) {
  return typeof hash === 'string' && hash.length <= 4096
    && /^#(?:offices|people|battle|fangzhen|jinshi|shihuo|map)(?:\?[^\r\n]*)?$/.test(hash);
}

export function acceptedRouteMessage(event, source, origin, type = 'guanshitai:route') {
  return event.source === source && event.origin === origin && event.data?.type === type
    && validRouteHash(event.data.hash)
    && (type === 'guanshitai:host-route' || ['push', 'replace'].includes(event.data.mode));
}
