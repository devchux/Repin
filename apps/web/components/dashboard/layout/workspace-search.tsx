"use client";

import { useFetch } from "@/hooks/useFetch";
import { useAssistantConversations } from "@/hooks/useAssistant";
import type { BookmarksPage } from "@repo/contracts/bookmark";
import type { HighlightsPage } from "@repo/contracts/highlight";
import type { NotesPage } from "@repo/contracts/note";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { Bookmark, FileText, Highlighter, MessageSquareText, Search } from "@repo/ui/icons";
import { Input } from "@repo/ui/input";
import { Skeleton } from "@repo/ui/skeleton";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

type SearchResult = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly category: string;
  readonly icon: typeof Search;
};

export function WorkspaceSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const canSearch = open && deferredQuery.length >= 2;

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  const conversations = useAssistantConversations({
    enabled: canSearch,
    search: deferredQuery,
    limit: 4,
  });
  const bookmarks = useFetch<BookmarksPage>("/bookmarks", {
    enabled: canSearch,
    hideToast: "all",
    params: { search: deferredQuery, searchMode: "lexical", limit: 4 },
    queryKey: ["workspace-search", "bookmarks", deferredQuery],
  });
  const notes = useFetch<NotesPage>("/notes", {
    enabled: canSearch,
    hideToast: "all",
    params: { search: deferredQuery, limit: 4 },
    queryKey: ["workspace-search", "notes", deferredQuery],
  });
  const highlights = useFetch<HighlightsPage>("/highlights", {
    enabled: canSearch,
    hideToast: "all",
    params: { search: deferredQuery, limit: 4 },
    queryKey: ["workspace-search", "highlights", deferredQuery],
  });

  const results = useMemo<readonly SearchResult[]>(() => {
    if (!canSearch) return [];
    const conversationResults = (conversations.data?.data.data.items ?? [])
      .map((item) => ({
        id: `conversation-${item.id}`,
        title: item.title,
        description: item.preview,
        href: `/conversations/${item.id}`,
        category: "Conversation",
        icon: MessageSquareText,
      }));
    const bookmarkResults = (bookmarks.data?.data.data.items ?? []).map((item) => ({
      id: `bookmark-${item.id}`,
      title: item.title,
      description: item.description || item.siteName || item.url,
      href: `/bookmarks/${item.id}`,
      category: "Bookmark",
      icon: Bookmark,
    }));
    const noteResults = (notes.data?.data.data.items ?? []).map((item) => ({
      id: `note-${item.id}`,
      title: item.title || "Untitled note",
      description: plainText(item.body),
      href: `/notes/${item.id}`,
      category: "Note",
      icon: FileText,
    }));
    const highlightResults = (highlights.data?.data.data.items ?? []).map((item) => ({
      id: `highlight-${item.id}`,
      title: item.quote,
      description: item.pageTitle,
      href: `/highlights/${item.id}`,
      category: "Highlight",
      icon: Highlighter,
    }));

    return [...conversationResults, ...bookmarkResults, ...noteResults, ...highlightResults];
  }, [bookmarks.data, canSearch, conversations.data, highlights.data, notes.data]);

  const isLoading = canSearch && [conversations, bookmarks, notes, highlights].some((request) => request.isLoading || request.isFetching);
  const isError = canSearch && [conversations, bookmarks, notes, highlights].every((request) => request.isError);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="group flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-muted/35 px-3 text-left text-sm text-muted-foreground shadow-xs transition-colors hover:border-foreground/15 hover:bg-muted/60 md:max-w-md"
          type="button"
        >
          <Search className="size-4 shrink-0 transition-colors group-hover:text-foreground" aria-hidden="true" />
          <span className="truncate">Search workspace</span>
          <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] shadow-xs sm:inline">⌘K</kbd>
        </button>
      </DialogTrigger>
      <DialogContent className="top-[12vh] block max-w-2xl translate-y-0 overflow-hidden p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Search workspace</DialogTitle>
        <DialogDescription className="sr-only">Search conversations, bookmarks, notes, and highlights.</DialogDescription>
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            autoFocus
            aria-label="Search workspace"
            className="h-13 rounded-none border-0 bg-transparent pl-11 pr-4 text-base shadow-none focus-visible:ring-0"
            placeholder="Search conversations, bookmarks, notes, and highlights"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="max-h-[min(32rem,70vh)] overflow-y-auto p-2">
          {!canSearch ? <SearchMessage>Enter at least two characters to search your workspace.</SearchMessage> : null}
          {isLoading ? <SearchSkeleton /> : null}
          {!isLoading && isError ? <SearchMessage>Search is unavailable right now. Try again shortly.</SearchMessage> : null}
          {!isLoading && !isError && canSearch && results.length === 0 ? <SearchMessage>No results for “{deferredQuery}”.</SearchMessage> : null}
          {!isLoading && !isError && results.map((result) => (
            <Link
              key={result.id}
              href={result.href}
              onClick={() => handleOpenChange(false)}
              className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
                <result.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{result.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{result.category}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{result.description}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between border-t bg-muted/25 px-4 py-2 text-[11px] text-muted-foreground">
          <span>{results.length ? `${results.length} results` : "Workspace search"}</span>
          <span>Esc to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchMessage({ children }: { readonly children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

function SearchSkeleton() {
  return (
    <div className="space-y-1" aria-label="Searching workspace">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="flex-1"><Skeleton className="h-3.5 w-2/5" /><Skeleton className="mt-2 h-3 w-3/5" /></div>
        </div>
      ))}
    </div>
  );
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
