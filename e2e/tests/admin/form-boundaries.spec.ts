import { expect, test } from "../../fixtures/test";
import { expectNoSeriousA11yViolations } from "../../helpers/a11y";
import { cleanMenu, fillDish, saveDish } from "../../helpers/menu";

for (const [value, cents] of [
  ["9,50", 950],
  ["9.50", 950],
  ["0", 0],
] as const) {
  test(`persists a price entered as ${value}`, async ({ page, cleanup }) => {
    const name = `Plato E2E precio ${crypto.randomUUID()}`;
    cleanMenu({ page, cleanup, name });
    await fillDish(page, name);
    await page.getByRole("textbox", { name: "Precio", exact: true }).first().fill(value);
    expect((await saveDish(page, name)).price).toBe(cents);
  });
}

for (const value of ["-1", "1.234"]) {
  test(`rejects invalid price ${value} accessibly`, async ({ page }) => {
    await fillDish(page, "Plato E2E inválido");
    await page.getByRole("textbox", { name: "Precio", exact: true }).first().fill(value);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Introduce un importe válido", { exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Precio", exact: true }).first()).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page).toHaveURL(/\/menu\/dishes\/new$/);
    await expectNoSeriousA11yViolations(page);
  });
}

for (const name of ["", "   "]) {
  test(`rejects ${name ? "whitespace" : "empty"} names`, async ({ page }) => {
    await fillDish(page, name);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("El nombre es obligatorio", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Nombre", { exact: true })).toBeFocused();
  });
}

test("preserves a long accented name with emoji at a narrow viewport", async ({ page, cleanup }) => {
  const name = `Plato E2E ${"Descripción áéñ 🍲 ".repeat(6)}${crypto.randomUUID()}`;
  cleanMenu({ page, cleanup, name });
  await page.setViewportSize({ width: 390, height: 844 });
  await fillDish(page, name);
  expect((await saveDish(page, name)).name).toBe(name);
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(name);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
