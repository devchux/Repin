"use client";

import {
  useCreateBookmarkCollection,
  useDeleteBookmarkCollection,
} from "@/hooks/useBookmarks";
import type { BookmarkCollection } from "@repo/contracts/bookmark";
import { Button } from "@repo/ui/button";
import { Folder, LoaderCircle, Plus, Trash2 } from "@repo/ui/icons";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { useState, type FormEvent } from "react";

export function CollectionFilter({
  collections,
  value,
  onChange,
}: {
  readonly collections: readonly BookmarkCollection[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createCollection = useCreateBookmarkCollection(() => setName(""));
  const selected = collections.find((collection) => collection.id === value);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createCollection.mutate({ name: name.trim() });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="shadow-none">
          <Folder aria-hidden="true" /> {selected?.name ?? "All bookmarks"}
          {selected ? <span className="text-muted-foreground">{selected.bookmarkCount}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-2">
        <div className="max-h-64 space-y-1 overflow-y-auto" aria-label="Bookmark collections">
          <Button type="button" variant={value ? "ghost" : "secondary"} className="w-full justify-between shadow-none" onClick={() => { onChange(""); setOpen(false); }}>
            <span>All bookmarks</span>
          </Button>
          {collections.map((collection) => (
            <CollectionRow key={collection.id} collection={collection} selected={value === collection.id} onSelect={() => { onChange(collection.id); setOpen(false); }} onDeleted={() => { if (value === collection.id) onChange(""); }} />
          ))}
        </div>
        <form onSubmit={submit} className="mt-2 border-t p-2 pt-3">
          <Label htmlFor="collection-name">New collection</Label>
          <div className="mt-2 flex gap-2">
            <Input id="collection-name" maxLength={120} placeholder="Research" value={name} onChange={(event) => setName(event.target.value)} />
            <Button type="submit" size="icon" aria-label="Create collection" disabled={!name.trim() || createCollection.isPending}>
              {createCollection.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function CollectionRow({ collection, selected, onSelect, onDeleted }: { readonly collection: BookmarkCollection; readonly selected: boolean; readonly onSelect: () => void; readonly onDeleted: () => void }) {
  const remove = useDeleteBookmarkCollection(collection.id, onDeleted);
  const deleteCollection = () => {
    if (window.confirm(`Delete the “${collection.name}” collection? Its bookmarks will remain saved.`)) remove.mutate();
  };
  return (
    <div className="group flex items-center gap-1">
      <Button type="button" variant={selected ? "secondary" : "ghost"} className="min-w-0 flex-1 justify-between shadow-none" onClick={onSelect}>
        <span className="truncate">{collection.name}</span><span className="text-xs text-muted-foreground">{collection.bookmarkCount}</span>
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Delete ${collection.name}`} disabled={remove.isPending} onClick={deleteCollection}>
        {remove.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
      </Button>
    </div>
  );
}
