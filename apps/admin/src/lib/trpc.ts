import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { queryClient } from "./query-client";

import type { AppRouter } from "@qmenut/api/router";
import type { QueryClient } from "@tanstack/react-query";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";

export type TrpcOptionsProxy = TRPCOptionsProxy<AppRouter>;
export interface AdminRouterContext {
  queryClient: QueryClient;
  trpc: TrpcOptionsProxy;
}
export function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof configuredUrl === "string" && configuredUrl.trim()) {
    // eslint-disable-next-line sonarjs/super-linear-regex -- URL length is bounded by deployment config.
    return configuredUrl.trim().replace(/\/+$/, "");
  }
  return "http://localhost:8787";
}
function fetchWithCredentials(url: Parameters<typeof fetch>[0], options: Parameters<typeof fetch>[1]) {
  return fetch(url, {
    ...options,
    credentials: "include",
  });
}
const trpcLink = httpBatchLink({
  url: `${getApiBaseUrl()}/trpc`,
  fetch: fetchWithCredentials,
});
const trpcClient = createTRPCClient<AppRouter>({
  links: [trpcLink],
});
export const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient });
