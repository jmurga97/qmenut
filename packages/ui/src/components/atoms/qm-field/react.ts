import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmField, QM_FIELD_TAG_NAME, QmField as QmFieldElement } from "./index";

import type { QmFieldEventDetail } from "./index";
import type { EventName } from "@lit/react";

defineQmField();

/** React wrapper: binds `qm-input`/`qm-change` via real `addEventListener`, not React's native custom-element heuristic, so it works regardless of React version and survives SSR. */
export const QmField = createComponent({
  react: React,
  tagName: QM_FIELD_TAG_NAME,
  elementClass: QmFieldElement,
  displayName: "QmField",
  events: {
    onQmInput: "qm-input" as EventName<CustomEvent<QmFieldEventDetail>>,
    onQmChange: "qm-change" as EventName<CustomEvent<QmFieldEventDetail>>,
  },
});
