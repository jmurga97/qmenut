import { expect, test } from "../../fixtures/test";
import { selectMingOption } from "../../helpers/form-controls";
import { callTrpcMutation, callTrpcQuery } from "../../helpers/trpc";

test("lists the seeded tapas dishes", async ({ page }) => {
  await page.goto("/menu", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("link", { name: "Patatas bravas" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Croquetas de jamón" })).toBeVisible();
});

test("creates, edits, and deletes a dish", async ({ page }) => {
  const dishName = `Plato E2E ${Date.now()}`;

  await page.goto("/menu/dishes/new", { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox").nth(0).fill(dishName);
  await selectMingOption(page, "Categoría", "Tapas");
  await page.getByRole("textbox").nth(1).fill("9.50");
  await page.getByText("Guardar", { exact: true }).click();

  const dishLink = page.getByRole("link", { name: dishName });
  await expect(dishLink).toBeVisible();
  const href = await dishLink.getAttribute("href");
  const dishId = href?.split("/").at(-1);
  expect(dishId).toBeTruthy();

  const created = await callTrpcQuery(page, "admin.menu.dishes.detail", { dishId });
  expect(created, created.body).toMatchObject({ ok: true, status: 200 });
  expect(created.json).toMatchObject({ result: { data: { id: dishId, name: dishName, price: 950 } } });

  await dishLink.click();
  await page.getByRole("textbox").nth(1).fill("10.25");
  await page.getByText("Guardar", { exact: true }).click();
  await expect(page.getByRole("link", { name: dishName })).toBeVisible();
  await expect(page.getByText("10,25 €")).toBeVisible();

  const updated = await callTrpcQuery(page, "admin.menu.dishes.detail", { dishId });
  expect(updated, updated.body).toMatchObject({ ok: true, status: 200 });
  expect(updated.json).toMatchObject({ result: { data: { id: dishId, name: dishName, price: 1025 } } });

  const response = await callTrpcMutation(page, "admin.menu.dishes.remove", { dishId });

  expect(response, response.body).toMatchObject({ ok: true });
  await page.reload();
  await expect(page.getByRole("link", { name: dishName })).toBeHidden();

  const deleted = await callTrpcQuery(page, "admin.menu.dishes.detail", { dishId });
  expect(deleted, deleted.body).toMatchObject({ ok: false, status: 404 });
});
