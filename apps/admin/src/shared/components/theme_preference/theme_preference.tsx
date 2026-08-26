import { useEffect, useState } from "react";

import { SegmentedToggle } from "~/shared/components/controls/segmented-toggle";

import type { SegmentedOption } from "~/shared/components/controls/segmented-toggle";

import "./theme_preference.css";

export type AdminTheme = "light" | "dark";

export const ADMIN_THEME_STORAGE_KEY = "qmenut-admin-theme";

const THEME_OPTIONS: ReadonlyArray<SegmentedOption<AdminTheme>> = [
  { label: "Claro", value: "light" },
  { label: "Oscuro", value: "dark" },
];

function readStoredTheme(): AdminTheme {
  try {
    return window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: AdminTheme) {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;
  const background = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
  if (background) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", background);
  }
}

export function AdminThemePreference() {
  const [theme, setTheme] = useState<AdminTheme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
    } catch {
      // The preference still applies for the current session.
    }
  }, [theme]);

  return (
    <section aria-labelledby="admin-theme-preference-title" className="admin-theme-preference">
      <div className="admin-theme-preference-copy">
        <h2 id="admin-theme-preference-title">Tema del panel</h2>
        <p>Solo cambia cómo ves QMenut en este dispositivo.</p>
      </div>
      <SegmentedToggle ariaLabel="Tema del panel" onChange={setTheme} options={THEME_OPTIONS} value={theme} />
    </section>
  );
}
