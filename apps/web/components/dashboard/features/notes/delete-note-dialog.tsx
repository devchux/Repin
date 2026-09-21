"use client";

import { useDeleteNote } from "@/hooks/useNotes";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { LoaderCircle, Trash2 } from "@repo/ui/icons";

export function DeleteNoteDialog({
  noteId,
  noteTitle,
  open,
  onOpenChange,
  onDeleted,
}: {
  readonly noteId: string;
  readonly noteTitle: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDeleted?: () => void;
}) {
  const remove = useDeleteNote(noteId, () => {
    onOpenChange(false);
    onDeleted?.();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete note?</DialogTitle>
          <DialogDescription>
            “{noteTitle}” will be removed from your workspace. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={remove.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Trash2 />
            )}
            {remove.isPending ? "Deleting…" : "Delete note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
