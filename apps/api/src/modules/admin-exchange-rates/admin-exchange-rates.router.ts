import { upsertRestaurantExchangeRate } from "@qmenut/db/repositories/restaurant-exchange-rates.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";
import { TRPCError } from "@trpc/server";

import { exchangeRateSaveInputSchema } from "./exchange-rate-input.schema";
import { getExchangeRateSummary } from "./get-exchange-rates-summary";
import { bumpPublicContentVersionForRestaurant } from "../../lib/public-content-version";
import { router, tenantProcedure } from "../../trpc/trpc";
import { requirePermission } from "../admin-tenant/require-permission";

function assertUsdSourceCurrency(sourceCurrency: string): void {
  if (sourceCurrency !== "USD") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "La tasa VES solo está disponible para restaurantes con precios en USD",
    });
  }
}

export const adminExchangeRatesRouter = router({
  summary: tenantProcedure.query(async ({ ctx }) => {
    requirePermission(ctx.tenant, "exchangeRates.write");

    const summary = await getExchangeRateSummary({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    if (!summary) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Restaurante no encontrado" });
    }

    return summary;
  }),
  save: tenantProcedure.input(exchangeRateSaveInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "exchangeRates.write");

    const restaurant = await getRestaurantById({ db: ctx.db, restaurantId: ctx.tenant.restaurantId });

    if (!restaurant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Restaurante no encontrado" });
    }

    assertUsdSourceCurrency(restaurant.sourceCurrency);
    await upsertRestaurantExchangeRate({
      db: ctx.db,
      isEnabled: input.isEnabled,
      rate: input.rate,
      restaurantId: ctx.tenant.restaurantId,
      updatedBy: ctx.session.user.id,
    });
    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return { id: ctx.tenant.restaurantId };
  }),
});
