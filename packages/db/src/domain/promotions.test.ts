import { describe, expect, test } from "vitest";

import { isPromotionLikeActiveNow } from "./promotions";

import type { PromotionLike } from "./promotions";

const recurringPromotion: PromotionLike = {
  endsAt: null,
  isRecurring: true,
  recurringDays: null,
  recurringEndMinute: 20 * 60,
  recurringStartMinute: 18 * 60,
  startsAt: null,
};

describe("promotion timezone evaluation", () => {
  test("evaluates recurring hours in the restaurant timezone with DST", () => {
    const nowMs = Date.parse("2026-07-17T17:30:00Z");

    expect(
      isPromotionLikeActiveNow({
        nowMs,
        promotion: recurringPromotion,
        timeZone: "Europe/Madrid",
      }),
    ).toBe(true);
    expect(
      isPromotionLikeActiveNow({
        nowMs,
        promotion: recurringPromotion,
        timeZone: "UTC",
      }),
    ).toBe(false);
  });

  test("evaluates recurring weekdays after local midnight", () => {
    const nowMs = Date.parse("2026-07-17T22:30:00Z");
    const saturdayPromotion: PromotionLike = {
      ...recurringPromotion,
      recurringDays: "6",
      recurringEndMinute: 60,
      recurringStartMinute: 0,
    };

    expect(
      isPromotionLikeActiveNow({
        nowMs,
        promotion: saturdayPromotion,
        timeZone: "Europe/Madrid",
      }),
    ).toBe(true);
    expect(
      isPromotionLikeActiveNow({
        nowMs,
        promotion: saturdayPromotion,
        timeZone: "UTC",
      }),
    ).toBe(false);
  });
});
