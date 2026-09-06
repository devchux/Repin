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
  REPIN_THEME_STORAGE_KEY,
} from "../lib/constants";
import { isRepinTheme } from "../lib/theme";

export default defineBackground(() => {
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

    void browser.tabs.query({}).then(async (tabs) => {
      await Promise.allSettled(
        tabs.flatMap((tab) =>
          tab.id === undefined
            ? []
            : [
                browser.tabs.sendMessage(tab.id, {
                  type: REPIN_THEME_CHANGED_MESSAGE,
                  theme: themeChange.newValue,
                }),
              ],
        ),
      );
    });
  });
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (isAssistantRunMessage(message)) {
      return handleAssistantRunMessage(message);
    }
    if (!message || typeof message !== "object" || !("type" in message)) return;
    if (message.type === "repin.auth.status") return getExtensionAuthState();
    if (message.type === "repin.auth.connect") return connectExtension();
    if (message.type === "repin.auth.disconnect") {
      stopBrowserSession();
      return disconnectExtension().then(() => ({ authenticated: false }));
    }
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
