export const themes = ["system", "light", "dark"] as const;

export type Theme = (typeof themes)[number];

export type ThemeContextValue = {
  readonly theme: Theme;
  readonly setTheme: (theme: Theme) => void;
};