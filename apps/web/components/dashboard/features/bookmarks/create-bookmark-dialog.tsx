"use client";

import { useCreateBookmark } from "@/hooks/useBookmarks";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
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
import { useForm } from "react-hook-form";
import { useState } from "react";
import {
  createBookmarkSchema,
  type CreateBookmarkFormValues,
} from "../../../../schemas/bookmark";

export function CreateBookmarkDialog() {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Bookmark aria-hidden="true" /> Save a page
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="space-y-4"
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Save a bookmark</DialogTitle>
              <DialogDescription>
                Add a page to the workspace. Rich page context is captured when
                saving from the extension.
              </DialogDescription>
            </DialogHeader>
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
            <DialogFooter>
              <Button type="submit" disabled={createBookmark.isPending}>
                {createBookmark.isPending ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <Plus aria-hidden="true" />
                )}
                {createBookmark.isPending ? "Saving…" : "Save bookmark"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
