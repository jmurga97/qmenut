export interface PrintSegment {
  category: number;
  dishes: number[];
}
export interface MeasuredCategory {
  header: number;
  dishes: number[];
}
export interface Pagination {
  slots: PrintSegment[][];
  overflow: boolean;
}

/** Each measured dish stays whole, with its category heading on every continuation. */
export function paginateMenu({
  categories,
  capacities,
}: {
  categories: MeasuredCategory[];
  capacities: number[];
}): Pagination {
  const slots: PrintSegment[][] = capacities.map(() => []);
  const rows = categories.flatMap((category, categoryIndex) =>
    category.dishes.map((height, dish) => ({ category: categoryIndex, dish, height, header: category.header })),
  );
  let slot = 0;
  let used = 0;
  for (const row of rows) {
    let segment = slots[slot]?.at(-1);
    const headerHeight = segment?.category === row.category ? 0 : row.header;
    if (used + headerHeight + row.height > (capacities[slot] ?? 0)) {
      slot += 1;
      used = 0;
      segment = undefined;
    }
    const required = row.height + (segment?.category === row.category ? 0 : row.header);
    if (!slots[slot] || used + required > (capacities[slot] ?? 0)) return { slots, overflow: true };
    if (segment?.category !== row.category) {
      segment = { category: row.category, dishes: [] };
      slots[slot].push(segment);
    }
    segment.dishes.push(row.dish);
    used += required;
  }
  return { slots, overflow: false };
}
