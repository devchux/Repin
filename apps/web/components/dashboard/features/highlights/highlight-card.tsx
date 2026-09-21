"use client";

import { DeleteHighlightDialog } from "./delete-highlight-dialog";
import { formatRelativeDate, getHost } from "@/lib/utils";
import type { HighlightColor, SavedHighlight } from "@repo/contracts/highlight";
import { Button } from "@repo/ui/button";
import { ExternalLink, MoreHorizontal, Trash2 } from "@repo/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import Link from "next/link";
import { useState } from "react";

export const highlightColorClasses: Record<HighlightColor, string> = {
  yellow: "border-yellow-500/40 bg-yellow-200/50 dark:bg-yellow-500/10",
  orange: "border-orange-500/40 bg-orange-200/50 dark:bg-orange-500/10",
  blue: "border-blue-500/35 bg-blue-200/50 dark:bg-blue-500/10",
  green: "border-green-500/35 bg-green-200/50 dark:bg-green-500/10",
  pink: "border-pink-500/35 bg-pink-200/50 dark:bg-pink-500/10",
};

export function HighlightCard({ highlight }: { readonly highlight: SavedHighlight }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <article className="grid gap-4 py-6 md:grid-cols-[10rem_minmax(0,1fr)_auto]">
        <div>
          <time className="text-xs font-medium text-muted-foreground" dateTime={highlight.capturedAt}>
            {formatRelativeDate(highlight.capturedAt)}
          </time>
          <p className="mt-2 line-clamp-2 text-sm font-medium">{highlight.pageTitle}</p>
          <a href={highlight.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            {getHost(highlight.url)} <ExternalLink className="size-3" />
          </a>
        </div>
        <Link href={`/highlights/${highlight.id}`} className={`border-l-2 px-4 py-3 text-[15px] font-medium leading-7 transition-opacity hover:opacity-80 ${highlightColorClasses[highlight.color]}`}>
          <span className="line-clamp-5">“{highlight.quote}”</span>
          {highlight.note ? <span className="mt-3 block line-clamp-2 text-xs font-normal text-muted-foreground">{highlight.note}</span> : null}
        </Link>
        <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Actions for highlight from ${highlight.pageTitle}`}>
              <MoreHorizontal />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-2">
            <Button asChild variant="ghost" className="w-full justify-start"><Link href={`/highlights/${highlight.id}`}>Edit highlight</Link></Button>
            <Button type="button" variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => { setActionsOpen(false); setDeleteOpen(true); }}>
              <Trash2 /> Delete highlight
            </Button>
          </PopoverContent>
        </Popover>
      </article>
      <DeleteHighlightDialog highlightId={highlight.id} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
