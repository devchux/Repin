import type { SavedHighlight } from "@repo/contracts/highlight";

interface TextSegment {
  readonly node: Text;
  readonly start: number;
  readonly end: number;
}

export interface PageTextIndex {
  readonly text: string;
  readonly segments: readonly TextSegment[];
}

const excludedText = (node: Text): boolean => {
  const parent = node.parentElement;
  return (
    !parent ||
    Boolean(
      parent.closest(
        "script, style, noscript, template, textarea, [contenteditable='true']",
      ),
    )
  );
};

export function indexPageText(root: HTMLElement): PageTextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const segments: TextSegment[] = [];
  const parts: string[] = [];
  let length = 0;
  let current: Node | null;
  while (
    (current = walker.nextNode()) &&
    length < 2_000_000 &&
    segments.length < 20_000
  ) {
    const node = current as Text;
    if (excludedText(node) || !node.data) continue;
    const value = node.data.slice(0, 2_000_000 - length);
    segments.push({ node, start: length, end: length + value.length });
    parts.push(value);
    length += value.length;
  }
  return { text: parts.join(""), segments };
}

const offsetForBoundary = (
  index: PageTextIndex,
  container: Node,
  offset: number,
): number | null => {
  if (container.nodeType !== Node.TEXT_NODE) return null;
  const segment = index.segments.find(({ node }) => node === container);
  return segment ? Math.min(segment.end, segment.start + offset) : null;
};

export function selectionQuote(
  index: PageTextIndex,
  range: Range,
): { quote: string; prefix?: string; suffix?: string } {
  const start = offsetForBoundary(
    index,
    range.startContainer,
    range.startOffset,
  );
  const end = offsetForBoundary(index, range.endContainer, range.endOffset);
  if (start === null || end === null || end <= start) {
    return { quote: range.toString() };
  }
  return {
    quote: index.text.slice(start, end),
    prefix: index.text.slice(Math.max(0, start - 150), start),
    suffix: index.text.slice(end, end + 150),
  };
}

const boundaryAt = (
  index: PageTextIndex,
  offset: number,
): { node: Text; offset: number } | null => {
  const segment = index.segments.find(
    ({ start, end }) => offset >= start && offset < end,
  );
  if (segment) return { node: segment.node, offset: offset - segment.start };
  if (offset === index.text.length && index.segments.length) {
    const last = index.segments[index.segments.length - 1];
    return { node: last.node, offset: last.end - last.start };
  }
  return null;
};

export function locateHighlightRange(
  index: PageTextIndex,
  highlight: Pick<SavedHighlight, "quote" | "prefix" | "suffix">,
): Range | null {
  if (!highlight.quote) return null;
  let offset = -1;
  while ((offset = index.text.indexOf(highlight.quote, offset + 1)) >= 0) {
    const end = offset + highlight.quote.length;
    if (
      highlight.prefix &&
      !index.text.slice(0, offset).endsWith(highlight.prefix)
    )
      continue;
    if (highlight.suffix && !index.text.slice(end).startsWith(highlight.suffix))
      continue;
    const startBoundary = boundaryAt(index, offset);
    const endBoundary = boundaryAt(index, end);
    if (!startBoundary || !endBoundary) continue;
    const range = document.createRange();
    range.setStart(startBoundary.node, startBoundary.offset);
    range.setEnd(endBoundary.node, endBoundary.offset);
    return range;
  }
  return null;
}
