import { expect, test } from "../../fixtures/test";

test("renders and edge-caches the seeded default-language tapas menu", async ({ page, request }) => {
  const cachePath = "/es/";
  const firstResponse = await request.get(cachePath);
  const firstBody = await firstResponse.text();

  expect(firstResponse.ok(), firstBody).toBe(true);
  expect(firstResponse.headers()["x-qmenut-cache"]).toBe("MISS");
  expect(firstBody).toContain("Bar La Tasca");
  expect(firstBody).toContain("Patatas bravas");

  await expect
    .poll(
      async () => {
        const response = await request.get(cachePath);
        expect(response.ok(), await response.text()).toBe(true);
        return response.headers()["x-qmenut-cache"];
      },
      { message: "the rendered root route should be written to the edge cache", timeout: 10_000 },
    )
    .toBe("HIT");

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Bar La Tasca", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Patatas bravas", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Raciones", { exact: true }).first()).toBeVisible();
});

test("renders explicit Spanish and English locale routes", async ({ page }) => {
  await page.goto("/es/", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/es\/?$/);
  await expect(page.getByText("Croquetas de jamón", { exact: true }).first()).toBeVisible();

  await page.goto("/en/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.getByText("Ham croquettes", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Sharing plates", { exact: true }).first()).toBeVisible();
});

test("loads the promotions page", async ({ page }) => {
  await page.goto("/es/promos", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/es\/promos$/);
  await expect(page.locator("qm-promo").first()).toBeVisible();
});
