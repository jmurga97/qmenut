export const ROLE_CODES = ["owner", "admin", "staff"] as const;

export const INTERNAL_SUPPORT_ACCOUNTS = [
  { email: "murgapja@gmail.com", name: "Soporte QMenut" },
  { email: "mariagabrielaronca@gmail.com", name: "María Gabriela Ronca" },
] as const;

export const INTERNAL_SUPPORT_EMAILS = INTERNAL_SUPPORT_ACCOUNTS.map((account) => account.email);

const internalSupportEmailSet = new Set<string>(INTERNAL_SUPPORT_EMAILS);

export function isInternalSupportEmail(email: string): boolean {
  return internalSupportEmailSet.has(email.trim().toLowerCase());
}

export type RestaurantRoleCode = (typeof ROLE_CODES)[number];

export type Permission =
  | "menu.write"
  | "menu.toggleDishAvailability"
  | "branch.write"
  | "promotions.write"
  | "theme.write"
  | "languages.write"
  | "loyalty.manage"
  | "loyalty.insights"
  | "loyalty.operate"
  | "billing.manage"
  | "analytics.read"
  | "exchangeRates.write"
  | "users.manage"
  | "reservations.manage";

const ROLE_PERMISSIONS: Record<RestaurantRoleCode, readonly Permission[]> = {
  owner: [
    "menu.write",
    "menu.toggleDishAvailability",
    "branch.write",
    "promotions.write",
    "theme.write",
    "languages.write",
    "loyalty.manage",
    "loyalty.insights",
    "loyalty.operate",
    "exchangeRates.write",
    "billing.manage",
    "analytics.read",
    "users.manage",
    "reservations.manage",
  ],
  admin: [
    "menu.write",
    "menu.toggleDishAvailability",
    "branch.write",
    "promotions.write",
    "theme.write",
    "languages.write",
    "loyalty.manage",
    "loyalty.insights",
    "loyalty.operate",
    "analytics.read",
    "exchangeRates.write",
    "reservations.manage",
  ],
  staff: ["menu.write", "menu.toggleDishAvailability", "loyalty.operate", "exchangeRates.write", "reservations.manage"],
};

export function can(role: RestaurantRoleCode, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const PLAN_CODES = ["basic", "business"] as const;

export type PlanCode = (typeof PLAN_CODES)[number];

/** Business-only features (keys from docs/sales/plan-features.md); what Basic includes needs no key. */
export type PlanFeature =
  | "promotions"
  | "highlights"
  | "menu.schedules"
  | "contact.gallery"
  | "contact.googleReviews"
  | "languages"
  | "loyalty"
  | "pwa"
  | "theme"
  | "menuPrint"
  | "analytics"
  | "users"
  | "multiBranch"
  | "reservations";

const PLAN_FEATURES: Record<PlanCode, readonly PlanFeature[]> = {
  basic: [],
  business: [
    "promotions",
    "highlights",
    "menu.schedules",
    "contact.gallery",
    "contact.googleReviews",
    "languages",
    "loyalty",
    "pwa",
    "theme",
    "menuPrint",
    "analytics",
    "users",
    "multiBranch",
    "reservations",
  ],
};

/** Features shared by the whole restaurant: on when any of its branches has them. The rest follow each branch's plan. */
export const RESTAURANT_FEATURES: readonly PlanFeature[] = ["languages", "loyalty", "analytics", "users"];

export function hasFeature(planCodes: readonly PlanCode[], feature: PlanFeature): boolean {
  return planCodes.some((planCode) => PLAN_FEATURES[planCode].includes(feature));
}
