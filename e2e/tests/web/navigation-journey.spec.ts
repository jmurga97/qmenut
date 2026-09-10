import { expect, test } from "../../fixtures/test";
import { expectNoSeriousA11yViolations } from "../../helpers/a11y";

test("navigates categories, dish details, highlights and languages @critical", async ({ page }) => {
  await page.goto("http://tapas.localhost:4011/es/?utm_source=qr");
  await page.getByText("Croquetas de jamón", { exact: true }).first().click();
  const modal = page.locator("qm-dish-modal");
  await expect(modal).toContainText("Pan con tomate");
  await expect(modal.locator("qm-allergen")).toHaveCount(3);
  await expect(modal.getByRole("button", { name: /Cerrar/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await page.getByRole("button", { name: "Raciones", exact: true }).click();
  await expect(page.getByText("Gambas al ajillo", { exact: true }).first()).toBeVisible();
  // Reaching the header picker without mouse.wheel: Playwright only supports it in Chromium,
  // so WebKit/Firefox never scroll and the offscreen header drops out of the a11y tree.
  await page.locator(".home-scroll").evaluate((element) => element.scrollTo({ top: 0 }));
  await page.getByRole("combobox", { name: "Idioma" }).selectOption("en");
  await expect(page).toHaveURL(/\/en\/?\?utm_source=qr$/);
  await expect(page.getByText("Ham croquettes", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Croquetas de jamón", { exact: true })).toHaveCount(0);
  await page.getByText("Ham croquettes", { exact: true }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Ham croquettes");
  await expect(page.getByRole("dialog").getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Highlights", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/destacados/);
  await expect(page.locator("qm-recommended-list")).toBeVisible();
  await page.getByRole("tab", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Language" })).toHaveValue("en");
  await expectNoSeriousA11yViolations(page);
});

test("captures one route transition and respects reduced motion", async ({ page }) => {
  let captures = 0;
  await page.exposeFunction("recordRouteTransition", () => {
    captures += 1;
  });
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (...args) => {
      void (window as typeof window & { recordRouteTransition: () => Promise<void> }).recordRouteTransition();
      return start(...args);
    };
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en/");
  await page.getByRole("tab", { name: "Highlights", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/destacados/);
  await expect(page.locator("qm-recommended-list")).toBeVisible();
  await expect.poll(() => captures).toBe(1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("tab", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Language" })).toHaveValue("en");
  expect(captures).toBe(1);
});
