import { expect, test } from "../../fixtures/test";
import { getContentVersion, getTenantTheme } from "../../helpers/tenant-config";
import { callPublicTrpc, callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

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
    showMenuPhotos: theme.showMenuPhotos,
    showDishPhoto: theme.showDishPhoto,
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

test("derives loyalty availability and invalidates public SEO when the program is disabled", async ({
  page,
  request,
}) => {
  const programResponse = await callTrpcQuery(page, "admin.loyalty.getProgram");
  const original = getTrpcData<{
    program: { isActive: boolean; ticketMedio: number | null };
    rewards: Array<{
      cost: number;
      description: string | null;
      freeDishId: string | null;
      id: string;
      isActive: boolean;
      name: string;
      percentage: number | null;
      specialPrice: number | null;
      type: "percentage_discount" | "free_dish" | "special_price";
    }>;
  }>(programResponse);
  const publicMenu = await callPublicTrpc(request, "menu.publicData", { host: "tapas.localhost" });
  const publicData = getTrpcData<{ publicFeatures: { loyalty: boolean } }>(publicMenu);

  expect(publicData.publicFeatures.loyalty).toBe(true);

  const sitemapUrl = `http://tapas.localhost:4011/sitemap.xml?loyalty=${Date.now()}`;
  const loyaltyUrl = "http://tapas.localhost:4011/puntos";
  await request.get(sitemapUrl);
  await expect.poll(async () => (await request.get(sitemapUrl)).headers()["x-qmenut-cache"]).toBe("HIT");
  await request.get(loyaltyUrl);
  await expect.poll(async () => (await request.get(loyaltyUrl)).headers()["x-qmenut-cache"]).toBe("HIT");

  const versionBeforeDisable = await getContentVersion(request, "tapas.localhost");

  try {
    for (const reward of original.rewards.filter((entry) => entry.isActive)) {
      const deactivated = await callTrpcMutation(page, "admin.loyalty.updateReward", {
        rewardId: reward.id,
        data: {
          cost: reward.cost,
          description: reward.description,
          freeDishId: reward.freeDishId,
          isActive: false,
          name: reward.name,
          percentage: reward.percentage,
          specialPrice: reward.specialPrice,
          type: reward.type,
        },
      });
      expect(deactivated, deactivated.body).toMatchObject({ ok: true, status: 200 });
    }

    const noRewardsMenu = await callPublicTrpc(request, "menu.publicData", { host: "tapas.localhost" });
    expect(getTrpcData<{ publicFeatures: { loyalty: boolean } }>(noRewardsMenu).publicFeatures.loyalty).toBe(false);

    for (const reward of original.rewards.filter((entry) => entry.isActive)) {
      const reactivated = await callTrpcMutation(page, "admin.loyalty.updateReward", {
        rewardId: reward.id,
        data: {
          cost: reward.cost,
          description: reward.description,
          freeDishId: reward.freeDishId,
          isActive: true,
          name: reward.name,
          percentage: reward.percentage,
          specialPrice: reward.specialPrice,
          type: reward.type,
        },
      });
      expect(reactivated, reactivated.body).toMatchObject({ ok: true, status: 200 });
    }

    const restoredRewardsMenu = await callPublicTrpc(request, "menu.publicData", { host: "tapas.localhost" });
    expect(getTrpcData<{ publicFeatures: { loyalty: boolean } }>(restoredRewardsMenu).publicFeatures.loyalty).toBe(
      true,
    );

    const disabled = await callTrpcMutation(page, "admin.loyalty.saveProgram", {
      isActive: false,
      ticketMedio: original.program.ticketMedio,
    });
    expect(disabled, disabled.body).toMatchObject({ ok: true, status: 200 });
    await expect.poll(() => getContentVersion(request, "tapas.localhost")).not.toBe(versionBeforeDisable);
    const versionAfterDisable = await getContentVersion(request, "tapas.localhost");

    const disabledMenu = await callPublicTrpc(request, "menu.publicData", { host: "tapas.localhost" });
    expect(getTrpcData<{ publicFeatures: { loyalty: boolean } }>(disabledMenu).publicFeatures.loyalty).toBe(false);

    const disabledSitemap = await request.get(sitemapUrl);
    const disabledSitemapBody = await disabledSitemap.text();
    expect(disabledSitemap.headers()["x-qmenut-cache"]).toBe("MISS");
    expect(disabledSitemapBody).not.toContain("https://tapas.localhost/puntos");

    const disabledPage = await request.get(loyaltyUrl);
    expect(disabledPage.headers()["x-qmenut-cache"]).toBe("MISS");
    await disabledPage.dispose();

    const publicPage = await page.context().newPage();
    try {
      await publicPage.goto(loyaltyUrl, { waitUntil: "networkidle" });
      await expect(
        publicPage.getByRole("heading", { name: /Todavía no hay premios disponibles|There are no rewards yet/ }),
      ).toBeVisible();
      await expect(publicPage.locator('meta[name="robots"]').first()).toHaveAttribute("content", "noindex,nofollow");
    } finally {
      await publicPage.close();
    }

    const reenabled = await callTrpcMutation(page, "admin.loyalty.saveProgram", original.program);
    expect(reenabled, reenabled.body).toMatchObject({ ok: true, status: 200 });
    await expect.poll(() => getContentVersion(request, "tapas.localhost")).not.toBe(versionAfterDisable);

    const restoredMenu = await callPublicTrpc(request, "menu.publicData", { host: "tapas.localhost" });
    expect(getTrpcData<{ publicFeatures: { loyalty: boolean } }>(restoredMenu).publicFeatures.loyalty).toBe(true);
    const restoredSitemap = await request.get(sitemapUrl);
    const restoredSitemapBody = await restoredSitemap.text();
    expect(restoredSitemapBody).toContain("https://tapas.localhost/puntos");
  } finally {
    const restoredProgram = await callTrpcQuery(page, "admin.loyalty.getProgram");
    const current = getTrpcData<{
      program: { isActive: boolean; ticketMedio: number | null };
      rewards: Array<{ id: string }>;
    }>(restoredProgram);

    if (current.program.isActive !== original.program.isActive) {
      await callTrpcMutation(page, "admin.loyalty.saveProgram", original.program);
    }

    for (const reward of original.rewards) {
      await callTrpcMutation(page, "admin.loyalty.updateReward", {
        rewardId: reward.id,
        data: {
          cost: reward.cost,
          description: reward.description,
          freeDishId: reward.freeDishId,
          isActive: reward.isActive,
          name: reward.name,
          percentage: reward.percentage,
          specialPrice: reward.specialPrice,
          type: reward.type,
        },
      });
    }
  }

  const after = getTrpcData<{ publicFeatures: { loyalty: boolean } }>(
    await callPublicTrpc(request, "menu.publicData", { host: "tapas.localhost" }),
  );
  const restoredState = getTrpcData<{
    program: { isActive: boolean; ticketMedio: number | null };
    rewards: Array<{ id: string; isActive: boolean }>;
  }>(await callTrpcQuery(page, "admin.loyalty.getProgram"));
  expect(after.publicFeatures.loyalty).toBe(original.rewards.length > 0 && original.program.isActive);
  expect(restoredState.rewards.map((reward) => reward.id)).toEqual(
    expect.arrayContaining(original.rewards.map((reward) => reward.id)),
  );
});
