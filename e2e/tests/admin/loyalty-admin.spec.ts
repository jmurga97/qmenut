import { expect, test } from "../../fixtures/test";
import { callPublicTrpcMutation, callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

interface CardResult {
  cardToken: string;
}

interface RedemptionResult {
  redemptionId: string;
}

async function createStampedCard(
  request: Parameters<typeof callPublicTrpcMutation>[0],
  email: string,
  venueCode: string,
): Promise<string> {
  const card = await callPublicTrpcMutation(request, "loyalty.createCard", {
    consentAccepted: true,
    host: "tapas.localhost",
    email,
  });
  const cardToken = getTrpcData<CardResult>(card).cardToken;
  const stamp = await callPublicTrpcMutation(request, "loyalty.earnStamp", {
    host: "tapas.localhost",
    cardToken,
    venueCode,
  });
  expect(stamp, stamp.body).toMatchObject({ ok: true, status: 200 });
  return cardToken;
}

test("requires privacy consent before creating a loyalty card", async ({ request }) => {
  const missingConsent = await callPublicTrpcMutation(request, "loyalty.createCard", {
    host: "tapas.localhost",
    email: "consent-required.e2e@test.local",
  });
  expect(missingConsent, missingConsent.body).toMatchObject({ ok: false, status: 400 });

  const accepted = await callPublicTrpcMutation(request, "loyalty.createCard", {
    consentAccepted: true,
    host: "tapas.localhost",
    email: "consent-required.e2e@test.local",
  });
  expect(accepted, accepted.body).toMatchObject({ ok: true, status: 200 });
});

test("covers loyalty program, reward, operations, and insights procedures", async ({ page, request }) => {
  const programResponse = await callTrpcQuery(page, "admin.loyalty.getProgram");
  const originalProgram = getTrpcData<{ program: { isActive: boolean; ticketMedio: number | null } }>(
    programResponse,
  ).program;
  const savedProgram = await callTrpcMutation(page, "admin.loyalty.saveProgram", {
    isActive: true,
    ticketMedio: 2500,
  });
  expect(savedProgram, savedProgram.body).toMatchObject({ ok: true, status: 200 });

  const rewardData = {
    name: `Premio E2E ${Date.now()}`,
    description: "Premio de integración",
    cost: 3,
    type: "percentage_discount",
    percentage: 15,
    specialPrice: null,
    freeDishId: null,
    isActive: true,
  };
  const createdReward = await callTrpcMutation(page, "admin.loyalty.createReward", { data: rewardData });
  const rewardId = getTrpcData<{ id: string }>(createdReward).id;
  const updatedReward = await callTrpcMutation(page, "admin.loyalty.updateReward", {
    rewardId,
    data: { ...rewardData, name: `${rewardData.name} actualizado`, percentage: 20 },
  });
  expect(updatedReward, updatedReward.body).toMatchObject({ ok: true, status: 200 });

  const venue = await callTrpcQuery(page, "admin.loyalty.venueCode", { branchId: "branch_tapas" });
  const venueCode = getTrpcData<{ code: string; expiresAt: number }>(venue);
  expect(venueCode.code).toMatch(/^\d{4}$/);
  expect(venueCode.expiresAt).toBeGreaterThan(Date.now());
  expect(venueCode.expiresAt - Date.now()).toBeLessThanOrEqual(180_000);

  const validateToken = await createStampedCard(request, "loyalty-admin.e2e@test.local", venueCode.code);
  const requested = await callPublicTrpcMutation(request, "loyalty.requestRedemption", {
    host: "tapas.localhost",
    cardToken: validateToken,
    rewardId: "reward_tapas_croquetas",
  });
  const redemptionId = getTrpcData<RedemptionResult>(requested).redemptionId;

  const pending = await callTrpcQuery(page, "admin.loyalty.pendingRedemptions");
  expect(pending.body).toContain(redemptionId);
  const validated = await callTrpcMutation(page, "admin.loyalty.validateRedemption", {
    redemptionId,
    branchId: "branch_tapas",
  });
  const validation = getTrpcData<{ transactionId: number }>(validated);
  const undone = await callTrpcMutation(page, "admin.loyalty.undo", {
    transactionId: validation.transactionId,
    branchId: "branch_tapas",
  });
  expect(undone, undone.body).toMatchObject({ ok: true, status: 200 });

  const rejectToken = await createStampedCard(request, "loyalty-reject.e2e@test.local", venueCode.code);
  const rejectRequest = await callPublicTrpcMutation(request, "loyalty.requestRedemption", {
    host: "tapas.localhost",
    cardToken: rejectToken,
    rewardId: "reward_tapas_croquetas",
  });
  const rejectId = getTrpcData<RedemptionResult>(rejectRequest).redemptionId;
  const rejected = await callTrpcMutation(page, "admin.loyalty.rejectRedemption", { redemptionId: rejectId });
  expect(rejected, rejected.body).toMatchObject({ ok: true, status: 200 });

  const now = Date.now();
  const insights = await Promise.all([
    callTrpcQuery(page, "admin.loyalty.insights.summary"),
    callTrpcQuery(page, "admin.loyalty.insights.customers", {
      page: 1,
      pageSize: 25,
      sortBy: "lastVisitAt",
      sortDir: "desc",
    }),
    callTrpcQuery(page, "admin.loyalty.insights.visitsChart", {
      from: now - 30 * 24 * 60 * 60 * 1000,
      to: now,
    }),
    callTrpcQuery(page, "admin.loyalty.insights.loyaltyReturn"),
  ]);
  for (const response of insights) expect(response, response.body).toMatchObject({ ok: true, status: 200 });

  const deleted = await callTrpcMutation(page, "admin.loyalty.deleteReward", { rewardId });
  expect(deleted, deleted.body).toMatchObject({ ok: true, status: 200 });
  const restoredProgram = await callTrpcMutation(page, "admin.loyalty.saveProgram", originalProgram);
  expect(restoredProgram, restoredProgram.body).toMatchObject({ ok: true, status: 200 });
});
