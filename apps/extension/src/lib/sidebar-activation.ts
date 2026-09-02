import {
  REPIN_PROTOCOL_VERSION,
  type OpenExtensionSidebarMessage,
} from "@repo/contracts/messages";

const SUPPORTED_PAGE_PROTOCOLS = new Set(["http:", "https:"]);

const createOpenMessage = (): OpenExtensionSidebarMessage => ({
  protocolVersion: REPIN_PROTOCOL_VERSION,
  type: "repin.sidebar.open",
  payload: {
    mode: "summarize",
    requestId: crypto.randomUUID(),
  },
});

export const openSummarizeSidebar = async (tab: Browser.tabs.Tab) => {
  if (
    !tab.id ||
    !tab.url ||
    !SUPPORTED_PAGE_PROTOCOLS.has(new URL(tab.url).protocol)
  ) {
    throw new Error("Repin can only summarize regular webpages");
  }

  const message = createOpenMessage();
  try {
    await browser.tabs.sendMessage(tab.id, message);
  } catch {
    // Tabs opened before an install or update do not have the current content
    // script. Inject the packaged script once and then retry the action.
    await browser.scripting.executeScript({
      files: ["/content-scripts/content.js"],
      target: { tabId: tab.id },
    });
    await browser.tabs.sendMessage(tab.id, message);
  }
};
