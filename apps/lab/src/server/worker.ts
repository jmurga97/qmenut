// Static SPA plus a same-origin /trpc proxy. Cloudflare Access fronts lab.qmenut.app, so every
// request carries Cf-Access-Jwt-Assertion; the API verifies it, never this Worker.
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  API_WORKER: Fetcher;
  ASSETS: Fetcher;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return new URL(request.url).pathname.startsWith("/trpc/")
      ? env.API_WORKER.fetch(request)
      : env.ASSETS.fetch(request);
  },
};
