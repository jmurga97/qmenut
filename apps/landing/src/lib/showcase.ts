import { SHOWCASE_STEPS } from "@qmenut/ui/theme/showcase";

import type { MarketId } from "./markets";
import type { ShowcaseStage, ShowcaseStep } from "@qmenut/ui/theme/showcase";

export type ShowcaseTenant = { slug: string; name: string; template: string; href: string };
export { SHOWCASE_STEPS };
export type { ShowcaseStep };
const tenant = ({ slug, name, template }: { slug: string; name: string; template: string }): ShowcaseTenant => ({
  slug,
  name,
  template,
  href: `https://${slug}.dev.qmenut.app`,
});
export const showcaseTenants: Record<MarketId, ShowcaseTenant[]> = {
  es: [
    tenant({ slug: "villaplena", name: "Villaplena", template: "Cocina tradicional" }),
    tenant({ slug: "domingos", name: "Domingo's Pizza", template: "Pizzería" }),
    tenant({ slug: "panzaria", name: "Panzaria", template: "Cafetería" }),
    tenant({ slug: "tallarinella", name: "La Tallarinella", template: "Alta cocina" }),
    tenant({ slug: "thousand", name: "Thousand Burgers", template: "Bar de tapas" }),
  ],
  ve: [
    tenant({ slug: "casadelpana", name: "La Casa del Pana", template: "Cocina tradicional" }),
    tenant({ slug: "dominguitos", name: "Dominguito's Pizza", template: "Pizzería" }),
    tenant({ slug: "migajas", name: "Migajas", template: "Cafetería" }),
    tenant({ slug: "banzai", name: "Banzai Sushi Bar", template: "Alta cocina" }),
    tenant({ slug: "tonyaromas", name: "Tony Aroma's", template: "Bar de tapas" }),
  ],
};

export function finalStep(stage: ShowcaseStage): ShowcaseStep {
  return SHOWCASE_STEPS[stage].at(-1)!;
}

// One step per feature: a section's own list when it mixes stages, else its stage's steps.
export function sectionSteps(section: {
  stage?: ShowcaseStage;
  steps?: readonly ShowcaseStep[];
}): readonly ShowcaseStep[] {
  return section.steps ?? (section.stage ? SHOWCASE_STEPS[section.stage] : []);
}

// Short names for the sheet each step moves; the feature beside the stack already carries the full title.
export const STEP_LABELS: Partial<Record<ShowcaseStep, string>> = {
  "domain:0": "Lo que leen Google y ChatGPT",
  "domain:1": "Tu dominio",
  "language:0": "Idioma del móvil",
  "language:1": "Traducción",
  "language:2": "Valencià",
  "language:3": "Alérgenos",
  "rate:1": "Tasa",
  "stamps:0": "Sellos",
  "stamps:1": "Pantalla de inicio",
  "soldOut:0": "Agotado",
  "soldOut:1": "Equipo",
  "views:0": "Más vistos",
  "views:1": "Resumen",
};

export function showcaseLocale(step: ShowcaseStep): string {
  if (step === "language:0" || step === "language:1") return "en";
  if (step === "language:2" || step === "language:3") return "ca-valencia";
  return "";
}

export function showcasePoster(slug: string, step: ShowcaseStep | "dish"): string {
  return `/assets/showcase/${slug}-${step.replace(":", "-")}.webp`;
}

