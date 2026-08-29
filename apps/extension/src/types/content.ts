import type { AssistantCapability } from "@repo/contracts/assistant";

export const repinThemes = ["auto", "light", "dark"] as const;

export type RepinTheme = (typeof repinThemes)[number];

export interface ToolbarPosition {
  left: number;
  top: number;
}

export type RepinSidebarMode = AssistantCapability;
