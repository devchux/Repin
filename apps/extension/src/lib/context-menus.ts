import type { AssistantCapability } from "@repo/contracts/assistant";
import { openPageSidebar } from "./sidebar-activation";
import { getExtensionWebUrl } from "../auth/extension-auth-client";

const REPIN_MENU_ID = "repin.page-actions";
const OPEN_DASHBOARD_MENU_ID = "repin.open-dashboard";
const PAGE_ACTIONS = [
  {
    id: "repin.summarize-page",
    title: "Summarize page",
    mode: "summarize",
  },
  { id: "repin.save-page", title: "Save page", mode: "save" },
  { id: "repin.take-page-note", title: "Take page note", mode: "note" },
  { id: "repin.chat-about-page", title: "Chat about page", mode: "chat" },
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  mode: AssistantCapability;
}>;

export const registerContextMenus = async () => {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    contexts: ["page"],
    id: REPIN_MENU_ID,
    title: "Repin",
  });
  for (const action of PAGE_ACTIONS) {
    browser.contextMenus.create({
      contexts: ["page"],
      id: action.id,
      parentId: REPIN_MENU_ID,
      title: action.title,
    });
  }
  browser.contextMenus.create({
    contexts: ["page"],
    id: OPEN_DASHBOARD_MENU_ID,
    parentId: REPIN_MENU_ID,
    title: "Open dashboard",
  });
};

export const handleContextMenuClick = async (
  info: Browser.contextMenus.OnClickData,
  tab?: Browser.tabs.Tab,
) => {
  if (info.menuItemId === OPEN_DASHBOARD_MENU_ID) {
    await browser.tabs.create({ url: await getExtensionWebUrl() });
    return;
  }
  const action = PAGE_ACTIONS.find(({ id }) => id === info.menuItemId);
  if (!action || !tab) return;
  try {
    await openPageSidebar(tab, action.mode);
  } catch (error) {
    console.warn(`Repin could not open the ${action.mode} sidebar`, error);
  }
};
