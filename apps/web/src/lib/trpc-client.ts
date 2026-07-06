import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import type { AppRouter } from "@qmenut/api/router";
import type { QueryClient } from "@tanstack/react-query";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { i18n as I18nInstance } from "i18next";

export type TrpcOptionsProxy = TRPCOptionsProxy<AppRouter>;

export interface RouterAppContext {
  i18n: I18nInstance;
  queryClient: QueryClient;
  trpc: TrpcOptionsProxy;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getEnvString(key: string): string | undefined {
  const value = (import.meta.env as Record<string, unknown>)[key];

  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || undefined;
}

function getApiBaseUrl(): string {
  const configuredUrl = getEnvString("VITE_API_BASE_URL");

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  if (import.meta.env.DEV) {
    return "http://localhost:8787";
  }

  if (typeof window === "undefined") {
    return "http://localhost:8787";
  }

  return window.location.origin;
}

export function getPublicMenuHost(): string | undefined {
  const configuredHost = getEnvString("VITE_PUBLIC_MENU_HOST");

  if (configuredHost) {
    return configuredHost;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  return window.location.hostname;
}

export function createTrpcOptionsProxy(queryClient: QueryClient): TrpcOptionsProxy {
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
