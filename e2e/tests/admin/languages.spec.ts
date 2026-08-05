import { expect, test } from "../../fixtures/test";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

test("manages a manual language and publishes its translation", async ({ page, request }) => {
  const added = await callTrpcMutation(page, "admin.languages.add", {
    languageCode: "fr",
    autoTranslate: false,
  });
  expect(getTrpcData<{ added: boolean; translation: string }>(added)).toMatchObject({
    added: true,
    translation: "skipped",
  });

  const activated = await callTrpcMutation(page, "admin.languages.setActive", {
    languageCode: "fr",
    isActive: true,
  });
  expect(activated, activated.body).toMatchObject({ ok: true, status: 200 });

  try {
    const languages = await callTrpcQuery(page, "admin.languages.list");
    expect(languages.body).toContain('"languageCode":"fr"');

    const catalog = await callTrpcQuery(page, "admin.languages.catalog");
    expect(catalog.body).toContain("Français");

    const translations = await callTrpcQuery(page, "admin.translations.list", {
      branchId: "branch_tapas",
      languageCode: "fr",
    });
    expect(translations, translations.body).toMatchObject({ ok: true, status: 200 });

    const editedName = `Croquettes E2E ${Date.now()}`;
    const updated = await callTrpcMutation(page, "admin.translations.update", {
      entityType: "dish",
      entityId: "dish_tapas_croquetas",
      languageCode: "fr",
      field: "name",
      value: editedName,
    });
    expect(updated, updated.body).toMatchObject({ ok: true, status: 200 });

    const publicMenu = await request.get(`http://tapas.localhost:4011/fr/?language=${Date.now()}`);
    const body = await publicMenu.text();
    expect(publicMenu.ok(), body).toBe(true);
    expect(body).toContain(editedName);

    const unavailable = await callTrpcMutation(page, "admin.translations.translateAll", {
      languageCode: "fr",
      onlyMissing: true,
    });
    expect(unavailable, unavailable.body).toMatchObject({ ok: false, status: 412 });

    const autoAdd = await callTrpcMutation(page, "admin.languages.add", {
      languageCode: "de",
      autoTranslate: true,
    });
    expect(getTrpcData<{ translation: string }>(autoAdd).translation).toBe("unavailable");
    await callTrpcMutation(page, "admin.languages.remove", {
      languageCode: "de",
      deleteTranslations: true,
    });
  } finally {
    const removed = await callTrpcMutation(page, "admin.languages.remove", {
      languageCode: "fr",
      deleteTranslations: true,
    });
    expect(removed, removed.body).toMatchObject({ ok: true, status: 200 });
  }
});
