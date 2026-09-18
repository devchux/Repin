import type {
  PageContentBlock,
  PageContentBlockKind,
  PageObservation,
} from "@repo/contracts/context";

const MAX_BLOCKS = 500;
const MAX_BLOCK_TEXT_LENGTH = 10_000;
const MAX_OBSERVATION_TEXT_LENGTH = 100_000;
const BLOCK_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,pre,blockquote,table,form,nav";

interface ObservationCandidate {
  readonly element: Element;
  readonly sourceFrameUrl?: string;
}

const collectCandidates = (
  root: ParentNode,
  output: ObservationCandidate[],
  sourceFrameUrl?: string,
) => {
  for (const element of root.querySelectorAll(BLOCK_SELECTOR)) {
    output.push({ element, sourceFrameUrl });
  }
  for (const host of root.querySelectorAll("*")) {
    if (host.shadowRoot) {
      collectCandidates(host.shadowRoot, output, sourceFrameUrl);
    }
    if (host.tagName.toLowerCase() === "iframe") {
      try {
        const frameDocument = (host as HTMLIFrameElement).contentDocument;
        if (frameDocument?.body) {
          collectCandidates(
            frameDocument.body,
            output,
            frameDocument.location.href,
          );
        }
      } catch {
        // Cross-origin frame content is intentionally inaccessible.
      }
    }
  }
};

const kindFor = (element: Element): PageContentBlockKind => {
  const tag = element.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tag)) return "heading";
  if (tag === "p") return "paragraph";
  if (tag === "li") return "list";
  if (tag === "table") return "table";
  if (tag === "pre") return "code";
  if (tag === "blockquote") return "quote";
  if (tag === "form") return "form";
  if (tag === "nav") return "navigation";
  return "other";
};

const normalizedText = (element: Element) =>
  ((element as HTMLElement).innerText ?? element.textContent ?? "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const visible = (element: Element) => {
  const htmlElement = element as HTMLElement;
  const style =
    element.ownerDocument.defaultView?.getComputedStyle(htmlElement) ??
    getComputedStyle(htmlElement);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    htmlElement.getClientRects().length > 0
  );
};

const inViewport = (element: Element) => {
  const bounds = element.getBoundingClientRect();
  const view = element.ownerDocument.defaultView ?? window;
  return (
    bounds.bottom > 0 &&
    bounds.right > 0 &&
    bounds.top < view.innerHeight &&
    bounds.left < view.innerWidth
  );
};

export const extractPageObservation = (
  documentRevision: string = crypto.randomUUID(),
): PageObservation => {
  const root =
    document.querySelector<HTMLElement>("main, article, [role='main']") ??
    document.body;
  const candidates: ObservationCandidate[] = [];
  collectCandidates(root, candidates);
  const headings: string[] = [];
  const blocks: PageContentBlock[] = [];
  let totalTextLength = 0;
  let sourceTruncated = candidates.length > MAX_BLOCKS;

  for (const candidate of candidates) {
    const { element, sourceFrameUrl } = candidate;
    if (blocks.length >= MAX_BLOCKS) break;
    const containingSemanticElement =
      element.parentElement?.closest("table, form, nav");
    if (containingSemanticElement) continue;
    const kind = kindFor(element);
    const isVisible = visible(element);
    if (!isVisible) continue;

    const text = normalizedText(element).slice(0, MAX_BLOCK_TEXT_LENGTH);
    if (!text) continue;

    if (kind === "heading") {
      const level = Number(element.tagName.slice(1));
      headings.splice(level - 1);
      headings[level - 1] = text;
    }

    const remaining = MAX_OBSERVATION_TEXT_LENGTH - totalTextLength;
    if (remaining <= 0) {
      sourceTruncated = true;
      break;
    }
    const boundedText = text.slice(0, remaining);
    sourceTruncated ||= boundedText.length < text.length;
    blocks.push({
      id: `b${blocks.length + 1}`,
      kind,
      text: boundedText,
      headingPath: headings.filter(Boolean),
      visible: true,
      inViewport: inViewport(element),
      sourceFrameUrl,
    });
    totalTextLength += boundedText.length;
  }

  return {
    schemaVersion: 1,
    observationId: crypto.randomUUID(),
    tabId: "",
    documentRevision,
    capturedAt: new Date().toISOString(),
    url: location.href,
    title: document.title.trim() || location.hostname,
    language: document.documentElement.lang || undefined,
    blocks,
    truncated: sourceTruncated,
  };
};
