import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { queryClient } from "./query-client";

import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

export type ReferralOutputs = inferRouterOutputs<AppRouter>["referrals"];

// Same origin: this app's Worker (Vite's proxy locally) forwards /trpc to the API with the session cookie.
export const trpcClient = createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: "/trpc" })] });
export const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient });
