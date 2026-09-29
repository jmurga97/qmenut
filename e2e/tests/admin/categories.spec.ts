import { expect, test } from "../../fixtures/test";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

interface Category {
  id: string;
  name: string;
}

test("creates and updates a category in the UI, then removes it with a dish through tRPC", async ({
  page,
  request,
  cleanup,
}) => {
  const suffix = Date.now();
  const originalName = `Cat E2E ${suffix}`;
  const updatedName = `Cat E2E actualizada ${suffix}`;
  cleanup.push(async () => {
    const categories = getTrpcData<Category[]>(
      await callTrpcQuery(page, "admin.menu.categories.list", { branchId: "branch_tapas" }),
    );
    const category = categories.find((entry) => entry.name === originalName || entry.name === updatedName);
    if (category) {
      expect(await callTrpcMutation(page, "admin.menu.categories.remove", { categoryId: category.id })).toMatchObject({
        ok: true,
      });
    }
  });

  await page.goto("/menu/categories/new");
  await page.getByLabel("Nombre").fill(originalName);
  await page.getByLabel("Descripción").fill("Categoría creada por Playwright");
  await page.getByText("Guardar", { exact: true }).click();
  await expect(page.getByRole("heading", { name: originalName })).toBeVisible();

  await page.getByLabel("Nombre").fill(updatedName);
  await page.getByText("Guardar", { exact: true }).click();
  await expect(page.getByRole("heading", { name: updatedName })).toBeVisible();

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

  // Removing a category leaves its dishes live, and an untranslated one would unpublish English.
  const dishId = getTrpcData<{ id: string }>(dish).id;
  expect(await callTrpcMutation(page, "admin.menu.dishes.remove", { dishId })).toMatchObject({ ok: true });
  const removed = await callTrpcMutation(page, "admin.menu.categories.remove", { categoryId: category?.id });
  expect(removed, removed.body).toMatchObject({ ok: true, status: 200 });
  const after = await callTrpcQuery(page, "admin.menu.categories.list", { branchId: "branch_tapas" });
  expect(getTrpcData<Category[]>(after).some((entry) => entry.id === category?.id)).toBe(false);
});
