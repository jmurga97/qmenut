import { z } from "zod";

import { acceptConsent } from "./accept-consent";
import { cancelRedemption } from "./cancel-redemption";
import { cancelStampRequest } from "./cancel-stamp-request";
import { createCard } from "./create-card";
import { dismissStampOutcome } from "./dismiss-stamp-outcome";
import { getCard } from "./get-card";
import { getLoyaltyProgramForClient } from "./get-loyalty-program";
import { getRedemptionStatus } from "./get-redemption-status";
import {
  acceptConsentInputSchema,
  cardTokenInputSchema,
  createCardInputSchema,
  hostInputSchema,
  redemptionInputSchema,
  requestRedemptionInputSchema,
  requestStampsInputSchema,
  stampRequestInputSchema,
} from "./loyalty-input.schema";
import { requestRedemption } from "./request-redemption";
import { requestStamps } from "./request-stamps";
import { publicProcedure, router } from "../../trpc/trpc";

const programInputSchema = hostInputSchema
  .extend({ locale: z.string().trim().toLowerCase().max(30).optional() })
  .optional();

export const loyaltyRouter = router({
  program: publicProcedure
    .input(programInputSchema)
    .query(({ ctx, input }) =>
      getLoyaltyProgramForClient({ db: ctx.db, request: ctx.request, host: input?.host, locale: input?.locale }),
    ),
  createCard: publicProcedure.input(createCardInputSchema).mutation(({ ctx, input }) =>
    createCard({
      consentAccepted: input.consentAccepted,
      db: ctx.db,
      env: ctx.env,
      request: ctx.request,
      host: input.host,
      email: input.email,
    }),
  ),
  getCard: publicProcedure
    .input(cardTokenInputSchema)
    .query(({ ctx, input }) =>
      getCard({ db: ctx.db, env: ctx.env, request: ctx.request, host: input.host, cardToken: input.cardToken }),
    ),
  acceptConsent: publicProcedure.input(acceptConsentInputSchema).mutation(({ ctx, input }) =>
    acceptConsent({
      db: ctx.db,
      email: input.email,
      env: ctx.env,
      request: ctx.request,
      host: input.host,
      cardToken: input.cardToken,
    }),
  ),
  requestStamps: publicProcedure.input(requestStampsInputSchema).mutation(({ ctx, input }) =>
    requestStamps({
      db: ctx.db,
      env: ctx.env,
      request: ctx.request,
      host: input.host,
      cardToken: input.cardToken,
      venueCode: input.venueCode,
      quantity: input.quantity,
    }),
  ),
  cancelStampRequest: publicProcedure.input(stampRequestInputSchema).mutation(({ ctx, input }) =>
    cancelStampRequest({
      db: ctx.db,
      env: ctx.env,
      request: ctx.request,
      host: input.host,
      cardToken: input.cardToken,
      requestId: input.requestId,
    }),
  ),
  dismissStampOutcome: publicProcedure.input(stampRequestInputSchema).mutation(({ ctx, input }) =>
    dismissStampOutcome({
      db: ctx.db,
      env: ctx.env,
      request: ctx.request,
      host: input.host,
      cardToken: input.cardToken,
      requestId: input.requestId,
    }),
  ),
  requestRedemption: publicProcedure.input(requestRedemptionInputSchema).mutation(({ ctx, input }) =>
    requestRedemption({
      db: ctx.db,
      env: ctx.env,
      request: ctx.request,
      host: input.host,
      cardToken: input.cardToken,
      rewardId: input.rewardId,
    }),
  ),
  cancelRedemption: publicProcedure.input(redemptionInputSchema).mutation(({ ctx, input }) =>
    cancelRedemption({
      db: ctx.db,
      env: ctx.env,
      request: ctx.request,
      host: input.host,
      cardToken: input.cardToken,
      redemptionId: input.redemptionId,
    }),
  ),
  redemptionStatus: publicProcedure.input(redemptionInputSchema).query(({ ctx, input }) =>
    getRedemptionStatus({
      db: ctx.db,
      env: ctx.env,
      request: ctx.request,
      host: input.host,
      cardToken: input.cardToken,
      redemptionId: input.redemptionId,
    }),
  ),
});
