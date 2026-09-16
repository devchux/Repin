import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
  type SavedHighlight,
} from "@repo/contracts/highlight";
import { indexPageText, locateHighlightRange } from "./page-highlight-ranges";

const STYLE_ID = "repin-saved-highlight-styles";
const REGISTRY_PREFIX = "repin-saved-";

const backgrounds: Record<HighlightColor, string> = {
  yellow: "rgba(250, 204, 21, 0.55)",
  orange: "rgba(251, 146, 60, 0.5)",
  blue: "rgba(96, 165, 250, 0.5)",
  green: "rgba(74, 222, 128, 0.5)",
  pink: "rgba(244, 114, 182, 0.5)",
};

const ensureStyles = (): void => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = HIGHLIGHT_COLORS.map(
    (color) =>
      `::highlight(${REGISTRY_PREFIX}${color}) { background-color: ${backgrounds[color]}; }`,
  ).join("\n");
  (document.head || document.documentElement).append(style);
};

export class PageHighlightRenderer {
  readonly supported = Boolean(CSS.highlights && globalThis.Highlight);

  render(highlights: readonly SavedHighlight[]): number {
    if (!this.supported || !document.body) return 0;
    ensureStyles();
    const index = indexPageText(document.body);
    const ranges = new Map<HighlightColor, Range[]>();
    let matched = 0;
    for (const highlight of highlights) {
      const range = locateHighlightRange(index, highlight);
      if (!range || !HIGHLIGHT_COLORS.includes(highlight.color)) continue;
      const entries = ranges.get(highlight.color) ?? [];
      entries.push(range);
      ranges.set(highlight.color, entries);
      matched += 1;
    }
    for (const color of HIGHLIGHT_COLORS) {
      const key = `${REGISTRY_PREFIX}${color}`;
      const entries = ranges.get(color);
      if (entries?.length) {
        CSS.highlights.set(key, new Highlight(...entries));
      } else {
        CSS.highlights.delete(key);
      }
    }
    return matched;
  }

  clear(): void {
    if (!this.supported) return;
    for (const color of HIGHLIGHT_COLORS) {
      CSS.highlights.delete(`${REGISTRY_PREFIX}${color}`);
    }
  }
}
