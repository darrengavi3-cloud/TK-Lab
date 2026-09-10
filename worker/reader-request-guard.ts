/** Reject unused runtime capabilities before the framework reads a body. */
export function readerRequestGuard(request: Request): Response | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname).replace(/\/{2,}/g, "/");
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (/^\/_(?:vinext|next)\/image(?:\/|$)/.test(pathname)) {
    return new Response("Not found", { status: 404 });
  }
  if (!['GET', 'HEAD'].includes(request.method) || request.headers.has('next-action') || request.headers.has('x-rsc-action')) {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" },
    });
  }
  return null;
}
