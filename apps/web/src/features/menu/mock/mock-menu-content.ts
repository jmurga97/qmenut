import type { AllergenCode } from "~/features/menu/constants/allergens";

export interface MockDish {
  name: string;
  desc: string;
  price: string;
  extras?: MockDishExtra[];
  oldPrice?: string;
  tag?: string;
  photoUrl?: string;
  allergens?: AllergenCode[];
}

export interface MockDishExtra {
  name: string;
  price: string;
}

export interface MockMenuContent {
  heroLabel: string;
  logoLabel: string;
  featured: MockDish;
  sectionNum: string;
  sectionTagline: string;
  sectionLabel: string;
  sectionCount: string;
  dishes: MockDish[];
}

/**
 * Static mock menu content. No backend call and no artificial delay — real data-service
 * integration is out of scope for this phase; swap this constant for a real query later
 * without touching the component tree's prop wiring.
 */
export const MOCK_MENU_CONTENT: MockMenuContent = {
  heroLabel: "Menú del día",
  logoLabel: "CM",
  featured: {
    name: "Ceviche de corvina",
    desc: "Leche de tigre, camote glaseado, cancha serrana",
    price: "$12.500",
    tag: "Recomendado",
    photoUrl: "https://picsum.photos/seed/qmenut-ceviche/600/450",
    extras: [
      { name: "Palta laminada", price: "+$1.900" },
      { name: "Cancha extra", price: "+$900" },
    ],
    allergens: ["fish", "molluscs", "sulphites"],
  },
  sectionNum: "01",
  sectionTagline: "Cocina de mercado",
  sectionLabel: "Entradas",
  sectionCount: "5 platos",
  dishes: [
    {
      name: "Tiradito de salmón",
      desc: "Ají amarillo, choclo, cilantro",
      price: "$11.000",
      photoUrl: "https://picsum.photos/seed/qmenut-tiradito/200/200",
      extras: [{ name: "Leche de tigre extra", price: "+$1.200" }],
      allergens: ["fish"],
    },
    {
      name: "Empanadas de pino",
      desc: "Horneadas, salsa criolla",
      price: "$6.500",
      tag: "Casero",
      photoUrl: "https://picsum.photos/seed/qmenut-empanadas/200/200",
      extras: [
        { name: "Pebre ahumado", price: "+$700" },
        { name: "Ají verde", price: "+$500" },
      ],
      allergens: ["gluten", "eggs"],
    },
    {
      name: "Causa limeña",
      desc: "Papa amarilla, palta, pollo",
      price: "$8.900",
      photoUrl: "https://picsum.photos/seed/qmenut-causa/200/200",
      allergens: ["eggs"],
    },
    {
      name: "Anticuchos",
      desc: "Corazón de res, papas doradas",
      price: "$9.800",
      photoUrl: "https://picsum.photos/seed/qmenut-anticuchos/200/200",
    },
    {
      name: "Sopa criolla",
      desc: "Fideos, carne, leche, huevo poché",
      price: "$7.200",
      oldPrice: "$8.000",
      photoUrl: "https://picsum.photos/seed/qmenut-sopa/200/200",
      allergens: ["gluten", "milk", "eggs"],
    },
  ],
};
