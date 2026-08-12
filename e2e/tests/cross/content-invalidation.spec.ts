import { expect, test } from "../../fixtures/test";
import { getContentVersion, getTenantTheme } from "../../helpers/tenant-config";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

import type { APIRequestContext, Page } from "@playwright/test";

interface InvalidationInput {
  host: string;
  mutate: () => Promise<{ body: string; ok: boolean; status: number }>;
  request: APIRequestContext;
  url: string;
}

async function expectInvalidation({ host, mutate, request, url }: InvalidationInput): Promise<void> {
  const first = await request.get(url);
  expect(first.ok(), await first.text()).toBe(true);
  await expect.poll(async () => (await request.get(url)).headers()["x-qmenut-cache"]).toBe("HIT");
  const version = await getContentVersion(request, host);
  const result = await mutate();
  expect(result, result.body).toMatchObject({ ok: true, status: 200 });
  await expect.poll(() => getContentVersion(request, host)).not.toBe(version);

  const invalidated = await request.get(url);
  expect(invalidated.ok(), await invalidated.text()).toBe(true);
  expect(invalidated.headers()["x-qmenut-cache"]).toBe("MISS");
  await expect.poll(async () => (await request.get(url)).headers()["x-qmenut-cache"]).toBe("HIT");
}

function themeWrite(theme: Record<string, unknown>) {
  return {
    template: theme.template,
    primary: theme.primary,
    secondary: theme.secondary,
    tagline: theme.tagline,
    headingFont: theme.headingFont,
    bodyFont: theme.bodyFont,
  };
}

async function branchWrite(page: Page) {
  const response = await callTrpcQuery(page, "admin.branches.get", { branchId: "branch_tapas" });
  const branch = getTrpcData<{
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    dataProtectionEmail: string | null;
    legalAddress: string | null;
    legalName: string | null;
    phone: string | null;
    whatsapp: string | null;
    socialLinksJson: string | null;
    timezone: string;
    taxId: string | null;
    schedules: Array<{ dayOfWeek: number; openMinute: number; closeMinute: number }>;
    photos: Array<{ url: string; position: number }>;
  }>(response);
  return {
    branchId: "branch_tapas",
    timezone: branch.timezone,
    info: {
      name: branch.name,
      address: branch.address ?? undefined,
      latitude: branch.latitude,
      longitude: branch.longitude,
      phone: branch.phone ?? undefined,
      whatsapp: branch.whatsapp ?? undefined,
      socialLinksJson: branch.socialLinksJson ?? undefined,
    },
    legal: {
      legalName: branch.legalName ?? undefined,
      taxId: branch.taxId ?? undefined,
      legalAddress: branch.legalAddress ?? undefined,
      dataProtectionEmail: branch.dataProtectionEmail ?? undefined,
    },
    schedules: branch.schedules.map(({ dayOfWeek, openMinute, closeMinute }) => ({
      dayOfWeek,
      openMinute,
      closeMinute,
    })),
    photos: branch.photos.map(({ url, position }) => ({ url, position })),
  };
}

test("invalidates versioned public caches for theme, promotion, branch, and translation writes", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  const herTheme = await getTenantTheme(request, "her.localhost");
  await expectInvalidation({
    host: "her.localhost",
    request,
    url: `http://her.localhost:4011/?invalidate-theme=${stamp}`,
    mutate: () =>
      callTrpcMutation(page, "admin.theme.save", {
        branchId: "branch_her",
        config: themeWrite(herTheme),
      }),
  });

  let promotionId = "";
  await expectInvalidation({
    host: "tapas.localhost",
    request,
    url: `http://tapas.localhost:4011/destacados?invalidate-promotion=${stamp}`,
    mutate: async () => {
      const promotion = await callTrpcMutation(page, "admin.promotions.create", {
        branchId: "branch_tapas",
        data: {
          type: "percentage_discount",
          scope: "dish",
          name: `Promo E2E invalidación ${stamp}`,
          description: "Invalida el menú público",
          percentage: 5,
          specialPrice: null,
          buyQuantity: null,
          paidQuantity: null,
          priority: 0,
          startsAt: null,
          endsAt: null,
          isRecurring: false,
          recurringDays: undefined,
          recurringStartMinute: null,
          recurringEndMinute: null,
          status: "active",
        },
        targets: [{ targetType: "dish", targetId: "dish_tapas_bravas" }],
      });
      promotionId = getTrpcData<{ id: string }>(promotion).id;
      return promotion;
    },
  });
  const removedPromotion = await callTrpcMutation(page, "admin.promotions.remove", { promotionId });
  expect(removedPromotion, removedPromotion.body).toMatchObject({ ok: true, status: 200 });

  const branch = await branchWrite(page);
  await expectInvalidation({
    host: "tapas.localhost",
    request,
    url: `http://tapas.localhost:4011/contacto?invalidate-branch=${stamp}`,
    mutate: () => callTrpcMutation(page, "admin.branches.save", branch),
  });

  await expectInvalidation({
    host: "tapas.localhost",
    request,
    url: `http://tapas.localhost:4011/en/?invalidate-translation=${stamp}`,
    mutate: () =>
      callTrpcMutation(page, "admin.translations.update", {
        entityType: "dish",
        entityId: "dish_tapas_croquetas",
        languageCode: "en",
        field: "name",
        value: `Ham croquettes E2E ${stamp}`,
      }),
  });
  const restored = await callTrpcMutation(page, "admin.translations.update", {
    entityType: "dish",
    entityId: "dish_tapas_croquetas",
    languageCode: "en",
    field: "name",
    value: "Ham croquettes",
  });
  expect(restored, restored.body).toMatchObject({ ok: true, status: 200 });
});
