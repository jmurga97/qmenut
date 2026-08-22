// QMenut · Carga reproducible de contenido público para un tenant existente.
//
//   bun scripts/load-tenant-content.ts --file demo-tenants/cafe.content.json
//     [--remote --env production|development] [--host host] [--force] [--dry-run]

// Resuelve el tenant por host, valida las imágenes antes de escribir, actualiza los
// datos públicos de contacto e inserta fotos, carta, relaciones y promociones. Al
// terminar, cambia menuVersion en TENANT_THEME para invalidar la caché del menú.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { z } from "zod";

import { describeTenantTarget, getD1TargetArgs, getKvTargetArgs, resolveTenantEnvironment } from "./tenant-environment";

import type { TenantEnvironmentName } from "./tenant-environment";

const API_DIR = path.resolve(import.meta.dir, "..");
const TENANT_CONFIG_DIR = path.resolve(API_DIR, "../tenant-config");

const KEY_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
const HOST_PATTERN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const TAG_CODES = ["vegan", "gluten_free", "lactose_free", "spicy", "contains_alcohol", "new", "seasonal"] as const;
const ALLERGEN_CODES = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soybeans",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const;

const keySchema = z.string().regex(KEY_PATTERN, "usa minúsculas, números, guiones o guion bajo");
const nullableText = z.string().trim().min(1).nullable().optional().default(null);

const creditedImageSchema = z
  .object({
    url: z.url(),
    sourceUrl: z.url(),
    photographer: z.string().trim().min(1),
  })
  .superRefine((image, ctx) => {
    const imageUrl = new URL(image.url);
    const sourceUrl = new URL(image.sourceUrl);

    if (imageUrl.hostname !== "images.unsplash.com") {
      ctx.addIssue({ code: "custom", path: ["url"], message: "la imagen debe usar images.unsplash.com (no Plus)" });
    }

    if (sourceUrl.hostname !== "unsplash.com" || !sourceUrl.pathname.startsWith("/photos/")) {
      ctx.addIssue({ code: "custom", path: ["sourceUrl"], message: "indica la página pública de la foto en Unsplash" });
    }
  });

const availabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(0).max(1439),
  })
  .refine((window) => window.startMinute < window.endMinute, "startMinute debe ser menor que endMinute");

const variantOptionSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1).max(200),
  priceDelta: z.number().int().min(0).default(0),
  position: z.number().int().min(0).default(0),
});

const variantGroupSchema = z
  .object({
    key: keySchema,
    name: z.string().trim().min(1).max(200),
    selectionType: z.enum(["single", "multiple"]),
    isRequired: z.boolean().default(false),
    minSelect: z.number().int().min(0).default(0),
    maxSelect: z.number().int().min(0).nullable().default(null),
    position: z.number().int().min(0).default(0),
    options: z.array(variantOptionSchema).min(1),
  })
  .refine((group) => group.maxSelect === null || group.maxSelect >= group.minSelect, {
    path: ["maxSelect"],
    message: "maxSelect debe ser mayor o igual que minSelect",
  });

const dishSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1).max(200),
  description: nullableText,
  price: z.number().int().min(0),
  image: creditedImageSchema,
  position: z.number().int().min(0).default(0),
  isRecommended: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.enum(TAG_CODES)).default([]),
  allergens: z.array(z.enum(ALLERGEN_CODES)).default([]),
  extraKeys: z.array(keySchema).default([]),
  availability: z.array(availabilitySchema).default([]),
  variantGroups: z.array(variantGroupSchema).default([]),
});

const categorySchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1).max(200),
  description: nullableText,
  image: creditedImageSchema.nullable().optional().default(null),
  position: z.number().int().min(0).default(0),
  dishes: z.array(dishSchema).min(1),
});

const ingredientSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1).max(200),
  price: z.number().int().min(0),
});

