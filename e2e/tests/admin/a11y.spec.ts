import { test } from "../../fixtures/test";
import { expectNoSeriousA11yViolations } from "../../helpers/a11y";

const ROUTES = [
  "/",
  "/menu",
  "/menu/categories/new",
  "/menu/categories/cat_tapas_tapas",
  "/menu/dishes/new",
  "/menu/dishes/dish_tapas_croquetas",
  "/promotions",
  "/promotions/new",
  "/loyalty",
  "/loyalty/program",
  "/loyalty/insights",
  "/theme",
  "/languages",
  "/qr",
  "/branch",
  "/billing",
];

test("has no serious accessibility violations across core admin workflows", async ({ page }) => {
  test.slow(); // This test runs a full accessibility scan on 17 separate routes.
  for (const route of ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.locator(".admin-page").waitFor();
    await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState === "finished"));
    await expectNoSeriousA11yViolations(page);
  }
});
