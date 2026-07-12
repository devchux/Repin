import { BookmarkPlus, Highlighter, PanelRightOpen } from "lucide-react";

import { Button } from "@repo/ui/button";

interface RepinToolbarProps {
  onAnnotate: () => void;
  onSave: () => void;
}

export function RepinToolbar({ onAnnotate, onSave }: RepinToolbarProps) {
  return (
    <div className="fixed right-4 top-4 z-2147483647 flex items-center gap-1 rounded-lg border border-neutral-200 bg-white/95 p-1.5 shadow-xl shadow-neutral-950/15 backdrop-blur">
      <Button
        aria-label="Save page"
        className="size-9"
        size="icon"
        title="Save page"
        variant="ghost"
        onClick={onSave}
      >
        <BookmarkPlus aria-hidden="true" />
      </Button>
      <Button
        aria-label="Annotate page"
        className="size-9"
        size="icon"
        title="Annotate page"
        variant="ghost"
        onClick={onAnnotate}
      >
        <Highlighter aria-hidden="true" />
      </Button>
      <Button
        aria-label="Open Repin sidebar"
        className="size-9"
        size="icon"
        title="Open Repin sidebar"
        onClick={onSave}
      >
        <PanelRightOpen aria-hidden="true" />
      </Button>
    </div>
  );
}
