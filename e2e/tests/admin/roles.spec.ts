import { expect, test } from "../../fixtures/test";
import { callTrpcMutation, callTrpcQuery } from "../../helpers/trpc";

test("limits staff controls while allowing dish availability changes", async ({ staff }) => {
  await staff.goto("/", { waitUntil: "domcontentloaded" });
  await expect(staff.getByText("Facturación", { exact: true })).toBeHidden();
  await expect(staff.getByText("Usuarios", { exact: true })).toBeHidden();

  await staff.goto("/billing", { waitUntil: "domcontentloaded" });
  await expect(staff).toHaveURL(/\/(?:\?.*)?$/);

  await staff.goto("/menu", { waitUntil: "domcontentloaded" });
  await expect(staff.getByRole("link", { name: "+ Nueva categoría" })).toBeVisible();
  await expect(staff.getByRole("link", { name: "+ Nuevo plato" })).toBeVisible();

  const availability = staff.getByRole("switch", { name: "Disponibilidad de Patatas bravas" });
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
    const restoreAvailability = staff.getByRole("switch", { name: "Disponibilidad de Patatas bravas" });
    if (!(await restoreAvailability.isChecked())) {
      await restoreAvailability.click();
      await expect(restoreAvailability).toBeChecked();
    }
  }
});

test("gives admins owner-level operational access while keeping billing owner-only", async ({ adminRole }) => {
  await adminRole.goto("/", { waitUntil: "domcontentloaded" });
  await expect(adminRole.getByText("Facturación", { exact: true })).toBeHidden();
  await expect(adminRole.getByText("Usuarios", { exact: true })).toBeHidden();
  await expect(adminRole.getByText("Menú", { exact: true }).first()).toBeVisible();
  await expect(adminRole.getByText("Tema", { exact: true }).first()).toBeVisible();
  await expect(adminRole.getByText("Idiomas", { exact: true }).first()).toBeVisible();

  const menu = await callTrpcQuery(adminRole, "admin.menu.categories.list", { branchId: "branch_tapas" });
  expect(menu, menu.body).toMatchObject({ ok: true, status: 200 });
  const theme = await callTrpcQuery(adminRole, "admin.theme.get", { branchId: "branch_tapas" });
  expect(theme, theme.body).toMatchObject({ ok: true, status: 200 });
  const branch = await callTrpcQuery(adminRole, "admin.branches.get", { branchId: "branch_tapas" });
  expect(branch, branch.body).toMatchObject({ ok: true, status: 200 });
  const languageCatalog = await callTrpcQuery(adminRole, "admin.languages.catalog");
  expect(languageCatalog, languageCatalog.body).toMatchObject({ ok: true, status: 200 });
  const billing = await callTrpcQuery(adminRole, "admin.billing.overview");
  expect(billing, billing.body).toMatchObject({ ok: false, status: 403 });
  const analytics = await callTrpcQuery(adminRole, "admin.analytics.snapshot", { period: "15d" });
  expect(analytics, analytics.body).toMatchObject({ ok: true, status: 200 });
  const users = await callTrpcQuery(adminRole, "admin.users.list");
  expect(users, users.body).toMatchObject({ ok: false, status: 403 });

  const forbiddenOwnerAction = await callTrpcMutation(adminRole, "admin.billing.portal", undefined);
  expect(forbiddenOwnerAction, forbiddenOwnerAction.body).toMatchObject({ ok: false, status: 403 });
});
