import { useEffect, useState } from "react";
import { getStoredRepinTheme, isRepinTheme } from "@/lib/theme";
import { RepinTheme } from "@/types/content";
import { REPIN_THEME_STORAGE_KEY } from "@/lib/constants";

export const useRepinTheme = () => {
  const [theme, setTheme] = useState<RepinTheme>("auto");

  useEffect(() => {
    void getStoredRepinTheme().then(setTheme);

    const handleStorageChange = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== "local") {
        return;
      }

      const themeChange = changes[REPIN_THEME_STORAGE_KEY];

      if (!themeChange) {
        return;
      }

      setTheme(
        isRepinTheme(themeChange.newValue) ? themeChange.newValue : "auto",
      );
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return theme;
};
