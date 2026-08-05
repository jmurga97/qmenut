import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmCategoryChip, QM_CATEGORY_CHIP_TAG_NAME } from "../../atoms/qm-category-chip";

import type { QmCategoryChip } from "../../atoms/qm-category-chip";

export const QM_CATEGORY_NAV_TAG_NAME = "qm-category-nav";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Horizontal toolbar for slotted `qm-category-chip` controls. The consumer owns active
 * state; this molecule manages focus and keeps the controlled active chip visible. Unlike
 * `qm-nav-bar`, arrow/Home/End keys move focus without selecting because each chip scrolls
 * the page and toolbar navigation must not trigger that action.
 */
export class QmCategoryNav extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String, attribute: "aria-label" })
  ariaLabel: string | null = null;

  private readonly activeObserver = new MutationObserver(() => {
    this.scrollActiveChipIntoView();
  });

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this.handleKeydown);
    this.activeObserver.observe(this, {
      subtree: true,
      attributes: true,
      attributeFilter: ["active"],
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this.handleKeydown);
    this.activeObserver.disconnect();
  }

  private getChips(): QmCategoryChip[] {
    const slot = this.renderRoot.querySelector("slot");
    const assigned = slot?.assignedElements({ flatten: true }) ?? [];
    return assigned.filter(
      (element): element is QmCategoryChip => element.tagName.toLowerCase() === QM_CATEGORY_CHIP_TAG_NAME,
    );
  }

  private scrollActiveChipIntoView(): void {
    const track = this.renderRoot.querySelector<HTMLElement>(".track");
    const chip = this.getChips().find((candidate) => candidate.active);
    if (!track || !chip) return;

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({
      left: chip.offsetLeft - (track.clientWidth - chip.offsetWidth) / 2,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  private readonly handleSlotChange = () => {
    this.scrollActiveChipIntoView();
  };

  private readonly handleKeydown = (event: KeyboardEvent) => {
    const chips = this.getChips();
    if (chips.length === 0) return;

    const focusedIndex = chips.findIndex((chip) => event.composedPath().includes(chip));
    const activeIndex = chips.findIndex((chip) => chip.active);
    const currentIndex = focusedIndex === -1 ? activeIndex : focusedIndex;
    const fallbackIndex = currentIndex === -1 ? 0 : currentIndex;

    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = (fallbackIndex + 1) % chips.length;
        break;
      case "ArrowLeft":
        nextIndex = (fallbackIndex - 1 + chips.length) % chips.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = chips.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    chips[nextIndex].focus();
  };

  render() {
    return html`
      <div
        part="track"
        class="track"
        role="toolbar"
        aria-orientation="horizontal"
        aria-label=${this.ariaLabel ?? nothing}
      >
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
    `;
  }
}

export function defineQmCategoryNav() {
  defineQmCategoryChip();

  if (!customElements.get(QM_CATEGORY_NAV_TAG_NAME)) {
    customElements.define(QM_CATEGORY_NAV_TAG_NAME, QmCategoryNav);
  }
}

export type QmCategoryNavArgs = Partial<Pick<QmCategoryNav, "ariaLabel">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-category-nav": QmCategoryNav;
  }
}
