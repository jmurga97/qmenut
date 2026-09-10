import { afterEach, describe, expect, test } from "bun:test";

import { QM_ALLERGEN_TAG_NAME, defineQmAllergen } from "./atoms/qm-allergen";
import { QM_BADGE_TAG_NAME, defineQmBadge } from "./atoms/qm-badge";
import { QM_BUTTON_TAG_NAME, defineQmButton } from "./atoms/qm-button";
import { QM_CATEGORY_CHIP_TAG_NAME, defineQmCategoryChip } from "./atoms/qm-category-chip";
import { QM_CHIP_TAG_NAME, defineQmChip } from "./atoms/qm-chip";
import { QM_DISH_EXTRAS_TAG_NAME, defineQmDishExtras } from "./atoms/qm-dish-extras";
import { QM_DIVIDER_TAG_NAME, defineQmDivider } from "./atoms/qm-divider";
import { QM_EYEBROW_TAG_NAME, defineQmEyebrow } from "./atoms/qm-eyebrow";
import { QM_HEADING_TAG_NAME, defineQmHeading } from "./atoms/qm-heading";
import { QM_IMAGE_TAG_NAME, defineQmImage } from "./atoms/qm-image";
import { QM_LANG_TAG_NAME, defineQmLang } from "./atoms/qm-lang";
import { QM_PIN_TAG_NAME, defineQmPin } from "./atoms/qm-pin";
import { QM_PRICE_TAG_NAME, defineQmPrice } from "./atoms/qm-price";
import { QM_SECTION_NUM_TAG_NAME, defineQmSectionNum } from "./atoms/qm-section-num";
import { QM_SKELETON_TAG_NAME, defineQmSkeleton } from "./atoms/qm-skeleton";
import { QM_TAB_TAG_NAME, defineQmTab } from "./atoms/qm-tab";
import { QM_WORDMARK_TAG_NAME, defineQmWordmark } from "./atoms/qm-wordmark";
import { mount, shadowQuery, update } from "./test-helpers";

import type { QmLangOption } from "./atoms/qm-lang";

defineQmAllergen();
defineQmBadge();
defineQmButton();
defineQmCategoryChip();
defineQmChip();
defineQmDishExtras();
defineQmDivider();
defineQmEyebrow();
defineQmHeading();
defineQmImage();
defineQmLang();
defineQmPin();
defineQmPrice();
defineQmSectionNum();
defineQmSkeleton();
defineQmTab();
defineQmWordmark();

afterEach(() => document.body.replaceChildren());

describe("display atoms", () => {
  test("render their values and optional branches", async () => {
    const allergen = await mount(document.createElement(QM_ALLERGEN_TAG_NAME));
    allergen.label = "Gluten";
    await update(allergen);
    expect(shadowQuery(allergen, '[part="label"]').textContent).toBe("Gluten");

    const badge = await mount(document.createElement(QM_BADGE_TAG_NAME));
    badge.text = "-30%";
    await update(badge);
    expect(shadowQuery(badge, '[part="text"]').textContent).toBe("-30%");

    const chip = await mount(document.createElement(QM_CHIP_TAG_NAME));
    chip.text = "Abierto";
    chip.variant = "muted";
    await update(chip);
    expect(shadowQuery<HTMLElement>(chip, '[part="text"]').dataset.variant).toBe("muted");

    const eyebrow = await mount(document.createElement(QM_EYEBROW_TAG_NAME));
    eyebrow.text = "Cocina de mercado";
    await update(eyebrow);
    expect(shadowQuery(eyebrow, '[part="text"]').textContent).toBe("Cocina de mercado");

    const wordmark = await mount(document.createElement(QM_WORDMARK_TAG_NAME));
    wordmark.text = "Casa Murga";
    await update(wordmark);
    expect(shadowQuery(wordmark, '[part="text"]').textContent).toBe("Casa Murga");
  });

  test("renders extras, prices, section counts, and divider variants", async () => {
    const extras = await mount(document.createElement(QM_DISH_EXTRAS_TAG_NAME));
    extras.label = "Añade";
    extras.items = [
      { name: "Aguacate", price: "+2 €" },
      { name: "Pan", price: "+1 €" },
    ];
    await update(extras);
    expect(shadowQuery(extras, '[part="label"]').textContent).toBe("Añade");
    expect(extras.renderRoot.querySelectorAll('[part="item"]')).toHaveLength(2);
    expect(shadowQuery(extras, '[part="item"] [part="name"]').textContent).toBe("Aguacate");

    const price = await mount(document.createElement(QM_PRICE_TAG_NAME));
    price.value = "12 €";
    price.oldValue = "15 €";
    await update(price);
    expect(shadowQuery(price, '[part="old-value"]').textContent).toBe("15 €");
    expect(shadowQuery(price, '[part="value"]').textContent).toBe("12 €");
    price.oldValue = undefined;
    await update(price);
    expect(price.renderRoot.querySelector('[part="old-value"]')).toBeNull();

    const section = await mount(document.createElement(QM_SECTION_NUM_TAG_NAME));
    section.num = "01";
    section.label = "Sedes";
    section.count = "3";
    await update(section);
    expect(section.renderRoot.textContent).toContain("01");
    expect(section.renderRoot.textContent).toContain("Sedes");
    expect(shadowQuery(section, '[part="count"]').textContent).toBe("3");

    const divider = await mount(document.createElement(QM_DIVIDER_TAG_NAME));
    divider.variant = "rule";
    await update(divider);
    expect(shadowQuery<HTMLElement>(divider, "hr").dataset.variant).toBe("rule");
  });

  test("supports heading primary and secondary semantics", async () => {
    const heading = await mount(document.createElement(QM_HEADING_TAG_NAME));
    heading.text = "Degustación";
    heading.eyebrow = "Menú";
    await update(heading);
    expect(shadowQuery(heading, '[part="title"]').textContent).toBe("Degustación");
    expect(shadowQuery(heading, '[part="eyebrow"]').textContent).toBe("Menú");
    expect(heading.renderRoot.querySelector('[part="rule"]')).not.toBeNull();

    heading.divider = false;
    heading.variant = "secondary";
    await update(heading);
    expect(heading.renderRoot.querySelector('[part="rule"]')).toBeNull();
    expect(shadowQuery(heading, '[part="secondary"] [role="heading"]').textContent).toBe("Degustación");
  });

  test("renders image fallback content and hides decorative atoms", async () => {
    const image = await mount(document.createElement(QM_IMAGE_TAG_NAME));
    image.label = "Foto del plato";
    await update(image);
    expect(shadowQuery(image, '[part="label"]').textContent).toBe("Foto del plato");

    const pin = await mount(document.createElement(QM_PIN_TAG_NAME));
    pin.size = "18px";
    await update(pin);
    expect(pin.getAttribute("aria-hidden")).toBe("true");
    expect(shadowQuery(pin, '[part="shape"]').getAttribute("style")).toContain("18px");

    const skeleton = await mount(document.createElement(QM_SKELETON_TAG_NAME));
    skeleton.variant = "circle";
    await update(skeleton);
    expect(skeleton.getAttribute("aria-hidden")).toBe("true");
    expect(shadowQuery<HTMLElement>(skeleton, '[part="shape"]').dataset.variant).toBe("circle");
  });
});