const promotionSchema = z.object({
  key: keySchema,
  type: z.enum(["percentage_discount", "special_price", "daily_menu", "happy_hour", "two_for_one"]),
  scope: z.enum(["info", "branch", "category", "dish"]),
  name: z.string().trim().min(1).max(200),
  description: nullableText,
  percentage: z.number().int().min(0).max(100).nullable().optional().default(null),
  specialPrice: z.number().int().min(0).nullable().optional().default(null),
  buyQuantity: z.number().int().min(1).nullable().optional().default(null),
  paidQuantity: z.number().int().min(1).nullable().optional().default(null),
  priority: z.number().int().min(0).default(0),
  startsAt: z.number().int().nullable().optional().default(null),
  endsAt: z.number().int().nullable().optional().default(null),
  recurringDays: z.array(z.number().int().min(1).max(7)).default([]),
  recurringStartMinute: z.number().int().min(0).max(1439).nullable().optional().default(null),
  recurringEndMinute: z.number().int().min(0).max(1439).nullable().optional().default(null),
  targetKeys: z.array(keySchema).default([]),
});

const contentFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    host: z.string().regex(HOST_PATTERN, "host en minúsculas, sin esquema ni puerto"),
    contact: z.object({
      name: z.string().trim().min(1).max(200),
      address: z.string().trim().min(1),
      phone: nullableText,
      whatsapp: nullableText,
      socialLinks: z.record(z.string(), z.url()).default({}),
    }),
    photos: z.array(creditedImageSchema).min(1),
    ingredients: z.array(ingredientSchema).default([]),
    categories: z.array(categorySchema).min(1),
    promotions: z.array(promotionSchema).default([]),
  })
  .superRefine((content, ctx) => {
    validateUniqueKeys({ ctx, keys: content.categories.map((category) => category.key), path: ["categories"] });
    validateUniqueKeys({ ctx, keys: content.ingredients.map((ingredient) => ingredient.key), path: ["ingredients"] });
    validateUniqueKeys({ ctx, keys: content.promotions.map((promotion) => promotion.key), path: ["promotions"] });

    const dishes = content.categories.flatMap((category) => category.dishes);
    validateUniqueKeys({ ctx, keys: dishes.map((dish) => dish.key), path: ["categories"] });

    if (dishes.filter((dish) => dish.isFeatured).length !== 1) {
      ctx.addIssue({ code: "custom", path: ["categories"], message: "debe existir exactamente un plato destacado" });
    }

    const ingredientKeys = new Set(content.ingredients.map((ingredient) => ingredient.key));
    const categoryKeys = new Set(content.categories.map((category) => category.key));
    const dishKeys = new Set(dishes.map((dish) => dish.key));

    for (const [dishIndex, dish] of dishes.entries()) {
      for (const extraKey of dish.extraKeys) {
        if (!ingredientKeys.has(extraKey)) {
          ctx.addIssue({
            code: "custom",
            path: ["categories", dishIndex, "extraKeys"],
            message: `extra desconocido: ${extraKey}`,
          });
        }
      }

      validateUniqueKeys({
        ctx,
        keys: dish.variantGroups.map((group) => group.key),
        path: ["categories", dishIndex, "variantGroups"],
      });

      for (const [groupIndex, group] of dish.variantGroups.entries()) {
        validateUniqueKeys({
          ctx,
          keys: group.options.map((option) => option.key),
          path: ["categories", dishIndex, "variantGroups", groupIndex, "options"],
        });
      }
    }

    for (const [promotionIndex, promotion] of content.promotions.entries()) {
      validatePromotion({ ctx, promotion, promotionIndex, categoryKeys, dishKeys });
    }

    const imageUrls = [
      ...content.photos.map((photo) => photo.url),
      ...content.categories.flatMap((category) => [
        ...(category.image ? [category.image.url] : []),
        ...category.dishes.map((dish) => dish.image.url),
      ]),
    ];

    validateUniqueKeys({ ctx, keys: imageUrls, path: ["photos"], label: "URL de imagen" });
  });

type ContentFile = z.infer<typeof contentFileSchema>;
type PromotionInput = z.infer<typeof promotionSchema>;

interface CliOptions {
  environment: TenantEnvironmentName;
  file: string;
  host?: string;
  remote: boolean;
  force: boolean;
  dryRun: boolean;
}

