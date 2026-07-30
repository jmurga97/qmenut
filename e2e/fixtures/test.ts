import { expect, test as base } from "@playwright/test";

import type { Page } from "@playwright/test";

async function blockPlaceholderImages(page: Page): Promise<void> {
  await page.route(/^https:\/\/picsum\.photos\//, (route) => route.abort());
}

/** Keeps browser navigation independent from the remote placeholder-image service. */
export const test = base.extend<{ staff: Page }>({
  page: async ({ page }, use) => {
    await blockPlaceholderImages(page);
    await use(page);
  },
  staff: async ({ browser }, use) => {
    const context = await browser.newContext({
      baseURL: "http://localhost:5174",
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await blockPlaceholderImages(page);
    await page.goto("/login");
    await page.getByLabel("Email").fill("staff.e2e@test.local");
    await page.getByRole("button", { name: "Solicitar código" }).click();
    await page.getByLabel("Código OTP").fill("000000");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/$/);

    await use(page);
    await context.close();
  },
});

export { expect };
