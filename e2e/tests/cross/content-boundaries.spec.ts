import { expect, test } from "../../fixtures/test";
import { listDishes } from "../../helpers/menu";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

for (const state of ["empty category", "hidden dishes", "empty menu"]) {
  test(`renders a public ${state} without broken navigation`, async ({ page, diner, cleanup }) => {
    const categories = getTrpcData<
      Array<{ id: string; name: string; isActive: boolean; description: string | null; imageUrl: string | null }>
    >(await callTrpcQuery(page, "admin.menu.categories.list", { branchId: "branch_her" }));
    if (state === "empty category") {
      let id: string | undefined;
      cleanup.push(async () => {
        if (id)
          expect(await callTrpcMutation(page, "admin.menu.categories.remove", { categoryId: id })).toMatchObject({
            ok: true,
          });
      });
      id = getTrpcData<{ id: string }>(
        await callTrpcMutation(page, "admin.menu.categories.create", {
          branchId: "branch_her",
          data: { name: "Cat E2E vacía", position: 99, isActive: true },
        }),
      ).id;
    } else if (state === "hidden dishes") {
      const dishes = await listDishes(page, "branch_her");
      cleanup.push(async () => {
        for (const dish of dishes)
          expect(
            await callTrpcMutation(page, "admin.menu.dishes.setAvailability", {
              branchId: "branch_her",
              dishId: dish.id,
              isActive: true,
            }),
          ).toMatchObject({ ok: true });
      });
      for (const dish of dishes)
        expect(
          await callTrpcMutation(page, "admin.menu.dishes.setAvailability", {
            branchId: "branch_her",
            dishId: dish.id,
            isActive: false,
          }),
        ).toMatchObject({ ok: true });
    } else {
      for (const category of categories) {
        cleanup.push(async () => {
          expect(
            await callTrpcMutation(page, "admin.menu.categories.update", {
              categoryId: category.id,
              data: {
                ...category,
                description: category.description ?? undefined,
                imageUrl: category.imageUrl ?? undefined,
              },
            }),
          ).toMatchObject({ ok: true });
        });
        expect(
          await callTrpcMutation(page, "admin.menu.categories.update", {
            categoryId: category.id,
            data: {
              ...category,
              description: category.description ?? undefined,
              imageUrl: category.imageUrl ?? undefined,
              isActive: false,
            },
          }),
        ).toMatchObject({ ok: true });
      }
    }
    await diner.goto("http://her.localhost:4011/es/");
    if (state === "empty category") {
      await expect(diner.getByText("Callos a la riojana", { exact: true }).first()).toBeVisible();
      await expect(diner.getByRole("button", { name: "Cat E2E vacía", exact: true })).toHaveCount(0);
    } else {
      await expect(diner.getByText("No hay platos disponibles", { exact: true })).toBeVisible();
      await expect(diner.locator("button.dish-trigger")).toHaveCount(0);
    }
    await diner.getByRole("tab", { name: "Contacto", exact: true }).click();
    await expect(diner).toHaveURL(/\/es\/contacto$/);
  });
}

test("falls back for missing translations and removes a disabled language", async ({ page, diner, cleanup }) => {
  cleanup.push(async () => {
    expect(
      await callTrpcMutation(page, "admin.languages.remove", { languageCode: "fr", deleteTranslations: true }),
    ).toMatchObject({ ok: true });
  });
  expect(
    await callTrpcMutation(page, "admin.languages.add", { languageCode: "fr", autoTranslate: false }),
  ).toMatchObject({ ok: true });
  expect(
    await callTrpcMutation(page, "admin.languages.setActive", { languageCode: "fr", isActive: true }),
  ).toMatchObject({ ok: true });
  expect(
    await callTrpcMutation(page, "admin.translations.update", {
      entityType: "dish",
      entityId: "dish_tapas_croquetas",
      languageCode: "fr",
      field: "name",
      value: "Croquettes de jambon",
    }),
  ).toMatchObject({ ok: true });
  await diner.goto("/es/");
  await diner.locator("qm-lang select").selectOption("fr");
  await expect(diner.getByText("Croquettes de jambon", { exact: true }).first()).toBeVisible();
  await expect(diner.getByText("Patatas bravas", { exact: true }).first()).toBeVisible();
  await diner.getByText("Croquettes de jambon", { exact: true }).first().click();
  await expect(diner.getByRole("dialog")).toContainText("Croquettes de jambon");
  expect(
    await callTrpcMutation(page, "admin.languages.setActive", { languageCode: "fr", isActive: false }),
  ).toMatchObject({ ok: true });
  await diner.goto("/es/");
  await expect(diner.locator('qm-lang option[value="fr"]')).toHaveCount(0);
});
