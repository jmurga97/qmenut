import { afterEach, describe, expect, test } from "bun:test";

import { defineQmAllergen } from "./atoms/qm-allergen";
import { defineQmDishExtras } from "./atoms/qm-dish-extras";
import { defineQmLang } from "./atoms/qm-lang";
import { defineQmTab } from "./atoms/qm-tab";
import { defineQmCodeInput } from "./molecules/qm-code-input";
import { defineQmDishRow } from "./molecules/qm-dish-row";
import { defineQmFeatured } from "./molecules/qm-featured";
import { defineQmPromo } from "./molecules/qm-promo";
import { defineQmRewardRow } from "./molecules/qm-reward-row";
import { defineQmSectionHeader } from "./molecules/qm-section-header";
import { QM_CONTACT_PANEL_TAG_NAME, defineQmContactPanel } from "./organisms/qm-contact-panel";
import { QM_DISH_MODAL_TAG_NAME, defineQmDishModal } from "./organisms/qm-dish-modal";
import { QM_HERO_HEADER_TAG_NAME, defineQmHeroHeader } from "./organisms/qm-hero-header";
import { QM_LOYALTY_CARD_TAG_NAME, defineQmLoyaltyCard } from "./organisms/qm-loyalty-card";
import { QM_LOYALTY_SIGNUP_TAG_NAME, defineQmLoyaltySignup } from "./organisms/qm-loyalty-signup";
import { QM_MENU_LIST_TAG_NAME, defineQmMenuList } from "./organisms/qm-menu-list";
import { QM_NAV_BAR_TAG_NAME, defineQmNavBar } from "./organisms/qm-nav-bar";
import { QM_PAGE_HEADER_TAG_NAME, defineQmPageHeader } from "./organisms/qm-page-header";
import { QM_PROMO_LIST_TAG_NAME, defineQmPromoList } from "./organisms/qm-promo-list";
import { QM_RECOMMENDED_LIST_TAG_NAME, defineQmRecommendedList } from "./organisms/qm-recommended-list";
import { QM_REDEEM_WAIT_TAG_NAME, defineQmRedeemWait } from "./organisms/qm-redeem-wait";
import { dispatchSlotChange, mount, shadowQuery, update } from "./test-helpers";

import type { QmLang } from "./atoms/qm-lang";
import type { QmPrice } from "./atoms/qm-price";
import type { QmSectionNum } from "./atoms/qm-section-num";
import type { QmWordmark } from "./atoms/qm-wordmark";
import type { QmStampGrid } from "./molecules/qm-stamp-grid";

defineQmAllergen();
defineQmDishExtras();
defineQmLang();
defineQmTab();
defineQmCodeInput();
defineQmDishRow();
defineQmFeatured();
defineQmPromo();
defineQmRewardRow();
defineQmSectionHeader();
defineQmContactPanel();
defineQmDishModal();
defineQmHeroHeader();
defineQmLoyaltyCard();
defineQmLoyaltySignup();
defineQmMenuList();
defineQmNavBar();
defineQmPageHeader();
defineQmPromoList();
defineQmRecommendedList();
defineQmRedeemWait();

afterEach(() => document.body.replaceChildren());

