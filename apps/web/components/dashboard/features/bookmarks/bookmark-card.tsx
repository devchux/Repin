"use client";

import {
  useAddBookmarkToCollection,
  useDeleteBookmark,
  useRemoveBookmarkFromCollection,
} from "@/hooks/useBookmarks";
import { formatRelativeDate, getHost } from "@/lib/utils";
import type { Bookmark, BookmarkCollection } from "@repo/contracts/bookmark";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  Bookmark as BookmarkIcon,
  Check,
  ExternalLink,
  Folder,
  LoaderCircle,
  MoreHorizontal,
  Trash2,
} from "@repo/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function BookmarkCard({
  item,
  collections,
  collectionId,
  layout,
}: {
  readonly item: Bookmark;
  readonly collections: readonly BookmarkCollection[];
  readonly collectionId?: string;
  readonly layout: "grid" | "list";
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const remove = useDeleteBookmark(item.id);
  const description =
    item.aiSummary ||
    item.description ||
    item.excerpt ||
    item.saveReason ||
    "No description was captured for this page.";
  const domain = item.siteName || getHost(item.url);

  const deleteBookmark = () => {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    remove.mutate(undefined, { onSuccess: () => setActionsOpen(false) });
  };

  return (
    <article
      className={
        layout === "grid"
          ? "group flex min-h-64 flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/35"
          : "group grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">
          {item.faviconUrl ? (
            <div className="size-5 relative">
              <Image
                src={item.faviconUrl}
                alt=""
                fill
                sizes="20px"
                unoptimized
                className="object-contain"
              />
            </div>
          ) : (
            <BookmarkIcon className="size-4" aria-hidden="true" />
          )}
        </div>
        <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 opacity-60 group-hover:opacity-100"
              aria-label={`Actions for ${item.title}`}
            >
              <MoreHorizontal />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Add to collection
            </p>
            {collections.length ? (
              collections.map((collection) => (
                <AddToCollectionButton
                  key={collection.id}
                  bookmarkId={item.id}
                  collection={collection}
                  isAdded={item.collectionIds?.includes(collection.id) ?? false}
                  onAdded={() => setActionsOpen(false)}
                />
              ))
            ) : (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Create a collection from the filter menu first.
              </p>
            )}
            <div className="mt-1 border-t pt-1">
              {collectionId ? (
                <RemoveFromCollectionButton
                  bookmarkId={item.id}
                  collectionId={collectionId}
                  onRemoved={() => setActionsOpen(false)}
                />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                disabled={remove.isPending}
                onClick={deleteBookmark}
              >
                {remove.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Trash2 />
                )}{" "}
                Delete bookmark
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div
        className={
          layout === "grid"
            ? "mt-5 flex flex-1 flex-col"
            : "mt-3 md:col-start-1"
        }
      >
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          {domain}
        </p>
        <Link
          href={`/bookmarks/${item.id}`}
          className="mt-2 text-base font-semibold leading-6 tracking-tight hover:text-primary"
        >
          {item.title}
        </Link>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          {item.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          {!item.tags.length && item.enrichmentStatus === "pending" ? (
            <Badge variant="outline">Processing</Badge>
          ) : null}
        </div>
      </div>
      <div
        className={
          layout === "grid"
            ? "mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground"
            : "text-xs text-muted-foreground md:row-span-2 md:text-right"
        }
      >
        <time dateTime={item.createdAt}>
          {formatRelativeDate(item.createdAt)}
        </time>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          Open <ExternalLink className="size-3" />
        </a>
      </div>
    </article>
  );
}

function RemoveFromCollectionButton({
  bookmarkId,
  collectionId,
  onRemoved,
}: {
  readonly bookmarkId: string;
  readonly collectionId: string;
  readonly onRemoved: () => void;
}) {
  const remove = useRemoveBookmarkFromCollection(
    collectionId,
    bookmarkId,
    onRemoved,
  );
  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start"
      disabled={remove.isPending}
      onClick={() => remove.mutate()}
    >
      {remove.isPending ? (
        <LoaderCircle className="animate-spin" />
      ) : (
        <Folder />
      )}
      Remove from collection
    </Button>
  );
}

function AddToCollectionButton({
  bookmarkId,
  collection,
  isAdded,
  onAdded,
}: {
  readonly bookmarkId: string;
  readonly collection: BookmarkCollection;
  readonly isAdded: boolean;
  readonly onAdded: () => void;
}) {
  const add = useAddBookmarkToCollection(collection.id, bookmarkId, onAdded);
  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start"
      disabled={isAdded || add.isPending}
      onClick={() => add.mutate()}
    >
      {add.isPending ? (
        <LoaderCircle className="animate-spin" />
      ) : isAdded ? (
        <Check />
      ) : (
        <Folder />
      )}
      <span className="truncate">{collection.name}</span>
      {isAdded ? (
        <span className="ml-auto text-xs text-muted-foreground">Added</span>
      ) : null}
    </Button>
  );
}
