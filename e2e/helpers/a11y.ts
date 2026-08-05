import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";

import type { Page } from "@playwright/test";

export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}
