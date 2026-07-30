import { and, asc, eq, isNull } from "drizzle-orm";

import { branchPhotos, branchSchedules, branches } from "../schema/branches";

import type { DrizzleDb } from "../client";
import type { BatchItem } from "drizzle-orm/batch";

export interface AdminBranchSummary {
  id: string;
  name: string;
  customDomain: string | null;
  planCode: "basic" | "business";
  isActive: boolean;
}

interface ListBranchesInput {
  db: DrizzleDb;
  restaurantId: string;
}

export async function listBranches({ db, restaurantId }: ListBranchesInput): Promise<AdminBranchSummary[]> {
  return db
    .select({
      id: branches.id,
      name: branches.name,
      customDomain: branches.customDomain,
      planCode: branches.planCode,
      isActive: branches.isActive,
    })
    .from(branches)
    .where(and(eq(branches.restaurantId, restaurantId), isNull(branches.deletedAt)))
    .orderBy(asc(branches.createdAt))
    .all();
}

interface GetBranchInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
}

/**
 * Primitiva de autorización por sucursal: devuelve null si la sucursal no
 * pertenece al tenant, además de servir los datos de la sucursal.
 */
export async function getBranch({ db, restaurantId, branchId }: GetBranchInput) {
  const row = await db
    .select()
    .from(branches)
    .where(and(eq(branches.id, branchId), eq(branches.restaurantId, restaurantId), isNull(branches.deletedAt)))
    .get();

  return row ?? null;
}

export interface BranchScheduleRow {
  dayOfWeek: number;
  openMinute: number;
  closeMinute: number;
}

export interface BranchPhotoRow {
  url: string;
  position: number;
}

export interface BranchSettingsWriteData {
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  socialLinksJson: string | null;
}

interface UpdateBranchSettingsInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  data: BranchSettingsWriteData;
}

export function updateBranchSettingsStatements({
  db,
  restaurantId,
  branchId,
  data,
}: UpdateBranchSettingsInput): [BatchItem<"sqlite">] {
  return [
    db
      .update(branches)
      .set({
        name: data.name,
        address: data.address,
        phone: data.phone,
        whatsapp: data.whatsapp,
        socialLinksJson: data.socialLinksJson,
        updatedAt: Date.now(),
      })
      .where(and(eq(branches.id, branchId), eq(branches.restaurantId, restaurantId), isNull(branches.deletedAt))),
  ];
}

interface ListBranchSchedulesInput {
  db: DrizzleDb;
  branchId: string;
}

export async function listBranchSchedules({ db, branchId }: ListBranchSchedulesInput): Promise<BranchScheduleRow[]> {
  return db
    .select({
      dayOfWeek: branchSchedules.dayOfWeek,
      openMinute: branchSchedules.openMinute,
      closeMinute: branchSchedules.closeMinute,
    })
    .from(branchSchedules)
    .where(eq(branchSchedules.branchId, branchId))
    .orderBy(asc(branchSchedules.dayOfWeek))
    .all();
}

interface ReplaceBranchSchedulesInput {
  db: DrizzleDb;
  branchId: string;
  schedules: BranchScheduleRow[];
}

export function replaceBranchSchedulesStatements({
  db,
  branchId,
  schedules,
}: ReplaceBranchSchedulesInput): [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] {
  const remove = db.delete(branchSchedules).where(eq(branchSchedules.branchId, branchId));

  return schedules.length > 0
    ? [
        remove,
        db.insert(branchSchedules).values(
          schedules.map((schedule) => ({
            id: crypto.randomUUID(),
            branchId,
            dayOfWeek: schedule.dayOfWeek,
            openMinute: schedule.openMinute,
            closeMinute: schedule.closeMinute,
          })),
        ),
      ]
    : [remove];
}

interface ListBranchPhotosInput {
  db: DrizzleDb;
  branchId: string;
}

export async function listBranchPhotos({ db, branchId }: ListBranchPhotosInput): Promise<BranchPhotoRow[]> {
  return db
    .select({ url: branchPhotos.url, position: branchPhotos.position })
    .from(branchPhotos)
    .where(eq(branchPhotos.branchId, branchId))
    .orderBy(asc(branchPhotos.position))
    .all();
}

interface ReplaceBranchPhotosInput {
  db: DrizzleDb;
  branchId: string;
  photos: BranchPhotoRow[];
}

export function replaceBranchPhotosStatements({
  db,
  branchId,
  photos,
}: ReplaceBranchPhotosInput): [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] {
  const remove = db.delete(branchPhotos).where(eq(branchPhotos.branchId, branchId));

  return photos.length > 0
    ? [
        remove,
        db.insert(branchPhotos).values(
          photos.map((photo) => ({
            id: crypto.randomUUID(),
            branchId,
            url: photo.url,
            position: photo.position,
            createdAt: Date.now(),
          })),
        ),
      ]
    : [remove];
}
