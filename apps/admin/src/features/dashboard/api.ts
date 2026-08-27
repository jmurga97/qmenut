/**
 * Composition boundary of the dashboard feature: the only file allowed to reach into
 * sibling features. Everything the dashboard renders is assembled from existing
 * query/mutation factories so cache keys stay shared with their owning features.
 */
export { getBillingOverviewQueryOptions } from "~/features/billing/api";
export { getAnalyticsSnapshotQueryOptions } from "~/features/analytics/api";
export {
  getLanguageCatalogQueryOptions,
  getLanguagesQueryOptions,
  getTranslationsQueryOptions,
} from "~/features/languages/api";
export {
  getLoyaltySummaryQueryOptions,
  getLoyaltyVisitsQueryOptions,
  getPendingRedemptionsQueryOptions,
  getVenueCodeQueryOptions,
} from "~/features/loyalty/api";
export {
  getDishAvailabilityMutationOptions,
  getMenuCategoriesQueryOptions,
  getMenuDishesQueryOptions,
} from "~/features/menu/api";
