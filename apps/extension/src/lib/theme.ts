import type { ChangeEvent } from "react";

import type { RepinTheme } from "@/types/content";
import { repinThemes } from "@/types/content";
import { REPIN_THEME_STORAGE_KEY } from "./constants";

export const isRepinTheme = (value: unknown): value is RepinTheme => {
  return typeof value === "string" && repinThemes.includes(value as RepinTheme);
};

export const getRepinThemeClass: (theme: RepinTheme) => string = (theme) => {
  return `repin-theme-${theme}`;
};

export const getStoredRepinTheme = async (): Promise<RepinTheme> => {
  const storedTheme = await browser.storage.local.get(REPIN_THEME_STORAGE_KEY);
  const theme = storedTheme[REPIN_THEME_STORAGE_KEY];

  return isRepinTheme(theme) ? theme : "auto";
};

export const setStoredRepinTheme: (theme: RepinTheme) => Promise<void> = async (
  theme,
) => {
  await browser.storage.local.set({
    [REPIN_THEME_STORAGE_KEY]: theme,
  });
};

export const handleThemeChange = async (
  event: ChangeEvent<HTMLSelectElement>,
) => {
  const theme = event.target.value;

  if (!isRepinTheme(theme)) {
    return;
  }

  await setStoredRepinTheme(theme);
};
