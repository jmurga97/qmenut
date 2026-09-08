import { describe, expect, test } from "bun:test";

import { qmColorEngine } from "./color-engine";
import { TEMPLATES } from "./presets";
import { DEFAULT_TENANT_COLORS, resolveTenantThemeConfig } from "./tenant-theme-config";

const template = "her";

describe("saturationCap fallback", () => {
  test("falls back to the template cap only when the override is absent", () => {
    expect(qmColorEngine.derive({ template }).saturationCap).toBe(TEMPLATES[template].saturationCap);
    expect(qmColorEngine.derive({ template, saturationCap: 0.2 }).saturationCap).toBeCloseTo(0.2, 10);
    // `null` means "no clamping", so it must survive instead of taking the template's cap.
    expect(qmColorEngine.derive({ template, saturationCap: null }).saturationCap).toBeNull();
  });
});

describe("tenant colors", () => {
  test("keeps usable colors and defaults blank or missing ones", () => {
    const parsed = resolveTenantThemeConfig({ template, primary: "#123456", secondary: "  " });

    expect(parsed.primary).toBe("#123456");
    expect(parsed.secondary).toBe(DEFAULT_TENANT_COLORS.secondary);
    expect(resolveTenantThemeConfig({ template }).primary).toBe(DEFAULT_TENANT_COLORS.primary);
  });
});
