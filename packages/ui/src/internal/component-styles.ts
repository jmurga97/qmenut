import { css, unsafeCSS } from "lit";

export function createComponentStyles(stylesheetText: string) {
  return css`
    ${unsafeCSS(stylesheetText)}
  `;
}
