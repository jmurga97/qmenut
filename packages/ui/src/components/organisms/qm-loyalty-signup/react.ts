import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmLoyaltySignup, QM_LOYALTY_SIGNUP_TAG_NAME, QmLoyaltySignup as QmLoyaltySignupElement } from "./index";

import type { QmLoyaltyEmailEventDetail } from "./index";
import type { EventName } from "@lit/react";

defineQmLoyaltySignup();

export const QmLoyaltySignup = createComponent({
  react: React,
  tagName: QM_LOYALTY_SIGNUP_TAG_NAME,
  elementClass: QmLoyaltySignupElement,
  displayName: "QmLoyaltySignup",
  events: {
    onQmInput: "qm-input" as EventName<CustomEvent<QmLoyaltyEmailEventDetail>>,
    onQmSubmit: "qm-submit" as EventName<CustomEvent<QmLoyaltyEmailEventDetail>>,
  },
});
