import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmFieldGroup, QM_FIELD_GROUP_TAG_NAME, QmFieldGroup as QmFieldGroupElement } from "./index";

import type { QmFieldEventDetail } from "../../atoms/qm-field";
import type { EventName } from "@lit/react";

defineQmFieldGroup();

/** `qm-input`/`qm-change` bubble up (composed) from the nested `qm-field`s; `qm-submit` is dispatched by this component itself. */
export const QmFieldGroup = createComponent({
  react: React,
  tagName: QM_FIELD_GROUP_TAG_NAME,
  elementClass: QmFieldGroupElement,
  displayName: "QmFieldGroup",
  events: {
    onQmInput: "qm-input" as EventName<CustomEvent<QmFieldEventDetail>>,
    onQmChange: "qm-change" as EventName<CustomEvent<QmFieldEventDetail>>,
    onQmSubmit: "qm-submit" as EventName<CustomEvent<{ name: string; message: string }>>,
  },
});
