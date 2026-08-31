"use client";

import { EmptyLibrary } from "@/components/dashboard/features/bookmarks/empty-library";
import { LibraryToolbar } from "@/components/dashboard/features/common/library-toolbar";
import { PageHeading } from "@/components/dashboard/features/common/page-heading";
import { bookmarks } from "@/lib/library-data";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  Bookmark,
  ChevronDown,
  ExternalLink,
  Folder,
  MoreHorizontal,
} from "@repo/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";
import Link from "next/link";
import { useMemo, useState } from "react";
import { WorkspacePage } from "../layout/workspace-page";

export function BookmarksPage() {
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("All saved");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const folders = [
    "All saved",
    ...new Set(bookmarks.map((item) => item.folder)),
  ];
  const filtered = useMemo(
    () =>
      bookmarks.filter(
        (item) =>
          (folder === "All saved" || item.folder === folder) &&
          `${item.title} ${item.description} ${item.tags.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [folder, query],
  );

  return (
    <WorkspacePage>
      <PageHeading
        eyebrow="Library"
        title="Bookmarks"
        description="Articles, references, and pages you saved from Repin on any device."
        action={
          <Button>
            <Bookmark /> Save current page
          </Button>
        }
      />
      <LibraryToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search bookmarks"
        layout={layout}
        onLayoutChange={setLayout}
      >
        <div className="flex items-center rounded-md border bg-background p-1">
          <Tabs value={folder} onValueChange={setFolder}>
            <TabsList className="h-auto bg-transparent p-0" aria-label="Filter bookmarks by folder">
              {folders.slice(0, 4).map((item) => (
                <TabsTrigger key={item} value={item} className="h-7 px-2.5 text-xs">
                  {item}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label="More folders"
          >
            <ChevronDown />
          </Button>
        </div>
      </LibraryToolbar>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} bookmarks</span>
        <span>Sorted by recently saved</span>
      </div>
      {filtered.length ? (
        <section
          className={
            layout === "grid"
              ? "mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
              : "mt-4 divide-y border-y"
          }
        >
          {filtered.map((item) => (
            <article
              key={item.id}
              className={
                layout === "grid"
                  ? "group flex min-h-64 flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/35"
                  : "group grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bookmark className="size-4" />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 opacity-60 group-hover:opacity-100"
                  aria-label={`Actions for ${item.title}`}
                >
                  <MoreHorizontal />
                </Button>
              </div>
              <div
                className={
                  layout === "grid"
                    ? "mt-5 flex flex-1 flex-col"
                    : "mt-3 md:col-start-1"
                }
              >
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {item.domain}
                </p>
                <Link
                  href={`/bookmarks/${item.id}`}
                  className="mt-2 text-base font-semibold leading-6 tracking-tight hover:text-primary"
                >
                  {item.title}
                </Link>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                  <Badge variant="secondary">
                    <Folder className="size-3" />
                    {item.folder}
                  </Badge>
                  {item.tags.slice(0, 1).map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div
                className={
                  layout === "grid"
                    ? "mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground"
                    : "md:row-span-2 md:text-right text-xs text-muted-foreground"
                }
              >
                <span>{item.savedAt}</span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Open <ExternalLink className="size-3" />
                </a>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyLibrary
          title="No bookmarks found"
          description="Try another search or folder."
        />
      )}
    </WorkspacePage>
  );
}
