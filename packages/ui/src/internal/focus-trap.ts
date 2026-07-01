const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Contains keyboard focus within a root element (used by modal/overlay components) and
 * restores focus to whatever was focused before activation. Root is usually
 * `this.renderRoot as HTMLElement` from the owning component.
 */
export class FocusTrap {
  private previouslyFocused: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement) {}

  activate(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.root.addEventListener("keydown", this.handleKeydown);
    this.getFocusableElements()[0]?.focus();
  }

  deactivate(): void {
    this.root.removeEventListener("keydown", this.handleKeydown);
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
  }

  private getFocusableElements(): HTMLElement[] {
    return Array.from(this.root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Tab") return;

    const focusable = this.getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active =
      this.root.getRootNode() instanceof ShadowRoot
        ? (this.root.getRootNode() as ShadowRoot).activeElement
        : document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };
}
