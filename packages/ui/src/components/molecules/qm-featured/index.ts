import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { defineQmBadge } from "../../atoms/qm-badge";
import { defineQmPrice } from "../../atoms/qm-price";

export const QM_FEATURED_TAG_NAME = "qm-featured";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Featured-dish card: optional hero/thumb photo, tags, name, description, and price. Photo
 * layout (direction, size, order) is fully theme-driven via `--qm-featured-*` tokens, so a
 * template can render it as a hero (image on top/full-width) or thumb (image beside text)
 * without any prop changes here. The tag composes `qm-badge` and maps its local tag tokens
 * into the atom's customization variables. Reuses `qm-price` for price — that atom's
 * font-size is fixed (not configurable), so
 * this molecule renders slightly larger than the design's literal spec; accepted since
 * overriding a child atom's internals is out of bounds (see CONTRIBUTING.md RULE 12).
 */
export interface QmFeaturedValue {
  name: string;
  desc: string;
  price: string;
  oldPrice?: string;
  tag?: string;
  secondaryTag?: string;
  photo: boolean;
  photoUrl?: string;
}

export class QmFeatured extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ attribute: false })
  value?: QmFeaturedValue;

  render() {
    const photoImage = this.value?.photoUrl
      ? html`<img src=${this.value.photoUrl} alt="" loading="eager" decoding="async" />`
      : nothing;
    const tags = this.renderTags();

    return html`
      <div part="card" class="card">
        ${this.value?.photo ? html` <span part="photo" class="photo">${photoImage}</span> ` : nothing}
        <div class="body">
          ${tags}
          <div part="name" class="name">${this.value?.name ?? ""}</div>
          <div part="desc" class="desc">${this.value?.desc ?? ""}</div>
          <qm-price part="price" .value=${this.value?.price ?? ""} .oldValue=${this.value?.oldPrice}></qm-price>
        </div>
      </div>
    `;
  }

  private renderTags() {
    if (!this.value?.tag && !this.value?.secondaryTag) return html``;

    const primaryTag = this.renderTag({ className: "tag", part: "tag", text: this.value?.tag });
    const secondaryTag = this.renderTag({
      className: "tag tag--secondary",
      part: "secondary-tag",
      text: this.value?.secondaryTag,
    });

    return html` <div part="tags" class="tags">${primaryTag} ${secondaryTag}</div> `;
  }

  private renderTag({ className, part, text }: { className: string; part: string; text?: string }) {
    if (!text) return html``;

    return html`<qm-badge part=${part} class=${className} .text=${text}></qm-badge>`;
  }
}

export function defineQmFeatured() {
  defineQmBadge();
  defineQmPrice();

  if (!customElements.get(QM_FEATURED_TAG_NAME)) {
    customElements.define(QM_FEATURED_TAG_NAME, QmFeatured);
  }
}

export type QmFeaturedArgs = Partial<Pick<QmFeatured, "value">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-featured": QmFeatured;
  }
}
