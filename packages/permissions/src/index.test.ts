import { describe, expect, test } from "vitest";

import { can } from "./index";

import type { Permission, RestaurantRoleCode } from "./index";

const ALL_PERMISSIONS: readonly Permission[] = [
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
];

const EXPECTED: Record<RestaurantRoleCode, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter((permission) => permission !== "billing.manage"),
  staff: ["menu.toggleDishAvailability", "loyalty.operate"],
};

describe("permission matrix", () => {
  for (const role of ["owner", "admin", "staff"] as const) {
    test(`${role} permissions`, () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(can(role, permission)).toBe(EXPECTED[role].includes(permission));
      }
    });
  }
});
