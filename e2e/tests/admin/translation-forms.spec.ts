import { expect, test } from "../../fixtures/test";
import { selectMingOption } from "../../helpers/form-controls";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

test("edits dish translations in context without changing canonical data", async ({ page }) => {
  const dishId = "dish_tapas_bravas";
  const scope = { branchId: "branch_tapas", languageCode: "en" };
  const canonical = getTrpcData(await callTrpcQuery(page, "admin.menu.dishes.detail", { dishId }));
  const texts = getTrpcData<
    Array<{ entityType: string; entityId: string; field: string; text: string; value: string }>
  >(await callTrpcQuery(page, "admin.translations.list", scope));
  const original = texts.find((row) => row.entityId === dishId && row.field === "name");
  expect(original).toBeDefined();
  if (!original) return;
  const translatedName = `Spicy potatoes E2E ${Date.now()}`;

  await page.goto(`/menu/dishes/${dishId}`);
  await selectMingOption(page, "Idioma del contenido", "English");
  const name = page.getByRole("textbox", { name: "Nombre", exact: true });
  await expect(name).toHaveValue(original.value || original.text);
  await expect(page.locator('input[name="price"]')).toBeDisabled();
  await expect(page.getByRole("combobox", { name: /^Categoría/ })).toBeDisabled();

  await name.fill(translatedName);
  page.once("dialog", (dialog) => dialog.dismiss());
  await selectMingOption(page, "Idioma del contenido", "Español (base)");
  await expect(name).toHaveValue(translatedName);
  await expect(page.getByRole("combobox", { name: "Idioma del contenido" })).toHaveText("English");

  try {
    await page.getByRole("button", { name: "Guardar traducción", exact: true }).click();
    await expect(page.getByText("Traducción guardada.", { exact: true })).toBeVisible();
    expect(getTrpcData(await callTrpcQuery(page, "admin.menu.dishes.detail", { dishId }))).toEqual(canonical);
    await page.reload();
    await expect(name).toHaveValue(translatedName);
    await page.screenshot({ path: test.info().outputPath("dish-translation.png"), fullPage: true });

    await selectMingOption(page, "Idioma del contenido", "Español (base)");
    await expect(name).toHaveValue(original.text);
    await expect(page.locator('input[name="price"]')).toBeEnabled();
  } finally {
    const restored = await callTrpcMutation(page, "admin.translations.save", {
      ...scope,
      rows: [
        {
          entityType: original.entityType,
          entityId: dishId,
          field: original.field,
          sourceText: original.text,
          value: original.value || original.text,
        },
      ],
    });
    expect(restored, restored.body).toMatchObject({ ok: true });
  }
});
