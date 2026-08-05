import { expect, test } from "../../fixtures/test";
import { callTrpcQuery } from "../../helpers/trpc";

test("allows billing overview only for owners", async ({ page, adminRole, staff }) => {
  const ownerOverview = await callTrpcQuery(page, "admin.billing.overview");
  expect(ownerOverview, ownerOverview.body).toMatchObject({ ok: true, status: 200 });

  const adminOverview = await callTrpcQuery(adminRole, "admin.billing.overview");
  expect(adminOverview, adminOverview.body).toMatchObject({ ok: false, status: 403 });

  const staffOverview = await callTrpcQuery(staff, "admin.billing.overview");
  expect(staffOverview, staffOverview.body).toMatchObject({ ok: false, status: 403 });
});

test("rejects unsigned and incorrectly signed Stripe webhooks without contacting Stripe", async ({ request }) => {
  const missing = await request.post("http://localhost:8787/webhooks/stripe", {
    data: { type: "customer.subscription.updated" },
    failOnStatusCode: false,
  });
  expect(missing.status()).toBe(400);

  const invalid = await request.post("http://localhost:8787/webhooks/stripe", {
    data: { type: "customer.subscription.updated" },
    headers: { "stripe-signature": "t=0,v1=invalid" },
    failOnStatusCode: false,
  });
  expect(invalid.status()).toBe(400);
});
