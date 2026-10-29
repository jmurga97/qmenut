import { expect } from "@playwright/test";

import { callPublicTrpc, getTrpcData } from "./trpc";

import type { Page } from "@playwright/test";

export const LOYALTY_URL = "http://tapas.localhost:4011/es/puntos?utm_source=qr";

export async function signup(diner: Page) {
  const email = `${crypto.randomUUID()}.e2e@test.local`;
  await diner.goto(LOYALTY_URL);
  await diner.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await diner.getByRole("checkbox").check();
  await diner.getByRole("button", { name: /Crear mi tarjeta/ }).click();
  await expect(diner.getByText(email, { exact: true })).toBeVisible();
  return email;
}

/** The diner asks for one stamp with the venue code staff read out; the request waits for staff. */
export async function requestStamps(input: { diner: Page; staff: Page }) {
  await input.staff.goto("http://localhost:5174/loyalty");
  const code = input.staff.locator("strong").filter({ hasText: "Código actual:" });
  await expect(code).toContainText(/\d{4}/);
  const digits = (await code.innerText()).match(/\d{4}/)![0];
  await input.diner.getByRole("button", { name: "Pedir sellos" }).click();
  await input.diner.getByLabel("Código de sala de cuatro dígitos").fill(digits);
}

/** Request plus staff acceptance: the diner reopens the card and sees the stamp confirmed. */
export async function earnStamp(input: { diner: Page; staff: Page }) {
  const { card: before } = await card(input.diner);
  await requestStamps(input);
  await expect(input.diner.getByText("1 pendiente", { exact: true })).toBeVisible();
  const accept = input.staff.getByRole("button", { name: `Aceptar la solicitud de ${before.email}`, exact: true });
  await accept.click({ timeout: 15_000 });
  await expect(accept).toHaveCount(0);
  await input.diner.reload();
  await expect(input.diner.getByText("Confirmaron tu sello", { exact: true })).toBeVisible();
}

export async function card(diner: Page) {
  const cardToken = await diner.evaluate(() => localStorage.getItem("qm-loyalty-card:tapas.localhost"));
  expect(cardToken).toBeTruthy();
  return getTrpcData<{
    card: { email: string; stampsBalance: number };
    pendingRedemption: { id: string } | null;
    pendingStamps: number;
  }>(await callPublicTrpc(diner.request, "loyalty.getCard", { host: "tapas.localhost", cardToken }));
}

export async function requestReward(diner: Page) {
  await diner.getByRole("button", { name: "Canjear", exact: true }).first().click();
  await expect(diner.getByText("Esperando confirmación del personal…")).toBeVisible();
}
