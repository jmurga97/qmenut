import { expect, test } from "../../fixtures/test";

const ADMIN_ROUTES = [
  "/",
  "/menu",
  "/menu/categories/new",
  "/menu/dishes/new",
  "/promotions",
  "/promotions/new",
  "/loyalty",
  "/loyalty/program",
  "/loyalty/insights",
  "/theme",
  "/languages",
  "/languages/en",
  "/qr",
  "/branch",
  "/billing",
];

test("uses semantic navigation and an environment-aware public menu link", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("link", { name: "Menú", exact: true })).toHaveAttribute("href", "/menu");
  await expect(page.getByRole("link", { name: "Ver carta" })).toHaveAttribute("href", "http://tapas.localhost:4011");
});

test("keeps Select popups exactly as wide as their trigger", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("combobox", { name: "Sucursal activa" });
  await trigger.click();
  const positioner = page.locator(".ming-select__positioner");
  await expect(positioner).toBeVisible();

  const [triggerBox, popupBox] = await Promise.all([trigger.boundingBox(), positioner.boundingBox()]);
  expect(triggerBox).not.toBeNull();
  expect(popupBox).not.toBeNull();
  expect(Math.abs((triggerBox?.width ?? 0) - (popupBox?.width ?? 0))).toBeLessThanOrEqual(1);
});

test("keeps loyalty navigation and the dashboard venue code inside a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/loyalty", { waitUntil: "domcontentloaded" });

  const tabs = page.getByRole("navigation", { name: "Secciones de fidelización" });
  await expect(tabs).toBeVisible();
  expect(await tabs.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const panel = page.locator(".loyalty-code-panel--compact");
  const code = panel.locator(".loyalty-code-digits");
  await expect(code).toBeVisible();
  const [panelBox, codeBox] = await Promise.all([panel.boundingBox(), code.boundingBox()]);
  expect(panelBox).not.toBeNull();
  expect(codeBox).not.toBeNull();
  expect((codeBox?.x ?? 0) + (codeBox?.width ?? 0)).toBeLessThanOrEqual((panelBox?.x ?? 0) + (panelBox?.width ?? 0));
});

test("does not nest interactive controls in dropdown triggers", async ({ page }) => {
  for (const route of ["/languages", "/loyalty/program"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".admin-page")).toBeVisible();
    await expect(page.locator("button button")).toHaveCount(0);
  }
});

test("does not emit runtime or server errors while visiting admin routes", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    const intentionallyBlockedPlaceholder = text === "Failed to load resource: net::ERR_FAILED";
    if (message.type() === "error" && !intentionallyBlockedPlaceholder) errors.push(`console: ${text}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500) errors.push(`response: ${response.status()} ${response.url()}`);
  });

  for (const route of ADMIN_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.locator(".admin-page").waitFor();
  }

  expect(errors).toEqual([]);
});
