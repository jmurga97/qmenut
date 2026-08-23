import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmContactPanel, QM_CONTACT_PANEL_TAG_NAME, QmContactPanel as QmContactPanelElement } from "./index";

export type { QmContactPanelValue } from "./index";

defineQmContactPanel();

export const QmContactPanel = createComponent({
  react: React,
  tagName: QM_CONTACT_PANEL_TAG_NAME,
  elementClass: QmContactPanelElement,
  displayName: "QmContactPanel",
});
