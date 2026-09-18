"use client";

import { DetailShell } from "@/components/dashboard/features/library/detail-shell";
import { Meta } from "@/components/dashboard/features/library/meta";
import type { HighlightItem } from "@/lib/library-data";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  Bookmark,
  ExternalLink,
  FileText,
  Highlighter,
  LoaderCircle,
  Save,
  Sparkles,
  Trash2,
} from "@repo/ui/icons";
import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import type { Note } from "@repo/contracts/note";
import { useBookmark, useDeleteBookmark, useUpdateBookmark } from "@/hooks/useBookmarks";
import { formatRelativeDate, getHost } from "@/lib/utils";

export function BookmarkDetail({ bookmarkId }: { readonly bookmarkId: string }) {
  const router = useRouter();
  const bookmark = useBookmark(bookmarkId);
  const update = useUpdateBookmark(bookmarkId);
  const remove = useDeleteBookmark(bookmarkId, () => router.replace("/bookmarks"));
  const item = bookmark.data?.data.data;
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setNote(item.note ?? item.saveReason ?? "");
    setTags(item.tags.join(", "));
  }, [item]);

  if (bookmark.isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading bookmark…</p>;
  if (bookmark.isError || !item) return <div className="p-6"><p className="text-sm text-destructive">Bookmark could not be loaded.</p><Button variant="outline" className="mt-4" onClick={() => void bookmark.refetch()}>Try again</Button></div>;

  const save = () => update.mutate({
    title: title.trim(),
    note: note.trim(),
    tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
  });
  const deleteBookmark = () => {
    if (window.confirm(`Delete “${item.title}”?`)) remove.mutate();
  };
  const description = item.aiSummary || item.description || item.excerpt;

  return (
    <DetailShell
      back="/bookmarks"
      backLabel="Bookmarks"
      icon={<Bookmark />}
      aside={
        <>
          <Meta label="Saved" value={formatRelativeDate(item.createdAt)} />
          <Meta label="Source" value={item.siteName || getHost(item.url)} />
          <Meta label="Status" value={item.enrichmentStatus ?? "Saved"} />
        </>
      }
    >
      <p className="text-sm font-medium text-primary">{item.siteName || getHost(item.url)}</p>
      <label className="sr-only" htmlFor="bookmark-title">Title</label>
      <input id="bookmark-title" value={title} maxLength={500} onChange={(event) => setTitle(event.target.value)} className="mt-3 w-full max-w-3xl bg-transparent text-3xl font-semibold tracking-tight outline-none md:text-4xl" />
      {description ? <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p> : null}
      {item.aiTopics?.length ? <div className="mt-6 flex flex-wrap gap-2">{item.aiTopics.map((topic) => <Badge key={topic} variant="outline">{topic}</Badge>)}</div> : null}
      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild>
          <a href={item.url} target="_blank" rel="noreferrer">
            Open original <ExternalLink />
          </a>
        </Button>
        <Button variant="outline">
          <Sparkles />
          Ask Repin about this
        </Button>
      </div>
      <section className="mt-12 border-t pt-8">
        <h2 className="text-lg font-semibold">Your context</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Keep the reason you saved this page and the tags you use to find it.</p>
        <div className="mt-5 grid gap-5">
          <div>
            <label htmlFor="bookmark-note" className="text-sm font-medium">Note</label>
            <textarea id="bookmark-note" maxLength={2_000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why is this page useful?" className="mt-2 min-h-32 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
          </div>
          <div>
            <label htmlFor="bookmark-tags" className="text-sm font-medium">Tags</label>
            <input id="bookmark-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="research, design, product" className="mt-2 h-11 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
            <p className="mt-1.5 text-xs text-muted-foreground">Separate tags with commas.</p>
          </div>
        </div>
      </section>
      {item.selectedText ? <section className="mt-10 border-t pt-8"><h2 className="text-lg font-semibold">Saved passage</h2><blockquote className="mt-4 border-l-4 border-primary bg-primary/6 p-5 text-sm leading-7">“{item.selectedText}”</blockquote></section> : null}
      <div className="mt-10 flex items-center justify-between border-t pt-5">
        <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending || update.isPending} onClick={deleteBookmark}>{remove.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />} Delete</Button>
        <Button disabled={!title.trim() || update.isPending || remove.isPending} onClick={save}>{update.isPending ? <LoaderCircle className="animate-spin" /> : <Save />} {update.isPending ? "Saving…" : "Save changes"}</Button>
      </div>
    </DetailShell>
  );
}

