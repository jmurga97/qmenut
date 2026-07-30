import type { Page } from "@playwright/test";

export interface TrpcResponse {
  body: string;
  json: unknown;
  ok: boolean;
  status: number;
}

export async function callTrpcMutation(page: Page, path: string, input: unknown): Promise<TrpcResponse> {
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
