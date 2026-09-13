import type { BrowserCommandEnvelope } from "@repo/contracts/browser-session";
import {
  executeDebuggerCommand,
  isDebuggerTool,
} from "./debugger-command-handler";
import { consumeFiles } from "./file-handle-registry";

const clipboardContents = new Map<
  string,
  { text: string; expiresAt: number }
>();
const activeFrames = new Map<number, number>();

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
) => {
  const id = await targetTab(input);
  const frameId =
    input.frameId === undefined ? activeFrames.get(id) : Number(input.frameId);
  return browser.tabs.sendMessage(
    id,
    {
      type: "repin.browser.command",
      name,
      input,
    },
    frameId === undefined ? undefined : { frameId },
  );
};

export const executeBrowserCommand = async (
  command: BrowserCommandEnvelope["payload"],
): Promise<unknown> => {
  const input = command.input;
  if (command.name === "browser_press_key" && input.ref) {
    await contentCommand("browser_focus", input);
  }
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
      {
        const result = (await contentCommand(command.name, input)) as {
          url?: string;
        };
        if (!result.url)
          throw new Error("Referenced element has no downloadable URL");
        return {
          success: true,
          value: String(await browser.downloads.download({ url: result.url })),
        };
      }
    case "browser_copy": {
      const result = (await contentCommand(command.name, input)) as {
        content?: string;
      };
      const clipboardContentId = crypto.randomUUID();
      clipboardContents.set(clipboardContentId, {
        text: result.content ?? "",
        expiresAt: Date.now() + 15 * 60_000,
      });
      return { success: true, clipboardContentId };
    }
    case "browser_paste": {
      const id = String(input.clipboardContentId);
      const content = clipboardContents.get(id);
      if (!content || content.expiresAt <= Date.now())
        throw new Error("Clipboard content is unavailable or expired");
      clipboardContents.delete(id);
      return contentCommand(command.name, { ...input, text: content.text });
    }
    case "browser_upload_files": {
      const fileIds = input.fileIds as string[];
      return contentCommand(command.name, {
        ...input,
        files: consumeFiles(fileIds),
      });
    }
    case "browser_switch_frame": {
      const id = await targetTab(input);
      const frameId = Number(input.frameId);
      if (!Number.isInteger(frameId) || frameId < 0)
        throw new Error("Invalid frame ID");
      activeFrames.set(id, frameId);
      return { success: true, tabId: String(id), frameId: String(frameId) };
    }
    case "browser_get_frames": {
      const id = await targetTab(input);
      const frames = await browser.webNavigation.getAllFrames({ tabId: id });
      return {
        tabId: String(id),
        frames: (frames ?? []).map((frame) => ({
          id: String(frame.frameId),
          parentId:
            frame.parentFrameId < 0 ? undefined : String(frame.parentFrameId),
          url: frame.url,
          origin: new URL(frame.url).origin,
          accessible: true,
        })),
      };
    }
    case "browser_get_storage_summary": {
      const summary = (await contentCommand(command.name, input)) as Record<
        string,
        unknown
      >;
      const origin =
        typeof summary.origin === "string" ? summary.origin : undefined;
      const cookies = origin
        ? await browser.cookies.getAll({ url: origin })
        : [];
      return { ...summary, cookies: { count: cookies.length } };
    }
    case "browser_wait": {
      if (
        input.condition !== "url_changed" &&
        input.condition !== "navigation_completed"
      ) {
        return contentCommand(command.name, input);
      }
      const id = await targetTab(input);
      const initialUrl = String(
        input.url ?? (await browser.tabs.get(id)).url ?? "",
      );
      const startedAt = Date.now();
      const timeoutMs = Number(input.timeoutMs ?? 10_000);
      while (Date.now() - startedAt < timeoutMs) {
        const tab = await browser.tabs.get(id);
        const satisfied =
          input.condition === "url_changed"
            ? tab.url !== initialUrl
            : tab.status === "complete";
        if (satisfied) {
          return {
            success: true,
            tabId: String(id),
            condition: input.condition,
            elapsedMs: Date.now() - startedAt,
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(`Timed out waiting for ${String(input.condition)}`);
    }
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
