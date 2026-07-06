/**
 * Lit custom-element classes (`class X extends LitElement`) evaluate at module scope inside the
 * SSR bundle. Under Node, Lit's own exports pull in this shim; the Workers runtime resolves
 * Lit's browser build instead, so the DOM globals must be installed before any @qmenut/ui
 * component module is imported. Imported first from `src/app/server.ts`.
 */
import { customElements, Element, HTMLElement } from "@lit-labs/ssr-dom-shim";

const globals = globalThis as Record<string, unknown>;

globals.HTMLElement ??= HTMLElement;
globals.Element ??= Element;
globals.customElements ??= customElements;
