import { expect, test } from "../../fixtures/test";
import { callTrpcMutation, callTrpcQuery } from "../../helpers/trpc";

test("lists the seeded promotion", async ({ page }) => {
  await page.goto("/promotions", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Happy tapa -20%" })).toBeVisible();
});

test("creates and edits a promotion", async ({ page }) => {
  const initialName = `Promo E2E ${Date.now()}`;
  const editedName = `${initialName} editada`;
  let promotionId: string | undefined;

  try {
    await page.goto("/promotions/new", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Nombre").fill(initialName);
    await page.getByLabel("Porcentaje (0-100)").fill("15");
    await page.getByRole("button", { name: "Patatas bravas" }).click();
    await page.getByText("Guardar", { exact: true }).click();

    const promotionLink = page.getByRole("link", { name: initialName });
    await expect(promotionLink).toBeVisible();
    const href = await promotionLink.getAttribute("href");
    promotionId = href?.split("/").at(-1);
    expect(promotionId).toBeTruthy();

    const created = await callTrpcQuery(page, "admin.promotions.get", { promotionId });
    expect(created, created.body).toMatchObject({ ok: true, status: 200 });
    expect(created.json).toMatchObject({ result: { data: { id: promotionId, name: initialName, percentage: 15 } } });

    await promotionLink.click();
    await page.getByLabel("Nombre").fill(editedName);
    await page.getByLabel("Porcentaje (0-100)").fill("25");
    await page.getByText("Guardar", { exact: true }).click();
    await expect(page.getByRole("link", { name: editedName })).toBeVisible();

    const updated = await callTrpcQuery(page, "admin.promotions.get", { promotionId });
    expect(updated, updated.body).toMatchObject({ ok: true, status: 200 });
    expect(updated.json).toMatchObject({ result: { data: { id: promotionId, name: editedName, percentage: 25 } } });
  } finally {
    if (promotionId) {
      const removed = await callTrpcMutation(page, "admin.promotions.remove", { promotionId });
      expect(removed, removed.body).toMatchObject({ ok: true, status: 200 });
      await page.goto("/promotions", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("link", { name: editedName })).toBeHidden();

      const deleted = await callTrpcQuery(page, "admin.promotions.get", { promotionId });
      expect(deleted, deleted.body).toMatchObject({ ok: false, status: 404 });
    }
  }
});

test("creates and edits a 2x1 promotion", async ({ page }) => {
  const initialName = `Promo 2x1 E2E ${Date.now()}`;
  const editedName = `${initialName} editada`;
  let promotionId: string | undefined;

  try {
    await page.goto("/promotions/new", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Nombre").fill(initialName);
    await page.getByLabel("Tipo").selectOption({ label: "2x1" });
    await page.getByLabel("Unidades que lleva").fill("2");
    await page.getByLabel("Unidades que paga").fill("3");
    await page.getByRole("button", { name: "Patatas bravas" }).click();
    await page.getByText("Guardar", { exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("Las unidades pagadas no pueden superar las compradas");

    await page.getByLabel("Unidades que paga").fill("1");
    await page.getByText("Guardar", { exact: true }).click();

    const promotionLink = page.getByRole("link", { name: initialName });
    await expect(promotionLink).toBeVisible();
    const href = await promotionLink.getAttribute("href");
    promotionId = href?.split("/").at(-1);
    expect(promotionId).toBeTruthy();

    const created = await callTrpcQuery(page, "admin.promotions.get", { promotionId });
    expect(created, created.body).toMatchObject({ ok: true, status: 200 });
    expect(created.json).toMatchObject({
      result: {
        data: {
          buyQuantity: 2,
          id: promotionId,
          name: initialName,
          paidQuantity: 1,
          type: "two_for_one",
        },
      },
    });

    await promotionLink.click();
    await expect(page.getByLabel("Unidades que lleva")).toHaveValue("2");
    await expect(page.getByLabel("Unidades que paga")).toHaveValue("1");
    await page.getByLabel("Nombre").fill(editedName);
    await page.getByText("Guardar", { exact: true }).click();
    await expect(page.getByRole("link", { name: editedName })).toBeVisible();

    const updated = await callTrpcQuery(page, "admin.promotions.get", { promotionId });
    expect(updated, updated.body).toMatchObject({ ok: true, status: 200 });
    expect(updated.json).toMatchObject({
      result: {
        data: {
          buyQuantity: 2,
          id: promotionId,
          name: editedName,
          paidQuantity: 1,
          type: "two_for_one",
        },
      },
    });
  } finally {
    if (promotionId) {
      const removed = await callTrpcMutation(page, "admin.promotions.remove", { promotionId });
      expect(removed, removed.body).toMatchObject({ ok: true, status: 200 });
    }
  }
});
