declare module "cloudflare:workers" {
  /**
   * Bindings available to the web worker (see `apps/web/wrangler.jsonc`). Typed by hand to
   * avoid pulling `@cloudflare/workers-types` into the app tsconfig.
   */
  export const env: {
    TENANT_THEME?: {
      get(key: string, type: "json"): Promise<unknown>;
    };
    TENANT_HOST?: string;
  };
}
