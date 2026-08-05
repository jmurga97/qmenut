import { expect, test } from "../../fixtures/test";

const TENANTS = [
  {
    host: "tapas.localhost",
    name: "Bar La Tasca",
    legalName: "La Tasca Hostelería S.L.",
    other: "Aurum",
    otherLegalName: "Aurum Gastronomía S.L.",
    template: "tapas",
  },
  {
    host: "fine.localhost",
    name: "Aurum",
    legalName: "Aurum Gastronomía S.L.",
    other: "Café Brote",
    otherLegalName: "La Tasca Hostelería S.L.",
    template: "fine",
  },
  {
    host: "cafe.localhost",
    name: "Café Brote",
    legalName: "",
    other: "Bar La Tasca",
    otherLegalName: "La Tasca Hostelería S.L.",
    template: "cafe",
  },
] as const;

test("isolates tenant HTML and cache keys while interleaving Host headers", async ({ request }) => {
  const cachePath = "/en/privacidad";

  for (const tenant of TENANTS) {
    const response = await request.get(`http://${tenant.host}:4011${cachePath}`);
    const body = await response.text();

    expect(response.ok(), body).toBe(true);
    expect(response.headers()["x-qmenut-cache"]).toBe("MISS");
    expect(body).toContain(tenant.name);
    if (tenant.legalName) expect(body).toContain(tenant.legalName);
    expect(body).not.toContain(tenant.otherLegalName);
    expect(body).toContain(`data-template="${tenant.template}"`);
    expect(body).not.toContain(tenant.other);
  }

  for (const tenant of TENANTS) {
    const response = await request.get(`http://${tenant.host}:4011${cachePath}`);
    const body = await response.text();

    expect(response.ok(), body).toBe(true);
    expect(response.headers()["x-qmenut-cache"]).toBe("HIT");
    expect(body).toContain(tenant.name);
    if (tenant.legalName) expect(body).toContain(tenant.legalName);
    expect(body).not.toContain(tenant.otherLegalName);
    expect(body).not.toContain(tenant.other);
  }

  const unknown = await request.get("http://nope.localhost:4011/", { failOnStatusCode: false });
  const unknownBody = await unknown.text();

  expect(unknownBody).toContain("Carta no disponible");
  for (const tenant of TENANTS) expect(unknownBody).not.toContain(tenant.name);
});
