import { expect } from "@playwright/test";

import { selectMingOption } from "./form-controls";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "./trpc";

import type { Page } from "@playwright/test";

export interface DishRecord {
  id: string;
  name: string;
  price: number;
  allergenIds: number[];
  extraIngredientIds: string[];
}

export async function listDishes(page: Page, branchId = "branch_tapas") {
  return getTrpcData<DishRecord[]>(await callTrpcQuery(page, "admin.menu.dishes.list", { branchId }));
}

export function cleanMenu(input: { page: Page; cleanup: Array<() => Promise<void>>; name: string; branchId?: string }) {
  input.cleanup.push(async () => {
    await input.page.goto("http://localhost:5174/menu");
    for (const dish of await listDishes(input.page, input.branchId)) {
      if (dish.name !== input.name) continue;
      const removed = await callTrpcMutation(input.page, "admin.menu.dishes.remove", { dishId: dish.id });
      expect(removed, removed.body).toMatchObject({ ok: true });
    }
  });
}

export async function fillDish(page: Page, name: string) {
  await page.goto("http://localhost:5174/menu/dishes/new");
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await selectMingOption(page, "Categoría", "Tapas");
  await page.getByRole("textbox", { name: "Precio", exact: true }).first().fill("9,50");
}

export async function saveDish(page: Page, name: string) {
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  const dishes = (await listDishes(page)).filter((dish) => dish.name === name);
  expect(dishes).toHaveLength(1);
  return getTrpcData<DishRecord>(await callTrpcQuery(page, "admin.menu.dishes.detail", { dishId: dishes[0]!.id }));
}
