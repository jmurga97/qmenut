import { createDb } from "@qmenut/db/client";
import { analyticsSyncState } from "@qmenut/db/schema";
import * as Sentry from "@sentry/cloudflare";
import { eq, sql } from "drizzle-orm";

import { parseEnv } from "@/config/env";

import {
  fetchCategoryActivity,
  fetchContactActions,
  fetchDishOpens,
  fetchEventCounters,
  fetchHourlyActivity,
  fetchMenuLoads,
  fetchPromotionOpens,
} from "./analytics-queries";
import { PostHogQueryError } from "./posthog.client";
import { replaceAnalyticsDay } from "./sync-upserts";

import type { EnvBindings, RuntimeEnv } from "@/config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";

/**
 * Sincronización PostHog → D1. La primera ejecución materializa 90 días completos y las
 * siguientes recalculan los últimos tres. Cada día sustituye todas sus dimensiones dentro de
 * una transacción D1, por lo que los reintentos son idempotentes y eliminan filas obsoletas.
 */

const BACKFILL_DAYS = 90;
const RECOMPUTE_DAYS = 3;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface SyncAnalyticsResult {
  status: "success" | "failed";
  mode: "backfill" | "incremental";
  days: string[];
  errorCode?: string;
  skippedInvalidEvents: number;
}

interface BranchOwner {
  restaurantId: string;
}

interface DishOwner extends BranchOwner {
  branchId: string;
}

interface TenantOwnership {
  branches: Map<string, BranchOwner>;
  dishes: Map<string, DishOwner>;
}

interface FetchedAggregates {
  categories: Awaited<ReturnType<typeof fetchCategoryActivity>>;
  contacts: Awaited<ReturnType<typeof fetchContactActions>>;
  counters: Awaited<ReturnType<typeof fetchEventCounters>>;
  dishOpens: Awaited<ReturnType<typeof fetchDishOpens>>;
  hourly: Awaited<ReturnType<typeof fetchHourlyActivity>>;
  menuLoads: Awaited<ReturnType<typeof fetchMenuLoads>>;
  promotions: Awaited<ReturnType<typeof fetchPromotionOpens>>;
}

interface TenantScopedRow {
  branchId: string;
  day: string;
  restaurantId: string;
}

function toUtcDay(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

function addDays(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86_400_000).toISOString().slice(0, 10);
}

