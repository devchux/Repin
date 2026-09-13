import type { RepinSidebarMode } from "../types";

export interface SidebarSessionState {
  readonly mode: RepinSidebarMode;
  readonly open: boolean;
  readonly pinned: boolean;
  readonly requestId: string;
  readonly selectedText: string;
}

export type SidebarSessionMessage =
  | { readonly type: "repin.sidebar.session.get" }
  | {
      readonly type: "repin.sidebar.session.set";
      readonly state: SidebarSessionState;
    };

const STORAGE_PREFIX = "repin.sidebar.session.";

export const isSidebarSessionMessage = (
  message: unknown,
): message is SidebarSessionMessage => {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return false;
  }
  if (message.type === "repin.sidebar.session.get") return true;
  if (
    message.type !== "repin.sidebar.session.set" ||
    !("state" in message) ||
    !message.state ||
    typeof message.state !== "object"
  ) {
    return false;
  }
  const state = message.state;
  return (
    "mode" in state &&
    typeof state.mode === "string" &&
    "open" in state &&
    typeof state.open === "boolean" &&
    "pinned" in state &&
    typeof state.pinned === "boolean" &&
    "requestId" in state &&
    typeof state.requestId === "string" &&
    "selectedText" in state &&
    typeof state.selectedText === "string"
  );
};

export const sidebarSessionStorageKey = (tabId: number) =>
  `${STORAGE_PREFIX}${tabId}`;
