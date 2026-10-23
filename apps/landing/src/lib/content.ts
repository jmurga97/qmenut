// Copy and scope come from docs/sales/landing-content.md and docs/sales/plan-features.md.

export const START_PATH = "/empezar";
export const ADMIN_URL = "https://admin.qmenut.app";

export const DEMOS = [
  { slug: "fine", name: "Alta cocina", href: "https://fine.dev.qmenut.app" },
  { slug: "her", name: "Cocina de herencia", href: "https://her.dev.qmenut.app" },
  { slug: "fast", name: "Fast casual", href: "https://fast.dev.qmenut.app" },
  { slug: "cafe", name: "Cafetería", href: "https://cafe.dev.qmenut.app" },
  { slug: "tapas", name: "Bar de tapas", href: "https://tapas.dev.qmenut.app" },
] as const;

export const PLANS = [
  {
    code: "basic",
    name: "Basic",
    price: "15 USD",
    summary: "Un menú digital sencillo con tu logo y tu portada.",
    highlights: [
      "Menú con fotos, variantes y alérgenos",
      "Contacto, mapa y horarios",
      "Tu menú en turestaurante.qmenut.app",
    ],
  },
  {
    code: "business",
    name: "Business",
    price: "55 USD",
    summary: "Todo QMenut: tu dominio, tu marca, idiomas, fidelización y analítica.",
    highlights: [
      "Tu propio dominio incluido",
      "Cinco estilos y los colores de tu marca",
      "Idiomas, puntos y analítica",
    ],
  },
  {
    code: "delivery",
    name: "Delivery",
    price: null,
    summary: "Pedidos para recoger y a domicilio desde tu propio canal, sobre Business.",
    highlights: ["Pedidos y pago online", "Bandeja de pedidos", "Tus repartidores, más adelante"],
  },
] as const;

export type PlanCode = (typeof PLANS)[number]["code"];
