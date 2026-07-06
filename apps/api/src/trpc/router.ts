import { authRouter } from "./routers/auth";
import { healthRouter } from "./routers/health";
import { router } from "./trpc";
import { adminBranchesRouter } from "../modules/admin-branches/admin-branches.router";
import { adminMenuRouter } from "../modules/admin-menu/admin-menu.router";
import { adminPromotionsRouter } from "../modules/admin-promotions/admin-promotions.router";
import { adminTenantRouter } from "../modules/admin-tenant/admin-tenant.router";
import { adminTranslationsRouter } from "../modules/admin-translations/admin-translations.router";
import { billingRouter } from "../modules/billing/billing.router";
import { themeRouter } from "../modules/theme/theme.router";
import { publicMenuRouter } from "../modules/public-menu/public-menu.router";

export const appRouter = router({
  auth: authRouter,
  health: healthRouter,
  menu: publicMenuRouter,
  admin: router({
    tenant: adminTenantRouter,
    menu: adminMenuRouter,
    branches: adminBranchesRouter,
    promotions: adminPromotionsRouter,
    theme: themeRouter,
    billing: billingRouter,
    languages: adminTranslationsRouter.languages,
    translations: adminTranslationsRouter.translations,
  }),
});

export type AppRouter = typeof appRouter;
