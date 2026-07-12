import { X } from "lucide-react";

import { Button } from "@repo/ui/button";
import type { RepinSidebarMode, ToolbarPosition } from "@/types";
import { toolbarActions } from "@/lib/constants";

interface RepinToolbarProps {
  onClose: () => void;
  onModeSelect: (mode: RepinSidebarMode) => void;
  position: ToolbarPosition;
}

export const RepinToolbar = (props: RepinToolbarProps) => {
  return (
    <div
      className="fixed z-2147483647 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-neutral-200 bg-white/95 p-1.5 shadow-xl shadow-neutral-950/15 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 dark:shadow-neutral-950/40"
      style={{
        left: props.position.left,
        top: props.position.top,
      }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {toolbarActions.map(({ icon: Icon, label, mode }) => (
        <Button
          aria-label={label}
          className="size-10 p-2 cursor-pointer"
          key={mode}
          size="icon"
          title={label}
          variant="ghost"
          onClick={() => props.onModeSelect(mode)}
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
