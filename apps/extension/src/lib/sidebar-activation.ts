import {
  REPIN_PROTOCOL_VERSION,
  type OpenExtensionSidebarMessage,
} from "@repo/contracts/messages";
import type { AssistantCapability } from "@repo/contracts/assistant";

const SUPPORTED_PAGE_PROTOCOLS = new Set(["http:", "https:"]);

const createOpenMessage = (
  mode: AssistantCapability,
): OpenExtensionSidebarMessage => ({
  protocolVersion: REPIN_PROTOCOL_VERSION,
  type: "repin.sidebar.open",
  payload: {
    mode,
    requestId: crypto.randomUUID(),
  },
});

export const openPageSidebar = async (
  tab: Browser.tabs.Tab,
  mode: AssistantCapability,
) => {
  if (
    !tab.id ||
    !tab.url ||
    !SUPPORTED_PAGE_PROTOCOLS.has(new URL(tab.url).protocol)
  ) {
    throw new Error("Repin can only open page actions on regular webpages");
  }

  const message = createOpenMessage(mode);
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
