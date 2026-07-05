import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmDishModal, QM_DISH_MODAL_TAG_NAME, QmDishModal as QmDishModalElement } from "./index";

import type { EventName } from "@lit/react";

defineQmDishModal();

export const QmDishModal = createComponent({
  react: React,
  tagName: QM_DISH_MODAL_TAG_NAME,
  elementClass: QmDishModalElement,
  displayName: "QmDishModal",
  events: {
    onQmClose: "qm-close" as EventName<CustomEvent<undefined>>,
  },
});
