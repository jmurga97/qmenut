import { expect } from "@playwright/test";

import type { Page } from "@playwright/test";

function getOtpSlots(page: Page, label = "Código OTP") {
  return page.getByRole("group", { name: label }).locator("input");
}

export async function expectOtpValue(page: Page, value: string, label?: string): Promise<void> {
  const slots = getOtpSlots(page, label);
  await expect(slots).toHaveCount(value.length);
  await expect
    .poll(() => slots.evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value).join("")))
    .toBe(value);
}

export async function fillOtp(page: Page, value: string, label?: string): Promise<void> {
  const slots = getOtpSlots(page, label);
  await expect(slots).toHaveCount(value.length);
  for (const [index, digit] of [...value].entries()) {
    await slots.nth(index).fill(digit);
  }
}

export async function selectMingOption(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