function dayRange(fromDay: string, lastDay: string): string[] {
  const days: string[] = [];
  let cursor = fromDay;

  while (cursor <= lastDay) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

async function getTenantOwnership(db: DrizzleDb): Promise<TenantOwnership> {
  const branchRows = await db.all<{ id: string; restaurantId: string }>(sql`
    SELECT b.id, b.restaurant_id AS restaurant_id
    FROM branches b
    JOIN restaurants r ON r.id = b.restaurant_id
    WHERE r.deleted_at IS NULL AND b.deleted_at IS NULL AND b.is_active = 1
  `);
  const dishRows = await db.all<{ id: string; branchId: string; restaurantId: string }>(sql`
    SELECT d.id, d.branch_id AS branch_id, d.restaurant_id AS restaurant_id
    FROM dishes d
    JOIN branches b ON b.id = d.branch_id AND b.restaurant_id = d.restaurant_id
    JOIN restaurants r ON r.id = d.restaurant_id
    WHERE d.deleted_at IS NULL AND d.is_active = 1
      AND b.deleted_at IS NULL AND b.is_active = 1 AND r.deleted_at IS NULL
  `);

  return {
    branches: new Map(branchRows.map((row) => [row.id, { restaurantId: row.restaurantId }])),
    dishes: new Map(dishRows.map((row) => [row.id, { branchId: row.branchId, restaurantId: row.restaurantId }])),
  };
}

async function fetchAllFamilies({
  env,
  firstDay,
  lastDay,
}: {
  env: RuntimeEnv;
  firstDay: string;
  lastDay: string;
}): Promise<FetchedAggregates> {
  const range = { env, fromDay: firstDay, toDay: lastDay };
  const [menuLoads, dishOpens, categories, promotions] = await Promise.all([
    fetchMenuLoads(range),
    fetchDishOpens(range),
    fetchCategoryActivity(range),
    fetchPromotionOpens(range),
  ]);
  const [counters, contacts, hourly] = await Promise.all([
    fetchEventCounters(range),
    fetchContactActions(range),
    fetchHourlyActivity(range),
  ]);

  return { categories, contacts, counters, dishOpens, hourly, menuLoads, promotions };
}

function dropInvalidEvents({
  aggregates,
  ownership,
  validDays,
}: {
  aggregates: FetchedAggregates;
  ownership: TenantOwnership;
  validDays: Set<string>;
}): { filtered: FetchedAggregates; skipped: number } {
  let skipped = 0;

  const keepBranchRow = (row: TenantScopedRow): boolean => {
    const owner = ownership.branches.get(row.branchId);

    if (DAY_PATTERN.test(row.day) && validDays.has(row.day) && owner?.restaurantId === row.restaurantId) {
      return true;
    }

    skipped += 1;
    return false;
  };
  const keepDishRow = (row: FetchedAggregates["dishOpens"][number]): boolean => {
    const dish = ownership.dishes.get(row.dishId);

    if (dish?.branchId === row.branchId && dish.restaurantId === row.restaurantId && keepBranchRow(row)) {
      return true;
    }

    if (dish?.branchId !== row.branchId || dish.restaurantId !== row.restaurantId) {
      skipped += 1;
    }

    return false;
  };

  return {
    filtered: {
      categories: aggregates.categories.filter((row) => keepBranchRow(row)),
      contacts: aggregates.contacts.filter((row) => keepBranchRow(row)),
      counters: aggregates.counters.filter((row) => keepBranchRow(row)),
      dishOpens: aggregates.dishOpens.filter((row) => keepDishRow(row)),
      hourly: aggregates.hourly.filter((row) => keepBranchRow(row)),
      menuLoads: aggregates.menuLoads.filter((row) => keepBranchRow(row)),
      promotions: aggregates.promotions.filter((row) => keepBranchRow(row)),
    },
    skipped,
  };
}

async function replaceRequestedDays({
  db,
  days,
  data,
}: {
  db: DrizzleDb;
  days: string[];
  data: FetchedAggregates;
}): Promise<void> {
  for (const day of days) {
    await replaceAnalyticsDay({
      db,
      day,
      rows: {
        categories: data.categories.filter((row) => row.day === day),
        contacts: data.contacts.filter((row) => row.day === day),
        counters: data.counters.filter((row) => row.day === day),
        dishOpens: data.dishOpens.filter((row) => row.day === day),
        hourly: data.hourly.filter((row) => row.day === day),
        menuLoads: data.menuLoads.filter((row) => row.day === day),
        promotions: data.promotions.filter((row) => row.day === day),
      },
    });
  }
}

async function markSuccess({
  db,
  completedAt,
  lastDay,
}: {
  db: DrizzleDb;
  completedAt: number;
  lastDay: string;
}): Promise<void> {
  await db
    .insert(analyticsSyncState)
    .values({
      scope: "posthog",
      backfillCompletedAt: completedAt,
      lastSuccessfulDay: lastDay,
      lastRunAt: completedAt,
      lastSuccessAt: completedAt,
      lastErrorCode: null,
      updatedAt: completedAt,
    })
    .onConflictDoUpdate({
      target: analyticsSyncState.scope,
      set: {
        backfillCompletedAt: sql`coalesce(${analyticsSyncState.backfillCompletedAt}, ${completedAt})`,
        lastSuccessfulDay: lastDay,
        lastRunAt: completedAt,
        lastSuccessAt: completedAt,
        lastErrorCode: null,
        updatedAt: completedAt,
      },
    });
}

async function markFailure({
  db,
  errorCode,
  failedAt,
}: {
  db: DrizzleDb;
  errorCode: string;
  failedAt: number;
}): Promise<void> {
  await db
    .insert(analyticsSyncState)
    .values({ scope: "posthog", lastRunAt: failedAt, lastErrorCode: errorCode, updatedAt: failedAt })
    .onConflictDoUpdate({
      target: analyticsSyncState.scope,
      set: { lastRunAt: failedAt, lastErrorCode: errorCode, updatedAt: failedAt },
    });
}

export async function syncAnalyticsFromPostHog(rawEnv: EnvBindings): Promise<SyncAnalyticsResult> {
  const env = parseEnv(rawEnv);
  const db = createDb(env.DB);
  const nowMs = Date.now();
  const yesterday = addDays(toUtcDay(nowMs), -1);
  const stateRow = await db.select().from(analyticsSyncState).where(eq(analyticsSyncState.scope, "posthog")).get();
  const isFirstRun = stateRow?.backfillCompletedAt === null || stateRow?.backfillCompletedAt === undefined;
  const mode: SyncAnalyticsResult["mode"] = isFirstRun ? "backfill" : "incremental";
  const lookback = isFirstRun ? BACKFILL_DAYS : RECOMPUTE_DAYS;
  const firstDay = addDays(yesterday, -(lookback - 1));
  const days = dayRange(firstDay, yesterday);

  try {
    const ownership = await getTenantOwnership(db);
    const aggregates = await fetchAllFamilies({ env, firstDay, lastDay: yesterday });
    const { filtered, skipped } = dropInvalidEvents({ aggregates, ownership, validDays: new Set(days) });

    await replaceRequestedDays({ db, days, data: filtered });
    await markSuccess({ db, completedAt: nowMs, lastDay: yesterday });

    if (skipped > 0) {
      Sentry.captureMessage("Analytics sync skipped invalid aggregate rows", {
        level: "warning",
        extra: { skipped },
        tags: { module: "analytics-sync" },
      });
    }

    return { status: "success", mode, days, skippedInvalidEvents: skipped };
  } catch (error) {
    const errorCode = error instanceof PostHogQueryError ? error.code : "UNEXPECTED_ERROR";

    Sentry.captureException(error, { tags: { errorCode, module: "analytics-sync" } });
    await markFailure({ db, errorCode, failedAt: nowMs });

    return { status: "failed", mode, days, errorCode, skippedInvalidEvents: 0 };
  }
}
