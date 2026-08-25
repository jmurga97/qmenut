import { expect, test } from "../../fixtures/test";
import { callTrpcMutation, callTrpcQuery } from "../../helpers/trpc";

test("keeps authenticated admin access inside each owner tenant", async ({ page, fineOwner, request }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible();
  await expect(page.getByText("Bar La Tasca", { exact: true }).first()).toBeVisible();

  const forbiddenRead = await callTrpcQuery(page, "admin.menu.dishes.list", { branchId: "branch_fine" });
  expect(forbiddenRead, forbiddenRead.body).toMatchObject({ ok: false, status: 404 });

  const forbiddenWrite = await callTrpcMutation(page, "admin.menu.dishes.update", {
    branchId: "branch_fine",
    dishId: "dish_fine_margherita",
    data: {
      categoryId: "cat_fine_classics",
      name: "Tenant leak",
      description: "",
      price: 1,
      imageUrl: "",
      position: 0,
      isActive: true,
      isRecommended: false,
      isFeatured: false,
    },
  });
  expect(forbiddenWrite, forbiddenWrite.body).toMatchObject({ ok: false, status: 404 });

  const dishBefore = await callTrpcQuery(page, "admin.menu.dishes.detail", {
    dishId: "dish_tapas_croquetas",
  });
  const forbiddenRelation = await callTrpcMutation(page, "admin.menu.dishes.saveRelations", {
    dishId: "dish_tapas_croquetas",
    tagIds: [],
    allergenIds: [999_999],
    extraIngredientIds: ["ing_fine_extra_cheese"],
  });
  expect(forbiddenRelation, forbiddenRelation.body).toMatchObject({ ok: false, status: 400 });
  const dishAfter = await callTrpcQuery(page, "admin.menu.dishes.detail", {
    dishId: "dish_tapas_croquetas",
  });
  expect(dishAfter.json).toEqual(dishBefore.json);

  await fineOwner.goto("/", { waitUntil: "domcontentloaded" });
  await expect(fineOwner.getByText("Aurum", { exact: true }).first()).toBeVisible();
  const fineMenu = await callTrpcQuery(fineOwner, "admin.menu.dishes.list", { branchId: "branch_fine" });
  expect(fineMenu, fineMenu.body).toMatchObject({ ok: true, status: 200 });
  expect(fineMenu.body).toContain("Margherita");
  const forbiddenTapasRead = await callTrpcQuery(fineOwner, "admin.menu.dishes.list", {
    branchId: "branch_tapas",
  });
  expect(forbiddenTapasRead, forbiddenTapasRead.body).toMatchObject({ ok: false, status: 404 });

  const tapasResponse = await request.get(
    `http://localhost:8787/trpc/menu.publicData?input=${encodeURIComponent(JSON.stringify({ host: "tapas.localhost" }))}`,
  );
  const fineResponse = await request.get(
    `http://localhost:8787/trpc/menu.publicData?input=${encodeURIComponent(JSON.stringify({ host: "fine.localhost" }))}`,
  );

  expect(tapasResponse.ok()).toBe(true);
  expect(fineResponse.ok()).toBe(true);
  const tapasBody = await tapasResponse.text();
  const fineBody = await fineResponse.text();
  expect(tapasBody).toContain("Bar La Tasca");
  expect(tapasBody).not.toContain("Aurum");
  expect(fineBody).toContain("Aurum");
  expect(fineBody).toContain("Margherita");
  expect(fineBody).not.toContain("Tenant leak");
  expect(fineBody).not.toContain("Bar La Tasca");
});
