"use client";

import { applyTheme, isTheme } from "@/lib/utils";
import { Theme, ThemeContextValue } from "@/types/appearance";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

export const REPIN_THEME_STORAGE_KEY = "repin:theme";


export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { readonly children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(REPIN_THEME_STORAGE_KEY);
    const initialTheme = isTheme(storedTheme) ? storedTheme : "system";
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (theme === "system") applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    window.localStorage.setItem(REPIN_THEME_STORAGE_KEY, nextTheme);
    setThemeState(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}


