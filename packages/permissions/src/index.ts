export const ROLE_CODES = ["owner", "admin", "staff"] as const;

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
  | "users.manage";

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
    "billing.manage",
    "analytics.read",
    "exchangeRates.write",
    "users.manage",
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
  ],
  staff: ["menu.write", "menu.toggleDishAvailability", "loyalty.operate", "exchangeRates.write"],
};

export function can(role: RestaurantRoleCode, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
