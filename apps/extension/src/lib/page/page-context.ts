import type { PageContext } from "@repo/contracts/browser";
import { extractPageObservation } from "../page-observation";

const MAX_PAGE_CONTENT_LENGTH = 100_000;
const MAX_SELECTED_TEXT_LENGTH = 20_000;
const CONTENT_ROOT_SELECTOR = "main, article, [role='main']";

const normalizePageText = (value: string) =>
  value
    .split(/\n+/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_PAGE_CONTENT_LENGTH);

export const extractPageContext = (selectedText?: string): PageContext => {
  const normalizedSelection = selectedText
    ? normalizePageText(selectedText).slice(0, MAX_SELECTED_TEXT_LENGTH)
    : undefined;

  if (normalizedSelection) {
    return {
      url: window.location.href,
      title: document.title.trim() || window.location.hostname,
      selectedText: normalizedSelection,
    };
  }

  const source =
    document.querySelector<HTMLElement>(CONTENT_ROOT_SELECTOR) ?? document.body;
  // innerText excludes script/style content and elements hidden from layout.
  // Prefer the semantic content root to avoid copying navigation and forms.
  const pageContent = normalizePageText(source.innerText);
  if (!pageContent) {
    throw new Error("Repin could not find readable content on this page");
  }
  const observation = extractPageObservation();

  return {
    url: window.location.href,
    title: document.title.trim() || window.location.hostname,
    pageContent: observation.blocks.length > 0 ? undefined : pageContent,
    observation,
  };
};
