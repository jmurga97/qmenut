import { html } from "lit";
import { ref } from "lit/directives/ref.js";

import { ARCHETYPES, applyQmTheme } from "../src/index";

import type { QmArchetypeName } from "../src/index";
import type { TemplateResult } from "lit";

const archetypeNames = Object.keys(ARCHETYPES) as QmArchetypeName[];

/**
 * Renders one cell per archetype, each themed independently of the global toolbar
 * selection — lets a story show every variant (fine/her/fast/cafe/tapas) at once.
 */
export function archetypeGrid(renderItem: (archetype: QmArchetypeName) => TemplateResult): TemplateResult {
  return html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      ${archetypeNames.map(
        (archetype) => html`
          <div
            ${ref((el) => el instanceof HTMLElement && applyQmTheme(el, { archetype }))}
            style="padding: 1.5rem; border: 1px solid #ddd; border-radius: 4px;"
          >
            <p
              style="margin: 0 0 1rem; font: 600 12px sans-serif; text-transform: uppercase; letter-spacing: 0.05em; color: #888;"
            >
              ${ARCHETYPES[archetype].label} (${archetype})
            </p>
            ${renderItem(archetype)}
          </div>
        `,
      )}
    </div>
  `;
}