export function NoteDetail({
  noteId,
  isNew = false,
}: {
  readonly noteId?: string;
  readonly isNew?: boolean;
}) {
  const router = useRouter();
  const note = useFetch<Note>(noteId ? `/notes/${noteId}` : "/notes", {
    enabled: Boolean(noteId),
    hideToast: "all",
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const item = note.data?.data.data;

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setBody(item.body);
    setSaved(true);
  }, [item]);

  const save = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (noteId) {
        await api.patch("base", `/notes/${noteId}`, { title, body });
        setSaved(true);
        void note.refetch();
      } else {
        const response = await api.post<Note>("base", "/notes", { title, body });
        router.replace(`/notes/${response.data.data.id}`);
      }
    } catch {
      setError("Note could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!noteId || !window.confirm("Delete this note?")) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete("base", `/notes/${noteId}`);
      router.replace("/notes");
    } catch {
      setError("Note could not be deleted. Please try again.");
      setDeleting(false);
    }
  };

  if (noteId && note.isLoading) return <p className="p-6">Loading note…</p>;
  if (noteId && note.isError) return <p className="p-6 text-destructive">Note could not be loaded.</p>;
  return (
    <DetailShell
      back="/notes"
      backLabel="Notes"
      icon={<FileText />}
      aside={
        <>
          <Meta label="Last updated" value={item ? new Date(item.updatedAt).toLocaleString() : "Not saved"} />
          <Meta label="Source" value={item?.sourceUrl ? new URL(item.sourceUrl).hostname : "Personal note"} />
          <Meta
            label="Words"
            value={String(body.trim() ? body.trim().split(/\s+/).length : 0)}
          />
        </>
      }
    >
      <p className="text-sm font-medium text-primary">
        {isNew ? "New note" : "Note"}
      </p>
      <label className="sr-only" htmlFor="note-title">
        Title
      </label>
      <input
        id="note-title"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          setSaved(false);
        }}
        placeholder="Untitled note"
        className="mt-2 w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50 md:text-4xl"
      />
      <div className="mt-8 border-y py-3 text-xs text-muted-foreground">
        {saving ? "Saving…" : saved ? "All changes saved" : "Unsaved changes"}
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      <label className="sr-only" htmlFor="note-body">
        Note
      </label>
      <textarea
        id="note-body"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setSaved(false);
        }}
        placeholder="Start writing…"
        className="mt-6 min-h-72 w-full resize-none bg-transparent text-base leading-8 outline-none placeholder:text-muted-foreground/50"
      />
      <div className="mt-8 flex items-center justify-between border-t pt-5">
        <Button variant="ghost" className="text-destructive" disabled={!noteId || deleting} onClick={() => void remove()}>
          <Trash2 />
          Delete
        </Button>
        <Button onClick={() => void save()} disabled={!title.trim() || !body.trim() || saving || deleting}>
          <Save />
          {saving ? "Saving…" : "Save note"}
        </Button>
      </div>
    </DetailShell>
  );
}

export function HighlightDetail({ item }: { readonly item: HighlightItem }) {
  return (
    <DetailShell
      back="/highlights"
      backLabel="Highlights"
      icon={<Highlighter />}
      aside={
        <>
          <Meta label="Highlighted" value={item.highlightedAt} />
          <Meta label="Source" value={item.domain} />
          <Meta label="Color" value={item.color} />
        </>
      }
    >
      <p className="text-sm font-medium text-primary">
        Highlight from {item.domain}
      </p>
      <blockquote className="mt-6 border-l-4 border-primary bg-primary/6 p-6 text-xl font-medium leading-9 md:text-2xl">
        “{item.quote}”
      </blockquote>
      <section className="mt-10">
        <h1 className="text-xl font-semibold">{item.article}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {item.context}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <a href={item.url} target="_blank" rel="noreferrer">
              Open source <ExternalLink />
            </a>
          </Button>
          <Button variant="outline">
            <FileText />
            Create note
          </Button>
          <Button variant="outline">
            <Sparkles />
            Explain with Repin
          </Button>
        </div>
      </section>
    </DetailShell>
  );
}
