import handler from "vinext/server/app-router-entry";
import { catalogueRouter } from "../server/admin-router";
import { readerRequestGuard } from "./reader-request-guard";

// Owner-authorized catalogue routes are isolated before the unchanged reader guard.
const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
    const catalogue = await catalogueRouter(request, env);
    if (catalogue) return catalogue;
    const rejected = readerRequestGuard(request);
    if (rejected) return rejected;
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
