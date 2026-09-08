import { expect, test } from "../../fixtures/test";
import { expectOtpValue } from "../../helpers/form-controls";
import { callTrpcQuery } from "../../helpers/trpc";

// Each test signs in separately so logging out never invalidates the shared setup session.
test.use({ storageState: { cookies: [], origins: [] } });

test("logs in with the keyboard and cannot return after logout @critical", async ({ page }) => {
  await page.goto("http://localhost:5174/login");
  await page.getByLabel("Email").fill("e2e@test.local");
  await page.getByRole("button", { name: "Continuar" }).focus();
  await page.keyboard.press("Enter");
  await expectOtpValue(page, "000000");
  await page.getByRole("button", { name: "Entrar" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/localhost:5174\/(?:\?.*)?$/);
  await page.goto("http://localhost:5174/menu");
  await expect(page.getByRole("link", { name: "+ Nuevo plato" })).toBeVisible();
  // On an iPhone-sized admin viewport the navigation lives in a drawer.
  const logout = page.getByRole("button", { name: "Cerrar sesión", exact: true });
  if (!(await logout.isVisible())) await page.getByRole("button", { name: "Show navigation" }).click();
  await logout.click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  expect(await callTrpcQuery(page, "admin.tenant.me")).toMatchObject({ status: 401, ok: false });
});
