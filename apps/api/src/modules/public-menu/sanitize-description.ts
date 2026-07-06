import { FilterXSS } from "xss";

// Descriptions are stored as (potentially) rich-text HTML. Only harmless inline
// formatting survives; everything else — attributes included — is stripped.
const filter = new FilterXSS({
  whiteList: {
    b: [],
    br: [],
    em: [],
    i: [],
    li: [],
    ol: [],
    p: [],
    span: [],
    strong: [],
    u: [],
    ul: [],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
});

export function sanitizeDescription(value: string): string {
  return filter.process(value);
}

export function sanitizeNullableDescription(value: string | null): string | null {
  return value === null ? null : sanitizeDescription(value);
}
