"use client";

import { useDeleteHighlight } from "@/hooks/useHighlights";
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

export function DeleteHighlightDialog({
  highlightId,
  open,
  onOpenChange,
  onDeleted,
}: {
  readonly highlightId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDeleted?: () => void;
}) {
  const remove = useDeleteHighlight(highlightId, () => {
    onOpenChange(false);
    onDeleted?.();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete highlight?</DialogTitle>
          <DialogDescription>
            This passage and its note will be removed from your workspace. This
            action cannot be undone.
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
            {remove.isPending ? "Deleting…" : "Delete highlight"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
