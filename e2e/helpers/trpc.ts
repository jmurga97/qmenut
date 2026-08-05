import type { APIRequestContext, Page } from "@playwright/test";

export interface TrpcResponse {
  body: string;
  json: unknown;
  ok: boolean;
  status: number;
}

const adminNavigationByPage = new WeakMap<Page, Promise<void>>();

async function ensureAdminOrigin(page: Page): Promise<void> {
  if (page.url() !== "about:blank") {
    return;
  }

  const currentNavigation = adminNavigationByPage.get(page);
  if (currentNavigation) {
    await currentNavigation;
    return;
  }

  const navigation = page
    .goto("http://localhost:5174/", { waitUntil: "domcontentloaded" })
    .then(() => undefined)
    .finally(() => adminNavigationByPage.delete(page));
  adminNavigationByPage.set(page, navigation);
  await navigation;
}

export async function callPublicTrpc(request: APIRequestContext, path: string, input?: unknown): Promise<TrpcResponse> {
  const url = new URL(`http://localhost:8787/trpc/${path}`);

  if (input !== undefined) {
    url.searchParams.set("input", JSON.stringify(input));
  }

  const response = await request.get(url.toString());
  const body = await response.text();

  return {
    body,
    json: body ? (JSON.parse(body) as unknown) : null,
    ok: response.ok(),
    status: response.status(),
  };
}

export async function callPublicTrpcMutation(
  request: APIRequestContext,
  path: string,
  input: unknown,
): Promise<TrpcResponse> {
  const response = await request.post(`http://localhost:8787/trpc/${path}`, { data: input });
  const body = await response.text();

  return {
    body,
    json: body ? (JSON.parse(body) as unknown) : null,
    ok: response.ok(),
    status: response.status(),
  };
}

export function getTrpcData<T>(response: TrpcResponse): T {
  const value = response.json as { result?: { data?: T } };

  if (value.result?.data === undefined) {
    throw new Error(`Expected a successful tRPC response, received ${response.status}: ${response.body}`);
  }

  return value.result.data;
}

export async function callTrpcMutation(page: Page, path: string, input: unknown): Promise<TrpcResponse> {
  await ensureAdminOrigin(page);
  return page.evaluate(
    async ({ input: mutationInput, path: mutationPath }) => {
      const response = await fetch(`http://localhost:8787/trpc/${mutationPath}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mutationInput),
      });
      const body = await response.text();

      return {
        body,
        json: body ? (JSON.parse(body) as unknown) : null,
        ok: response.ok,
        status: response.status,
      };
    },
    { input, path },
  );
}

export async function callTrpcQuery(page: Page, path: string, input?: unknown): Promise<TrpcResponse> {
  await ensureAdminOrigin(page);
  return page.evaluate(
    async ({ path: queryPath, queryInput }) => {
      const url = new URL(`http://localhost:8787/trpc/${queryPath}`);

      if (queryInput !== undefined) {
        url.searchParams.set("input", JSON.stringify(queryInput));
      }

      const response = await fetch(url, { credentials: "include" });
      const body = await response.text();

      return {
        body,
        json: body ? (JSON.parse(body) as unknown) : null,
        ok: response.ok,
        status: response.status,
      };
    },
    { path, queryInput: input },
  );
}
