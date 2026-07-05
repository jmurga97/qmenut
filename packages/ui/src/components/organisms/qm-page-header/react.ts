import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmPageHeader, QM_PAGE_HEADER_TAG_NAME, QmPageHeader as QmPageHeaderElement } from "./index";

import type { EventName } from "@lit/react";

defineQmPageHeader();

/** `qm-change` bubbles up (composed) from the nested `qm-lang`. `langOptions` is a non-string property, set correctly here rather than serialized as an attribute. */
export const QmPageHeader = createComponent({
  react: React,
  tagName: QM_PAGE_HEADER_TAG_NAME,
  elementClass: QmPageHeaderElement,
  displayName: "QmPageHeader",
  events: {
    onQmChange: "qm-change" as EventName<CustomEvent<{ value: string }>>,
  },
});
