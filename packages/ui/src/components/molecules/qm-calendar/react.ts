import { createComponent } from "@lit/react";
import * as React from "react";

import { defineQmCalendar, QM_CALENDAR_TAG_NAME, QmCalendar as QmCalendarElement } from "./index";

import type { QmCalendarMonthDetail, QmCalendarSelectDetail } from "./index";
import type { EventName } from "@lit/react";

defineQmCalendar();

export const QmCalendar = createComponent({
  react: React,
  tagName: QM_CALENDAR_TAG_NAME,
  elementClass: QmCalendarElement,
  displayName: "QmCalendar",
  events: {
    onQmSelect: "qm-select" as EventName<CustomEvent<QmCalendarSelectDetail>>,
    onQmMonth: "qm-month" as EventName<CustomEvent<QmCalendarMonthDetail>>,
  },
});
