import { readFile } from "node:fs/promises";

import { expect, test } from "../../fixtures/test";
import { selectMingOption } from "../../helpers/form-controls";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

// Changes to shared seeded dishes are registered for restoration before the first write.
test("switches branches and publishes an edit only to the selected branch", async ({ page, diner, cleanup }) => {
  const dishId = "dish_her_callos";
  const before = getTrpcData<{
    name: string;
    description: string | null;
    imageUrl: string | null;
    categoryId: string;
    price: number;
    position: number;
    isActive: boolean;
    isRecommended: boolean;
    isFeatured: boolean;
  }>(await callTrpcQuery(page, "admin.menu.dishes.detail", { dishId }));
  cleanup.push(async () => {
    expect(
      await callTrpcMutation(page, "admin.menu.dishes.update", {
        branchId: "branch_her",
        dishId,
        data: { ...before, description: before.description ?? undefined, imageUrl: before.imageUrl ?? undefined },
      }),
    ).toMatchObject({ ok: true });
  });
  await page.goto("/menu");
  await selectMingOption(page, "Sucursal activa", "Mesón Herencia");
  await expect(page.getByRole("link", { name: "Callos a la riojana", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Patatas bravas", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Callos a la riojana", exact: true }).click();
  const name = `Callos E2E ${crypto.randomUUID()}`;
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  await diner.goto("http://her.localhost:4011/es/");
  await expect(diner.getByText(name, { exact: true }).first()).toBeVisible();
  await diner.goto("http://tapas.localhost:4011/es/");
  await expect(diner.getByText(name, { exact: true })).toHaveCount(0);
  await selectMingOption(page, "Sucursal activa", "Bar La Tasca");
  await expect(page.getByRole("link", { name: "Patatas bravas", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
});

test("copies QR destinations and downloads valid PNG and SVG files", async ({ page, diner, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:5174" });
  await page.goto("/qr");
  await selectMingOption(page, "Sucursal activa", "Mesón Herencia");
  for (const target of ["Carta", "Fidelización"]) {
    await selectMingOption(page, "Destino del QR", target);
    await page.getByRole("button", { name: "Copiar URL" }).click();
    await expect(page.getByText("URL copiada.", { exact: true })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(`https://her.localhost/${target === "Carta" ? "" : "puntos"}?utm_source=qr`);
    const local = new URL(copied);
    local.protocol = "http:";
    local.port = "4011";
    await diner.goto(local.toString());
    if (target === "Carta") await expect(diner.getByText("Callos a la riojana", { exact: true }).first()).toBeVisible();
    else await expect(diner.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
    for (const format of ["PNG", "SVG"]) {
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: `Descargar ${format}` }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain("her-localhost");
      const bytes = await readFile((await download.path())!);
      if (format === "PNG") expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      else expect(bytes.toString()).toContain("<svg");
      expect(bytes.length).toBeGreaterThan(100);
    }
  }
});