interface TenantIds {
  branchId: string;
  restaurantId: string;
}

interface ExistingCounts {
  categories: number;
  dishes: number;
  photos: number;
  promotions: number;
}

function validateUniqueKeys({
  ctx,
  keys,
  path,
  label = "key",
}: {
  ctx: z.RefinementCtx;
  keys: string[];
  path: PropertyKey[];
  label?: string;
}): void {
  const seen = new Set<string>();

  for (const key of keys) {
    if (seen.has(key)) {
      ctx.addIssue({ code: "custom", path, message: `${label} duplicado: ${key}` });
    }

    seen.add(key);
  }
}

function validatePromotion({
  categoryKeys,
  ctx,
  dishKeys,
  promotion,
  promotionIndex,
}: {
  categoryKeys: Set<string>;
  ctx: z.RefinementCtx;
  dishKeys: Set<string>;
  promotion: PromotionInput;
  promotionIndex: number;
}): void {
  const path = ["promotions", promotionIndex];

  if (promotion.scope === "info" || promotion.scope === "branch") {
    if (promotion.targetKeys.length > 0) {
      ctx.addIssue({ code: "custom", path: [...path, "targetKeys"], message: "este alcance no admite targets" });
    }
  } else {
    const knownKeys = promotion.scope === "category" ? categoryKeys : dishKeys;

    if (promotion.targetKeys.length === 0) {
      ctx.addIssue({ code: "custom", path: [...path, "targetKeys"], message: "selecciona al menos un target" });
    }

    for (const targetKey of promotion.targetKeys) {
      if (!knownKeys.has(targetKey)) {
        ctx.addIssue({ code: "custom", path: [...path, "targetKeys"], message: `target desconocido: ${targetKey}` });
      }
    }
  }

  if (promotion.type === "percentage_discount" && promotion.percentage === null) {
    ctx.addIssue({ code: "custom", path: [...path, "percentage"], message: "indica un porcentaje" });
  }

  if ((promotion.type === "special_price" || promotion.type === "daily_menu") && promotion.specialPrice === null) {
    ctx.addIssue({ code: "custom", path: [...path, "specialPrice"], message: "indica un precio" });
  }

  if (promotion.type === "happy_hour" && promotion.percentage === null && promotion.specialPrice === null) {
    ctx.addIssue({ code: "custom", path: [...path, "percentage"], message: "indica porcentaje o precio" });
  }

  if (
    promotion.type === "two_for_one" &&
    (promotion.buyQuantity === null ||
      promotion.paidQuantity === null ||
      promotion.paidQuantity > promotion.buyQuantity)
  ) {
    ctx.addIssue({ code: "custom", path, message: "two_for_one requiere cantidades válidas" });
  }
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseArgs(argv: string[]): CliOptions {
  let file: string | undefined;
  let selectedEnvironment: string | undefined;
  let host: string | undefined;
  let remote = false;
  let force = false;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--file") {
      file = argv[++index];
    } else if (arg === "--env") {
      selectedEnvironment = argv[++index];
    } else if (arg === "--host") {
      host = argv[++index];

      if (!host || !HOST_PATTERN.test(host)) {
        fail("--host debe ser un hostname en minúsculas, sin esquema ni puerto");
      }
    } else if (arg === "--remote") {
      remote = true;
    } else if (arg === "--force") {
      force = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else {
      fail(`Argumento desconocido: ${arg}`);
    }
  }

  if (!file) {
    fail("Falta --file <content.json>");
  }

  let environment: TenantEnvironmentName;
  try {
    environment = resolveTenantEnvironment({ remote, selected: selectedEnvironment });
  } catch (error) {
    fail(errorMessage(error));
  }

  return { environment, file: path.resolve(process.cwd(), file), host, remote, force, dryRun };
}

