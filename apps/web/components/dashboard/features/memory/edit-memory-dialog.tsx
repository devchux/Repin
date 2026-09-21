"use client";

import { useUpdateMemory } from "@/hooks/useMemories";
import {
  updateMemorySchema,
  type UpdateMemoryFormValues,
} from "@/schemas/update-memory";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Memory } from "@repo/contracts/memory";
import { MEMORY_SCOPES } from "@repo/contracts/memory";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { LoaderCircle, Save } from "@repo/ui/icons";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

export function EditMemoryDialog({
  memory,
  open,
  onOpenChange,
}: {
  readonly memory: Memory;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const defaults = useMemo<UpdateMemoryFormValues>(
    () => ({
      content: memory.content,
      scope: memory.scope,
      scopeId: memory.scopeId ?? "",
    }),
    [memory.content, memory.scope, memory.scopeId],
  );
  const form = useForm<UpdateMemoryFormValues>({
    resolver: zodResolver(updateMemorySchema),
    defaultValues: defaults,
  });
  const update = useUpdateMemory(memory.id, () => onOpenChange(false));
  const scope = form.watch("scope");
  useEffect(() => {
    if (open) form.reset(defaults);
  }, [defaults, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form
            className="space-y-4"
            noValidate
            onSubmit={form.handleSubmit((values) =>
              update.mutate({
                content: values.content,
                scope: values.scope,
                scopeId: values.scope === "global" ? undefined : values.scopeId,
              }),
            )}
          >
            <DialogHeader>
              <DialogTitle>Edit memory</DialogTitle>
              <DialogDescription>
                Update the context Repin can recall. Saving will re-run
                enrichment.
              </DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remembered context</FormLabel>
                  <FormControl>
                    <textarea
                      className="min-h-40 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      maxLength={4_000}
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
                  <FormLabel>Scope</FormLabel>
                  <FormControl>
                    <select
                      className="h-11 w-full rounded-md border bg-background px-3 text-sm capitalize"
                      {...field}
                    >
                      {MEMORY_SCOPES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {scope !== "global" ? (
              <FormField
                control={form.control}
                name="scopeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope identifier</FormLabel>
                    <FormControl>
                      <input
                        className="h-11 w-full rounded-md border bg-transparent px-3 text-sm"
                        placeholder={
                          scope === "domain" ? "example.com" : `${scope} ID`
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Save />
                )}
                {update.isPending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
