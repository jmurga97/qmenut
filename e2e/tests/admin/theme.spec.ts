import { expect, test } from "../../fixtures/test";
import { getTenantTheme } from "../../helpers/tenant-config";
import { selectMingOption } from "../../helpers/form-controls";
import { callTrpcMutation } from "../../helpers/trpc";

function writableTheme(theme: Record<string, unknown>) {
  return {
    template: theme.template,
    primary: theme.primary,
    secondary: theme.secondary,
    tagline: theme.tagline,
    headingFont: theme.headingFont,
    bodyFont: theme.bodyFont,
  };
}

test("publishes a normalized theme through tenant-config and the public worker", async ({ page, request }) => {
  const original = await getTenantTheme(request, "her.localhost");
  await page.goto("/");
  await selectMingOption(page, "Sucursal activa", "Mesón Herencia");
  await page.goto("/theme");

  await selectMingOption(page, "Plantilla", "Fast food");
  await page.locator('input[type="text"]').nth(0).fill("#D13A2F");
  await page.locator('input[type="text"]').nth(1).fill("#FFD447");
  await page.getByLabel("Eslogan").fill("Tema E2E publicado");
  await page.getByText("Guardar tema", { exact: true }).click();
  await expect(page.getByText("Tema guardado.")).toBeVisible();

  try {
    const stored = await getTenantTheme(request, "her.localhost");
    expect(stored).toMatchObject({
      template: "fast",
      primary: "#D13A2F",
      secondary: "#FFD447",
      tagline: "Tema E2E publicado",
    });
    expect(stored.layout).toBeTruthy();
    expect(stored.heading).toBeTruthy();
    expect(stored.body).toBeTruthy();

    await page.goto(`http://her.localhost:4011/?theme=${Date.now()}`);
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
      branchId: "branch_her",
      config: writableTheme(original),
    });
    expect(restored, restored.body).toMatchObject({ ok: true, status: 200 });
  }
});
