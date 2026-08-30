import { ExternalLink } from "lucide-react";

import { Button } from "@repo/ui/button";
import { getRepinThemeClass, handleThemeChange } from "@/lib/theme";
import { useRepinTheme } from "@/hooks/use-theme";
import { repinThemes } from "@/types/content";
import { cn } from "@repo/ui/lib/utils";
import repinLogoUrl from "@/assets/repin-logo-icon.png";

export const PopupApp = () => {
  const theme = useRepinTheme();

  return (
    <main
      className={cn(
        `w-72 space-y-4 bg-white p-4 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50`,
        getRepinThemeClass(theme),
      )}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <img src={repinLogoUrl} alt="" className="size-8 object-contain" />
          <h1 className="text-base font-semibold">Repin</h1>
        </div>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Use the page toolbar to save or annotate the current tab.
        </p>
      </div>
      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Theme
        </span>
        <select
          className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm capitalize outline-none ring-offset-white transition focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-900 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300"
          value={theme}
          onChange={handleThemeChange}
        >
          {repinThemes.map((themeOption) => (
            <option key={themeOption} value={themeOption}>
              {themeOption}
            </option>
          ))}
        </select>
      </label>
      <Button className="w-full items-center gap-3" variant="outline">
        <ExternalLink aria-hidden="true" className="size-4 inline-block mr-2" />
        Open dashboard
      </Button>
    </main>
  );
}
