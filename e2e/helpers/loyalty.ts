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

export async function earnStamp(input: { diner: Page; staff: Page }) {
  await input.staff.goto("http://localhost:5174/loyalty");
  const code = input.staff.locator("strong").filter({ hasText: "Código actual:" });
  await expect(code).toContainText(/\d{4}/);
  const digits = (await code.innerText()).match(/\d{4}/)![0];
  await input.diner.getByRole("button", { name: "Pedir mi sello" }).click();
  await input.diner.getByLabel("Código de sala de cuatro dígitos").fill(digits);
}

export async function card(diner: Page) {
  const cardToken = await diner.evaluate(() => localStorage.getItem("qm-loyalty-card:tapas.localhost"));
  expect(cardToken).toBeTruthy();
  return getTrpcData<{
    card: { stampsBalance: number };
    pendingRedemption: { id: string } | null;
  }>(await callPublicTrpc(diner.request, "loyalty.getCard", { host: "tapas.localhost", cardToken }));
}

export async function requestReward(diner: Page) {
  await diner.getByRole("button", { name: "Canjear", exact: true }).first().click();
  await expect(diner.getByText("Esperando confirmación del personal…")).toBeVisible();
}
