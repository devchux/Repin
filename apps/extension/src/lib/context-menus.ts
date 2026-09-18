import { openPageSidebar } from "./sidebar-activation";
import { getExtensionWebUrl } from "../auth/extension-auth-client";
import { PAGE_ACTIONS } from "./page/page-actions";

const REPIN_MENU_ID = "repin.page-actions";
const OPEN_DASHBOARD_MENU_ID = "repin.open-dashboard";
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
      title: action.menuTitle,
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
