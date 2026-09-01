import { authRouter } from "./routers/auth";
import { healthRouter } from "./routers/health";
import { router } from "./trpc";
import { adminAnalyticsRouter } from "../modules/admin-analytics/admin-analytics.router";
import { adminBranchesRouter } from "../modules/admin-branches/admin-branches.router";
import { adminExchangeRatesRouter } from "../modules/admin-exchange-rates/admin-exchange-rates.router";
import { adminImagesRouter } from "../modules/admin-images/admin-images.router";
import { adminLoyaltyRouter } from "../modules/admin-loyalty/admin-loyalty.router";
import { adminMenuRouter } from "../modules/admin-menu/admin-menu.router";
import { adminPromotionsRouter } from "../modules/admin-promotions/admin-promotions.router";
import { adminTenantRouter } from "../modules/admin-tenant/admin-tenant.router";
import { adminTranslationsRouter } from "../modules/admin-translations/admin-translations.router";
import { adminUsersRouter } from "../modules/admin-users/admin-users.router";
import { billingRouter } from "../modules/billing/billing.router";
import { loyaltyRouter } from "../modules/loyalty/loyalty.router";
import { publicMenuRouter } from "../modules/public-menu/public-menu.router";
import { themeRouter } from "../modules/theme/theme.router";

export const appRouter = router({
  auth: authRouter,
  health: healthRouter,
  menu: publicMenuRouter,
  loyalty: loyaltyRouter,
  admin: router({
    analytics: adminAnalyticsRouter,
    tenant: adminTenantRouter,
    menu: adminMenuRouter,
    branches: adminBranchesRouter,
    exchangeRates: adminExchangeRatesRouter,
    images: adminImagesRouter,
    promotions: adminPromotionsRouter,
    theme: themeRouter,
    billing: billingRouter,
    loyalty: adminLoyaltyRouter,
    languages: adminTranslationsRouter.languages,
    translations: adminTranslationsRouter.translations,
    users: adminUsersRouter,
  }),
});

export type AppRouter = typeof appRouter;
