import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export * from "./schema";

export type DrizzleDb = ReturnType<typeof createDb>;

// Build a Drizzle client over the request's D1 binding. Called once per request
// in the GraphQL context (graphql/runtime/context.ts), never module-global.
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
