import { expect, test } from "../../fixtures/test";
import { expectNoSeriousA11yViolations } from "../../helpers/a11y";
import { card, earnStamp, LOYALTY_URL, requestReward, signup } from "../../helpers/loyalty";
import { callPublicTrpc, callPublicTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

test("diner and staff complete a redemption through their screens @critical", async ({ diner, staff }) => {
  const email = await signup(diner);
  await earnStamp({ diner, staff });
  await requestReward(diner);
  const validate = staff.getByRole("button", { name: `Validar Croquetas gratis para ${email}`, exact: true });
  await expect(validate).toBeVisible({ timeout: 15_000 });
  await validate.focus();
  await staff.keyboard.press("Enter");
  await expect(validate).toHaveCount(0);
  await expect(diner.getByText("Premio canjeado", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => (await card(diner)).card.stampsBalance).toBe(0);
  await expectNoSeriousA11yViolations(diner);
});

test("staff rejects a redemption without spending the balance", async ({ diner, staff }) => {
  const email = await signup(diner);
  await earnStamp({ diner, staff });
  await requestReward(diner);
  await staff.getByRole("button", { name: `Rechazar Croquetas gratis para ${email}` }).click();
  await staff.getByRole("button", { name: "Rechazar canje", exact: true }).click();
  await expect(diner.getByText("El personal no validó el canje", { exact: true })).toBeVisible({ timeout: 15_000 });
  expect((await card(diner)).card.stampsBalance).toBe(1);
});

test("restores a pending redemption after reload and reopening storage", async ({ diner, staff, browser }) => {
  const email = await signup(diner);
  await earnStamp({ diner, staff });
  await requestReward(diner);
  const before = await card(diner);
  await diner.reload();
  await expect(diner.getByText("Esperando confirmación del personal…")).toBeVisible();
  const storageState = await diner.context().storageState();
  await diner.close();
  const reopened = await browser.newContext({ storageState, locale: "es-ES" });
  try {
    const page = await reopened.newPage();
    await page.goto(LOYALTY_URL);
    await expect(page.getByText("Esperando confirmación del personal…")).toBeVisible();
    expect((await card(page)).pendingRedemption?.id).toBe(before.pendingRedemption?.id);
    await staff.getByRole("button", { name: `Validar Croquetas gratis para ${email}` }).click();
    await expect(page.getByText("Premio canjeado", { exact: true })).toBeVisible({ timeout: 15_000 });
    expect((await card(page)).card.stampsBalance).toBe(0);
  } finally {
    await reopened.close();
  }
});

test("rejects another stamp during the visit cooldown", async ({ diner, staff }) => {
  await signup(diner);
  await earnStamp({ diner, staff });
  await expect.poll(async () => (await card(diner)).card.stampsBalance).toBe(1);
  await diner.reload();
  await earnStamp({ diner, staff });
  await expect(diner.getByText("Ya tienes el sello de esta visita", { exact: true })).toBeVisible();
  expect((await card(diner)).card.stampsBalance).toBe(1);
});

test("does not confirm a stamp without a network connection", async ({ diner, staff }) => {
  await signup(diner);
  await staff.goto("/loyalty");
  const code = staff.locator("strong").filter({ hasText: "Código actual:" });
  await expect(code).toContainText(/\d{4}/);
  const digits = (await code.innerText()).match(/\d{4}/)![0];
  await diner.context().setOffline(true);
  try {
    await diner.getByRole("button", { name: "Pedir mi sello" }).click();
    await diner.getByLabel("Código de sala de cuatro dígitos").fill(digits);
    await expect(
      diner.getByText("No se pudo conectar. Comprueba tu conexión y vuelve a introducir el código."),
    ).toBeVisible();
    await expect(diner.getByLabel("Código de sala de cuatro dígitos")).toBeEnabled();
    await expect(diner.getByRole("button", { name: "Canjear", exact: true })).toHaveCount(0);
  } finally {
    await diner.context().setOffline(false);
  }
  expect((await card(diner)).card.stampsBalance).toBe(0);
  await diner.getByLabel("Código de sala de cuatro dígitos").fill(digits);
  await expect.poll(async () => (await card(diner)).card.stampsBalance).toBe(1);
});

test("insufficient balance cannot redeem, exact balance can", async ({ diner, staff }) => {
  await signup(diner);
  await expect(diner.getByRole("button", { name: "Canjear", exact: true })).toHaveCount(0);
  const cardToken = await diner.evaluate(() => localStorage.getItem("qm-loyalty-card:tapas.localhost"));
  const denied = await callPublicTrpcMutation(diner.request, "loyalty.requestRedemption", {
    host: "tapas.localhost",
    cardToken,
    rewardId: "reward_tapas_croquetas",
  });
  expect(denied.ok).toBe(false);
  expect((await card(diner)).pendingRedemption).toBeNull();
  await earnStamp({ diner, staff });
  await requestReward(diner);
  expect((await card(diner)).pendingRedemption).not.toBeNull();
});

test("two tabs request only one pending reward", async ({ diner, staff }) => {
  const email = await signup(diner);
  await earnStamp({ diner, staff });
  await expect.poll(async () => (await card(diner)).card.stampsBalance).toBe(1);
  const second = await diner.context().newPage();
  await second.goto(LOYALTY_URL);
  await Promise.all([requestReward(diner), requestReward(second)]);
  expect((await card(second)).pendingRedemption?.id).toBe((await card(diner)).pendingRedemption?.id);
  const pending = getTrpcData<Array<{ email: string }>>(await callTrpcQuery(staff, "admin.loyalty.pendingRedemptions"));
  expect(pending.filter((entry) => entry.email === email)).toHaveLength(1);
  expect((await card(diner)).card.stampsBalance).toBe(1);
});

for (const opponent of ["staff", "cancel"] as const) {
  test(`concurrent validation versus ${opponent} spends at most once`, async ({ diner, staff, adminRole }) => {
    const email = await signup(diner);
    await earnStamp({ diner, staff });
    await requestReward(diner);
    await adminRole.goto("/loyalty");
    const name = `Validar Croquetas gratis para ${email}`;
    await expect(staff.getByRole("button", { name })).toBeVisible();
    await expect(adminRole.getByRole("button", { name })).toBeVisible();
    await Promise.all([
      staff.getByRole("button", { name }).click(),
      opponent === "staff"
        ? adminRole.getByRole("button", { name }).click()
        : diner.getByRole("button", { name: "Cancelar", exact: true }).click(),
    ]);
    await expect.poll(async () => (await card(diner)).pendingRedemption).toBeNull();
    const balance = (await card(diner)).card.stampsBalance;
    if (opponent === "staff") expect(balance).toBe(0);
    else expect([0, 1]).toContain(balance);
    await diner.reload();
    await expect(diner.getByText(email, { exact: true })).toBeVisible();
    expect((await card(diner)).card.stampsBalance).toBe(balance);
  });
}

test("keeps a loyalty card isolated when visiting another restaurant", async ({ diner, staff }) => {
  const email = await signup(diner);
  await earnStamp({ diner, staff });
  await expect.poll(async () => (await card(diner)).card.stampsBalance).toBe(1);
  const token = await diner.evaluate(() => localStorage.getItem("qm-loyalty-card:tapas.localhost"));
  await diner.goto("http://fine.localhost:4011/es/puntos?utm_source=qr");
  await expect(diner.getByText(email, { exact: true })).toHaveCount(0);
  expect(await diner.evaluate(() => localStorage.getItem("qm-loyalty-card:fine.localhost"))).toBeNull();
  expect(
    await callPublicTrpc(diner.request, "loyalty.getCard", { host: "fine.localhost", cardToken: token }),
  ).toMatchObject({ status: 401, ok: false });
  await diner.goto(LOYALTY_URL);
  await expect(diner.getByText(email, { exact: true })).toBeVisible();
  expect((await card(diner)).card.stampsBalance).toBe(1);
});
