import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmContactPanel, QM_CONTACT_PANEL_TAG_NAME, QmContactPanel as QmContactPanelElement } from "./index";

import type { QmFieldEventDetail } from "../../atoms/qm-field";
import type { EventName } from "@lit/react";

defineQmContactPanel();

/** All three events bubble up (composed) from the nested `qm-field-group`; this organism dispatches none itself. */
export const QmContactPanel = createComponent({
  react: React,
  tagName: QM_CONTACT_PANEL_TAG_NAME,
  elementClass: QmContactPanelElement,
  displayName: "QmContactPanel",
  events: {
    onQmInput: "qm-input" as EventName<CustomEvent<QmFieldEventDetail>>,
    onQmChange: "qm-change" as EventName<CustomEvent<QmFieldEventDetail>>,
    onQmSubmit: "qm-submit" as EventName<CustomEvent<{ name: string; message: string }>>,
  },
});
