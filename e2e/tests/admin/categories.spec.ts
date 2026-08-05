import { expect, test } from "../../fixtures/test";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

interface Category {
  id: string;
  name: string;
}

test("creates and updates a category in the UI, then removes it with a dish through tRPC", async ({
  page,
  request,
}) => {
  const suffix = Date.now();
  const originalName = `Cat E2E ${suffix}`;
  const updatedName = `Cat E2E actualizada ${suffix}`;

  await page.goto("/menu/categories/new");
  await page.getByLabel("Nombre").fill(originalName);
  await page.getByLabel("Descripción").fill("Categoría creada por Playwright");
  await page.getByText("Guardar", { exact: true }).click();
  await expect(page.getByRole("link", { name: originalName })).toBeVisible();

  await page.getByRole("link", { name: originalName }).click();
  await page.getByLabel("Nombre").fill(updatedName);
  await page.getByText("Guardar", { exact: true }).click();
  await expect(page.getByRole("link", { name: updatedName })).toBeVisible();

  const list = await callTrpcQuery(page, "admin.menu.categories.list", { branchId: "branch_tapas" });
  const category = getTrpcData<Category[]>(list).find((entry) => entry.name === updatedName);
  expect(category).toBeTruthy();

  const dish = await callTrpcMutation(page, "admin.menu.dishes.create", {
    branchId: "branch_tapas",
    data: {
      categoryId: category?.id,
      name: `Plato E2E categoría ${suffix}`,
      description: "Confirma la categoría pública",
      price: 500,
      imageUrl: "",
      position: 0,
      isActive: true,
      isRecommended: false,
      isFeatured: false,
    },
  });
  expect(dish, dish.body).toMatchObject({ ok: true, status: 200 });

  const publicMenu = await request.get(`http://tapas.localhost:4011/?category=${suffix}`);
  expect(await publicMenu.text()).toContain(updatedName);

  const removed = await callTrpcMutation(page, "admin.menu.categories.remove", { categoryId: category?.id });
  expect(removed, removed.body).toMatchObject({ ok: true, status: 200 });
  const after = await callTrpcQuery(page, "admin.menu.categories.list", { branchId: "branch_tapas" });
  expect(getTrpcData<Category[]>(after).some((entry) => entry.id === category?.id)).toBe(false);
});
