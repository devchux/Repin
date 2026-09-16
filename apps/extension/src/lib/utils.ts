import { EncodedFile, ToolbarPosition } from "@/types";
import {
  REPIN_SIDEBAR_MAX_WIDTH,
  REPIN_SIDEBAR_VIEWPORT_GAP,
  TOOLBAR_EDGE_OFFSET,
  TOOLBAR_VERTICAL_OFFSET,
} from "./constants";

export const formatBrowserActionLabel = (value: string) =>
  value
    .replace(/^browser_/, "")
    .split("_")
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");

export const formatDisplayValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

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

export const getDockedSidebarWidth = () => {
  return Math.min(
    REPIN_SIDEBAR_MAX_WIDTH,
    Math.max(0, window.innerWidth - REPIN_SIDEBAR_VIEWPORT_GAP),
  );
};

export const encodeFileAsBase64 = async (file: File): Promise<EncodedFile> => {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error("File could not be read"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

  return {
    dataBase64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    name: file.name,
    type: file.type,
  };
};

