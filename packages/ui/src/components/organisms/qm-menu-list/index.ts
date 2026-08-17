import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmDishRow } from "../../molecules/qm-dish-row";
import { defineQmFeatured } from "../../molecules/qm-featured";
import { defineQmSectionHeader } from "../../molecules/qm-section-header";

import type { PropertyValues } from "lit";

export const QM_MENU_LIST_TAG_NAME = "qm-menu-list";

const componentStyles = createComponentStyles(componentStylesText);
const CASCADE_DURATION_MS = 300;
const CASCADE_REDUCED_DURATION_MS = 150;
const CASCADE_STEP_MS = 50;
const CASCADE_MAX_STEP = 3;
const CASCADE_EASING = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * Menu body: a `featured` slot (single `qm-featured`), a `section-header` slot (single
 * `qm-section-header`), and a default slot for repeated `qm-dish-row` children — slot
 * composition rather than an `items[]` prop, per CONTRIBUTING RULE 4. `qm-dish-row` already
 * bakes its own inter-row spacing/divider (`--qm-row-pad`/`--qm-divider`) into its own
 * `:host`, so this organism doesn't add any extra per-row gap; the only spacing it owns is
 * the 16px gap between the three major blocks (featured card / section header / dish list),
 * a literal from the reference mockup with no backing `--qm-*` token yet — flagged as
 * hardcoded geometry pending a future token, same as `qm-promo-list`'s 16px card gap.
 */
export class QmMenuList extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: Boolean, reflect: true })
  cascade = false;

  @property({ type: Number, attribute: "cascade-index" })
  cascadeIndex = 0;

  @property({ type: String, attribute: "empty-label" })
  emptyLabel = "";

  @state()
  private hasDishes = false;

  private cascadeAnimation?: Animation;
  private cascadePlayed = false;

  protected updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if ((changedProperties.has("cascade") || changedProperties.has("cascadeIndex")) && this.cascade) {
      this.animateCascade();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cascadeAnimation?.cancel();
    this.cascadeAnimation = undefined;
  }

  private readonly handleSlotChange = (event: Event) => {
    const assigned = (event.target as HTMLSlotElement).assignedElements({ flatten: true });
    this.hasDishes = assigned.length > 0;
  };

  private animateCascade(): void {
    if (!this.cascade || this.cascadePlayed || !this.isConnected) return;

    this.cascadePlayed = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cascadeStep = Number.isFinite(this.cascadeIndex)
      ? Math.max(0, Math.min(this.cascadeIndex, CASCADE_MAX_STEP))
      : 0;
    const animation = this.animate(
      reduceMotion
        ? [{ opacity: 0.7 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "none" },
          ],
      {
        delay: reduceMotion ? 0 : cascadeStep * CASCADE_STEP_MS,
        duration: reduceMotion ? CASCADE_REDUCED_DURATION_MS : CASCADE_DURATION_MS,
        easing: reduceMotion ? "ease" : CASCADE_EASING,
        fill: "backwards",
      },
    );
    const releaseAnimation = () => {
      if (this.cascadeAnimation === animation) this.cascadeAnimation = undefined;
    };

    this.cascadeAnimation = animation;
    animation.addEventListener("finish", releaseAnimation, { once: true });
    animation.addEventListener("cancel", releaseAnimation, { once: true });
  }

  render() {
    return html`
      <div part="frame" class="frame">
        <slot name="featured"></slot>
        <slot name="section-header"></slot>
        <div part="rows" class="rows">
          <slot @slotchange=${this.handleSlotChange}></slot>
          ${!this.hasDishes && this.emptyLabel ? html`<p part="empty" class="empty">${this.emptyLabel}</p>` : nothing}
        </div>
      </div>
    `;
  }
}

export function defineQmMenuList() {
  defineQmFeatured();
  defineQmSectionHeader();
  defineQmDishRow();

  if (!customElements.get(QM_MENU_LIST_TAG_NAME)) {
    customElements.define(QM_MENU_LIST_TAG_NAME, QmMenuList);
  }
}

export type QmMenuListArgs = Partial<Pick<QmMenuList, "cascade" | "cascadeIndex" | "emptyLabel">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-menu-list": QmMenuList;
  }
}
