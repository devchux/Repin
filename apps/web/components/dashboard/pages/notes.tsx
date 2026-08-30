"use client";

import { LibraryToolbar } from "@/components/dashboard/features/common/library-toolbar";
import { PageHeading } from "@/components/dashboard/features/common/page-heading";
import { notes } from "@/lib/library-data";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { FileText, MoreHorizontal, Plus } from "@repo/ui/icons";
import Link from "next/link";
import { useMemo, useState } from "react";
import { WorkspacePage } from "../layout/workspace-page";

export function NotesPage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => notes.filter((note) => `${note.title} ${note.body} ${note.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <WorkspacePage>
    <PageHeading eyebrow="Library" title="Notes" description="Capture thoughts in context, then find and build on them from anywhere." action={<Button asChild><Link href="/notes/new"><Plus />New note</Link></Button>} />
    <LibraryToolbar query={query} onQueryChange={setQuery} placeholder="Search notes"><Button variant="outline" className="shadow-none">Recently updated</Button></LibraryToolbar>
    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{filtered.length} notes</span><span>Updated across web and extension</span></div>
    <section className="mt-4 grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((note) => <article key={note.id} className="group flex min-h-64 flex-col bg-card p-5 transition-colors hover:bg-muted/30">
        <div className="flex items-center justify-between"><span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><FileText className="size-4" /></span><Button size="icon" variant="ghost" className="size-8 opacity-50 group-hover:opacity-100" aria-label={`Actions for ${note.title}`}><MoreHorizontal /></Button></div>
        <Link href={`/notes/${note.id}`} className="mt-5 text-base font-semibold tracking-tight hover:text-primary">{note.title}</Link>
        <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">{note.body}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-5">{note.tags.map((tag) => <Badge variant="secondary" key={tag}>{tag}</Badge>)}</div>
        <div className="mt-4 flex justify-between border-t pt-4 text-xs text-muted-foreground"><span>{note.sourceLabel ?? "Personal note"}</span><time>{note.updatedAt}</time></div>
      </article>)}
    </section>
  </WorkspacePage>;
}
