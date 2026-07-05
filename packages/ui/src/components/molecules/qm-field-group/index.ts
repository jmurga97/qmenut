import { html } from "lit";
import { property } from "lit/decorators.js";

import componentStylesText from "./styles.css?inline";
import { qmHostResetStyles } from "../../../internal/base-styles";
import { createComponentStyles } from "../../../internal/component-styles";
import { QmElement } from "../../../internal/qm-element";
import { defineQmField } from "../../atoms/qm-field";

export const QM_FIELD_GROUP_TAG_NAME = "qm-field-group";

const componentStyles = createComponentStyles(componentStylesText);

/**
 * Contact-form group: two labeled fields ("Nombre", "Mensaje") and a submit button. Fully
 * controlled — the consumer owns `nameValue`/`messageValue` and updates them from the
 * fields' own bubbling `qm-input`/`qm-change` events, same pattern as `qm-field` itself.
 * `qm-field` only supports a single-line input (no textarea variant), so the "Mensaje"
 * field renders as a single line rather than the taller textarea-like box in the design —
 * accepted rather than inventing a new atom-level primitive.
 *
 * Does not implement `FocusableMixin`: this molecule wraps three independently-focusable
 * children (two `qm-field`s + a submit button), not a single delegatable control, so there
 * is no one `focusableElement` to point at — each child already manages its own focus.
 */
export class QmFieldGroup extends QmElement {
  static styles = [qmHostResetStyles, componentStyles];

  @property({ type: String, attribute: "name-label" })
  nameLabel = "Nombre";

  @property({ type: String, attribute: "name-value" })
  nameValue = "";

  @property({ type: String, attribute: "name-placeholder" })
  namePlaceholder = "";

  @property({ type: String, attribute: "message-label" })
  messageLabel = "Mensaje";

  @property({ type: String, attribute: "message-value" })
  messageValue = "";

  @property({ type: String, attribute: "message-placeholder" })
  messagePlaceholder = "";

  @property({ type: String, attribute: "submit-label" })
  submitLabel = "Enviar";

  @property({ type: Boolean, reflect: true })
  disabled = false;

  private readonly handleSubmit = () => {
    this.postEvent({
      name: "qm-submit",
      detail: { name: this.nameValue, message: this.messageValue },
    });
  };

  render() {
    return html`
      <div part="card" class="card">
        <qm-field
          part="name-field"
          label=${this.nameLabel}
          name="name"
          .value=${this.nameValue}
          placeholder=${this.namePlaceholder}
          ?disabled=${this.disabled}
        ></qm-field>
        <qm-field
          part="message-field"
          label=${this.messageLabel}
          name="message"
          .value=${this.messageValue}
          placeholder=${this.messagePlaceholder}
          ?disabled=${this.disabled}
        ></qm-field>
        <button part="submit" class="submit" type="button" ?disabled=${this.disabled} @click=${this.handleSubmit}>
          ${this.submitLabel}
        </button>
      </div>
    `;
  }
}

export function defineQmFieldGroup() {
  defineQmField();

  if (!customElements.get(QM_FIELD_GROUP_TAG_NAME)) {
    customElements.define(QM_FIELD_GROUP_TAG_NAME, QmFieldGroup);
  }
}

export type QmFieldGroupArgs = Partial<
  Pick<
    QmFieldGroup,
    | "nameLabel"
    | "nameValue"
    | "namePlaceholder"
    | "messageLabel"
    | "messageValue"
    | "messagePlaceholder"
    | "submitLabel"
    | "disabled"
  >
>;

declare global {
  interface HTMLElementTagNameMap {
    "qm-field-group": QmFieldGroup;
  }
}
