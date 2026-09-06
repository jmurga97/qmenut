import { expect, test } from "../../fixtures/test";

for (const template of ["tapas", "fine", "cafe", "her", "fast"]) {
  test(`${template} keeps active fonts and supports the deferred dish dialog`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`http://${template}.localhost:4011/`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".home-shell")).toHaveAttribute("data-template", template);
    const fonts = page.locator('style[id^="qm-font-"]');
    await expect.poll(() => fonts.count()).toBeGreaterThan(0);
    expect(await fonts.count()).toBeLessThanOrEqual(2);
    const fontCss = await fonts.allTextContents();
    expect(fontCss.every((css) => css.includes("@font-face"))).toBe(true);

    await page.waitForFunction(() => customElements.get("qm-dish-row") !== undefined);
    const trigger = page.locator("button.dish-trigger").first();
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await fonts.allTextContents()).toEqual(fontCss);
  });
}
