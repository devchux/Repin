import { ExternalLink, LoaderCircle, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@repo/ui/button";
import { getRepinThemeClass, handleThemeChange } from "@/lib/theme";
import { useRepinTheme } from "@/hooks/use-theme";
import { repinThemes } from "@/types/content";
import { cn } from "@repo/ui/lib/utils";
import repinLogoUrl from "@/assets/repin-logo-icon.png";

export const PopupApp = () => {
  const theme = useRepinTheme();
  const [auth, setAuth] = useState<{
    authenticated: boolean;
    user?: { email: string };
  }>();
  const [authError, setAuthError] = useState<string>();
  const [authPending, setAuthPending] = useState(false);

  useEffect(() => {
    void browser.runtime
      .sendMessage({ type: "repin.auth.status" })
      .then(setAuth)
      .catch(() => setAuth({ authenticated: false }));
  }, []);

  async function handleConnect() {
    setAuthError(undefined);
    setAuthPending(true);
    try {
      setAuth(
        await browser.runtime.sendMessage({ type: "repin.auth.connect" }),
      );
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setAuthPending(false);
    }
  }

  async function handleDisconnect() {
    setAuthError(undefined);
    setAuthPending(true);
    try {
      setAuth(
        await browser.runtime.sendMessage({ type: "repin.auth.disconnect" }),
      );
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign-out failed");
    } finally {
      setAuthPending(false);
    }
  }

  async function openDashboard() {
    const stored = await browser.storage.local.get("repinWebUrl");
    const webUrl =
      (stored.repinWebUrl as string | undefined) ?? "http://localhost:3000";
    await browser.tabs.create({ url: webUrl });
  }

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
      <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        {!auth ? (
          <p className="text-sm text-neutral-500">Checking account...</p>
        ) : auth.authenticated ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Connected as
              </p>
              <p className="truncate text-sm font-medium">{auth.user?.email}</p>
            </div>
            <Button
              aria-label="Disconnect account"
              disabled={authPending}
              onClick={() => void handleDisconnect()}
              size="icon"
              variant="ghost"
            >
              {authPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
            </Button>
          </div>
        ) : (
          <Button
            className="w-full"
            disabled={authPending}
            onClick={() => void handleConnect()}
          >
            {authPending ? (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            ) : null}
            {authPending ? "Opening Repin..." : "Connect Repin"}
          </Button>
        )}
        {authError ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {authError}
          </p>
        ) : null}
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
      <Button
        className="w-full items-center gap-3"
        disabled={!auth?.authenticated}
        onClick={() => void openDashboard()}
        variant="outline"
      >
        <ExternalLink aria-hidden="true" className="size-4 inline-block mr-2" />
        Open dashboard
      </Button>
    </main>
  );
};
