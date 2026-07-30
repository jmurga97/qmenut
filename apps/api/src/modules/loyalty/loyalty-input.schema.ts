import { z } from "zod";

export const hostInputSchema = z.object({ host: z.string().trim().min(1).optional() });

const emailSchema = z.email().trim().toLowerCase().max(254);

export const createCardInputSchema = hostInputSchema.extend({ email: emailSchema });

export const cardTokenInputSchema = hostInputSchema.extend({ cardToken: z.string().trim().min(1) });

export const earnStampInputSchema = cardTokenInputSchema.extend({
  venueCode: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "El código debe tener 4 dígitos"),
});

export const requestRedemptionInputSchema = cardTokenInputSchema.extend({
  rewardId: z.string().trim().min(1),
});

export const redemptionInputSchema = cardTokenInputSchema.extend({
  redemptionId: z.string().trim().min(1),
});
