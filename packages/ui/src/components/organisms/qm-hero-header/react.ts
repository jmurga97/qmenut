import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmHeroHeader, QM_HERO_HEADER_TAG_NAME, QmHeroHeader as QmHeroHeaderElement } from "./index";

import type { EventName } from "@lit/react";

defineQmHeroHeader();

/** Language and currency options are non-string properties, set correctly here rather than serialized as attributes. */
export const QmHeroHeader = createComponent({
  react: React,
  tagName: QM_HERO_HEADER_TAG_NAME,
  elementClass: QmHeroHeaderElement,
  displayName: "QmHeroHeader",
  events: {
    onQmChange: "qm-change" as EventName<CustomEvent<{ value: string }>>,
    onQmCurrencyChange: "qm-currency-change" as EventName<CustomEvent<{ value: string }>>,
  },
});
