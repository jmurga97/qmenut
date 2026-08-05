import { expect, test } from "../../fixtures/test";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

interface TaxonomyItem<TId> {
  id: TId;
  label?: string;
  name?: string;
}

test("saves tags, allergens, and a newly created extra through the public dish modal", async ({ page }) => {
  const ingredientName = `Ingrediente E2E ${Date.now()}`;
  const [tagsResponse, allergensResponse] = await Promise.all([
    callTrpcQuery(page, "admin.menu.taxonomy.tags"),
    callTrpcQuery(page, "admin.menu.taxonomy.allergens"),
  ]);
  const tags = getTrpcData<TaxonomyItem<string>[]>(tagsResponse);
  const allergens = getTrpcData<TaxonomyItem<number>[]>(allergensResponse);
  expect(tags.length).toBeGreaterThan(0);
  expect(allergens.length).toBeGreaterThan(0);

  const created = await callTrpcMutation(page, "admin.menu.taxonomy.createIngredient", {
    name: ingredientName,
    price: 175,
    isActive: true,
  });
  const ingredientId = getTrpcData<{ id: string }>(created).id;

  const ingredientsResponse = await callTrpcQuery(page, "admin.menu.taxonomy.ingredients");
  expect(getTrpcData<TaxonomyItem<string>[]>(ingredientsResponse)).toContainEqual(
    expect.objectContaining({ id: ingredientId, name: ingredientName }),
  );

  const saved = await callTrpcMutation(page, "admin.menu.dishes.saveRelations", {
    dishId: "dish_tapas_croquetas",
    tagIds: [tags[0]?.id],
    allergenIds: [allergens[0]?.id],
    extraIngredientIds: [ingredientId],
  });
  expect(saved, saved.body).toMatchObject({ ok: true, status: 200 });

  try {
    await page.goto(`http://tapas.localhost:4011/?relations=${Date.now()}`);
    await page.getByText("Croquetas de jamón", { exact: true }).first().click();
    const modal = page.locator("qm-dish-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(ingredientName);
    await expect(modal.locator("qm-allergen")).toHaveCount(1);
  } finally {
    await page.goto("http://localhost:5174/");
    const restored = await callTrpcMutation(page, "admin.menu.dishes.saveRelations", {
      dishId: "dish_tapas_croquetas",
      tagIds: [],
      allergenIds: [1, 7, 3],
      extraIngredientIds: ["ing_tapas_pan"],
    });
    expect(restored, restored.body).toMatchObject({ ok: true, status: 200 });
  }
});
