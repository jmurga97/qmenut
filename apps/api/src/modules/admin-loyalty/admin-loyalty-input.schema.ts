import { z } from "zod";

export const venueCodeInputSchema = z.object({ branchId: z.string().trim().min(1) });

export const validateRedemptionInputSchema = z.object({
  redemptionId: z.string().trim().min(1),
  branchId: z.string().trim().min(1),
});

export const rejectRedemptionInputSchema = z.object({
  redemptionId: z.string().trim().min(1),
});

export const undoInputSchema = z.object({
  transactionId: z.number().int(),
  branchId: z.string().trim().min(1),
});

export const programInputSchema = z.object({
  isActive: z.boolean(),
  ticketMedio: z.number().int().min(0).nullable(),
});

export const listCustomersInputSchema = z.object({
  search: z.string().trim().min(1).max(254).optional(),
  sortBy: z
    .enum(["email", "stampsBalance", "totalVisits", "firstVisitAt", "lastVisitAt", "rewardsRedeemed"])
    .default("lastVisitAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  inactiveDays: z.number().int().min(1).optional(),
});

export const visitsChartInputSchema = z.object({
  from: z.number().int(),
  to: z.number().int(),
});
