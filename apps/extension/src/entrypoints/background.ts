import { startBrowserSession } from "../browser-tools/browser-session-client";

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    console.info("Repin extension installed");
  });
  const maintainBrowserSession = async () => {
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
