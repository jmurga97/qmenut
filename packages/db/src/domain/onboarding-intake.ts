import { isInternalSupportEmail } from "@qmenut/permissions";
import { z } from "zod";

const name = z.string().trim().min(1).max(120);
const email = z.email().trim().max(254);
const optionalEmail = z.union([z.literal(""), email]);
const optionalUrl = z.union([
  z.literal(""),
  z
    .url()
    .max(500)
    .refine((value) => /^https?:\/\//i.test(value), "Usa un enlace HTTP o HTTPS"),
]);
const esWhatsapp = z.union([z.literal(""), z.string().regex(/^\+34\d{9}$/)]);
const veWhatsapp = z.union([z.literal(""), z.string().regex(/^\+58\d{10}$/)]);
const phone = z.union([z.literal(""), z.string().regex(/^\+[1-9]\d{7,14}$/)]);
const fields = {
  restaurantName: z.string().trim().min(1).max(80),
  languages: z.array(z.string().trim().min(2).max(12)).min(1).max(14),
  replyEmail: email,
  vesRate: z
    .union([
      z.literal(""),
      z
        .string()
        .regex(/^\d{1,6}(?:\.\d{1,6})?$/)
        .refine((value) => Number(value) > 0 && Number(value) <= 1_000_000),
    ])
    .default(""),
  legalName: name,
  taxId: z.string().trim(),
  legalAddress: z.string().trim().min(1).max(500),
  privacyEmail: optionalEmail,
  branchName: name,
  subdomain: z
    .string()
    .trim()
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/),
  address: z.string().trim().min(1).max(500),
  phone,
  whatsapp: phone,
  instagram: optionalUrl,
  facebook: optionalUrl,
  tiktok: optionalUrl,
  schedules: z
    .array(
      z
        .object({
          dayOfWeek: z.number().int().min(1).max(7),
          openMinute: z.number().int().min(0).max(1439),
          closeMinute: z.number().int().min(1).max(1439),
        })
        .refine((value) => value.openMinute < value.closeMinute),
    )
    .max(28),
  ownerName: name,
  ownerEmail: email,
  template: z.enum(["fine", "her", "fast", "cafe", "tapas"]),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  tagline: z.string().trim().max(120),
  menuUrl: optionalUrl,
  menuByEmail: z.boolean(),
  menuNotes: z.string().trim().max(3000),
};

export const onboardingIntakeSchema = z
  .discriminatedUnion("countryCode", [
    z.object({
      ...fields,
      countryCode: z.literal("ESP"),
      taxId: z
        .string()
        .trim()
        .regex(/^[A-Z0-9]\d{7}[A-Z0-9]$/),
      privacyEmail: email,
      phone: z.string().regex(/^\+34\d{9}$/),
      whatsapp: esWhatsapp,
    }),
    z.object({
      ...fields,
      countryCode: z.literal("VEN"),
      taxId: z
        .string()
        .trim()
        .regex(/^[JVEGP]-\d{8}-\d$/),
      phone: z.string().regex(/^\+58\d{10}$/),
      whatsapp: veWhatsapp,
    }),
  ])
  .superRefine((value, ctx) => {
    if (!value.menuUrl && !value.menuByEmail)
      ctx.addIssue({
        code: "custom",
        path: ["menuUrl"],
        message: "Añade un enlace o indica que enviarás la carta por correo",
      });
    if (isInternalSupportEmail(value.ownerEmail))
      ctx.addIssue({ code: "custom", path: ["ownerEmail"], message: "Usa el correo del propietario" });
    if (!value.languages.includes("es"))
      ctx.addIssue({ code: "custom", path: ["languages"], message: "Incluye español" });
  });

export type OnboardingIntake = z.infer<typeof onboardingIntakeSchema>;

export function toTenantFile(data: OnboardingIntake) {
  const socialLinks = Object.fromEntries(
    Object.entries({ instagram: data.instagram, facebook: data.facebook, tiktok: data.tiktok }).filter(
      ([, value]) => value,
    ),
  );
  return {
    restaurant: {
      name: data.restaurantName,
      countryCode: data.countryCode,
      defaultLanguageCode: "es",
      sourceCurrency: data.countryCode === "ESP" ? "EUR" : "USD",
      timezone: data.countryCode === "ESP" ? "Europe/Madrid" : "America/Caracas",
      languages: data.languages,
      legal: {
        legalName: data.legalName,
        taxId: data.taxId,
        legalAddress: data.legalAddress,
        dataProtectionEmail: data.privacyEmail || data.replyEmail,
      },
      emailReplyTo: data.replyEmail,
    },
    branch: {
      name: data.branchName,
      customDomain: `${data.subdomain}.qmenut.app`,
      address: data.address,
      phone: data.phone || undefined,
      whatsapp: data.whatsapp || undefined,
      socialLinks,
      planCode: "business" as const,
      schedules: data.schedules,
    },
    owner: { name: data.ownerName, email: data.ownerEmail },
    theme: {
      template: data.template,
      primary: data.primary,
      secondary: data.secondary,
      tagline: data.tagline || undefined,
    },
  };
}
