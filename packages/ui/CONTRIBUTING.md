# @qmenut/ui — Component Review Guidelines

**Package:** `packages/ui` (`@qmenut/ui`)

---

## Purpose

This document defines the mandatory rules for contributing components to this Lit-based web component library. Every pull request touching `packages/ui/src/components/**` must comply with all rules described here.

---

## Package Overview

This package exports a collection of Web Components built with **Lit 3**. Unlike some component libraries, it does not depend on an external CSS or icon package — styling and theming are fully self-contained:

- **`src/theme/`** — the design-token engine (`tokens.ts`, `presets.ts`, `derive.ts`, `apply-theme.ts`). Archetype presets (`fine`, `her`, `fast`, `cafe`, `tapas`) and tenant colors drive CSS custom properties applied at runtime via `applyQmTheme()` — components must never hardcode colors/typography, only reference `var(--qm-*, fallback)`.
- **`src/internal/component-styles.ts`** (`createComponentStyles()`) + **`src/internal/base-styles.ts`** (`qmHostResetStyles`) — every component composes `static styles = [qmHostResetStyles, componentStyles]`, where `componentStyles` comes from the component's own co-located `styles.css` (imported with the `?inline` Vite suffix).
- Icons are not a separate package — compose them via slots (see `qm-button`'s `icon-start`/`icon-end` slots) so any icon source the consumer already has works.

The build pipeline uses **Vite** + **TypeScript**. Component previews/visual QA happen in **Storybook** (`packages/ui/.storybook`). This package does not currently ship automated component tests — do not add a test suite unless explicitly requested.

Key internal utilities every contributor must know (all under `src/internal/`):

- **`QmElement`** (`internal/qm-element.ts`) — base class for all components (extends `LitElement`). Provides `postEvent()` for dispatching custom events.
- **`FocusableMixin`** (`internal/focusable-mixin.ts`) — adds programmatic focus capability for components whose real focus target lives inside the shadow DOM; requires `focusableElement` decorated with `@query`. Not needed when the host already uses `delegatesFocus: true`.
- **`FocusTrap`** (`internal/focus-trap.ts`) — must be used in all modal/overlay components to manage keyboard focus containment.

---

## AI Code Review Agent — Instructions

You are a code review agent for `@qmenut/ui`. When reviewing a pull request, analyze all modified or added `.ts` files under `packages/ui/src/components/**` and report violations of the rules below.

For each violation found, report:

1. The **file** and **line** where the violation occurs
2. The **rule** that is violated
3. A **suggested fix**

Prioritize findings in this order:

1. Accessibility and semantics
2. Public API and consistency
3. State and events
4. Focus and keyboard navigation
5. IDs and ARIA relationships
6. Lifecycle and memory leaks
7. Render cleanliness and maintainability

Use the following output format:

```text
Summary:
- Blocking: X
- Important: X
- Suggestions: X

Findings:
1. [Blocking] file.ts:42 — Missing aria-label forward to internal button. Rule: ARIA Forwarding.
   Suggestion: Pass `ariaLabel` prop to the native <button> element directly.
2. [Blocking] file.ts:18 — Hardcoded id="left-label" is duplicable. Rule: IDs and ARIA References.
3. [Important] file.ts:90 — Component duplicates `open` state already controlled by prop. Rule: State Architecture.
4. [Suggestion] file.ts:60 — Extract repeated icon render block into a private helper. Rule: Render Cleanliness.
```

Be thorough. Do not approve a PR that contains any **Blocking** finding.

---

## Rules

### RULE 1 — Public API Consistency

The public API of a component is defined by its `@property()` declarations and the `Args` type exported alongside it.

**Validate:**

- Standard HTML attributes use `lowercase`: `maxlength`, `readonly`, `disabled`, `placeholder`, `autocomplete`, `name`
- Custom props use `camelCase`: `inputId`, `ariaLabel`, `errorMessage`, `isSelected`
- The primary value prop of input-like components must be named `value`
- Every component must export a named `QM_X_TAG_NAME` constant and a corresponding `QmXArgs` type
- The `Args` type must use `Pick` / `Partial<Pick>` from the component class to stay in sync
- Boolean props that drive CSS attribute selectors must use `reflect: true`
- Components must be registered in the global `HTMLElementTagNameMap`

**❌ Violations:**

```ts
@property() maxLength?: number;     // should be maxlength
@property() searchValue = '';       // non-standard name, use value
@property() isOpen = false;         // duplicates controlled prop
```

**✅ Correct:**

```ts
@property({ type: Number }) maxlength?: number;
@property() value = '';
@property({ type: Boolean, reflect: true }) disabled = false;
```

---

### RULE 2 — Accessibility and Semantics

**Validate:**

- Clickable elements use a native `<button>` — never a `<div>`, `<span>`, icon, or custom element acting as a button
- Every `<button>` has an explicit `type` attribute (`type="button"`, `type="submit"`, or `type="reset"`)
- Inputs use a real `<label>` with `for` pointing to the input's `id` when possible — do not rely solely on `aria-label`
- Decorative icons/slots have `aria-hidden="true"` (and `alt=""` if applicable)
- Functional icons without visible text have a configurable `aria-label` prop — never a hardcoded string like `"Close"` or `"Info"`
- `role="button"` must not be used on non-native elements
- Semantic structures are correct:
  - Breadcrumbs: `<ol>` → `<li>` elements, with `aria-current="page"` on the last item
  - Dialogs: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the visible title
  - Lists used as navigation or menus carry appropriate roles

**❌ Violations:**

```html
<!-- Click handler on a non-button element -->
<div @click="${this.handleClose}">
  <slot name="icon"></slot>
</div>

<!-- Missing type on button -->
<button @click="${this.submit}">Submit</button>

<!-- Hardcoded accessible label -->
<button aria-label="Close">...</button>
```

**✅ Correct:**

```html
<button type="button" aria-label="${this.ariaLabel}" @click="${this.closeModal}">
  <slot name="icon" aria-hidden="true"></slot>
</button>
```

---

### RULE 3 — ARIA Forwarding to Native Controls

When a component wraps an internal native control (`<input>`, `<button>`, `<select>`, etc.), all ARIA attributes relevant to that control must reach the native element directly — not stay on the custom element host.

**ARIA props that must be forwarded to the native control:**

- `aria-label`
- `aria-labelledby`
- `aria-describedby`
- `aria-expanded`
- `aria-controls`
- `aria-current`
- `aria-invalid`
- `aria-required`

Do not duplicate ARIA attributes on both the host and the internal element.

**❌ Violation:**

```ts
// aria-label stays on the host, never reaches the internal button
render() {
  return html`<button type="button">...</button>`;
}
```

```html
<!-- Consumer usage -->
<qm-button aria-label="Open menu"></qm-button>
```

**✅ Correct:**

```ts
@property() ariaLabel = '';

render() {
  return html`
    <button type="button" aria-label=${this.ariaLabel}>...</button>
  `;
}
```

---

### RULE 4 — State Architecture (Controlled Components)

**Components must be stateless by default.** When a consumer controls `value`, `open`, `checked`, `isSelected`, or any equivalent prop, the component must not duplicate that state internally.

There must be a single source of truth for every piece of public state.

**✅ Allowed internal state** (transitional, not competing with public API):

- Focus index within a list
- Visual-only animation flags
- Internal `FocusTrap` instance

**❌ Violations:**

```ts
@property() open = false;

// Internal state duplicating the controlled prop
@state() private _isOpen = false;

updated(changedProps: PropertyValues) {
  if (changedProps.has('open')) {
    this._isOpen = this.open; // two sources of truth
  }
}
```

**✅ Correct:**

```ts
@property({ type: Boolean }) open = false;

// Use `this.open` directly in render — no internal copy
render() {
  if (!this.open) return nothing;
  return html`...`;
}
```

Also, **avoid array-based APIs for composable collections** (tabs, menus, lists). Prefer slot composition instead, as arrays create rigid APIs that prevent flexible rendering on the consumer side.

---

### RULE 5 — Custom Events

**Validate:**

- All custom events use the `qm-` prefix with `kebab-case`
- `detail` contains the data the consumer needs to react — especially the next expected state for controlled components
- Native events are not re-wrapped unnecessarily when the native event already propagates correctly
- `postEvent()` from `QmElement` is used for all custom event dispatching

**Valid event names:**

- `qm-input`, `qm-change`, `qm-focus`, `qm-blur`
- `qm-select`, `qm-tab-change`, `qm-click-outside`
- `qm-close`, `qm-confirm`, `qm-resend-code`

**❌ Violations:**

```ts
this.dispatchEvent(new CustomEvent("onChange")); // camelCase, no qm- prefix
this.dispatchEvent(new CustomEvent("goBack")); // imperative name
this.dispatchEvent(new CustomEvent("toggleClick")); // vague, no prefix

// detail is empty or unhelpful for a controlled component
this.postEvent({ name: "qm-select", detail: undefined });
```

**✅ Correct:**

```ts
this.postEvent({
  name: "qm-select",
  detail: { value: this.value },
});

this.postEvent({
  name: "qm-confirm",
  detail: { code: this.code },
});
```

---

### RULE 6 — Focus and Keyboard Navigation

**Validate:**

- Interactive components use `FocusableMixin` for programmatic focus, unless the host already sets `delegatesFocus: true` and wraps a single native control (see `qm-button`)
- Any component using `FocusableMixin` must declare `focusableElement` with `@query` pointing to the actual native focusable element inside the shadow DOM
- Focus visibility is implemented, particularly when the real focus target is an internal element
- Keyboard-only hacks are not added for native buttons (browsers handle them already)

**WAI-ARIA keyboard patterns to validate:**

| Pattern       | Required behaviour                                                                     |
| ------------- | -------------------------------------------------------------------------------------- |
| **Tabs**      | `tablist` role; active tab `tabindex="0"`, others `-1`; Arrow keys + Home/End          |
| **Menus**     | `menuitem` roles with `tabindex="-1"`; Arrow keys + Home/End; focus first item on open |
| **Dropdowns** | Coherent semantic pattern; visible focus during keyboard navigation                    |
| **Modals**    | `FocusTrap` activated on open, deactivated on close; focus returns to trigger on close |

**❌ Violations:**

```ts
// FocusableMixin used but focusableElement never declared
export class QmInput extends FocusableMixin(QmElement) {
  // Missing: @query('input') focusableElement!: HTMLInputElement;
}

// All tabs have tabindex="0"
html`<div role="tab" tabindex="0">Tab 1</div>
  <div role="tab" tabindex="0">Tab 2</div>`;
```

**✅ Correct:**

```ts
export class QmInput extends FocusableMixin(QmElement) implements FocusableInterface {
  @query("input")
  focusableElement!: HTMLInputElement;
}
```

---

### RULE 7 — Modals Must Use `FocusTrap`

All modal and overlay components must use the `FocusTrap` utility to contain keyboard focus while open and restore focus to the previously focused element on close.

**Required pattern:**

```ts
private focusTrap?: FocusTrap;

updated(changedProperties: Map<string, unknown>) {
  super.updated(changedProperties);
  if (changedProperties.has('open')) {
    if (this.open) {
      requestAnimationFrame(() => {
        if (!this.focusTrap) {
          this.focusTrap = new FocusTrap(this.renderRoot as HTMLElement);
        }
        this.focusTrap?.activate();
      });
    } else {
      this.focusTrap?.deactivate();
    }
  }
}

disconnectedCallback() {
  super.disconnectedCallback();
  this.focusTrap?.deactivate();
}
```

**The dialog element must have:**

- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` pointing to the visible title element's `id`

**❌ Violations:**

- Modal opens without activating `FocusTrap`
- `FocusTrap` is activated but never deactivated in `disconnectedCallback`
- `role="dialog"` or `aria-labelledby` is missing

---

### RULE 8 — IDs and ARIA References

IDs hardcoded inside a component are duplicable when more than one instance exists on the same page, breaking ARIA relationships silently.

**Validate:**

- IDs that must be unique per instance are supplied by the consumer via a prop (e.g. `inputId`)
- If an ID is absolutely required for accessibility and cannot come from outside, it must be exposed as a documented prop
- Generated IDs (when unavoidable) must be tied to the component instance, not a global counter without clear justification

**❌ Violations:**

```ts
// Hardcoded IDs — will break with multiple instances
const errorId = "left-label";
const infoId = "currency-info";
```

**✅ Correct:**

```ts
// Consumer supplies the root ID; derived IDs are scoped to it
const errorId = `${this.inputId}-error`;
const successId = `${this.inputId}-success`;
```

---

### RULE 9 — DOM Queries and Scope

**Validate:**

- `document.querySelector` / `document.querySelectorAll` are never used to reach elements inside the component's own shadow DOM
- `this.renderRoot.querySelector` (or `@query` decorator) is used for shadow DOM elements
- `this.querySelector` is used for light DOM / slotted children
- `window` or `document` listeners are only used for genuinely global concerns (e.g. `click outside`, `resize`)

**❌ Violation:**

```ts
// Searching own shadow DOM via document — incorrect scope
const input = document.querySelector("input");
```

**✅ Correct:**

```ts
// Via decorator (preferred)
@query('input')
focusableElement!: HTMLInputElement;

// Or manually when needed
const input = this.renderRoot.querySelector('input');
```

---

### RULE 10 — Lifecycle and Memory Leaks

**Validate:**

- Any global listener added in `connectedCallback` or `updated` is removed in `disconnectedCallback`
- Listeners are not duplicated across re-renders or lifecycle calls
- Modals or dropdowns that can mount in an open state correctly activate their listeners and `FocusTrap` at mount time
- `super.connectedCallback()`, `super.disconnectedCallback()`, `super.updated()`, and `super.firstUpdated()` are always called

**❌ Violations:**

```ts
connectedCallback() {
  super.connectedCallback();
  document.addEventListener('click', this.handleClickOutside);
  // Missing: removal in disconnectedCallback
}
```

**✅ Correct:**

```ts
connectedCallback() {
  super.connectedCallback();
  document.addEventListener('click', this.handleClickOutside);
}

disconnectedCallback() {
  super.disconnectedCallback();
  document.removeEventListener('click', this.handleClickOutside);
  this.focusTrap?.deactivate();
}
```

---

### RULE 11 — Render Cleanliness and Maintainability

**Validate:**

- `render()` is not overloaded — complex or repeated HTML blocks are extracted into named private helper methods (e.g. `renderHeader()`, `renderButtons()`)
- No dead imports or unused variables remain after a refactor
- No nearly-identical duplicated HTML branches that could be unified
- Direct method references are used for event handlers instead of inline arrow wrappers where possible

**❌ Violations:**

```ts
// Inline wrapper is unnecessary when the handler has the right signature
@click=${(e: Event) => this._onInput(e)}
```

**✅ Correct:**

```ts
// Direct reference
@input=${this._onInput}

// Extract helper
private renderIcon(position: 'left' | 'right'): TemplateResult {
  return html`<span class="icon icon--${position}" part="icon-${position}"><slot name="icon-${position}"></slot></span>`;
}
```

---

### RULE 12 — No Cross-Component Internal Styling

Components must not attempt to style the internals of another component. Shadow DOM encapsulation is intentional. If a child component needs a visual variation when used inside a parent, the correct approach is:

- Add a modifier prop or CSS part to the **child component's own file**
- Use CSS custom properties (design tokens from `src/theme`) that the child already exposes

**❌ Violation:**

```ts
// Inside a parent component — overriding qm-button internals
html`<qm-button style="width: 100%"></qm-button>`;
```

---

## Severity Classification

### Blocking

A finding is **blocking** if it affects:

- Accessibility or incorrect semantics
- Inconsistent or broken public API
- Incorrect or duplicated controlled state
- Duplicable IDs
- Listener memory leaks
- Broken focus or keyboard navigation
- ARIA not forwarded to the native control
- `FocusTrap` missing or not cleaned up in modals

### Important

A finding is **important** if it affects:

- Internal library consistency
- Long-term maintainability
- Unclear event payloads
- Incomplete keyboard UX

### Suggestion

A finding is a **suggestion** if it affects:

- DRY / code deduplication
- Render helper extraction
- Unused import cleanup
- Minor simplifications

---

## PR Checklist (for contributors)

Before opening a PR, confirm all of the following:

- [ ] A named `QM_X_TAG_NAME` constant is exported
- [ ] An `Args` type is exported, using `Pick` / `Partial<Pick>` from the class
- [ ] The component is registered in `HTMLElementTagNameMap`
- [ ] All HTML attribute props use `lowercase`; all custom props use `camelCase`
- [ ] Boolean props driving CSS selectors have `reflect: true`
- [ ] All clickable elements use native `<button>` with explicit `type`
- [ ] No hardcoded accessible text — all labels are configurable via props
- [ ] Decorative icons/slots have `aria-hidden="true"`
- [ ] ARIA attributes are forwarded to the native control, not left on the host
- [ ] No hardcoded IDs — instance-scoped IDs are derived from a consumer-supplied prop
- [ ] The component is stateless by default — no internal duplication of controlled props
- [ ] Custom events use `qm-` prefix, `kebab-case`, and a useful `detail` payload
- [ ] `postEvent()` is used for all custom event dispatching
- [ ] Interactive components use `FocusableMixin` with `focusableElement` declared via `@query` (unless `delegatesFocus: true` already covers it)
- [ ] Modal components use `FocusTrap`, activate it on open, and deactivate it in `disconnectedCallback`
- [ ] Global listeners added in `connectedCallback` are removed in `disconnectedCallback`
- [ ] `super.*` lifecycle methods are always called
- [ ] No `document.querySelector` used for the component's own shadow DOM elements
- [ ] No cross-component internal styling
- [ ] `render()` delegates complex blocks to private helper methods
- [ ] No dead imports or commented-out code left after refactoring
- [ ] `bun run lint` passes with no errors
- [ ] `bun run check` (`tsc --noEmit`) passes with no errors
- [ ] `bun run build-storybook` completes without errors
