import { expect, test } from "../../fixtures/test";
import { callTrpcQuery } from "../../helpers/trpc";

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill("e2e@test.local");
  await page.getByRole("button", { name: "Solicitar código" }).click();
});

test("shows an error for a wrong OTP", async ({ page }) => {
  await page.getByLabel("Código OTP").fill("111111");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText("Invalid OTP", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("can return to the email step", async ({ page }) => {
  await page.getByRole("button", { name: "Cancelar" }).click();

  await expect(page.getByLabel("Email")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Solicitar código" })).toBeVisible();
});

test("rejects anonymous access to the admin application and API", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login$/);

  const response = await callTrpcQuery(page, "admin.tenant.me");
  expect(response, response.body).toMatchObject({ ok: false, status: 401 });
});
