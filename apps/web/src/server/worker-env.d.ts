declare namespace Cloudflare {
  /** Bindings available to the public-menu Worker. */
  interface Env {
    ALLOW_INDEXING?: string;
    API_WORKER?: Fetcher;
    DISABLE_EDGE_CACHE?: string;
    SENTRY_DSN?: string;
    TENANT_THEME?: KVNamespace;
  }
}
