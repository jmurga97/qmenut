import { Buffer } from "node:buffer";

import { expect, test } from "../../fixtures/test";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

const FABRICATED_MEDIA_URL = "https://media.qmenut.app/qmenut/e2e-fabricated/main.webp";
const NEW_IMAGE_GUARD_MESSAGE = "Las imágenes nuevas deben subirse desde el administrador de qmenut";
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

interface DishListItem {
  id: string;
  name: string;
}

interface DishDetail {
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  position: number;
  isActive: boolean;
  isRecommended: boolean;
  isFeatured: boolean;
}

interface CategoryListItem {
  id: string;
  name: string;
}

interface BranchSettings {
  address: string | null;
  dataProtectionEmail: string | null;
  legalAddress: string | null;
  legalName: string | null;
  latitude: number | null;
  logoUrl: string | null;
  longitude: number | null;
  name: string;
  phone: string | null;
  photos: Array<{ position: number; url: string }>;
  schedules: Array<{ closeMinute: number; dayOfWeek: number; openMinute: number }>;
  socialLinksJson: string | null;
  timezone: string;
  taxId: string | null;
  whatsapp: string | null;
}

interface BranchSaveInfo {
  name: string;
  address?: string;
  latitude: number | null;
  longitude: number | null;
  phone?: string;
  whatsapp?: string;
  socialLinksJson?: string;
  logoUrl?: string;
}

interface BranchSavePayload {
  branchId: string;
  timezone: string;
  info: BranchSaveInfo;
  legal: {
    legalName?: string;
    taxId?: string;
    legalAddress?: string;
    dataProtectionEmail?: string;
  };
  schedules: Array<{ closeMinute: number; dayOfWeek: number; openMinute: number }>;
  photos: Array<{ position: number; url: string }>;
}

function branchSaveInput(settings: BranchSettings): BranchSavePayload {
  return {
    branchId: "branch_tapas",
    timezone: settings.timezone,
    info: {
      name: settings.name,
      address: settings.address ?? undefined,
      latitude: settings.latitude,
      longitude: settings.longitude,
      phone: settings.phone ?? undefined,
      whatsapp: settings.whatsapp ?? undefined,
      socialLinksJson: settings.socialLinksJson ?? undefined,
      logoUrl: settings.logoUrl ?? undefined,
    },
    legal: {
      legalName: settings.legalName ?? undefined,
      taxId: settings.taxId ?? undefined,
      legalAddress: settings.legalAddress ?? undefined,
      dataProtectionEmail: settings.dataProtectionEmail ?? undefined,
    },
    schedules: settings.schedules.map(({ dayOfWeek, openMinute, closeMinute }) => ({
      dayOfWeek,
      openMinute,
      closeMinute,
    })),
    photos: settings.photos.map(({ url, position }) => ({ url, position })),
  };
}

function dishWriteData(detail: DishDetail, overrides?: Partial<DishDetail>): Record<string, unknown> {
  return {
    categoryId: detail.categoryId,
    name: detail.name,
    description: detail.description ?? undefined,
    price: detail.price,
    imageUrl: detail.imageUrl ?? undefined,
    position: detail.position,
    isActive: detail.isActive,
    isRecommended: detail.isRecommended,
    isFeatured: detail.isFeatured,
    ...overrides,
  };
}

async function getTapasDishDetail(page: Parameters<typeof callTrpcQuery>[0], dishId: string): Promise<DishDetail> {
  const response = await callTrpcQuery(page, "admin.menu.dishes.detail", { dishId });
  return getTrpcData<DishDetail>(response);
}

test("rejects invalid image upload requests before reaching the worker", async ({ page }) => {
  const baseInput = {
    branchId: "branch_tapas",
    purpose: "dishImage",
    filename: "plato.png",
    contentType: "image/png",
    sizeBytes: 1024,
    idempotencyKey: "e2e-image-upload-key",
  };

  const unsupportedType = await callTrpcMutation(page, "admin.images.createUpload", {
    ...baseInput,
    filename: "plato.gif",
    contentType: "image/gif",
  });
  expect(unsupportedType, unsupportedType.body).toMatchObject({ ok: false, status: 400 });

  const oversize = await callTrpcMutation(page, "admin.images.createUpload", {
    ...baseInput,
    sizeBytes: 25 * 1024 * 1024 + 1,
  });
  expect(oversize, oversize.body).toMatchObject({ ok: false, status: 400 });

  const shortIdempotencyKey = await callTrpcMutation(page, "admin.images.createUpload", {
    ...baseInput,
    idempotencyKey: "short",
  });
  expect(shortIdempotencyKey, shortIdempotencyKey.body).toMatchObject({ ok: false, status: 400 });
});

