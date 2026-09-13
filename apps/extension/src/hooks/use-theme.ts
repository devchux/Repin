import { useEffect, useState } from "react";

import {
  REPIN_THEME_CHANGED_MESSAGE,
  REPIN_THEME_GET_MESSAGE,
} from "@/lib/constants";
import { isRepinTheme } from "@/lib/theme";
import type { RepinTheme } from "@/types/content";

export const useRepinTheme = () => {
  const [theme, setTheme] = useState<RepinTheme>("auto");

  useEffect(() => {
    let mounted = true;

    void browser.runtime
      .sendMessage({ type: REPIN_THEME_GET_MESSAGE })
      .then((storedTheme: unknown) => {
        if (mounted && isRepinTheme(storedTheme)) {
          setTheme(storedTheme);
        }
      })
      .catch((error: unknown) => {
        console.warn("Repin could not load the saved theme", error);
      });

    const handleThemeMessage = (message: unknown) => {
      if (
        message &&
        typeof message === "object" &&
        "type" in message &&
        message.type === REPIN_THEME_CHANGED_MESSAGE &&
        "theme" in message &&
        isRepinTheme(message.theme)
      ) {
        setTheme(message.theme);
      }
    };

    browser.runtime.onMessage.addListener(handleThemeMessage);

    return () => {
      mounted = false;
      browser.runtime.onMessage.removeListener(handleThemeMessage);
    };
  }, []);

  return theme;
};
