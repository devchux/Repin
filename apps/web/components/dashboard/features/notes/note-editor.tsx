"use client";

import { DeleteNoteDialog } from "@/components/dashboard/features/notes/delete-note-dialog";
import { AddNoteToMemoryDialog } from "@/components/dashboard/features/notes/add-note-to-memory-dialog";
import { DetailShell } from "@/components/dashboard/features/library/detail-shell";
import { Meta } from "@/components/dashboard/features/library/meta";
import { useCreateNote, useNote, useUpdateNote } from "@/hooks/useNotes";
import { useNoteMemory } from "@/hooks/useMemories";
import { formatRelativeDate, getHost } from "@/lib/utils";
import { noteSchema, type NoteFormValues } from "@/schemas/note";
import { zodResolver } from "@hookform/resolvers/zod";
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
  ExternalLink,
  FileText,
  LoaderCircle,
  Save,
  Trash2,
} from "@repo/ui/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

const normalizeTags = (value: string) => [
  ...new Set(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  ),
];

export function NoteEditor({
  noteId,
  isNew = false,
}: {
  readonly noteId?: string;
  readonly isNew?: boolean;
}) {
  const router = useRouter();
  const note = useNote(noteId ?? "new", Boolean(noteId));
  const noteMemory = useNoteMemory(noteId ?? "");
  const item = note.data?.data.data;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    mode: "onChange",
    defaultValues: { title: "", body: "", tags: "" },
  });
  const create = useCreateNote((created) => {
    form.reset({
      title: created.title,
      body: created.body,
      tags: created.tags.join(", "),
    });
    router.replace(`/notes/${created.id}`);
  });
  const update = useUpdateNote(noteId ?? "", (updated) => {
    form.reset({
      title: updated.title,
      body: updated.body,
      tags: updated.tags.join(", "),
    });
  });

  useEffect(() => {
    if (!item) return;
    form.reset({
      title: item.title,
      body: item.body,
      tags: item.tags.join(", "),
    });
  }, [form, item]);

  if (noteId && note.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading note…</p>;
  }

  if (noteId && (note.isError || !item)) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Note could not be loaded.</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => void note.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const mutation = isNew ? create : update;
  const save = (values: NoteFormValues) => {
    const request = {
      title: values.title,
      body: values.body,
      tags: normalizeTags(values.tags),
    };
    if (isNew) create.mutate(request);
    else update.mutate(request);
  };
  const wordCount = form
    .watch("body")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <>
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
                  valueClassName="lowercase"
                  value={
                    item ? formatRelativeDate(item.updatedAt) : "Not saved"
                  }
                />
                <Meta
                  label="Source"
                  value={
                    item?.sourceUrl ? getHost(item.sourceUrl) : "Personal note"
                  }
                />
                <Meta label="Words" value={String(wordCount)} />
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
            <div className="mt-8 flex items-center justify-between gap-4 border-y py-3 text-xs text-muted-foreground">
              <span>
                {mutation.isPending
                  ? "Saving…"
                  : form.formState.isDirty
                    ? "Unsaved changes"
                    : isNew
                      ? "Not saved"
                      : "All changes saved"}
              </span>
              {item?.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Open source <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
            {noteId && item ? (
              <div className="mt-5 flex justify-end">
                <AddNoteToMemoryDialog
                  noteId={noteId}
                  defaultContent={`${item.title}\n\n${item.body}`}
                  sourceUrl={item.sourceUrl}
                  isLoading={noteMemory.isLoading}
                  memory={noteMemory.data?.data.data ?? null}
                />
              </div>
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
            {item?.selectedText ? (
              <section className="mt-8 rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Source selection
                </p>
                <blockquote className="mt-2 text-sm leading-6">
                  “{item.selectedText}”
                </blockquote>
              </section>
            ) : null}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem className="mt-8 border-t pt-6">
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <input
                      placeholder="research, product, follow-up"
                      className="h-11 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Separate up to 25 tags with commas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mt-10 flex items-center justify-between border-t pt-5">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={isNew || mutation.isPending}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 /> Delete
              </Button>
              <Button
                type="submit"
                disabled={
                  mutation.isPending ||
                  !form.formState.isValid ||
                  (!isNew && !form.formState.isDirty)
                }
              >
                {mutation.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Save />
                )}
                {mutation.isPending ? "Saving…" : "Save note"}
              </Button>
            </div>
          </DetailShell>
        </form>
      </Form>
      {noteId && item ? (
        <DeleteNoteDialog
          noteId={noteId}
          noteTitle={item.title}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => router.replace("/notes")}
        />
      ) : null}
    </>
  );
}
