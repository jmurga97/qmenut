export const SHOWCASE_PARAM = "showcase";
export const SHOWCASE_VALUE = "landing";
export const SHOWCASE_READY = "qmenut:showcase-ready";
export const SHOWCASE_UPDATE = "qmenut:showcase";

export const SHOWCASE_STEPS = {
  domain: ["domain:0", "domain:1"],
  language: ["language:0", "language:1", "language:2", "language:3"],
  rate: ["rate:0", "rate:1"],
  templates: ["templates:0", "templates:1", "templates:2", "templates:3", "templates:4"],
  stamps: ["stamps:0", "stamps:1"],
  soldOut: ["soldOut:0", "soldOut:1"],
  views: ["views:0", "views:1"],
} as const;

export type ShowcaseStage = keyof typeof SHOWCASE_STEPS;
export type ShowcaseStep = (typeof SHOWCASE_STEPS)[ShowcaseStage][number];
const namedSteps = new Set<string>(Object.values(SHOWCASE_STEPS).flat());

export function parseShowcaseMessage(value: unknown): ShowcaseStep | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const message = value as { type?: unknown; step?: unknown };
  return message.type === SHOWCASE_UPDATE && typeof message.step === "string" && namedSteps.has(message.step)
    ? (message.step as ShowcaseStep)
    : null;
}

export function isShowcaseReady(value: unknown): boolean {
  return !!value && typeof value === "object" && "type" in value && value.type === SHOWCASE_READY;
}
