"use client";

import { DetailShell } from "@/components/dashboard/features/library/detail-shell";
import { Meta } from "@/components/dashboard/features/library/meta";
import type { BookmarkItem, HighlightItem } from "@/lib/library-data";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  Bookmark,
  ExternalLink,
  FileText,
  Highlighter,
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

export function BookmarkDetail({ item }: { readonly item: BookmarkItem }) {
  return (
    <DetailShell
      back="/bookmarks"
      backLabel="Bookmarks"
      icon={<Bookmark />}
      aside={
        <>
          <Meta label="Saved" value={item.savedAt} />
          <Meta label="Reading time" value={item.readingTime} />
          <Meta label="Folder" value={item.folder} />
        </>
      }
    >
      <p className="text-sm font-medium text-primary">{item.domain}</p>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
        {item.title}
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
        {item.description}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
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
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Add a note or highlight from the original page and it will stay
          connected here.
        </p>
        <div className="mt-4 flex min-h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          No connected notes yet
        </div>
      </section>
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
