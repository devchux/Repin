import type { AssistantCapability } from "@repo/contracts/assistant";

export const PAGE_ACTIONS = [
  {
    id: "repin.summarize-page",
    label: "Summarize",
    menuTitle: "Summarize page",
    mode: "summarize",
  },
  {
    id: "repin.save-page",
    label: "Repin bookmark",
    menuTitle: "Save Repin bookmark",
    mode: "save",
  },
  {
    id: "repin.take-page-note",
    label: "Take note",
    menuTitle: "Take page note",
    mode: "note",
  },
  {
    id: "repin.chat-about-page",
    label: "Page chat",
    menuTitle: "Chat about page",
    mode: "chat",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  menuTitle: string;
  mode: AssistantCapability;
}>;
