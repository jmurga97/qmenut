import ca from "./ca";

export default {
  ...ca,
  common: {
    ...ca.common,
    navigation: { ...ca.common.navigation, menu: "Carta", loyalty: "Fidelització" },
  },
  menu: { ...ca.menu, heroLabel: "Menú del dia" },
  contact: {
    ...ca.contact,
    page: { ...ca.contact.page, viewMenuLabel: "Veure la carta" },
  },
  install: { ...ca.install, title: "Tingues la carta al mòbil" },
  loyalty: {
    ...ca.loyalty,
    intro: { ...ca.loyalty.intro, menuLink: "Veure la carta" },
  },
} as const;
