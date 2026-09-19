"use client";

import { LibraryToolbar } from "@/components/dashboard/features/common/library-toolbar";
import { PageHeading } from "@/components/dashboard/features/common/page-heading";
import { EmptyHighlights } from "@/components/dashboard/features/highlights/empty-highlights";
import { HighlightCard } from "@/components/dashboard/features/highlights/highlight-card";
import { WorkspacePage } from "@/components/dashboard/layout/workspace-page";
import { useHighlights } from "@/hooks/useHighlights";
import { HIGHLIGHT_COLORS, type HighlightColor } from "@repo/contracts/highlight";
import { Button } from "@repo/ui/button";
import { useDeferredValue, useState } from "react";

export function HighlightsPage() {
  const [query, setQuery] = useState("");
  const [color, setColor] = useState<HighlightColor | "">("");
  const deferredQuery = useDeferredValue(query.trim());
  const highlights = useHighlights({ search: deferredQuery, color: color || undefined });
  const page = highlights.data?.data.data;
  const items = page?.items ?? [];

  return (
    <WorkspacePage>
      <PageHeading eyebrow="Library" title="Highlights" description="The passages that mattered, preserved with their source and surrounding context." />
      <LibraryToolbar query={query} onQueryChange={setQuery} placeholder="Search highlighted text">
        <label className="sr-only" htmlFor="highlight-color">Filter by color</label>
        <select id="highlight-color" value={color} onChange={(event) => setColor(event.target.value as HighlightColor | "")} className="h-9 rounded-md border bg-background px-3 text-sm capitalize shadow-none">
          <option value="">All colors</option>
          {HIGHLIGHT_COLORS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </LibraryToolbar>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{highlights.isLoading ? "Loading highlights…" : `${page?.total ?? 0} ${(page?.total ?? 0) === 1 ? "highlight" : "highlights"}`}</span>
        <span>{deferredQuery || color ? "Filtered results" : "Sorted by recently highlighted"}</span>
      </div>
      {highlights.isError ? <><EmptyHighlights title="Highlights could not be loaded" description="Check your connection and try again." /><div className="mt-4 text-center"><Button variant="outline" onClick={() => void highlights.refetch()}>Try again</Button></div></> : null}
      {!highlights.isLoading && !highlights.isError && items.length ? <section className="mt-4 divide-y border-y">{items.map((highlight) => <HighlightCard key={highlight.id} highlight={highlight} />)}</section> : null}
      {!highlights.isLoading && !highlights.isError && !items.length ? <EmptyHighlights title={deferredQuery || color ? "No highlights found" : "Your highlights are empty"} description={deferredQuery || color ? "Try a different phrase or color filter." : "Select text on a webpage and save it with the Repin extension."} /> : null}
    </WorkspacePage>
  );
}
