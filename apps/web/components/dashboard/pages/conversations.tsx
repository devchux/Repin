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
import { PageHeading } from "../features/common/page-heading";
import { ConversationSkeleton } from "../features/conversations/skeleton";
import { WorkspacePage } from "../layout/workspace-page";

export function ConversationsPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ConversationType>("all");
  const [updated, setUpdated] = useState<UpdatedRange>("any");
  const [sort, setSort] = useState<ConversationSort>("recent");
  const conversations = useFetch<readonly AssistantConversationSummary[]>("/assistant/conversations", { hideToast: "all" });
  const filteredItems = useMemo(() => {
    const items = [...(conversations.data?.data.data ?? [])];
    const search = query.trim().toLowerCase();
    const updatedAfter = getUpdatedAfter(updated);

    return items
      .filter((item) => !search || `${item.title} ${item.preview}`.toLowerCase().includes(search))
      .filter((item) => type === "all" || item.initialCapability === type)
      .filter((item) => updatedAfter === undefined || new Date(item.updatedAt).getTime() >= updatedAfter)
      .sort((a, b) => {
        if (sort === "oldest") return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        if (sort === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sort === "messages") return b.messageCount - a.messageCount;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [conversations.data, query, sort, type, updated]);
  const filtersActive = Boolean(query || type !== "all" || updated !== "any" || sort !== "recent");

  const resetFilters = () => {
    setQuery("");
    setType("all");
    setUpdated("any");
    setSort("recent");
  };

  return (
    <WorkspacePage>
      <PageHeading
        eyebrow="Workspace"
        title="Conversations"
        description="Return to an idea, answer, or task from any Repin surface."
        action={
          <Button asChild className="w-fit shadow-none active:scale-[0.98]">
            <Link href="/conversations/new"><Plus aria-hidden="true" /> New conversation</Link>
          </Button>
        }
      />

      <section className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_oklch(0_0_0/0.025)]" aria-label="Past conversations">
          <div className="border-b p-4 md:p-5">
            <div className="relative min-w-0 md:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input aria-label="Search conversations" className="bg-muted/25 pl-9 shadow-none" placeholder="Search conversations" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-2 sm:grid-cols-3">
                <FilterSelect label="Conversation type" value={type} onChange={(value) => setType(value as ConversationType)}>
                  <option value="all">All types</option>
                  <option value="chat">Chat</option>
                  <option value="summarize">Summarize</option>
                  <option value="explain">Explain</option>
                  <option value="translate">Translate</option>
                </FilterSelect>
                <FilterSelect label="Updated" value={updated} onChange={(value) => setUpdated(value as UpdatedRange)}>
                  <option value="any">Updated anytime</option>
                  <option value="day">Past 24 hours</option>
                  <option value="week">Past 7 days</option>
                  <option value="month">Past 30 days</option>
                </FilterSelect>
                <FilterSelect label="Sort conversations" value={sort} onChange={(value) => setSort(value as ConversationSort)}>
                  <option value="recent">Recently active</option>
                  <option value="created">Recently created</option>
                  <option value="oldest">Oldest activity</option>
                  <option value="messages">Most messages</option>
                </FilterSelect>
              </div>
              {filtersActive ? <Button type="button" variant="ghost" size="sm" className="w-fit text-muted-foreground" onClick={resetFilters}>Clear filters</Button> : null}
            </div>
          </div>

          <div className="flex items-center justify-between border-b bg-muted/[0.16] px-4 py-2.5 text-xs text-muted-foreground md:px-5">
            <span>{filteredItems.length} {filteredItems.length === 1 ? "conversation" : "conversations"}</span>
            <span>{filtersActive ? "Filtered results" : "All conversations"}</span>
          </div>

          <div>
            {conversations.isLoading ? <ConversationSkeleton /> : null}
            {conversations.isError ? <EmptyState title="Conversations could not be loaded" description="Check your connection and try again." action={<Button onClick={() => void conversations.refetch()}>Try again</Button>} /> : null}
            {!conversations.isLoading && !conversations.isError && filteredItems.length === 0 ? (
              <EmptyState
                title={filtersActive ? "No matching conversations" : "Your first conversation starts here"}
                description={filtersActive ? "Adjust or clear the filters to see more conversations." : "Ask Repin a question or give it a task to begin."}
                action={filtersActive ? <Button variant="outline" onClick={resetFilters}>Clear filters</Button> : <Button asChild><Link href="/conversations/new">Start a conversation</Link></Button>}
              />
            ) : null}
            {filteredItems.map((item) => (
              <Link key={item.id} href={`/conversations/${item.id}`} className="group grid gap-3 border-b px-4 py-5 transition-colors last:border-b-0 hover:bg-muted/35 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start md:px-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MessageSquareText className="size-4" aria-hidden="true" /></span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-sm font-semibold tracking-tight group-hover:text-primary">{item.title}</h2>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{item.initialCapability}</span>
                    </div>
                    <time className="text-xs text-muted-foreground">{formatRelativeDate(item.updatedAt)}</time>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.preview}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.messageCount} {item.messageCount === 1 ? "message" : "messages"}</p>
                </div>
                <ChevronRight className="mt-2 hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
              </Link>
            ))}
          </div>
      </section>
    </WorkspacePage>
  );
}

type ConversationType = "all" | AssistantConversationSummary["initialCapability"];
type UpdatedRange = "any" | "day" | "week" | "month";
type ConversationSort = "recent" | "created" | "oldest" | "messages";

function getUpdatedAfter(range: UpdatedRange) {
  const ranges: Record<Exclude<UpdatedRange, "any">, number> = {
    day: 86_400_000,
    week: 604_800_000,
    month: 2_592_000_000,
  };
  return range === "any" ? undefined : Date.now() - ranges[range];
}

function FilterSelect({ label, value, onChange, children }: { readonly label: string; readonly value: string; readonly onChange: (value: string) => void; readonly children: React.ReactNode }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select className="h-9 w-full min-w-40 rounded-md border bg-background px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}
