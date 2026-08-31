import { signLoyaltyToken } from "../../../apps/api/src/lib/loyalty/token";
import { getVenueCode } from "../../../apps/api/src/lib/loyalty/venue-code";
import { expect, test } from "../../fixtures/test";
import {
  callPublicTrpc,
  callPublicTrpcMutation,
  callTrpcMutation,
  callTrpcQuery,
  getTrpcData,
} from "../../helpers/trpc";

const LOYALTY_SECRET = "qmenut-e2e-loyalty-token-secret-2026-change-before-deploy";

test("requires current consent before an existing loyalty card can operate", async ({ request }) => {
  const legacyToken = await signLoyaltyToken({
    secret: LOYALTY_SECRET,
    payload: { v: 1, t: "card", cid: "customer_legacy_consent", rid: "rest_tapas" },
  });
  const blocked = await callPublicTrpc(request, "loyalty.getCard", {
    host: "tapas.localhost",
    cardToken: legacyToken,
  });
  expect(blocked, blocked.body).toMatchObject({ ok: false, status: 403 });

  const reconsented = await callPublicTrpcMutation(request, "loyalty.createCard", {
    consentAccepted: true,
    host: "tapas.localhost",
    email: "legacy-consent.e2e@test.local",
  });
  const cardToken = getTrpcData<{ cardToken: string }>(reconsented).cardToken;
  const card = await callPublicTrpc(request, "loyalty.getCard", {
    host: "tapas.localhost",
    cardToken,
  });
  expect(card, card.body).toMatchObject({ ok: true, status: 200 });
});

test("runs the diner-to-admin loyalty journey and enforces venue-code throttling", async ({ page, request }) => {
  const venueResponse = await callTrpcQuery(page, "admin.loyalty.venueCode", { branchId: "branch_tapas" });
  const venue = getTrpcData<{ code: string; expiresAt: number }>(venueResponse);

  await page.goto("http://tapas.localhost:4011/es/puntos?utm_source=qr", { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("journey.e2e@test.local");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Crear mi tarjeta/ }).click();
  await expect(page.getByText("journey.e2e@test.local")).toBeVisible();
  await page.getByRole("button", { name: "Pedir mi sello" }).click();
  await page.getByLabel("Código de sala de cuatro dígitos").fill(venue.code);
  await expect(page.getByRole("button", { name: "Canjear" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Canjear" }).first().click();
  await expect(page.getByText("Esperando confirmación del personal…")).toBeVisible();

  const cardToken = await page.evaluate(() => window.localStorage.getItem("qm-loyalty-card:tapas.localhost"));
  expect(cardToken).toBeTruthy();
  await page.goto("http://localhost:5174/loyalty", { waitUntil: "domcontentloaded" });
  const pending = await callTrpcQuery(page, "admin.loyalty.pendingRedemptions");
  const redemption = getTrpcData<Array<{ email: string; id: string }>>(pending).find(
    (entry) => entry.email === "journey.e2e@test.local",
  );
  expect(redemption).toBeTruthy();

  const validated = await callTrpcMutation(page, "admin.loyalty.validateRedemption", {
    redemptionId: redemption?.id,
    branchId: "branch_tapas",
  });
  const validation = getTrpcData<{ transactionId: number }>(validated);
  const status = await callPublicTrpc(request, "loyalty.redemptionStatus", {
    host: "tapas.localhost",
    cardToken,
    redemptionId: redemption?.id,
  });
  expect(getTrpcData<{ status: string }>(status).status).toBe("validated");

  const undone = await callTrpcMutation(page, "admin.loyalty.undo", {
    transactionId: validation.transactionId,
    branchId: "branch_tapas",
  });
  expect(undone, undone.body).toMatchObject({ ok: true, status: 200 });

  const throttleCard = await callPublicTrpcMutation(request, "loyalty.createCard", {
    consentAccepted: true,
    host: "tapas.localhost",
    email: "throttle.e2e@test.local",
  });
  const throttleToken = getTrpcData<{ cardToken: string }>(throttleCard).cardToken;
  const expired = await getVenueCode({
    secret: LOYALTY_SECRET,
    restaurantId: "rest_tapas",
    branchId: "branch_tapas",
    now: Date.now() - 2 * 3 * 60 * 1000,
  });
  const invalidCodes = ["0000", expired.code, "0001", "0002", "0003"];

  for (const venueCode of invalidCodes) {
    const wrong = await callPublicTrpcMutation(request, "loyalty.earnStamp", {
      host: "tapas.localhost",
      cardToken: throttleToken,
      venueCode,
    });
    expect(wrong, wrong.body).toMatchObject({ ok: false, status: 400 });
  }

  const limited = await callPublicTrpcMutation(request, "loyalty.earnStamp", {
    host: "tapas.localhost",
    cardToken: throttleToken,
    venueCode: "0004",
  });
  expect(limited, limited.body).toMatchObject({ ok: false, status: 429 });
});

test("shows the visit-us cover on /puntos when the visit does not come from the QR", async ({ page }) => {
  await page.goto("http://tapas.localhost:4011/es/puntos", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Visítanos y gana puntos" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveCount(0);
});
