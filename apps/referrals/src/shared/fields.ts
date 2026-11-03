import { z } from "zod";

const usdFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

export const usd = (cents: number): string => usdFormat.format(cents / 100);

/** "0414-123 45 67", "414 1234567" or "+58 414…" → "+584141234567", as the API stores it. */
function toVenezuelanE164(value: string): string {
  const digits = value.replaceAll(/\D/g, "");
  if (digits.startsWith("58")) return `+${digits}`;

  return `+58${digits.startsWith("0") ? digits.slice(1) : digits}`;
}

export const mobileSchema = z
  .string()
  .trim()
  .transform(toVenezuelanE164)
  .pipe(z.string().regex(/^\+584(?:12|14|16|22|24|26)\d{7}$/, "Usa un celular venezolano, p. ej. 0414-123 4567"));

const phoneSchema = z
  .string()
  .trim()
  .transform(toVenezuelanE164)
  .pipe(z.string().regex(/^\+58[24]\d{9}$/, "Usa un teléfono venezolano, p. ej. 0212-123 4567"));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

export const emailSchema = z.email("Escribe un correo válido").trim().toLowerCase();

export const restaurantSchema = z.object({
  restaurantName: z.string().trim().min(2, "Escribe el nombre del restaurante").max(120),
  contactName: z.string().trim().min(2, "¿Con quién hablamos?").max(120),
  contactPhone: phoneSchema,
  contactEmail: z.union([z.literal("").transform(() => null), emailSchema]),
  city: optionalText(80),
  website: optionalText(200),
});

export type RestaurantFormValues = z.input<typeof restaurantSchema>;

export const EMPTY_RESTAURANT: RestaurantFormValues = {
  restaurantName: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  city: "",
  website: "",
};
