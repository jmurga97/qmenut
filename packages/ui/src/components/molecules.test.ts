import { afterEach, describe, expect, test } from "bun:test";

import { QM_CATEGORY_NAV_TAG_NAME, defineQmCategoryNav } from "./molecules/qm-category-nav";
import { QM_CODE_INPUT_TAG_NAME, defineQmCodeInput } from "./molecules/qm-code-input";
import { QM_DISH_ROW_TAG_NAME, defineQmDishRow } from "./molecules/qm-dish-row";
import { QM_FEATURED_TAG_NAME, defineQmFeatured } from "./molecules/qm-featured";
import { QM_LOCATION_TAG_NAME, defineQmLocation } from "./molecules/qm-location";
import { QM_MAP_TAG_NAME, defineQmMap } from "./molecules/qm-map";
import { QM_PROMO_TAG_NAME, defineQmPromo } from "./molecules/qm-promo";
import { QM_REWARD_ROW_TAG_NAME, defineQmRewardRow } from "./molecules/qm-reward-row";
import { QM_SECTION_HEADER_TAG_NAME, defineQmSectionHeader } from "./molecules/qm-section-header";
import { QM_SOCIAL_LINKS_TAG_NAME, defineQmSocialLinks, socialIcon } from "./molecules/qm-social-links";
import { QM_STAMP_GRID_TAG_NAME, defineQmStampGrid } from "./molecules/qm-stamp-grid";
import { mount, shadowQuery, update } from "./test-helpers";

import type { QmBadge } from "./atoms/qm-badge";
import type { QmHeading } from "./atoms/qm-heading";
import type { QmPrice } from "./atoms/qm-price";
import type { QmDishRowValue } from "./molecules/qm-dish-row";
import type { QmFeaturedValue } from "./molecules/qm-featured";
import type { QmLocationValue } from "./molecules/qm-location";
import type { QmPromoValue } from "./molecules/qm-promo";

defineQmCategoryNav();
defineQmCodeInput();
defineQmDishRow();
defineQmFeatured();
defineQmLocation();
defineQmMap();
defineQmPromo();
defineQmRewardRow();
defineQmSectionHeader();
defineQmSocialLinks();
defineQmStampGrid();

afterEach(() => document.body.replaceChildren());

const dishValue: QmDishRowValue = {
  name: "Ceviche",
  desc: "Leche de tigre y camote",
  price: "12 €",
  oldPrice: "15 €",
  tag: "Picante",
  featured: true,
  photo: true,
  photoUrl: "/dish.webp",
  photoFallbackUrl: "/dish-fallback.webp",
  photoSrcSet: "/dish-2x.webp 2x",
  photoSizes: "80px",
};

const featuredValue: QmFeaturedValue = {
  name: "Tiradito",
  desc: "Ají amarillo y lima",
  price: "14 €",
  oldPrice: "17 €",
  tag: "Nuevo",
  secondaryTag: "Favorito",
  photo: true,
  photoUrl: "/featured.webp",
  photoFallbackUrl: "/featured-fallback.webp",
};

describe("menu molecules", () => {
  test("renders a dish row and restores the canonical photo after an error", async () => {
    const row = await mount(document.createElement(QM_DISH_ROW_TAG_NAME));
    row.value = dishValue;
    await update(row);

    expect(shadowQuery(row, '[part="name"]').textContent).toBe("Ceviche");
    expect(shadowQuery(row, '[part="desc"]').textContent).toContain("Leche de tigre");
    expect(shadowQuery<QmBadge>(row, "qm-badge").text).toBe("Picante");
    expect(shadowQuery<QmBadge>(row, "qm-badge").className).toContain("tag--featured");
    expect(shadowQuery<QmPrice>(row, "qm-price").value).toBe("12 €");

    const image = shadowQuery<HTMLImageElement>(row, "img");
    expect(image.loading).toBe("lazy");
    image.dispatchEvent(new Event("error"));
    expect(image.src).toContain("/dish-fallback.webp");
    expect(image.hasAttribute("srcset")).toBe(false);
    expect(image.hasAttribute("sizes")).toBe(false);

    row.value = { ...dishValue, photo: false, tag: undefined };
    await update(row);
    expect(row.renderRoot.querySelector('[part="photo"]')).toBeNull();
    expect(row.renderRoot.querySelector("qm-badge")).toBeNull();
  });

  test("renders featured cards with both tags and photo fallback", async () => {
    const featured = await mount(document.createElement(QM_FEATURED_TAG_NAME));
    featured.value = featuredValue;
    await update(featured);

    expect(featured.renderRoot.querySelectorAll("qm-badge")).toHaveLength(2);
    expect(shadowQuery<QmBadge>(featured, '[part="tag"]').text).toBe("Nuevo");
    expect(shadowQuery<QmBadge>(featured, '[part="secondary-tag"]').text).toBe("Favorito");
    expect(shadowQuery<QmPrice>(featured, "qm-price").oldValue).toBe("17 €");

    const image = shadowQuery<HTMLImageElement>(featured, "img");
    image.dispatchEvent(new Event("error"));
    expect(image.src).toContain("/featured-fallback.webp");

    featured.value = { ...featuredValue, tag: undefined, secondaryTag: undefined, photoUrl: undefined };
    await update(featured);
    expect(featured.renderRoot.querySelector('[part="tags"]')).toBeNull();
    expect(featured.renderRoot.querySelector('[part="photo"]')).not.toBeNull();
    expect(featured.renderRoot.querySelector("img")).toBeNull();
  });

  test("renders section headers and optional counts", async () => {
    const header = await mount(document.createElement(QM_SECTION_HEADER_TAG_NAME));
    header.num = "01";
    header.tagline = "Cocina";
    header.sectionLabel = "Entrantes";
    header.sectionCount = "7 platos";
    await update(header);

    expect(shadowQuery(header, '[part="num"]').textContent).toBe("01");
    expect(shadowQuery<QmHeading>(header, "qm-heading").eyebrow).toBe("Cocina");
    expect(shadowQuery<QmHeading>(header, "qm-heading").text).toBe("Entrantes");
    expect(shadowQuery(header, '[part="count"]').textContent).toBe("7 platos");

    header.sectionCount = undefined;
    await update(header);
    expect(header.renderRoot.querySelector('[part="count"]')).toBeNull();
  });
});

