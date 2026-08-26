import {
  categoryActivityDaily,
  contactActionDaily,
  dishViewDaily,
  eventCounterDaily,
  hourlyActivityDaily,
  menuViewDaily,
  promotionOpenDaily,
} from "@qmenut/db/schema";
import { eq } from "drizzle-orm";

import type {
  CategoryActivityRow,
  ContactActionRow,
  DishOpenRow,
  EventCounterRow,
  HourlyActivityRow,
  MenuLoadRow,
  PromotionOpenRow,
} from "./analytics-queries";
import type { DrizzleDb } from "@qmenut/db/client";
import type { BatchItem } from "drizzle-orm/batch";

/** Divide filas en lotes que respetan el límite conservador de parámetros por consulta D1. */
function chunkRows<T>(rows: T[], columnsPerRow: number): T[][] {
  const size = Math.max(1, Math.floor(90 / columnsPerRow));
  const batches: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    batches.push(rows.slice(index, index + size));
  }

  return batches;
}

export interface AnalyticsDayRows {
  categories: CategoryActivityRow[];
  contacts: ContactActionRow[];
  counters: EventCounterRow[];
  dishOpens: DishOpenRow[];
  hourly: HourlyActivityRow[];
  menuLoads: MenuLoadRow[];
  promotions: PromotionOpenRow[];
}

function insertMenuLoads(db: DrizzleDb, rows: MenuLoadRow[]): BatchItem<"sqlite">[] {
  return chunkRows(rows, 7).map((batch) =>
    db.insert(menuViewDaily).values(
      batch.map((row) => ({
        branchId: row.branchId,
        day: row.day,
        languageCode: row.languageCode,
        source: row.source,
        displayMode: row.displayMode,
        views: row.loads,
        visits: row.visits,
      })),
    ),
  );
}

function insertDishOpens(db: DrizzleDb, rows: DishOpenRow[]): BatchItem<"sqlite">[] {
  return chunkRows(rows, 7).map((batch) =>
    db.insert(dishViewDaily).values(
      batch.map((row) => ({
        dishId: row.dishId,
        branchId: row.branchId,
        day: row.day,
        languageCode: row.languageCode,
        source: row.source,
        views: row.opens,
        visitsWithOpen: row.visitsWithOpen,
      })),
    ),
  );
}

function insertCategoryActivity(db: DrizzleDb, rows: CategoryActivityRow[]): BatchItem<"sqlite">[] {
  return chunkRows(rows, 8).map((batch) =>
    db.insert(categoryActivityDaily).values(
      batch.map((row) => ({
        branchId: row.branchId,
        day: row.day,
        languageCode: row.languageCode,
        categoryId: row.categoryKey,
        categoryLabel: row.categoryLabel,
        reachedCount: row.reachedCount,
        selectedCount: row.selectedCount,
        maxPosition: row.maxPosition,
      })),
    ),
  );
}

function insertPromotionOpens(db: DrizzleDb, rows: PromotionOpenRow[]): BatchItem<"sqlite">[] {
  const merged = new Map<string, PromotionOpenRow>();
  const mergedRows: PromotionOpenRow[] = [];

  for (const row of rows) {
    const key = [row.restaurantId, row.day, row.languageCode, row.promotionKey].join("\u{0}");
    const current = merged.get(key);

    if (current) {
      current.openCount += row.openCount;
    } else {
      const aggregate = { ...row };
      merged.set(key, aggregate);
      mergedRows.push(aggregate);
    }
  }

  return chunkRows(mergedRows, 6).map((batch) =>
    db.insert(promotionOpenDaily).values(
      batch.map((row) => ({
        restaurantId: row.restaurantId,
        day: row.day,
        languageCode: row.languageCode,
        promotionId: row.promotionKey,
        promotionName: row.promotionName,
        openCount: row.openCount,
      })),
    ),
  );
}

function insertEventCounters(db: DrizzleDb, rows: EventCounterRow[]): BatchItem<"sqlite">[] {
  return chunkRows(rows, 4).map((batch) =>
    db
      .insert(eventCounterDaily)
      .values(
        batch.map((row) => ({ branchId: row.branchId, day: row.day, eventCode: row.eventCode, count: row.count })),
      ),
  );
}

function insertContactActions(db: DrizzleDb, rows: ContactActionRow[]): BatchItem<"sqlite">[] {
  return chunkRows(rows, 5).map((batch) =>
    db.insert(contactActionDaily).values(
      batch.map((row) => ({
        branchId: row.branchId,
        day: row.day,
        languageCode: row.languageCode,
        channel: row.channel,
        actionCount: row.actionCount,
      })),
    ),
  );
}

function insertHourlyActivity(db: DrizzleDb, rows: HourlyActivityRow[]): BatchItem<"sqlite">[] {
  return chunkRows(rows, 4).map((batch) =>
    db
      .insert(hourlyActivityDaily)
      .values(batch.map((row) => ({ branchId: row.branchId, day: row.day, hour: row.hour, loads: row.loads }))),
  );
}

/**
 * Sustituye un día completo dentro de una única transacción D1. El borrado previo elimina
 * dimensiones que PostHog ya no devuelve y hace que repetir la operación sea idempotente.
 */
export async function replaceAnalyticsDay({
  db,
  day,
  rows,
}: {
  db: DrizzleDb;
  day: string;
  rows: AnalyticsDayRows;
}): Promise<void> {
  await db.batch([
    db.delete(menuViewDaily).where(eq(menuViewDaily.day, day)),
    db.delete(dishViewDaily).where(eq(dishViewDaily.day, day)),
    db.delete(categoryActivityDaily).where(eq(categoryActivityDaily.day, day)),
    db.delete(promotionOpenDaily).where(eq(promotionOpenDaily.day, day)),
    db.delete(eventCounterDaily).where(eq(eventCounterDaily.day, day)),
    db.delete(contactActionDaily).where(eq(contactActionDaily.day, day)),
    db.delete(hourlyActivityDaily).where(eq(hourlyActivityDaily.day, day)),
    ...insertMenuLoads(db, rows.menuLoads),
    ...insertDishOpens(db, rows.dishOpens),
    ...insertCategoryActivity(db, rows.categories),
    ...insertPromotionOpens(db, rows.promotions),
    ...insertEventCounters(db, rows.counters),
    ...insertContactActions(db, rows.contacts),
    ...insertHourlyActivity(db, rows.hourly),
  ]);
}