type Band = [top: number, bottom: number];
type Layout = { featured?: Band; tabs: Band; section: Band; rows: Band[] };
// Component bands of each capture as % of the 390 × 700 image. Header and bottom navigation never move.
export const HEADER: Band = [0, 18.5];
export const NAV: Band = [90.6, 100];
const list = { tabs: [18.5, 29.8], section: [29.8, 40.4] } satisfies Partial<Layout>;
const ve = {
  featured: { featured: [18.5, 47], tabs: [47, 57.5], section: [57.5, 68.4], rows: [[68.4, 85.2]] },
  prices: {
    ...list,
    rows: [
      [40.4, 64.5],
      [64.5, 89.5],
    ],
  },
  // The second dish ends at its card, so only the first dish carries a bolívar line to reprice.
  rate: {
    ...list,
    rows: [
      [40.4, 64.5],
      [64.5, 81.8],
    ],
  },
  soldOut: {
    ...list,
    rows: [
      [40.4, 61],
      [61, 77.9],
      [77.9, 90.5],
    ],
  },
} satisfies Record<string, Layout>;
const es = {
  featured: { featured: [18.5, 44.2], tabs: [44.2, 54.8], section: [54.8, 65.7], rows: [[65.7, 79.3]] },
  list: {
    ...list,
    rows: [
      [40.4, 54.1],
      [54.1, 70.9],
      [70.9, 87],
    ],
  },
  allergens: {
    ...list,
    rows: [
      [40.4, 59.9],
      [59.9, 83.2],
    ],
  },
  views: {
    ...list,
    rows: [
      [40.4, 60.5],
      [60.5, 85.5],
    ],
  },
} satisfies Record<string, Layout>;
// Which capture the stack shows on each step, and where its components sit.
export const stackCaptures: Record<MarketId, { image: ShowcaseStep; steps: string; layout: Layout }[]> = {
  es: [
    { image: "domain:0", steps: "domain:0", layout: es.featured },
    { image: "domain:1", steps: "domain:1 stamps:0 stamps:1", layout: es.featured },
    { image: "language:0", steps: "language:0", layout: es.list },
    { image: "language:1", steps: "language:1", layout: es.list },
    { image: "language:2", steps: "language:2", layout: es.list },
    { image: "language:3", steps: "language:3", layout: es.allergens },
    { image: "soldOut:0", steps: "soldOut:0", layout: es.list },
    { image: "soldOut:1", steps: "soldOut:1", layout: es.list },
    { image: "views:0", steps: "views:0 views:1", layout: es.views },
  ],
  ve: [
    // The bolívar line is painted over this capture from the live rate, so one capture serves the whole change.
    { image: "rate:0", steps: "rate:1", layout: ve.rate },
    { image: "domain:0", steps: "domain:0", layout: ve.featured },
    { image: "domain:1", steps: "domain:1 stamps:0 stamps:1", layout: ve.featured },
    { image: "soldOut:0", steps: "soldOut:0", layout: ve.soldOut },
    { image: "soldOut:1", steps: "soldOut:1", layout: ve.soldOut },
    { image: "views:0", steps: "views:0 views:1", layout: ve.prices },
  ],
};

type Row = { dish: string; y: number };
// Points on the first and second dish rows (% of the capture), so admin hairlines land on the real line.
export const stackFacts: Record<
  MarketId,
  {
    soldOut: Row;
    views: (Row & { opens: number })[];
    stamp: { x: number; y: number };
    card: string;
    rates?: { y: number; usd: number }[];
  }
> = {
  es: {
    soldOut: { dish: "Esgarraet", y: 47.4 },
    views: [
      { dish: "Esgarraet", y: 57.5, opens: 214 },
      { dish: "Clóchinas al vapor", y: 82.5, opens: 138 },
    ],
    stamp: { x: 58.7, y: 38.4 },
    card: "22.9% 14.1% 49% 3.8%",
  },
  ve: {
    soldOut: { dish: "Cachapa con queso de mano", y: 50.9 },
    views: [
      { dish: "Cachapa con queso de mano", y: 60.6, opens: 214 },
      { dish: "Arepa de carne mechada", y: 85.7, opens: 138 },
    ],
    stamp: { x: 64.1, y: 38.6 },
    card: "22.9% 9% 48.9% 9%",
    // Centre of the first dish's bolívar line, and the dollar price the capture shows above it.
    rates: [{ y: 60.6, usd: 8 }],
  },
};
