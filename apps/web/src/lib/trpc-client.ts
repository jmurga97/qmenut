import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { getEnvString } from "./env";

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

function getApiBaseUrl(): string {
  // Browsers always use same-origin /trpc: Vite proxies it in development and the public-menu
  // Worker proxies it through API_WORKER in production. This also prevents `localhost` from
  // resolving to the diner's device when a local build is opened over the LAN.
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const configuredUrl = getEnvString("VITE_API_BASE_URL");

  if (configuredUrl) {
    // eslint-disable-next-line sonarjs/super-linear-regex -- URL length is bounded by deployment config.
    return configuredUrl.replace(/\/+$/, "");
  }

  return "http://localhost:8787";
}

async function getApiWorkerBinding() {
  if (!import.meta.env.SSR) {
    return;
  }

  // Client-reachable modules must guard this dynamic runtime import with import.meta.env.SSR.
  const { env } = await import("cloudflare:workers");
  const binding = env.API_WORKER;

  return binding && typeof binding.fetch === "function" ? binding : undefined;
}

function getRequestUrl(url: RequestInfo | URL): string {
  if (typeof url === "string") {
    return url;
  }

  if (url instanceof URL) {
    return url.href;
  }

  return url.url;
}

async function fetchApi(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const binding = await getApiWorkerBinding();

  if (binding) {
    try {
      const publicUrl = new URL(getRequestUrl(url));
      const internalUrl = new URL(publicUrl.pathname + publicUrl.search, "https://qmenut-api.internal");

      return await binding.fetch(new Request(internalUrl, options));
    } catch {
      // A disconnected local service binding falls back to the configured public API URL.
    }
  }

  return fetch(url, options);
}

function createRawTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/trpc`,
        fetch(url, options) {
          return fetchApi(url, options);
        },
      }),
    ],
  });
}

export function createTrpcOptionsProxy(queryClient: QueryClient): TrpcOptionsProxy {
  return createTRPCOptionsProxy<AppRouter>({
    client: createRawTrpcClient(),
    queryClient,
  });
}

/**
 * Direct (non-React-Query) tRPC caller for server routes like robots.txt/sitemap.xml that
 * run outside the router's request/loader lifecycle and don't need query caching.
 */
export function createServerTrpcCaller() {
  return createRawTrpcClient();
}
