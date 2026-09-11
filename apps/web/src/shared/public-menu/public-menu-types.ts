import type { RouterOutputs } from "~/lib/trpc-client";

/**
 * Types inferred from the tRPC router output (what the client actually receives after
 * serialization), rather than the raw `@qmenut/db` models.
 */
export type PublicMenuData = NonNullable<RouterOutputs["menu"]["publicData"]>;
export type PublicMenuCategory = PublicMenuData["categories"][number];
export type PublicMenuDish = PublicMenuCategory["dishes"][number];
export type PublicMenuLanguage = PublicMenuData["language"];
export type PublicMenuPromotion = PublicMenuData["promotions"][number];
