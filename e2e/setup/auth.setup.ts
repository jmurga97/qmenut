import { expect, test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const authFile = ".auth/admin.json";

setup("authenticate with the fixed test OTP", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("e2e@test.local");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByLabel("Código OTP")).toHaveValue("000000");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible();

  await mkdir(".auth", { recursive: true });
  await page.context().storageState({ path: authFile });
});
