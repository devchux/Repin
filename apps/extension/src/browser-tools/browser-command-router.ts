import type { BrowserCommandEnvelope } from "@repo/contracts/browser-session";
import {
  executeDebuggerCommand,
  isDebuggerTool,
} from "./debugger-command-handler";

const tabId = (value: unknown): number | undefined =>
  typeof value === "string" && value ? Number(value) : undefined;

const activeTab = async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active browser tab");
  return tab.id;
};

const targetTab = async (input: Readonly<Record<string, unknown>>) =>
  tabId(input.tabId) ?? activeTab();

const normalizeTab = (tab: Browser.tabs.Tab) => ({
  id: String(tab.id),
  windowId: String(tab.windowId),
  url: tab.url,
  title: tab.title,
  active: tab.active,
  pinned: tab.pinned,
});

const requireTab = (tab: Browser.tabs.Tab | undefined) => {
  if (!tab) throw new Error("Browser tab operation returned no tab");
  return tab;
};

const contentCommand = async (
  name: string,
  input: Readonly<Record<string, unknown>>,
) =>
  browser.tabs.sendMessage(await targetTab(input), {
    type: "repin.browser.command",
    name,
    input,
  });

export const executeBrowserCommand = async (
  command: BrowserCommandEnvelope["payload"],
): Promise<unknown> => {
  const input = command.input;
  if (isDebuggerTool(command.name)) {
    return executeDebuggerCommand(command.name, input, await targetTab(input));
  }
  switch (command.name) {
    case "browser_list_tabs":
      return (await browser.tabs.query({})).map(normalizeTab);
    case "browser_open_tab":
      return normalizeTab(
        await browser.tabs.create({
          url: input.url as string | undefined,
          active: input.active as boolean | undefined,
        }),
      );
    case "browser_activate_tab":
      return normalizeTab(
        requireTab(
          await browser.tabs.update(tabId(input.tabId)!, { active: true }),
        ),
      );
    case "browser_close_tab": {
      const id = tabId(input.tabId)!;
      await browser.tabs.remove(id);
      return { tabId: String(id), closed: true };
    }
    case "browser_navigate":
      return {
        tab: normalizeTab(
          requireTab(
            await browser.tabs.update(await targetTab(input), {
              url: input.url as string,
            }),
          ),
        ),
      };
    case "browser_reload_page": {
      const id = await targetTab(input);
      await browser.tabs.reload(id, {
        bypassCache: input.bypassCache as boolean | undefined,
      });
      return { tab: normalizeTab(await browser.tabs.get(id)) };
    }
    case "browser_go_back": {
      const id = await targetTab(input);
      await browser.tabs.goBack(id);
      return { tab: normalizeTab(await browser.tabs.get(id)) };
    }
    case "browser_go_forward": {
      const id = await targetTab(input);
      await browser.tabs.goForward(id);
      return { tab: normalizeTab(await browser.tabs.get(id)) };
    }
    case "browser_duplicate_tab":
      return normalizeTab(
        requireTab(await browser.tabs.duplicate(tabId(input.tabId)!)),
      );
    case "browser_move_tab": {
      const moved = await browser.tabs.move(tabId(input.tabId)!, {
        index: input.index as number,
        windowId: tabId(input.windowId),
      });
      return normalizeTab(Array.isArray(moved) ? moved[0]! : moved);
    }
    case "browser_pin_tab":
      return normalizeTab(
        requireTab(
          await browser.tabs.update(tabId(input.tabId)!, {
            pinned: input.pinned as boolean,
          }),
        ),
      );
    case "browser_list_windows":
      return Promise.all(
        (await browser.windows.getAll({ populate: true })).map(
          async (window) => ({
            id: String(window.id),
            focused: window.focused,
            incognito: window.incognito,
            state: window.state,
            tabs: (window.tabs ?? []).map(normalizeTab),
          }),
        ),
      );
    case "browser_open_window": {
      const window = await browser.windows.create({
        url: input.urls as string[] | undefined,
        focused: input.focused as boolean | undefined,
        incognito: input.incognito as boolean | undefined,
        state: input.state as
          | "normal"
          | "minimized"
          | "maximized"
          | "fullscreen"
          | undefined,
      });
      if (!window)
        throw new Error("Browser window operation returned no window");
      return {
        id: String(window.id),
        focused: window.focused,
        incognito: window.incognito,
        state: window.state,
        tabs: (window.tabs ?? []).map(normalizeTab),
      };
    }
    case "browser_close_window":
      await browser.windows.remove(tabId(input.windowId)!);
      return { windowId: input.windowId, closed: true };
    case "browser_reopen_closed_tab": {
      const restored = await browser.sessions.restore(
        input.sessionId as string | undefined,
      );
      if (!restored?.tab)
        throw new Error("No recently closed tab was restored");
      return normalizeTab(restored.tab);
    }
    case "browser_get_downloads":
      return {
        downloads: (
          await browser.downloads.search({ limit: Number(input.limit ?? 100) })
        ).map((download) => ({
          id: String(download.id),
          filename: download.filename,
          sourceUrl: download.url,
          status:
            download.state === "in_progress"
              ? "in_progress"
              : download.state === "complete"
                ? "completed"
                : "interrupted",
          bytesReceived: download.bytesReceived,
          totalBytes:
            download.totalBytes >= 0 ? download.totalBytes : undefined,
          startedAt: download.startTime,
          completedAt: download.endTime,
        })),
        truncated: false,
      };
    case "browser_download":
      if (typeof input.url === "string") {
        return {
          success: true,
          tabId: String(await targetTab(input)),
          value: String(await browser.downloads.download({ url: input.url })),
        };
      }
      return contentCommand(command.name, input);
    case "browser_get_screenshot": {
      const tab = await browser.tabs.get(await targetTab(input));
      const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
        format: (input.format as "png" | "jpeg" | undefined) ?? "png",
        quality: input.quality as number | undefined,
      });
      const [, dataBase64 = ""] = dataUrl.split(",", 2);
      return {
        tabId: String(await targetTab(input)),
        url: "",
        capturedAt: new Date().toISOString(),
        mimeType: input.format === "jpeg" ? "image/jpeg" : "image/png",
        dataBase64,
        width: 0,
        height: 0,
        fullPage: false,
      };
    }
    default:
      return contentCommand(command.name, input);
  }
};
