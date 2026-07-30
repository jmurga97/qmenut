import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmLoyaltyCard, QM_LOYALTY_CARD_TAG_NAME, QmLoyaltyCard as QmLoyaltyCardElement } from "./index";

import type { EventName } from "@lit/react";

defineQmLoyaltyCard();

export const QmLoyaltyCard = createComponent({
  react: React,
  tagName: QM_LOYALTY_CARD_TAG_NAME,
  elementClass: QmLoyaltyCardElement,
  displayName: "QmLoyaltyCard",
  events: { onQmStampRequest: "qm-stamp-request" as EventName<CustomEvent<void>> },
});
