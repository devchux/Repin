import { RepinSidebarMode } from "@/types/content";
import {
  BookmarkPlus,
  FileText,
  Languages,
  MessageCircle,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import { AssistantRunStatusCopy } from "./assistant-run";
import { AiAssistantCapability } from "@repo/contracts";

export const TOOLBAR_VERTICAL_OFFSET = 8;
export const TOOLBAR_EDGE_OFFSET = 176;
export const REPIN_SIDEBAR_MAX_WIDTH = 420;
export const REPIN_SIDEBAR_VIEWPORT_GAP = 24;
export const REPIN_THEME_STORAGE_KEY = "repin:theme";
export const REPIN_THEME_GET_MESSAGE = "repin.theme.get";
export const REPIN_THEME_CHANGED_MESSAGE = "repin.theme.changed";
export const BROWSER_TOOL_LABELS: Readonly<Record<string, string>> = {
  browser_close_tab: "Close a browser tab",
  browser_close_window: "Close a browser window",
  browser_download: "Download a file",
  browser_execute_script: "Run a script on this page",
  browser_paste: "Paste into this page",
  browser_set_permission: "Change a browser permission",
  browser_submit_form: "Submit a form",
  browser_upload_files: "Upload files",
};
export const modeConfig = {
  summarize: {
    title: "Summarize",
    description: "Create a concise summary of the current page.",
    icon: FileText,
    emptyState: "Repin will identify the page's important points.",
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
    description: "Capture a note about this page or the selected text.",
    icon: NotebookPen,
    emptyState: "Write a note connected to this page and optional selection.",
    prompt: "Add detail",
    primaryAction: "Save note",
  },
  save: {
    title: "Save page",
    description: "Save this page with optional selected text as context.",
    icon: BookmarkPlus,
    emptyState: "Save the page with any selection or extra context.",
    prompt: "Add context",
    primaryAction: "Save pin",
  },
  chat: {
    title: "Chat",
    description: "Ask Repin anything about this page or the selected text.",
    icon: MessageCircle,
    emptyState: "Start a focused chat about this page or selection.",
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
    label: "Explain",
    icon: Sparkles,
    mode: "explain",
  },
  {
    label: "Summarize",
    icon: FileText,
    mode: "summarize",
  },
  {
    label: "Save page",
    icon: BookmarkPlus,
    mode: "save",
  },
  {
    label: "Translate",
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

export const capabilityCopy = {
  explain: {
    cancelled: "Explanation cancelled",
    completed: "Explanation complete",
    failed: "Explanation failed",
    preparing: "Preparing explanation",
    resultTitle: "Explanation",
    runningPage: "Explaining page",
    runningSelection: "Explaining selection",
  },
  summarize: {
    cancelled: "Summary cancelled",
    completed: "Summary complete",
    failed: "Summary failed",
    preparing: "Preparing summary",
    resultTitle: "Summary",
    runningPage: "Summarizing page",
    runningSelection: "Summarizing selection",
  },
  translate: {
    cancelled: "Translation cancelled",
    completed: "Translation complete",
    failed: "Translation failed",
    preparing: "Preparing translation",
    resultTitle: "Translation",
    runningPage: "Translating page",
    runningSelection: "Translating selection",
  },
  chat: {
    cancelled: "Response cancelled",
    completed: "Response complete",
    failed: "Response failed",
    preparing: "Preparing response",
    resultTitle: "Response",
    runningPage: "Reading page",
    runningSelection: "Reading selection",
  },
} as const satisfies Record<AiAssistantCapability, AssistantRunStatusCopy>;

export const TARGET_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Arabic",
  "Chinese (Simplified)",
  "Japanese",
  "Korean",
  "Hindi",
] as const;

export const ASSISTANT_RUN_MESSAGE_TYPES = [
  "assistant.run.create",
  "assistant.run.get",
  "assistant.run.cancel",
  "assistant.run.resume",
  "assistant.run.approvals.get",
  "assistant.run.approval.approve",
  "assistant.run.approval.deny",
  "assistant.conversation.get",
  "assistant.conversation.message.create",
  "task.dispatch",
  "workflow.instance.get",
  "workflow.instance.cancel",
];
