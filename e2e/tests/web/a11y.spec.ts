import { test } from "../../fixtures/test";
import { expectNoSeriousA11yViolations } from "../../helpers/a11y";

const ROUTES = [
  "http://tapas.localhost:4011/",
  "http://tapas.localhost:4011/destacados",
  "http://fine.localhost:4011/puntos",
  "http://fine.localhost:4011/contacto",
];

test("has no serious accessibility violations across primary public routes", async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route, { waitUntil: "networkidle" });
    await expectNoSeriousA11yViolations(page);
  }
});
