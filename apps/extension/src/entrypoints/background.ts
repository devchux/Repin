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

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    console.info("Repin extension installed");
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
