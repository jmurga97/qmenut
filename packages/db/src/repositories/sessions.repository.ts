import { eq } from "drizzle-orm";

import { sessions } from "../schema/auth";

import type { DrizzleDb } from "../client";

interface SetSessionActiveRestaurantInput {
  activeRestaurantId: string;
  db: DrizzleDb;
  sessionId: string;
}

export async function setSessionActiveRestaurant({
  activeRestaurantId,
  db,
  sessionId,
}: SetSessionActiveRestaurantInput): Promise<void> {
  await db.update(sessions).set({ activeRestaurantId }).where(eq(sessions.id, sessionId));
}
