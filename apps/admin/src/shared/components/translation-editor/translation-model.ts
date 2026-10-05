import type { RouterInputs, RouterOutputs } from "~/lib/trpc";

export type TextItem = RouterOutputs["admin"]["translations"]["list"][number];
export type SaveRow = RouterInputs["admin"]["translations"]["save"]["rows"][number];
export type Drafts = ReadonlyMap<string, string>;

const MENU_TYPES = new Set(["category", "dish", "variant_group", "variant_option"]);
/** Entities with several fields get a heading; single-name entities name themselves in the row label. */
export const HEADED_TYPES = new Set(["dish", "promotion", "reward"]);

export const keyOf = (item: TextItem) => `${item.entityType}:${item.entityId}:${item.field}`;
export const storedValue = (item: TextItem) => item.value || item.text;
export const ownerOf = (item: TextItem) => item.dishId ?? item.entityId;
/** Variants belong to their dish, so they share its heading. */
export const isHeaded = (item: TextItem) => HEADED_TYPES.has(item.dishId ? "dish" : item.entityType);

/** The API returns texts in carta order, so a category row opens the section its dishes and variants follow. */
export function toSections(items: TextItem[]) {
  let menuSection = "dish";
  return Map.groupBy(items, (item) => {
    if (item.entityType === "category") menuSection = item.entityId;
    return MENU_TYPES.has(item.entityType) ? menuSection : item.entityType;
  });
}
