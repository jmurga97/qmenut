import { cancelRedemption } from "./cancel-redemption";
import { createCard } from "./create-card";
import { earnStamp } from "./earn-stamp";
import { getCard } from "./get-card";
import { getLoyaltyProgramForClient } from "./get-loyalty-program";
import { getRedemptionStatus } from "./get-redemption-status";
import {
  cardTokenInputSchema,
  createCardInputSchema,
  earnStampInputSchema,
  hostInputSchema,
  redemptionInputSchema,
  requestRedemptionInputSchema,
} from "./loyalty-input.schema";
import { requestRedemption } from "./request-redemption";
import { publicProcedure, router } from "../../trpc/trpc";

export const loyaltyRouter = router({
  program: publicProcedure
    .input(hostInputSchema.optional())
    .query(({ ctx, input }) => getLoyaltyProgramForClient({ db: ctx.db, request: ctx.request, host: input?.host })),
  createCard: publicProcedure
    .input(createCardInputSchema)
    .mutation(({ ctx, input }) =>
      createCard({ db: ctx.db, env: ctx.env, request: ctx.request, host: input.host, email: input.email }),
    ),
  getCard: publicProcedure
    .input(cardTokenInputSchema)
    .query(({ ctx, input }) =>
      getCard({ db: ctx.db, env: ctx.env, request: ctx.request, host: input.host, cardToken: input.cardToken }),
    ),
  earnStamp: publicProcedure.input(earnStampInputSchema).mutation(({ ctx, input }) =>
    earnStamp({
      db: ctx.db,
      env: ctx.env,
      request: ctx.request,
      host: input.host,
      cardToken: input.cardToken,
      venueCode: input.venueCode,
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
