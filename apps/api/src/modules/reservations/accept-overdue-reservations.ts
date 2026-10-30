import { acceptOverdueReservations as acceptOverdueRows } from "@qmenut/db/repositories/reservations.repository";

import { announceReservations } from "./reservation-messages";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

interface AcceptOverdueReservationsInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  /** Omitted by the minute cron, which sweeps every branch. */
  branchId?: string;
}

/**
 * ADR 0005: requests nobody answered in time are accepted. Every read that shows pending reservations and the
 * cron go through here, so what follows an automatic acceptance lives in one place.
 */
export async function acceptOverdueReservations({ db, env, branchId }: AcceptOverdueReservationsInput): Promise<void> {
  const rows = await acceptOverdueRows({ db, branchId });

  await announceReservations({
    db,
    env,
    reservationIds: rows.map((row) => row.id),
    event: { kind: "accepted", handledBy: null, automatic: true },
  });
}
