declare namespace Cloudflare {
  /** Bindings available to the public-menu Worker. */
  interface Env {
    API_WORKER?: Fetcher;
    DISABLE_EDGE_CACHE?: string;
    SENTRY_DSN?: string;
    TENANT_THEME?: KVNamespace;
  }
}
