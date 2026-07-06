import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

/**
 * Types inferred from the tRPC router output (what the client actually receives after
 * serialization), rather than the raw `@qmenut/db` models.
 */
export type PublicMenuData = NonNullable<inferRouterOutputs<AppRouter>["menu"]["publicData"]>;
export type PublicMenuCategory = PublicMenuData["categories"][number];
export type PublicMenuDish = PublicMenuCategory["dishes"][number];
export type PublicMenuLanguage = PublicMenuData["language"];
