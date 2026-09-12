import {
  startBrowserSession,
  stopBrowserSession,
} from "../browser-tools/browser-session-client";
import {
  connectExtension,
  disconnectExtension,
  getExtensionAuthState,
  initializeExtensionAuth,
} from "../auth/extension-auth-client";
import {
  handleAssistantRunMessage,
  isAssistantRunMessage,
} from "../assistant/background-run-handler";
import {
  handleContextMenuClick,
  registerContextMenus,
} from "../lib/context-menus";
import {
  REPIN_THEME_CHANGED_MESSAGE,
  REPIN_THEME_GET_MESSAGE,
  REPIN_THEME_STORAGE_KEY,
} from "../lib/constants";
import { getStoredRepinTheme, isRepinTheme } from "../lib/theme";
import { stageFiles } from "../browser-tools/file-handle-registry";
import { registerEventStreamManager } from "../assistant/background-event-stream-manager";
import {
  isSidebarSessionMessage,
  sidebarSessionStorageKey,
} from "../lib/sidebar-session";

export default defineBackground(() => {
  registerEventStreamManager();
  browser.runtime.onInstalled.addListener(() => {
    console.info("Repin extension installed");
    void registerContextMenus();
  });
  browser.runtime.onStartup.addListener(() => void registerContextMenus());
  browser.contextMenus.onClicked.addListener((info, tab) => {
    void handleContextMenuClick(info, tab);
  });
  browser.storage.onChanged.addListener((changes, areaName) => {
    const themeChange = changes[REPIN_THEME_STORAGE_KEY];

    if (areaName !== "local" || !isRepinTheme(themeChange?.newValue)) {
      return;
    }

    const message = {
      type: REPIN_THEME_CHANGED_MESSAGE,
      theme: themeChange.newValue,
    };

    void browser.tabs.query({}).then(async (tabs) => {
      await Promise.allSettled([
        browser.runtime.sendMessage(message),
        ...tabs.flatMap((tab) =>
          tab.id === undefined
            ? []
            : [browser.tabs.sendMessage(tab.id, message)],
        ),
      ]);
    });
  });
  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (isSidebarSessionMessage(message)) {
      const tabId = sender.tab?.id;
      if (tabId === undefined) return;
      const key = sidebarSessionStorageKey(tabId);
      if (message.type === "repin.sidebar.session.get") {
        return browser.storage.session
          .get(key)
          .then((stored) => stored[key] ?? null);
      }
      return browser.storage.session.set({ [key]: message.state });
    }
    if (isAssistantRunMessage(message)) {
      return handleAssistantRunMessage(message);
    }
    if (!message || typeof message !== "object" || !("type" in message)) return;
    if (message.type === "repin.files.stage" && "payload" in message) {
      const payload = message.payload as {
        fileIds: string[];
        files: Array<{ dataBase64: string; name: string; type: string }>;
      };
      stageFiles(payload.fileIds, payload.files);
      return { staged: true };
    }
    if (message.type === REPIN_THEME_GET_MESSAGE) return getStoredRepinTheme();
    if (message.type === "repin.auth.status") return getExtensionAuthState();
    if (message.type === "repin.auth.connect") return connectExtension();
    if (message.type === "repin.auth.disconnect") {
      stopBrowserSession();
      return disconnectExtension().then(() => ({ authenticated: false }));
    }
  });
  browser.tabs.onRemoved.addListener((tabId) => {
    void browser.storage.session
      .remove(sidebarSessionStorageKey(tabId))
      .catch((error: unknown) =>
        console.warn("Repin could not clear closed-tab sidebar state", {
          error,
          tabId,
        }),
      );
  });
  const maintainBrowserSession = async () => {
    await initializeExtensionAuth();
    while (true) {
      try {
        await startBrowserSession();
      } catch (error) {
        console.warn("Repin browser session is offline", error);
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  };
  void maintainBrowserSession();
});
