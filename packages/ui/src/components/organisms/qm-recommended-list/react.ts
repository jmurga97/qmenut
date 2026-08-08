import { createComponent } from "@lit/react";
import * as React from "react";

import {
  defineQmRecommendedList,
  QM_RECOMMENDED_LIST_TAG_NAME,
  QmRecommendedList as QmRecommendedListElement,
} from "./index";

export type { QmRecommendedListValue } from "./index";

defineQmRecommendedList();

export const QmRecommendedList = createComponent({
  react: React,
  tagName: QM_RECOMMENDED_LIST_TAG_NAME,
  elementClass: QmRecommendedListElement,
  displayName: "QmRecommendedList",
});
