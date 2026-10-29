import { hasFeature, INTERNAL_SUPPORT_EMAILS, PLAN_CODES } from "@qmenut/permissions";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import { notificationRecipients, notifications, pushDevices } from "../schema/notifications";

import type { DrizzleDb } from "../client";
import type { SQL } from "drizzle-orm";

export const NOTIFICATION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export type NotificationFacts = Record<string, string | number | null>;
export type PushLanguage = "es" | "en";

interface NewNotification {
  restaurantId: string;
  branchId: string | null;
  type: string;
  subjectId: string;
  facts: NotificationFacts;
  actionable: boolean;
}

/** Members who can open the admin right now: mirrors tenantProcedure's Basic gate, never support accounts. */
function insertRecipients(db: DrizzleDb, notificationFilter: SQL) {
  const usersPlanCodes = PLAN_CODES.filter((planCode) => hasFeature([planCode], "users"));

  return db.run(sql`
    INSERT OR IGNORE INTO notification_recipients (notification_id, membership_id)
    SELECT n.id, ru.id
    FROM notifications n
    JOIN restaurant_users ru ON ru.restaurant_id = n.restaurant_id
    JOIN users u ON u.id = ru.user_id
    JOIN restaurants r ON r.id = n.restaurant_id
    WHERE ${notificationFilter}
      AND ru.is_active = 1 AND r.deleted_at IS NULL
      AND lower(u.email) NOT IN (${sql.join(
        INTERNAL_SUPPORT_EMAILS.map((email) => sql`${email}`),
        sql`, `,
      )})
      AND (
        ru.role_code = 'owner'
        OR EXISTS (
          SELECT 1 FROM branches b
          WHERE b.restaurant_id = r.id AND b.deleted_at IS NULL
            AND b.plan_code IN (${sql.join(
              usersPlanCodes.map((planCode) => sql`${planCode}`),
              sql`, `,
            )})
        )
      )
  `);
}

/** Returns the new id, or null when this event was already emitted. */
export async function createNotification({
  db,
  notification,
  now = Date.now(),
}: {
  db: DrizzleDb;
  notification: NewNotification;
  now?: number;
}): Promise<string | null> {
  const id = crypto.randomUUID();
  const inserted = await db
    .insert(notifications)
    .values({
      id,
      restaurantId: notification.restaurantId,
      branchId: notification.branchId,
      type: notification.type,
      subjectId: notification.subjectId,
      factsJson: JSON.stringify(notification.facts),
      actionable: notification.actionable,
      createdAt: now,
      expiresAt: now + NOTIFICATION_RETENTION_MS,
    })
    .onConflictDoNothing()
    .returning({ id: notifications.id });

  if (inserted.length === 0) return null;

  await insertRecipients(db, sql`n.id = ${id}`);
  return id;
}

export async function markNotificationsHandled({
  db,
  type,
  subjectIds,
  handledBy,
  outcome,
  now = Date.now(),
}: {
  db: DrizzleDb;
  type: string;
  subjectIds: string[];
  handledBy: string | null;
  outcome: string;
  now?: number;
}): Promise<void> {
  if (subjectIds.length === 0) return;

  await db
    .update(notifications)
    .set({ handledAt: now, handledBy, handledOutcome: outcome })
    .where(
      and(eq(notifications.type, type), inArray(notifications.subjectId, subjectIds), isNull(notifications.handledAt)),
    );
}

interface InboxScope {
  db: DrizzleDb;
  membershipId: string;
  branchId: string;
  now?: number;
}

export interface InboxRow {
  id: string;
  type: string;
  branchId: string | null;
  facts: NotificationFacts;
  actionable: boolean;
  createdAt: number;
  readAt: number | null;
  handledAt: number | null;
  handledOutcome: string | null;
  handledByName: string | null;
}

function inboxFilter({ membershipId, branchId, now = Date.now() }: InboxScope): SQL {
  return sql`
    nr.membership_id = ${membershipId}
    AND (n.branch_id = ${branchId} OR n.branch_id IS NULL)
    AND n.expires_at > ${now}
    AND n.created_at > ${now - NOTIFICATION_RETENTION_MS}
  `;
}

