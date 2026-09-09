import { expect, test } from "../../fixtures/test";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

test("adds and removes languages, protecting Spanish and scoping retranslation", async ({ page, request }) => {
  const added = await callTrpcMutation(page, "admin.languages.add", { languageCode: "fr" });
  expect(getTrpcData<{ added: boolean }>(added)).toEqual({ added: true });
  try {
    const languages = await callTrpcQuery(page, "admin.languages.list");
    expect(languages.body).toContain('"defaultLanguageCode":"es"');
    expect(languages.body).toContain('"languageCode":"fr"');
    for (const procedure of ["admin.languages.remove", "admin.translations.translateAll"]) {
      const result = await callTrpcMutation(page, procedure, { branchId: "branch_tapas", languageCode: "es" });
      expect(result, result.body).toMatchObject({ ok: false, status: 400 });
    }
    const unavailable = await callTrpcMutation(page, "admin.translations.translateAll", {
      branchId: "branch_tapas",
      languageCode: "fr",
    });
    expect(unavailable, unavailable.body).toMatchObject({ ok: false, status: 412 });
    const otherBranch = await callTrpcMutation(page, "admin.translations.translateAll", {
      branchId: "branch_fine",
      languageCode: "fr",
    });
    expect(otherBranch.ok).toBe(false);
    expect(otherBranch.status).not.toBe(412);
    const publicMenu = await request.get("http://tapas.localhost:4011/en/");
    const body = await publicMenu.text();
    expect(body).toContain("Ham croquettes");
    expect(body).not.toContain("[EN-GB]");
    await page.goto("/languages");
    await expect(page.getByRole("button", { name: "Acciones para Français" })).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("languages-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Acciones para Français" }).click();
    await expect(page.getByRole("menuitem", { name: "Retraducir contenido" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Eliminar" })).toBeVisible();
    await expect(page.getByRole("menuitem")).toHaveCount(2);
    await page.getByRole("menuitem", { name: "Retraducir contenido" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole("button", { name: "Acciones para Français" })).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("languages-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });
  } finally {
    const removed = await callTrpcMutation(page, "admin.languages.remove", { languageCode: "fr" });
    expect(removed, removed.body).toMatchObject({ ok: true, status: 200 });
  }
});
