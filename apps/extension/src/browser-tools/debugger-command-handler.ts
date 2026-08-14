const DEBUGGER_TOOLS = new Set([
  "browser_key_down",
  "browser_key_up",
  "browser_insert_text",
  "browser_mouse_move",
  "browser_mouse_down",
  "browser_mouse_up",
  "browser_mouse_wheel",
  "browser_stop_loading",
  "browser_get_history",
  "browser_go_to_history_entry",
  "browser_handle_dialog",
  "browser_set_permission",
]);

interface DebuggerApi {
  attach(target: { tabId: number }, version: string): Promise<void>;
  detach(target: { tabId: number }): Promise<void>;
  sendCommand(
    target: { tabId: number },
    method: string,
    parameters?: Record<string, unknown>,
  ): Promise<unknown>;
}

const debuggerApi = (
  globalThis as unknown as {
    chrome?: { debugger?: DebuggerApi };
  }
).chrome?.debugger;

export const isDebuggerTool = (name: string) => DEBUGGER_TOOLS.has(name);

export const executeDebuggerCommand = async (
  name: string,
  input: Readonly<Record<string, unknown>>,
  tabId: number,
): Promise<unknown> => {
  const allowed = await browser.permissions.contains({
    permissions: ["debugger"],
  });
  if (!allowed || !debuggerApi)
    throw new Error("The optional debugger permission has not been granted");
  const target = { tabId };
  await debuggerApi.attach(target, "1.3");
  try {
    switch (name) {
      case "browser_key_down":
      case "browser_key_up":
        await debuggerApi.sendCommand(target, "Input.dispatchKeyEvent", {
          type: name === "browser_key_down" ? "keyDown" : "keyUp",
          key: input.key,
        });
        break;
      case "browser_insert_text":
        await debuggerApi.sendCommand(target, "Input.insertText", {
          text: input.text,
        });
        break;
      case "browser_mouse_move":
      case "browser_mouse_down":
      case "browser_mouse_up":
        await debuggerApi.sendCommand(target, "Input.dispatchMouseEvent", {
          type: name.replace("browser_mouse_", "mouse"),
          x: input.x,
          y: input.y,
          button: input.button ?? "none",
          clickCount: input.clickCount ?? 1,
        });
        break;
      case "browser_mouse_wheel":
        await debuggerApi.sendCommand(target, "Input.dispatchMouseEvent", {
          type: "mouseWheel",
          x: input.x ?? 0,
          y: input.y ?? 0,
          deltaX: input.deltaX ?? 0,
          deltaY: input.deltaY ?? 0,
        });
        break;
      case "browser_stop_loading":
        await debuggerApi.sendCommand(target, "Page.stopLoading");
        return { tabId: String(tabId), stopped: true };
      case "browser_get_history": {
        const history = (await debuggerApi.sendCommand(
          target,
          "Page.getNavigationHistory",
        )) as {
          currentIndex: number;
          entries: Array<{ id: number; url: string; title?: string }>;
        };
        return {
          tabId: String(tabId),
          entries: history.entries.map((entry, index) => ({
            id: String(entry.id),
            index,
            url: entry.url,
            title: entry.title,
            current: index === history.currentIndex,
          })),
        };
      }
      case "browser_go_to_history_entry":
        await debuggerApi.sendCommand(target, "Page.navigateToHistoryEntry", {
          entryId: Number(input.entryId),
        });
        return {
          tab: { id: String(tabId), windowId: "", active: true, pinned: false },
        };
      case "browser_handle_dialog":
        await debuggerApi.sendCommand(target, "Page.handleJavaScriptDialog", {
          accept: input.action === "accept",
          promptText: input.promptText,
        });
        return { success: true, tabId: String(tabId) };
      case "browser_set_permission":
        await debuggerApi.sendCommand(target, "Browser.setPermission", {
          permission: { name: input.permission },
          setting:
            input.setting === "allow"
              ? "granted"
              : input.setting === "deny"
                ? "denied"
                : "prompt",
        });
        return { success: true, tabId: String(tabId) };
    }
    return { success: true, tabId: String(tabId) };
  } finally {
    await debuggerApi.detach(target).catch(() => undefined);
  }
};
