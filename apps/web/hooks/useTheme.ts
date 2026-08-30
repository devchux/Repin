import { ThemeContext } from "@/components/common/theme-provider";
import { useContext } from "react";

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) throw new Error("useTheme must be used within ThemeProvider");

  return context;
}