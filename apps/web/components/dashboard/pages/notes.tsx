"use client";

import { LibraryToolbar } from "@/components/dashboard/features/common/library-toolbar";
import { PageHeading } from "@/components/dashboard/features/common/page-heading";
import { EmptyNotes } from "@/components/dashboard/features/notes/empty-notes";
import { NoteCard } from "@/components/dashboard/features/notes/note-card";
import { useNotes } from "@/hooks/useNotes";
import { Button } from "@repo/ui/button";
import { Plus } from "@repo/ui/icons";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { WorkspacePage } from "../layout/workspace-page";

export function NotesPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const notes = useNotes({ search: deferredQuery });
  const page = notes.data?.data.data;
  const items = page?.items ?? [];

  return (
    <WorkspacePage>
      <PageHeading
        eyebrow="Library"
        title="Notes"
        description="Capture thoughts in context, then find and build on them from anywhere."
        action={
          <Button asChild>
            <Link href="/notes/new">
              <Plus />
              New note
            </Link>
          </Button>
        }
      />
      <LibraryToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search notes"
      />
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {notes.isLoading
            ? "Loading notes…"
            : `${page?.total ?? 0} ${(page?.total ?? 0) === 1 ? "note" : "notes"}`}
        </span>
        <span>
          {deferredQuery ? "Filtered results" : "Sorted by recently updated"}
        </span>
      </div>
      {notes.isError ? (
        <>
          <EmptyNotes
            title="Notes could not be loaded"
            description="Check your connection and try again."
          />
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => void notes.refetch()}>
              Try again
            </Button>
          </div>
        </>
      ) : null}
      {!notes.isLoading && !notes.isError && items.length ? (
        <section className="mt-4 grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-2 xl:grid-cols-3">
          {items.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </section>
      ) : null}
      {!notes.isLoading && !notes.isError && !items.length ? (
        <EmptyNotes
          title={deferredQuery ? "No notes found" : "Your notes are empty"}
          description={
            deferredQuery
              ? "Try a different title, phrase, or keyword."
              : "Create a note here or save one from the Repin extension."
          }
        />
      ) : null}
    </WorkspacePage>
  );
}
