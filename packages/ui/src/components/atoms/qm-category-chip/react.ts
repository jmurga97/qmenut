import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmCategoryChip, QM_CATEGORY_CHIP_TAG_NAME, QmCategoryChip as QmCategoryChipElement } from "./index";

import type { EventName } from "@lit/react";

defineQmCategoryChip();

export const QmCategoryChip = createComponent({
  react: React,
  tagName: QM_CATEGORY_CHIP_TAG_NAME,
  elementClass: QmCategoryChipElement,
  displayName: "QmCategoryChip",
  events: {
    onQmSelect: "qm-select" as EventName<CustomEvent<{ value: string }>>,
  },
});
