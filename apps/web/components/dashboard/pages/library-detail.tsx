"use client";

import { DetailShell } from "@/components/dashboard/features/library/detail-shell";
import { Meta } from "@/components/dashboard/features/library/meta";
import { AddBookmarkToMemoryDialog } from "@/components/dashboard/features/bookmarks/add-bookmark-to-memory-dialog";
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
  LoaderCircle,
  Save,
  Trash2,
} from "@repo/ui/icons";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
                  <textarea
                    rows={1}
                    maxLength={500}
                    className="min-h-10 w-full resize-none overflow-hidden wrap-break-word bg-transparent text-3xl font-semibold leading-tight tracking-tight outline-none field-sizing-content md:text-4xl"
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
