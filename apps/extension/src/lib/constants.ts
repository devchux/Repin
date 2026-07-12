import { RepinSidebarMode } from "@/types/content";
import {
  BookmarkPlus,
  FileText,
  Languages,
  MessageCircle,
  NotebookPen,
  Sparkles,
} from "lucide-react";

export const TOOLBAR_VERTICAL_OFFSET = 8;
export const TOOLBAR_EDGE_OFFSET = 176;
export const REPIN_SIDEBAR_MAX_WIDTH = 420;
export const REPIN_SIDEBAR_VIEWPORT_GAP = 24;
export const REPIN_THEME_STORAGE_KEY = "repin:theme";
export const modeConfig = {
  summarize: {
    title: "Summarize",
    description: "Create a concise summary of the selected passage.",
    icon: FileText,
    emptyState: "Select text and ask Repin to summarize the important points.",
    prompt: "Ask follow-up",
    primaryAction: "Save summary",
  },
  explain: {
    title: "Explain",
    description: "Clarify meaning, context, and implications.",
    icon: Sparkles,
    emptyState: "Repin will explain the selected text in plain language.",
    prompt: "Ask for more context",
    primaryAction: "Save explanation",
  },
  translate: {
    title: "Translate",
    description: "Translate the selected text into another language.",
    icon: Languages,
    emptyState: "Choose a target language and translate the selected text.",
    prompt: "Ask about this translation",
    primaryAction: "Save translation",
  },
  note: {
    title: "Take note",
    description: "Capture a note anchored to the selected text.",
    icon: NotebookPen,
    emptyState: "Write a note connected to this page and selection.",
    prompt: "Add detail",
    primaryAction: "Save note",
  },
  save: {
    title: "Save page",
    description: "Save this page with the selected text as context.",
    icon: BookmarkPlus,
    emptyState: "Save the page, selected text, and any extra context.",
    prompt: "Add context",
    primaryAction: "Save pin",
  },
  chat: {
    title: "Chat",
    description: "Ask Repin anything about the selected text.",
    icon: MessageCircle,
    emptyState: "Start a focused chat about this selection.",
    prompt: "Ask Repin",
    primaryAction: "Save chat",
  },
} as const satisfies Record<
  RepinSidebarMode,
  {
    title: string;
    description: string;
    icon: typeof Sparkles;
    emptyState: string;
    prompt: string;
    primaryAction: string;
  }
>;
export const toolbarActions = [
  {
    label: "Explain selection",
    icon: Sparkles,
    mode: "explain",
  },
  {
    label: "Summarize page",
    icon: FileText,
    mode: "summarize",
  },
  {
    label: "Save page",
    icon: BookmarkPlus,
    mode: "save",
  },
  {
    label: "Translate text",
    icon: Languages,
    mode: "translate",
  },
  {
    label: "Take note",
    icon: NotebookPen,
    mode: "note",
  },
  {
    label: "Chat",
    icon: MessageCircle,
    mode: "chat",
  },
] as const satisfies ReadonlyArray<{
  label: string;
  icon: typeof Sparkles;
  mode: RepinSidebarMode;
}>;
