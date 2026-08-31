export type BookmarkItem = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly domain: string;
  readonly folder: string;
  readonly tags: readonly string[];
  readonly savedAt: string;
  readonly readingTime: string;
};

export type NoteItem = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly source?: string;
  readonly sourceLabel?: string;
  readonly updatedAt: string;
  readonly tags: readonly string[];
};

export type HighlightItem = {
  readonly id: string;
  readonly quote: string;
  readonly context: string;
  readonly article: string;
  readonly url: string;
  readonly domain: string;
  readonly color: "orange" | "yellow" | "blue";
  readonly highlightedAt: string;
};

export const bookmarks: readonly BookmarkItem[] = [
  { id: "designing-effective-ai-agents", title: "A practical guide to building effective AI agents", description: "Patterns for augmenting language models with retrieval, tools, and memory while keeping systems simple and measurable.", url: "https://www.anthropic.com/research/building-effective-agents", domain: "anthropic.com", folder: "AI research", tags: ["agents", "architecture"], savedAt: "Today, 9:42 AM", readingTime: "12 min" },
  { id: "browser-agent-security", title: "Securing browser agents against prompt injection", description: "A threat model for agents that browse untrusted pages and act on behalf of users.", url: "https://openai.com/research", domain: "openai.com", folder: "AI research", tags: ["security", "browser"], savedAt: "Yesterday", readingTime: "8 min" },
  { id: "durable-execution", title: "Durable execution for long-running workflows", description: "How resumable state machines make asynchronous jobs easier to observe, retry, and recover.", url: "https://docs.temporal.io", domain: "temporal.io", folder: "Engineering", tags: ["workflows"], savedAt: "Aug 26", readingTime: "15 min" },
  { id: "human-approval", title: "Designing meaningful human approval boundaries", description: "A product framework for balancing autonomous action with clear user control.", url: "https://www.nngroup.com/articles/ai-ux", domain: "nngroup.com", folder: "Product", tags: ["ux", "safety"], savedAt: "Aug 24", readingTime: "6 min" },
  { id: "webextensions", title: "Browser extension architecture patterns", description: "Platform guidance for content scripts, background services, permissions, and messaging.", url: "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions", domain: "developer.mozilla.org", folder: "Engineering", tags: ["extension"], savedAt: "Aug 21", readingTime: "10 min" },
];

export const notes: readonly NoteItem[] = [
  { id: "repin-memory", title: "Ideas for Repin memory", body: "Memory should be useful without feeling invasive. Separate short-term run context from durable preferences, and always make the source and reason for recall visible.", source: "/conversations/new", sourceLabel: "Conversation · Agent memory", updatedAt: "18 min ago", tags: ["product", "memory"] },
  { id: "approval-model", title: "Browser action approval model", body: "Group actions by consequence, not technical capability. Reading page content can be automatic; publishing, purchasing, or sharing should require explicit approval at the moment of action.", source: "https://www.anthropic.com", sourceLabel: "anthropic.com", updatedAt: "Yesterday", tags: ["security", "agent"] },
  { id: "weekly-research", title: "Weekly research questions", body: "How should a run communicate uncertainty? What information belongs in an execution replay? Which browser actions can be safely retried?", updatedAt: "Aug 26", tags: ["research"] },
  { id: "extension-performance", title: "Extension performance checklist", body: "Keep content scripts narrow. Lazy-load heavy UI, debounce observers, and move AI orchestration to the backend whenever possible.", source: "https://developer.chrome.com/docs/extensions", sourceLabel: "developer.chrome.com", updatedAt: "Aug 22", tags: ["extension", "performance"] },
];

export const highlights: readonly HighlightItem[] = [
  { id: "agent-simplicity", quote: "The most successful implementations weren't using complex frameworks or specialized libraries. They were building with simple, composable patterns.", context: "The article distinguishes workflows with predefined code paths from agents that dynamically direct their own process and tool usage.", article: "Building effective agents", url: "https://www.anthropic.com/research/building-effective-agents", domain: "anthropic.com", color: "orange", highlightedAt: "Today, 9:46 AM" },
  { id: "human-control", quote: "People should be able to understand what the system is doing, why it is doing it, and how to stop it.", context: "A useful approval experience explains consequences at the point of decision instead of front-loading users with abstract permissions.", article: "Human-centered AI interaction", url: "https://www.nngroup.com/articles/ai-ux", domain: "nngroup.com", color: "yellow", highlightedAt: "Yesterday" },
  { id: "durable-runs", quote: "Durability turns a long-running process from a fragile request into a recoverable history of state transitions.", context: "Persist intent, inputs, transitions, and outputs so a run can resume after infrastructure failure without repeating consequential work.", article: "Durable execution", url: "https://docs.temporal.io", domain: "temporal.io", color: "blue", highlightedAt: "Aug 26" },
  { id: "least-privilege", quote: "Request only the permissions your extension needs, and request optional permissions at runtime when possible.", context: "Least-privilege extension architecture reduces both review friction and the impact of compromised webpage content.", article: "Declare permissions", url: "https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions", domain: "developer.chrome.com", color: "orange", highlightedAt: "Aug 21" },
];
