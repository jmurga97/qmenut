import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmRewardRow, QM_REWARD_ROW_TAG_NAME, QmRewardRow as QmRewardRowElement } from "./index";

import type { QmRewardEventDetail } from "./index";
import type { EventName } from "@lit/react";

defineQmRewardRow();

export const QmRewardRow = createComponent({
  react: React,
  tagName: QM_REWARD_ROW_TAG_NAME,
  elementClass: QmRewardRowElement,
  displayName: "QmRewardRow",
  events: { onQmRedeem: "qm-redeem" as EventName<CustomEvent<QmRewardEventDetail>> },
});
