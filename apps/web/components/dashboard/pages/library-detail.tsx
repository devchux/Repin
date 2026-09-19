"use client";

import { DetailShell } from "@/components/dashboard/features/library/detail-shell";
import { Meta } from "@/components/dashboard/features/library/meta";
import { AddBookmarkToMemoryDialog } from "@/components/dashboard/features/bookmarks/add-bookmark-to-memory-dialog";
import type { HighlightItem } from "@/lib/library-data";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
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
import {
  useBookmark,
  useDeleteBookmark,
  useUpdateBookmark,
} from "@/hooks/useBookmarks";
import { formatRelativeDate, getHost } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  updateBookmarkSchema,
  type UpdateBookmarkFormValues,
} from "@/schemas/bookmark";
import { noteSchema, type NoteFormValues } from "@/schemas/note";
import { useBookmarkMemory } from "@/hooks/useMemories";

export function BookmarkDetail({
  bookmarkId,
}: {
  readonly bookmarkId: string;
}) {
  const router = useRouter();
  const bookmark = useBookmark(bookmarkId);
  const bookmarkMemory = useBookmarkMemory(bookmarkId);
  const update = useUpdateBookmark(bookmarkId);
  const remove = useDeleteBookmark(bookmarkId, () =>
    router.replace("/bookmarks"),
  );
  const item = bookmark.data?.data.data;
  const form = useForm<UpdateBookmarkFormValues>({
    resolver: zodResolver(updateBookmarkSchema),
    defaultValues: { title: "", note: "", tags: "" },
  });

  useEffect(() => {
    if (!item) return;
    form.reset({
      title: item.title,
      note: item.note ?? item.saveReason ?? "",
      tags: item.tags.join(", "),
    });
  }, [form, item]);

  if (bookmark.isLoading)
    return (
      <p className="p-6 text-sm text-muted-foreground">Loading bookmark…</p>
    );
  if (bookmark.isError || !item)
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">
          Bookmark could not be loaded.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => void bookmark.refetch()}
        >
          Try again
        </Button>
      </div>
    );

  const save = (values: UpdateBookmarkFormValues) =>
    update.mutate({
      title: values.title,
      note: values.note,
      tags: [
        ...new Set(
          values.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ],
    });
  const deleteBookmark = () => {
    if (window.confirm(`Delete “${item.title}”?`)) remove.mutate();
  };
  const description = item.aiSummary || item.description || item.excerpt;
  const domain = getHost(item.url);
  const memoryContent =
    item.note ||
    item.saveReason ||
    item.aiSummary ||
    item.description ||
    item.title;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(save)} noValidate>
        <DetailShell
          back="/bookmarks"
          backLabel="Bookmarks"
          icon={<Bookmark />}
          aside={
            <>
              <Meta
                label="Saved"
                value={formatRelativeDate(item.createdAt)}
                valueClassName="lowercase"
              />
              <Meta label="Source" value={item.siteName || domain} />
              <Meta label="Status" value={item.enrichmentStatus ?? "Saved"} />
            </>
          }
        >
          <p className="text-sm font-medium text-primary">
            {item.siteName || domain}
          </p>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="mt-3 max-w-3xl">
                <FormLabel className="sr-only">Title</FormLabel>
                <FormControl>
                  <input
                    maxLength={500}
                    className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none md:text-4xl"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {description ? (
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              {description}
            </p>
          ) : null}
          {item.aiTopics?.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {item.aiTopics.map((topic) => (
                <Badge key={topic} variant="outline">
                  {topic}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-2">
            <Button asChild>
              <a href={item.url} target="_blank" rel="noreferrer">
                Open original <ExternalLink />
              </a>
            </Button>
            <Button type="button" variant="outline">
              <Sparkles />
              Ask Repin about this
            </Button>
            <AddBookmarkToMemoryDialog
              bookmarkId={item.id}
              defaultContent={memoryContent}
              domain={domain}
              isLoading={bookmarkMemory.isLoading}
              memory={bookmarkMemory.data?.data.data ?? null}
            />
          </div>
          <section className="mt-12 border-t pt-8">
            <h2 className="text-lg font-semibold">Your context</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Keep the reason you saved this page and the tags you use to find
              it.
            </p>
            <div className="mt-5 grid gap-5">
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <textarea
                        maxLength={2_000}
                        placeholder="Why is this page useful?"
                        className="min-h-32 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <input
                        placeholder="research, design, product"
                        className="h-11 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Separate tags with commas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>
          {item.selectedText ? (
            <section className="mt-10 border-t pt-8">
              <h2 className="text-lg font-semibold">Saved passage</h2>
              <blockquote className="mt-4 border-l-4 border-primary bg-primary/6 p-5 text-sm leading-7">
                “{item.selectedText}”
              </blockquote>
            </section>
          ) : null}
          <div className="mt-10 flex items-center justify-between border-t pt-5">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={remove.isPending || update.isPending}
              onClick={deleteBookmark}
            >
              {remove.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 />
              )}{" "}
              Delete
            </Button>
            <Button
              type="submit"
              disabled={update.isPending || remove.isPending}
            >
              {update.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Save />
              )}{" "}
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DetailShell>
      </form>
    </Form>
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
  const [deleting, setDeleting] = useState(false);
  const item = note.data?.data.data;
  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    mode: "onChange",
    defaultValues: { title: "", body: "" },
  });
  const body = form.watch("body");

  useEffect(() => {
    if (!item) return;
    form.reset({ title: item.title, body: item.body });
  }, [form, item]);

  const save = async (values: NoteFormValues) => {
    form.clearErrors("root");
    try {
      if (noteId) {
        await api.patch("base", `/notes/${noteId}`, values);
        form.reset(values);
        void note.refetch();
      } else {
        const response = await api.post<Note>("base", "/notes", values);
        router.replace(`/notes/${response.data.data.id}`);
      }
    } catch {
      form.setError("root.server", {
        message: "Note could not be saved. Please try again.",
      });
    }
  };

  const remove = async () => {
    if (!noteId || !window.confirm("Delete this note?")) return;
    setDeleting(true);
    form.clearErrors("root");
    try {
      await api.delete("base", `/notes/${noteId}`);
      router.replace("/notes");
    } catch {
      form.setError("root.server", {
        message: "Note could not be deleted. Please try again.",
      });
      setDeleting(false);
    }
  };

  if (noteId && note.isLoading) return <p className="p-6">Loading note…</p>;
  if (noteId && note.isError)
    return <p className="p-6 text-destructive">Note could not be loaded.</p>;
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(save)} noValidate>
        <DetailShell
          back="/notes"
          backLabel="Notes"
          icon={<FileText />}
          aside={
            <>
              <Meta
                label="Last updated"
                value={
                  item ? new Date(item.updatedAt).toLocaleString() : "Not saved"
                }
              />
              <Meta
                label="Source"
                value={
                  item?.sourceUrl
                    ? new URL(item.sourceUrl).hostname
                    : "Personal note"
                }
              />
              <Meta
                label="Words"
                value={String(
                  body.trim() ? body.trim().split(/\s+/).length : 0,
                )}
              />
            </>
          }
        >
          <p className="text-sm font-medium text-primary">
            {isNew ? "New note" : "Note"}
          </p>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="mt-2">
                <FormLabel className="sr-only">Title</FormLabel>
                <FormControl>
                  <input
                    maxLength={500}
                    placeholder="Untitled note"
                    className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50 md:text-4xl"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="mt-8 border-y py-3 text-xs text-muted-foreground">
            {form.formState.isSubmitting
              ? "Saving…"
              : form.formState.isDirty
                ? "Unsaved changes"
                : isNew
                  ? "Not saved"
                  : "All changes saved"}
          </div>
          {form.formState.errors.root?.server?.message ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {form.formState.errors.root.server.message}
            </p>
          ) : null}
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem className="mt-6">
                <FormLabel className="sr-only">Note</FormLabel>
                <FormControl>
                  <textarea
                    maxLength={100_000}
                    placeholder="Start writing…"
                    className="min-h-72 w-full resize-none bg-transparent text-base leading-8 outline-none placeholder:text-muted-foreground/50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="mt-8 flex items-center justify-between border-t pt-5">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              disabled={!noteId || deleting || form.formState.isSubmitting}
              onClick={() => void remove()}
            >
              <Trash2 />
              Delete
            </Button>
            <Button
              type="submit"
              disabled={
                deleting ||
                form.formState.isSubmitting ||
                !form.formState.isValid
              }
            >
              {form.formState.isSubmitting ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Save />
              )}
              {form.formState.isSubmitting ? "Saving…" : "Save note"}
            </Button>
          </div>
        </DetailShell>
      </form>
    </Form>
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
