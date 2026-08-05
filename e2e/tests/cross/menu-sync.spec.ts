import { expect, test } from "../../fixtures/test";
import { getContentVersion } from "../../helpers/tenant-config";

import type { APIRequestContext } from "@playwright/test";

const PUBLIC_MENU_URL = "http://tapas.localhost:4011/es/";

interface PublicMenuResponse {
  body: string;
  cacheStatus: string | undefined;
  status: number;
}

async function getPublicMenu(request: APIRequestContext): Promise<PublicMenuResponse> {
  const response = await request.get(PUBLIC_MENU_URL, { timeout: 10_000 });

  return {
    body: await response.text(),
    cacheStatus: response.headers()["x-qmenut-cache"],
    status: response.status(),
  };
}

async function expectCachedMenu(request: APIRequestContext, expectedName: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await getPublicMenu(request);
        expect(response.status, response.body).toBe(200);
        expect(response.body).toContain(expectedName);
        return response.cacheStatus;
      },
      { message: `the public menu containing ${expectedName} should reach the edge cache`, timeout: 10_000 },
    )
    .toBe("HIT");
}

test("publishes an admin dish rename through versioned SSR cache invalidation", async ({ page, request }) => {
  const originalName = "Croquetas de jamón";
  const updatedName = `Croquetas sincronizadas ${Date.now()}`;

  await expectCachedMenu(request, originalName);
  const versionBeforeUpdate = await getContentVersion(request, "tapas.localhost");

  await page.goto("/menu", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: originalName }).click();
  await page.getByRole("textbox").nth(0).fill(updatedName);
  await page.getByText("Guardar", { exact: true }).click();
  await expect(page.getByRole("link", { name: updatedName })).toBeVisible();

  try {
    await expect
      .poll(() => getContentVersion(request, "tapas.localhost"), {
        message: "the admin mutation should bump the tenant public-content version",
        timeout: 10_000,
      })
      .not.toBe(versionBeforeUpdate);

    const invalidated = await getPublicMenu(request);
    expect(invalidated.status, invalidated.body).toBe(200);
    expect(invalidated.cacheStatus).toBe("MISS");
    expect(invalidated.body).toContain(updatedName);
    expect(invalidated.body).not.toContain(originalName);

    await expectCachedMenu(request, updatedName);
  } finally {
    const versionBeforeRestore = await getContentVersion(request, "tapas.localhost");
    await page.goto("/menu", { waitUntil: "domcontentloaded" });
    const updatedLink = page.getByRole("link", { name: updatedName });

    if (await updatedLink.isVisible()) {
      await updatedLink.click();
      await page.getByRole("textbox").nth(0).fill(originalName);
      await page.getByText("Guardar", { exact: true }).click();
      await expect(page.getByRole("link", { name: originalName })).toBeVisible();

      await expect
        .poll(() => getContentVersion(request, "tapas.localhost"), {
          message: "restoring seeded data should bump the public-content version",
          timeout: 10_000,
        })
        .not.toBe(versionBeforeRestore);

      const restored = await getPublicMenu(request);
      expect(restored.status, restored.body).toBe(200);
      expect(restored.cacheStatus).toBe("MISS");
      expect(restored.body).toContain(originalName);
      expect(restored.body).not.toContain(updatedName);
      await expectCachedMenu(request, originalName);
    }
  }
});
