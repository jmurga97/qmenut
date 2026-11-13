import { and, desc, eq, gt, inArray } from "drizzle-orm";

import { onboardingIntakes } from "../schema/onboarding";

import type { DrizzleDb } from "../client";

export type IntakeRow = typeof onboardingIntakes.$inferSelect;
export async function createIntake(db: DrizzleDb, input: typeof onboardingIntakes.$inferInsert) {
  await db.insert(onboardingIntakes).values(input);
}
export async function listIntakes(db: DrizzleDb) {
  return db.select().from(onboardingIntakes).orderBy(desc(onboardingIntakes.createdAt)).all();
}
export async function getIntake(db: DrizzleDb, id: string): Promise<IntakeRow | null> {
  return (await db.select().from(onboardingIntakes).where(eq(onboardingIntakes.id, id)).get()) ?? null;
}
export async function submitIntake({
  db,
  id,
  dataJson,
  now,
}: {
  db: DrizzleDb;
  id: string;
  dataJson: string;
  now: number;
}) {
  const result = await db
    .update(onboardingIntakes)
    .set({ dataJson, status: "submitted", submittedAt: now })
    .where(
      and(
        eq(onboardingIntakes.id, id),
        inArray(onboardingIntakes.status, ["pending", "submitted"]),
        gt(onboardingIntakes.expiresAt, now),
      ),
    )
    .run();
  return result.meta.changes === 1;
}
export async function markIntakeUsed(db: DrizzleDb, id: string) {
  const result = await db
    .update(onboardingIntakes)
    .set({ status: "used" })
    .where(and(eq(onboardingIntakes.id, id), eq(onboardingIntakes.status, "submitted")))
    .run();
  return result.meta.changes === 1;
}
export async function markIntakeSent({ db, id, now }: { db: DrizzleDb; id: string; now: number }) {
  await db.update(onboardingIntakes).set({ sentAt: now }).where(eq(onboardingIntakes.id, id)).run();
}
