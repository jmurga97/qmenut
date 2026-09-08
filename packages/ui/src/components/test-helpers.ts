import type { LitElement } from "lit";

export async function mount<T extends LitElement>(element: T): Promise<T> {
  document.body.append(element);
  await element.updateComplete;
  return element;
}

export async function update(element: LitElement): Promise<void> {
  await element.updateComplete;
}

export function shadowQuery<T extends Element>(element: LitElement, selector: string): T {
  const result = element.renderRoot.querySelector<T>(selector);
  if (!result) throw new Error(`Missing ${selector} in ${element.localName}`);
  return result;
}

export function dispatchSlotChange(element: LitElement, slotSelector = "slot"): void {
  shadowQuery<HTMLSlotElement>(element, slotSelector).dispatchEvent(new Event("slotchange"));
}
