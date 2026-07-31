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
  // Browsers use Vite's same-origin /trpc proxy in development. In particular, this prevents
  // `localhost` from resolving to the phone itself when the dev server is opened over the LAN.
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return window.location.origin;
  }

  const configuredUrl = getEnvString("VITE_API_BASE_URL");

  if (configuredUrl) {
    // eslint-disable-next-line sonarjs/super-linear-regex -- URL length is bounded by deployment config.
    return configuredUrl.replace(/\/+$/, "");
  }

  if (import.meta.env.DEV) {
    return "http://localhost:8787";
  }

  if (typeof window === "undefined") {
    return "http://localhost:8787";
  }

  return window.location.origin;
}

interface ApiWorkerBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

async function getApiWorkerBinding(): Promise<ApiWorkerBinding | undefined> {
  if (typeof window !== "undefined") {
    return undefined;
  }

  try {
    // eslint-disable-next-line import/no-unresolved -- runtime module provided by workerd
    const { env } = await import("cloudflare:workers");
    const binding = (env as { API_WORKER?: ApiWorkerBinding }).API_WORKER;

    return binding && typeof binding.fetch === "function" ? binding : undefined;
  } catch {
    return undefined;
  }
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

function createRawTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/trpc`,
        fetch(url, options) {
          return fetchApi(url, {
            ...options,
            credentials: "include",
          });
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
