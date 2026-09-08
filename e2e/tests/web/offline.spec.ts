import { expect, test } from "../../fixtures/test";

import type { Page } from "@playwright/test";

async function waitForOfflineCache(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect
    .poll(() => page.evaluate(async () => Boolean(await caches.match(new URL("/en/offline", location.origin)))))
    .toBe(true);
}

test("reads a previously visited menu while offline", async ({ page, context }) => {
  await page.goto("/es/");
  await expect(page.getByText("Croquetas de jamón", { exact: true }).first()).toBeVisible();
  await waitForOfflineCache(page);
  await page.reload();
  await expect
    .poll(() => page.evaluate(async () => Boolean(await caches.match(new URL(location.pathname, location.origin)))))
    .toBe(true);
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByText("Croquetas de jamón", { exact: true }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/es\/?$/);
  } finally {
    await context.setOffline(false);
  }
});

test("recovers an unvisited offline route with its language and query", async ({ page, context }) => {
  await page.goto("/es/");
  await waitForOfflineCache(page);
  await context.setOffline(true);
  try {
    await page.goto("/en/contacto?utm_source=qr");
    await expect(page).toHaveURL(/\/en\/offline\?returnTo=/);
    await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/contacto\?utm_source=qr$/);
  await expect(page.locator("qm-lang select")).toHaveValue("en");
});
