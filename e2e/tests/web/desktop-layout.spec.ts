import { expect, test } from "../../fixtures/test";

test("keeps navigation, categories, and dishes visible on desktop", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("qm-nav-bar")).toBeVisible();
  await expect(page.locator("qm-category-nav")).toBeVisible();
  await expect(page.locator("qm-menu-list").first()).toBeVisible();
  await expect(page.getByText("Patatas bravas", { exact: true }).first()).toBeVisible();
});
