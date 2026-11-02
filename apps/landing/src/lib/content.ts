// Copy and scope come from docs/sales/landing-content.md and docs/sales/plan-features.md.

export const START_PATH = "/empezar";
export const ADMIN_URL = "https://admin.qmenut.app";

export const DEMOS = [
  { name: "Alta cocina", href: "https://fine.dev.qmenut.app" },
  { name: "Cocina de herencia", href: "https://her.dev.qmenut.app" },
  { name: "Fast casual", href: "https://fast.dev.qmenut.app" },
  { name: "Cafetería", href: "https://cafe.dev.qmenut.app" },
  { name: "Bar de tapas", href: "https://tapas.dev.qmenut.app" },
] as const;

// A null price means the plan is not on sale yet.
export const PLANS = [
  {
    name: "Basic",
    price: "15 USD",
    highlights: [
      "Menú con fotos, variantes y alérgenos",
      "Contacto, mapa y horarios",
      "Tu menú en turestaurante.qmenut.app",
    ],
  },
  {
    name: "Business",
    price: "55 USD",
    highlights: [
      "Todo lo de Basic",
      "Tu propio dominio incluido",
      "Cinco estilos y los colores de tu marca",
      "Idiomas, puntos y analítica",
    ],
  },
  {
    name: "Delivery",
    price: null,
    highlights: ["Todo lo de Business", "Pedidos y pago online", "Bandeja de pedidos"],
  },
] as const;

export const FAQ = [
  {
    question: "¿Tengo que quitar la carta en papel?",
    answer:
      "No. QMenut está donde se decide a qué restaurante ir: en el móvil, antes de llegar. En la mesa puedes seguir ofreciendo tu carta impresa.",
  },
  {
    question: "Ya estoy en Instagram y en Google, ¿para qué lo necesito?",
    answer:
      "Instagram y Google ayudan a que te descubran. QMenut completa ese descubrimiento con un menú actualizado y legible para buscadores, sin que nadie tenga que buscar precios entre publicaciones antiguas.",
  },
  {
    question: "¿No me basta con un PDF?",
    answer:
      "Un PDF hay que ampliarlo, recorrerlo página a página y volver a subirlo cada vez que cambia un precio. Y ni Google ni los asistentes de IA pueden leer bien sus platos.",
  },
  {
    question: "¿Mis clientes tienen que descargar una app?",
    answer: "No. Tu menú se abre en el navegador del móvil.",
  },
  {
    question: "¿Cómo funciona la prueba?",
    answer:
      "Tienes 14 días para probar cualquier plan. Te pedimos la tarjeta al empezar y no se cobra nada hasta que termina la prueba.",
  },
  {
    question: "¿Puedo pasar de Basic a Business?",
    answer: "Sí, cuando quieras y sin perder nada de lo que ya tienes publicado.",
  },
  {
    question: "¿Qué pasa si cancelo?",
    answer: "Puedes pedir la exportación de tus datos y la transferencia de tu dominio sin coste adicional.",
  },
  {
    question: "¿De quién es el dominio?",
    answer:
      "Tuyo. En Business el dominio está incluido mientras tengas la suscripción, y si un día te vas, puedes llevártelo.",
  },
  {
    question: "¿Tiene pedidos o delivery?",
    answer: "Todavía no. Los pedidos para recoger y a domicilio llegarán pronto como una ampliación de Business.",
  },
] as const;
