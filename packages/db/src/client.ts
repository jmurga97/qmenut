/// <reference types="@cloudflare/workers-types" />

import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export type DrizzleDb = ReturnType<typeof createDb>;

// Build a Drizzle client over the request's D1 binding. Called once per request
// in the API request context, never module-global.
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
