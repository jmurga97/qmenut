import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmCodeInput, QM_CODE_INPUT_TAG_NAME, QmCodeInput as QmCodeInputElement } from "./index";

import type { QmCodeInputEventDetail } from "./index";
import type { EventName } from "@lit/react";

defineQmCodeInput();

export const QmCodeInput = createComponent({
  react: React,
  tagName: QM_CODE_INPUT_TAG_NAME,
  elementClass: QmCodeInputElement,
  displayName: "QmCodeInput",
  events: {
    onQmInput: "qm-input" as EventName<CustomEvent<QmCodeInputEventDetail>>,
    onQmComplete: "qm-complete" as EventName<CustomEvent<QmCodeInputEventDetail>>,
  },
});
