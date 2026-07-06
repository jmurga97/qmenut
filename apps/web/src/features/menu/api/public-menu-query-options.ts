import type { TrpcOptionsProxy } from "~/lib/trpc-client";

interface PublicMenuQueryOptionsInput {
  /**
   * Tenant host resolved by the root route (SSR). Always passed explicitly so server and client
   * share the same query key — never derived from `window.location` here.
   */
  host: string;
  locale: string | undefined;
  trpc: TrpcOptionsProxy;
}

export function getPublicMenuQueryOptions({ host, locale, trpc }: PublicMenuQueryOptionsInput) {
  return trpc.menu.publicData.queryOptions({ host, locale });
}
