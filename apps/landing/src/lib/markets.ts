export type MarketId = "es" | "ve";
// The optional third item tags a feature that only Business includes.
type Feature = [title: string, body: string, plan?: "Business"];
type Cell = "yes" | "no";
type Market = {
  country: string;
  currency: "EUR" | "USD";
  noun: string;
  hero: string;
  subtitle: string;
  description: string;
  sections: { title: string; features: Feature[] }[];
  delivery: { title: string; body: string };
  whatsapp: { contact: string; waitlist: string };
  plans: { name: string; description: string; price: number; highlights: string[] }[];
  faq: [question: string, answer: string][];
  rows: [string, Cell, Cell][];
};

// Placeholder numbers: replace with the real WhatsApp lines before launch.
const whatsapp = (phone: string, text: string): string => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

// Copy is written out per market: "la carta" and "el menú" differ in gender, so templated nouns break agreement.
const languages = {
  title: "Tu carta habla el idioma de quien la abre",
  features: [
    [
      "Habla su idioma",
      "Un turista con el móvil en inglés abre tu carta y la lee en inglés, sin buscar banderitas ni pedir al camarero que traduzca.",
      "Business",
    ],
    [
      "Lo escribes una vez, en castellano",
      "Cada plato nuevo y cada cambio se traducen solos a los idiomas que elijas. Si una traducción no te convence, la corriges y se queda así.",
      "Business",
    ],
    [
      "Las lenguas de aquí, también",
      "Ofrece tu carta en catalán, valenciano o gallego a la vez que en castellano, sin mantener dos cartas.",
      "Business",
    ],
    [
      "Una alergia no se traduce con gestos",
      "Los 14 alérgenos de la normativa europea, con icono y en el idioma de cada cliente. Quien tiene una alergia lo comprueba antes de pedir.",
      "Business",
    ],
  ],
} satisfies Market["sections"][number];

const exchangeRate = {
  title: "Cambia la tasa una vez y todo tu menú se actualiza",
  features: [
    [
      "Dólares y bolívares",
      "Mantén tus precios en dólares y muestra su equivalente en bolívares a la tasa que tú decidas.",
    ],
    [
      "Sin recalcular ni reimprimir",
      "Cuando cambia la tasa, la actualizas en el panel y cada plato muestra al momento su nuevo precio en bolívares.",
    ],
  ],
} satisfies Market["sections"][number];

