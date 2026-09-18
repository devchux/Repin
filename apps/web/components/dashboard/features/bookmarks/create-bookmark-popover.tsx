"use client";

import { useCreateBookmark } from "@/hooks/useBookmarks";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Bookmark, LoaderCircle, Plus } from "@repo/ui/icons";
import { Input } from "@repo/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { useForm } from "react-hook-form";
import { useState } from "react";
import {
  createBookmarkSchema,
  type CreateBookmarkFormValues,
} from "../../../../schemas/bookmark";

export function CreateBookmarkPopover() {
  const [open, setOpen] = useState(false);
  const form = useForm<CreateBookmarkFormValues>({
    resolver: zodResolver(createBookmarkSchema),
    defaultValues: { url: "", title: "" },
  });
  const createBookmark = useCreateBookmark(() => {
    setOpen(false);
    form.reset();
  });

  const submit = (values: CreateBookmarkFormValues) =>
    createBookmark.mutate(values);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button>
          <Bookmark aria-hidden="true" /> Save a page
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] p-5"
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="space-y-4"
            noValidate
          >
            <div>
              <h2 className="font-semibold">Save a bookmark</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Add a page to the workspace. Rich page context is captured when
                saving from the extension.
              </p>
            </div>
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      maxLength={2_000}
                      placeholder="https://example.com/article"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      maxLength={500}
                      placeholder="What is this page about?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={createBookmark.isPending}
            >
              {createBookmark.isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {createBookmark.isPending ? "Saving…" : "Save bookmark"}
            </Button>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
