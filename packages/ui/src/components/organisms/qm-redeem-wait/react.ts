import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmRedeemWait, QM_REDEEM_WAIT_TAG_NAME, QmRedeemWait as QmRedeemWaitElement } from "./index";

import type { EventName } from "@lit/react";

defineQmRedeemWait();

export const QmRedeemWait = createComponent({
  react: React,
  tagName: QM_REDEEM_WAIT_TAG_NAME,
  elementClass: QmRedeemWaitElement,
  displayName: "QmRedeemWait",
  events: {
    onQmCancel: "qm-cancel" as EventName<CustomEvent<void>>,
    onQmRetry: "qm-retry" as EventName<CustomEvent<void>>,
  },
});
