import { LitElement } from "lit";

export interface QmEventInit<TDetail> {
  name: `qm-${string}`;
  detail: TDetail;
  bubbles?: boolean;
  composed?: boolean;
  cancelable?: boolean;
}

/**
 * Base class for every `qm-*` component. Centralizes custom event dispatch so all
 * components emit `qm-*` events the same way (bubbling + composed by default, so they
 * cross shadow DOM boundaries).
 */
export class QmElement extends LitElement {
  protected postEvent<TDetail>(init: QmEventInit<TDetail>): boolean {
    const { name, detail, bubbles = true, composed = true, cancelable = false } = init;

    return this.dispatchEvent(new CustomEvent(name, { detail, bubbles, composed, cancelable }));
  }
}