function esc(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function escOrNull(value: string | null): string {
  return value === null ? "NULL" : esc(value);
}

function intOrNull(value: number | null): string {
  return value === null ? "NULL" : String(value);
}

function runWrangler(args: string[], cwd: string): string {
  const result = spawnSync("bunx", ["wrangler", ...args], { cwd, encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(`wrangler ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }

  return result.stdout;
}

function queryRows<T>(command: string, options: CliOptions): T[] {
  const stdout = runWrangler(
    ["d1", "execute", "DB", ...getD1TargetArgs(options.environment, options.remote), "--json", "--command", command],
    API_DIR,
  );
  const batches = JSON.parse(stdout) as Array<{ results: T[] }>;
  return batches.flatMap((batch) => batch.results);
}

function resolveTenant(host: string, options: CliOptions): TenantIds | null {
  const rows = queryRows<TenantIds & { deletedAt: number | null }>(
    `SELECT id AS branchId, restaurant_id AS restaurantId, deleted_at AS deletedAt FROM branches WHERE custom_domain = ${esc(host)}`,
    options,
  );

  if (rows.length === 0) return null;

  if (rows.length !== 1 || rows[0]?.deletedAt !== null) {
    fail(`No existe una sucursal activa y única para ${host}. Ejecuta tenant:create primero.`);
  }

  return rows[0];
}

function getExistingCounts(ids: TenantIds, options: CliOptions): ExistingCounts {
  const rows = queryRows<{
    categories: number;
    dishes: number;
    photos: number;
    promotions: number;
  }>(
    `SELECT ` +
      `(SELECT COUNT(*) FROM categories WHERE branch_id = ${esc(ids.branchId)} AND deleted_at IS NULL) AS categories, ` +
      `(SELECT COUNT(*) FROM dishes WHERE branch_id = ${esc(ids.branchId)} AND deleted_at IS NULL) AS dishes, ` +
      `(SELECT COUNT(*) FROM branch_photos WHERE branch_id = ${esc(ids.branchId)}) AS photos, ` +
      `(SELECT COUNT(*) FROM promotions WHERE branch_id = ${esc(ids.branchId)} AND deleted_at IS NULL) AS promotions`,
    options,
  );

  return rows[0] ?? { categories: 0, dishes: 0, photos: 0, promotions: 0 };
}

function assertContentWritable(ids: TenantIds, options: CliOptions): void {
  const counts = getExistingCounts(ids, options);
  const total = counts.categories + counts.dishes + counts.photos + counts.promotions;

  if (total > 0 && !options.force) {
    fail(
      `La sucursal ya tiene contenido (${counts.categories} categorías, ${counts.dishes} platos, ` +
        `${counts.photos} fotos, ${counts.promotions} promociones). Usa --force para reemplazarlo.`,
    );
  }
}

function stableId(host: string, kind: string, key: string): string {
  return `demo_${host.replaceAll(/[^a-z0-9]+/g, "_")}_${kind}_${key}`;
}

async function assertImageReachable(image: z.infer<typeof creditedImageSchema>): Promise<void> {
  const response = await fetch(image.url, { method: "HEAD", redirect: "follow" });
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !contentType.startsWith("image/")) {
    throw new Error(`${image.url} devolvió ${response.status} (${contentType || "sin content-type"})`);
  }
}

async function verifyImages(content: ContentFile): Promise<void> {
  const images = [
    ...content.photos,
    ...content.categories.flatMap((category) => [
      ...(category.image ? [category.image] : []),
      ...category.dishes.map((dish) => dish.image),
    ]),
  ];

  for (let index = 0; index < images.length; index += 8) {
    await Promise.all(images.slice(index, index + 8).map(assertImageReachable));
  }
}

function buildCleanupSql(ids: TenantIds): string[] {
  const restaurantId = esc(ids.restaurantId);
  const branchId = esc(ids.branchId);

  return [
    "-- --force: reemplaza exclusivamente el contenido público de esta sucursal.",
    `DELETE FROM translations WHERE restaurant_id = ${restaurantId} AND entity_id IN (` +
      `SELECT id FROM categories WHERE branch_id = ${branchId} UNION ` +
      `SELECT id FROM dishes WHERE branch_id = ${branchId} UNION ` +
      `SELECT id FROM dish_variant_groups WHERE dish_id IN (SELECT id FROM dishes WHERE branch_id = ${branchId}) UNION ` +
      `SELECT id FROM dish_variant_options WHERE group_id IN (` +
      `SELECT id FROM dish_variant_groups WHERE dish_id IN (SELECT id FROM dishes WHERE branch_id = ${branchId})) UNION ` +
      `SELECT id FROM ingredients WHERE restaurant_id = ${restaurantId});`,
    `DELETE FROM promotions WHERE branch_id = ${branchId};`,
    `DELETE FROM categories WHERE branch_id = ${branchId};`,
    `DELETE FROM ingredients WHERE restaurant_id = ${restaurantId};`,
    `DELETE FROM branch_photos WHERE branch_id = ${branchId};`,
    "",
  ];
}

function buildSql(content: ContentFile, ids: TenantIds, force: boolean): string {
  const now = Date.now();
  const lines = ["-- Generado por scripts/load-tenant-content.ts — no editar a mano.", ""];
  const branchId = esc(ids.branchId);
  const restaurantId = esc(ids.restaurantId);

  if (force) {
    lines.push(...buildCleanupSql(ids));
  }

  lines.push(
    "-- Contacto público de la sucursal.",
    `UPDATE branches SET name = ${esc(content.contact.name)}, address = ${esc(content.contact.address)}, ` +
      `phone = ${escOrNull(content.contact.phone)}, whatsapp = ${escOrNull(content.contact.whatsapp)}, ` +
      `social_links_json = ${esc(JSON.stringify(content.contact.socialLinks))}, updated_at = ${now} ` +
      `WHERE id = ${branchId} AND restaurant_id = ${restaurantId};`,
    "",
  );

  for (const [position, photo] of content.photos.entries()) {
    lines.push(
      `INSERT INTO branch_photos (id, branch_id, url, position, created_at) VALUES (` +
        `${esc(stableId(content.host, "photo", String(position + 1)))}, ${branchId}, ${esc(photo.url)}, ${position}, ${now});`,
    );
  }

  lines.push("");

  for (const ingredient of content.ingredients) {
    lines.push(
      `INSERT INTO ingredients (id, restaurant_id, name, price, is_active, created_at, updated_at) VALUES (` +
        `${esc(stableId(content.host, "ingredient", ingredient.key))}, ${restaurantId}, ${esc(ingredient.name)}, ` +
        `${ingredient.price}, 1, ${now}, ${now});`,
    );
  }

  if (content.ingredients.length > 0) {
    lines.push("");
  }

  for (const category of content.categories) {
    const categoryId = stableId(content.host, "category", category.key);
    lines.push(
      `INSERT INTO categories (id, restaurant_id, branch_id, name, description, image_url, position, is_active, created_at, updated_at) VALUES (` +
        `${esc(categoryId)}, ${restaurantId}, ${branchId}, ${esc(category.name)}, ${escOrNull(category.description)}, ` +
        `${escOrNull(category.image?.url ?? null)}, ${category.position}, 1, ${now}, ${now});`,
    );

    for (const dish of category.dishes) {
      const dishId = stableId(content.host, "dish", dish.key);
      lines.push(
        `INSERT INTO dishes (id, restaurant_id, branch_id, category_id, name, description, price, image_url, position, is_active, is_recommended, is_featured, created_at, updated_at) VALUES (` +
          `${esc(dishId)}, ${restaurantId}, ${branchId}, ${esc(categoryId)}, ${esc(dish.name)}, ` +
          `${escOrNull(dish.description)}, ${dish.price}, ${esc(dish.image.url)}, ${dish.position}, 1, ` +
          `${dish.isRecommended ? 1 : 0}, ${dish.isFeatured ? 1 : 0}, ${now}, ${now});`,
      );

      for (const tagCode of dish.tags) {
        lines.push(
          `INSERT INTO dish_tags (dish_id, tag_id) SELECT ${esc(dishId)}, id FROM tags ` +
            `WHERE is_system = 1 AND code = ${esc(tagCode)};`,
        );
      }

      for (const allergenCode of dish.allergens) {
        lines.push(
          `INSERT INTO dish_allergens (dish_id, allergen_id) SELECT ${esc(dishId)}, id FROM allergens ` +
            `WHERE code = ${esc(allergenCode)};`,
        );
      }

      for (const [position, extraKey] of dish.extraKeys.entries()) {
        lines.push(
          `INSERT INTO dish_extras (dish_id, ingredient_id, position) VALUES (` +
            `${esc(dishId)}, ${esc(stableId(content.host, "ingredient", extraKey))}, ${position});`,
        );
      }

      for (const [windowIndex, window] of dish.availability.entries()) {
        lines.push(
          `INSERT INTO dish_availability_windows (id, dish_id, day_of_week, start_minute, end_minute) VALUES (` +
            `${esc(stableId(content.host, "availability", `${dish.key}_${windowIndex + 1}`))}, ${esc(dishId)}, ` +
            `${window.dayOfWeek}, ${window.startMinute}, ${window.endMinute});`,
        );
      }

      for (const group of dish.variantGroups) {
        const groupId = stableId(content.host, "variant_group", `${dish.key}_${group.key}`);
        lines.push(
          `INSERT INTO dish_variant_groups (id, dish_id, name, selection_type, is_required, min_select, max_select, position, created_at, updated_at) VALUES (` +
            `${esc(groupId)}, ${esc(dishId)}, ${esc(group.name)}, ${esc(group.selectionType)}, ` +
            `${group.isRequired ? 1 : 0}, ${group.minSelect}, ${intOrNull(group.maxSelect)}, ${group.position}, ${now}, ${now});`,
        );

        for (const option of group.options) {
          lines.push(
            `INSERT INTO dish_variant_options (id, group_id, name, price_delta, position, is_active, created_at, updated_at) VALUES (` +
              `${esc(stableId(content.host, "variant_option", `${dish.key}_${group.key}_${option.key}`))}, ` +
              `${esc(groupId)}, ${esc(option.name)}, ${option.priceDelta}, ${option.position}, 1, ${now}, ${now});`,
          );
        }
      }
    }

    lines.push("");
  }

  for (const promotion of content.promotions) {
    const promotionId = stableId(content.host, "promotion", promotion.key);
    const recurringDays = promotion.recurringDays.length > 0 ? promotion.recurringDays.join(",") : null;
    lines.push(
      `INSERT INTO promotions (id, restaurant_id, branch_id, type, scope, name, description, percentage, special_price, buy_quantity, paid_quantity, priority, starts_at, ends_at, is_recurring, recurring_days, recurring_start_minute, recurring_end_minute, status, created_at, updated_at) VALUES (` +
        `${esc(promotionId)}, ${restaurantId}, ${branchId}, ${esc(promotion.type)}, ${esc(promotion.scope)}, ` +
        `${esc(promotion.name)}, ${escOrNull(promotion.description)}, ${intOrNull(promotion.percentage)}, ` +
        `${intOrNull(promotion.specialPrice)}, ${intOrNull(promotion.buyQuantity)}, ${intOrNull(promotion.paidQuantity)}, ` +
        `${promotion.priority}, ${intOrNull(promotion.startsAt)}, ${intOrNull(promotion.endsAt)}, ` +
        `${promotion.recurringDays.length > 0 ? 1 : 0}, ${escOrNull(recurringDays)}, ` +
        `${intOrNull(promotion.recurringStartMinute)}, ${intOrNull(promotion.recurringEndMinute)}, 'active', ${now}, ${now});`,
    );

    const targetType = promotion.scope === "category" ? "category" : "dish";
    for (const targetKey of promotion.targetKeys) {
      const targetId = stableId(content.host, targetType, targetKey);
      lines.push(
        `INSERT INTO promotion_targets (promotion_id, target_type, target_id) VALUES (` +
          `${esc(promotionId)}, ${esc(targetType)}, ${esc(targetId)});`,
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

function bumpContentVersion(host: string, options: CliOptions): void {
  runWrangler(
    [
      "kv",
      "key",
      "put",
      `menuVersion:${host}`,
      String(Date.now()),
      "--binding",
      "TENANT_THEME",
      ...getKvTargetArgs(options.environment, options.remote),
    ],
    TENANT_CONFIG_DIR,
  );
}

function verifyContent(content: ContentFile, ids: TenantIds, options: CliOptions): void {
  const expectedCategories = content.categories.length;
  const expectedDishes = content.categories.reduce((total, category) => total + category.dishes.length, 0);
  const expectedPhotos = content.photos.length;
  const expectedPromotions = content.promotions.length;
  const counts = getExistingCounts(ids, options);

  if (
    counts.categories !== expectedCategories ||
    counts.dishes !== expectedDishes ||
    counts.photos !== expectedPhotos ||
    counts.promotions !== expectedPromotions
  ) {
    throw new Error(
      `Conteos inesperados. Recibido ${JSON.stringify(counts)}, esperado ` +
        `${JSON.stringify({ categories: expectedCategories, dishes: expectedDishes, photos: expectedPhotos, promotions: expectedPromotions })}`,
    );
  }

  const rows = queryRows<{ address: string | null; name: string; phone: string | null }>(
    `SELECT name, address, phone FROM branches WHERE id = ${esc(ids.branchId)}`,
    options,
  );

  if (rows[0]?.name !== content.contact.name || rows[0]?.address !== content.contact.address) {
    throw new Error("La verificación de contacto no coincide con el manifiesto");
  }
}

const options = parseArgs(process.argv.slice(2));

let rawJson: unknown;
try {
  rawJson = JSON.parse(readFileSync(options.file, "utf8"));
} catch (error) {
  fail(`No se pudo leer ${options.file}: ${errorMessage(error)}`);
}

const parsed = contentFileSchema.safeParse(rawJson);
if (!parsed.success) {
  fail(`JSON de contenido inválido:\n${z.prettifyError(parsed.error)}`);
}

const content = options.host ? { ...parsed.data, host: options.host } : parsed.data;
console.log(`→ Destino: ${describeTenantTarget(options.environment, options.remote)}`);
console.log(`→ Host: ${content.host}`);
const resolvedIds = resolveTenant(content.host, options);

if (!resolvedIds && !options.dryRun) {
  fail(`No existe una sucursal activa para ${content.host}. Ejecuta tenant:create primero.`);
}

const ids = resolvedIds ?? {
  branchId: "dry_run_branch_resolved_by_host",
  restaurantId: "dry_run_restaurant_resolved_by_host",
};

if (resolvedIds) {
  assertContentWritable(resolvedIds, options);
}

console.log("→ Verificando imágenes…");
try {
  await verifyImages(content);
} catch (error) {
  fail(`Falló la verificación de imágenes: ${errorMessage(error)}`);
}

const sql = buildSql(content, ids, options.force);

if (options.dryRun) {
  if (!resolvedIds) {
    console.log(`-- Preflight sin escritura: ${content.host} todavía no existe en D1.`);
  }
  console.log(sql);
  console.log(
    `-- ${content.categories.length} categorías · ${content.categories.flatMap((c) => c.dishes).length} platos`,
  );
  process.exit(0);
}

const tmpDir = mkdtempSync(path.join(tmpdir(), "qmenut-content-"));
try {
  const sqlFile = path.join(tmpDir, "load-content.sql");
  writeFileSync(sqlFile, sql);

  console.log(`→ Cargando contenido en D1 (${options.remote ? "--remote" : "--local"})…`);
  runWrangler(
    ["d1", "execute", "DB", ...getD1TargetArgs(options.environment, options.remote), "--file", sqlFile],
    API_DIR,
  );

  console.log("→ Verificando contenido…");
  verifyContent(content, ids, options);

  console.log("→ Invalidando caché pública…");
  bumpContentVersion(content.host, options);
} catch (error) {
  fail(`No se pudo cargar el contenido: ${errorMessage(error)}`);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\n✓ Contenido publicado para https://${content.host}`);