export async function listInbox(scope: InboxScope): Promise<InboxRow[]> {
  const rows = await scope.db.all<{
    id: string;
    type: string;
    branch_id: string | null;
    facts_json: string;
    actionable: number;
    created_at: number;
    read_at: number | null;
    handled_at: number | null;
    handled_outcome: string | null;
    handled_by_name: string | null;
  }>(sql`
    SELECT n.id, n.type, n.branch_id, n.facts_json, n.actionable, n.created_at, nr.read_at,
      n.handled_at, n.handled_outcome, u.name AS handled_by_name
    FROM notification_recipients nr
    JOIN notifications n ON n.id = nr.notification_id
    LEFT JOIN restaurant_users hru ON hru.id = n.handled_by
    LEFT JOIN users u ON u.id = hru.user_id
    WHERE ${inboxFilter(scope)}
    ORDER BY n.created_at DESC
    LIMIT 200
  `);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    branchId: row.branch_id,
    facts: JSON.parse(row.facts_json) as NotificationFacts,
    actionable: row.actionable === 1,
    createdAt: row.created_at,
    readAt: row.read_at,
    handledAt: row.handled_at,
    handledOutcome: row.handled_outcome,
    handledByName: row.handled_by_name,
  }));
}

/** Badge: unread and not handled by anyone. */
export async function countInboxBadge(scope: InboxScope): Promise<number> {
  const row = await scope.db.get<{ count: number }>(sql`
    SELECT count(*) AS count
    FROM notification_recipients nr
    JOIN notifications n ON n.id = nr.notification_id
    WHERE ${inboxFilter(scope)} AND nr.read_at IS NULL AND n.handled_at IS NULL
  `);

  return row?.count ?? 0;
}

export async function markNotificationsRead({
  db,
  membershipId,
  ids,
}: {
  db: DrizzleDb;
  membershipId: string;
  ids: string[];
}): Promise<void> {
  await db
    .update(notificationRecipients)
    .set({ readAt: Date.now() })
    .where(
      and(
        eq(notificationRecipients.membershipId, membershipId),
        inArray(notificationRecipients.notificationId, ids),
        isNull(notificationRecipients.readAt),
      ),
    );
}

export async function markAllNotificationsRead(scope: InboxScope): Promise<void> {
  await scope.db.run(sql`
    UPDATE notification_recipients AS nr SET read_at = ${Date.now()}
    WHERE nr.read_at IS NULL AND EXISTS (
      SELECT 1 FROM notifications n WHERE n.id = nr.notification_id AND ${inboxFilter(scope)}
    )
  `);
}

/** Devices of this notification's recipients that follow its branch. */
export async function listPushTargetIds({
  db,
  notificationId,
}: {
  db: DrizzleDb;
  notificationId: string;
}): Promise<string[]> {
  const rows = await db.all<{ id: string }>(sql`
    SELECT d.id
    FROM notifications n
    JOIN notification_recipients nr ON nr.notification_id = n.id
    JOIN push_devices d ON d.membership_id = nr.membership_id
    WHERE n.id = ${notificationId}
      AND EXISTS (SELECT 1 FROM json_each(d.branch_ids) WHERE json_each.value = n.branch_id)
  `);

  return rows.map((row) => row.id);
}

export interface PushDelivery {
  type: string;
  facts: NotificationFacts;
  branchName: string | null;
  handledAt: number | null;
  expiresAt: number;
  device: { id: string; endpoint: string; p256dh: string; auth: string; language: PushLanguage };
}

/** Rechecks the targeting: a shared browser may have changed owner while the push sat in the queue. */
export async function getPushDelivery({
  db,
  notificationId,
  deviceId,
}: {
  db: DrizzleDb;
  notificationId: string;
  deviceId: string;
}): Promise<PushDelivery | null> {
  const row = await db.get<{
    type: string;
    facts_json: string;
    branch_name: string | null;
    handled_at: number | null;
    expires_at: number;
    device_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    language: PushLanguage;
  }>(sql`
    SELECT n.type, n.facts_json, b.name AS branch_name, n.handled_at, n.expires_at,
      d.id AS device_id, d.endpoint, d.p256dh, d.auth, d.language
    FROM notifications n
    JOIN push_devices d ON d.id = ${deviceId}
    JOIN notification_recipients nr ON nr.notification_id = n.id AND nr.membership_id = d.membership_id
    LEFT JOIN branches b ON b.id = n.branch_id
    WHERE n.id = ${notificationId}
      AND EXISTS (SELECT 1 FROM json_each(d.branch_ids) WHERE json_each.value = n.branch_id)
  `);

  if (!row) return null;

  return {
    type: row.type,
    facts: JSON.parse(row.facts_json) as NotificationFacts,
    branchName: row.branch_name,
    handledAt: row.handled_at,
    expiresAt: row.expires_at,
    device: { id: row.device_id, endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth, language: row.language },
  };
}

