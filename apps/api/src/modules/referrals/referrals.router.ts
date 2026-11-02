import { z } from "zod";

import { getMyReferrals, savePayoutDetails, signOut, submitReferral } from "./participant-referrals";
import { exchangeLink, getOffer, joinProgram, recordVisit, requestAccess } from "./public-referrals";
import { emailSchema, restaurantInputSchema, venezuelanMobileSchema } from "./referral-domain";
import { participantProcedure, publicProcedure, router } from "../../trpc/trpc";

const codeSchema = z.string().regex(/^[0-9a-f]{32}$/);
const nameSchema = z.string().trim().min(2).max(120);
const idNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((value) => value.replaceAll(/[^VEJPG\d]/g, ""))
  .pipe(z.string().regex(/^[VEJPG]\d{5,9}$/, "Usa el formato V12345678"));

const offerInputSchema = z.object({ code: codeSchema.nullable() });
const visitInputSchema = z.object({ code: codeSchema });
const joinInputSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: venezuelanMobileSchema,
  restaurant: restaurantInputSchema,
});
const accessInputSchema = z.object({ email: emailSchema });
const exchangeInputSchema = z.object({ token: z.string().min(20).max(100) });
const submitInputSchema = z.object({ restaurant: restaurantInputSchema });
const payoutInputSchema = z.object({
  bank: z
    .string()
    .trim()
    .regex(/^\d{4} .{2,60}$/, "Elige un banco"),
  idNumber: idNumberSchema,
  phone: venezuelanMobileSchema,
});

export const referralsRouter = router({
  offer: publicProcedure.input(offerInputSchema).query(({ ctx, input }) => getOffer({ db: ctx.db, code: input.code })),
  // A mutation, so only a browser that ran the page counts; link scanners only fetch it.
  visit: publicProcedure
    .input(visitInputSchema)
    .mutation(({ ctx, input }) => recordVisit({ db: ctx.db, code: input.code })),
  join: publicProcedure.input(joinInputSchema).mutation(({ ctx, input }) => joinProgram({ ...ctx, ...input })),
  requestAccess: publicProcedure
    .input(accessInputSchema)
    .mutation(({ ctx, input }) => requestAccess({ ...ctx, ...input })),
  exchange: publicProcedure.input(exchangeInputSchema).mutation(({ ctx, input }) => exchangeLink({ ...ctx, ...input })),
  me: participantProcedure.query(({ ctx }) => getMyReferrals(ctx)),
  submit: participantProcedure
    .input(submitInputSchema)
    .mutation(({ ctx, input }) => submitReferral({ ...ctx, ...input })),
  savePayout: participantProcedure
    .input(payoutInputSchema)
    .mutation(({ ctx, input }) => savePayoutDetails({ ...ctx, ...input })),
  signOut: participantProcedure.mutation(({ ctx }) => signOut(ctx)),
});
