"use client";

import { EmptyLibrary } from "@/components/dashboard/features/bookmarks/empty-library";
import { BookmarkCard } from "@/components/dashboard/features/bookmarks/bookmark-card";
import { CollectionFilter } from "@/components/dashboard/features/bookmarks/collection-filter";
import { CreateBookmarkDialog } from "@/components/dashboard/features/bookmarks/create-bookmark-dialog";
import { LibraryToolbar } from "@/components/dashboard/features/common/library-toolbar";
import { PageHeading } from "@/components/dashboard/features/common/page-heading";
import { useBookmarkCollections, useBookmarks } from "@/hooks/useBookmarks";
import { Button } from "@repo/ui/button";
import { useDeferredValue, useState } from "react";
import { WorkspacePage } from "../layout/workspace-page";

export function BookmarksPage() {
  const [query, setQuery] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const deferredQuery = useDeferredValue(query.trim());
  const bookmarks = useBookmarks({ search: deferredQuery, collectionId });
  const collections = useBookmarkCollections();
  const page = bookmarks.data?.data.data;
  const items = page?.items ?? [];
  const collectionItems = collections.data?.data.data ?? [];

  return (
    <WorkspacePage>
      <PageHeading
        eyebrow="Library"
        title="Bookmarks"
        description="Articles, references, and pages you saved from Repin on any device."
        action={<CreateBookmarkDialog />}
      />
      <LibraryToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search bookmarks"
        layout={layout}
        onLayoutChange={setLayout}
      >
        <CollectionFilter collections={collectionItems} value={collectionId} onChange={setCollectionId} />
      </LibraryToolbar>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{bookmarks.isLoading ? "Loading bookmarks…" : `${page?.total ?? 0} ${(page?.total ?? 0) === 1 ? "bookmark" : "bookmarks"}`}</span>
        <span>{deferredQuery || collectionId ? "Filtered results" : "Sorted by recently saved"}</span>
      </div>
      {bookmarks.isError ? (
        <EmptyLibrary title="Bookmarks could not be loaded" description="Check your connection and try again." />
      ) : null}
      {bookmarks.isError ? <div className="mt-4 text-center"><Button variant="outline" onClick={() => void bookmarks.refetch()}>Try again</Button></div> : null}
      {!bookmarks.isLoading && !bookmarks.isError && items.length ? (
        <section
          className={
            layout === "grid"
              ? "mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
              : "mt-4 divide-y border-y"
          }
        >
          {items.map((item) => (
            <BookmarkCard key={item.id} item={item} collections={collectionItems} collectionId={collectionId || undefined} layout={layout} />
          ))}
        </section>
      ) : null}
      {!bookmarks.isLoading && !bookmarks.isError && !items.length ? (
        <EmptyLibrary
          title={deferredQuery || collectionId ? "No bookmarks found" : "Your bookmark library is empty"}
          description={deferredQuery || collectionId ? "Try another search or collection." : "Save a page here or from the Repin extension."}
        />
      ) : null}
    </WorkspacePage>
  );
}
