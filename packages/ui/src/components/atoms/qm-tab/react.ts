import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmTab, QM_TAB_TAG_NAME, QmTab as QmTabElement } from "./index";

import type { EventName } from "@lit/react";

defineQmTab();

export const QmTab = createComponent({
  react: React,
  tagName: QM_TAB_TAG_NAME,
  elementClass: QmTabElement,
  displayName: "QmTab",
  events: {
    onQmSelect: "qm-select" as EventName<CustomEvent<{ value: string }>>,
  },
});
