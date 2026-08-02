import { RepinTheme, repinThemes } from "@/types/content";
import { ChangeEvent } from "react";
import { REPIN_THEME_STORAGE_KEY } from "./constants";

export const isRepinTheme = (value: unknown): value is RepinTheme => {
  return typeof value === "string" && repinThemes.includes(value as RepinTheme);
};

export const getRepinThemeClass: (theme: RepinTheme) => string = (theme) => {
  return `repin-theme-${theme}`;
};

export const getStoredRepinTheme: () => Promise<RepinTheme> = async () => {
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

export const handleThemeChange = (event: ChangeEvent<HTMLSelectElement>) => {
  void setStoredRepinTheme(event.target.value as RepinTheme);
};