describe("navigation organisms", () => {
  test("keeps page header semantics and forwards currency changes", async () => {
    const header = await mount(document.createElement(QM_PAGE_HEADER_TAG_NAME));
    header.topbarBrand = "Casa";
    header.topbarName = "Murga";
    header.title = "Menú";
    header.subtitle = "Cocina de mercado";
    header.headingLevel = 2;
    header.langOptions = [{ value: "es", label: "Español" }];
    header.langValue = "es";
    header.langLabel = "Idioma";
    header.currencyOptions = [{ value: "EUR", label: "€" }];
    header.currencyValue = "EUR";
    header.currencyLabel = "Moneda";
    await update(header);

    expect(shadowQuery(header, '[part="topbar-text"]').textContent).toBe("Casa / Murga");
    expect(shadowQuery(header, '[part="title-wrap"]').getAttribute("aria-level")).toBe("2");
    expect(shadowQuery(header, '[part="subtitle"]').textContent).toBe("Cocina de mercado");
    expect(header.renderRoot.querySelectorAll("qm-lang")).toHaveLength(2);
    expect(header.renderRoot.querySelector("qm-divider")).not.toBeNull();

    const currency = header.renderRoot.querySelectorAll<QmLang>("qm-lang")[1];
    if (!currency) throw new Error("currency selector not rendered");
    const select = shadowQuery<HTMLSelectElement>(currency, "select");
    const eventPromise = new Promise<CustomEvent<{ value: string }>>((resolve) => {
      header.addEventListener("qm-currency-change", (event) => resolve(event as CustomEvent<{ value: string }>), {
        once: true,
      });
    });
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const currencyEvent = await eventPromise;
    expect(currencyEvent.detail).toEqual({ value: "EUR" });

    header.hideSeparator = true;
    header.subtitle = undefined;
    await update(header);
    expect(header.renderRoot.querySelector("qm-divider")).toBeNull();
    expect(header.renderRoot.querySelector('[part="subtitle"]')).toBeNull();
  });

  test("moves nav-bar focus and emits selection for keyboard navigation", async () => {
    const nav = await mount(document.createElement(QM_NAV_BAR_TAG_NAME));
    nav.ariaLabel = "Navegación principal";
    const first = document.createElement("qm-tab");
    first.value = "menu";
    const second = document.createElement("qm-tab");
    second.value = "destacados";
    second.active = true;
    const third = document.createElement("qm-tab");
    third.value = "puntos";
    nav.append(first, second, third);
    await update(nav);
    await Promise.all([update(first), update(second), update(third)]);

    const eventPromise = new Promise<CustomEvent<{ value: string }>>((resolve) => {
      nav.addEventListener("qm-select", (event) => resolve(event as CustomEvent<{ value: string }>), { once: true });
    });
    const key = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true, cancelable: true });
    second.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(true);
    const selectEvent = await eventPromise;
    expect(selectEvent.detail).toEqual({ value: "puntos" });

    const home = new KeyboardEvent("keydown", { key: "Home", bubbles: true, composed: true, cancelable: true });
    third.dispatchEvent(home);
    expect(home.defaultPrevented).toBe(true);
    expect(shadowQuery(nav, '[role="tablist"]').getAttribute("aria-label")).toBe("Navegación principal");
  });

  test("composes hero photo, logo, language, and currency controls", async () => {
    const hero = await mount(document.createElement(QM_HERO_HEADER_TAG_NAME));
    hero.heroLabel = "Hoy";
    hero.name = "Casa Murga";
    hero.tagline = "Cocina de mercado";
    hero.langOptions = [{ value: "es", label: "Español" }];
    hero.langValue = "es";
    hero.langLabel = "Idioma";
    hero.currencyOptions = [
      { value: "EUR", label: "€" },
      { value: "USD", label: "$" },
    ];
    hero.currencyValue = "EUR";
    hero.currencyLabel = "Moneda";
    hero.compact = true;
    const photo = document.createElement("img");
    photo.slot = "photo";
    const logo = document.createElement("span");
    logo.slot = "logo";
    logo.textContent = "CM";
    hero.append(photo, logo);
    await update(hero);

    expect(hero.hasAttribute("compact")).toBe(true);
    expect(shadowQuery(hero, '[part="hero-label"]').textContent).toBe("Hoy");
    expect(shadowQuery<QmWordmark>(hero, '[part="name"]').text).toBe("Casa Murga");
    expect(shadowQuery(hero, '[part="tagline"]').textContent).toBe("Cocina de mercado");
    expect(hero.renderRoot.querySelectorAll("qm-lang")).toHaveLength(2);
    expect(shadowQuery(hero, 'qm-image[part="photo"]')).not.toBeNull();
    expect(shadowQuery(hero, 'qm-image[part="logo"]')).not.toBeNull();

    const currency = hero.renderRoot.querySelectorAll<QmLang>("qm-lang")[1];
    if (!currency) throw new Error("currency selector not rendered");
    const select = shadowQuery<HTMLSelectElement>(currency, "select");
    select.value = "USD";
    const eventPromise = new Promise<CustomEvent<{ value: string }>>((resolve) => {
      hero.addEventListener("qm-currency-change", (event) => resolve(event as CustomEvent<{ value: string }>), {
        once: true,
      });
    });
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const currencyEvent = await eventPromise;
    expect(currencyEvent.detail).toEqual({ value: "USD" });
  });
});