interface PushDeviceInput {
  db: DrizzleDb;
  membershipId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  language: PushLanguage;
  branchIds: string[];
}

/** Keyed by endpoint: a browser shared by two members belongs to whoever turned push on last. */
export async function upsertPushDevice({
  db,
  membershipId,
  endpoint,
  p256dh,
  auth,
  language,
  branchIds,
}: PushDeviceInput): Promise<void> {
  const now = Date.now();
  const values = { membershipId, p256dh, auth, language, branchIds: JSON.stringify(branchIds), updatedAt: now };

  await db
    .insert(pushDevices)
    .values({ id: crypto.randomUUID(), endpoint, createdAt: now, ...values })
    .onConflictDoUpdate({ target: pushDevices.endpoint, set: values });
}

export async function getPushDeviceBranchIds({
  db,
  membershipId,
  endpoint,
}: {
  db: DrizzleDb;
  membershipId: string;
  endpoint: string;
}): Promise<string[] | null> {
  const row = await db
    .select({ branchIds: pushDevices.branchIds })
    .from(pushDevices)
    .where(and(eq(pushDevices.endpoint, endpoint), eq(pushDevices.membershipId, membershipId)))
    .get();

  return row ? (JSON.parse(row.branchIds) as string[]) : null;
}

export async function removePushDevice({
  db,
  membershipId,
  endpoint,
}: {
  db: DrizzleDb;
  membershipId: string;
  endpoint: string;
}): Promise<void> {
  await db
    .delete(pushDevices)
    .where(and(eq(pushDevices.endpoint, endpoint), eq(pushDevices.membershipId, membershipId)));
}

/** The push service said the subscription is gone (404/410). */
export async function deletePushDeviceById({ db, id }: { db: DrizzleDb; id: string }): Promise<void> {
  await db.delete(pushDevices).where(eq(pushDevices.id, id));
}

export async function deleteExpiredNotifications({ db, now = Date.now() }: { db: DrizzleDb; now?: number }) {
  await db.delete(notifications).where(lt(notifications.expiresAt, now));
}

interface AnnouncementInput {
  db: DrizzleDb;
  /** Omit both to reach every restaurant. countryCode is ISO alpha-3, like restaurants.country_code. */
  audience: { planCode?: (typeof PLAN_CODES)[number]; countryCode?: string };
  text: { es: { title: string; body: string }; en: { title: string; body: string } };
  url?: string;
  endsAt?: number;
}

/**
 * Fans an announcement out at write time: one notification per targeted restaurant, all branches,
 * never pushed. For the future Qmenut ops dashboard; restaurants never write announcements.
 */
export async function publishAnnouncement({ db, audience, text, url, endsAt }: AnnouncementInput): Promise<string> {
  const announcementId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = Math.min(endsAt ?? Number.POSITIVE_INFINITY, now + NOTIFICATION_RETENTION_MS);
  const facts: NotificationFacts = {
    titleEs: text.es.title,
    bodyEs: text.es.body,
    titleEn: text.en.title,
    bodyEn: text.en.body,
    url: url ?? null,
  };
  const planFilter = audience.planCode
    ? sql`AND EXISTS (SELECT 1 FROM branches b WHERE b.restaurant_id = r.id AND b.deleted_at IS NULL AND b.plan_code = ${audience.planCode})`
    : sql``;
  const countryFilter = audience.countryCode ? sql`AND r.country_code = ${audience.countryCode}` : sql``;

  // Notification ids share the announcement id as prefix, which is how the recipients step finds them.
  await db.run(sql`
    INSERT INTO notifications (id, restaurant_id, branch_id, type, subject_id, facts_json, actionable, created_at, expires_at)
    SELECT ${announcementId} || ':' || r.id, r.id, NULL, 'announcement', ${announcementId} || ':' || r.id,
      ${JSON.stringify(facts)}, 0, ${now}, ${expiresAt}
    FROM restaurants r
    WHERE r.deleted_at IS NULL ${planFilter} ${countryFilter}
  `);
  const idPattern = `${announcementId}:%`;
  await insertRecipients(db, sql`n.id LIKE ${idPattern}`);

  return announcementId;
}
