import { acceptOverdueReservations as acceptOverdueRows } from "@qmenut/db/repositories/reservations.repository";

import type { DrizzleDb } from "@qmenut/db/client";

interface AcceptOverdueReservationsInput {
  db: DrizzleDb;
  /** Omitted by the minute cron, which sweeps every branch. */
  branchId?: string;
}

/**
 * ADR 0005: requests nobody answered in time are accepted. Every read that shows pending reservations and the
 * cron go through here, so what follows an automatic acceptance lives in one place.
 */
export async function acceptOverdueReservations({ db, branchId }: AcceptOverdueReservationsInput): Promise<void> {
  await acceptOverdueRows({ db, branchId });
}
