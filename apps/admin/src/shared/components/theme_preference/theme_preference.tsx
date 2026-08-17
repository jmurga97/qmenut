import { useEffect, useState } from "react";

import "./theme_preference.css";

export type AdminTheme = "light" | "dark";

export const ADMIN_THEME_STORAGE_KEY = "qmenut-admin-theme";

function readStoredTheme(): AdminTheme {
  try {
    return window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: AdminTheme) {
  document.documentElement.dataset.mcTheme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#181a1f" : "#f5f5f5");
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
      <div aria-label="Tema del panel" className="admin-theme-preference-options" role="group">
        {(["light", "dark"] as const).map((option) => (
          <button
            aria-pressed={theme === option}
            className="admin-theme-preference-option"
            key={option}
            onClick={() => setTheme(option)}
            type="button"
          >
            {option === "light" ? "Claro" : "Oscuro"}
          </button>
        ))}
      </div>
    </section>
  );
}
