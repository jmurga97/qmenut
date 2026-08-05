import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { animate } from "motion";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { FocusTrap } from "../../../internal/focus-trap";
import { QmElement } from "../../../internal/qm-element";
import { defineQmImage } from "../../atoms/qm-image";

import type { PropertyValues } from "lit";
import type { AnimationPlaybackControls } from "motion";

export const QM_DISH_MODAL_TAG_NAME = "qm-dish-modal";

const componentStyles = createComponentStyles(componentStylesText);
const PROJECT_DECELERATION_RATE = 0.998;
const DISMISS_VELOCITY_PX_S = 700;
const MAX_UPWARD_STRETCH = 1.025;

interface AnimateSheetArgs {
  dialog: HTMLElement;
  targetY: number;
  velocity: number;
}

let instanceCount = 0;

/**
 * Dish detail overlay: an optional photo followed by one scrollable details region containing
 * the rich-text description (default slot), extras (`extras` slot), and repeated allergens
 * (`allergens` slot). Photo visibility and section order remain theme-token-driven, with no
 * template prop or template-name branching in the component.
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
  private focusTrapFrame?: number;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private sheetAnimation?: AnimationPlaybackControls;
  private dragPointerId?: number;
  private dragStartY = 0;
  private dragY = 0;
  private dragHistory: { time: number; y: number }[] = [];

  @state()
  private hasAllergens = false;

  @state()
  private hasExtras = false;

  @state()
  private rendered = false;

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

  private readonly handleDragStart = (event: PointerEvent) => {
    if (!this.open || event.button !== 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const dialog = this.getDialog();
    if (!dialog) return;

    const handle = event.currentTarget as HTMLElement;
    this.sheetAnimation?.stop();
    this.sheetAnimation = undefined;
    this.dragPointerId = event.pointerId;
    this.dragStartY = event.clientY - this.dragY;
    this.dragHistory = [{ time: event.timeStamp, y: event.clientY }];
    dialog.dataset.dragging = "true";
    handle.setPointerCapture(event.pointerId);
  };

  private readonly handleDragMove = (event: PointerEvent) => {
    if (event.pointerId !== this.dragPointerId) return;

    const dialog = this.getDialog();
    if (!dialog) return;

    const rawY = event.clientY - this.dragStartY;
    if (rawY < 0) {
      const overshoot = Math.abs(this.rubberband(rawY, dialog.clientHeight));
      const scaleY = Math.min(MAX_UPWARD_STRETCH, 1 + overshoot / dialog.clientHeight);
      this.dragY = 0;
      dialog.style.transform = `translate3d(0, 0, 0) scaleY(${scaleY})`;
    } else {
      this.dragY = rawY;
      dialog.style.transform = `translate3d(0, ${this.dragY}px, 0) scaleY(1)`;
    }
    this.dragHistory.push({ time: event.timeStamp, y: event.clientY });
    this.dragHistory = this.dragHistory.slice(-5);
  };

  private readonly handleDragEnd = (event: PointerEvent) => {
    if (event.pointerId !== this.dragPointerId) return;

    const dialog = this.getDialog();
    if (!dialog) return;

    const handle = event.currentTarget as HTMLElement;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }

    delete dialog.dataset.dragging;
    this.dragPointerId = undefined;
    const velocity = this.releaseVelocity();
    const projectedY = this.dragY + (velocity / 1000) * (PROJECT_DECELERATION_RATE / (1 - PROJECT_DECELERATION_RATE));
    const dismiss = velocity > DISMISS_VELOCITY_PX_S || projectedY > dialog.clientHeight * 0.48;

    if (dismiss) {
      void this.animateDismiss(dialog, velocity);
      return;
    }

    this.animateTo({ dialog, targetY: 0, velocity });
  };

  private readonly handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      this.postEvent({ name: "qm-close", detail: undefined });
    }
  };

  willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("open") && this.open) {
      this.rendered = true;
    }
  }

  updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!changedProperties.has("open")) return;

    if (this.open) {
      if (this.closeTimer !== undefined) {
        clearTimeout(this.closeTimer);
        this.closeTimer = undefined;
      }
      this.addEventListener("keydown", this.handleKeydown);
      this.focusTrapFrame = requestAnimationFrame(() => {
        this.focusTrapFrame = undefined;
        if (!this.focusTrap) {
          this.focusTrap = new FocusTrap(this.renderRoot as HTMLElement);
        }
        this.focusTrap?.activate();
      });
      const dialog = this.getDialog();
      if (dialog && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        this.animateTo({ dialog, targetY: 0, velocity: 0 });
      }
    } else {
      this.sheetAnimation?.stop();
      this.sheetAnimation = undefined;
      this.dragPointerId = undefined;
      this.dragY = 0;
      this.getDialog()?.style.removeProperty("transform");
      if (this.focusTrapFrame !== undefined) {
        cancelAnimationFrame(this.focusTrapFrame);
        this.focusTrapFrame = undefined;
      }
      this.removeEventListener("keydown", this.handleKeydown);
      this.focusTrap?.deactivate();
      this.closeTimer = setTimeout(() => {
        this.closeTimer = undefined;
        this.rendered = false;
      }, 240);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.closeTimer !== undefined) {
      clearTimeout(this.closeTimer);
      this.closeTimer = undefined;
    }
    if (this.focusTrapFrame !== undefined) {
      cancelAnimationFrame(this.focusTrapFrame);
      this.focusTrapFrame = undefined;
    }
    this.removeEventListener("keydown", this.handleKeydown);
    this.focusTrap?.deactivate();
    this.sheetAnimation?.stop();
    this.sheetAnimation = undefined;
  }

  private getDialog(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>(".dialog");
  }

  private rubberband(overshoot: number, dimension: number): number {
    const constant = 0.55;
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
  }

  private releaseVelocity(): number {
    const first = this.dragHistory[0];
    const last = this.dragHistory.at(-1);
    if (!first || !last || last.time === first.time) return 0;

    return ((last.y - first.y) / (last.time - first.time)) * 1000;
  }

  private animateTo({ dialog, targetY, velocity }: AnimateSheetArgs): void {
    this.sheetAnimation?.stop();
    this.sheetAnimation = animate(
      dialog,
      { y: targetY, scaleY: 1 },
      {
        type: "spring",
        bounce: targetY === 0 ? 0.08 : 0,
        duration: 0.38,
        velocity,
      },
    );
    this.dragY = targetY;
  }

  private async animateDismiss(dialog: HTMLElement, velocity: number): Promise<void> {
    this.sheetAnimation?.stop();
    this.sheetAnimation = animate(
      dialog,
      { y: dialog.clientHeight + 32, scaleY: 1 },
      {
        type: "spring",
        bounce: 0,
        duration: 0.34,
        velocity,
      },
    );
    await this.sheetAnimation.finished;
    this.dragY = 0;
    this.postEvent({ name: "qm-close", detail: undefined });
  }

  private renderPhoto(): unknown {
    if (!this.photoUrl) return nothing;

    return html`
      <div part="photo" class="photo">
        <qm-image part="image" class="image" label=${this.photoLabel}>
          <img src=${this.photoUrl} alt="" />
        </qm-image>
      </div>
    `;
  }

  render(): unknown {
    if (!this.rendered) return nothing;

    return html`
      <div part="surface" class=${`surface ${this.open ? "" : "surface--closing"}`}>
        <div part="backdrop" class="backdrop" @click=${this.handleBackdropClick}></div>
        <div part="dialog" class="dialog" role="dialog" aria-modal="true" aria-labelledby=${this.resolvedTitleId}>
          <div
            part="handle"
            class="handle"
            aria-hidden="true"
            @pointerdown=${this.handleDragStart}
            @pointermove=${this.handleDragMove}
            @pointerup=${this.handleDragEnd}
            @pointercancel=${this.handleDragEnd}
          >
            <span></span>
          </div>
          <div part="header" class="header">
            <h2 part="title" id=${this.resolvedTitleId} class="title">${this.name}</h2>
            <button
              part="close"
              class="close"
              type="button"
              aria-label=${this.closeLabel}
              @click=${this.handleCloseClick}
            >
              <slot name="close-icon" aria-hidden="true">×</slot>
            </button>
          </div>
          ${this.renderPhoto()}
          <div part="details" class="details">
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
