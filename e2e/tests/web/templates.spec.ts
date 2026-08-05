import { expect, test } from "../../fixtures/test";

const TEMPLATES = [
  { host: "fine.localhost", rowRadius: "0px", template: "fine" },
  { host: "her.localhost", rowRadius: "3px", template: "her" },
  { host: "fast.localhost", rowRadius: "14px", template: "fast" },
  { host: "cafe.localhost", rowRadius: "18px", template: "cafe" },
  { host: "tapas.localhost", rowRadius: "0px", template: "tapas" },
] as const;

for (const entry of TEMPLATES) {
  test(`${entry.template} renders its normalized preset from a real tenant host`, async ({ page }) => {
    await page.goto(`http://${entry.host}:4011/`, { waitUntil: "networkidle" });
    const shell = page.locator(".home-shell");

    await expect(shell).toHaveAttribute("data-template", entry.template);
    await expect
      .poll(() => shell.evaluate((element) => getComputedStyle(element).getPropertyValue("--qm-row-radius").trim()))
      .toBe(entry.rowRadius);
    await expect
      .poll(() => shell.evaluate((element) => getComputedStyle(element).getPropertyValue("--qm-primary").trim()))
      .not.toBe("");
    await expect(page).toHaveScreenshot(`${entry.template}-mobile.png`, { fullPage: true });
  });
}