describe("menu and contact organisms", () => {
  test("composes contact sections conditionally and preserves named slots", async () => {
    const panel = await mount(document.createElement(QM_CONTACT_PANEL_TAG_NAME));
    const branch = document.createElement("div");
    branch.slot = "sedes";
    branch.textContent = "Casa Murga";
    const review = document.createElement("blockquote");
    review.slot = "reviews";
    review.textContent = "Excelente";
    panel.append(branch, review);
    panel.value = {
      sedesNum: "03",
      sedesLabel: "Locales",
      map: {
        ariaLabel: "Mapa",
        openMapsLabel: "Abrir en Maps",
        markers: [
          {
            id: "invalid",
            name: "Casa Murga",
            address: "",
            current: false,
            directionsHref: "https://maps.google.com",
            latitude: 101,
            longitude: 0,
          },
        ],
      },
      socialLinks: [{ href: "https://instagram.com/casa", label: "Instagram" }],
      socialLinksLabel: "Redes",
    };
    await update(panel);

    expect(panel.renderRoot.querySelector('[part="ubicacion"]')).not.toBeNull();
    expect(panel.renderRoot.querySelector('[part="social-links"]')).not.toBeNull();
    expect(shadowQuery<QmSectionNum>(panel, '[part="sedes-header"]').num).toBe("03");
    expect(shadowQuery<QmSectionNum>(panel, '[part="sedes-header"]').label).toBe("Locales");
    expect(panel.renderRoot.querySelector('slot[name="reviews"]')).not.toBeNull();

    panel.value = { socialLinks: [], map: { ariaLabel: "Mapa", openMapsLabel: "Maps", markers: [] } };
    await update(panel);
    expect(panel.renderRoot.querySelector('[part="ubicacion"]')).toBeNull();
    expect(panel.renderRoot.querySelector('[part="social-links"]')).toBeNull();
    expect(shadowQuery<QmSectionNum>(panel, '[part="sedes-header"]').num).toBe("01");
  });

  test("renders menu compositions and updates empty state when a dish is slotted", async () => {
    const menu = await mount(document.createElement(QM_MENU_LIST_TAG_NAME));
    menu.emptyLabel = "Sin platos";
    const featured = document.createElement("qm-featured");
    featured.slot = "featured";
    const section = document.createElement("qm-section-header");
    section.slot = "section-header";
    const dish = document.createElement("qm-dish-row");
    menu.append(featured, section, dish);
    await update(menu);
    dispatchSlotChange(menu);
    await update(menu);
    expect(menu.renderRoot.querySelector<HTMLSlotElement>('slot[name="featured"]')?.assignedElements()).toHaveLength(1);
    expect(
      menu.renderRoot.querySelector<HTMLSlotElement>('slot[name="section-header"]')?.assignedElements(),
    ).toHaveLength(1);
    expect(menu.renderRoot.querySelector('[part="empty"]')).toBeNull();
  });

  test("composes promo and recommended lists with their child elements", async () => {
    const promos = await mount(document.createElement(QM_PROMO_LIST_TAG_NAME));
    promos.value = { emptyLabel: "Sin promociones" };
    const promo = document.createElement("qm-promo");
    promos.append(promo);
    await update(promos);
    dispatchSlotChange(promos);
    await update(promos);
    expect(promos.renderRoot.querySelector('[part="empty"]')).toBeNull();
    expect(promos.renderRoot.querySelector("slot")?.assignedElements()).toHaveLength(1);

    const recommended = await mount(document.createElement(QM_RECOMMENDED_LIST_TAG_NAME));
    recommended.value = { emptyLabel: "Sin recomendados" };
    const dish = document.createElement("qm-dish-row");
    recommended.append(dish);
    await update(recommended);
    dispatchSlotChange(recommended);
    await update(recommended);
    expect(recommended.renderRoot.querySelector('[part="empty"]')).toBeNull();
    expect(recommended.renderRoot.querySelector("slot")?.assignedElements()).toHaveLength(1);
  });
});

