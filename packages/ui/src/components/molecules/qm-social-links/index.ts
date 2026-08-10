import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";

import type { TemplateResult } from "lit";

export const QM_SOCIAL_LINKS_TAG_NAME = "qm-social-links";

const componentStyles = createComponentStyles(componentStylesText);

export interface QmSocialLink {
  href: string;
  label: string;
}

type SocialIcon = "facebook" | "instagram" | "linkedin" | "pinterest" | "tiktok" | "x" | "youtube" | "generic";

function socialIcon({ href, label }: QmSocialLink): SocialIcon {
  const value = `${label} ${href}`.toLowerCase();

  if (value.includes("instagram")) return "instagram";
  if (value.includes("facebook") || value.includes("fb.com")) return "facebook";
  if (value.includes("linkedin")) return "linkedin";
  if (value.includes("pinterest")) return "pinterest";
  if (value.includes("tiktok")) return "tiktok";
  if (value.includes("youtube") || value.includes("youtu.be")) return "youtube";
  if (value.includes("twitter") || value.includes("x.com")) return "x";

  return "generic";
}

function renderIcon(icon: SocialIcon): TemplateResult {
  switch (icon) {
    case "instagram":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5"></rect>
          <circle cx="12" cy="12" r="4"></circle>
          <circle class="fill" cx="17.4" cy="6.6" r="1.1"></circle>
        </svg>
      `;
    case "facebook":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 21v-8h3l.5-4H14V7c0-1.2.5-2 2.1-2H18V1.3A25 25 0 0 0 15 1c-3 0-5 1.8-5 5.4V9H7v4h3v8"></path>
        </svg>
      `;
    case "linkedin":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="9" width="4" height="12" rx="1"></rect>
          <circle class="fill" cx="5" cy="4.5" r="2"></circle>
          <path d="M11 21V9h4v1.8A4.5 4.5 0 0 1 22 14.6V21h-4v-5.5c0-1.7-.7-2.7-2-2.7s-1.9 1-1.9 2.7V21"></path>
        </svg>
      `;
    case "pinterest":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M9.5 21c1.2-3.1 1.4-4 2-6.8-.9-1.6.1-4.8 1.8-4.8 1.4 0 1.6 1.3 1.3 2.5-.4 1.5-1.1 3.1.4 3.8 1.4.7 3.5-.7 4-3.2.8-3.7-2-6.5-5.8-6.5-4.2 0-6.7 3.1-6.7 6.2 0 1.2.5 2.5 1.3 3.2"
          ></path>
        </svg>
      `;
    case "tiktok":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M15 3v11.5a4.5 4.5 0 1 1-4-4.5v4a1.5 1.5 0 1 0 1 1.4V3h3c.4 2.2 1.7 3.5 4 4v3c-1.5-.1-2.8-.6-4-1.4"
          ></path>
        </svg>
      `;
    case "youtube":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2a16 16 0 0 0-.5 3.8A16 16 0 0 0 3 15.8a3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 16 16 0 0 0 .5-3.8 16 16 0 0 0-.5-3.8Z"
          ></path>
          <path class="fill" d="m10 15 5-3-5-3Z"></path>
        </svg>
      `;
    case "x":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 3 20 21M20 3 4 21"></path>
        </svg>
      `;
    case "generic":
      return html`
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path>
        </svg>
      `;
  }
}

/** Compact, accessible list of icon-only links to a tenant's social profiles. */
export class QmSocialLinks extends LitElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ attribute: false })
  links: QmSocialLink[] = [];

  @property({ type: String, attribute: "aria-label" })
  ariaLabel = "Social networks";

  render() {
    return html`
      <nav part="nav" class="nav" aria-label=${this.ariaLabel}>
        ${this.links.map(
          (link) => html`
            <a part="link" class="link" href=${link.href} target="_blank" rel="noreferrer" aria-label=${link.label}>
              ${renderIcon(socialIcon(link))}
            </a>
          `,
        )}
      </nav>
    `;
  }
}

export function defineQmSocialLinks() {
  if (!customElements.get(QM_SOCIAL_LINKS_TAG_NAME)) {
    customElements.define(QM_SOCIAL_LINKS_TAG_NAME, QmSocialLinks);
  }
}

export type QmSocialLinksArgs = Partial<Pick<QmSocialLinks, "links" | "ariaLabel">>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-social-links": QmSocialLinks;
  }
}
