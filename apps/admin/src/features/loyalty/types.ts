import { z } from "zod";

import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;
const rewardTypeSchema = z.enum(["free_dish", "percentage_discount", "special_price"]);
const customerSortSchema = z.enum([
  "email",
  "stampsBalance",
  "totalVisits",
  "firstVisitAt",
  "lastVisitAt",
  "rewardsRedeemed",
]);
const sortDirectionSchema = z.enum(["asc", "desc"]);
const visitsPeriodSchema = z.enum(["30d", "12m"]);
const searchBoolean = z.union([z.boolean(), z.stringbool()]).catch(false);
export const loyaltyInsightsSearchSchema = z.object({
  search: z.string().trim().catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  sortBy: customerSortSchema.catch("lastVisitAt"),
  sortDir: sortDirectionSchema.catch("desc"),
  inactive: searchBoolean,
  period: visitsPeriodSchema.catch("30d"),
});
const optionalMoneySchema = z
  .string()
  .trim()
  .regex(/^(?:\d+(?:\.\d+)?|)$/, "Indica un importe válido");
const costSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, "El coste debe ser un número entero de sellos");
const percentageSchema = z
  .string()
  .trim()
  .regex(/^(?:100|\d{1,2}|)$/, "Indica un porcentaje entre 0 y 100");
export const rewardFormSchema = z
  .object({
    rewardId: z.string().nullable(),
    name: z.string().trim().min(1, { message: "Escribe un nombre para el premio" }).max(200),
    description: z.string().trim().max(2000),
    cost: costSchema,
    type: rewardTypeSchema,
    percentage: percentageSchema,
    specialPriceEuros: optionalMoneySchema,
    freeDishId: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((reward, context) => {
    if (reward.type === "free_dish" && !reward.freeDishId) {
      context.addIssue({ code: "custom", path: ["freeDishId"], message: "Selecciona un plato" });
    }
    if (reward.type === "percentage_discount" && reward.percentage === "") {
      context.addIssue({ code: "custom", path: ["percentage"], message: "Indica un porcentaje" });
    }
    if (reward.type === "special_price") {
      if (!reward.freeDishId) {
        context.addIssue({ code: "custom", path: ["freeDishId"], message: "Selecciona un plato" });
      }
      if (reward.specialPriceEuros === "") {
        context.addIssue({ code: "custom", path: ["specialPriceEuros"], message: "Indica un precio especial" });
      }
    }
  });
export const loyaltyProgramFormSchema = z.object({
  isActive: z.boolean(),
  ticketMedioEuros: optionalMoneySchema,
  rewards: z.array(rewardFormSchema),
});
export type CustomerSort = z.infer<typeof customerSortSchema>;
export type LoyaltyInsightsSearch = z.infer<typeof loyaltyInsightsSearchSchema>;
export type LoyaltyProgramFormValues = z.infer<typeof loyaltyProgramFormSchema>;
export type RewardFormValues = z.infer<typeof rewardFormSchema>;
export type RewardType = z.infer<typeof rewardTypeSchema>;
export type SortDirection = z.infer<typeof sortDirectionSchema>;
export type VisitsPeriod = z.infer<typeof visitsPeriodSchema>;
export type LoyaltyProgramResponse = RouterOutputs["admin"]["loyalty"]["getProgram"];
export type PendingRedemption = RouterOutputs["admin"]["loyalty"]["pendingRedemptions"][number];
export type LoyaltyCustomer = RouterOutputs["admin"]["loyalty"]["insights"]["customers"]["rows"][number];
export type LoyaltyVisitsPoint = RouterOutputs["admin"]["loyalty"]["insights"]["visitsChart"][number];
