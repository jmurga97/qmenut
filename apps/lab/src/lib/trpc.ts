import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { queryClient } from "./query-client";

import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

export type LabOutputs = inferRouterOutputs<AppRouter>["lab"];

// Same origin: the Lab Worker (Vite's proxy locally) forwards /trpc to the API with the Access header.
export const trpcClient = createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: "/trpc" })] });
export const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient });
