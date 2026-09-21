"use client";

import { AddHighlightToMemoryDialog } from "./add-highlight-to-memory-dialog";
import { DeleteHighlightDialog } from "./delete-highlight-dialog";
import { highlightColorClasses } from "./highlight-card";
import { DetailShell } from "@/components/dashboard/features/library/detail-shell";
import { Meta } from "@/components/dashboard/features/library/meta";
import { useHighlight, useUpdateHighlight } from "@/hooks/useHighlights";
import { useHighlightMemory } from "@/hooks/useMemories";
import { formatRelativeDate, getHost } from "@/lib/utils";
import { highlightSchema, type HighlightFormValues } from "@/schemas/highlight";
import { zodResolver } from "@hookform/resolvers/zod";
import { HIGHLIGHT_COLORS } from "@repo/contracts/highlight";
import { Button } from "@repo/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui/form";
import { ExternalLink, Highlighter, LoaderCircle, Save, Trash2 } from "@repo/ui/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export function HighlightDetail({ highlightId }: { readonly highlightId: string }) {
  const router = useRouter();
  const request = useHighlight(highlightId);
  const memory = useHighlightMemory(highlightId);
  const item = request.data?.data.data;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const form = useForm<HighlightFormValues>({ resolver: zodResolver(highlightSchema), mode: "onChange", defaultValues: { note: "", color: "yellow" } });
  const update = useUpdateHighlight(highlightId, (saved) => form.reset({ note: saved.note ?? "", color: saved.color }));

  useEffect(() => { if (item) form.reset({ note: item.note ?? "", color: item.color }); }, [form, item]);

  if (request.isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading highlight…</p>;
  if (request.isError || !item) return <div className="p-6"><p className="text-sm text-destructive">Highlight could not be loaded.</p><Button variant="outline" className="mt-4" onClick={() => void request.refetch()}>Try again</Button></div>;

  const context = `${item.prefix ?? ""}${item.quote}${item.suffix ?? ""}`;
  const defaultMemory = `${item.pageTitle}\n\n${item.quote}${item.note ? `\n\n${item.note}` : ""}`;

  return (
    <>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit((values) => update.mutate({ note: values.note || null, color: values.color }))}>
          <DetailShell back="/highlights" backLabel="Highlights" icon={<Highlighter />} aside={<><Meta label="Captured" valueClassName="lowercase" value={formatRelativeDate(item.capturedAt)} /><Meta label="Source" value={getHost(item.url)} /><Meta label="Color" value={form.watch("color")} /></>}>
            <p className="text-sm font-medium text-primary">Highlight</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{item.pageTitle}</h1>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y py-3 text-xs text-muted-foreground">
              <span>{update.isPending ? "Saving…" : form.formState.isDirty ? "Unsaved changes" : "All changes saved"}</span>
              <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">Open source <ExternalLink className="size-3" /></a>
            </div>
            <div className="mt-5 flex justify-end"><AddHighlightToMemoryDialog highlightId={item.id} defaultContent={defaultMemory} sourceUrl={item.url} isLoading={memory.isLoading} memory={memory.data?.data.data ?? null} /></div>
            <blockquote className={`mt-8 border-l-2 px-5 py-5 text-lg font-medium leading-8 ${highlightColorClasses[form.watch("color")]}`}>“{item.quote}”</blockquote>
            {(item.prefix || item.suffix) ? <section className="mt-6"><h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Surrounding context</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{context}</p></section> : null}
            <FormField control={form.control} name="color" render={({ field }) => <FormItem className="mt-8"><FormLabel>Highlight color</FormLabel><FormControl><select className="h-11 w-full rounded-md border bg-background px-3 text-sm capitalize" {...field}>{HIGHLIGHT_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}</select></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="note" render={({ field }) => <FormItem className="mt-6"><FormLabel>Note</FormLabel><FormControl><textarea maxLength={10_000} placeholder="Add context or a thought about this passage…" className="min-h-40 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" {...field} /></FormControl><FormMessage /></FormItem>} />
            <div className="mt-10 flex items-center justify-between border-t pt-5"><Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={update.isPending} onClick={() => setDeleteOpen(true)}><Trash2 /> Delete</Button><Button type="submit" disabled={update.isPending || !form.formState.isDirty || !form.formState.isValid}>{update.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}{update.isPending ? "Saving…" : "Save changes"}</Button></div>
          </DetailShell>
        </form>
      </Form>
      <DeleteHighlightDialog highlightId={item.id} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={() => router.replace("/highlights")} />
    </>
  );
}