test("blocks staff from creating image uploads", async ({ staff }) => {
  const forbidden = await callTrpcMutation(staff, "admin.images.createUpload", {
    branchId: "branch_tapas",
    purpose: "dishImage",
    filename: "plato.png",
    contentType: "image/png",
    sizeBytes: 1024,
    idempotencyKey: "e2e-staff-forbidden",
  });
  expect(forbidden, forbidden.body).toMatchObject({ ok: false, status: 403 });
});

test("hides image uploads from other tenants", async ({ page }) => {
  const foreignCreate = await callTrpcMutation(page, "admin.images.createUpload", {
    branchId: "branch_fine",
    purpose: "dishImage",
    filename: "plato.png",
    contentType: "image/png",
    sizeBytes: 1024,
    idempotencyKey: "e2e-foreign-branch",
  });
  expect(foreignCreate, foreignCreate.body).toMatchObject({ ok: false, status: 404 });

  const foreignGet = await callTrpcQuery(page, "admin.images.getUpload", {
    branchId: "branch_fine",
    purpose: "dishImage",
    uploadId: crypto.randomUUID(),
  });
  expect(foreignGet, foreignGet.body).toMatchObject({ ok: false, status: 404 });
});

test("rejects fabricated media urls on dish writes and leaves data unchanged", async ({ page }) => {
  const suffix = Date.now();
  const fabricatedName = `Plato E2E imagen fabricada ${suffix}`;

  const created = await callTrpcMutation(page, "admin.menu.dishes.create", {
    branchId: "branch_tapas",
    data: {
      categoryId: "cat_tapas_tapas",
      name: fabricatedName,
      description: "",
      price: 500,
      imageUrl: FABRICATED_MEDIA_URL,
      position: 99,
      isActive: true,
      isRecommended: false,
      isFeatured: false,
    },
  });
  expect(created, created.body).toMatchObject({ ok: false, status: 400 });
  expect(created.body).toContain(NEW_IMAGE_GUARD_MESSAGE);

  const list = await callTrpcQuery(page, "admin.menu.dishes.list", { branchId: "branch_tapas" });
  expect(getTrpcData<DishListItem[]>(list).some((dish) => dish.name === fabricatedName)).toBe(false);

  const before = await getTapasDishDetail(page, "dish_tapas_bravas");
  const updated = await callTrpcMutation(page, "admin.menu.dishes.update", {
    branchId: "branch_tapas",
    dishId: "dish_tapas_bravas",
    data: dishWriteData(before, { imageUrl: FABRICATED_MEDIA_URL }),
  });
  expect(updated, updated.body).toMatchObject({ ok: false, status: 400 });
  expect(updated.body).toContain(NEW_IMAGE_GUARD_MESSAGE);

  const after = await getTapasDishDetail(page, "dish_tapas_bravas");
  expect(after.imageUrl).toBe(before.imageUrl);
  expect(after.name).toBe(before.name);
});

test("rejects fabricated media urls on categories and branch settings", async ({ page }) => {
  const suffix = Date.now();
  const fabricatedCategory = `Cat E2E fabricada ${suffix}`;

  const created = await callTrpcMutation(page, "admin.menu.categories.create", {
    branchId: "branch_tapas",
    data: {
      name: fabricatedCategory,
      description: "",
      imageUrl: FABRICATED_MEDIA_URL,
      position: 99,
      isActive: true,
    },
  });
  expect(created, created.body).toMatchObject({ ok: false, status: 400 });

  const categories = await callTrpcQuery(page, "admin.menu.categories.list", { branchId: "branch_tapas" });
  expect(getTrpcData<CategoryListItem[]>(categories).some((entry) => entry.name === fabricatedCategory)).toBe(false);

  const currentResponse = await callTrpcQuery(page, "admin.branches.get", { branchId: "branch_tapas" });
  const current = getTrpcData<BranchSettings>(currentResponse);
  const baseInput = branchSaveInput(current);

  const withFabricatedLogo = await callTrpcMutation(page, "admin.branches.save", {
    ...baseInput,
    info: { ...baseInput.info, logoUrl: FABRICATED_MEDIA_URL },
  });
  expect(withFabricatedLogo, withFabricatedLogo.body).toMatchObject({ ok: false, status: 400 });

  const withNewExternalPhoto = await callTrpcMutation(page, "admin.branches.save", {
    ...baseInput,
    photos: [
      ...current.photos.map(({ url, position }) => ({ url, position })),
      {
        url: `https://picsum.photos/seed/qmenut-e2e-${suffix}/800/600`,
        position: current.photos.length,
      },
    ],
  });
  expect(withNewExternalPhoto, withNewExternalPhoto.body).toMatchObject({ ok: false, status: 400 });

  const afterResponse = await callTrpcQuery(page, "admin.branches.get", { branchId: "branch_tapas" });
  const after = getTrpcData<BranchSettings>(afterResponse);
  expect(after.logoUrl).toBe(current.logoUrl);
  expect(after.photos).toEqual(current.photos);
});

