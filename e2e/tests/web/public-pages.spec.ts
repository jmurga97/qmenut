import { expect, test } from "../../fixtures/test";

test("renders every public information route for its requesting tenant and locale", async ({ request }) => {
  const checks = [
    ["http://tapas.localhost:4011/contacto", "Bar La Tasca"],
    ["http://fine.localhost:4011/en/contacto", "Aurum"],
    ["http://cafe.localhost:4011/aviso-legal", "Café Brote"],
    ["http://tapas.localhost:4011/privacidad", "Bar La Tasca"],
    ["http://tapas.localhost:4011/puntos", "Descuento del 10%"],
  ] as const;

  for (const [url, expected] of checks) {
    const response = await request.get(url);
    const body = await response.text();
    expect(response.ok(), body).toBe(true);
    expect(body).toContain(expected);
  }
});

test("renders tenant legal identity without placeholder markers", async ({ request }) => {
  const checks = [
    ["http://fine.localhost:4011/aviso-legal", "Aurum Gastronomía S.L.", "B87654321"],
    ["http://fine.localhost:4011/privacidad", "Aurum Gastronomía S.L.", "B87654321"],
  ] as const;

  for (const [url, expectedName, expectedTaxId] of checks) {
    const response = await request.get(url);
    const body = await response.text();
    expect(response.ok(), body).toBe(true);
    expect(body).toContain(expectedName);
    expect(body).toContain(expectedTaxId);
    expect(body).not.toMatch(/\[(?:Razón social|NIF|Dirección fiscal|email de contacto|QMenut)/);
  }
});

test("redirects unsupported locales and ignores the development template query in the built worker", async ({
  page,
}) => {
  await page.goto("/fr/contacto");
  await expect(page).toHaveURL("http://tapas.localhost:4011/contacto");

  await page.goto("/?template=fast");
  await expect(page.locator(".home-shell")).toHaveAttribute("data-template", "tapas");
  await expect(page.locator(".dev-template-switcher")).toHaveCount(0);
});
