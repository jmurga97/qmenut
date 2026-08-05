import { expect, test } from "../../fixtures/test";
import { getContentVersion } from "../../helpers/tenant-config";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

interface BranchSettings {
  address: string | null;
  dataProtectionEmail: string | null;
  legalAddress: string | null;
  legalName: string | null;
  name: string;
  phone: string | null;
  photos: Array<{ position: number; url: string }>;
  schedules: Array<{ closeMinute: number; dayOfWeek: number; openMinute: number }>;
  socialLinksJson: string | null;
  timezone: string;
  taxId: string | null;
  whatsapp: string | null;
}

function saveInput(settings: BranchSettings) {
  return {
    branchId: "branch_tapas",
    timezone: settings.timezone,
    info: {
      name: settings.name,
      address: settings.address ?? undefined,
      phone: settings.phone ?? undefined,
      whatsapp: settings.whatsapp ?? undefined,
      socialLinksJson: settings.socialLinksJson ?? undefined,
    },
    legal: {
      legalName: settings.legalName ?? undefined,
      taxId: settings.taxId ?? undefined,
      legalAddress: settings.legalAddress ?? undefined,
      dataProtectionEmail: settings.dataProtectionEmail ?? undefined,
    },
    schedules: settings.schedules.map(({ dayOfWeek, openMinute, closeMinute }) => ({
      dayOfWeek,
      openMinute,
      closeMinute,
    })),
    photos: settings.photos.map(({ url, position }) => ({ url, position })),
  };
}

test("saves complete branch settings and invalidates every hosted branch", async ({ page, request }) => {
  const currentResponse = await callTrpcQuery(page, "admin.branches.get", { branchId: "branch_tapas" });
  const current = getTrpcData<BranchSettings>(currentResponse);
  const hosts = ["tapas.localhost", "her.localhost", "fast.localhost"];
  const versions = new Map(
    await Promise.all(hosts.map(async (host) => [host, await getContentVersion(request, host)] as const)),
  );
  const suffix = Date.now();
  const updated: BranchSettings = {
    ...current,
    name: `Bar La Tasca E2E ${suffix}`,
    address: `Calle Integración ${suffix}`,
    legalName: `La Tasca Legal E2E ${suffix}`,
    taxId: `B${String(suffix).slice(-8)}`,
    legalAddress: `Domicilio fiscal E2E ${suffix}`,
    dataProtectionEmail: `privacidad-${suffix}@example.com`,
    phone: "+34941000999",
    whatsapp: "+34600000999",
    socialLinksJson: JSON.stringify({ instagram: "https://instagram.com/qmenut-e2e" }),
    timezone: "Europe/Paris",
    schedules: [{ dayOfWeek: 1, openMinute: 600, closeMinute: 1200 }],
    photos: [{ url: "https://picsum.photos/seed/qmenut-branch-e2e/800/600", position: 0 }],
  };

  await page.goto("/branch");
  await expect(page.getByLabel("Nombre")).toHaveValue(current.name);
  const saved = await callTrpcMutation(page, "admin.branches.save", saveInput(updated));
  expect(saved, saved.body).toMatchObject({ ok: true, status: 200 });

  try {
    for (const host of hosts) {
      await expect.poll(() => getContentVersion(request, host)).not.toBe(versions.get(host));
    }

    const contact = await request.get(`http://tapas.localhost:4011/contacto?branch=${suffix}`);
    const body = await contact.text();
    expect(contact.ok(), body).toBe(true);
    expect(body).toContain(updated.name);
    expect(body).toContain(updated.address ?? "");
    expect(body).toContain(updated.phone ?? "");

    const legal = await request.get(`http://tapas.localhost:4011/aviso-legal?branch=${suffix}`);
    const legalBody = await legal.text();
    expect(legal.ok(), legalBody).toBe(true);
    expect(legalBody).toContain(updated.legalName ?? "");
    expect(legalBody).toContain(updated.taxId ?? "");
  } finally {
    const restored = await callTrpcMutation(page, "admin.branches.save", saveInput(current));
    expect(restored, restored.body).toMatchObject({ ok: true, status: 200 });
  }
});
