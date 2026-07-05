import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmLang, QM_LANG_TAG_NAME, QmLang as QmLangElement } from "./index";

import type { EventName } from "@lit/react";

defineQmLang();

/** React wrapper: `options` is a non-string `@property({ attribute: false })`, so it must be set as a JS property — createComponent does this automatically where a plain JSX tag on the raw custom element cannot. */
export const QmLang = createComponent({
  react: React,
  tagName: QM_LANG_TAG_NAME,
  elementClass: QmLangElement,
  displayName: "QmLang",
  events: {
    onQmChange: "qm-change" as EventName<CustomEvent<{ value: string }>>,
  },
});
