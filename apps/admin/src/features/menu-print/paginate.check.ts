import assert from "node:assert/strict";

import { paginateMenu } from "./paginate";

// Run after changes to print pagination: bun apps/admin/src/features/menu-print/paginate.check.ts
const continued = paginateMenu({
  categories: [{ header: 20, dishes: [40, 40, 40] }],
  capacities: [100, 100, 100, 60],
});
assert.deepEqual(continued, {
  overflow: false,
  slots: [[{ category: 0, dishes: [0, 1] }], [{ category: 0, dishes: [2] }], [], []],
});

const reservedQr = paginateMenu({
  categories: [{ header: 20, dishes: [80, 80, 80, 50] }],
  capacities: [100, 100, 100, 60],
});
assert.equal(reservedQr.overflow, true);
assert.deepEqual(reservedQr.slots[3], []);

const headings = paginateMenu({
  categories: [
    { header: 20, dishes: [50] },
    { header: 20, dishes: [30] },
  ],
  capacities: [100, 100, 100, 60],
});
assert.deepEqual(headings.slots.slice(0, 2), [[{ category: 0, dishes: [0] }], [{ category: 1, dishes: [0] }]]);
assert.equal(paginateMenu({ categories: [{ header: 20, dishes: [101] }], capacities: [100, 100] }).overflow, true);
assert.deepEqual(paginateMenu({ categories: [], capacities: [100, 100, 100, 60] }), {
  slots: [[], [], [], []],
  overflow: false,
});
console.log("Menu print pagination: whole dishes, continued headings, QR space and overflow checked.");