test("keeps existing external image urls through unrelated edits", async ({ page }) => {
  const suffix = Date.now();
  const before = await getTapasDishDetail(page, "dish_tapas_bravas");

  try {
    const updated = await callTrpcMutation(page, "admin.menu.dishes.update", {
      branchId: "branch_tapas",
      dishId: "dish_tapas_bravas",
      data: dishWriteData(before, { name: `Patatas bravas E2E ${suffix}` }),
    });
    expect(updated, updated.body).toMatchObject({ ok: true, status: 200 });

    const after = await getTapasDishDetail(page, "dish_tapas_bravas");
    expect(after.name).toBe(`Patatas bravas E2E ${suffix}`);
    expect(after.imageUrl).toBe(before.imageUrl);
  } finally {
    const restored = await callTrpcMutation(page, "admin.menu.dishes.update", {
      branchId: "branch_tapas",
      dishId: "dish_tapas_bravas",
      data: dishWriteData(before),
    });
    expect(restored, restored.body).toMatchObject({ ok: true, status: 200 });
  }
});

test("renders logo and gallery controls on the branch page", async ({ page }) => {
  await page.goto("/branch");
  await expect(page.getByText("Logo (icono de la app)")).toBeVisible();
  await expect(page.getByText("Galería de la sucursal")).toBeVisible();
  await expect(page.getByText("1/20")).toBeVisible();
  await expect(page.getByText("Foto 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Añadir fotos" })).toBeVisible();
  await expect(page.getByLabel("Mover foto 1 hacia la izquierda")).toBeDisabled();
  await expect(page.getByLabel("Mover foto 1 hacia la derecha")).toBeDisabled();
});

test("manages gallery drafts locally without uploading", async ({ page }) => {
  await page.goto("/branch");
  await expect(page.getByText("1/20")).toBeVisible();

  const addInput = page.getByLabel("Añadir fotos a la galería");
  await addInput.setInputFiles([
    { name: "galeria-1.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG },
    { name: "galeria-2.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG },
  ]);
  await expect(page.getByText("3/20")).toBeVisible();
  await expect(page.getByText("Lista para guardar")).toHaveCount(2);
  await expect(page.getByLabel("Mover foto 1 hacia la derecha")).toBeEnabled();

  await page.locator("li", { hasText: "Foto 2" }).getByRole("button", { name: "Quitar" }).click();
  await expect(page.getByText("2/20")).toBeVisible();
  await expect(page.getByText("Foto 3")).toHaveCount(0);
});

test("validates category image drafts locally before any upload", async ({ page }) => {
  await page.goto("/menu/categories/new");
  await expect(page.getByText("Imagen de categoría")).toBeVisible();

  const input = page.getByLabel("Imagen de categoría");
  await input.setInputFiles({ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
  await expect(page.getByText("Selecciona una imagen JPEG, PNG o WebP.")).toBeVisible();

  await input.setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG });
  await expect(page.getByText("Lista para guardar")).toBeVisible();
  await expect(page.getByText("Selecciona una imagen JPEG, PNG o WebP.")).toBeHidden();

  await page.getByRole("button", { name: "Quitar" }).click();
  await expect(page.getByText("Elegir imagen")).toBeVisible();
  await expect(page.getByText("Lista para guardar")).toBeHidden();
});

test("renders the dish image control in the dish editor", async ({ page }) => {
  await page.goto("/menu/dishes/new");
  await expect(page.getByText("Imagen del plato")).toBeVisible();
  await expect(page.getByText("Elegir imagen").first()).toBeVisible();
});
