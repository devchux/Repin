"use client";

import { EditMemoryDialog } from "./edit-memory-dialog";
import { ForgetMemoryDialog } from "./forget-memory-dialog";
import { formatRelativeDate, getHost } from "@/lib/utils";
import type { Memory, MemorySource } from "@repo/contracts/memory";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  Brain,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "@repo/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import Link from "next/link";
import { useState } from "react";

const statusClasses = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  complete: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
} as const;

function sourceHref(source: MemorySource) {
  if (!source.sourceId) return source.url;
  if (source.type === "bookmark") return `/bookmarks/${source.sourceId}`;
  if (source.type === "note") return `/notes/${source.sourceId}`;
  if (source.type === "highlight") return `/highlights/${source.sourceId}`;
  return source.url;
}

export function MemoryCard({ memory }: { readonly memory: Memory }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [forgetOpen, setForgetOpen] = useState(false);
  const source = memory.sources[0];
  const href = source ? sourceHref(source) : undefined;
  const external = Boolean(href?.startsWith("http"));

  return (
    <>
      <article className="group flex min-h-64 flex-col bg-card p-5 transition-colors hover:bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Brain className="size-4" aria-hidden="true" />
          </span>
          <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 opacity-50 group-hover:opacity-100"
                aria-label="Memory actions"
              >
                <MoreHorizontal />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setActionsOpen(false);
                  setEditOpen(true);
                }}
              >
                <Pencil /> Edit memory
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => {
                  setActionsOpen(false);
                  setForgetOpen(true);
                }}
              >
                <Trash2 /> Forget memory
              </Button>
            </PopoverContent>
          </Popover>
        </div>
        <p className="mt-5 line-clamp-6 whitespace-pre-wrap text-sm leading-6">
          {memory.content}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
          <Badge variant="secondary" className="capitalize">
            {source?.type.replaceAll("_", " ") ?? "Unknown source"}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {memory.scope}
            {memory.scopeId ? ` · ${memory.scopeId}` : ""}
          </Badge>
          <Badge className={statusClasses[memory.embeddingStatus]}>
            {memory.embeddingStatus === "complete"
              ? "Enriched"
              : memory.embeddingStatus === "failed"
                ? "Enrichment failed"
                : memory.embeddingStatus}
          </Badge>
        </div>
        {memory.embeddingStatus === "failed" && memory.embeddingError ? (
          <p
            className="mt-3 line-clamp-2 text-xs text-destructive"
            title={memory.embeddingError}
          >
            {memory.embeddingError}
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
          <span>
            {source?.trust === "trusted"
              ? "Trusted source"
              : "Untrusted source"}
          </span>
          <time dateTime={memory.updatedAt}>
            {formatRelativeDate(memory.updatedAt)}
          </time>
        </div>
        {href ? (
          external ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {source?.url ? getHost(source.url) : "Open source"}
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <Link
              href={href}
              className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Open source
            </Link>
          )
        ) : null}
      </article>
      <EditMemoryDialog
        memory={memory}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ForgetMemoryDialog
        memoryId={memory.id}
        open={forgetOpen}
        onOpenChange={setForgetOpen}
      />
    </>
  );
}