const es: Market = {
  country: "España",
  whatsapp: {
    contact: whatsapp("34600000000", "Hola, quiero saber más sobre Qmenut para mi restaurante."),
    waitlist: whatsapp("34600000000", "Hola, quiero que me aviséis cuando lleguen los pedidos de Qmenut."),
  },
  currency: "EUR",
  noun: "carta",
  hero: "Tu carta y tu web, a la altura de lo que sirves",
  subtitle: "Con tu marca y tu dominio, en el idioma de cada cliente.",
  description:
    "Tu carta y tu web con tu marca, tu dominio y en el idioma de cada cliente. Descubre los planes de Qmenut.",
  sections: [
    {
      title: "Que te encuentren cuando buscan dónde comer",
      features: [
        [
          "Google lee tu carta",
          "Google lee tus platos, precios y horarios directamente de tu web, no de una foto ni de un PDF.",
        ],
        [
          "Tu web con tu nombre",
          "Tu carta en turestaurante.qmenut.app desde el primer día. Con Business, en tu propio dominio: turestaurante.com.",
        ],
      ],
    },
    languages,
    {
      title: "Que se vea como tu restaurante, no como el de al lado",
      features: [
        ["Menos preguntas en la mesa", "Fotos, variantes, extras y alérgenos en una carta pensada para el móvil."],
        [
          "Tu marca, sin rastro de Qmenut",
          "Cinco estilos base que adaptas a los colores y las tipografías de tu marca.",
          "Business",
        ],
        [
          "Vende más de lo que más te deja",
          "Destaca tu especialidad, lo nuevo o lo que más margen te deja, y muestra tus promociones.",
          "Business",
        ],
      ],
    },
    {
      title: "Que vuelvan",
      features: [
        [
          "Premia a los que vuelven",
          "Tus clientes acumulan sellos y los canjean por recompensas, sin app ni tarjeta de cartón.",
          "Business",
        ],
        [
          "En su pantalla de inicio",
          "Guardan tu web en la pantalla de inicio del móvil, sin descargar nada de una tienda.",
          "Business",
        ],
      ],
    },
    {
      title: "Tu carta al día, sin depender de nadie",
      features: [
        [
          "Cambias tú, cuando quieras",
          "Edita platos, precios y horarios, y marca lo que se ha agotado. Se ve al momento, sin reimprimir nada.",
        ],
        [
          "Tu equipo y tus locales",
          "Tu equipo marca platos agotados sin acceso a la suscripción ni a los ajustes. Y llevas todos tus locales desde un mismo panel.",
          "Business",
        ],
      ],
    },
    {
      title: "Descubre qué platos miran antes de venir",
      features: [
        [
          "Qué miran y qué hacen",
          "Qué platos se consultan más, en qué idiomas y cuántos tocan para llamar o ver cómo llegar.",
          "Business",
        ],
        ["Un resumen en tu correo", "La actividad de tu web llega a tu correo, sin entrar al panel.", "Business"],
      ],
    },
  ],
  delivery: {
    title: "Pedidos desde tu web, y el cliente sigue siendo tuyo",
    body: "Estamos construyendo pedidos para recoger y a domicilio desde tu propia web: con tu marca, con tus clientes y con una cuota fija, no un porcentaje de cada pedido.",
  },
  plans: [
    {
      name: "Basic",
      description: "Tu carta en línea, lista para compartir.",
      price: 15,
      highlights: ["Carta con fotos, variantes y alérgenos", "Contacto, mapa y horarios", "Para un local"],
    },
    {
      name: "Business",
      description: "Tu web completa, con tu dominio y tu marca.",
      price: 55,
      highlights: [
        "Todo lo de Basic",
        "Tu carta en 14 idiomas, traducida sola",
        "Tu dominio y tu marca",
        "Fidelización, promociones y estadísticas",
      ],
    },
  ],
  faq: [
    [
      "¿Tengo que quitar la carta impresa?",
      "No. Puedes seguir ofreciéndola en tu local. Qmenut está donde se decide a qué restaurante ir: en el móvil, antes de llegar.",
    ],
    [
      "¿Por qué necesito una web si ya estoy en Instagram y Google?",
      "Instagram y Google ayudan a que te descubran. Tu web reúne tu carta, tus precios y tus horarios al día, sin que nadie tenga que buscarlos entre fotos de hace meses.",
    ],
    [
      "¿No me basta con un PDF?",
      "Un PDF hay que ampliarlo y volver a subirlo cada vez que cambia un precio. En Qmenut cambias el precio en el panel y ya está.",
    ],
    [
      "¿Quién prepara mi carta?",
      "Nosotros preparamos la primera versión con tu carta y tu marca. Después la mantienes tú desde el panel.",
    ],
    [
      "¿Necesito conocimientos técnicos?",
      "No. Editas tu carta desde un panel sencillo y, si te atascas, te ayudamos por WhatsApp en horario laboral.",
    ],
    [
      "¿Quién traduce mi carta?",
      "Se traduce sola cada vez que guardas un cambio. Puedes corregir cualquier traducción y se queda como la dejes. Un idioma solo aparece cuando está completo.",
    ],
    [
      "¿Quién indica los alérgenos?",
      "Tú, desde el panel, plato por plato. Qmenut los muestra con su icono y en cada idioma.",
    ],
    [
      "¿De quién es el dominio?",
      "Tuyo. En Business está incluido mientras tengas la suscripción, y si un día te vas, puedes llevártelo.",
    ],
    ["¿Puedo pasar de Basic a Business?", "Sí, cuando quieras y sin perder nada de lo que ya tienes publicado."],
    [
      "¿Tiene pedidos o delivery?",
      "Todavía no. Estamos construyendo pedidos para recoger y a domicilio desde tu propia web.",
    ],
  ],
  rows: [
    ["Carta con fotos, variantes y alérgenos", "yes", "yes"],
    ["Contacto, mapa y horarios", "yes", "yes"],
    ["Panel de edición", "yes", "yes"],
    ["Idiomas con traducción automática", "no", "yes"],
    ["Dominio propio", "no", "yes"],
    ["Estilos y colores de marca", "no", "yes"],
    ["Promociones y fidelización", "no", "yes"],
    ["Estadísticas y resumen por correo", "no", "yes"],
    ["Equipo y varios locales", "no", "yes"],
  ],
};

