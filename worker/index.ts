import handler from "vinext/server/app-router-entry";
import { readerRequestGuard } from "./reader-request-guard";

// The reader serves prebuilt data and local images. It has no Server Actions,
// image transformation service, uploads, or server-side mutations.
const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
    const rejected = readerRequestGuard(request);
    if (rejected) return rejected;
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
