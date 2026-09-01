import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmPageHeader, QM_PAGE_HEADER_TAG_NAME, QmPageHeader as QmPageHeaderElement } from "./index";

import type { EventName } from "@lit/react";

defineQmPageHeader();

/** Language and currency options are non-string properties, set correctly here rather than serialized as attributes. */
export const QmPageHeader = createComponent({
  react: React,
  tagName: QM_PAGE_HEADER_TAG_NAME,
  elementClass: QmPageHeaderElement,
  displayName: "QmPageHeader",
  events: {
    onQmChange: "qm-change" as EventName<CustomEvent<{ value: string }>>,
    onQmCurrencyChange: "qm-currency-change" as EventName<CustomEvent<{ value: string }>>,
  },
});
