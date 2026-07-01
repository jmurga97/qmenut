import type { LitElement } from "lit";

export interface FocusableInterface {
  focusableElement?: HTMLElement | null;
  focus(options?: FocusOptions): void;
  blur(): void;
}

// Lit's mixin pattern requires a loosely-typed constructor signature — see
// https://lit.dev/docs/composition/mixins/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T;

/**
 * Adds programmatic `focus()`/`blur()` to components whose actual focusable element
 * lives inside the shadow DOM. Only needed when the host isn't already using
 * `delegatesFocus: true` (native buttons/inputs usually don't need this mixin).
 * Subclasses must declare `focusableElement` via `@query`.
 */
export const FocusableMixin = <T extends Constructor<LitElement>>(Base: T) => {
  abstract class Focusable extends Base implements FocusableInterface {
    abstract focusableElement?: HTMLElement | null;

    override focus(options?: FocusOptions): void {
      this.focusableElement?.focus(options);
    }

    override blur(): void {
      this.focusableElement?.blur();
    }
  }

  return Focusable;
};
