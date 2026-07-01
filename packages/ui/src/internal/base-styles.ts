import { css } from "lit";

/**
 * Minimal `:host` reset shared by every `qm-*` component. Unlike murga's
 * `murgaThemeStyles`, this does NOT define default token values — those come from
 * `applyQmTheme` at runtime, computed per tenant/archetype.
 */
export const qmHostResetStyles = css`
  :host {
    display: block;
    box-sizing: border-box;
    font-family: var(--qm-body, sans-serif);
  }

  :host *,
  :host *::before,
  :host *::after {
    box-sizing: border-box;
  }
`;
