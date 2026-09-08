import { expect, test } from "../../fixtures/test";
import { expectOtpValue, selectMingOption } from "../../helpers/form-controls";
import { cleanMenu, fillDish, listDishes, saveDish } from "../../helpers/menu";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

import type { Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("http://localhost:5174/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expectOtpValue(page, "000000");
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("switches restaurants without retaining the previous tenant's menu", async ({ browser, page, cleanup, diner }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const multi = await context.newPage();
  const name = `Plato E2E multi ${crypto.randomUUID()}`;
  cleanMenu({ page, cleanup, name });
  try {
    await login(multi, "multi.e2e@test.local");
    await multi.getByRole("button", { name: /Bar La Tasca/ }).click();
    await expect(multi).toHaveURL(/localhost:5174\/(?:\?.*)?$/);
    await fillDish(multi, name);
    await saveDish(multi, name);
    await selectMingOption(multi, "Sucursal activa", "Mesón Herencia");
    await selectMingOption(multi, "Restaurante activo", "Aurum");
    // A successful switch navigates to the overview; navigating earlier cancels the mutation.
    await expect(multi.getByRole("heading", { name: "Resumen" })).toBeVisible();
    await multi.goto("http://localhost:5174/menu");
    await expect(multi.getByRole("link", { name, exact: true })).toHaveCount(0);
    await expect(multi.getByRole("combobox", { name: "Sucursal activa" })).not.toContainText("Mesón Herencia");
    await diner.goto("http://fine.localhost:4011/es/");
    await expect(diner.getByText(name, { exact: true })).toHaveCount(0);
    await selectMingOption(multi, "Restaurante activo", "Bar La Tasca");
    await expect(multi.getByRole("heading", { name: "Resumen" })).toBeVisible();
    await multi.goto("http://localhost:5174/menu");
    await expect(multi.getByRole("link", { name, exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("provisions staff through the UI and revokes an open session", async ({ page, browser, cleanup }) => {
  const email = "journey.staff.e2e@test.local";
  let membershipId: string | undefined;
  cleanup.push(async () => {
    if (membershipId)
      expect(await callTrpcMutation(page, "admin.users.setActive", { membershipId, isActive: false })).toMatchObject({
        ok: true,
      });
  });
  await page.goto("/users");
  await page.getByRole("button", { name: "+ Agregar usuario" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre", { exact: true }).fill("E2E Journey");
  await dialog.getByLabel("Correo", { exact: true }).fill(email);
  await selectMingOption(page, "Rol", "Staff");
  await dialog.getByRole("button", { name: "Crear y enviar acceso" }).click();
  await expect(dialog).toBeHidden();
  const users = getTrpcData<Array<{ email: string; membershipId: string }>>(
    await callTrpcQuery(page, "admin.users.list"),
  );
  membershipId = users.find((user) => user.email === email)!.membershipId;
  // A repeated run reuses the global identity, but restores the active membership explicitly.
  expect(await callTrpcMutation(page, "admin.users.setActive", { membershipId, isActive: true })).toMatchObject({
    ok: true,
  });
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const employee = await context.newPage();
    await login(employee, email);
    await expect(employee).toHaveURL(/localhost:5174\/(?:\?.*)?$/);
    await employee.goto("http://localhost:5174/menu");
    await expect(employee.getByRole("link", { name: "+ Nuevo plato" })).toBeVisible();
    await page.getByRole("button", { name: "Acciones para E2E Journey" }).click();
    await page.getByRole("menuitem", { name: "Desactivar", exact: true }).click();
    await page.getByRole("button", { name: "Desactivar", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: email })).toContainText("Inactiva");
    expect((await callTrpcQuery(employee, "admin.menu.dishes.list", { branchId: "branch_tapas" })).ok).toBe(false);
    await employee.reload();
    await expect(employee.getByRole("link", { name: "+ Nuevo plato" })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("an expired session cannot save a draft", async ({ page, browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const editor = await context.newPage();
    await login(editor, "e2e@test.local");
    await expect(editor).toHaveURL(/localhost:5174\/(?:\?.*)?$/);
    const name = `Plato E2E sesión ${crypto.randomUUID()}`;
    await fillDish(editor, name);
    await context.request.post("http://localhost:8787/api/auth/sign-out", {
      data: {},
      headers: { Origin: "http://localhost:5174" },
    });
    await editor.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(editor.getByRole("alert")).toBeVisible();
    expect((await listDishes(page)).some((dish) => dish.name === name)).toBe(false);
  } finally {
    await context.close();
  }
});

test("a deleted dish's deep link cannot edit another dish", async ({ page, cleanup }) => {
  const name = `Plato E2E eliminado ${crypto.randomUUID()}`;
  cleanMenu({ page, cleanup, name });
  await fillDish(page, name);
  const dish = await saveDish(page, name);
  expect(await callTrpcMutation(page, "admin.menu.dishes.remove", { dishId: dish.id })).toMatchObject({ ok: true });
  await page.goto(`/menu/dishes/${dish.id}`);
  await expect(page.getByRole("button", { name: "Guardar", exact: true })).toHaveCount(0);
  await expect(page.getByText(/no existe|no encontrado|no encontrada|encontrar|encontrado/i).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Guardar", exact: true })).toHaveCount(0);
});
