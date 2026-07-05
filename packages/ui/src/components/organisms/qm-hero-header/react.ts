import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmHeroHeader, QM_HERO_HEADER_TAG_NAME, QmHeroHeader as QmHeroHeaderElement } from "./index";

import type { EventName } from "@lit/react";

defineQmHeroHeader();

/** `qm-change` bubbles up (composed) from the nested `qm-lang`. `langOptions` is a non-string property, set correctly here rather than serialized as an attribute. */
export const QmHeroHeader = createComponent({
  react: React,
  tagName: QM_HERO_HEADER_TAG_NAME,
  elementClass: QmHeroHeaderElement,
  displayName: "QmHeroHeader",
  events: {
    onQmChange: "qm-change" as EventName<CustomEvent<{ value: string }>>,
  },
});
