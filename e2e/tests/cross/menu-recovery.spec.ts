import { expect, test } from "../../fixtures/test";
import { selectMingOption } from "../../helpers/form-controls";
import { cleanMenu, fillDish, listDishes, saveDish } from "../../helpers/menu";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

const mutation = (name: string) => new RegExp(`/trpc/admin\\.menu\\.dishes\\.${name}(?:\\?|$)`);

test("creates a complete dish and publishes it to a diner @critical", async ({ page, diner, cleanup }) => {
  const name = `Plato E2E recorrido ${crypto.randomUUID()}`;
  const categoryName = `Cat E2E recorrido ${crypto.randomUUID()}`;
  cleanup.push(async () => {
    const categories = getTrpcData<Array<{ id: string; name: string }>>(
      await callTrpcQuery(page, "admin.menu.categories.list", { branchId: "branch_tapas" }),
    );
    for (const category of categories.filter((item) => item.name === categoryName)) {
      expect(await callTrpcMutation(page, "admin.menu.categories.remove", { categoryId: category.id })).toMatchObject({
        ok: true,
      });
    }
  });
  cleanMenu({ page, cleanup, name });
  await page.goto("/menu/categories/new");
  await page.getByLabel("Nombre", { exact: true }).fill(categoryName);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("link", { name: categoryName, exact: true })).toBeVisible();
  await fillDish(page, name);
  await selectMingOption(page, "Categoría", categoryName);
  await page.getByRole("button", { name: "Gluten", exact: true }).click();
  await page.getByRole("button", { name: /Pan con tomate/ }).click();
  const saved = await saveDish(page, name);
  expect(saved).toMatchObject({ price: 950, allergenIds: [1], extraIngredientIds: ["ing_tapas_pan"] });
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("button", { name: "Gluten", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("textbox", { name: "Precio", exact: true }).first()).toHaveValue("9.50");
  await diner.goto("/es/");
  await diner.getByText(name, { exact: true }).first().click();
  await expect(diner.locator("qm-dish-modal")).toContainText("Pan con tomate");
  await expect(diner.locator("qm-dish-modal qm-allergen")).toHaveCount(1);
});

test("cancels an edit without publishing the draft", async ({ page, diner, cleanup }) => {
  const name = `Plato E2E cancelar ${crypto.randomUUID()}`;
  cleanMenu({ page, cleanup, name });
  await fillDish(page, name);
  await saveDish(page, name);
  await page.getByRole("link", { name, exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Borrador sin publicar");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(name);
  await diner.goto("/es/");
  await expect(diner.getByText(name, { exact: true }).first()).toBeVisible();
  await expect(diner.getByText("Borrador sin publicar")).toHaveCount(0);
});

for (const failure of ["before write", "relations", "lost response"] as const) {
  test(`recovers from ${failure} without duplicate dishes ${failure === "before write" ? "@critical" : ""}`, async ({
    page,
    diner,
    cleanup,
  }) => {
    const name = `Plato E2E recuperar ${crypto.randomUUID()}`;
    cleanMenu({ page, cleanup, name });
    await fillDish(page, name);
    await page.getByRole("button", { name: "Gluten", exact: true }).click();
    const path = mutation(failure === "relations" ? "saveRelations" : "create");
    let intercepted = false;
    await page.route(path, async (route) => {
      if (intercepted) return route.continue();
      intercepted = true;
      if (failure === "lost response") {
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
      }
      await route.abort("failed");
    });
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(name);
    expect(intercepted).toBe(true);
    expect((await listDishes(page)).filter((dish) => dish.name === name)).toHaveLength(
      failure === "before write" ? 0 : 1,
    );
    await page.unroute(path);
    expect(await saveDish(page, name)).toMatchObject({ price: 950, allergenIds: [1] });
    await diner.goto("/es/");
    await diner.getByText(name, { exact: true }).first().click();
    await expect(diner.locator("qm-dish-modal qm-allergen")).toHaveCount(1);
  });
}

test("prevents repeated saves while a write is in flight", async ({ page, cleanup }) => {
  const name = `Plato E2E doble ${crypto.randomUUID()}`;
  cleanMenu({ page, cleanup, name });
  await fillDish(page, name);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route(mutation("create"), async (route) => {
    writes++;
    await gate;
    await route.continue();
  });
  try {
    const save = page.getByRole("button", { name: "Guardar", exact: true });
    await save.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Guardando…", exact: true })).toBeDisabled();
    await page.keyboard.press("Enter");
    await expect.poll(() => writes).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  expect((await listDishes(page)).filter((dish) => dish.name === name)).toHaveLength(1);
  expect(writes).toBe(1);
});

test("staff hides and restores a featured dish across public pages", async ({ page, staff, diner, cleanup }) => {
  const name = `Plato E2E disponible ${crypto.randomUUID()}`;
  cleanMenu({ page, cleanup, name });
  await fillDish(page, name);
  await page.getByRole("checkbox", { name: "Recomendado", exact: true }).check();
  await page.getByRole("checkbox", { name: "Destacado", exact: true }).check();
  await saveDish(page, name);
  await staff.goto("/menu");
  for (const active of [true, false, true]) {
    const toggle = staff.getByRole("switch", { name: `Disponibilidad de ${name}` });
    if ((await toggle.isChecked()) !== active) await toggle.click();
    await expect(toggle).toBeChecked({ checked: active });
    for (const path of ["/es/", "/es/destacados"]) {
      await diner.goto(path);
      const dish = diner.getByText(name, { exact: true }).first();
      if (active) await expect(dish).toBeVisible();
      else await expect(dish).toHaveCount(0);
    }
  }
});
