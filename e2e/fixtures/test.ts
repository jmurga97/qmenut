import { expect, test as base } from "@playwright/test";

import type { Browser, Page } from "@playwright/test";

async function blockPlaceholderImages(page: Page): Promise<void> {
  await page.route(/^https:\/\/picsum\.photos\//, (route) => route.abort());
}

interface AuthenticatedPageInput {
  browser: Browser;
  email: string;
  use: (page: Page) => Promise<void>;
}

async function useAuthenticatedPage({ browser, email, use }: AuthenticatedPageInput): Promise<void> {
  const context = await browser.newContext({
    baseURL: "http://localhost:5174",
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await blockPlaceholderImages(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Solicitar código" }).click();
  await page.getByLabel("Código OTP").fill("000000");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);

  try {
    await use(page);
  } finally {
    await context.close();
  }
}

type RoleFixtures = {
  adminRole: Page;
  fineOwner: Page;
  staff: Page;
};

function authenticatedFixture(email: string) {
  return async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>) =>
    useAuthenticatedPage({ browser, email, use });
}

/** Keeps browser navigation independent from the remote placeholder-image service. */
export const test = base.extend<RoleFixtures>({
  page: async ({ page }, use) => {
    await blockPlaceholderImages(page);
    await use(page);
  },
  adminRole: authenticatedFixture("admin.e2e@test.local"),
  fineOwner: authenticatedFixture("owner.fine@test.local"),
  staff: authenticatedFixture("staff.e2e@test.local"),
});

export { expect };
