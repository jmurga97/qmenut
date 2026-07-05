export interface MockPromo {
  discount: string;
  name: string;
  desc: string;
  price: string;
  oldPrice?: string;
  vigencia: string;
}

export interface MockPromosContent {
  title: string;
  subtitle: string;
  emptyLabel: string;
  promos: MockPromo[];
}

export const MOCK_PROMOS_CONTENT: MockPromosContent = {
  title: "Promociones",
  subtitle: "2 ofertas activas · hoy",
  emptyLabel: "No hay promociones disponibles",
  promos: [
    {
      discount: "2x1",
      name: "Aperitivo della casa",
      desc: "Spritz + tabla para dos.",
      price: "18",
      oldPrice: "26",
      vigencia: "L a J · 18-20 h",
    },
    {
      discount: "menú",
      name: "Pranzo del giorno",
      desc: "Primo, secondo y dolce.",
      price: "16",
      vigencia: "L a V · mediodía",
    },
  ],
};
