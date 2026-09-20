"use client";

import { SectionHeader } from "@/components/dashboard/features/overview/section-header";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useFetch } from "@/hooks/useFetch";
import { useHighlights } from "@/hooks/useHighlights";
import { useNotes } from "@/hooks/useNotes";
import { useProfile } from "@/hooks/useProfile";
import { formatRelativeDate, getRunTitle, getStatus } from "@/lib/utils";
import type {
  AssistantConversationSummary,
  AssistantRun,
} from "@repo/contracts/assistant";
import { Button } from "@repo/ui/button";
import {
  AlertCircle,
  Bookmark,
  Bot,
  ChevronRight,
  FileText,
  Highlighter,
  MessageSquareText,
  Plus,
} from "@repo/ui/icons";
import { Skeleton } from "@repo/ui/skeleton";
import Link from "next/link";
import { useMemo } from "react";
import { WorkspacePage } from "../layout/workspace-page";

type SavedItem = {
  readonly id: string;
  readonly title: string;
  readonly meta: string;
  readonly updatedAt: string;
  readonly href: string;
  readonly icon: typeof Bookmark;
};

export function OverviewPage() {
  const profile = useProfile();
  const conversations = useFetch<readonly AssistantConversationSummary[]>(
    "/assistant/conversations",
    { hideToast: "all" },
  );
  const runs = useFetch<readonly AssistantRun[]>("/assistant/runs", {
    hideToast: "all",
    refetchInterval: 10_000,
  });
  const bookmarks = useBookmarks({ limit: 3 });
  const notes = useNotes({ limit: 3 });
  const highlights = useHighlights({ limit: 3 });

  const conversationItems = conversations.data?.data.data ?? [];
  const runItems = runs.data?.data.data ?? [];
  const bookmarkPage = bookmarks.data?.data.data;
  const notePage = notes.data?.data.data;
  const highlightPage = highlights.data?.data.data;
  const profileItem = profile.data?.data.data;
  const recentConversation = conversationItems[0];
  const recentRuns = runItems.slice(0, 4);
  const attentionRuns = runItems.filter((run) =>
    ["failed", "awaiting_approval", "suspended"].includes(run.status),
  );
  const savedTotal =
    (bookmarkPage?.total ?? 0) +
    (notePage?.total ?? 0) +
    (highlightPage?.total ?? 0);

  const recentSaved = useMemo<readonly SavedItem[]>(() => {
    const items: SavedItem[] = [
      ...(bookmarkPage?.items ?? []).map((item) => ({
        id: `bookmark-${item.id}`,
        title: item.title,
        meta: item.siteName || getHostname(item.url),
        updatedAt: item.updatedAt,
        href: `/bookmarks/${item.id}`,
        icon: Bookmark,
      })),
      ...(notePage?.items ?? []).map((item) => ({
        id: `note-${item.id}`,
        title: item.title || "Untitled note",
        meta: "Note",
        updatedAt: item.updatedAt,
        href: `/notes/${item.id}`,
        icon: FileText,
      })),
      ...(highlightPage?.items ?? []).map((item) => ({
        id: `highlight-${item.id}`,
        title: item.quote,
        meta: item.pageTitle,
        updatedAt: item.updatedAt,
        href: `/highlights/${item.id}`,
        icon: Highlighter,
      })),
    ];

    return items
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      )
      .slice(0, 4);
  }, [bookmarkPage?.items, highlightPage?.items, notePage?.items]);

  const libraryLoading =
    bookmarks.isLoading || notes.isLoading || highlights.isLoading;
  const libraryError = bookmarks.isError && notes.isError && highlights.isError;

  return (
    <WorkspacePage>
      <header className="flex flex-col gap-5 border-b pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-[2rem]">
            {profile.isLoading ? (
              <Skeleton className="h-9 w-64" />
            ) : (
              `Welcome back ${profileItem?.firstName ? `, ${profileItem.firstName}` : ""}`
            )}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Pick up where you left off or start something new.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="shadow-none">
            <Link href="/notes/new">
              <FileText aria-hidden="true" /> New note
            </Link>
          </Button>
          <Button asChild className="shadow-none">
            <Link href="/conversations/new">
              <Plus aria-hidden="true" /> New conversation
            </Link>
          </Button>
        </div>
      </header>

      <section
        className="mt-6 grid overflow-hidden rounded-xl border bg-card sm:grid-cols-3"
        aria-label="Workspace summary"
      >
        <WorkspaceMetric
          label="Conversations"
          value={conversations.isLoading ? undefined : conversationItems.length}
          detail="Across web and extension"
          icon={MessageSquareText}
          href="/conversations"
        />
        <WorkspaceMetric
          label="Saved items"
          value={libraryLoading ? undefined : savedTotal}
          detail="Bookmarks, notes, highlights"
          icon={Bookmark}
          href="/bookmarks"
          bordered
        />
        <WorkspaceMetric
          label="Needs attention"
          value={runs.isLoading ? undefined : attentionRuns.length}
          detail={
            attentionRuns.length ? "Review interrupted runs" : "No blocked runs"
          }
          icon={AlertCircle}
          href="/activity"
          bordered
          emphasized={attentionRuns.length > 0}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border bg-card">
            <SectionHeader
              title="Continue working"
              description="Your most recently active conversation"
              href="/conversations"
            />
            <div className="border-t">
              {conversations.isLoading ? <ContinueSkeleton /> : null}
              {conversations.isError ? (
                <InlineState
                  title="Conversations could not be loaded"
                  action="Try again"
                  onAction={() => void conversations.refetch()}
                />
              ) : null}
              {!conversations.isLoading &&
              !conversations.isError &&
              recentConversation ? (
                <Link
                  href={`/conversations/${recentConversation.id}`}
                  className="group flex items-start gap-4 p-5 transition-colors hover:bg-muted/35 active:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquareText className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="truncate font-medium tracking-tight">
                        {recentConversation.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(recentConversation.updatedAt)}
                      </span>
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-sm leading-6 text-muted-foreground">
                      {recentConversation.preview}
                    </span>
                    <span className="mt-3 block text-xs text-muted-foreground">
                      {recentConversation.messageCount}{" "}
                      {recentConversation.messageCount === 1
                        ? "message"
                        : "messages"}
                    </span>
                  </span>
                  <ChevronRight
                    className="mt-3 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              ) : null}
              {!conversations.isLoading &&
              !conversations.isError &&
              !recentConversation ? (
                <InlineState
                  title="No conversations yet"
                  description="Ask a question or give Repin a task to begin."
                  action="Start a conversation"
                  href="/conversations/new"
                />
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border bg-card">
            <SectionHeader
              title="Recent activity"
              description="Assistant runs from every Repin surface"
              href="/activity"
            />
            <div className="border-t">
              {runs.isLoading ? <RowsSkeleton /> : null}
              {runs.isError ? (
                <InlineState
                  title="Activity could not be loaded"
                  action="Try again"
                  onAction={() => void runs.refetch()}
                />
              ) : null}
              {!runs.isLoading && !runs.isError && recentRuns.length === 0 ? (
                <InlineState
                  title="No activity yet"
                  description="Completed and in-progress assistant runs will appear here."
                />
              ) : null}
              {recentRuns.map((run) => {
                const status = getStatus(run.status);
                return (
                  <Link
                    key={run.id}
                    href={`/activity/${run.id}`}
                    className="group flex items-center gap-3 border-b px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/35 active:bg-muted"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${status.className}`}
                    >
                      <status.icon
                        className={`size-4 ${status.spin ? "animate-spin" : ""}`}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {getRunTitle(run)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {status.label} · {formatRelativeDate(run.createdAt)}
                      </span>
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-xl border bg-card">
            <SectionHeader
              title="Recently saved"
              description="Latest additions to your library"
              href="/bookmarks"
            />
            <div className="border-t">
              {libraryLoading ? <RowsSkeleton count={3} /> : null}
              {libraryError ? (
                <InlineState title="Library could not be loaded" />
              ) : null}
              {!libraryLoading && !libraryError && recentSaved.length === 0 ? (
                <InlineState
                  title="Your library is empty"
                  description="Save a page, highlight text, or create a note."
                  action="Create a note"
                  href="/notes/new"
                />
              ) : null}
              {recentSaved.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group flex items-center gap-3 border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/35 active:bg-muted"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
                    <item.icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.meta} · {formatRelativeDate(item.updatedAt)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">
                  Use Repin in your browser
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Select text or open the extension to summarize, explain, and
                  save what matters.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </WorkspacePage>
  );
}

function WorkspaceMetric({
  label,
  value,
  detail,
  icon: Icon,
  href,
  bordered = false,
  emphasized = false,
}: {
  readonly label: string;
  readonly value: number | undefined;
  readonly detail: string;
  readonly icon: typeof Bookmark;
  readonly href: string;
  readonly bordered?: boolean;
  readonly emphasized?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 p-5 transition-colors hover:bg-muted/35 ${bordered ? "border-t sm:border-l sm:border-t-0" : ""}`}
    >
      <Icon
        className={`size-4 shrink-0 ${emphasized ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-medium">
          {detail}
        </span>
      </span>
      {value === undefined ? (
        <Skeleton className="h-7 w-8" />
      ) : (
        <span className="font-mono text-xl font-medium tabular-nums tracking-tight">
          {value}
        </span>
      )}
    </Link>
  );
}

function InlineState({
  title,
  description,
  action,
  href,
  onAction,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: string;
  readonly href?: string;
  readonly onAction?: () => void;
}) {
  return (
    <div className="px-5 py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action && href ? (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href={href}>{action}</Link>
        </Button>
      ) : null}
      {action && onAction ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
          {action}
        </Button>
      ) : null}
    </div>
  );
}

function ContinueSkeleton() {
  return (
    <div className="flex gap-4 p-5" aria-label="Loading recent conversation">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="mt-3 h-3 w-4/5" />
        <Skeleton className="mt-3 h-3 w-20" />
      </div>
    </div>
  );
}

function RowsSkeleton({ count = 4 }: { readonly count?: number }) {
  return (
    <div aria-label="Loading workspace items">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b px-5 py-4 last:border-b-0"
        >
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="mt-2 h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Bookmark";
  }
}