const ve: Market = {
  country: "Venezuela",
  whatsapp: {
    contact: whatsapp("584120000000", "Hola, quiero saber más sobre Qmenut para mi restaurante."),
    waitlist: whatsapp("584120000000", "Hola, quiero que me avisen cuando lleguen los pedidos de Qmenut."),
  },
  currency: "USD",
  noun: "menú",
  hero: "Tu menú y tu web, a la altura de lo que sirves",
  subtitle: "Con tu marca y tu dominio, en dólares y bolívares. Cambias un precio en diez segundos.",
  description:
    "Tu menú y tu web con tu marca, tu dominio y precios en dólares y bolívares. Descubre los planes de Qmenut.",
  sections: [
    exchangeRate,
    {
      title: "Que te encuentren cuando buscan dónde comer",
      features: [
        [
          "Google lee tu menú",
          "Google lee tus platos, precios y horarios directamente de tu web, no de una foto ni de un PDF.",
        ],
        [
          "Tu web con tu nombre",
          "Tu menú en turestaurante.qmenut.app desde el primer día. Con Business, en tu propio dominio: turestaurante.com.",
        ],
      ],
    },
    {
      title: "Que se vea como tu restaurante, no como el de al lado",
      features: [
        ["Menos preguntas en la mesa", "Fotos, variantes, extras y alérgenos en un menú pensado para el celular."],
        [
          "Tu marca, sin rastro de Qmenut",
          "Cinco estilos base que adaptas a los colores y las tipografías de tu marca.",
          "Business",
        ],
        [
          "Vende más de lo que más te deja",
          "Destaca tu especialidad, lo nuevo o lo que más margen te deja, y muestra tus promociones.",
          "Business",
        ],
      ],
    },
    {
      title: "Que vuelvan",
      features: [
        [
          "Premia a los que vuelven",
          "Tus clientes acumulan sellos y los canjean por recompensas, sin app ni tarjeta de cartón.",
          "Business",
        ],
        [
          "En su pantalla de inicio",
          "Guardan tu web en la pantalla de inicio del celular, sin descargar nada de una tienda.",
          "Business",
        ],
      ],
    },
    {
      title: "¿Cambió un precio? ¿Se acabó un plato? Diez segundos y listo",
      features: [
        [
          "Cambias tú, cuando quieras",
          "Edita platos, precios y horarios, y marca lo que se agotó. Se ve al momento, sin reimprimir nada.",
        ],
        [
          "Tu equipo y tus locales",
          "Tu encargado marca platos agotados y actualiza la tasa sin acceso a la suscripción ni a los ajustes. Y llevas todos tus locales desde un mismo panel.",
          "Business",
        ],
      ],
    },
    {
      title: "Descubre qué platos miran antes de venir",
      features: [
        [
          "Qué miran y qué hacen",
          "Qué platos se consultan más y cuántos tocan para llamar o ver cómo llegar.",
          "Business",
        ],
        ["Un resumen en tu correo", "La actividad de tu web llega a tu correo, sin entrar al panel.", "Business"],
      ],
    },
  ],
  delivery: {
    title: "Pedidos desde tu web, y el cliente sigue siendo tuyo",
    body: "Estamos construyendo pedidos para llevar y delivery desde tu propia web: con tu marca, con tus clientes y con una cuota fija, no un porcentaje de cada pedido.",
  },
  plans: [
    {
      name: "Basic",
      description: "Tu menú en línea, listo para compartir.",
      price: 15,
      highlights: ["Menú con fotos, variantes y alérgenos", "Precios en dólares y bolívares", "Para un local"],
    },
    {
      name: "Business",
      description: "Tu web completa, con tu dominio y tu marca.",
      price: 55,
      highlights: ["Todo lo de Basic", "Tu dominio y tu marca", "Fidelización y promociones", "Estadísticas e idiomas"],
    },
  ],
  faq: [
    [
      "¿Tengo que quitar el menú impreso?",
      "No. Puedes seguir ofreciéndolo en tu local. Qmenut está donde se decide a qué restaurante ir: en el celular, antes de llegar.",
    ],
    [
      "¿Por qué necesito una web si ya estoy en Instagram y Google?",
      "Instagram y Google ayudan a que te descubran. Tu web reúne tu menú, tus precios y tus horarios al día, sin que nadie tenga que buscarlos entre fotos de hace meses.",
    ],
    [
      "¿No me basta con un PDF?",
      "Un PDF hay que ampliarlo y volver a subirlo cada vez que cambia un precio o la tasa. En Qmenut lo cambias en el panel y listo.",
    ],
    [
      "¿Quién prepara mi menú?",
      "Nosotros preparamos la primera versión con tu menú y tu marca. Después lo mantienes tú desde el panel.",
    ],
    [
      "¿Necesito conocimientos técnicos?",
      "No. Editas tu menú desde un panel sencillo y, si te trancas, te ayudamos por WhatsApp en horario laboral.",
    ],
    [
      "¿Puedo tener mi menú en inglés?",
      "Sí, con Business. Se traduce solo cada vez que guardas un cambio, y puedes corregir cualquier texto.",
    ],
    [
      "¿De quién es el dominio?",
      "Tuyo. En Business está incluido mientras tengas la suscripción, y si un día te vas, puedes llevártelo.",
    ],
    ["¿Puedo pasar de Basic a Business?", "Sí, cuando quieras y sin perder nada de lo que ya tienes publicado."],
    [
      "¿Tiene pedidos o delivery?",
      "Todavía no. Estamos construyendo pedidos para llevar y delivery desde tu propia web.",
    ],
  ],
  rows: [
    ["Menú con fotos, variantes y alérgenos", "yes", "yes"],
    ["Contacto, mapa y horarios", "yes", "yes"],
    ["Panel de edición", "yes", "yes"],
    ["Precios en dólares y bolívares", "yes", "yes"],
    ["Dominio propio", "no", "yes"],
    ["Estilos y colores de marca", "no", "yes"],
    ["Promociones y fidelización", "no", "yes"],
    ["Estadísticas y resumen por correo", "no", "yes"],
    ["Idiomas con traducción automática", "no", "yes"],
    ["Equipo y varios locales", "no", "yes"],
  ],
};

export const markets: Record<MarketId, Market> = { es, ve };

// Cloudflare sets CF-IPCountry at the edge; it is absent in local dev, so callers need a fallback.
export const marketFromRequest = (request: Request): MarketId | undefined => {
  const country = request.headers.get("cf-ipcountry");
  if (country === "ES") return "es";
  if (country === "VE") return "ve";
  return undefined;
};

export const demos = [
  { name: "Alta cocina", href: "https://fine.dev.qmenut.app" },
  { name: "Cocina tradicional", href: "https://her.dev.qmenut.app" },
  { name: "Pizzería", href: "https://fast.dev.qmenut.app" },
  { name: "Cafetería", href: "https://cafe.dev.qmenut.app" },
  { name: "Bar de tapas", href: "https://tapas.dev.qmenut.app" },
];
export const adminUrl = "https://admin.qmenut.app";