describe("contact and promotion molecules", () => {
  test("renders location actions with correct external-link semantics", async () => {
    const location = await mount(document.createElement(QM_LOCATION_TAG_NAME));
    const value: QmLocationValue = {
      name: "Casa Murga",
      addr: "Calle Mayor 1",
      status: "Abierto",
      actionsLabel: "Acciones",
      phone: "+34 900 000 000",
      phoneHref: "tel:+34900000000",
      phoneLabel: "Llamar",
      whatsappHref: "https://wa.me/34900000000",
      whatsappLabel: "WhatsApp",
      mapHref: "/contacto#mapa",
      mapLabel: "Mapa",
    };
    location.value = value;
    await update(location);

    expect(shadowQuery(location, '[part="name"]').textContent).toBe("Casa Murga");
    expect(shadowQuery(location, '[part="phone"]').textContent).toContain("+34");
    const links = location.renderRoot.querySelectorAll<HTMLAnchorElement>('[part="action"]');
    expect(links).toHaveLength(3);
    expect(links[0]?.getAttribute("target")).toBeNull();
    expect(links[1]?.target).toBe("_blank");
    expect(links[1]?.rel).toBe("noreferrer");
    expect(links[2]?.href).toContain("/contacto#mapa");
  });

  test("renders promos with discount, validity, and optional price", async () => {
    const promo = await mount(document.createElement(QM_PROMO_TAG_NAME));
    const value: QmPromoValue = {
      discount: "-30%",
      name: "Combo pareja",
      desc: "Dos platos y bebida",
      price: "24 €",
      oldPrice: "30 €",
      vigencia: "Válido L-J",
    };
    promo.value = value;
    await update(promo);

    expect(shadowQuery(promo, '[part="discount"]').textContent).toContain("-30%");
    expect(shadowQuery(promo, '[part="name"]').textContent).toBe("Combo pareja");
    expect(shadowQuery(promo, '[part="vigencia"]').textContent).toBe("Válido L-J");
    expect(shadowQuery<QmPrice>(promo, "qm-price").oldValue).toBe("30 €");
  });

  test("maps social URLs to icon families and accessible links", async () => {
    expect(socialIcon({ href: "https://instagram.com/casa", label: "Instagram" })).toBe("instagram");
    expect(socialIcon({ href: "https://fb.com/casa", label: "Social" })).toBe("facebook");
    expect(socialIcon({ href: "https://x.com/casa", label: "Twitter" })).toBe("x");
    expect(socialIcon({ href: "https://example.com", label: "Web" })).toBe("generic");

    const social = await mount(document.createElement(QM_SOCIAL_LINKS_TAG_NAME));
    social.ariaLabel = "Síguenos";
    social.links = [
      { href: "https://instagram.com/casa", label: "Instagram" },
      { href: "https://youtube.com/casa", label: "YouTube" },
    ];
    await update(social);
    expect(shadowQuery(social, "nav").getAttribute("aria-label")).toBe("Síguenos");
    expect(social.renderRoot.querySelectorAll("a")).toHaveLength(2);
    expect(social.renderRoot.querySelectorAll("svg")).toHaveLength(2);
    expect(social.renderRoot.querySelector<HTMLAnchorElement>('a[aria-label="Instagram"]')?.target).toBe("_blank");
  });

  test("renders the accessible map region and ignores invalid markers", async () => {
    const map = await mount(document.createElement(QM_MAP_TAG_NAME));
    map.value = {
      ariaLabel: "Ubicaciones",
      openMapsLabel: "Abrir en Maps",
      markers: [
        {
          id: "invalid",
          name: "Invalid",
          address: "",
          current: true,
          directionsHref: "https://maps.google.com",
          latitude: 100,
          longitude: 0,
        },
      ],
    };
    await update(map);
    expect(shadowQuery(map, '[role="region"]').getAttribute("aria-label")).toBe("Ubicaciones");
    expect(map.renderRoot.querySelectorAll(".leaflet-container")).toHaveLength(0);
  });
});

