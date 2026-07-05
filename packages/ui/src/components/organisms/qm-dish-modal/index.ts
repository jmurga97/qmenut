import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { FocusTrap } from "../../../internal/focus-trap";
import { QmElement } from "../../../internal/qm-element";
import { defineQmImage } from "../../atoms/qm-image";

import type { PropertyValues } from "lit";

export const QM_DISH_MODAL_TAG_NAME = "qm-dish-modal";

const componentStyles = createComponentStyles(componentStylesText);

let instanceCount = 0;

/**
 * Dish detail overlay: big photo, scrollable rich-text description (default slot — the
 * consumer renders/sanitizes the HTML and slots the result in, this component only supplies
 * the scroll frame), a display-only extras section (`extras` slot), and a repeated
 * `qm-allergen` list (`allergens` slot). Photo size and the photo/description/extras/allergens
 * order come entirely from `--qm-modal-*` tokens set per tenant template by `applyQmTheme` —
 * no `template` prop here, no JS branching in `render()`.
 */
export class QmDishModal extends QmElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: Boolean, reflect: true })
  open = false;

  @property({ type: String })
  name = "";

  @property({ type: String, attribute: "title-id" })
  titleId = "";

  @property({ type: String, attribute: "photo-url" })
  photoUrl?: string;

  @property({ type: String, attribute: "photo-label" })
  photoLabel = "";

  @property({ type: String, attribute: "close-label" })
  closeLabel = "";

  private readonly generatedTitleId = `qm-dish-modal-${++instanceCount}`;

  private get resolvedTitleId(): string {
    return this.titleId || this.generatedTitleId;
  }

  private focusTrap?: FocusTrap;

  @state()
  private hasAllergens = false;

  @state()
  private hasExtras = false;

  private readonly handleAllergensSlotChange = (event: Event) => {
    this.hasAllergens = (event.target as HTMLSlotElement).assignedElements({ flatten: true }).length > 0;
  };

  private readonly handleExtrasSlotChange = (event: Event) => {
    this.hasExtras = (event.target as HTMLSlotElement).assignedElements({ flatten: true }).length > 0;
  };

  private readonly handleBackdropClick = () => {
    this.postEvent({ name: "qm-close", detail: undefined });
  };

  private readonly handleCloseClick = () => {
    this.postEvent({ name: "qm-close", detail: undefined });
  };

  private readonly handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      this.postEvent({ name: "qm-close", detail: undefined });
    }
  };

  updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!changedProperties.has("open")) return;

    if (this.open) {
      this.addEventListener("keydown", this.handleKeydown);
      requestAnimationFrame(() => {
        if (!this.focusTrap) {
          this.focusTrap = new FocusTrap(this.renderRoot as HTMLElement);
        }
        this.focusTrap?.activate();
      });
    } else {
      this.removeEventListener("keydown", this.handleKeydown);
      this.focusTrap?.deactivate();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this.handleKeydown);
    this.focusTrap?.deactivate();
  }

  render() {
    if (!this.open) return nothing;

    return html`
      <div part="backdrop" class="backdrop" @click=${this.handleBackdropClick}></div>
      <div part="dialog" class="dialog" role="dialog" aria-modal="true" aria-labelledby=${this.resolvedTitleId}>
        <div part="header" class="header">
          <h2 part="title" id=${this.resolvedTitleId} class="title">${this.name}</h2>
          <button
            part="close"
            class="close"
            type="button"
            aria-label=${this.closeLabel}
            @click=${this.handleCloseClick}
          >
            <slot name="close-icon" aria-hidden="true"></slot>
          </button>
        </div>
        <div part="photo" class="photo">
          <qm-image part="image" class="image" label=${this.photoLabel}>
            ${this.photoUrl ? html`<img src=${this.photoUrl} alt="" />` : nothing}
          </qm-image>
        </div>
        <div part="description" class="description">
          <slot></slot>
        </div>
        <div part="extras" class="extras" ?hidden=${!this.hasExtras}>
          <slot name="extras" @slotchange=${this.handleExtrasSlotChange}></slot>
        </div>
        <div part="allergens" class="allergens" ?hidden=${!this.hasAllergens}>
          <slot name="allergens" @slotchange=${this.handleAllergensSlotChange}></slot>
        </div>
      </div>
    `;
  }
}

export function defineQmDishModal() {
  defineQmImage();

  if (!customElements.get(QM_DISH_MODAL_TAG_NAME)) {
    customElements.define(QM_DISH_MODAL_TAG_NAME, QmDishModal);
  }
}

export type QmDishModalArgs = Partial<
  Pick<QmDishModal, "open" | "name" | "titleId" | "photoUrl" | "photoLabel" | "closeLabel">
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-dish-modal": QmDishModal;
  }
}
