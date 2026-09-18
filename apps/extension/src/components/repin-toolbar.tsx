import { useState } from "react";
import { Highlighter, X } from "lucide-react";
import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
} from "@repo/contracts/highlight";

import { Button } from "@repo/ui/button";
import { getRepinThemeClass } from "@/lib/theme";
import type { RepinSidebarMode, ToolbarPosition } from "@/types";
import type { RepinTheme } from "@/types/content";
import { toolbarActions } from "@/lib/constants";

interface RepinToolbarProps {
  onClose: () => void;
  onModeSelect: (mode: RepinSidebarMode) => void;
  onHighlightSelect: (color: HighlightColor) => void;
  highlightSaving: boolean;
  highlightError: string | null;
  position: ToolbarPosition;
  theme: RepinTheme;
}

export const RepinToolbar = (props: RepinToolbarProps) => {
  const [showColors, setShowColors] = useState(false);
  return (
    <div
      className={`${getRepinThemeClass(props.theme)} fixed z-2147483647 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-neutral-200 bg-white/95 p-1.5 text-neutral-950 shadow-xl shadow-neutral-950/15 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 dark:text-neutral-50 dark:shadow-neutral-950/40`}
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
        aria-label="Highlight selected text"
        aria-expanded={showColors}
        className="size-10 cursor-pointer p-2"
        onClick={() => setShowColors((current) => !current)}
        size="icon"
        title="Highlight selected text"
        variant="ghost"
      >
        <Highlighter aria-hidden="true" />
      </Button>
      {showColors ? (
        <div
          className="absolute top-full left-1/2 mt-1 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-950"
          role="group"
          aria-label="Highlight color"
        >
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color}
              aria-label={`Highlight ${color}`}
              className="size-6 cursor-pointer rounded-full border border-neutral-900/25 disabled:cursor-wait disabled:opacity-50"
              disabled={props.highlightSaving}
              onClick={() => props.onHighlightSelect(color)}
              style={{ backgroundColor: color }}
              title={`Highlight ${color}`}
              type="button"
            />
          ))}
        </div>
      ) : null}
      {props.highlightError ? (
        <span className="max-w-36 text-xs text-red-600" role="alert">
          {props.highlightError}
        </span>
      ) : null}
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
};
