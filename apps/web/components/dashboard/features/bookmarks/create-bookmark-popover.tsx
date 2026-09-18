"use client";

import { useCreateBookmark } from "@/hooks/useBookmarks";
import { Button } from "@repo/ui/button";
import { Bookmark, LoaderCircle, Plus } from "@repo/ui/icons";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { useState, type FormEvent } from "react";

export function CreateBookmarkPopover() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const createBookmark = useCreateBookmark(() => {
    setOpen(false);
    setUrl("");
    setTitle("");
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createBookmark.mutate({ url: url.trim(), title: title.trim() });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button><Bookmark aria-hidden="true" /> Save a page</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-5">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h2 className="font-semibold">Save a bookmark</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Add a page to the workspace. Rich page context is captured when saving from the extension.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookmark-url">Page URL</Label>
            <Input id="bookmark-url" type="url" required maxLength={2_000} placeholder="https://example.com/article" value={url} onChange={(event) => setUrl(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookmark-title">Title</Label>
            <Input id="bookmark-title" required maxLength={500} placeholder="What is this page about?" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={createBookmark.isPending || !url.trim() || !title.trim()}>
            {createBookmark.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
            {createBookmark.isPending ? "Saving…" : "Save bookmark"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
