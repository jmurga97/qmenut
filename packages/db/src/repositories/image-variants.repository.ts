import { and, asc, eq, exists, inArray, isNull, or } from "drizzle-orm";

import { branchPhotos, branches } from "../schema/branches";
import { imageVariants } from "../schema/images";
import { categories, dishes } from "../schema/menu";

import type { DrizzleDb } from "../client";
import type { PublicImageVariant } from "../models/image";
import type { BatchItem } from "drizzle-orm/batch";

export interface ImageVariantCatalogEntry extends PublicImageVariant {
  canonicalUrl: string;
}

export function upsertImageVariantsStatements({
  db,
  variants,
}: {
  db: DrizzleDb;
  variants: ImageVariantCatalogEntry[];
}): BatchItem<"sqlite">[] {
  return variants.map((variant) =>
    db
      .insert(imageVariants)
      .values({ ...variant, id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: [imageVariants.canonicalUrl, imageVariants.width, imageVariants.format],
        set: { height: variant.height, updatedAt: Date.now(), url: variant.url },
      }),
  );
}

export async function upsertImageVariants({
  db,
  variants,
}: {
  db: DrizzleDb;
  variants: ImageVariantCatalogEntry[];
}): Promise<void> {
  const statements = upsertImageVariantsStatements({ db, variants });

  if (statements.length > 0) {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  }
}

export async function getImageVariantsByCanonicalUrl({
  canonicalUrls,
  db,
}: {
  canonicalUrls: string[];
  db: DrizzleDb;
}): Promise<Map<string, PublicImageVariant[]>> {
  const urls = [...new Set(canonicalUrls)];
  const queries = [];

  // D1 allows at most 100 bound parameters in a statement, including in an IN clause.
  for (let index = 0; index < urls.length; index += 100) {
    const batch = urls.slice(index, index + 100);
    const query = db
      .select({
        canonicalUrl: imageVariants.canonicalUrl,
        format: imageVariants.format,
        height: imageVariants.height,
        url: imageVariants.url,
        width: imageVariants.width,
      })
      .from(imageVariants)
      .where(inArray(imageVariants.canonicalUrl, batch))
      .orderBy(asc(imageVariants.width), asc(imageVariants.url));
    queries.push(query);
  }

  if (queries.length === 0) return new Map();
  const [firstQuery, ...remainingQueries] = queries;

  const batches = await db.batch([firstQuery, ...remainingQueries]);
  const rows = batches.flat();
  const result = new Map<string, PublicImageVariant[]>();

  for (const row of rows) {
    const existing = result.get(row.canonicalUrl);
    const variant = { format: row.format, height: row.height, url: row.url, width: row.width };

    if (existing) {
      existing.push(variant);
    } else {
      result.set(row.canonicalUrl, [variant]);
    }
  }

  return result;
}

function imageReferenceHostsQuery({ db, urls }: { db: DrizzleDb; urls: string[] }) {
  const photoFilter = and(eq(branchPhotos.branchId, branches.id), inArray(branchPhotos.url, urls));
  const categoryFilter = and(
    eq(categories.branchId, branches.id),
    isNull(categories.deletedAt),
    inArray(categories.imageUrl, urls),
  );
  const dishFilter = and(eq(dishes.branchId, branches.id), isNull(dishes.deletedAt), inArray(dishes.imageUrl, urls));
  const photoQuery = db.select({ id: branchPhotos.id }).from(branchPhotos).where(photoFilter);
  const categoryQuery = db.select({ id: categories.id }).from(categories).where(categoryFilter);
  const dishQuery = db.select({ id: dishes.id }).from(dishes).where(dishFilter);
  const references = or(inArray(branches.logoUrl, urls), exists(photoQuery), exists(categoryQuery), exists(dishQuery));
  const filter = and(isNull(branches.deletedAt), references);
  return db.select({ host: branches.customDomain }).from(branches).where(filter);
}

export async function getImageReferenceHosts({
  db,
  canonicalUrls,
}: {
  db: DrizzleDb;
  canonicalUrls: string[];
}): Promise<string[]> {
  const urls = [...new Set(canonicalUrls)];
  const queries = [];
  // Each URL occurs in four predicates; keep the entire statement within 100 bindings.
  for (let index = 0; index < urls.length; index += 25) {
    queries.push(imageReferenceHostsQuery({ db, urls: urls.slice(index, index + 25) }));
  }
  if (queries.length === 0) return [];
  const [firstQuery, ...remainingQueries] = queries;

  const batches = await db.batch([firstQuery, ...remainingQueries]);
  const rows = batches.flat();
  return [...new Set(rows.flatMap(({ host }) => (host ? [host] : [])))];
}
