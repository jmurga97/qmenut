declare namespace Cloudflare {
  /** Bindings available to the public-menu Worker. */
  interface Env {
    ALLOW_INDEXING?: string;
    API_WORKER?: Fetcher;
    DISABLE_EDGE_CACHE?: string;
    SENTRY_DSN?: string;
    // Read-only here: apps/api is the only writer.
    TENANT_THEME?: Pick<KVNamespace, "get">;
  }
}
