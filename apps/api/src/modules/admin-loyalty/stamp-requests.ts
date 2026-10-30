import {
  acceptOverdueStampRequests,
  acceptStampRequest as acceptStampRequestRow,
  declineStampRequest as declineStampRequestRow,
  listHandledStampRequests,
  listPendingStampRequests,
  STAMP_REQUEST_AUTO_ACCEPT_MS,
  undoStampRequest as undoStampRequestRow,
} from "@qmenut/db/repositories/loyalty-ledger.repository";
import { reopenNotification } from "@qmenut/db/repositories/notifications.repository";
import { TRPCError } from "@trpc/server";

import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { resolveNotifications } from "../notifications/emit-notification";

import type { DrizzleDb } from "@qmenut/db/client";
import type { HandledStampRequestRow, PendingStampRequestRow } from "@qmenut/db/models/loyalty";

const HANDLED_WINDOW_MS = 24 * 60 * 60 * 1000;
const NOTIFICATION_TYPE = "loyalty.stampRequest";
const ANSWERED_MESSAGE = "La solicitud ya se ha respondido";

interface BranchInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
}

interface RequestActionInput {
  db: DrizzleDb;
  restaurantId: string;
  requestId: string;
  membershipId: string;
}

export async function pendingStampRequests({
  db,
  restaurantId,
  branchId,
}: BranchInput): Promise<Array<PendingStampRequestRow & { autoAcceptAt: number }>> {
  await assertBranchAccess({ db, restaurantId, branchId });
  await acceptOverdueStampRequests({ db, restaurantId });

  const rows = await listPendingStampRequests({ db, restaurantId, branchId });
  return rows.map((row) => ({ ...row, autoAcceptAt: row.createdAt + STAMP_REQUEST_AUTO_ACCEPT_MS }));
}

export async function handledStampRequests({
  db,
  restaurantId,
  branchId,
}: BranchInput): Promise<Array<HandledStampRequestRow & { canUndo: boolean }>> {
  await assertBranchAccess({ db, restaurantId, branchId });

  const rows = await listHandledStampRequests({ db, restaurantId, branchId, since: Date.now() - HANDLED_WINDOW_MS });
  return rows.map((row) => ({ ...row, canUndo: row.status === "accepted" }));
}

export async function acceptStampRequest({
  db,
  restaurantId,
  requestId,
  membershipId,
  quantity,
}: RequestActionInput & { quantity: number }): Promise<{ ok: true }> {
  const accepted = await acceptStampRequestRow({ db, restaurantId, requestId, quantity, handledBy: membershipId });

  if (!accepted) throw new TRPCError({ code: "CONFLICT", message: ANSWERED_MESSAGE });

  await resolveNotifications({
    db,
    type: NOTIFICATION_TYPE,
    subjectIds: [requestId],
    handledBy: membershipId,
    outcome: "accepted",
  });
  return { ok: true };
}

export async function declineStampRequest({
  db,
  restaurantId,
  requestId,
  membershipId,
}: RequestActionInput): Promise<{ ok: true }> {
  const declined = await declineStampRequestRow({ db, restaurantId, requestId, handledBy: membershipId });

  if (!declined) throw new TRPCError({ code: "CONFLICT", message: ANSWERED_MESSAGE });

  await resolveNotifications({
    db,
    type: NOTIFICATION_TYPE,
    subjectIds: [requestId],
    handledBy: membershipId,
    outcome: "declined",
  });
  return { ok: true };
}

export async function undoStampRequest({
  db,
  restaurantId,
  requestId,
  membershipId,
  branchId,
}: RequestActionInput & { branchId: string }): Promise<{ status: "declined" | "pending" }> {
  await assertBranchAccess({ db, restaurantId, branchId });

  const result = await undoStampRequestRow({ db, restaurantId, requestId, handledBy: membershipId, branchId });

  if (result === "notFound")
    throw new TRPCError({ code: "CONFLICT", message: "Esta solicitud ya no se puede deshacer" });
  if (result === "spent") throw new TRPCError({ code: "CONFLICT", message: "Los sellos ya se han canjeado" });
  if (result === "declined") return { status: "declined" };

  try {
    await reopenNotification({ db, type: NOTIFICATION_TYPE, subjectId: requestId });
  } catch {
    // A stale inbox row is better than reporting a committed undo as failed.
  }
  return { status: "pending" };
}
