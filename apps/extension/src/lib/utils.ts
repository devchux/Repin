import { ToolbarPosition } from "@/types";
import { TOOLBAR_EDGE_OFFSET, TOOLBAR_VERTICAL_OFFSET } from "./constants";

export const getCurrentSelectionRange: () => Range | null = () => {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  if (!selection.toString().trim()) {
    return null;
  }

  return selection.getRangeAt(0);
};

export const isSameSelectionRange: (
  range: Range,
  dismissedRange: Range,
) => boolean = (range, dismissedRange) => {
  try {
    return (
      range.compareBoundaryPoints(Range.START_TO_START, dismissedRange) === 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, dismissedRange) === 0
    );
  } catch {
    return false;
  }
};

export const getSelectionToolbarPosition: (
  range: Range,
) => ToolbarPosition | null = (range) => {
  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    return null;
  }

  const selectionCenter = rect.left + rect.width / 2;
  const minimumLeft = Math.min(TOOLBAR_EDGE_OFFSET, window.innerWidth / 2);
  const maximumLeft = Math.max(minimumLeft, window.innerWidth - minimumLeft);
  const left = Math.min(Math.max(selectionCenter, minimumLeft), maximumLeft);

  return {
    left,
    top: rect.bottom + TOOLBAR_VERTICAL_OFFSET,
  };
};
