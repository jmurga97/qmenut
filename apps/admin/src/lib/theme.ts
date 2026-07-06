import { create } from "zustand";

import type { McTheme } from "@murga.ing/components";

const THEME_STORAGE_KEY = "qmenut-admin-theme";
const DARK_THEME_COLOR = "#000000";
const LIGHT_THEME_COLOR = "#f5f5f5";

function isTheme(value: string | null): value is McTheme {
  return value === "dark" || value === "light";
}

function getSystemTheme(): McTheme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getInitialTheme(): McTheme {
  const appliedTheme = document.documentElement.dataset.mcTheme;

  if (appliedTheme === "dark" || appliedTheme === "light") {
    return appliedTheme;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(storedTheme) ? storedTheme : getSystemTheme();
}

function applyTheme(theme: McTheme) {
  document.documentElement.dataset.mcTheme = theme;
  document.documentElement.style.colorScheme = theme;

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute("content", theme === "light" ? LIGHT_THEME_COLOR : DARK_THEME_COLOR);
}

export function initializeTheme() {
  applyTheme(getInitialTheme());
}

interface ThemeStore {
  theme: McTheme;
  setTheme: (theme: McTheme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
}));
