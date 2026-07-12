import {
  BookmarkPlus,
  FileText,
  Languages,
  MessageCircle,
  NotebookPen,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@repo/ui/button";

interface ToolbarPosition {
  left: number;
  top: number;
}

interface RepinToolbarProps {
  onChat: () => void;
  onClose: () => void;
  onExplain: () => void;
  onSavePage: () => void;
  onSummarize: () => void;
  onTakeNote: () => void;
  onTranslateText: () => void;
  position: ToolbarPosition;
}

const toolbarActions = [
  {
    label: "Explain selection",
    icon: Sparkles,
    action: "onExplain",
  },
  {
    label: "Summarize page",
    icon: FileText,
    action: "onSummarize",
  },
  {
    label: "Save page",
    icon: BookmarkPlus,
    action: "onSavePage",
  },
  {
    label: "Translate text",
    icon: Languages,
    action: "onTranslateText",
  },
  {
    label: "Take note",
    icon: NotebookPen,
    action: "onTakeNote",
  },
  {
    label: "Chat",
    icon: MessageCircle,
    action: "onChat",
  },
] as const;

export function RepinToolbar(props: RepinToolbarProps) {
  return (
    <div
      className="fixed z-2147483647 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-neutral-200 bg-white/95 p-1.5 shadow-xl shadow-neutral-950/15 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 dark:shadow-neutral-950/40"
      style={{
        left: props.position.left,
        top: props.position.top,
      }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {toolbarActions.map(({ action, icon: Icon, label }) => (
        <Button
          aria-label={label}
          className="size-10 p-2 cursor-pointer"
          key={action}
          size="icon"
          title={label}
          variant="ghost"
          onClick={props[action]}
        >
          <Icon aria-hidden="true" />
        </Button>
      ))}
      <div className="mx-0.5 h-6 w-px bg-neutral-200 dark:bg-neutral-800" />
      <Button
        aria-label="Remove Repin toolbar"
        className="size-7 cursor-pointer p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
        size="icon"
        title="Remove toolbar"
        variant="ghost"
        onClick={props.onClose}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}
