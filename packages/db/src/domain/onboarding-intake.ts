import { isInternalSupportEmail } from "@qmenut/permissions";
import { z } from "zod";

// The minimum a restaurant gives us to create its tenant; theme, languages and hours are set later in the panel.
const name = z.string().trim().min(1).max(120);
const email = z.email().trim().max(254);
const optionalUrl = z.union([
  z.literal(""),
  z
    .url()
    .max(500)
    .refine((value) => /^https?:\/\//i.test(value), "Usa un enlace HTTP o HTTPS"),
]);
// "b-12.345.678" → "B12345678": owners type tax IDs with spaces, dots and dashes.
const compactTaxId = (value: unknown) =>
  typeof value === "string" ? value.toUpperCase().replaceAll(/[\s.-]/g, "") : value;
// "J123456789" → "J-12345678-9"; shorter RIF numbers are zero-padded to eight digits.
const formatRif = (value: unknown) => {
  const compact = compactTaxId(value);
  if (typeof compact !== "string") return compact;
  const match = /^([JVEGP])(\d{2,9})$/.exec(compact);
  if (!match) return compact;
  const [, letter, digits] = match;
  return `${letter}-${digits.slice(0, -1).padStart(8, "0")}-${digits.slice(-1)}`;
};
const fields = {
  restaurantName: z.string().trim().min(1).max(80),
  subdomain: z
    .string()
    .trim()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/),
  address: z.string().trim().min(1).max(500),
  instagram: optionalUrl,
  ownerName: name,
  ownerEmail: email,
  legalName: name,
  legalAddress: z.string().trim().min(1).max(500),
  menuUrl: optionalUrl,
  notes: z.string().trim().max(3000),
};

const spanishPhone = z.string().regex(/^\+34\d{9}$/);
const venezuelanPhone = z.string().regex(/^\+58\d{10}$/);
const spain = {
  countryCode: z.literal("ESP"),
  taxId: z.preprocess(compactTaxId, z.string().regex(/^[A-Z0-9]\d{7}[A-Z0-9]$/)),
  privacyEmail: email,
  phone: spanishPhone,
  whatsapp: z.union([z.literal(""), spanishPhone]),
};
const venezuela = {
  countryCode: z.literal("VEN"),
  taxId: z.preprocess(formatRif, z.string().regex(/^[JVEGP]-\d{8}-\d$/)),
  phone: venezuelanPhone,
  whatsapp: z.union([z.literal(""), venezuelanPhone]),
};

export const onboardingIntakeSchema = z
  .discriminatedUnion("countryCode", [z.object({ ...fields, ...spain }), z.object({ ...fields, ...venezuela })])
  .superRefine((value, ctx) => {
    if (isInternalSupportEmail(value.ownerEmail))
      ctx.addIssue({ code: "custom", path: ["ownerEmail"], message: "Usa el correo del propietario" });
  });

export type OnboardingIntake = z.infer<typeof onboardingIntakeSchema>;
export type OnboardingIntakeInput = z.input<typeof onboardingIntakeSchema>;

/** The `qmenut-ops` tenant file; the plan is chosen in Lab when downloading. */
export function toTenantFile(data: OnboardingIntake, planCode: "basic" | "business") {
  const spain = data.countryCode === "ESP";
  return {
    restaurant: {
      name: data.restaurantName,
      countryCode: data.countryCode,
      defaultLanguageCode: "es",
      sourceCurrency: spain ? "EUR" : "USD",
      timezone: spain ? "Europe/Madrid" : "America/Caracas",
      languages: ["es"],
      legal: {
        legalName: data.legalName,
        taxId: data.taxId,
        legalAddress: data.legalAddress,
        dataProtectionEmail: spain ? data.privacyEmail : data.ownerEmail,
      },
      emailReplyTo: data.ownerEmail,
    },
    branch: {
      name: data.restaurantName,
      customDomain: `${data.subdomain}.qmenut.app`,
      address: data.address,
      phone: data.phone,
      whatsapp: data.whatsapp || undefined,
      socialLinks: data.instagram ? { instagram: data.instagram } : {},
      planCode,
      schedules: [],
    },
    owner: { name: data.ownerName, email: data.ownerEmail },
    theme: { template: "her" as const, primary: "#A23A28", secondary: "#3F7A4B" },
  };
}
