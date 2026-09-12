import {
  BookmarkPlus,
  ExternalLink,
  FileText,
  LoaderCircle,
  LogOut,
  MessageCircle,
  NotebookPen,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AssistantCapability } from "@repo/contracts/assistant";

import { Button } from "@repo/ui/button";
import { getRepinThemeClass, handleThemeChange } from "@/lib/theme";
import { useRepinTheme } from "@/hooks/use-theme";
import { repinThemes } from "@/types/content";
import { cn } from "@repo/ui/lib/utils";
import repinLogoUrl from "@/assets/repin-logo-icon.png";
import { PAGE_ACTIONS } from "@/lib/page-actions";
import { openPageSidebar } from "@/lib/sidebar-activation";

const actionIcons = {
  summarize: FileText,
  save: BookmarkPlus,
  note: NotebookPen,
  chat: MessageCircle,
} as const satisfies Partial<Record<AssistantCapability, typeof FileText>>;

export const PopupApp = () => {
  const theme = useRepinTheme();
  const [auth, setAuth] = useState<{
    authenticated: boolean;
    user?: { email: string };
  }>();
  const [authError, setAuthError] = useState<string>();
  const [authPending, setAuthPending] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [actionPending, setActionPending] = useState<AssistantCapability>();
  const [browserControlEnabled, setBrowserControlEnabled] = useState(false);

  useEffect(() => {
    void browser.runtime
      .sendMessage({ type: "repin.auth.status" })
      .then(setAuth)
      .catch(() => setAuth({ authenticated: false }));
  }, []);

  useEffect(() => {
    void browser.permissions
      .contains({ permissions: ["debugger"] })
      .then(setBrowserControlEnabled);
  }, []);

  async function enableBrowserControl() {
    setActionError(undefined);
    try {
      setBrowserControlEnabled(
        await browser.permissions.request({ permissions: ["debugger"] }),
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Browser control permission was not granted",
      );
    }
  }

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

  async function openPageAction(mode: AssistantCapability) {
    setActionError(undefined);
    setActionPending(mode);
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab) throw new Error("No active browser tab");
      await openPageSidebar(tab, mode);
      window.close();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Repin could not open this action",
      );
    } finally {
      setActionPending(undefined);
    }
  }

  return (
    <main
      className={cn(
        "w-80 bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50",
        getRepinThemeClass(theme),
      )}
    >
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <img src={repinLogoUrl} alt="" className="size-8 object-contain" />
          <div>
            <h1 className="text-sm font-semibold leading-4">Repin</h1>
            <p className="mt-0.5 max-w-44 truncate text-[11px] text-neutral-500 dark:text-neutral-400">
              {auth?.authenticated ? auth.user?.email : "Browser assistant"}
            </p>
          </div>
        </div>
        {auth?.authenticated ? (
          <Button
            aria-label="Disconnect account"
            className="size-8 text-neutral-500 dark:text-neutral-400"
            disabled={authPending}
            onClick={() => void handleDisconnect()}
            size="icon"
            title="Disconnect account"
            variant="ghost"
          >
            {authPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
          </Button>
        ) : null}
      </header>

      <section aria-label="Page actions" className="p-3">
        <div className="grid grid-cols-2 gap-2">
          {PAGE_ACTIONS.map((action) => {
            const Icon = actionIcons[action.mode];
            const pending = actionPending === action.mode;
            return (
              <button
                key={action.id}
                className="group flex h-20 flex-col items-start justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-left outline-none transition-[background-color,border-color,transform] hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-45 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-primary/50 dark:hover:bg-primary/10 dark:focus-visible:ring-offset-neutral-950"
                disabled={!auth?.authenticated || Boolean(actionPending)}
                type="button"
                onClick={() => void openPageAction(action.mode)}
              >
                {pending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-5 animate-spin text-primary"
                  />
                ) : (
                  <Icon
                    aria-hidden="true"
                    className="size-5 text-primary transition-transform group-hover:-translate-y-0.5"
                  />
                )}
                <span className="text-xs font-semibold">{action.label}</span>
              </button>
            );
          })}
        </div>

        {!auth ? (
          <div className="mt-2 h-9 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        ) : !auth.authenticated ? (
          <Button
            className="mt-2 w-full active:scale-[0.98]"
            disabled={authPending}
            onClick={() => void handleConnect()}
            size="sm"
          >
            {authPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {authPending ? "Opening Repin..." : "Connect"}
          </Button>
        ) : null}

        {auth?.authenticated && !browserControlEnabled ? (
          <Button
            className="mt-2 w-full"
            onClick={() => void enableBrowserControl()}
            size="sm"
            variant="outline"
          >
            <ShieldCheck className="size-4" />
            Enable advanced browser control
          </Button>
        ) : null}

        {authError || actionError ? (
          <p
            className="mt-2 rounded-lg bg-red-50 px-2.5 py-2 text-xs leading-4 text-red-700 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            {authError ?? actionError}
          </p>
        ) : null}
      </section>

      <footer className="flex h-12 items-center gap-2 border-t border-neutral-200 px-3 dark:border-neutral-800">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Theme</span>
          <select
            aria-label="Theme"
            className="h-8 w-full appearance-none rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-xs font-medium capitalize outline-none transition focus-visible:ring-2 focus-visible:ring-primary dark:border-neutral-800 dark:bg-neutral-900"
            value={theme}
            onChange={(event) => void handleThemeChange(event)}
          >
            {repinThemes.map((themeOption) => (
              <option key={themeOption} value={themeOption}>
                {themeOption} theme
              </option>
            ))}
          </select>
        </label>
        <Button
          className="h-8 flex-1 px-2.5 text-xs active:scale-[0.98]"
          disabled={!auth?.authenticated}
          onClick={() => void openDashboard()}
          size="sm"
          variant="outline"
        >
          <ExternalLink aria-hidden="true" className="size-3.5" />
          Dashboard
        </Button>
      </footer>
    </main>
  );
};
