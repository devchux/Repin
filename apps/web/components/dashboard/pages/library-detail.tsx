"use client";

import type { BookmarkItem, HighlightItem, NoteItem } from "@/lib/library-data";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { ArrowLeft, Bookmark, ExternalLink, FileText, Highlighter, Save, Sparkles, Trash2 } from "@repo/ui/icons";
import Link from "next/link";
import { WorkspacePage } from "../layout/workspace-page";
import { useState } from "react";

export function BookmarkDetail({ item }: { readonly item: BookmarkItem }) {
  return <DetailShell back="/bookmarks" backLabel="Bookmarks" icon={<Bookmark />} aside={<><Meta label="Saved" value={item.savedAt} /><Meta label="Reading time" value={item.readingTime} /><Meta label="Folder" value={item.folder} /></>}>
    <p className="text-sm font-medium text-primary">{item.domain}</p><h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">{item.title}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{item.description}</p>
    <div className="mt-6 flex flex-wrap gap-2">{item.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
    <div className="mt-8 flex flex-wrap gap-2"><Button asChild><a href={item.url} target="_blank" rel="noreferrer">Open original <ExternalLink /></a></Button><Button variant="outline"><Sparkles />Ask Repin about this</Button></div>
    <section className="mt-12 border-t pt-8"><h2 className="text-lg font-semibold">Your context</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Add a note or highlight from the original page and it will stay connected here.</p><div className="mt-4 flex min-h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">No connected notes yet</div></section>
  </DetailShell>;
}

export function NoteDetail({ item, isNew = false }: { readonly item?: NoteItem; readonly isNew?: boolean }) {
  const [title, setTitle] = useState(item?.title ?? ""); const [body, setBody] = useState(item?.body ?? ""); const [saved, setSaved] = useState(false);
  return <DetailShell back="/notes" backLabel="Notes" icon={<FileText />} aside={<><Meta label="Last updated" value={item?.updatedAt ?? "Not saved"} /><Meta label="Source" value={item?.sourceLabel ?? "Personal note"} /><Meta label="Words" value={String(body.trim() ? body.trim().split(/\s+/).length : 0)} /></>}>
    <p className="text-sm font-medium text-primary">{isNew ? "New note" : "Note"}</p>
    <label className="sr-only" htmlFor="note-title">Title</label><input id="note-title" value={title} onChange={(event) => { setTitle(event.target.value); setSaved(false); }} placeholder="Untitled note" className="mt-2 w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50 md:text-4xl" />
    <div className="mt-8 border-y py-3 text-xs text-muted-foreground">{saved ? "All changes saved" : "Draft saved locally"}</div>
    <label className="sr-only" htmlFor="note-body">Note</label><textarea id="note-body" value={body} onChange={(event) => { setBody(event.target.value); setSaved(false); }} placeholder="Start writing…" className="mt-6 min-h-72 w-full resize-none bg-transparent text-base leading-8 outline-none placeholder:text-muted-foreground/50" />
    <div className="mt-8 flex items-center justify-between border-t pt-5"><Button variant="ghost" className="text-destructive"><Trash2 />Delete</Button><Button onClick={() => setSaved(true)} disabled={!title.trim()}><Save />Save note</Button></div>
  </DetailShell>;
}

export function HighlightDetail({ item }: { readonly item: HighlightItem }) {
  return <DetailShell back="/highlights" backLabel="Highlights" icon={<Highlighter />} aside={<><Meta label="Highlighted" value={item.highlightedAt} /><Meta label="Source" value={item.domain} /><Meta label="Color" value={item.color} /></>}>
    <p className="text-sm font-medium text-primary">Highlight from {item.domain}</p><blockquote className="mt-6 border-l-4 border-primary bg-primary/[0.06] p-6 text-xl font-medium leading-9 md:text-2xl">“{item.quote}”</blockquote>
    <section className="mt-10"><h1 className="text-xl font-semibold">{item.article}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{item.context}</p><div className="mt-6 flex flex-wrap gap-2"><Button asChild><a href={item.url} target="_blank" rel="noreferrer">Open source <ExternalLink /></a></Button><Button variant="outline"><FileText />Create note</Button><Button variant="outline"><Sparkles />Explain with Repin</Button></div></section>
  </DetailShell>;
}

function DetailShell({ back, backLabel, icon, children, aside }: { readonly back: string; readonly backLabel: string; readonly icon: React.ReactNode; readonly children: React.ReactNode; readonly aside: React.ReactNode }) { return <WorkspacePage><Button asChild variant="ghost" size="sm" className="-ml-3 text-muted-foreground"><Link href={back}><ArrowLeft />Back to {backLabel}</Link></Button><div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]"><article>{children}</article><aside className="h-fit rounded-xl border bg-muted/20 p-5"><span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5">{icon}</span><div className="mt-5 divide-y">{aside}</div></aside></div></WorkspacePage>; }
function Meta({ label, value }: { readonly label: string; readonly value: string }) { return <div className="py-3 first:pt-0 last:pb-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium capitalize">{value}</dd></div>; }
