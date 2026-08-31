import { expect, test } from "../../fixtures/test";
import { getContentVersion, getTenantTheme } from "../../helpers/tenant-config";
import { selectMingOption } from "../../helpers/form-controls";
import { callTrpcMutation } from "../../helpers/trpc";

function writableTheme(theme: Record<string, unknown>) {
  return {
    template: theme.template,
    primary: theme.primary,
    secondary: theme.secondary,
    tagline: theme.tagline,
    showMenuPhotos: theme.showMenuPhotos,
    showDishPhoto: theme.showDishPhoto,
    headingFont: theme.headingFont,
    bodyFont: theme.bodyFont,
  };
}

test("publishes a normalized theme through tenant-config and the public worker", async ({ page, request }) => {
  const original = await getTenantTheme(request, "tapas.localhost");
  const versionBeforeDraft = await getContentVersion(request, "tapas.localhost");
  await page.goto("/");
  await selectMingOption(page, "Sucursal activa", "Bar La Tasca");
  await page.goto("/theme");

  const preview = page.frameLocator('iframe[title^="Vista previa móvil"]');
  const previewShell = preview.locator(".home-shell");
  const showMenuPhotos = page.getByRole("checkbox", { name: "Mostrar fotos en la carta" });
  const showDishPhoto = page.getByRole("checkbox", { name: "Mostrar foto al abrir un plato" });

  await expect(page.getByText("En directo", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(previewShell).toHaveAttribute("data-template", "tapas");

  // The explicit choice survives a template whose preset hides photos.
  await selectMingOption(page, "Plantilla", "Alta cocina");
  await expect(showMenuPhotos).toBeChecked();
  await expect(previewShell).toHaveAttribute("data-template", "fine");
  await expect(preview.locator("qm-dish-row").first().locator('[part="photo"]')).toBeVisible();

  const primaryInput = page.getByLabel("Color primario", { exact: true });
  const secondaryInput = page.getByLabel("Color secundario", { exact: true });
  const taglineInput = page.getByLabel("Eslogan", { exact: true });
  await primaryInput.fill("#D13A2F");
  await secondaryInput.fill("#FFD447");
  await taglineInput.fill("Tema E2E publicado");
  await expect(preview.getByText("Tema E2E publicado", { exact: true }).first()).toBeVisible();

  await preview.locator(".dish-trigger").first().click();
  await expect(preview.locator("qm-dish-modal").locator('[part="photo"]')).toBeVisible();

  // The modal flag is independent from the list flag and updates an already-open dish.
  await showDishPhoto.click();
  await expect(preview.locator("qm-dish-modal").locator('[part="photo"]')).toHaveCount(0);
  await preview.getByRole("button", { name: /Cerrar|Close/ }).click();

  // The explicit hidden state also survives a template whose preset shows photos.
  await showMenuPhotos.click();
  await selectMingOption(page, "Plantilla", "Fast food");
  await expect(showMenuPhotos).not.toBeChecked();
  await expect(showDishPhoto).not.toBeChecked();
  await expect(previewShell).toHaveAttribute("data-template", "fast");
  await expect(preview.locator("qm-dish-row").first().locator('[part="photo"]')).toHaveCount(0);
  await expect(primaryInput).toHaveValue("#D13A2F");
  await expect(secondaryInput).toHaveValue("#FFD447");
  await expect(taglineInput).toHaveValue("Tema E2E publicado");

  expect(await getTenantTheme(request, "tapas.localhost")).toEqual(original);
  expect(await getContentVersion(request, "tapas.localhost")).toBe(versionBeforeDraft);

  await page.getByText("Guardar tema", { exact: true }).click();
  await expect(page.getByText("Tema guardado.")).toBeVisible();

  try {
    const stored = await getTenantTheme(request, "tapas.localhost");
    expect(stored).toMatchObject({
      template: "fast",
      primary: "#D13A2F",
      secondary: "#FFD447",
      tagline: "Tema E2E publicado",
      showMenuPhotos: false,
      showDishPhoto: false,
    });
    expect(stored.layout).toBeTruthy();
    expect(stored.heading).toBeTruthy();
    expect(stored.body).toBeTruthy();
    await expect.poll(() => getContentVersion(request, "tapas.localhost")).not.toBe(versionBeforeDraft);

    await page.goto(`http://tapas.localhost:4011/?theme=${Date.now()}`);
    const shell = page.locator(".home-shell");
    await expect(shell).toHaveAttribute("data-template", "fast");
    await expect
      .poll(() => shell.evaluate((element) => getComputedStyle(element).getPropertyValue("--qm-primary").trim()))
      .not.toBe("");

    await page.goto("http://localhost:5174/");
    const noDomain = await callTrpcMutation(page, "admin.theme.save", {
      branchId: "branch_nodomain",
      config: writableTheme(stored),
    });
    expect(noDomain, noDomain.body).toMatchObject({ ok: false, status: 412 });

    await selectMingOption(page, "Sucursal activa", "Sucursal sin dominio");
    await page.goto("/theme");
    await expect(page.getByText(/El tema se guarda por dominio/)).toBeVisible();
  } finally {
    await page.goto("http://localhost:5174/");
    const restored = await callTrpcMutation(page, "admin.theme.save", {
      branchId: "branch_tapas",
      config: writableTheme(original),
    });
    expect(restored, restored.body).toMatchObject({ ok: true, status: 200 });
  }
});
