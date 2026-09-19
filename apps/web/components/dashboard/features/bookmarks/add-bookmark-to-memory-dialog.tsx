"use client";

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Brain, LoaderCircle } from "@repo/ui/icons";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useCreateMemoryFromBookmark } from "@/hooks/useMemories";
import {
  bookmarkMemorySchema,
  type BookmarkMemoryFormValues,
} from "@/schemas/bookmark";

export function AddBookmarkToMemoryDialog({
  bookmarkId,
  defaultContent,
  domain,
}: {
  readonly bookmarkId: string;
  readonly defaultContent: string;
  readonly domain: string;
}) {
  const [open, setOpen] = useState(false);
  const defaults: BookmarkMemoryFormValues = {
    content: defaultContent.slice(0, 4_000),
    scope: "global",
  };
  const form = useForm<BookmarkMemoryFormValues>({
    resolver: zodResolver(bookmarkMemorySchema),
    defaultValues: defaults,
  });
  const createMemory = useCreateMemoryFromBookmark(() => {
    setOpen(false);
    form.reset(defaults);
  });

  const submit = (values: BookmarkMemoryFormValues) => {
    createMemory.mutate({
      sourceId: bookmarkId,
      content: values.content,
      scope: values.scope,
      scopeId: values.scope === "domain" ? domain : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Brain /> Add to memory
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form
            className="space-y-4"
            noValidate
            onSubmit={form.handleSubmit(submit)}
          >
            <DialogHeader>
              <DialogTitle>Add to Repin memory</DialogTitle>
              <DialogDescription>
                Save a concise fact or instruction that Repin can recall in
                future conversations.
              </DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What should Repin remember?</FormLabel>
                  <FormControl>
                    <textarea
                      className="min-h-28 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      maxLength={4_000}
                      placeholder="The useful fact, preference, or instruction…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available in</FormLabel>
                  <FormControl>
                    <select
                      className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      {...field}
                    >
                      <option value="global">All conversations</option>
                      <option value="domain">Pages from {domain}</option>
                    </select>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Domain memories are recalled only when that website is
                    relevant.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button disabled={createMemory.isPending} type="submit">
                {createMemory.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Brain />
                )}
                {createMemory.isPending ? "Adding…" : "Add to memory"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