describe("dish modal and loyalty organisms", () => {
  test("keeps the dish modal closed until opened and exposes slotted content when open", async () => {
    const modal = await mount(document.createElement(QM_DISH_MODAL_TAG_NAME));
    modal.name = "Ceviche";
    modal.titleId = "dish-title";
    modal.closeLabel = "Cerrar";
    modal.price = "12 €";
    modal.oldPrice = "15 €";
    modal.tag = "Picante";
    modal.photoUrl = "/dish.webp";
    modal.photoFallbackUrl = "/dish-fallback.webp";
    modal.allergensLabel = "Alérgenos";
    const description = document.createElement("p");
    description.textContent = "Pescado fresco";
    const extras = document.createElement("qm-dish-extras");
    extras.slot = "extras";
    const allergen = document.createElement("qm-allergen");
    allergen.slot = "allergens";
    modal.append(description, extras, allergen);
    await update(modal);
    expect(modal.renderRoot.querySelector('[part="dialog"]')).toBeNull();

    modal.open = true;
    await update(modal);
    dispatchSlotChange(modal, "slot:not([name])");
    dispatchSlotChange(modal, 'slot[name="extras"]');
    dispatchSlotChange(modal, 'slot[name="allergens"]');
    await update(modal);

    const dialog = shadowQuery(modal, '[part="dialog"]');
    expect(dialog.getAttribute("aria-labelledby")).toBe("dish-title");
    expect(shadowQuery(modal, '[part="title"]').textContent).toBe("Ceviche");
    expect(shadowQuery<QmPrice>(modal, '[part="price"]').value).toBe("12 €");
    expect(shadowQuery(modal, '[part="description"]').hasAttribute("hidden")).toBe(false);
    expect(shadowQuery(modal, '[part="extras"]').hasAttribute("hidden")).toBe(false);
    expect(shadowQuery(modal, '[part="allergens"]').hasAttribute("hidden")).toBe(false);

    const close = shadowQuery<HTMLButtonElement>(modal, '[part="close"]');
    const eventPromise = new Promise<void>((resolve) =>
      modal.addEventListener("qm-close", () => resolve(), { once: true }),
    );
    close.click();
    await eventPromise;
    const photo = shadowQuery<HTMLImageElement>(modal, "img");
    photo.dispatchEvent(new Event("error"));
    expect(photo.src).toContain("/dish-fallback.webp");
  });

  test("validates loyalty consent before submit and emits trimmed accepted data", async () => {
    const signup = await mount(document.createElement(QM_LOYALTY_SIGNUP_TAG_NAME));
    signup.email = "  guest@example.com ";
    signup.emailLabel = "Email";
    signup.consentLabel = "Acepto";
    signup.consentError = "Necesario";
    signup.submitLabel = "Unirme";
    await update(signup);

    const form = shadowQuery<HTMLFormElement>(signup, "form");
    const submit = shadowQuery<HTMLButtonElement>(signup, 'button[type="submit"]');
    const input = shadowQuery<HTMLInputElement>(signup, 'input[type="email"]');
    input.value = "  guest@example.com ";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const submitEvents: CustomEvent[] = [];
    signup.addEventListener("qm-submit", (event) => {
      submitEvents.push(event as CustomEvent);
    });
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    await update(signup);
    expect(submitEvents).toHaveLength(0);
    expect(shadowQuery<HTMLInputElement>(signup, 'input[type="checkbox"]').getAttribute("aria-invalid")).toBe("true");

    const consent = shadowQuery<HTMLInputElement>(signup, 'input[type="checkbox"]');
    consent.checked = true;
    const consentEvent = new Promise<CustomEvent<{ accepted: boolean }>>((resolve) => {
      signup.addEventListener("qm-consent-change", (event) => resolve(event as CustomEvent<{ accepted: boolean }>), {
        once: true,
      });
    });
    consent.dispatchEvent(new Event("change", { bubbles: true }));
    const consentChange = await consentEvent;
    expect(consentChange.detail).toEqual({ accepted: true });
    const submitEvent = new Promise<CustomEvent<{ email: string; consentAccepted: boolean }>>((resolve) => {
      signup.addEventListener(
        "qm-submit",
        (event) => resolve(event as CustomEvent<{ email: string; consentAccepted: boolean }>),
        {
          once: true,
        },
      );
    });
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    const signupSubmit = await submitEvent;
    expect(signupSubmit.detail).toEqual({ email: "guest@example.com", consentAccepted: true });

    signup.busy = true;
    await update(signup);
    expect(submit.disabled).toBe(true);
  });

  test("clamps loyalty progress, hides locked actions, and renders redeemed state", async () => {
    const card = await mount(document.createElement(QM_LOYALTY_CARD_TAG_NAME));
    card.restaurantName = "Casa Murga";
    card.email = "guest@example.com";
    card.balance = 8;
    card.target = 5;
    card.gridLabel = "Sellos";
    card.stampLabel = "Añadir sello";
    await update(card);
    expect(shadowQuery(card, ".progress strong").textContent).toBe("5/5");
    expect(shadowQuery<QmStampGrid>(card, "qm-stamp-grid").filled).toBe(5);
    expect(shadowQuery(card, "qm-button")).not.toBeNull();

    card.locked = true;
    await update(card);
    expect(card.renderRoot.querySelector("qm-button")).toBeNull();
    card.locked = false;
    card.redeemed = true;
    card.redeemedLabel = "Recompensa";
    card.redeemedReward = "Postre gratis";
    card.redeemedFooter = "Disfrútalo";
    await update(card);
    expect(card.renderRoot.querySelector(".card--redeemed")).not.toBeNull();
    expect(shadowQuery(card, ".reward-name").textContent).toBe("Postre gratis");
    expect(card.renderRoot.querySelector("qm-button")).toBeNull();
  });

  test("renders pending, expired, and rejected redeem states with their events", async () => {
    const wait = await mount(document.createElement(QM_REDEEM_WAIT_TAG_NAME));
    wait.badge = "Canje";
    wait.title = "Procesando";
    wait.cancelLabel = "Cancelar";
    wait.retryLabel = "Reintentar";
    wait.status = "pending";
    await update(wait);
    expect(shadowQuery(wait, ".card").getAttribute("aria-busy")).toBe("true");
    expect(shadowQuery(wait, ".spinner")).not.toBeNull();
    const cancel = new Promise<void>((resolve) => wait.addEventListener("qm-cancel", () => resolve(), { once: true }));
    shadowQuery<HTMLButtonElement>(wait, "button").click();
    await cancel;

    wait.status = "expired";
    await update(wait);
    expect(shadowQuery(wait, ".card").getAttribute("aria-busy")).toBe("false");
    expect(shadowQuery(wait, ".terminal").textContent).toBe("0:00");
    wait.status = "rejected";
    await update(wait);
    const retry = new Promise<void>((resolve) => wait.addEventListener("qm-retry", () => resolve(), { once: true }));
    expect(shadowQuery(wait, ".terminal").textContent).toBe("×");
    shadowQuery<HTMLButtonElement>(wait, "button").click();
    await retry;
  });
});
