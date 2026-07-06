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

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;

  if (typeof configuredUrl === "string" && configuredUrl.trim()) {
    return trimTrailingSlash(configuredUrl.trim());
  }

  return "http://localhost:8787";
}

function createTrpcOptionsProxy(queryClient: QueryClient): TrpcOptionsProxy {
  return createTRPCOptionsProxy<AppRouter>({
    client: createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${getApiBaseUrl()}/trpc`,
          fetch(url, options) {
            return globalThis.fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    }),
    queryClient,
  });
}

/** Proxy tRPC único de la app: mismo objeto en el router context y en los componentes. */
export const trpc = createTrpcOptionsProxy(queryClient);
