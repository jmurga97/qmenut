import { test } from "../../fixtures/test";
import { expectNoSeriousA11yViolations } from "../../helpers/a11y";

const ROUTES = ["/", "/menu", "/menu/dishes/dish_tapas_croquetas", "/theme"];

test("has no serious accessibility violations across core admin workflows", async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route, { waitUntil: "networkidle" });
    await expectNoSeriousA11yViolations(page);
  }
});
