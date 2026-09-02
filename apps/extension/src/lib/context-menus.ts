import { openSummarizeSidebar } from "./sidebar-activation";
import { getExtensionWebUrl } from "../auth/extension-auth-client";

const REPIN_MENU_ID = "repin.page-actions";
const SUMMARIZE_PAGE_MENU_ID = "repin.summarize-page";
const OPEN_DASHBOARD_MENU_ID = "repin.open-dashboard";

export const registerContextMenus = async () => {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    contexts: ["page"],
    id: REPIN_MENU_ID,
    title: "Repin",
  });
  browser.contextMenus.create({
    contexts: ["page"],
    id: SUMMARIZE_PAGE_MENU_ID,
    parentId: REPIN_MENU_ID,
    title: "Summarize page",
  });
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
  if (info.menuItemId !== SUMMARIZE_PAGE_MENU_ID || !tab) return;
  try {
    await openSummarizeSidebar(tab);
  } catch (error) {
    console.warn("Repin could not open the summarize sidebar", error);
  }
};
