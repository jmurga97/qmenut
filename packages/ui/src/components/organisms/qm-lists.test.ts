import { describe, expect, test } from "bun:test";

import { QM_MENU_LIST_TAG_NAME, QmMenuList, defineQmMenuList } from "./qm-menu-list";
import { QM_PROMO_LIST_TAG_NAME, QmPromoList, defineQmPromoList } from "./qm-promo-list";
import { QM_RECOMMENDED_LIST_TAG_NAME, QmRecommendedList, defineQmRecommendedList } from "./qm-recommended-list";

import type { LitElement } from "lit";

defineQmMenuList();
defineQmPromoList();
defineQmRecommendedList();

function emptyParagraph(list: LitElement): HTMLParagraphElement | null {
  return list.renderRoot.querySelector('p[part="empty"]');
}

async function withSlottedChildren(list: LitElement): Promise<void> {
  document.body.append(list);
  await list.updateComplete;
  list.append(document.createElement("div"));
  // Deterministic even if the DOM impl does not fire slotchange on append;
  // it exercises the real handler either way.
  list.renderRoot.querySelector("slot")?.dispatchEvent(new Event("slotchange"));
  await list.updateComplete;
}

describe("list element registration", () => {
  test("registers the three public list tags", () => {
    expect(customElements.get(QM_MENU_LIST_TAG_NAME)).toBe(QmMenuList);
    expect(customElements.get(QM_PROMO_LIST_TAG_NAME)).toBe(QmPromoList);
    expect(customElements.get(QM_RECOMMENDED_LIST_TAG_NAME)).toBe(QmRecommendedList);
  });
});

describe("qm-menu-list empty label", () => {
  test("renders the empty label when nothing is slotted", async () => {
    const list = document.createElement(QM_MENU_LIST_TAG_NAME);
    list.emptyLabel = "Sin platos";
    document.body.append(list);
    await list.updateComplete;

    expect(emptyParagraph(list)?.textContent).toBe("Sin platos");
    list.remove();
  });

  test("drops the empty label once children are slotted", async () => {
    const list = document.createElement(QM_MENU_LIST_TAG_NAME);
    list.emptyLabel = "Sin platos";
    await withSlottedChildren(list);

    expect(emptyParagraph(list)).toBeNull();
    list.remove();
  });

  test("renders nothing when empty and no label is set", async () => {
    const list = document.createElement(QM_MENU_LIST_TAG_NAME);
    document.body.append(list);
    await list.updateComplete;

    expect(emptyParagraph(list)).toBeNull();
    list.remove();
  });
});

describe("qm-promo-list empty label", () => {
  test("renders the empty label when nothing is slotted", async () => {
    const list = document.createElement(QM_PROMO_LIST_TAG_NAME);
    list.value = { emptyLabel: "Sin promos" };
    document.body.append(list);
    await list.updateComplete;

    expect(emptyParagraph(list)?.textContent).toBe("Sin promos");
    list.remove();
  });

  test("drops the empty label once children are slotted", async () => {
    const list = document.createElement(QM_PROMO_LIST_TAG_NAME);
    list.value = { emptyLabel: "Sin promos" };
    await withSlottedChildren(list);

    expect(emptyParagraph(list)).toBeNull();
    list.remove();
  });
});

describe("qm-recommended-list empty label", () => {
  test("renders the empty label when nothing is slotted", async () => {
    const list = document.createElement(QM_RECOMMENDED_LIST_TAG_NAME);
    list.value = { emptyLabel: "Sin recomendados" };
    document.body.append(list);
    await list.updateComplete;

    expect(emptyParagraph(list)?.textContent).toBe("Sin recomendados");
    list.remove();
  });

  test("drops the empty label once children are slotted", async () => {
    const list = document.createElement(QM_RECOMMENDED_LIST_TAG_NAME);
    list.value = { emptyLabel: "Sin recomendados" };
    await withSlottedChildren(list);

    expect(emptyParagraph(list)).toBeNull();
    list.remove();
  });
});
