"use client";

import { DeleteNoteDialog } from "@/components/dashboard/features/notes/delete-note-dialog";
import { formatRelativeDate, getHost } from "@/lib/utils";
import type { Note } from "@repo/contracts/note";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { FileText, MoreHorizontal, Trash2 } from "@repo/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import Link from "next/link";
import { useState } from "react";

export function NoteCard({ note }: { readonly note: Note }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <article className="group flex min-h-64 flex-col bg-card p-5 transition-colors hover:bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="size-4" aria-hidden="true" />
          </span>
          <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 opacity-50 group-hover:opacity-100"
                aria-label={`Actions for ${note.title}`}
              >
                <MoreHorizontal />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-2">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href={`/notes/${note.id}`}>Edit note</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => {
                  setActionsOpen(false);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 /> Delete note
              </Button>
            </PopoverContent>
          </Popover>
        </div>
        <Link
          href={`/notes/${note.id}`}
          className="mt-5 text-base font-semibold tracking-tight hover:text-primary"
        >
          {note.title}
        </Link>
        <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">
          {note.body}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
          {note.tags.slice(0, 4).map((tag) => (
            <Badge variant="secondary" key={tag}>
              {tag}
            </Badge>
          ))}
          {note.tags.length > 4 ? (
            <Badge variant="outline">+{note.tags.length - 4}</Badge>
          ) : null}
        </div>
        <div className="mt-4 flex justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
          <span className="truncate">
            {note.sourceUrl ? getHost(note.sourceUrl) : "Personal note"}
          </span>
          <time className="shrink-0" dateTime={note.updatedAt}>
            {formatRelativeDate(note.updatedAt)}
          </time>
        </div>
      </article>
      <DeleteNoteDialog
        noteId={note.id}
        noteTitle={note.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
