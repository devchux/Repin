import type {
  PageContentBlock,
  PageContentBlockKind,
  PageInteractiveElement,
  PageInteractiveElementKind,
  PageObservation,
} from "@repo/contracts/context";

const MAX_BLOCKS = 500;
const MAX_BLOCK_TEXT_LENGTH = 10_000;
const MAX_OBSERVATION_TEXT_LENGTH = 100_000;
const MAX_INTERACTIVE_ELEMENTS = 500;
const MAX_CONTROL_TEXT_LENGTH = 1_000;
const BLOCK_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,pre,blockquote,table,form,nav";
const INTERACTIVE_SELECTOR =
  "a[href],button,input,select,textarea,[role='button'],[role='link'],[role='checkbox'],[role='radio'],[role='switch'],[role='combobox'],[role='textbox'],[role='searchbox'],[role='tab'],[role='menuitem'],[role='option'],[role='slider'],[role='spinbutton'],[contenteditable='true']";

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

const collectInteractiveCandidates = (
  root: ParentNode,
  output: ObservationCandidate[],
  sourceFrameUrl?: string,
) => {
  for (const element of root.querySelectorAll(INTERACTIVE_SELECTOR)) {
    output.push({ element, sourceFrameUrl });
  }
  for (const host of root.querySelectorAll("*")) {
    if (host.shadowRoot) {
      collectInteractiveCandidates(host.shadowRoot, output, sourceFrameUrl);
    }
    if (host.tagName.toLowerCase() === "iframe") {
      try {
        const frameDocument = (host as HTMLIFrameElement).contentDocument;
        if (frameDocument?.body) {
          collectInteractiveCandidates(
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

const blockStructure = (element: Element, kind: PageContentBlockKind) => {
  if (kind === "table") {
    const rows = Array.from(element.querySelectorAll("tr"));
    const headers = Array.from(element.querySelectorAll("th"))
      .map((header) => normalizedText(header).slice(0, 500))
      .filter(Boolean)
      .slice(0, 50);
    return {
      rowCount: rows.length,
      columnCount: Math.max(
        0,
        ...rows.map((row) => row.querySelectorAll("th,td").length),
      ),
      headers,
    };
  }
  if (kind === "list") {
    const list = element.closest("ul,ol");
    return list
      ? { itemCount: list.querySelectorAll(":scope > li").length }
      : undefined;
  }
  if (kind === "form") {
    return { itemCount: element.querySelectorAll(INTERACTIVE_SELECTOR).length };
  }
  return undefined;
};

const controlKind = (element: Element): PageInteractiveElementKind => {
  const tag = element.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "button") return "button";
  if (tag === "input") return "input";
  if (tag === "select") return "select";
  if (tag === "textarea") return "textarea";
  if (element.getAttribute("contenteditable") === "true")
    return "contenteditable";
  return "control";
};

const controlName = (element: Element) => {
  const labelledBy = element.getAttribute("aria-labelledby");
  const labelledText = labelledBy
    ?.split(/\s+/)
    .map((id) => element.ownerDocument.getElementById(id)?.textContent?.trim())
    .filter(Boolean)
    .join(" ");
  const input = element as HTMLInputElement;
  const labels = input.labels
    ? Array.from(input.labels)
        .map((label) => label.innerText.trim())
        .filter(Boolean)
        .join(" ")
    : undefined;
  return (
    element.getAttribute("aria-label") ??
    labelledText ??
    labels ??
    element.getAttribute("title") ??
    element.getAttribute("placeholder") ??
    (element as HTMLElement).innerText ??
    element.textContent ??
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CONTROL_TEXT_LENGTH);
};

const referencedText = (element: Element, attribute: string) =>
  element
    .getAttribute(attribute)
    ?.split(/\s+/)
    .map((id) => element.ownerDocument.getElementById(id)?.textContent?.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, MAX_CONTROL_TEXT_LENGTH);

const headingPathFor = (
  element: Element,
  cache: WeakMap<Element, readonly string[]>,
) => {
  const region =
    element.closest("section,article,main,form,nav") ??
    element.ownerDocument.body;
  const cached = cache.get(region);
  if (cached) return cached;
  const heading = region.querySelector<HTMLElement>("h1,h2,h3,h4,h5,h6");
  const path = heading ? [normalizedText(heading).slice(0, 500)] : [];
  cache.set(region, path);
  return path;
};

const extractInteractiveElements = (
  interactiveReference?: (element: Element) => string | undefined,
): readonly PageInteractiveElement[] => {
  const candidates: ObservationCandidate[] = [];
  const headingPathCache = new WeakMap<Element, readonly string[]>();
  const regionIds = new WeakMap<Element, string>();
  const regionCounts = new Map<string, number>();
  const regionId = (element: Element, kind: string) => {
    const existing = regionIds.get(element);
    if (existing) return existing;
    const count = (regionCounts.get(kind) ?? 0) + 1;
    regionCounts.set(kind, count);
    const id = `${kind}${count}`;
    regionIds.set(element, id);
    return id;
  };
  collectInteractiveCandidates(document.body, candidates);
  const unique = [
    ...new Map(
      candidates.map((candidate) => [candidate.element, candidate]),
    ).values(),
  ];
  const elements = unique
    .filter(({ element }) => visible(element))
    .slice(0, MAX_INTERACTIVE_ELEMENTS)
    .map(({ element, sourceFrameUrl }, index) => {
      const input = element as HTMLInputElement;
      const form = element.closest("form");
      const dialog = element.closest(
        "dialog,[role='dialog'],[role='alertdialog']",
      );
      const region = element.closest(
        "nav,main,aside,header,footer,section,[role='region'],[role='navigation'],[role='main'],[role='complementary']",
      );
      const role =
        element.getAttribute("role") ?? element.tagName.toLowerCase();
      const type = element.getAttribute("type")?.toLowerCase();
      const value =
        "value" in input && type !== "password"
          ? String(input.value).slice(0, MAX_CONTROL_TEXT_LENGTH)
          : undefined;
      return {
        id: `i${index + 1}`,
        kind: controlKind(element),
        role,
        name: controlName(element),
        description: referencedText(element, "aria-describedby") || undefined,
        value: value || undefined,
        inputType: type,
        href:
          element instanceof HTMLAnchorElement
            ? element.href.slice(0, 2_048)
            : undefined,
        headingPath: headingPathFor(element, headingPathCache),
        visible: true,
        inViewport: inViewport(element),
        disabled: "disabled" in input ? Boolean(input.disabled) : undefined,
        checked: "checked" in input ? Boolean(input.checked) : undefined,
        expanded: element.hasAttribute("aria-expanded")
          ? element.getAttribute("aria-expanded") === "true"
          : undefined,
        required: "required" in input ? Boolean(input.required) : undefined,
        validationMessage:
          "validationMessage" in input
            ? input.validationMessage.slice(0, MAX_CONTROL_TEXT_LENGTH) ||
              undefined
            : undefined,
        invalid: element.hasAttribute("aria-invalid")
          ? element.getAttribute("aria-invalid") === "true"
          : "validity" in input
            ? !input.validity.valid
            : undefined,
        selected:
          "selected" in input
            ? Boolean((input as unknown as HTMLOptionElement).selected)
            : element.hasAttribute("aria-selected")
              ? element.getAttribute("aria-selected") === "true"
              : undefined,
        actionRef: interactiveReference?.(element),
        formId: form ? regionId(form, "form") : undefined,
        dialogId: dialog ? regionId(dialog, "dialog") : undefined,
        regionRole:
          region?.getAttribute("role") ?? region?.tagName.toLowerCase(),
        sourceFrameUrl,
      };
    });
  const identityCounts = new Map<string, number>();
  const identity = (element: PageInteractiveElement) =>
    [
      element.role,
      element.name,
      element.headingPath?.join(" > "),
      element.formId,
      element.dialogId,
    ]
      .join("|")
      .toLocaleLowerCase();
  for (const element of elements) {
    const key = identity(element);
    identityCounts.set(key, (identityCounts.get(key) ?? 0) + 1);
  }
  return elements.map((element) =>
    identityCounts.get(identity(element)) === 1
      ? element
      : { ...element, actionRef: undefined },
  );
};

export const extractPageObservation = (
  documentRevision: string = crypto.randomUUID(),
  interactiveReference?: (element: Element) => string | undefined,
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
      structure: blockStructure(element, kind),
    });
    totalTextLength += boundedText.length;
  }
  const interactiveElements = extractInteractiveElements(interactiveReference);
  sourceTruncated ||= interactiveElements.length >= MAX_INTERACTIVE_ELEMENTS;

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
    interactiveElements,
    truncated: sourceTruncated,
  };
};
