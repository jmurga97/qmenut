import { expect, test } from "../../fixtures/test";

test("limits staff controls while allowing dish availability changes", async ({ staff }) => {
  await staff.goto("/", { waitUntil: "domcontentloaded" });
  await expect(staff.getByText("Facturación", { exact: true })).toBeHidden();

  await staff.goto("/billing", { waitUntil: "domcontentloaded" });
  await expect(staff).toHaveURL(/\/$/);

  await staff.goto("/menu", { waitUntil: "domcontentloaded" });
  await expect(staff.getByRole("link", { name: "+ Nueva categoría" })).toBeHidden();
  await expect(staff.getByRole("link", { name: "+ Nuevo plato" })).toBeHidden();

  const availability = staff.getByRole("checkbox", { name: "Disponibilidad de Patatas bravas" });
  await expect(availability).toBeChecked();

  try {
    await availability.click();
    await expect(availability).not.toBeChecked();
    await expect(availability.locator("..")).toContainText("Oculto");

    await staff.getByRole("link", { name: "Patatas bravas" }).click();
    await expect(staff.getByLabel("Nombre", { exact: true })).toBeDisabled();
    await expect(staff.getByText("Guardar", { exact: true })).toBeHidden();
  } finally {
    await staff.goto("/menu", { waitUntil: "domcontentloaded" });
    const restoreAvailability = staff.getByRole("checkbox", { name: "Disponibilidad de Patatas bravas" });
    if (!(await restoreAvailability.isChecked())) {
      await restoreAvailability.click();
      await expect(restoreAvailability).toBeChecked();
    }
  }
});