describe("interactive atoms", () => {
  test("renders button properties, slots, and disabled state", async () => {
    const button = await mount(document.createElement(QM_BUTTON_TAG_NAME));
    button.variant = "secondary";
    button.size = "sm";
    button.type = "submit";
    button.ariaLabel = "Enviar formulario";
    button.append(document.createTextNode("Enviar"));
    await update(button);

    const nativeButton = shadowQuery<HTMLButtonElement>(button, "button");
    expect(nativeButton.type).toBe("submit");
    expect(nativeButton.dataset.variant).toBe("secondary");
    expect(nativeButton.dataset.size).toBe("sm");
    expect(nativeButton.getAttribute("aria-label")).toBe("Enviar formulario");
    button.disabled = true;
    await update(button);
    expect(nativeButton.disabled).toBe(true);
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  test("emits category selection and exposes controlled pressed state", async () => {
    const chip = await mount(document.createElement(QM_CATEGORY_CHIP_TAG_NAME));
    chip.value = "postres";
    chip.active = true;
    chip.append(document.createTextNode("Postres"));
    await update(chip);

    const eventPromise = new Promise<CustomEvent<{ value: string }>>((resolve) => {
      chip.addEventListener("qm-select", (event) => resolve(event as CustomEvent<{ value: string }>), { once: true });
    });
    shadowQuery<HTMLButtonElement>(chip, "button").click();
    const event = await eventPromise;
    expect(event.detail).toEqual({ value: "postres" });
    expect(shadowQuery(chip, "button").getAttribute("aria-pressed")).toBe("true");
    expect(shadowQuery<HTMLButtonElement>(chip, "button").tabIndex).toBe(0);
  });

  test("renders accessible language options and emits changes", async () => {
    const lang = await mount(document.createElement(QM_LANG_TAG_NAME));
    const options: QmLangOption[] = [
      { value: "es", label: "Español" },
      { value: "en", label: "English" },
    ];
    lang.value = "en";
    lang.options = options;
    lang.label = "Idioma";
    lang.selectId = "language";
    await update(lang);

    const select = shadowQuery<HTMLSelectElement>(lang, "select");
    expect(shadowQuery<HTMLLabelElement>(lang, "label").htmlFor).toBe("language");
    expect(select.options).toHaveLength(2);
    expect(select.value).toBe("en");
    select.value = "es";
    const eventPromise = new Promise<CustomEvent<{ value: string }>>((resolve) => {
      lang.addEventListener("qm-change", (event) => resolve(event as CustomEvent<{ value: string }>), { once: true });
    });
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const changeEvent = await eventPromise;
    expect(changeEvent.detail).toEqual({ value: "es" });
    expect(lang.value).toBe("es");
  });

  test("uses aria-label when a language label is absent and emits tab selection", async () => {
    const lang = await mount(document.createElement(QM_LANG_TAG_NAME));
    lang.ariaLabel = "Currency";
    lang.options = [{ value: "EUR", label: "€" }];
    await update(lang);
    expect(shadowQuery(lang, "select").getAttribute("aria-label")).toBe("Currency");
    expect(lang.renderRoot.querySelector("label")).toBeNull();

    const tab = await mount(document.createElement(QM_TAB_TAG_NAME));
    tab.value = "contact";
    tab.active = false;
    await update(tab);
    const eventPromise = new Promise<CustomEvent<{ value: string }>>((resolve) => {
      tab.addEventListener("qm-select", (event) => resolve(event as CustomEvent<{ value: string }>), { once: true });
    });
    tab.select();
    const selectEvent = await eventPromise;
    expect(selectEvent.detail).toEqual({ value: "contact" });
    const button = shadowQuery<HTMLButtonElement>(tab, "button");
    expect(button.getAttribute("role")).toBe("tab");
    expect(button.getAttribute("aria-selected")).toBe("false");
    expect(button.tabIndex).toBe(-1);
  });
});
