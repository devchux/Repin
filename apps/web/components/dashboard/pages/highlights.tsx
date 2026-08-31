"use client";

import { LibraryToolbar } from "@/components/dashboard/features/common/library-toolbar";
import { PageHeading } from "@/components/dashboard/features/common/page-heading";
import { highlights } from "@/lib/library-data";
import { Button } from "@repo/ui/button";
import {
  ExternalLink,
  FileText,
  Highlighter,
  MoreHorizontal,
  Sparkles,
} from "@repo/ui/icons";
import Link from "next/link";
import { useMemo, useState } from "react";
import { WorkspacePage } from "../layout/workspace-page";

const colorClasses = {
  orange: "bg-primary/15 border-primary/35",
  yellow: "bg-yellow-200/50 border-yellow-500/40 dark:bg-yellow-500/10",
  blue: "bg-blue-200/50 border-blue-500/35 dark:bg-blue-500/10",
} as const;

export function HighlightsPage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      highlights.filter((item) =>
        `${item.quote} ${item.article} ${item.domain}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );
  return (
    <WorkspacePage>
      <PageHeading
        eyebrow="Library"
        title="Highlights"
        description="The passages that mattered, preserved with their source and surrounding context."
        action={
          <Button variant="outline" className="shadow-none">
            <Sparkles />
            Turn into notes
          </Button>
        }
      />
      <LibraryToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search highlighted text"
      >
        <Button variant="outline" className="shadow-none">
          <Highlighter />
          All colors
        </Button>
      </LibraryToolbar>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} highlights</span>
        <span>Grouped by recently highlighted</span>
      </div>
      <section className="mt-4 divide-y border-y">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="grid gap-4 py-6 md:grid-cols-[10rem_minmax(0,1fr)_auto]"
          >
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {item.highlightedAt}
              </p>
              <p className="mt-2 text-sm font-medium">{item.article}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {item.domain}
                <ExternalLink className="size-3" />
              </a>
            </div>
            <Link
              href={`/highlights/${item.id}`}
              className={`border-l-2 px-4 py-3 text-[15px] font-medium leading-7 transition-opacity hover:opacity-80 ${colorClasses[item.color]}`}
            >
              “{item.quote}”
            </Link>
            <div className="flex items-start gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Create note"
              >
                <FileText />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="More actions"
              >
                <MoreHorizontal />
              </Button>
            </div>
          </article>
        ))}
      </section>
    </WorkspacePage>
  );
}
