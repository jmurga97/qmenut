import { z } from "zod";

export const TEMPLATE_IDS = ["tapas", "fine", "cafe", "fast", "her"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** Theme-engine name retained for existing UI consumers. */
export type QmTemplateName = TemplateId;

/** Shared validator for template identifiers crossing an HTTP, form, or file boundary. */
export const templateIdSchema = z.enum(TEMPLATE_IDS);
