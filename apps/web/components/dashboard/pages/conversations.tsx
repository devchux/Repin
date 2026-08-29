"use client";

import type { AssistantConversationSummary } from "@repo/contracts/assistant";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { ChevronRight, MessageSquareText, Plus, Search } from "@repo/ui/icons";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useFetch } from "@/hooks/useFetch";
import { formatRelativeDate } from "@/lib/utils";
import { EmptyState } from "../features/common/empty-state";
import { ConversationSkeleton } from "../features/conversations/skeleton";

export function ConversationsPage() {
  const [query, setQuery] = useState("");
  const conversations = useFetch<readonly AssistantConversationSummary[]>(
    "/assistant/conversations",
    { hideToast: "all" },
  );
  const filteredItems = useMemo(() => {
    const items = conversations.data?.data.data ?? [];
    const search = query.trim().toLowerCase();
    if (!search) return items;
    return items.filter((item) =>
      `${item.title} ${item.preview}`.toLowerCase().includes(search),
    );
  }, [conversations.data, query]);

  return (
    <main className="mx-auto w-full max-w-5xl p-4 md:p-6 lg:p-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Conversations
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Return to an idea, answer, or task from any Repin surface.
          </p>
        </div>
        <Button asChild className="w-fit shadow-none active:scale-[0.98]">
          <Link href="/conversations/new">
            <Plus aria-hidden="true" /> New conversation
          </Link>
        </Button>
      </section>

      <div className="relative mt-7 max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Search conversations"
          className="pl-9"
          placeholder="Search conversations"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <section
        className="mt-6 overflow-hidden rounded-xl border bg-background"
        aria-label="Past conversations"
      >
        {conversations.isLoading ? <ConversationSkeleton /> : null}
        {conversations.isError ? (
          <EmptyState
            title="Conversations could not be loaded"
            description="Check your connection and try again."
            action={
              <Button onClick={() => void conversations.refetch()}>
                Try again
              </Button>
            }
          />
        ) : null}
        {!conversations.isLoading &&
        !conversations.isError &&
        filteredItems.length === 0 ? (
          <EmptyState
            title={
              query
                ? "No matching conversations"
                : "Your first conversation starts here"
            }
            description={
              query
                ? "Try a different search term."
                : "Ask Repin a question or give it a task to begin."
            }
            action={
              query ? undefined : (
                <Button asChild>
                  <Link href="/conversations/new">Start a conversation</Link>
                </Button>
              )
            }
          />
        ) : null}
        {filteredItems.map((item) => (
          <Link
            key={item.id}
            href={`/conversations/${item.id}`}
            className="group grid gap-3 border-b p-4 transition-colors last:border-b-0 hover:bg-muted/40 active:bg-muted sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:p-5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquareText className="size-4" aria-hidden="true" />
                </span>
                <h2 className="truncate text-sm font-semibold">{item.title}</h2>
              </div>
              <p className="mt-2 line-clamp-2 pl-10 text-sm leading-6 text-muted-foreground">
                {item.preview}
              </p>
              <p className="mt-2 pl-10 text-xs text-muted-foreground">
                {formatRelativeDate(item.updatedAt)} · {item.messageCount}{" "}
                {item.messageCount === 1 ? "message" : "messages"}
              </p>
            </div>
            <ChevronRight
              className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
              aria-hidden="true"
            />
          </Link>
        ))}
      </section>
    </main>
  );
}