describe("interaction molecules", () => {
  test("sanitizes code input, emits input and completion, and disables busy states", async () => {
    const code = await mount(document.createElement(QM_CODE_INPUT_TAG_NAME));
    code.title = "Canje";
    code.inputLabel = "Código";
    code.message = "Mensaje";
    code.footnote = "4 dígitos";
    code.status = "error";
    await update(code);

    const input = shadowQuery<HTMLInputElement>(code, "input");
    expect(input.inputMode).toBe("numeric");
    expect(input.maxLength).toBe(4);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    input.value = "a12-345";
    const events: string[] = [];
    code.addEventListener("qm-input", (event) => {
      events.push((event as CustomEvent<{ value: string }>).detail.value);
    });
    const complete = new Promise<CustomEvent<{ value: string }>>((resolve) => {
      code.addEventListener("qm-complete", (event) => resolve(event as CustomEvent<{ value: string }>), { once: true });
    });
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(events).toEqual(["1234"]);
    const completeEvent = await complete;
    expect(completeEvent.detail).toEqual({ value: "1234" });

    code.status = "submitting";
    await update(code);
    expect(shadowQuery<HTMLInputElement>(code, "input").disabled).toBe(true);
    expect(code.renderRoot.querySelectorAll(".box")).toHaveLength(4);
  });

  test("keeps the active category chip navigable without selecting it", async () => {
    const nav = await mount(document.createElement(QM_CATEGORY_NAV_TAG_NAME));
    nav.ariaLabel = "Categorías";
    const first = document.createElement("qm-category-chip");
    first.value = "first";
    first.active = true;
    const second = document.createElement("qm-category-chip");
    second.value = "second";
    nav.append(first, second);
    await update(nav);
    await update(first);
    await update(second);

    const selected: string[] = [];
    nav.addEventListener("qm-select", (event) => {
      selected.push((event as CustomEvent<{ value: string }>).detail.value);
    });
    const key = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true, cancelable: true });
    second.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(true);
    expect(selected).toEqual([]);
    expect(shadowQuery(nav, '[role="toolbar"]').getAttribute("aria-label")).toBe("Categorías");
  });

  test("renders stamp bounds and marks the newly animated stamp", async () => {
    const grid = await mount(document.createElement(QM_STAMP_GRID_TAG_NAME));
    grid.total = 5;
    grid.filled = 8;
    grid.animatedIndex = 4;
    grid.ariaLabel = "4 de 5 sellos";
    await update(grid);

    const stamps = grid.renderRoot.querySelectorAll(".stamp");
    expect(stamps).toHaveLength(5);
    expect(grid.renderRoot.querySelectorAll(".stamp--filled")).toHaveLength(5);
    expect(grid.renderRoot.querySelectorAll(".stamp--new")).toHaveLength(1);
    expect(shadowQuery(grid, '[role="img"]').getAttribute("aria-label")).toBe("4 de 5 sellos");
  });

  test("renders locked and redeemable reward actions with correct events", async () => {
    const reward = await mount(document.createElement(QM_REWARD_ROW_TAG_NAME));
    reward.rewardId = "reward-1";
    reward.name = "Postre";
    reward.cost = 5;
    reward.stampsLabel = "sellos";
    reward.remainingLabel = "Te faltan 2";
    reward.redeemLabel = "Canjear";
    await update(reward);
    expect(shadowQuery(reward, ".remaining").textContent).toBe("Te faltan 2");

    reward.unlocked = true;
    await update(reward);
    const button = shadowQuery<HTMLButtonElement>(reward, "button");
    const eventPromise = new Promise<CustomEvent<{ rewardId: string }>>((resolve) => {
      reward.addEventListener("qm-redeem", (event) => resolve(event as CustomEvent<{ rewardId: string }>), {
        once: true,
      });
    });
    button.click();
    const redeemEvent = await eventPromise;
    expect(redeemEvent.detail).toEqual({ rewardId: "reward-1" });

    reward.busy = true;
    reward.busyLabel = "Canjeando";
    await update(reward);
    expect(shadowQuery<HTMLButtonElement>(reward, "button").disabled).toBe(true);
    expect(shadowQuery(reward, "button").textContent).toBe("Canjeando");
  });
});
