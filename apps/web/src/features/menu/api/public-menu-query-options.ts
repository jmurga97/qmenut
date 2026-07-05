import { getPublicMenuHost } from "~/lib/trpc-client";

import type { TrpcOptionsProxy } from "~/lib/trpc-client";

interface PublicMenuQueryOptionsInput {
  host?: string;
  trpc: TrpcOptionsProxy;
}

export function getPublicMenuQueryOptions({ host = getPublicMenuHost(), trpc }: PublicMenuQueryOptionsInput) {
  return trpc.menu.publicData.queryOptions(host ? { host } : undefined);
}
