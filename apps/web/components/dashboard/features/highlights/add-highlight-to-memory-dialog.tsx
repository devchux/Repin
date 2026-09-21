"use client";

import { useCreateMemoryFromHighlight } from "@/hooks/useMemories";
import { getHost } from "@/lib/utils";
import { memoryFormSchema, type MemoryFormValues } from "@/schemas/memory";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Memory } from "@repo/contracts/memory";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui/form";
import { Brain, Check, LoaderCircle } from "@repo/ui/icons";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

export function AddHighlightToMemoryDialog({
  highlightId,
  defaultContent,
  sourceUrl,
  isLoading,
  memory,
}: {
  readonly highlightId: string;
  readonly defaultContent: string;
  readonly sourceUrl: string;
  readonly isLoading: boolean;
  readonly memory: Memory | null;
}) {
  const [open, setOpen] = useState(false);
  const domain = getHost(sourceUrl);
  const defaults = useMemo<MemoryFormValues>(() => ({
    content: (memory?.content ?? defaultContent).slice(0, 4_000),
    scope: memory?.scope === "domain" ? "domain" : "global",
  }), [defaultContent, memory?.content, memory?.scope]);
  const form = useForm<MemoryFormValues>({ resolver: zodResolver(memoryFormSchema), defaultValues: defaults });
  const saveMemory = useCreateMemoryFromHighlight(() => setOpen(false));

  useEffect(() => { form.reset(defaults); }, [defaults, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={isLoading}>
          {isLoading ? <LoaderCircle className="animate-spin" /> : memory ? <Check /> : <Brain />}
          {isLoading ? "Checking memory…" : memory ? "In memory" : "Add to memory"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form className="space-y-4" noValidate onSubmit={form.handleSubmit((values) => saveMemory.mutate({ sourceId: highlightId, content: values.content, scope: values.scope, scopeId: values.scope === "domain" ? domain : undefined }))}>
            <DialogHeader>
              <DialogTitle>{memory ? "Update highlight memory" : "Add highlight to memory"}</DialogTitle>
              <DialogDescription>{memory ? "This highlight is already in memory. Update what Repin should remember." : "Choose the useful context from this passage that Repin should recall later."}</DialogDescription>
            </DialogHeader>
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>What should Repin remember?</FormLabel>
                <FormControl><textarea className="min-h-32 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" maxLength={4_000} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="scope" render={({ field }) => (
              <FormItem>
                <FormLabel>Available in</FormLabel>
                <FormControl><select className="h-11 w-full rounded-md border bg-background px-3 text-sm" {...field}><option value="global">All conversations</option><option value="domain">Pages from {domain}</option></select></FormControl>
                <FormDescription className="text-xs">Domain memory is available only when that source is relevant.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter><Button type="submit" disabled={saveMemory.isPending}>{saveMemory.isPending ? <LoaderCircle className="animate-spin" /> : memory ? <Check /> : <Brain />}{saveMemory.isPending ? "Saving…" : memory ? "Update memory" : "Add to memory"}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
